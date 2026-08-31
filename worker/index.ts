/**
 * Cloudflare Worker — Google OAuth 2.0 authentication for TOUT SUITE ANNONCES.
 *
 * Endpoints:
 *   GET  /auth/google           -> start OAuth (state + PKCE), redirect to Google
 *   GET  /auth/google/callback  -> verify state, exchange code, upsert user in D1, set session cookie
 *   GET  /api/auth/me           -> { authenticated, user }
 *   POST /auth/logout           -> revoke session + clear cookie
 *
 * Everything else is served from the static SPA assets (Lovable build output).
 * Secrets live only in Cloudflare: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET.
 */

export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  /** e.g. https://www.toutsuiteannonces.com — optional, defaults to the request origin */
  APP_ORIGIN?: string;
}

const COOKIE_NAME = "tsa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const STATE_TTL_SECONDS = 60 * 10;

/* ------------------------------- helpers -------------------------------- */

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken(size = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(size)));
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", enc.encode(input));
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

async function signValue(secret: string, value: string): Promise<string> {
  return `${value}.${await hmac(secret, value)}`;
}

async function verifyValue(secret: string, signed: string): Promise<string | null> {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = await hmac(secret, value);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? value : null;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function sessionCookie(value: string, maxAge: number, secure: boolean): string {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    `Max-Age=${maxAge}`,
  ]
    .filter(Boolean)
    .join("; ");
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/** Only allow same-origin relative paths as post-login redirect targets. */
function safeRedirectPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function appOrigin(req: Request, env: Env): string {
  return env.APP_ORIGIN?.replace(/\/$/, "") || new URL(req.url).origin;
}

/* --------------------------------- OAuth -------------------------------- */

async function startGoogleOAuth(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const origin = appOrigin(req, env);
  const redirectTo = safeRedirectPath(url.searchParams.get("redirect"));

  const state = randomToken();
  const codeVerifier = randomToken(48);
  const codeChallenge = b64url(await sha256(codeVerifier));
  const expiresAt = new Date(Date.now() + STATE_TTL_SECONDS * 1000).toISOString();

  await env.DB.prepare(
    "INSERT INTO oauth_states (state, code_verifier, redirect_to, expires_at) VALUES (?1, ?2, ?3, ?4)",
  )
    .bind(state, codeVerifier, redirectTo, expiresAt)
    .run();

  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  auth.searchParams.set("redirect_uri", `${origin}/auth/google/callback`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email profile");
  auth.searchParams.set("state", state);
  auth.searchParams.set("code_challenge", codeChallenge);
  auth.searchParams.set("code_challenge_method", "S256");
  auth.searchParams.set("prompt", "select_account");
  auth.searchParams.set("access_type", "online");

  return Response.redirect(auth.toString(), 302);
}

function decodeIdToken(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=")));
  } catch {
    return null;
  }
}

async function handleGoogleCallback(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const origin = appOrigin(req, env);
  const secure = origin.startsWith("https://");

  const error = url.searchParams.get("error");
  if (error) return Response.redirect(`${origin}/connexion?error=${encodeURIComponent(error)}`, 302);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return Response.redirect(`${origin}/connexion?error=missing_code`, 302);

  const row = await env.DB.prepare(
    "SELECT code_verifier, redirect_to, expires_at FROM oauth_states WHERE state = ?1",
  )
    .bind(state)
    .first<{ code_verifier: string; redirect_to: string | null; expires_at: string }>();

  await env.DB.prepare("DELETE FROM oauth_states WHERE state = ?1 OR expires_at < datetime('now')")
    .bind(state)
    .run();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return Response.redirect(`${origin}/connexion?error=invalid_state`, 302);
  }

  // Exchange the authorization code
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      code_verifier: row.code_verifier,
      grant_type: "authorization_code",
      redirect_uri: `${origin}/auth/google/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(`${origin}/connexion?error=token_exchange_failed`, 302);
  }
  const tokens = (await tokenRes.json()) as { access_token?: string; id_token?: string };

  // Verify identity: prefer the userinfo endpoint (validated by Google), fall back to id_token claims
  let profile: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    picture?: string;
  } | null = null;

  if (tokens.access_token) {
    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (infoRes.ok) profile = await infoRes.json();
  }
  if (!profile && tokens.id_token) profile = decodeIdToken(tokens.id_token) as typeof profile;

  if (!profile?.sub || !profile.email) {
    return Response.redirect(`${origin}/connexion?error=profile_unavailable`, 302);
  }

  const now = new Date().toISOString();
  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE google_id = ?1 OR email = ?2",
  )
    .bind(profile.sub, profile.email)
    .first<{ id: string }>();

  let userId: string;
  if (existing) {
    userId = existing.id;
    await env.DB.prepare(
      `UPDATE users SET google_id = ?2, email = ?3, full_name = ?4, given_name = ?5,
         avatar_url = ?6, updated_at = ?7, last_login_at = ?7 WHERE id = ?1`,
    )
      .bind(
        userId,
        profile.sub,
        profile.email,
        profile.name ?? null,
        profile.given_name ?? null,
        profile.picture ?? null,
        now,
      )
      .run();
  } else {
    userId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO users (id, google_id, email, full_name, given_name, avatar_url, role, created_at, updated_at, last_login_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'user', ?7, ?7, ?7)`,
    )
      .bind(
        userId,
        profile.sub,
        profile.email,
        profile.name ?? null,
        profile.given_name ?? null,
        profile.picture ?? null,
        now,
      )
      .run();
  }

  // Secure session: only a signed session id travels in the cookie
  const sessionId = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at, user_agent) VALUES (?1, ?2, ?3, ?4)",
  )
    .bind(sessionId, userId, expiresAt, req.headers.get("User-Agent")?.slice(0, 255) ?? null)
    .run();

  const signed = await signValue(env.SESSION_SECRET, sessionId);
  const target = `${origin}${safeRedirectPath(row.redirect_to)}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      "Set-Cookie": sessionCookie(signed, SESSION_TTL_SECONDS, secure),
      "Cache-Control": "no-store",
    },
  });
}

async function currentUser(req: Request, env: Env) {
  const raw = readCookie(req, COOKIE_NAME);
  if (!raw) return null;
  const sessionId = await verifyValue(env.SESSION_SECRET, raw);
  if (!sessionId) return null;

  return env.DB.prepare(
    `SELECT u.id, u.email, u.full_name, u.given_name, u.avatar_url, u.role, s.id AS session_id
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ?1 AND s.expires_at > datetime('now')`,
  )
    .bind(sessionId)
    .first<{
      id: string;
      email: string;
      full_name: string | null;
      given_name: string | null;
      avatar_url: string | null;
      role: string;
      session_id: string;
    }>();
}

async function handleMe(req: Request, env: Env): Promise<Response> {
  const user = await currentUser(req, env);
  if (!user) return json({ authenticated: false, user: null });
  return json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      given_name: user.given_name,
      avatar_url: user.avatar_url,
      role: user.role,
    },
  });
}

async function handleLogout(req: Request, env: Env): Promise<Response> {
  const user = await currentUser(req, env);
  if (user) await env.DB.prepare("DELETE FROM sessions WHERE id = ?1").bind(user.session_id).run();
  const secure = appOrigin(req, env).startsWith("https://");
  return json({ success: true }, 200, { "Set-Cookie": sessionCookie("", 0, secure) });
}

/* -------------------------------- router -------------------------------- */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    try {
      if (path === "/auth/google" && req.method === "GET") return await startGoogleOAuth(req, env);
      if (path === "/auth/google/callback" && req.method === "GET") return await handleGoogleCallback(req, env);
      if (path === "/api/auth/me" && req.method === "GET") return await handleMe(req, env);
      if (path === "/auth/logout" && req.method === "POST") return await handleLogout(req, env);
      if (path === "/auth/logout" || path === "/api/auth/me") {
        return json({ error: "method_not_allowed" }, 405);
      }
    } catch (err) {
      console.error("auth worker error", err);
      if (path.startsWith("/api/")) return json({ error: "internal_error" }, 500);
      return Response.redirect(`${appOrigin(req, env)}/connexion?error=server_error`, 302);
    }

    return env.ASSETS.fetch(req);
  },
};
