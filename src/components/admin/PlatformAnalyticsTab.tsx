import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  Download, Loader2, BarChart3, Users, Lock, Megaphone, Eye,
  Smartphone, Globe, DollarSign, Trophy, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PwaAnalyticsTab from "./PwaAnalyticsTab";

type RangeKey = "7" | "30" | "90" | "custom";

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
const fmtInt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const dayKey = (d: string | Date) => new Date(d).toISOString().slice(0, 10);
const monthKey = (d: string | Date) => new Date(d).toISOString().slice(0, 7);

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--accent))",
  "#16a34a", "#f59e0b", "#0ea5e9", "#a855f7", "#ef4444",
];

function detectDevice(ua: string | null): string {
  if (!ua) return "Inconnu";
  const u = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(u)) return "Tablette";
  if (/iphone|ipod/.test(u)) return "iPhone / iOS";
  if (/android/.test(u)) return "Android";
  if (/mac os x/.test(u)) return "Mac";
  if (/windows/.test(u)) return "Windows";
  if (/linux/.test(u)) return "Linux";
  return "Autre";
}

function detectSource(ref: string | null): string {
  if (!ref || ref === "direct" || ref === "") return "Accès direct";
  const r = ref.toLowerCase();
  if (r.includes("google")) return "Google";
  if (r.includes("facebook") || r.includes("fb.")) return "Facebook";
  if (r.includes("tiktok")) return "TikTok";
  if (r.includes("whatsapp") || r.includes("wa.me")) return "WhatsApp";
  if (r.includes("instagram")) return "Instagram";
  if (r.startsWith("utm:")) return "Campagne UTM";
  return "Référent externe";
}

type Stats = {
  // Users
  usersTotal: number; usersToday: number; usersWeek: number; usersMonth: number; usersActive: number;
  // Listings
  listingsTotal: number; listingsToday: number; listingsMonth: number;
  listingsPremium: number; listingsFree: number; listingsExpired: number; listingsRemoved: number;
  // Revenue
  revPremium: number; revBoost: number; revAds: number; revMonth: number; revTotal: number;
  // Audience
  pageViews: number; uniqueVisitors: number;
  // Series
  signupsPerDay: { date: string; count: number }[];
  listingsPerDay: { date: string; count: number }[];
  visitsPerDay: { date: string; count: number }[];
  revenuePerMonth: { month: string; amount: number }[];
  // Breakdowns
  devices: { name: string; value: number }[];
  sources: { name: string; value: number }[];
  cities: { name: string; value: number }[];
  // Top 10
  topSellers: { id: string; name: string; sales: number; score: number; city: string | null }[];
  topListings: { id: string; title: string; views: number; city: string | null }[];
  topCategories: { name: string; count: number }[];
  topCities: { name: string; value: number }[];
};

const emptyStats: Stats = {
  usersTotal: 0, usersToday: 0, usersWeek: 0, usersMonth: 0, usersActive: 0,
  listingsTotal: 0, listingsToday: 0, listingsMonth: 0,
  listingsPremium: 0, listingsFree: 0, listingsExpired: 0, listingsRemoved: 0,
  revPremium: 0, revBoost: 0, revAds: 0, revMonth: 0, revTotal: 0,
  pageViews: 0, uniqueVisitors: 0,
  signupsPerDay: [], listingsPerDay: [], visitsPerDay: [], revenuePerMonth: [],
  devices: [], sources: [], cities: [],
  topSellers: [], topListings: [], topCategories: [], topCities: [],
};

