import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ScoreInputs = {
  sales_count: number;
  avg_rating: number;
  response_rate: number;
  total_views: number;
  account_age_days: number;
  quality_score: number;
  top_score: number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function computeBreakdown(s: ScoreInputs) {
  const sales = clamp01((s.sales_count || 0) / 30);
  const rating = clamp01((Number(s.avg_rating) || 0) / 5);
  const response = clamp01(Number(s.response_rate) || 0);
  const views = clamp01((Number(s.total_views) || 0) / 5000);
  const age = clamp01((s.account_age_days || 0) / 365);
  const quality = clamp01(Number(s.quality_score) || 0);
  return [
    { key: "sales", label: "Ventes conclues", weight: 30, norm: sales, raw: `${s.sales_count} ventes`, points: 30 * sales },
    { key: "rating", label: "Avis clients", weight: 20, norm: rating, raw: `${Number(s.avg_rating).toFixed(1)} / 5`, points: 20 * rating },
    { key: "response", label: "Taux de réponse", weight: 15, norm: response, raw: `${Math.round(response * 100)}%`, points: 15 * response },
    { key: "views", label: "Vues d'annonces", weight: 15, norm: views, raw: `${s.total_views} vues`, points: 15 * views },
    { key: "age", label: "Ancienneté du compte", weight: 10, norm: age, raw: `${s.account_age_days} j`, points: 10 * age },
    { key: "quality", label: "Qualité des annonces", weight: 10, norm: quality, raw: `${Math.round(quality * 100)}%`, points: 10 * quality },
  ];
}

const ScoreBreakdown = ({
  stats,
  triggerClassName,
  label = "Détail du score IA",
}: {
  stats: ScoreInputs;
  triggerClassName?: string;
  label?: string;
}) => {
  const rows = computeBreakdown(stats);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-primary", triggerClassName)}
          aria-label={label}
        >
          <Info className="w-3.5 h-3.5" />
          Score {Number(stats.top_score).toFixed(1)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="mb-3">
          <div className="text-[10px] tracking-[0.3em] text-primary font-semibold uppercase">Score IA</div>
          <div className="flex items-baseline justify-between">
            <div className="font-display text-2xl font-bold">{Number(stats.top_score).toFixed(1)}<span className="text-sm text-muted-foreground"> / 100</span></div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Pondération : 30 % ventes · 20 % avis · 15 % réponse · 15 % vues · 10 % ancienneté · 10 % qualité.
          </p>
        </div>
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{r.label} <span className="text-muted-foreground">({r.weight}%)</span></span>
                <span className="text-muted-foreground">{r.raw} · <span className="text-primary font-semibold">{r.points.toFixed(1)} pts</span></span>
              </div>
              <Progress value={r.norm * 100} className="h-1.5" />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

export default ScoreBreakdown;
