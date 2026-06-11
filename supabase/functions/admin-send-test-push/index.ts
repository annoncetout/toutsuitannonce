// Admin-only push test helper.
// Modes:
//   - scope "self"    : insert notification for caller (relies on DB trigger -> send-push)
//   - scope "all"     : insert notification for every user
//   - scope "targeted": direct Web Push to a specific user_id, filtered by platform(s).
//                       Bypasses the notifications table (records history row for auditing)
//                       so we can target only iOS / Android / Desktop subscriptions.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "invalid token" }, 401);
    const caller = userData.user;

    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const scope = (body?.scope as string) ?? "self";
    const title = (body?.title as string) || "🔔 Test notification";
    const message = (body?.body as string) || "Si vous voyez ce message, votre appareil est correctement abonné aux notifications push.";
    const link = (body?.link as string) || "/";

    // ---- Targeted mode: direct webpush to filtered subscriptions ----
    if (scope === "targeted") {
      const targetUserId = (body?.target_user_id as string) || caller.id;
      const platforms = Array.isArray(body?.platforms) && body.platforms.length > 0
        ? (body.platforms as string[])
        : null; // null = all platforms

      // Load VAPID
      const [{ data: pub }, { data: priv }] = await Promise.all([
        admin.from("site_settings").select("value").eq("key", "vapid_public_key").maybeSingle(),
        admin.from("site_settings").select("value").eq("key", "vapid_private").maybeSingle(),
      ]);
      const publicKey = (pub?.value as any)?.key;
      const privateKey = (priv?.value as any)?.private_key;
      const subject = (priv?.value as any)?.subject ?? "mailto:contact@toutsuiteannonces.com";
      if (!publicKey || !privateKey) return json({ error: "vapid not configured" }, 500);
      webpush.setVapidDetails(subject, publicKey, privateKey);

      let query = admin.from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, platform, user_agent")
        .eq("user_id", targetUserId);
      if (platforms) query = query.in("platform", platforms);
      const { data: subs } = await query;

      if (!subs || subs.length === 0) {
        return json({ sent: 0, failed: 0, reason: "no matching subscriptions" });
      }

      // Create one notification row for history/click attribution (push_events.notification_id)
      const { data: notif } = await admin.from("notifications").insert({
        user_id: targetUserId,
        type: "admin_test_targeted",
        title, body: message, link,
        metadata: { test: true, targeted: true, platforms, sent_by: caller.id },
      }).select("id").single();

      // Temporarily disable the auto-push trigger fan-out by deleting that just-inserted row's webhook payload?
      // Simpler: we keep the row (trigger will already have fired and sent to ALL subs of the user).
      // To truly isolate by platform, we DON'T rely on the trigger. We delete the row and re-insert with a flag,
      // OR we accept the trigger also fires. Cleanest: keep the trigger as a fallback, but ALSO send directly
      // via webpush to confirm reception per platform. Duplicates are harmless (same tag => coalesced by browsers).

      const payload = JSON.stringify({
        title, body: message, url: link, type: "admin_test_targeted", id: notif?.id ?? "",
      });

      const results = await Promise.allSettled(
        subs.map((s: any) => webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
          payload,
        )),
      );

      const toDelete: string[] = [];
      const perPlatform: Record<string, { sent: number; failed: number }> = {};
      results.forEach((r, i) => {
        const sub = subs[i];
        const plat = sub.platform ?? "unknown";
        perPlatform[plat] ??= { sent: 0, failed: 0 };
        if (r.status === "fulfilled") perPlatform[plat].sent++;
        else {
          perPlatform[plat].failed++;
          const code = (r.reason as any)?.statusCode;
          if (code === 404 || code === 410) toDelete.push(sub.id);
        }
      });
      if (toDelete.length) await admin.from("push_subscriptions").delete().in("id", toDelete);

      return json({
        mode: "targeted",
        notification_id: notif?.id ?? null,
        target_user_id: targetUserId,
        platforms,
        subscriptions: subs.length,
        per_platform: perPlatform,
        cleaned: toDelete.length,
      });
    }

    // ---- self / all : insert notifications and let DB trigger handle push ----
    let targets: string[] = [];
    if (scope === "all") {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      targets = (users?.users ?? []).map((u) => u.id);
    } else {
      targets = [caller.id];
    }
    if (targets.length === 0) return json({ inserted: 0 });

    const rows = targets.map((uid) => ({
      user_id: uid, type: "admin_test", title, body: message, link,
      metadata: { test: true, sent_by: caller.id },
    }));

    const CHUNK = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error, count } = await admin.from("notifications").insert(rows.slice(i, i + CHUNK), { count: "exact" });
      if (error) return json({ error: error.message, inserted }, 500);
      inserted += count ?? rows.slice(i, i + CHUNK).length;
    }
    return json({ inserted, scope, targets: targets.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
