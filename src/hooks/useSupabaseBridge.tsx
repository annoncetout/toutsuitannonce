import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCloudflareAuth } from "@/hooks/useCloudflareAuth";
import { useAuth } from "@/hooks/useAuth";

/**
 * Links the Cloudflare (Google) session to the Supabase identity used by all
 * existing data (annonces, favoris, colis...). The Worker verifies the HttpOnly
 * session and returns a one-time token that we exchange for a Supabase session.
 */
export const useSupabaseBridge = () => {
  const cfAuth = useCloudflareAuth();
  const { user, loading } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || cfAuth.loading) return;
    if (!cfAuth.available || !cfAuth.user) return;
    if (user) return; // already linked
    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/supabase-session", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { email?: string; token_hash?: string };
        if (!data.token_hash || !data.email) return;
        await supabase.auth.verifyOtp({
          type: "email",
          email: data.email,
          token_hash: data.token_hash,
        });
      } catch {
        /* silent: the site still works with the Cloudflare session only */
      }
    })();
  }, [cfAuth.available, cfAuth.loading, cfAuth.user, user, loading]);
};

export const SupabaseBridge = () => {
  useSupabaseBridge();
  return null;
};
