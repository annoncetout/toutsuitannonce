import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

const lovableGoogleAuth = createLovableAuth({
  oauthBrokerUrl: "https://oauth.lovable.app/initiate",
});

type GoogleSignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const signInWithGoogle = async (opts?: GoogleSignInOptions) => {
  const result = await lovableGoogleAuth.signInWithOAuth("google", opts);

  if (result.redirected || result.error) return result;

  try {
    await supabase.auth.setSession(result.tokens);
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }

  return result;
};