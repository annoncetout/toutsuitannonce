// Returns OneSignal stats for the admin dashboard.
// Requires the caller to be an admin (verified via JWT + user_roles).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ONESIGNAL_APP_ID = "17af1f2c-0b85-426a-819f-298b4d03fc17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const restKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!restKey) {
      return new Response(JSON.stringify({ error: "Missing ONESIGNAL_REST_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin check
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const osHeaders = {
      Authorization: `Key ${restKey}`,
      "Content-Type": "application/json",
    };

    // App info (subscriber counts)
    const appRes = await fetch(`https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}`, {
      headers: osHeaders,
    });
    const app = await appRes.json();

    // Notifications list (last 50)
    const notifRes = await fetch(
      `https://api.onesignal.com/notifications?app_id=${ONESIGNAL_APP_ID}&limit=50&offset=0`,
      { headers: osHeaders }
    );
    const notifJson = await notifRes.json();
    const notifications = Array.isArray(notifJson?.notifications) ? notifJson.notifications : [];

    let totalSent = 0;
    let totalClicked = 0;
    for (const n of notifications) {
      totalSent += Number(n.successful ?? 0);
      totalClicked += Number(n.converted ?? 0);
    }
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;

    // Platform breakdown via Players API (paginated). Limit to a sample for speed.
    let android = 0, ios = 0, desktop = 0, other = 0, totalPlayers = 0;
    try {
      const playersRes = await fetch(
        `https://api.onesignal.com/players?app_id=${ONESIGNAL_APP_ID}&limit=300`,
        { headers: osHeaders }
      );
      const playersJson = await playersRes.json();
      const players = Array.isArray(playersJson?.players) ? playersJson.players : [];
      totalPlayers = Number(playersJson?.total_count ?? players.length);
      for (const p of players) {
        const dt = String(p.device_type ?? "");
        const dos = String(p.device_os ?? "").toLowerCase();
        // device_type: 0=iOS, 1=Android, 5=Chrome web, 7=Safari web, 8=Firefox web, 9=Edge, 11=Mac, 12=Win
        if (dt === "1" || dos.includes("android")) android++;
        else if (dt === "0" || dos.includes("ios") || dos.includes("iphone")) ios++;
        else if (["5","7","8","9","11","12"].includes(dt)) desktop++;
        else other++;
      }
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({
      subscribers: {
        total: Number(app?.messageable_players ?? totalPlayers ?? 0),
        android, ios, desktop, other,
      },
      notifications_sent: totalSent,
      click_rate: Number(clickRate.toFixed(2)),
      recent: notifications.slice(0, 10).map((n: any) => ({
        id: n.id,
        title: n.headings?.en ?? n.headings?.fr ?? "",
        sent: n.successful ?? 0,
        clicked: n.converted ?? 0,
        completed_at: n.completed_at ?? n.queued_at,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
