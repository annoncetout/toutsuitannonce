import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCloudflareAuth } from "./useCloudflareAuth";

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const { user: cfUser, loading: cfLoading } = useCloudflareAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const cfIsAdmin = cfUser?.role === "admin";

  useEffect(() => {
    if (authLoading || cfLoading) return;

    // Admin déclaré dans la base D1 (compte Google via Cloudflare)
    if (cfIsAdmin) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(!!data && !error);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, cfIsAdmin, cfLoading]);

  return { isAdmin, loading };
};
