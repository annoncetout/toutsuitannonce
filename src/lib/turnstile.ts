// Cloudflare Turnstile - public site key (safe to ship in client)
export const TURNSTILE_SITE_KEY = "0x4AAAAAADWV6kDCqqC8qWck";

import { supabase } from "@/integrations/supabase/client";

/**
 * Verify a Turnstile token server-side via our edge function.
 * Returns true on success.
 */
export async function verifyTurnstileToken(token: string, action?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { data, error } = await supabase.functions.invoke("verify-turnstile", {
      body: { token, action },
    });
    if (error) return false;
    return Boolean((data as any)?.success);
  } catch {
    return false;
  }
}
