import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { GA_ID, trackPageView } from "@/lib/analytics";

type Status = "ok" | "ko" | "pending";

interface Check {
  label: string;
  status: Status;
  detail?: string;
}

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "ok") return <CheckCircle2 className="w-5 h-5 text-primary" />;
  if (status === "ko") return <XCircle className="w-5 h-5 text-destructive" />;
  return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
};

const AnalyticsStatus = () => {
  const [checks, setChecks] = useState<Check[]>([
    { label: "Script gtag.js chargé", status: "pending" },
    { label: `gtag('config', '${GA_ID}') exécuté`, status: "pending" },
    { label: "Événement page_view envoyé", status: "pending" },
    { label: "Requête réseau vers Google Analytics", status: "pending" },
  ]);
  const [dataLayerSize, setDataLayerSize] = useState(0);

  useEffect(() => {
    document.title = "Statut Google Analytics — TOUT SUITE ANNONCES";

    const run = async () => {
      const next: Check[] = [];

      // 1. Script loaded
      const script = document.querySelector<HTMLScriptElement>(
        'script[src*="googletagmanager.com/gtag/js"]',
      );
      next.push({
        label: "Script gtag.js chargé",
        status: script ? "ok" : "ko",
        detail: script?.src,
      });

      // 2. gtag config executed
      const dl = (window.dataLayer || []) as unknown[];
      setDataLayerSize(dl.length);
      const hasConfig = dl.some((entry) => {
        try {
          const arr = entry as unknown[];
          return Array.isArray(arr) && arr[0] === "config" && arr[1] === GA_ID;
        } catch {
          return false;
        }
      });
      next.push({
        label: `gtag('config', '${GA_ID}') exécuté`,
        status: hasConfig ? "ok" : "ko",
        detail: `dataLayer: ${dl.length} entrée(s)`,
      });

      // 3. page_view event — send a test one and check
      trackPageView(window.location.pathname);
      const dl2 = (window.dataLayer || []) as unknown[];
      const hasPageView = dl2.some((entry) => {
        try {
          const arr = entry as unknown[];
          return Array.isArray(arr) && arr[0] === "event" && arr[1] === "page_view";
        } catch {
          return false;
        }
      });
      next.push({
        label: "Événement page_view envoyé",
        status: hasPageView ? "ok" : "ko",
      });

      // 4. Network — check if google-analytics endpoints were called via PerformanceObserver
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const gaReq = entries.find(
        (e) =>
          e.name.includes("google-analytics.com/g/collect") ||
          e.name.includes("googletagmanager.com/gtag/js") ||
          e.name.includes("analytics.google.com"),
      );
      next.push({
        label: "Requête réseau vers Google Analytics",
        status: gaReq ? "ok" : "pending",
        detail: gaReq?.name,
      });

      setChecks(next);
      setDataLayerSize(dl2.length);
    };

    // Wait a moment for async gtag.js to load
    const t1 = setTimeout(run, 800);
    const t2 = setTimeout(run, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const allOk = checks.every((c) => c.status === "ok");

  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Statut Google Analytics</h1>
          <p className="text-muted-foreground">
            Diagnostic en direct de l'intégration GA4 (ID :{" "}
            <span className="font-mono text-primary">{GA_ID}</span>)
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon status={allOk ? "ok" : checks.some((c) => c.status === "ko") ? "ko" : "pending"} />
              {allOk ? "Tout fonctionne" : "Vérifications en cours…"}
            </CardTitle>
            <CardDescription>
              Les contrôles sont exécutés côté navigateur. Recharge la page pour relancer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checks.map((c) => (
              <div key={c.label} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <StatusIcon status={c.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.label}</div>
                  {c.detail && (
                    <div className="text-xs text-muted-foreground break-all font-mono mt-1">
                      {c.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations techniques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <div>window.gtag : {typeof window !== "undefined" && typeof window.gtag === "function" ? "✓ fonction" : "✗ absente"}</div>
            <div>window.dataLayer : {dataLayerSize} entrée(s)</div>
            <div>URL : {typeof window !== "undefined" ? window.location.href : ""}</div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Astuce : ouvrir l'onglet « Temps réel » dans Google Analytics pour confirmer la réception.
        </p>
      </div>
    </main>
  );
};

export default AnalyticsStatus;
