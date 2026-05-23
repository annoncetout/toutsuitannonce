// R2 delete edge function - deletes one or several objects owned by the caller.
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isOwnedKey, keyFromUrl } from "../r2-shared/ownership.ts";

const MAX_BATCH = 50;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const bucket = Deno.env.get("R2_BUCKET")!;
    const publicUrl = Deno.env.get("R2_PUBLIC_URL")!;

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const payload = await req.json().catch(() => ({}));
    // Accept either { key|url } or { keys: string[], urls: string[] }
    const items: Array<string> = [];
    if (typeof payload?.key === "string") items.push(payload.key);
    if (Array.isArray(payload?.keys)) items.push(...payload.keys.filter((k: unknown) => typeof k === "string"));
    if (typeof payload?.url === "string") {
      const k = keyFromUrl(payload.url, publicUrl);
      if (k) items.push(k);
    }
    if (Array.isArray(payload?.urls)) {
      for (const u of payload.urls) {
        const k = keyFromUrl(u, publicUrl);
        if (k) items.push(k);
      }
    }
    const keys = Array.from(new Set(items)).slice(0, MAX_BATCH);
    if (keys.length === 0) return json({ error: "key/url required" }, 400);

    // Enforce ownership for every key
    const denied = keys.filter((k) => !isOwnedKey(k, user.id));
    if (denied.length > 0) return json({ error: "Forbidden", denied }, 403);

    const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
    const results: Array<{ key: string; ok: boolean; status: number }> = [];
    await Promise.all(keys.map(async (key) => {
      const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodeURI(key)}`;
      try {
        const r = await client.fetch(endpoint, { method: "DELETE" });
        results.push({ key, ok: r.ok || r.status === 404, status: r.status });
      } catch (_) {
        results.push({ key, ok: false, status: 0 });
      }
    }));

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0 && failed.length === results.length) {
      return json({ error: "R2 delete failed", results }, 502);
    }
    return json({ ok: true, deleted: results.filter((r) => r.ok).length, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
