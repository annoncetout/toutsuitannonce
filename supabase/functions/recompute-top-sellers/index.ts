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

    // 2) Anti-fraud heuristics: flag suspicious sellers
    const { data: stats } = await supabase
      .from("seller_stats")
      .select("user_id, total_views, total_phone_clicks, reviews_count, avg_rating, account_age_days");

    if (stats && stats.length) {
      const flagged: { id: string; flags: string[] }[] = [];
      for (const s of stats) {
        const flags: string[] = [];
        const ratio = s.total_phone_clicks > 0 ? s.total_views / Math.max(1, s.total_phone_clicks) : 0;
        if (ratio > 0 && ratio < 0.5 && s.total_phone_clicks > 20) flags.push("phone_click_anomaly");
        if (s.account_age_days < 7 && s.reviews_count >= 5 && Number(s.avg_rating) >= 4.8) flags.push("suspicious_reviews_burst");
        if (s.total_views > 100 && s.total_phone_clicks === 0 && s.reviews_count > 10) flags.push("no_phone_clicks_with_reviews");
        if (flags.length) flagged.push({ id: s.user_id, flags });
      }
      for (const f of flagged) {
        await supabase.from("seller_stats").update({ fraud_flags: f.flags }).eq("user_id", f.id);
      }
    }

    // 3) Assign badges
    const { error: e2 } = await supabase.rpc("assign_top_seller_badges");
    if (e2) throw e2;

    // 4) Monthly reward (1st of month): boost top #1 active listings 7 days + notif
    const today = new Date();
    if (today.getUTCDate() === 1) {
      const { data: top1 } = await supabase
        .from("seller_stats")
        .select("user_id")
        .eq("badge", "gold")
        .eq("rank_global", 1)
        .maybeSingle();
      if (top1?.user_id) {
        const until = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        await supabase.from("listings")
          .update({ is_premium: true, is_featured: true, premium_until: until })
          .eq("user_id", top1.user_id)
          .eq("is_active", true);
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

    return new Response(JSON.stringify({ ok: true, recomputed: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
