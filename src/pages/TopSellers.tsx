import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Star, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SellerBadge, { SellerBadgeKind } from "@/components/SellerBadge";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import { useSEO, SITE_URL } from "@/lib/seo";

type Row = {
  user_id: string;
  top_score: number;
  badge: SellerBadgeKind;
  rank_global: number | null;
  active_listings_count: number;
  sales_count: number;
  avg_rating: number;
  reviews_count: number;
  category_scores: Record<string, number>;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  total_views: number;
  response_rate: number;
  account_age_days: number;
  quality_score: number;
};

const PAGE_SIZE = 20;

const CATS = [
  { value: "all", label: "Tous" },
  { value: "immobilier", label: "Immobilier" },
  { value: "vehicules", label: "Véhicules" },
  { value: "Telephone", label: "Téléphones" },
  { value: "electronique", label: "Électronique" },
  { value: "mode-beaute", label: "Mode" },
  { value: "emploi", label: "Emploi" },
  { value: "divers", label: "Services" },
];

export default function TopSellers() {
  useSEO({
    title: "Top Vendeurs IA — Meilleurs vendeurs au Sénégal | TOUT DE SUITE",
    description:
      "Classement IA des meilleurs vendeurs au Sénégal : score basé sur les ventes, avis clients, réactivité et qualité des annonces. Mis à jour quotidiennement.",
    canonical: `${SITE_URL}/top-vendeurs`,
  });

  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") || "all";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("seller_stats")
        .select(
          "user_id, top_score, badge, rank_global, active_listings_count, sales_count, avg_rating, reviews_count, category_scores, display_name, avatar_url, city, total_views, response_rate, account_age_days, quality_score",
        )
        .gt("active_listings_count", 0)
        .order("top_score", { ascending: false })
        .limit(500);
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (cat === "all") return rows;
    return [...rows]
      .map((r) => ({ ...r, _s: Number(r.category_scores?.[cat] ?? 0) }))
      .filter((r) => r._s > 0)
      .sort((a, b) => b._s - a._s);
  }, [rows, cat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const setCat = (v: string) => {
    const next = new URLSearchParams();
    if (v !== "all") next.set("cat", v);
    setParams(next);
  };
  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    setParams(next);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <header className="mb-8 text-center">
          <div className="text-[10px] tracking-[0.3em] text-primary font-semibold uppercase mb-2">Classement IA</div>
          <h1 className="font-display text-3xl md:text-5xl font-bold">🏆 Top Vendeurs du Sénégal</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-3">
            Notre algorithme évalue chaque vendeur sur ses ventes, avis clients, réactivité, ancienneté et qualité des annonces.
            Mise à jour quotidienne.
          </p>
        </header>

        <Tabs value={cat} onValueChange={setCat} className="mb-6">
          <TabsList className="flex flex-wrap h-auto justify-center bg-card/40 border border-border/60">
            {CATS.map((c) => (
              <TabsTrigger key={c.value} value={c.value} className="text-xs">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : pageRows.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Aucun vendeur classé pour cette catégorie pour l'instant.</p>
        ) : (
          <>
            <div className="text-xs text-muted-foreground mb-3 text-center">
              {filtered.length} vendeur{filtered.length > 1 ? "s" : ""} · Page {safePage} / {totalPages}
            </div>
            <ol className="space-y-3">
              {pageRows.map((r, i) => (
                <li
                  key={r.user_id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/50 hover:bg-card transition"
                >
                  <div className="w-10 text-center font-bold text-lg text-primary">{start + i + 1}</div>
                  <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                    <AvatarImage src={r.avatar_url ?? undefined} />
                    <AvatarFallback>{(r.display_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{r.display_name ?? "Vendeur"}</span>
                      <SellerBadge badge={r.badge} rank={r.rank_global} size="xs" />
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                      {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                      <span>{r.active_listings_count} annonces</span>
                      <span>{r.sales_count} ventes</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end text-sm">
                    <div className="flex items-center gap-1 font-bold">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      {Number(r.avg_rating || 0).toFixed(1)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{r.reviews_count} avis</div>
                  </div>
                  <ScoreBreakdown stats={r} />
                  <Button asChild size="sm" variant="outlineGold">
                    <Link to={`/vendeur/${r.user_id}`}>Profil</Link>
                  </Button>
                </li>
              ))}
            </ol>

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Pagination">
                <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center gap-2">
                      {idx > 0 && p - arr[idx - 1] > 1 && <span className="text-muted-foreground">…</span>}
                      <Button
                        variant={p === safePage ? "gold" : "outline"}
                        size="sm"
                        className="w-9"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    </span>
                  ))}
                <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                  Suivant <ChevronRight className="w-4 h-4" />
                </Button>
              </nav>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
