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
): Promise<TurnstileVerifyResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return { success: false, errorCodes: ["missing-secret"] };
  if (!token) return { success: false, errorCodes: ["missing-token"] };

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body });
    const json = await res.json();
    return {
      success: Boolean(json.success),
      errorCodes: json["error-codes"],
      action: json.action,
      hostname: json.hostname,
    };
  } catch {
    return { success: false, errorCodes: ["network-error"] };
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
