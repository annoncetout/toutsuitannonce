// Sends a OneSignal push when a new approved+active listing is published.
// Triggered by a DB hook (pg_net) on public.listings.

const ONESIGNAL_APP_ID = "17af1f2c-0b85-426a-819f-298b4d03fc17";
const SITE_URL = "https://www.toutsuiteannonces.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-onesignal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const restKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    if (!restKey) {
      return new Response(JSON.stringify({ error: "Missing ONESIGNAL_REST_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const listingId: string | undefined = body.listing_id ?? body.record?.id;
    const title: string | undefined = body.title ?? body.record?.title;
    const image: string | undefined = body.image ?? body.record?.images?.[0];

    if (!listingId || !title) {
      return new Response(JSON.stringify({ error: "listing_id and title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `${SITE_URL}/annonce/${listingId}`;
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Subscribed Users"],
      headings: { en: "📢 Nouvelle annonce disponible", fr: "📢 Nouvelle annonce disponible" },
      contents: {
        en: `${title} — TOUT SUITE ANNONCES`,
        fr: `${title} — TOUT SUITE ANNONCES`,
      },
      url,
      web_url: url,
      chrome_web_image: image,
      big_picture: image,
      chrome_web_icon: `${SITE_URL}/icon-192.png`,
      firefox_icon: `${SITE_URL}/icon-192.png`,
    };

    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${restKey}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
