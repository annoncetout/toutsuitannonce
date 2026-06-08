import { supabase } from "@/integrations/supabase/client";

type GoogleSignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

/**
 * Sign in with Google using the project's OWN Google OAuth credentials
 * configured directly in Supabase Auth (no Lovable broker).
 *
 * Flow:
 *  1. Browser -> Google consent screen
 *  2. Google -> https://<project>.supabase.co/auth/v1/callback
 *  3. Supabase -> redirectTo (https://toutsuiteannonces.com/auth/callback)
 */
export const signInWithProductionGoogle = async (opts?: GoogleSignInOptions) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: opts?.redirect_uri,
      queryParams: {
        prompt: "select_account",
        ...opts?.extraParams,
      },
    },
  });

  if (error) {
    return { error, redirected: false as const };
  }

  // supabase.auth.signInWithOAuth triggers a full-page redirect to Google.
  return { redirected: true as const, url: data?.url };
};
