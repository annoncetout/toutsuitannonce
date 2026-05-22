// R2 upload edge function - receives a file and uploads to Cloudflare R2 via S3-compatible API
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucket = Deno.env.get("R2_BUCKET");
    const publicUrl = Deno.env.get("R2_PUBLIC_URL");
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      throw new Error("R2 not configured");
    }

    // Validate user
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const folder = (form.get("folder")?.toString() || "annonces").replace(/[^a-z0-9_-]/gi, "");
    const ext = (form.get("ext")?.toString() || "webp").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webp";
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Fichier trop lourd (max 5 Mo)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ct = file.type || "application/octet-stream";
    if (!ALLOWED.has(ct)) {
      return new Response(JSON.stringify({ error: "Format non supporté" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = `${folder}/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    });
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodeURI(key)}`;

    const body = await file.arrayBuffer();
    const r = await client.fetch(endpoint, {
      method: "PUT",
      body,
      headers: { "Content-Type": ct, "Content-Length": String(body.byteLength) },
    });
    if (!r.ok) {
      const text = await r.text();
      console.error("R2 PUT failed", r.status, text);
      return new Response(JSON.stringify({ error: `R2 upload failed (${r.status})` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `${publicUrl.replace(/\/$/, "")}/${key}`;
    return new Response(JSON.stringify({ url, key }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
