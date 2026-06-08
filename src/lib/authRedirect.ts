const DEFAULT_AUTH_REDIRECT = "/mon-compte";
const PRODUCTION_AUTH_ORIGIN = "https://toutsuiteannonces.com";

export const sanitizeAuthRedirect = (value: string | null | undefined) => {
  if (!value) return DEFAULT_AUTH_REDIRECT;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_AUTH_REDIRECT;
  if (value.startsWith("/auth")) return DEFAULT_AUTH_REDIRECT;
  return value;
};

const getAuthOrigin = () => {
  if (typeof window === "undefined") return PRODUCTION_AUTH_ORIGIN;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return window.location.origin;
  }
  return PRODUCTION_AUTH_ORIGIN;
};

export const getAuthCallbackUrl = (next?: string | null) => {
  const url = new URL("/auth/callback", getAuthOrigin());
  url.searchParams.set("next", sanitizeAuthRedirect(next));
  return url.toString();
};