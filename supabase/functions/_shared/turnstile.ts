// Server-side verification helper for Cloudflare Turnstile.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  success: boolean;
  errorCodes?: string[];
  action?: string;
  hostname?: string;
}

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
  expectedAction?: string | null,
): Promise<TurnstileVerifyResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return { success: false, errorCodes: ["missing-secret"] };
  if (!token) return { success: false, errorCodes: ["missing-token"] };

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: controller.signal });
    const json = await res.json();
    const action = typeof json.action === "string" ? json.action : undefined;
    const errorCodes = Array.isArray(json["error-codes"]) ? json["error-codes"] : [];
    const actionMatches = !expectedAction || !action || action === expectedAction;
    return {
      success: Boolean(json.success) && actionMatches,
      errorCodes: actionMatches ? errorCodes : [...errorCodes, "action-mismatch"],
      action,
      hostname: typeof json.hostname === "string" ? json.hostname : undefined,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, errorCodes: ["network-timeout"] };
    }
    return { success: false, errorCodes: ["network-error"] };
  } finally {
    clearTimeout(timeout);
  }
}

export function getClientIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
