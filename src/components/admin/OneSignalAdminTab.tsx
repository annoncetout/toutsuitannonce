import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Users, Smartphone, Apple, Monitor, Send, MousePointerClick } from "lucide-react";
import { toast } from "sonner";

type Stats = {
  subscribers: { total: number; android: number; ios: number; desktop: number; other: number };
  notifications_sent: number;
  click_rate: number;
  recent: Array<{ id: string; title: string; sent: number; clicked: number; completed_at: number | null }>;
};

export default function OneSignalAdminTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("onesignal-stats", { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setStats(data as Stats);
    } catch (e: any) {
      toast.error("Erreur OneSignal: " + (e.message ?? "inconnu"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const Kpi = ({ icon: Icon, label, value }: any) => (
    <Card className="p-4 flex items-center gap-3">
      <div className="rounded-full bg-primary/10 p-2 text-primary"><Icon className="w-5 h-5" /></div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Push Notifications OneSignal</h2>
          <p className="text-sm text-muted-foreground">Abonnés, plateformes et performances des envois.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Actualiser
        </Button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : !stats ? (
        <Card className="p-6 text-sm text-muted-foreground">Aucune donnée disponible.</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={Users} label="Abonnés total" value={stats.subscribers.total.toLocaleString()} />
            <Kpi icon={Send} label="Notifications envoyées" value={stats.notifications_sent.toLocaleString()} />
            <Kpi icon={MousePointerClick} label="Taux de clic" value={`${stats.click_rate}%`} />
            <Kpi icon={Smartphone} label="Échantillon analysé" value={(stats.subscribers.android + stats.subscribers.ios + stats.subscribers.desktop + stats.subscribers.other).toLocaleString()} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Kpi icon={Smartphone} label="Android" value={stats.subscribers.android.toLocaleString()} />
            <Kpi icon={Apple} label="iOS" value={stats.subscribers.ios.toLocaleString()} />
            <Kpi icon={Monitor} label="Desktop" value={stats.subscribers.desktop.toLocaleString()} />
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">10 dernières notifications</h3>
            {stats.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune notification envoyée pour l'instant.</p>
            ) : (
              <div className="space-y-2">
                {stats.recent.map((n) => (
                  <div key={n.id} className="flex items-center justify-between border-b last:border-0 pb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{n.title || "(sans titre)"}</div>
                      <div className="text-xs text-muted-foreground">
                        {n.completed_at ? new Date(Number(n.completed_at) * 1000).toLocaleString("fr-FR") : "—"}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant="secondary">{n.sent} envoyées</Badge>
                      <Badge>{n.clicked} clics</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
