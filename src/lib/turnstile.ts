import { supabase } from "@/integrations/supabase/client";

// Cloudflare Turnstile - public site key (safe to ship in client).
// Vite injects VITE_* values on custom deployments; keep the current key as fallback.
export const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAADWV6kDCqqC8qWck";

export type TurnstileErrorReason =
  | "missing-token"
  | "network-error"
  | "server-error"
  | "invalid-token"
  | "captcha-expired"
  | "domain-not-authorized"
  | "sitekey-invalid"
  | "secret-misconfigured"
  | "unknown";

export interface TurnstileVerification {
  success: boolean;
  reason?: TurnstileErrorReason;
  errors: string[];
}

const mapErrorReason = (errors: string[] = []): TurnstileErrorReason => {
  if (errors.includes("missing-token")) return "missing-token";
  if (errors.includes("missing-secret")) return "secret-misconfigured";
  if (errors.includes("timeout-or-duplicate")) return "captcha-expired";
  if (errors.includes("network-error")) return "network-error";
  if (errors.some((error) => error.includes("110200"))) return "domain-not-authorized";
  if (errors.some((error) => error.includes("sitekey") || error.includes("110100") || error.includes("110110"))) {
    return "sitekey-invalid";
  }
  if (errors.length > 0) return "invalid-token";
  return "unknown";
};

/**
 * Verify a Turnstile token server-side via our edge function.
 * Returns true on success.
 */
export async function verifyTurnstileToken(token: string, action?: string): Promise<TurnstileVerification> {
  if (!token) return { success: false, reason: "missing-token", errors: ["missing-token"] };
  try {
    const { data, error } = await supabase.functions.invoke("verify-turnstile", {
      body: { token, action },
    });
    if (error) return { success: false, reason: "server-error", errors: [error.message] };
    const payload = data as { success?: boolean; errors?: string[] } | null;
    const errors = payload?.errors ?? [];
    return { success: Boolean(payload?.success), reason: payload?.success ? undefined : mapErrorReason(errors), errors };
  } catch {
    return { success: false, reason: "network-error", errors: ["network-error"] };
  }
}

export const getTurnstileErrorMessage = (reason?: TurnstileErrorReason) => {
  switch (reason) {
    case "captcha-expired":
      return "Le captcha a expiré. Une nouvelle vérification est nécessaire.";
    case "network-error":
      return "Erreur réseau pendant la vérification anti-bot. Vérifiez votre connexion.";
    case "server-error":
      return "Le serveur de vérification ne répond pas. Réessayez dans un instant.";
    case "domain-not-authorized":
      return "Ce domaine n’est pas autorisé dans Cloudflare Turnstile.";
    case "sitekey-invalid":
      return "La clé publique Turnstile est invalide ou désactivée.";
    case "secret-misconfigured":
      return "La clé secrète Turnstile n’est pas configurée côté serveur.";
    case "missing-token":
      return "Veuillez compléter la vérification anti-bot.";
    default:
      return "Token captcha invalide. Réessayez.";
  }
};