export default function PlatformAnalyticsTab() {
  const [range, setRange] = useState<RangeKey>("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>(emptyStats);

  const { fromDate, toDate } = useMemo(() => {
    if (range === "custom" && from && to) {
      return { fromDate: new Date(from), toDate: new Date(to + "T23:59:59") };
    }
    const days = range === "custom" ? 30 : parseInt(range, 10);
    const t = new Date();
    const f = new Date(); f.setDate(f.getDate() - days);
    return { fromDate: f, toDate: t };
  }, [range, from, to]);

  const loadAll = async () => {
    setLoading(true);
    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7);
    const startMonth = new Date(now); startMonth.setDate(now.getDate() - 30);
    const start30Active = new Date(now); start30Active.setDate(now.getDate() - 30);

    try {
      const [
        profilesRes, listingsRes, txRes, adsRes, pwaRes, catsRes, statsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id, display_name, city, created_at, updated_at, status").limit(20000),
        supabase.from("listings").select("id, title, user_id, category_id, location, is_premium, is_active, moderation_status, auto_removed, expires_at, views_count, created_at").limit(20000),
        supabase.from("transactions").select("type, amount, status, created_at, metadata").eq("status", "completed").limit(20000),
        supabase.from("advertisements").select("id, is_active, start_date, end_date, metadata").limit(5000),
        supabase.from("pwa_install_events").select("event_type, user_agent, referrer, user_id, created_at").gte("created_at", fromISO).lte("created_at", toISO).limit(20000),
        supabase.from("categories").select("id, name"),
        supabase.from("seller_stats").select("user_id, display_name, city, sales_count, top_score").order("top_score", { ascending: false }).limit(10),
      ]);

      const profiles = profilesRes.data ?? [];
      const listings = listingsRes.data ?? [];
      const txs = txRes.data ?? [];
      const ads = adsRes.data ?? [];
      const pwa = pwaRes.data ?? [];
      const cats = catsRes.data ?? [];
      const sellers = statsRes.data ?? [];

      // Users
      const usersTotal = profiles.length;
      const usersToday = profiles.filter(p => new Date(p.created_at) >= startToday).length;
      const usersWeek = profiles.filter(p => new Date(p.created_at) >= startWeek).length;
      const usersMonth = profiles.filter(p => new Date(p.created_at) >= startMonth).length;
      const usersActive = profiles.filter(p => p.updated_at && new Date(p.updated_at) >= start30Active && p.status === "active").length;

      // Listings
      const listingsTotal = listings.length;
      const listingsToday = listings.filter(l => new Date(l.created_at) >= startToday).length;
      const listingsMonth = listings.filter(l => new Date(l.created_at) >= startMonth).length;
      const listingsPremium = listings.filter(l => l.is_premium).length;
      const listingsFree = listings.filter(l => !l.is_premium).length;
      const listingsExpired = listings.filter(l => l.expires_at && new Date(l.expires_at) < now).length;
      const listingsRemoved = listings.filter(l => l.auto_removed || l.moderation_status === "rejected" || !l.is_active).length;

      // Revenue
      const revPremium = txs.filter(t => t.type === "listing_boost" && (t.metadata as any)?.boost_type !== "urgent").reduce((s, t) => s + Number(t.amount || 0), 0);
      const revBoost = txs.filter(t => t.type === "listing_boost").reduce((s, t) => s + Number(t.amount || 0), 0);
      const revAds = txs.filter(t => (t.metadata as any)?.kind === "ad" || (t.metadata as any)?.type === "advertisement").reduce((s, t) => s + Number(t.amount || 0), 0);
      const revMonth = txs.filter(t => new Date(t.created_at) >= startMonth).reduce((s, t) => s + Number(t.amount || 0), 0);
      const revTotal = txs.reduce((s, t) => s + Number(t.amount || 0), 0);

      // Audience (PWA events as proxy)
      const pageViews = pwa.filter(e => e.event_type === "page_view").length;
      const uniqueVisitors = new Set(pwa.map(e => e.user_id || e.user_agent || "anon")).size;

      // Time series in range
      const bucketDays: Record<string, { sign: number; list: number; vis: number }> = {};
      const ensureDay = (k: string) => (bucketDays[k] = bucketDays[k] || { sign: 0, list: 0, vis: 0 });
      // pre-fill days
      const d = new Date(fromDate);
      while (d <= toDate) { ensureDay(dayKey(d)); d.setDate(d.getDate() + 1); }

      profiles.forEach(p => {
        const dt = new Date(p.created_at);
        if (dt >= fromDate && dt <= toDate) ensureDay(dayKey(dt)).sign += 1;
      });
      listings.forEach(l => {
        const dt = new Date(l.created_at);
        if (dt >= fromDate && dt <= toDate) ensureDay(dayKey(dt)).list += 1;
      });
      pwa.forEach(e => {
        if (e.event_type !== "page_view") return;
        ensureDay(dayKey(e.created_at)).vis += 1;
      });

      const dayKeys = Object.keys(bucketDays).sort();
      const signupsPerDay = dayKeys.map(k => ({ date: k.slice(5), count: bucketDays[k].sign }));
      const listingsPerDay = dayKeys.map(k => ({ date: k.slice(5), count: bucketDays[k].list }));
      const visitsPerDay = dayKeys.map(k => ({ date: k.slice(5), count: bucketDays[k].vis }));

      // Revenue per month (last 12)
      const revBuckets: Record<string, number> = {};
      txs.forEach(t => {
        const k = monthKey(t.created_at);
        revBuckets[k] = (revBuckets[k] || 0) + Number(t.amount || 0);
      });
      const revenuePerMonth = Object.entries(revBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, amount]) => ({ month, amount }));

      // Devices & sources from PWA in range
      const devMap: Record<string, number> = {};
      const srcMap: Record<string, number> = {};
      pwa.forEach(e => {
        const d = detectDevice(e.user_agent);
        devMap[d] = (devMap[d] || 0) + 1;
        const s = detectSource(e.referrer);
        srcMap[s] = (srcMap[s] || 0) + 1;
      });
      const devices = Object.entries(devMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      const sources = Object.entries(srcMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      // Top cities (profiles)
      const cityMap: Record<string, number> = {};
      profiles.forEach(p => { if (p.city) cityMap[p.city] = (cityMap[p.city] || 0) + 1; });
      const cities = Object.entries(cityMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
      const topCities = cities;

      // Top categories (listings)
      const catMap: Record<string, number> = {};
      const catNames = new Map(cats.map(c => [c.id, c.name]));
      listings.forEach(l => {
        if (!l.category_id) return;
        const k = catNames.get(l.category_id) || "Inconnu";
        catMap[k] = (catMap[k] || 0) + 1;
      });
      const topCategories = Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

      // Top listings by views
      const topListings = [...listings]
        .filter(l => l.is_active && l.moderation_status === "approved")
        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 10)
        .map(l => ({ id: l.id, title: l.title, views: l.views_count || 0, city: l.location }));

      const topSellers = sellers.map(s => ({
        id: s.user_id, name: s.display_name || "—",
        sales: s.sales_count || 0, score: Number(s.top_score || 0), city: s.city,
      }));

      setStats({
        usersTotal, usersToday, usersWeek, usersMonth, usersActive,
        listingsTotal, listingsToday, listingsMonth,
        listingsPremium, listingsFree, listingsExpired, listingsRemoved,
        revPremium, revBoost, revAds, revMonth, revTotal,
        pageViews, uniqueVisitors,
        signupsPerDay, listingsPerDay, visitsPerDay, revenuePerMonth,
        devices, sources, cities,
        topSellers, topListings, topCategories, topCities,
      });
    } catch (e: any) {
      toast.error("Erreur de chargement: " + (e?.message || "inconnue"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [fromDate, toDate]);

  // Live indicator + last update timestamp
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [pulse, setPulse] = useState(0);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleReload = () => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      loadAll().then(() => setLastUpdate(new Date()));
    }, 1500);
  };

  const bump = (patch: Partial<Stats>) => {
    setStats(prev => ({ ...prev, ...patch }));
    setLastUpdate(new Date());
    setPulse(p => p + 1);
  };

  // Realtime: incremental KPI bumps + debounced full reload
  useEffect(() => {
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);

    const ch = supabase
      .channel("admin-analytics-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        const created = new Date((payload.new as any)?.created_at || Date.now());
        bump({
          usersTotal: stats.usersTotal + 1,
          usersToday: stats.usersToday + (created >= today0 ? 1 : 0),
          usersWeek: stats.usersWeek + 1,
          usersMonth: stats.usersMonth + 1,
        });
        toast.success("👤 Nouvel utilisateur inscrit", { duration: 3000 });
        scheduleReload();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        // login / activity update profile.updated_at
        scheduleReload();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "listings" }, (payload) => {
        const l: any = payload.new;
        const created = new Date(l?.created_at || Date.now());
        bump({
          listingsTotal: stats.listingsTotal + 1,
          listingsToday: stats.listingsToday + (created >= today0 ? 1 : 0),
          listingsMonth: stats.listingsMonth + 1,
          listingsPremium: stats.listingsPremium + (l?.is_premium ? 1 : 0),
          listingsFree: stats.listingsFree + (l?.is_premium ? 0 : 1),
        });
        toast.success("📝 Nouvelle annonce publiée", { duration: 3000 });
        scheduleReload();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "listings" }, () => {
        scheduleReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
        const t: any = payload.new;
        if (t?.status === "completed") {
          const amt = Number(t.amount || 0);
          bump({
            revTotal: stats.revTotal + amt,
            revMonth: stats.revMonth + amt,
            revBoost: stats.revBoost + (t.type === "listing_boost" ? amt : 0),
          });
          toast.success(`💰 Paiement reçu : ${fmtMoney(amt)}`, { duration: 3500 });
        }
        scheduleReload();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, (payload) => {
        const a: any = payload.new;
        if (a?.action === "login" || a?.action === "sign_in") {
          setLastUpdate(new Date());
          setPulse(p => p + 1);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pwa_install_events" }, (payload) => {
        const e: any = payload.new;
        if (e?.event_type === "page_view") {
          bump({ pageViews: stats.pageViews + 1 });
        }
      })
      .subscribe((status) => {
        setLiveConnected(status === "SUBSCRIBED");
      });

    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.usersTotal, stats.listingsTotal, stats.revTotal, stats.pageViews]);

  const exportCsv = () => {
    const lines: string[] = [];
    const push = (title: string, rows: (string | number)[][]) => {
      lines.push(`# ${title}`);
      rows.forEach(r => lines.push(r.map(v => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")));
      lines.push("");
    };
    push("KPI", [
      ["Métrique", "Valeur"],
      ["Utilisateurs total", stats.usersTotal],
      ["Utilisateurs aujourd'hui", stats.usersToday],
      ["Utilisateurs 7j", stats.usersWeek],
      ["Utilisateurs 30j", stats.usersMonth],
      ["Utilisateurs actifs 30j", stats.usersActive],
      ["Annonces total", stats.listingsTotal],
      ["Annonces aujourd'hui", stats.listingsToday],
      ["Annonces 30j", stats.listingsMonth],
      ["Annonces premium", stats.listingsPremium],
      ["Annonces gratuites", stats.listingsFree],
      ["Annonces expirées", stats.listingsExpired],
      ["Annonces supprimées/refusées", stats.listingsRemoved],
      ["Revenus boost (total)", stats.revBoost],
      ["Revenus publicités", stats.revAds],
      ["Revenus 30j", stats.revMonth],
      ["Revenus totaux", stats.revTotal],
      ["Pages vues (PWA)", stats.pageViews],
      ["Visiteurs uniques (PWA)", stats.uniqueVisitors],
    ]);
    push("Inscriptions par jour", [["date", "count"], ...stats.signupsPerDay.map(d => [d.date, d.count])]);
    push("Annonces par jour", [["date", "count"], ...stats.listingsPerDay.map(d => [d.date, d.count])]);
    push("Visites par jour", [["date", "count"], ...stats.visitsPerDay.map(d => [d.date, d.count])]);
    push("Revenus par mois", [["mois", "montant"], ...stats.revenuePerMonth.map(d => [d.month, d.amount])]);
    push("Top 10 vendeurs", [["nom", "ventes", "score", "ville"], ...stats.topSellers.map(s => [s.name, s.sales, s.score, s.city ?? ""])]);
    push("Top 10 annonces", [["titre", "vues", "ville"], ...stats.topListings.map(l => [l.title, l.views, l.city ?? ""])]);
    push("Top catégories", [["catégorie", "annonces"], ...stats.topCategories.map(c => [c.name, c.count])]);
    push("Top villes", [["ville", "utilisateurs"], ...stats.topCities.map(c => [c.name, c.value])]);
    push("Appareils", [["type", "événements"], ...stats.devices.map(d => [d.name, d.value])]);
    push("Sources de trafic", [["source", "événements"], ...stats.sources.map(s => [s.name, s.value])]);

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Kpi = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{typeof value === "number" ? fmtInt(value) : value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="font-semibold">Période :</span>
          </div>
          {(["7", "30", "90"] as RangeKey[]).map(r => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
              {r}j
            </Button>
          ))}
          <Button size="sm" variant={range === "custom" ? "default" : "outline"} onClick={() => setRange("custom")}>
            Personnalisé
          </Button>
          {range === "custom" && (
            <>
              <div><Label className="text-xs">Du</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
              <div><Label className="text-xs">Au</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
            </>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={loadAll}>
              <Loader2 className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : "hidden"}`} />
              Rafraîchir
            </Button>
            <Button size="sm" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-1" /> Exporter CSV
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          {/* Users */}
          <Section icon={Users} title="Utilisateurs">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Kpi label="Total" value={stats.usersTotal} />
              <Kpi label="Aujourd'hui" value={stats.usersToday} />
              <Kpi label="Cette semaine" value={stats.usersWeek} />
              <Kpi label="Ce mois" value={stats.usersMonth} />
              <Kpi label="Actifs (30j)" value={stats.usersActive} />
            </div>
          </Section>

          {/* Auth */}
          <Section icon={Lock} title="Authentification">
            <Card className="p-4 text-sm text-muted-foreground">
              Les détails par méthode de connexion (Google / Email) et les compteurs de connexions
              ne sont pas exposés par défaut. Pour les activer, il faut journaliser les connexions
              côté application (table dédiée) ou interroger les logs d'authentification.
            </Card>
          </Section>

          {/* Listings */}
          <Section icon={Megaphone} title="Annonces">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi label="Total" value={stats.listingsTotal} />
              <Kpi label="Aujourd'hui" value={stats.listingsToday} />
              <Kpi label="Ce mois (30j)" value={stats.listingsMonth} />
              <Kpi label="Premium" value={stats.listingsPremium} />
              <Kpi label="Gratuites" value={stats.listingsFree} />
              <Kpi label="Expirées" value={stats.listingsExpired} />
              <Kpi label="Supprimées / refusées" value={stats.listingsRemoved} />
            </div>
          </Section>

          {/* Audience */}
          <Section icon={Eye} title="Audience (basée sur les événements de la PWA)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi label="Pages vues" value={stats.pageViews} />
              <Kpi label="Visiteurs uniques" value={stats.uniqueVisitors} />
              <Kpi label="Temps moyen / session" value="GA4" sub="voir Google Analytics" />
              <Kpi label="Taux de rebond" value="GA4" sub="voir Google Analytics" />
            </div>
          </Section>

          {/* Revenue */}
          <Section icon={DollarSign} title="Revenus">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Kpi label="Premium" value={fmtMoney(stats.revPremium)} />
              <Kpi label="Boost" value={fmtMoney(stats.revBoost)} />
              <Kpi label="Publicités" value={fmtMoney(stats.revAds)} />
              <Kpi label="Ce mois (30j)" value={fmtMoney(stats.revMonth)} />
              <Kpi label="Total" value={fmtMoney(stats.revTotal)} />
            </div>
          </Section>

          {/* Charts */}
          <Section icon={TrendingUp} title="Graphiques">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="text-sm font-medium mb-2">Inscriptions par jour</div>
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={stats.signupsPerDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke={CHART_COLORS[0]} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm font-medium mb-2">Publications d'annonces par jour</div>
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.listingsPerDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill={CHART_COLORS[3]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm font-medium mb-2">Visites par jour (PWA)</div>
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={stats.visitsPerDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke={CHART_COLORS[5]} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm font-medium mb-2">Revenus par mois (12 derniers)</div>
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.revenuePerMonth}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                      <Bar dataKey="amount" fill={CHART_COLORS[4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </Section>

          {/* Devices & Sources */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Appareils</h3>
              </div>
              {stats.devices.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucune donnée</div>
              ) : (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={stats.devices} dataKey="value" nameKey="name" outerRadius={80} label>
                        {stats.devices.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Sources de trafic</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Source</TableHead><TableHead className="text-right">Événements</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {stats.sources.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Aucune donnée</TableCell></TableRow>
                  ) : stats.sources.slice(0, 10).map(s => (
                    <TableRow key={s.name}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-right font-medium">{fmtInt(s.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Top 10s */}
          <Section icon={Trophy} title="Classements">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="font-semibold mb-2">Top 10 vendeurs</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className="text-right">Ventes</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {stats.topSellers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune donnée</TableCell></TableRow>
                    ) : stats.topSellers.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="truncate max-w-[200px]">{s.name}</TableCell>
                        <TableCell className="text-right">{s.sales}</TableCell>
                        <TableCell className="text-right"><Badge variant="outline">{s.score.toFixed(1)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <Card className="p-4">
                <div className="font-semibold mb-2">Top 10 annonces les plus vues</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead className="text-right">Vues</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {stats.topListings.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Aucune donnée</TableCell></TableRow>
                    ) : stats.topListings.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="truncate max-w-[260px]">{l.title}</TableCell>
                        <TableCell className="text-right font-medium">{fmtInt(l.views)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <Card className="p-4">
                <div className="font-semibold mb-2">Top 10 catégories</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Catégorie</TableHead><TableHead className="text-right">Annonces</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {stats.topCategories.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Aucune donnée</TableCell></TableRow>
                    ) : stats.topCategories.map(c => (
                      <TableRow key={c.name}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell className="text-right font-medium">{fmtInt(c.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <Card className="p-4">
                <div className="font-semibold mb-2">Top 10 villes les plus actives</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Ville</TableHead><TableHead className="text-right">Utilisateurs</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {stats.topCities.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Aucune donnée</TableCell></TableRow>
                    ) : stats.topCities.map(c => (
                      <TableRow key={c.name}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell className="text-right font-medium">{fmtInt(c.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </Section>

          {/* PWA sub-dashboard (unchanged) */}
          <Section icon={BarChart3} title="Détails PWA (installation)">
            <PwaAnalyticsTab />
          </Section>
        </>
      )}
    </div>
  );
}
