// R2 delete edge function - deletes an object owned by the user
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, key: rawKey } = await req.json();
    let key = rawKey as string | undefined;
    if (!key && typeof url === "string") {
      const prefix = publicUrl.replace(/\/$/, "") + "/";
      if (url.startsWith(prefix)) key = url.slice(prefix.length);
    }
    if (!key) {
      return new Response(JSON.stringify({ error: "key/url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Ownership check: key must contain user.id segment
    if (!key.includes(`/${user.id}/`)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodeURI(key)}`;
    const r = await client.fetch(endpoint, { method: "DELETE" });
    if (!r.ok && r.status !== 404) {
      return new Response(JSON.stringify({ error: `R2 delete failed (${r.status})` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
