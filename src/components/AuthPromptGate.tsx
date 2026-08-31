import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCloudflareAuth } from "@/hooks/useCloudflareAuth";
import { useAuthPrompt } from "@/components/AuthPromptDialog";

interface Props {
  children: ReactNode;
  title?: string;
  message?: string;
}

/**
 * Gate that requires authentication. Accepts either the Cloudflare Google session
 * or the existing account session (migration progressive).
 */
const AuthPromptGate = ({ children, title, message }: Props) => {
  const { user, loading } = useAuth();
  const cfAuth = useCloudflareAuth();
  const { requireAuth } = useAuthPrompt();
  const location = useLocation();

  const authenticated = Boolean(cfAuth.user || user);
  const stillLoading = loading || cfAuth.loading;
  // When the Cloudflare auth Worker is live, send users to the dedicated /connexion page.
  const useCloudflareRedirect = cfAuth.available;

  useEffect(() => {
    if (!stillLoading && !authenticated && !useCloudflareRedirect) requireAuth({ title, message });
  }, [stillLoading, authenticated, useCloudflareRedirect, requireAuth, title, message]);

  if (stillLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    const redirect = `${location.pathname}${location.search}`;
    if (useCloudflareRedirect) {
      return <Navigate to={`/connexion?redirect=${encodeURIComponent(redirect)}`} replace />;
    }
    // Dialog is already open; send back home so the user can choose.
    return <Navigate to="/" replace state={{ from: redirect }} />;
  }

  return <>{children}</>;
};

export default AuthPromptGate;
