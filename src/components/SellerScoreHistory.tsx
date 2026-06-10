import { useState } from "react";
import { History, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type HistoryRow = {
  id: string;
  top_score: number;
  previous_score: number | null;
  delta: number | null;
  sales_count: number | null;
  total_views: number | null;
  reviews_count: number | null;
  avg_rating: number | null;
  response_rate: number | null;
  computed_at: string;
};

const SellerScoreHistory = ({
  userId,
  triggerClassName,
}: { userId: string; triggerClassName?: string }) => {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (rows || loading) return;
    setLoading(true);
    const { data } = await supabase
      .from("seller_score_history")
      .select("id, top_score, previous_score, delta, sales_count, total_views, reviews_count, avg_rating, response_rate, computed_at")
      .eq("user_id", userId)
      .order("computed_at", { ascending: false })
      .limit(20);
    setRows((data ?? []) as HistoryRow[]);
    setLoading(false);
  };

  return (
    <Popover onOpenChange={(o) => o && load()}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-primary", triggerClassName)}
          aria-label="Historique du score"
        >
          <History className="w-3.5 h-3.5" />
          Historique
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4 max-h-[420px] overflow-y-auto" align="end">
        <div className="mb-3">
          <div className="text-[10px] tracking-[0.3em] text-primary font-semibold uppercase">Évolution du score</div>
          <p className="text-[11px] text-muted-foreground mt-1">20 derniers recalculs et variations.</p>
        </div>
        {loading && (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        )}
        {!loading && rows && rows.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">Aucun historique pour ce vendeur.</p>
        )}
        {!loading && rows && rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((r) => {
              const delta = Number(r.delta ?? 0);
              const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
              const color = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-muted-foreground";
              return (
                <li key={r.id} className="border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{new Date(r.computed_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span className={cn("flex items-center gap-1 font-semibold", color)}>
                      <Icon className="w-3.5 h-3.5" />
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-display text-lg font-bold">{Number(r.top_score).toFixed(1)}<span className="text-xs text-muted-foreground">/100</span></span>
                    {r.previous_score !== null && (
                      <span className="text-[11px] text-muted-foreground">depuis {Number(r.previous_score).toFixed(1)}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {r.sales_count ?? 0} ventes · {r.total_views ?? 0} vues · ★ {Number(r.avg_rating ?? 0).toFixed(1)} ({r.reviews_count ?? 0}) · {Math.round((Number(r.response_rate) || 0) * 100)}% réponse
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SellerScoreHistory;
