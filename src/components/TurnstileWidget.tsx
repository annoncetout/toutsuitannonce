import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";

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

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (window.turnstile && widgetIdRef.current) window.turnstile.reset(widgetIdRef.current);
      },
      getResponse: () =>
        window.turnstile && widgetIdRef.current ? window.turnstile.getResponse(widgetIdRef.current) : undefined,
    }));

    useEffect(() => {
      let cancelled = false;
      loadTurnstile()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            action,
            theme,
            size,
            callback: (token: string) => cbRef.current.onVerify(token),
            "expired-callback": () => cbRef.current.onExpire?.(),
            "error-callback": () => cbRef.current.onError?.(),
          });
        })
        .catch(() => cbRef.current.onError?.());

      return () => {
        cancelled = true;
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
          widgetIdRef.current = null;
        }
      };
    }, [action, theme, size]);

    return <div ref={containerRef} className={className} />;
  },
);

TurnstileWidget.displayName = "TurnstileWidget";
export default TurnstileWidget;
