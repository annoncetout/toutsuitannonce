// Bridge: turns a verified Cloudflare (Google) identity into a Supabase session.
// Called server-to-server by the Cloudflare Worker only, authenticated with CF_BRIDGE_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bridge-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("CF_BRIDGE_SECRET");
  if (!expected) return json({ error: "bridge_not_configured" }, 500);
  const provided = req.headers.get("x-bridge-secret") ?? "";
  if (provided.length !== expected.length) return json({ error: "unauthorized" }, 401);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return json({ error: "unauthorized" }, 401);

  let payload: {
    email?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    google_id?: string | null;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return json({ error: "invalid_email" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // Find or create the matching Supabase user
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw listErr;
    let user = list.users.find((u) => u.email?.toLowerCase() === email) ?? null;

    if (!user) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: payload.full_name ?? null,
          avatar_url: payload.avatar_url ?? null,
          provider_google_id: payload.google_id ?? null,
          auth_source: "cloudflare_google",
        },
      });
      if (createErr) throw createErr;
      user = created.user;
    } else {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata ?? {}),
          full_name: payload.full_name ?? user.user_metadata?.full_name ?? null,
          avatar_url: payload.avatar_url ?? user.user_metadata?.avatar_url ?? null,
          provider_google_id: payload.google_id ?? user.user_metadata?.provider_google_id ?? null,
          auth_source: "cloudflare_google",
        },
      });
    }

    if (!user) return json({ error: "user_unavailable" }, 500);

    // Keep the public profile in sync (best effort)
    await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: payload.full_name ?? null,
          avatar_url: payload.avatar_url ?? null,
        },
        { onConflict: "id" },
      )
      .then(
        () => undefined,
        () => undefined,
      );

    // Mint a one-time token the browser exchanges for a real session
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr) throw linkErr;

    return json({
      email,
      user_id: user.id,
      token_hash: link.properties?.hashed_token,
    });
  } catch (err) {
    console.error("bridge error", err);
    return json({ error: "bridge_failed" }, 500);
  }
});
