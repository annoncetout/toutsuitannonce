import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Handshake,
  Loader2,
  MapPin,
  PackageCheck,
  PackageSearch,
  Plane,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SITE_URL, useSEO } from "@/lib/seo";
import { formatDate, formatFcfa } from "@/lib/toutcolis";

type Stage = "pending" | "matched" | "transit" | "delivered";

const STAGES: { key: Stage; label: string; icon: typeof Clock }[] = [
  { key: "pending", label: "En cours", icon: Clock },
  { key: "matched", label: "Pris en charge", icon: Handshake },
  { key: "transit", label: "En transit", icon: Plane },
  { key: "delivered", label: "Livré", icon: PackageCheck },
];

interface ParcelRow {
  id: string;
  departure_city: string;
  arrival_city: string;
  departure_country: string;
  arrival_country: string;
  departure_date: string | null;
  parcel_type: string | null;
  weight: number | null;
  price: number | null;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RequestRow {
  id: string;
  parcel_listing_id: string | null;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
}

interface TrackEvent {
  at: string;
  title: string;
  detail?: string;
  stage: Stage | "cancelled";
}

/** Étape courante déduite du statut du colis et de sa date de départ. */
const currentStage = (p: ParcelRow): Stage | "cancelled" => {
  if (p.status === "delivered") return "delivered";
  if (p.status === "cancelled" || p.status === "expired") return "cancelled";
  if (p.status === "matched") {
    const dep = p.departure_date ? new Date(p.departure_date) : null;
    if (dep && dep.getTime() <= Date.now()) return "transit";
    return "matched";
  }
  return "pending";
};

/** Historique des événements reconstitué à partir du colis et de ses demandes. */
const buildEvents = (p: ParcelRow, reqs: RequestRow[]): TrackEvent[] => {
  const events: TrackEvent[] = [
    { at: p.created_at, title: "Colis publié", detail: "Votre annonce est en ligne et visible par les transporteurs.", stage: "pending" },
  ];

  reqs.forEach((r) => {
    if (r.status === "pending") {
      events.push({ at: r.created_at, title: "Proposition de transport reçue", detail: r.message ?? undefined, stage: "pending" });
    }
    if (r.status === "accepted") {
      events.push({ at: r.updated_at, title: "Transporteur confirmé", detail: "Votre colis est pris en charge.", stage: "matched" });
    }
    if (r.status === "rejected") {
      events.push({ at: r.updated_at, title: "Proposition refusée", stage: "pending" });
    }
  });

  const stage = currentStage(p);

  if (p.status === "matched" && !reqs.some((r) => r.status === "accepted")) {
    events.push({ at: p.updated_at, title: "Colis pris en charge", stage: "matched" });
  }
  if (stage === "transit" && p.departure_date) {
    events.push({ at: p.departure_date, title: "Départ effectué — en transit", detail: `${p.departure_city} → ${p.arrival_city}`, stage: "transit" });
  }
  if (p.status === "delivered") {
    events.push({ at: p.updated_at, title: "Colis livré", detail: "Livraison confirmée à destination.", stage: "delivered" });
  }
  if (p.status === "cancelled") {
    events.push({ at: p.updated_at, title: "Annonce annulée", stage: "cancelled" });
  }
  if (p.status === "expired") {
    events.push({ at: p.updated_at, title: "Annonce expirée", stage: "cancelled" });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
};

const stageIndex = (s: Stage | "cancelled") => STAGES.findIndex((x) => x.key === s);

const ParcelTracking = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [parcels, setParcels] = useState<ParcelRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [filter, setFilter] = useState<"all" | Stage>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useSEO({
    title: "Suivi de mes colis — TOUT COLIS",
    description: "Suivez en temps réel le statut de vos colis validés : en cours, pris en charge, en transit, livré, avec l'historique complet des événements.",
    canonical: `${SITE_URL}/tout-colis/suivi`,
  });

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const { data: p } = await supabase
      .from("parcel_listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const rows = (p as unknown as ParcelRow[]) ?? [];
    setParcels(rows);
    if (rows.length) {
      const { data: r } = await supabase
        .from("parcel_requests")
        .select("*")
        .in("parcel_listing_id", rows.map((x) => x.id));
      setRequests((r as unknown as RequestRow[]) ?? []);
    } else {
      setRequests([]);
    }
    setBusy(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth?redirect=/tout-colis/suivi");
      return;
    }
    load();
  }, [user, loading, navigate, load]);

