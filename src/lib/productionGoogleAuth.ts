import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

const PRODUCTION_ORIGIN = "https://toutsuiteannonces.com";

const productionGoogleAuth = createLovableAuth({
  oauthBrokerUrl: `${PRODUCTION_ORIGIN}/~oauth/initiate`,
});

type GoogleSignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const signInWithProductionGoogle = async (opts?: GoogleSignInOptions) => {
  const result = await productionGoogleAuth.signInWithOAuth("google", opts);

  if (result.redirected || result.error) return result;

  try {
    await supabase.auth.setSession(result.tokens);
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)), redirected: false as const };
  }

  return result;
};