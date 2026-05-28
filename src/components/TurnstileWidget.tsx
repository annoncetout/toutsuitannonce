import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
      getResponse: (id?: string) => string | undefined;
    };
    __turnstileLoaderPromise?: Promise<void>;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (window.__turnstileLoaderPromise) return window.__turnstileLoaderPromise;

  window.__turnstileLoaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile load failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile load failed"));
    document.head.appendChild(s);
  });
  return window.__turnstileLoaderPromise;
}

export interface TurnstileHandle {
  reset: () => void;
  getResponse: () => string | undefined;
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  action?: string;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "flexible" | "compact";
  className?: string;
}

const TurnstileWidget = forwardRef<TurnstileHandle, Props>(
  ({ onVerify, onExpire, onError, action, theme = "dark", size = "flexible", className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const cbRef = useRef({ onVerify, onExpire, onError });
    cbRef.current = { onVerify, onExpire, onError };
    const [status, setStatus] = useState<"loading" | "ready" | "verified" | "error">("loading");
    const [message, setMessage] = useState("Chargement de la vérification…");
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearResetTimer = useCallback(() => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }, []);

    const resetWidget = useCallback(() => {
      clearResetTimer();
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
        setStatus("ready");
        setMessage("Vérification anti-bot prête.");
      }
    }, [clearResetTimer]);

    useImperativeHandle(ref, () => ({
      reset: () => resetWidget(),
      getResponse: () =>
        window.turnstile && widgetIdRef.current ? window.turnstile.getResponse(widgetIdRef.current) : undefined,
    }), [resetWidget]);

    useEffect(() => {
      let cancelled = false;
      const loadTimeout = window.setTimeout(() => {
        if (!widgetIdRef.current) {
          setStatus("error");
          setMessage("Chargement trop long. Réessayez.");
          cbRef.current.onError?.();
        }
      }, 10000);
      loadTurnstile()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          window.clearTimeout(loadTimeout);
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            action,
            theme,
            size,
            callback: (token: string) => {
              setStatus("verified");
              setMessage("Vérification réussie.");
              clearResetTimer();
              resetTimerRef.current = setTimeout(() => {
                cbRef.current.onExpire?.();
                resetWidget();
              }, 105000);
              cbRef.current.onVerify(token);
            },
            "expired-callback": () => {
              setStatus("error");
              setMessage("Captcha expiré. Nouvelle vérification nécessaire.");
              cbRef.current.onExpire?.();
              window.setTimeout(() => resetWidget(), 700);
            },
            "error-callback": (code?: string) => {
              setStatus("error");
              setMessage(code === "110200" ? "Domaine Turnstile non autorisé." : "Erreur captcha. Réessayez.");
              cbRef.current.onError?.();
            },
          });
          setStatus("ready");
          setMessage("Vérification anti-bot prête.");
        })
        .catch(() => {
          window.clearTimeout(loadTimeout);
          setStatus("error");
          setMessage("Impossible de charger Cloudflare Turnstile.");
          cbRef.current.onError?.();
        });

      return () => {
        cancelled = true;
        window.clearTimeout(loadTimeout);
        clearResetTimer();
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
          widgetIdRef.current = null;
        }
      };
    }, [action, theme, size]);

    const StatusIcon = status === "loading" ? Loader2 : status === "verified" ? CheckCircle2 : status === "error" ? AlertCircle : ShieldCheck;

    return (
      <div className={className}>
        <div ref={containerRef} />
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          <StatusIcon className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : status === "verified" ? "text-primary" : status === "error" ? "text-destructive" : ""}`} />
          <span>{message}</span>
          {status === "error" && (
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={resetWidget}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  },
);

TurnstileWidget.displayName = "TurnstileWidget";
export default TurnstileWidget;