  // Mises à jour temps réel des colis suivis
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("parcel-tracking")
      .on("postgres_changes", { event: "*", schema: "public", table: "parcel_listings", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const tracked = useMemo(
    () => parcels.filter((p) => p.status !== "cancelled" && p.status !== "expired"),
    [parcels],
  );

  const counts = useMemo(() => {
    const c: Record<Stage, number> = { pending: 0, matched: 0, transit: 0, delivered: 0 };
    tracked.forEach((p) => {
      const s = currentStage(p);
      if (s !== "cancelled") c[s] += 1;
    });
    return c;
  }, [tracked]);

  const visible = useMemo(
    () => (filter === "all" ? tracked : tracked.filter((p) => currentStage(p) === filter)),
    [tracked, filter],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Suivi de mes colis</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Statut en temps réel de vos colis validés et historique complet des événements.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outlineGold" className="rounded-full" onClick={load} disabled={busy}>
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Actualiser
            </Button>
            <Button variant="gold" className="rounded-full" asChild>
              <Link to="/tout-colis/mes-colis">Mes colis & trajets</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map(({ key, label, icon: Icon }) => (
            <Card key={key} className="border-primary/15 bg-card/60 p-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-foreground">{counts[key]}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mt-8">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">Tous ({tracked.length})</TabsTrigger>
            {STAGES.map((s) => (
              <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {busy ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : visible.length === 0 ? (
          <Card className="mt-8 border-dashed border-primary/25 bg-card/40 p-10 text-center">
            <PackageSearch className="mx-auto h-8 w-8 text-primary/70" />
            <p className="mt-3 text-sm text-muted-foreground">Aucun colis à suivre pour ce filtre.</p>
            <Button variant="gold" className="mt-4 rounded-full" asChild>
              <Link to="/tout-colis/envoyer">Envoyer un colis</Link>
            </Button>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            {visible.map((p) => {
              const stage = currentStage(p);
              const idx = stageIndex(stage);
              const events = buildEvents(p, requests.filter((r) => r.parcel_listing_id === p.id));
              const open = openId === p.id;
              return (
                <Card key={p.id} className="border-primary/15 bg-card/60 p-5 transition-all duration-300 hover:border-primary/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{p.departure_city}</span>
                        <ArrowRight className="h-4 w-4 text-primary/70" />
                        <span>{p.arrival_city}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.parcel_type ?? "Colis"}
                        {p.weight != null && ` • ${p.weight} kg`}
                        {` • Départ ${formatDate(p.departure_date)}`}
                        {` • Réf. ${p.id.slice(0, 8).toUpperCase()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-primary">{formatFcfa(p.price, p.currency)}</span>
                      <Badge variant={stage === "delivered" ? "default" : "secondary"}>
                        {STAGES[idx]?.label ?? "En cours"}
                      </Badge>
                    </div>
                  </div>

                  {/* Barre de progression par étapes */}
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {STAGES.map((s, i) => {
                      const done = i <= idx;
                      const Icon = done && i < idx ? CheckCircle2 : s.icon;
                      return (
                        <div key={s.key} className="flex flex-col items-center gap-2 text-center">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                              done ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={`text-[11px] ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                            {s.label}
                          </span>
                          <div className={`h-1 w-full rounded-full ${done ? "bg-primary" : "bg-border"}`} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(open ? null : p.id)}>
                      {open ? "Masquer l'historique" : `Voir l'historique (${events.length})`}
                    </Button>
                  </div>

                  {open && (
                    <ol className="mt-2 space-y-4 border-l border-primary/20 pl-5">
                      {events.map((e, i) => (
                        <li key={`${e.at}-${i}`} className="relative">
                          <span
                            className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-background ${
                              e.stage === "cancelled" ? "bg-destructive" : i === 0 ? "bg-primary" : "bg-primary/40"
                            }`}
                          />
                          <p className="text-sm font-medium text-foreground">
                            {e.stage === "cancelled" && <XCircle className="mr-1 inline h-3.5 w-3.5 text-destructive" />}
                            {e.title}
                          </p>
                          {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {new Date(e.at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ParcelTracking;
