// Google Analytics 4 (gtag) helper with consent gating.
// Default measurement ID can be overridden via VITE_GA_MEASUREMENT_ID.
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const DEFAULT_GA_ID = "G-0K0RLGS9EH";
const CONSENT_KEY = "ga-consent-v1"; // values: "granted" | "denied"

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

export function getAnalyticsConsent(): "granted" | "denied" | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CONSENT_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

export function setAnalyticsConsent(value: "granted" | "denied") {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, value);
  ensureGtagStub();
  window.gtag("consent", "update", {
    ad_storage: "denied",
    analytics_storage: value,
  });
  if (value === "granted") initAnalytics();
}

export function initAnalytics() {
  if (typeof window === "undefined" || !GA_ID) return;
  ensureGtagStub();

  // Default consent: deny until user accepts (GDPR-friendly).
  if (!configured) {
    window.gtag("consent", "default", {
      ad_storage: "denied",
      analytics_storage: getAnalyticsConsent() === "granted" ? "granted" : "denied",
      wait_for_update: 500,
    });
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: false, anonymize_ip: true });
    configured = true;
  }

  if (getAnalyticsConsent() !== "granted") return;

  if (!scriptInjected) {
    scriptInjected = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
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
