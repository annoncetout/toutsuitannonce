import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  try {
    // 1) Recompute all
    const { data: count, error: e1 } = await supabase.rpc("recompute_all_seller_scores");
    if (e1) throw e1;

    // 2) Anti-fraud heuristics
    const { data: stats } = await supabase
      .from("seller_stats")
      .select("user_id, display_name, total_views, total_phone_clicks, reviews_count, avg_rating, account_age_days, fraud_flags");

    const newlyFlagged: { id: string; name: string | null; flags: string[] }[] = [];
    if (stats && stats.length) {
      for (const s of stats) {
        const flags: string[] = [];
        const ratio = s.total_phone_clicks > 0 ? s.total_views / Math.max(1, s.total_phone_clicks) : 0;
        if (ratio > 0 && ratio < 0.5 && s.total_phone_clicks > 20) flags.push("phone_click_anomaly");
        if (s.account_age_days < 7 && s.reviews_count >= 5 && Number(s.avg_rating) >= 4.8) flags.push("suspicious_reviews_burst");
        if (s.total_views > 100 && s.total_phone_clicks === 0 && s.reviews_count > 10) flags.push("no_phone_clicks_with_reviews");

        const existing = Array.isArray(s.fraud_flags) ? (s.fraud_flags as string[]) : [];
        const hasNew = flags.some((f) => !existing.includes(f));
        if (flags.length) {
          await supabase.from("seller_stats").update({ fraud_flags: flags }).eq("user_id", s.user_id);
          if (hasNew) newlyFlagged.push({ id: s.user_id, name: s.display_name, flags });
        } else if (existing.length) {
          await supabase.from("seller_stats").update({ fraud_flags: [] }).eq("user_id", s.user_id);
        }
      }
    }

    // 3) Badges
    const { error: e2 } = await supabase.rpc("assign_top_seller_badges");
    if (e2) throw e2;

    // 4) Notify admins on new fraud detections
    if (newlyFlagged.length) {
      const { data: settingRow } = await supabase
        .from("site_settings").select("value").eq("key", "fraud_notify").maybeSingle();
      const settings = (settingRow?.value ?? {}) as { enabled?: boolean; slack_webhook?: string; notify_emails?: string[] };

      if (settings.enabled !== false) {
        // In-app notifications to all admins
        const { data: admins } = await supabase
          .from("user_roles").select("user_id").eq("role", "admin");
        const summary = newlyFlagged
          .slice(0, 5)
          .map((f) => `• ${f.name ?? f.id.slice(0, 8)} — ${f.flags.join(", ")}`)
          .join("\n");
        const body = `${newlyFlagged.length} vendeur(s) signalés par l'IA anti-fraude :\n${summary}${newlyFlagged.length > 5 ? `\n…+${newlyFlagged.length - 5}` : ""}`;
        if (admins?.length) {
          await supabase.from("notifications").insert(
            admins.map((a) => ({
              user_id: a.user_id,
              type: "fraud_detected",
              title: "🚨 Nouvelles alertes de fraude",
              body,
              link: "/admin?tab=top-sellers",
              metadata: { count: newlyFlagged.length, flagged: newlyFlagged } as never,
            }))
          );
        }

        // Slack webhook
        if (settings.slack_webhook) {
          try {
            await fetch(settings.slack_webhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: `🚨 *Fraude détectée — Top Vendeurs*\n${body}`,
              }),
            });
          } catch (_) { /* ignore */ }
        }

        // Email via enqueue_email (auth_emails infra not for this — use transactional_emails queue if available)
        if (settings.notify_emails?.length) {
          for (const to of settings.notify_emails) {
            try {
              await supabase.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  purpose: "transactional",
                  to,
                  subject: "🚨 Nouvelles alertes de fraude — Top Vendeurs",
                  html: `<h2>Alertes anti-fraude</h2><pre>${body.replace(/</g, "&lt;")}</pre><p><a href="${url.replace(".supabase.co", "")}/admin?tab=top-sellers">Ouvrir la file de revue</a></p>`,
                  text: body,
                },
              });
            } catch (_) { /* ignore */ }
          }
        }
      }
    }

    // 5) Monthly reward
    const today = new Date();
    if (today.getUTCDate() === 1) {
      const { data: top1 } = await supabase
        .from("seller_stats").select("user_id")
        .eq("badge", "gold").eq("rank_global", 1).maybeSingle();
      if (top1?.user_id) {
        const until = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        await supabase.from("listings")
          .update({ is_premium: true, is_featured: true, premium_until: until })
          .eq("user_id", top1.user_id).eq("is_active", true);
        await supabase.from("seller_stats").update({ is_top_of_month: true }).eq("user_id", top1.user_id);
        await supabase.from("notifications").insert({
          user_id: top1.user_id,
          type: "top_seller_of_month",
          title: "🏆 Vous êtes Top Vendeur du mois !",
          body: "Vos annonces sont mises en avant gratuitement pendant 7 jours. Bravo !",
          link: "/dashboard",
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, recomputed: count, newly_flagged: newlyFlagged.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
