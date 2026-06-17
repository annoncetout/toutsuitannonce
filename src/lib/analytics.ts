// Google Analytics 4 (gtag) helper — loaded immediately on app start.
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const DEFAULT_GA_ID = "G-0K0RLGS9EH";

export const GA_ID: string =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || DEFAULT_GA_ID;

let scriptInjected = false;
let configured = false;

function ensureGtagStub() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.gtag = function gtag(...args: any[]) {
      window.dataLayer.push(args);
    };
  }
}

// Kept for backwards compatibility (no-ops now that consent is not required).
export function getAnalyticsConsent(): "granted" | "denied" | null {
  return "granted";
}
export function setAnalyticsConsent(_value: "granted" | "denied") {
  // no-op
}

export function initAnalytics() {
  if (typeof window === "undefined" || !GA_ID) return;
  ensureGtagStub();
  // Script + config are already injected in index.html.
  // Mark as configured to avoid duplicate calls.
  scriptInjected = true;
  configured = true;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("Google Analytics chargé avec succès");
  }
}

export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;
  ensureGtagStub();
  window.gtag("event", name, params);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, params);
  }
}

export function trackPageView(path: string) {
  if (typeof window === "undefined" || !GA_ID) return;
  ensureGtagStub();
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
