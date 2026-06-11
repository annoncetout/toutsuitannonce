import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Ctx = {
  ids: Set<string>;
  isFavorite: (listingId: string) => boolean;
  toggle: (listingId: string) => Promise<boolean>; // returns new state
  loading: boolean;
};

const FavoritesContext = createContext<Ctx | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("favorites")
      .select("listing_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setIds(new Set((data ?? []).map((r: any) => r.listing_id as string)));
        setLoading(false);
      });

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
      if (!user) return false;
      const wasFav = idsRef.current.has(listingId);
      // optimistic
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
