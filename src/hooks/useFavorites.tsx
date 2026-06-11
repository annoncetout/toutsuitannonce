import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Ctx = {
  ids: Set<string>;
  isFavorite: (listingId: string) => boolean;
  toggle: (listingId: string) => Promise<boolean>; // returns new state
  loading: boolean;
};

const FavoritesContext = createContext<Ctx | null>(null);
const GUEST_KEY = "guest-favorites";

function readGuest(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeGuest(ids: Set<string>) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(() => new Set(readGuest()));
  const [loading, setLoading] = useState(false);
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    if (!user) {
      // logged out: restore guest favorites from localStorage
      setIds(new Set(readGuest()));
      return;
    }
    let cancelled = false;
    setLoading(true);

    const loadAndMerge = async () => {
      const guest = readGuest();
      const { data } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id);
      const remote = new Set((data ?? []).map((r: any) => r.listing_id as string));

      // Merge any guest favorites that aren't already saved on the account
      const toInsert = guest.filter((lid) => !remote.has(lid));
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from("favorites")
          .insert(toInsert.map((listing_id) => ({ user_id: user.id, listing_id })));
        if (!error) {
          toInsert.forEach((lid) => remote.add(lid));
          toast.success(
            toInsert.length === 1
              ? "1 favori synchronisé avec votre compte"
              : `${toInsert.length} favoris synchronisés avec votre compte`,
          );
        }
      }
      try {
        localStorage.removeItem(GUEST_KEY);
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        setIds(remote);
        setLoading(false);
      }
    };
    loadAndMerge();

    const channel = supabase
      .channel(`favorites:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "favorites", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setIds((prev) => {
            const next = new Set(prev);
            if (payload.eventType === "INSERT") {
              const lid = (payload.new as any)?.listing_id as string | undefined;
              if (lid) next.add(lid);
            } else if (payload.eventType === "DELETE") {
              const lid = (payload.old as any)?.listing_id as string | undefined;
              if (lid) next.delete(lid);
            }
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isFavorite = useCallback((listingId: string) => idsRef.current.has(listingId), []);

  const toggle = useCallback(
    async (listingId: string) => {
      const wasFav = idsRef.current.has(listingId);

      // Guest mode: persist to localStorage only
      if (!user) {
        const next = new Set(idsRef.current);
        if (wasFav) next.delete(listingId);
        else next.add(listingId);
        setIds(next);
        writeGuest(next);
        return !wasFav;
      }

      // Optimistic update
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFav) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      if (wasFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        if (error) {
          setIds((prev) => {
            const next = new Set(prev);
            next.add(listingId);
            return next;
          });
          return true;
        }
        return false;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) {
          setIds((prev) => {
            const next = new Set(prev);
            next.delete(listingId);
            return next;
          });
          return false;
        }
        return true;
      }
    },
    [user],
  );

  const value = useMemo(() => ({ ids, isFavorite, toggle, loading }), [ids, isFavorite, toggle, loading]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
