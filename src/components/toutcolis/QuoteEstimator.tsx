import { useEffect, useRef, useState } from "react";
import { Clock, Info, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { estimateQuote, formatFcfa, type QuoteInput } from "@/lib/toutcolis";

/** Compteur animé pour les montants FCFA. */
const useAnimatedNumber = (value: number, duration = 500) => {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const initial = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(initial + (value - initial) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
};

const QuoteEstimator = ({ input, className }: { input: QuoteInput; className?: string }) => {
  const quote = estimateQuote(input);
  const min = useAnimatedNumber(quote.ready ? quote.priceMin : 0);
  const max = useAnimatedNumber(quote.ready ? quote.priceMax : 0);

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-primary/25 bg-card/70 p-5 backdrop-blur-sm transition-all duration-500",
        quote.ready && "shadow-gold",
        className,
      )}
      aria-live="polite"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Estimation en temps réel
        </h3>
        <Badge variant="secondary" className="shrink-0 text-[10px]">{quote.scopeLabel}</Badge>
      </div>

      {!quote.ready ? (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
          Renseignez {quote.missing.join(", ")} pour obtenir une estimation de prix et de délai.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/20 bg-background/40 p-3">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary/80" /> Prix estimé
              </p>
              <p className="mt-1 text-lg font-bold text-primary">
                {formatFcfa(min)} – {formatFcfa(max)}
              </p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-background/40 p-3">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary/80" /> Délai estimé
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {quote.daysMin === quote.daysMax
                  ? `${quote.daysMin} jour${quote.daysMin > 1 ? "s" : ""}`
                  : `${quote.daysMin} à ${quote.daysMax} jours`}
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5">
            {quote.breakdown.map((b) => (
              <li key={b.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-medium text-foreground">{b.value}</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Estimation indicative calculée sur le poids facturable, la nature du colis et le trajet.
            Le prix final est fixé avec le transporteur.
          </p>
        </>
      )}
    </Card>
  );
};

export default QuoteEstimator;
