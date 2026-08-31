import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCloudflareAuth } from "@/hooks/useCloudflareAuth";

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const cfAuth = useCloudflareAuth();
  const location = useLocation();

  const authenticated = Boolean(cfAuth.user || user);
  const stillLoading = loading || cfAuth.loading;

  if (stillLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/connexion?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
