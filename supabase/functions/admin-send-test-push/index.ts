// Admin-only: insert a notification (which triggers the push) for self or all users.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const caller = userData.user;

    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const scope = body?.scope === "all" ? "all" : "self";
    const title = (body?.title as string) || "🔔 Test notification";
    const message = (body?.body as string) || "Si vous voyez ce message, votre appareil est correctement abonné aux notifications push.";
    const link = (body?.link as string) || "/";

    let targets: string[] = [];
    if (scope === "all") {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      targets = (users?.users ?? []).map((u) => u.id);
    } else {
      targets = [caller.id];
    }

    if (targets.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = targets.map((uid) => ({
      user_id: uid, type: "admin_test", title, body: message, link,
      metadata: { test: true, sent_by: caller.id },
    }));

    // Chunk inserts to avoid payload limits
    const CHUNK = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error, count } = await admin.from("notifications").insert(rows.slice(i, i + CHUNK), { count: "exact" });
      if (error) {
        return new Response(JSON.stringify({ error: error.message, inserted }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted += count ?? rows.slice(i, i + CHUNK).length;
    }

    return new Response(JSON.stringify({ inserted, scope, targets: targets.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
