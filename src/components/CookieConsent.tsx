import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getAnalyticsConsent() === null) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const choose = (v: "granted" | "denied") => {
    setAnalyticsConsent(v);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md z-[60] rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.45)] p-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <p className="text-sm text-foreground font-semibold mb-1">Nous utilisons des cookies</p>
      <p className="text-xs text-muted-foreground mb-3">
        Nous utilisons des cookies de mesure d'audience (Google Analytics) pour comprendre l'usage du site et l'améliorer. Aucune donnée publicitaire n'est collectée.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="flex-1" onClick={() => choose("denied")}>
          Refuser
        </Button>
        <Button size="sm" variant="gold" className="flex-1" onClick={() => choose("granted")}>
          Accepter
        </Button>
      </div>
    </div>
  );
};

export default CookieConsent;
