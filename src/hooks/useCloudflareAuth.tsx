import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

export interface CloudflareUser {
  id: string;
  email: string;
  full_name: string | null;
  given_name?: string | null;
  avatar_url: string | null;
  role: "user" | "admin" | string;
}

interface CloudflareAuthValue {
  user: CloudflareUser | null;
  loading: boolean;
  /** True when the Cloudflare auth Worker answered (i.e. auth backend is deployed). */
  available: boolean;
  refresh: () => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => void;
  signOut: () => Promise<void>;
}

const CloudflareAuthContext = createContext<CloudflareAuthValue>({
  user: null,
  loading: true,
  available: false,
  refresh: async () => {},
  signInWithGoogle: () => {},
  signOut: async () => {},
});

/**
 * Reads the HttpOnly session issued by the Cloudflare Worker.
 * Nothing sensitive is ever stored in localStorage.
 */
export const CloudflareAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CloudflareUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const contentType = res.headers.get("Content-Type") || "";
      if (!res.ok || !contentType.includes("application/json")) {
        // Worker not deployed on this origin (e.g. Lovable preview) -> SPA fallback HTML
        setAvailable(false);
        setUser(null);
        return;
      }
      const data = (await res.json()) as { authenticated: boolean; user: CloudflareUser | null };
      setAvailable(true);
      setUser(data.authenticated ? data.user : null);
    } catch {
      setAvailable(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signInWithGoogle = useCallback((redirectTo?: string) => {
    const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";
    window.location.assign(`/auth/google?redirect=${encodeURIComponent(target)}`);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  return (
    <CloudflareAuthContext.Provider
      value={{ user, loading, available, refresh, signInWithGoogle, signOut }}
    >
      {children}
    </CloudflareAuthContext.Provider>
  );
};

export const useCloudflareAuth = () => useContext(CloudflareAuthContext);
