import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { sanitizeAuthRedirect } from "@/lib/authRedirect";
import { toast } from "sonner";

type CallbackState = "verifying" | "confirmed" | "expired" | "invalid";

const getHashParams = () => new URLSearchParams(window.location.hash.replace(/^#/, ""));

const getCallbackErrorMessage = (rawMessage: string) => {
  const text = decodeURIComponent(rawMessage).toLowerCase();
  if (text.includes("expired")) return "Ce lien de connexion a expiré. Relancez la connexion.";
  if (text.includes("provider") || text.includes("google") || text.includes("oauth")) {
    return "La connexion Google n’a pas pu être finalisée. Réessayez depuis la page de connexion.";
  }
  return "Ce lien de connexion est invalide ou a déjà été utilisé.";
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = useMemo(() => sanitizeAuthRedirect(searchParams.get("next")), [searchParams]);
  const [state, setState] = useState<CallbackState>("verifying");
  const [message, setMessage] = useState("Finalisation de votre connexion en cours…");

  useEffect(() => {
    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const finishSuccess = async () => {
      if (cancelled) return;
      setState("confirmed");
      setMessage("Connexion confirmée. Redirection en cours…");
      localStorage.removeItem("pending-confirmation-email");
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        const name = (u?.user_metadata?.full_name as string)
          ?? (u?.user_metadata?.name as string)
          ?? "";
        toast.success(name ? `Bienvenue ${name} 👋` : "Connexion réussie");
      } catch {
        toast.success("Connexion réussie");
      }
      redirectTimer = setTimeout(() => navigate(next, { replace: true }), 1200);
    };

    const fail = (nextState: Exclude<CallbackState, "verifying" | "confirmed">, nextMessage: string) => {
      if (cancelled) return;
      setState(nextState);
      setMessage(nextMessage);
      toast.error(nextMessage);
    };

    const verify = async () => {
      const hash = getHashParams();
      const errorCode = searchParams.get("error_code") || hash.get("error_code");
      const errorDescription = searchParams.get("error_description") || hash.get("error_description");

      if (errorCode || errorDescription) {
        const text = decodeURIComponent(errorDescription ?? "").toLowerCase();
        fail(
          text.includes("expired") ? "expired" : "invalid",
          getCallbackErrorMessage(errorDescription ?? errorCode ?? ""),
        );
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error(error);
          fail(
            error.message.toLowerCase().includes("expired") ? "expired" : "invalid",
            error.message.toLowerCase().includes("expired")
              ? "Ce lien de connexion a expiré. Relancez la connexion."
              : "Impossible de finaliser la connexion. Réessayez depuis la page de connexion.",
          );
          return;
        }
        finishSuccess();
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          console.error(error);
          fail("invalid", "La session Google est invalide. Réessayez depuis la page de connexion.");
          return;
        }
        finishSuccess();
        return;
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as "signup" | "email_change" | "magiclink" | null;
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          console.error(error);
          fail(
            error.message.toLowerCase().includes("expired") ? "expired" : "invalid",
            error.message.toLowerCase().includes("expired")
              ? "Ce lien de confirmation a expiré. Demandez un nouvel email."
              : "Ce lien de confirmation est invalide. Demandez un nouvel email.",
          );
          return;
        }
        finishSuccess();
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) console.error(error);
      if (data.session) finishSuccess();
      else fail("invalid", "Lien de connexion incomplet. Réessayez depuis la page de connexion.");
    };

    verify();

    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [navigate, next, searchParams]);

  const Icon = state === "verifying" ? Loader2 : state === "confirmed" ? CheckCircle2 : state === "expired" ? MailCheck : AlertTriangle;

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <main className="w-full max-w-md bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-8 text-center shadow-card">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
          <Icon className={`h-7 w-7 text-primary ${state === "verifying" ? "animate-spin" : ""}`} />
        </div>
        <h1 className="font-display text-2xl font-bold mb-3">
          {state === "confirmed" ? "Connexion confirmée" : state === "verifying" ? "Connexion en cours" : "Connexion impossible"}
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-6">{message}</p>
        {state !== "verifying" && state !== "confirmed" && (
          <div className="flex flex-col gap-3">
            <Button asChild variant="gold" className="w-full"><Link to="/auth?mode=signup">Renvoyer l’email</Link></Button>
            <Button asChild variant="outlineGold" className="w-full"><Link to="/auth">Retour à la connexion</Link></Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AuthCallback;