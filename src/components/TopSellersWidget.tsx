import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Loader2, MapPin, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SellerBadge, { SellerBadgeKind } from "./SellerBadge";
import ScoreBreakdown from "./ScoreBreakdown";
import SellerScoreHistory from "./SellerScoreHistory";

type Row = {
  user_id: string;
  top_score: number;
  badge: SellerBadgeKind;
  rank_global: number | null;
  active_listings_count: number;
  avg_rating: number;
  reviews_count: number;
  category_scores: Record<string, number>;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  sales_count: number;
  total_views: number;
  response_rate: number;
  account_age_days: number;
  quality_score: number;
};

const SELECT_COLS =
  "user_id, top_score, badge, rank_global, active_listings_count, avg_rating, reviews_count, category_scores, display_name, avatar_url, city, sales_count, total_views, response_rate, account_age_days, quality_score";

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

const TopSellersWidget = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [cat, setCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [pulse, setPulse] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("seller_stats")
      .select(SELECT_COLS)
      .gt("active_listings_count", 0)
      .order("top_score", { ascending: false })
      .limit(20);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("seller_stats_widget")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seller_stats" },
        () => {
          setPulse((p) => p + 1);
          load();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive(true);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sorted = (() => {
    if (cat === "all") return rows.slice(0, 10);
    return [...rows]
      .map((r) => ({ ...r, _s: Number(r.category_scores?.[cat] ?? 0) }))
      .filter((r) => r._s > 0)
      .sort((a, b) => b._s - a._s)
      .slice(0, 10);
  })();

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="flex items-end justify-between mb-6 md:mb-8 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.3em] text-primary font-semibold uppercase mb-2 flex items-center gap-2">
            Classement IA
            {live && (
              <span
                key={pulse}
                className="inline-flex items-center gap-1 normal-case tracking-normal text-[10px] text-emerald-500 font-medium"
                title="Mises à jour en direct"
              >
                <Radio className="w-3 h-3 animate-pulse" /> en direct
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold">
            🏆 Meilleurs vendeurs du moment
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Score calculé automatiquement à partir des ventes, avis, réactivité et qualité des annonces.
          </p>
        </div>
        <Link to="/top-vendeurs" className="text-sm text-primary hover:underline font-medium">
          Voir tout le classement →
        </Link>
      </div>

      <Tabs value={cat} onValueChange={setCat} className="mb-6">
        <TabsList className="flex flex-wrap h-auto justify-start bg-card/40 border border-border/60">
          {CATS.map((c) => (
            <TabsTrigger key={c.value} value={c.value} className="text-xs">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl text-muted-foreground">
          Le classement sera disponible dès qu'il y aura suffisamment d'activité.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sorted.map((r, i) => (
            <div
              key={r.user_id}
              className="group relative rounded-2xl border border-border/60 bg-card/60 hover:bg-card transition-all p-5 hover:shadow-gold hover:-translate-y-0.5"
            >
              <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-gold text-primary-foreground font-bold text-sm flex items-center justify-center shadow-gold">
                {i + 1}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-14 w-14 ring-2 ring-primary/30">
                  <AvatarImage src={r.avatar_url ?? undefined} />
                  <AvatarFallback>{(r.display_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.display_name ?? "Vendeur"}</div>
                  {r.city && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {r.city}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-3 gap-2">
                <SellerBadge badge={r.badge} rank={r.rank_global} size="xs" />
                <ScoreBreakdown stats={r} />
              </div>

              <div className="flex items-center justify-between text-sm mb-4">
                <div>
                  <div className="text-base font-bold">{r.active_listings_count}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Annonces</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 font-bold">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    {Number(r.avg_rating || 0).toFixed(1)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{r.reviews_count} avis</div>
                </div>
              </div>

              <Button asChild size="sm" variant="outlineGold" className="w-full">
                <Link to={`/vendeur/${r.user_id}`}>Voir le profil</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default TopSellersWidget;
