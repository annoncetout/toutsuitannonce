import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  pushSupported, pushBlocked, isSubscribed, subscribePush, getPushPermissionState,
} from "@/lib/webPush";

const DISMISS_KEY = "tsa:push-banner-dismissed-at";
const PAGEVIEW_KEY = "tsa:push-pageviews";
const DELAY_MS = 15_000;
const SNOOZE_DAYS = 3;
const PAGEVIEW_THRESHOLD = 1;

const PushPermissionBanner = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!pushSupported() || pushBlocked()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < SNOOZE_DAYS * 86400_000) return;

    // Increment per-session pageview counter
    const pv = Number(sessionStorage.getItem(PAGEVIEW_KEY) || 0) + 1;
    sessionStorage.setItem(PAGEVIEW_KEY, String(pv));

    (async () => {
      const perm = await getPushPermissionState();
      if (perm !== "default") return;
      const sub = await isSubscribed();
      if (sub) return;
      if (pv >= PAGEVIEW_THRESHOLD) {
        if (!cancelled) setShow(true);
      } else {
        timer = setTimeout(() => { if (!cancelled) setShow(true); }, DELAY_MS);
      }
    })();

    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [user]);

  const handleEnable = async () => {
    setLoading(true);
    const r = await subscribePush();
    setLoading(false);
    if (r.ok) {
      toast.success("Notifications activées 🔔");
      setShow(false);
    } else {
      toast.error(r.reason ?? "Activation impossible");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 md:left-auto md:right-4 md:bottom-6 md:max-w-sm z-[60] animate-in slide-in-from-bottom-4">
      <div className="rounded-xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/10 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/15 p-2 text-primary">
            <BellRing className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Activez les notifications</p>
            <p className="text-xs text-muted-foreground mt-1">
              Soyez alerté en temps réel des nouvelles annonces qui vous intéressent, même quand l'app est fermée.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="gold" onClick={handleEnable} disabled={loading}>
                {loading ? "…" : "Activer"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>Plus tard</Button>
            </div>
          </div>
          <button onClick={handleDismiss} aria-label="Fermer" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushPermissionBanner;
