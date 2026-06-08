import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthPrompt } from "@/components/AuthPromptDialog";

interface Props {
  children: ReactNode;
  title?: string;
  message?: string;
}

/**
 * Gate that requires authentication. Instead of silently redirecting,
 * it opens the AuthPromptDialog (Annuler / Se connecter / Créer un compte).
 * The user is sent back to "/" while unauthenticated.
 */
const AuthPromptGate = ({ children, title, message }: Props) => {
  const { user, loading } = useAuth();
  const { requireAuth } = useAuthPrompt();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) requireAuth({ title, message });
  }, [loading, user, requireAuth, title, message]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Send to home; the dialog is already open and lets them choose.
    return <Navigate to="/" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
};

export default AuthPromptGate;
