import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

const lovableGoogleAuth = createLovableAuth({
  oauthBrokerUrl: "https://oauth.lovable.app/initiate",
});

const LOVABLE_PROJECT_ID = "5f3eeb71-26dc-48b3-8886-9a2d50006110";

type GoogleSignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const signInWithGoogle = async (opts?: GoogleSignInOptions) => {
  const result = await lovableGoogleAuth.signInWithOAuth("google", {
    ...opts,
    extraParams: {
      ...opts?.extraParams,
      project_id: LOVABLE_PROJECT_ID,
    },
  });

  if (result.redirected || result.error) return result;

  try {
    await supabase.auth.setSession(result.tokens);
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)), redirected: false as const };
  }

  return result;
};