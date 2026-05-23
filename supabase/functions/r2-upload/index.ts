// R2 upload edge function - receives a file and uploads to Cloudflare R2 via S3-compatible API
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ALLOWED_EXTS, ALLOWED_FOLDERS, ALLOWED_MIME, sniffMime } from "../r2-shared/ownership.ts";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
    if (!user) return json({ error: "Unauthorized" }, 401);

    const form = await req.formData();
    const file = form.get("file");
    const folder = (form.get("folder")?.toString() || "annonces").toLowerCase();
    const ext = (form.get("ext")?.toString() || "webp").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "webp";

    if (!ALLOWED_FOLDERS.has(folder)) return json({ error: "Dossier non autorisé" }, 400);
    if (!ALLOWED_EXTS.has(ext)) return json({ error: "Extension non autorisée" }, 400);
    if (!(file instanceof File)) return json({ error: "No file" }, 400);
    if (file.size === 0) return json({ error: "Fichier vide" }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Fichier trop lourd (max 5 Mo)" }, 400);
    const declaredCt = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(declaredCt)) return json({ error: "Format non supporté" }, 400);

    const body = await file.arrayBuffer();
    // Recompute size from the actual buffer to defend against Content-Length spoofing
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) {
      return json({ error: "Fichier trop lourd (max 5 Mo)" }, 400);
    }
    // Magic-byte sniffing: declared MIME must match actual file signature
    const sniffed = sniffMime(new Uint8Array(body.slice(0, 12)));
    if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
      return json({ error: "Le fichier n'est pas une image valide" }, 400);
    }

    const key = `${folder}/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    });
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodeURI(key)}`;

    const r = await client.fetch(endpoint, {
      method: "PUT",
      body,
      headers: { "Content-Type": sniffed, "Content-Length": String(body.byteLength) },
    });
    if (!r.ok) {
      const text = await r.text();
      console.error("R2 PUT failed", r.status, text);
      return json({ error: `R2 upload failed (${r.status})` }, 502);
    }

    const url = `${publicUrl.replace(/\/$/, "")}/${key}`;
    return json({ url, key });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
