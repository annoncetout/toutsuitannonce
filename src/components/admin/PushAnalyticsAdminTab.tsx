import { useEffect, useMemo, useState } from "react";
import { Bell, MousePointerClick, Send, Eye, Loader2, Smartphone, Users, Apple, Monitor, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Stats = { delivered: number; opens: number; clicks: number; dismiss: number };
type Row = {
  id: string;
  title: string | null;
  type: string | null;
  created_at: string;
  delivered: number;
  opens: number;
  clicks: number;
};
type Platform = "ios" | "android" | "desktop";

const PushAnalyticsAdminTab = () => {
  const [stats, setStats] = useState<Stats>({ delivered: 0, opens: 0, clicks: 0, dismiss: 0 });
  const [rows, setRows] = useState<Row[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Targeted test state
  const [targetUserId, setTargetUserId] = useState("");
  const [platforms, setPlatforms] = useState<Record<Platform, boolean>>({ ios: true, android: true, desktop: true });
  const [subCounts, setSubCounts] = useState<{ ios: number; android: number; desktop: number; total: number }>({ ios: 0, android: 0, desktop: 0, total: 0 });
  const [lastResult, setLastResult] = useState<any | null>(null);

  const selectedPlatforms = useMemo(
    () => (Object.keys(platforms) as Platform[]).filter((p) => platforms[p]),
    [platforms],
  );

  async function sendTest(scope: "self" | "all") {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-test-push", { body: { scope } });
      if (error) throw error;
      toast.success(`Test envoyé (${(data as any)?.inserted ?? 0} notification(s) créée(s)).`);
      setTimeout(() => void load(), 1500);
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'envoi du test");
    } finally {
      setSending(false);
    }
  }

  async function sendTargeted() {
    setSending(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-test-push", {
        body: {
          scope: "targeted",
          target_user_id: targetUserId.trim() || undefined,
          platforms: selectedPlatforms.length === 3 ? null : selectedPlatforms,
          title: "🎯 Test push ciblé",
          body: `Vérification ${selectedPlatforms.join(" / ")} — si vous voyez ce message, tout fonctionne.`,
          link: "/notifications",
        },
      });
      if (error) throw error;
      setLastResult(data);
      const sentCount = Object.values((data as any)?.per_platform ?? {}).reduce<number>(
        (acc, v: any) => acc + (v?.sent ?? 0), 0,
      );
      toast.success(`Push ciblé envoyé : ${sentCount} appareil(s).`);
      setTimeout(() => void load(), 2000);
    } catch (e: any) {
      toast.error(e?.message ?? "Échec du test ciblé");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => { void load(); void loadSubCounts(); }, []);

  async function loadSubCounts() {
    const { data } = await supabase.from("push_subscriptions").select("platform");
    const counts = { ios: 0, android: 0, desktop: 0, total: 0 };
    (data ?? []).forEach((s: any) => {
      const p = (s.platform as Platform) ?? "desktop";
      if (p in counts) (counts as any)[p]++;
      counts.total++;
    });
    setSubCounts(counts);
  }

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();

    const { data: events } = await supabase
      .from("push_events")
      .select("event_type, notification_id, created_at")
      .gte("created_at", since);

    const s: Stats = { delivered: 0, opens: 0, clicks: 0, dismiss: 0 };
    const byNotif = new Map<string, { delivered: number; opens: number; clicks: number }>();
    (events ?? []).forEach((e: any) => {
      if (e.event_type === "delivered") s.delivered++;
      else if (e.event_type === "open") s.opens++;
      else if (e.event_type === "click") s.clicks++;
      else if (e.event_type === "dismiss") s.dismiss++;
      if (e.notification_id) {
        const cur = byNotif.get(e.notification_id) ?? { delivered: 0, opens: 0, clicks: 0 };
        if (e.event_type === "delivered") cur.delivered++;
        if (e.event_type === "open") cur.opens++;
        if (e.event_type === "click") cur.clicks++;
        byNotif.set(e.notification_id, cur);
      }
    });
    setStats(s);

    const ids = Array.from(byNotif.keys()).slice(0, 200);
    if (ids.length > 0) {
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id, title, type, created_at")
        .in("id", ids)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((notifs ?? []).map((n: any) => ({
        id: n.id, title: n.title, type: n.type, created_at: n.created_at,
        delivered: byNotif.get(n.id)?.delivered ?? 0,
        opens: byNotif.get(n.id)?.opens ?? 0,
        clicks: byNotif.get(n.id)?.clicks ?? 0,
      })));
    } else {
      setRows([]);
    }
    setLoading(false);
  }

  const ctr = stats.delivered > 0 ? ((stats.clicks / stats.delivered) * 100).toFixed(1) : "0.0";
  const openRate = stats.delivered > 0 ? ((stats.opens / stats.delivered) * 100).toFixed(1) : "0.0";

  const togglePlatform = (p: Platform) => setPlatforms((prev) => ({ ...prev, [p]: !prev[p] }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics Notifications Push</h2>
        <p className="text-sm text-muted-foreground">Performances sur les 30 derniers jours.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={<Send className="h-4 w-4" />} label="Envoyées" value={stats.delivered} />
        <StatCard icon={<Eye className="h-4 w-4" />} label="Ouvertures" value={stats.opens} />
        <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Clics" value={stats.clicks} />
        <StatCard icon={<Bell className="h-4 w-4" />} label="Taux d'ouverture" value={`${openRate}%`} />
        <StatCard icon={<Bell className="h-4 w-4" />} label="Taux de clic" value={`${ctr}%`} highlight />
      </div>

      <Card className="p-4 border-primary/30">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Tests rapides</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Pipeline complet (notifications → trigger → send-push). Idéal pour vérifier qu'une annonce déclenche bien un push.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gold" disabled={sending} onClick={() => void sendTest("self")}>
            <Smartphone className="h-4 w-4 mr-1" /> M'envoyer un test
          </Button>
          <Button size="sm" variant="outline" disabled={sending} onClick={() => void sendTest("all")}>
            <Users className="h-4 w-4 mr-1" /> Envoyer à tous
          </Button>
        </div>
      </Card>

      <Card className="p-4 border-primary/30">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" /> Test ciblé par plateforme / utilisateur
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Envoie un Web Push directement (en bypass du trigger) aux abonnements correspondants — pratique pour confirmer la réception sur un appareil précis.
          Les évènements <code>delivered</code> et <code>open</code> sont enregistrés automatiquement.
        </p>

        <div className="grid gap-3 md:grid-cols-2 mb-3">
          <div>
            <Label className="text-xs">User ID cible (vide = vous-même)</Label>
            <Input
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="uuid de l'utilisateur"
              className="h-9 text-xs font-mono"
            />
          </div>
          <div>
            <Label className="text-xs">Plateformes</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              <PlatformChip icon={<Apple className="h-3.5 w-3.5" />} label={`iOS-PWA (${subCounts.ios})`} active={platforms.ios} onClick={() => togglePlatform("ios")} />
              <PlatformChip icon={<Smartphone className="h-3.5 w-3.5" />} label={`Android (${subCounts.android})`} active={platforms.android} onClick={() => togglePlatform("android")} />
              <PlatformChip icon={<Monitor className="h-3.5 w-3.5" />} label={`Desktop (${subCounts.desktop})`} active={platforms.desktop} onClick={() => togglePlatform("desktop")} />
            </div>
          </div>
        </div>

        <Button size="sm" disabled={sending || selectedPlatforms.length === 0} onClick={() => void sendTargeted()}>
          {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
          Envoyer le test ciblé
        </Button>

        {lastResult && (
          <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs space-y-1">
            <div className="font-semibold">Résultat du dernier envoi</div>
            <div>Abonnements ciblés : <b>{lastResult.subscriptions ?? 0}</b></div>
            {lastResult.per_platform && (
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(lastResult.per_platform).map(([p, v]: any) => (
                  <Badge key={p} variant="outline" className="text-[10px]">
                    {p}: ✅ {v.sent} / ❌ {v.failed}
                  </Badge>
                ))}
              </div>
            )}
            {lastResult.cleaned > 0 && (
              <div className="text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {lastResult.cleaned} abonnement(s) expiré(s) nettoyé(s).</div>
            )}
            {lastResult.reason && <div className="text-amber-600">{lastResult.reason}</div>}
            {lastResult.notification_id && (
              <div className="text-muted-foreground">notification_id : <code>{lastResult.notification_id}</code></div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Historique des envois</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucune notification push envoyée sur cette période.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Envois</TableHead>
                <TableHead className="text-right">Ouvertures</TableHead>
                <TableHead className="text-right">Clics</TableHead>
                <TableHead className="text-right">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const rc = r.delivered > 0 ? ((r.clicks / r.delivered) * 100).toFixed(1) : "0.0";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{r.title ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.type ?? "info"}</Badge></TableCell>
                    <TableCell className="text-right">{r.delivered}</TableCell>
                    <TableCell className="text-right">{r.opens}</TableCell>
                    <TableCell className="text-right">{r.clicks}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{rc}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

const StatCard = ({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: number | string; highlight?: boolean }) => (
  <Card className={`p-4 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
    <div className="flex items-center justify-between mb-2 text-muted-foreground">
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      <span className={highlight ? "text-primary" : ""}>{icon}</span>
    </div>
    <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
  </Card>
);

const PlatformChip = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
    }`}
  >
    {icon} {label}
  </button>
);

export default PushAnalyticsAdminTab;
