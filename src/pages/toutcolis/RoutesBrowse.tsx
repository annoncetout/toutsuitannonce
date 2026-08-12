import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  Route as RouteIcon,
  Scale,
  Search,
  Truck,
  X,
} from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { EmptyState3D } from "@/components/Skeleton3D";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, useSEO } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { buildWhatsAppLink, formatDate, formatFcfa } from "@/lib/toutcolis";

interface RouteRow {
  id: string;
  transporter_id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string | null;
  departure_time: string | null;
  vehicle_type: string | null;
  price: number | null;
  currency: string;
  available_weight: number | null;
  available_volume: string | null;
  description: string | null;
  conditions: string | null;
  status: "active" | "full" | "completed" | "cancelled";
  created_at: string;
  transporter?: {
    display_name: string | null;
    photo: string | null;
    verified: boolean;
    rating: number;
    total_trips: number;
    phone: string | null;
    whatsapp: string | null;
  } | null;
}

type SortKey = "date" | "price_asc" | "price_desc" | "recent";

const STATUS_META: Record<RouteRow["status"], { label: string; className: string }> = {
  active: { label: "Places disponibles", className: "border-primary/40 bg-primary/15 text-primary" },
  full: { label: "Complet", className: "border-muted-foreground/30 bg-muted text-muted-foreground" },
  completed: { label: "Terminé", className: "border-muted-foreground/30 bg-muted text-muted-foreground" },
  cancelled: { label: "Annulé", className: "border-destructive/40 bg-destructive/10 text-destructive" },
};

const RouteSkeleton = () => (
  <Card className="border-primary/10 bg-card/60 p-5">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full skeleton-3d" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 skeleton-3d" />
        <div className="h-3 w-1/4 skeleton-3d" />
      </div>
    </div>
    <div className="mt-4 h-4 w-2/3 skeleton-3d" />
    <div className="mt-3 h-3 w-1/2 skeleton-3d" />
  </Card>
);

const RoutesBrowse = () => {
  const [params] = useSearchParams();
  const transporterId = params.get("transporteur");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RouteRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("active");
  const [sort, setSort] = useState<SortKey>("date");
  const [open, setOpen] = useState<string | null>(null);

  useSEO({
    title: "Trajets disponibles — TOUT COLIS",
    description:
      "Consultez tous les trajets publiés par nos transporteurs : dates, capacités restantes, tarifs et conditions de transport.",
    canonical: `${SITE_URL}/tout-colis/routes`,
  });

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("transport_routes")
      .select("*, transporter:transporters(display_name, photo, verified, rating, total_trips, phone, whatsapp)")
      .limit(120);
    if (transporterId) q = q.eq("transporter_id", transporterId);
    const { data } = await q;
    setRows((data as unknown as RouteRow[]) ?? []);
    setLoading(false);
  }, [transporterId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!term) return true;
      return [r.departure_city, r.arrival_city, r.departure_country, r.arrival_country, r.transporter?.display_name]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term));
    });
    return list.sort((a, b) => {
      if (sort === "price_asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
      if (sort === "price_desc") return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      if (sort === "recent") return +new Date(b.created_at) - +new Date(a.created_at);
      return +new Date(a.departure_date ?? "2999-01-01") - +new Date(b.departure_date ?? "2999-01-01");
    });
  }, [rows, query, status, sort]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <header className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/30 to-card p-8 reveal-up">
          <div className="absolute -top-24 left-1/3 h-56 w-56 rounded-full bg-primary/15 blur-3xl animate-orb-drift" />
          <p className="relative inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-3 py-1 text-xs text-primary">
            <RouteIcon className="h-3.5 w-3.5" /> Trajets TOUT COLIS
          </p>
          <h1 className="relative mt-3 font-display text-3xl font-bold text-gradient-gold md:text-4xl">
            Tous les trajets
          </h1>
          <p className="relative mt-2 max-w-2xl text-sm text-muted-foreground">
            Triez par date ou par tarif, vérifiez la capacité restante et ouvrez le détail d'un trajet pour tout savoir avant de réserver.
          </p>
        </header>

        <Card className="mt-6 border-primary/15 bg-card/60 p-5 backdrop-blur-sm reveal-up">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="rsearch">Rechercher</Label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="rsearch"
                  className="pl-9"
                  aria-label="Rechercher un trajet"
                  placeholder="Ville, pays, transporteur…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Places disponibles</SelectItem>
                  <SelectItem value="full">Complets</SelectItem>
                  <SelectItem value="completed">Terminés</SelectItem>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trier par</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Départ le plus proche</SelectItem>
                  <SelectItem value="price_asc">Prix croissant</SelectItem>
                  <SelectItem value="price_desc">Prix décroissant</SelectItem>
                  <SelectItem value="recent">Publiés récemment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            {transporterId && (
              <Button asChild size="sm" variant="ghost" className="rounded-full">
                <a href="/tout-colis/routes"><X className="h-4 w-4" /> Retirer le filtre transporteur</a>
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {loading ? "Chargement…" : `${filtered.length} trajet(s)`}
            </span>
          </div>
        </Card>

        {loading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <RouteSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState3D
              title="Aucun trajet ne correspond"
              message="Modifiez vos critères ou revenez plus tard : de nouveaux trajets sont publiés chaque jour."
              icon={<Truck className="h-6 w-6 text-primary-foreground" />}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filtered.map((r, i) => {
              const t = r.transporter;
              const meta = STATUS_META[r.status] ?? STATUS_META.active;
              const isOpen = open === r.id;
              const wa = buildWhatsAppLink(
                t?.whatsapp ?? t?.phone,
                `Bonjour, je suis intéressé par votre trajet ${r.departure_city} → ${r.arrival_city}.`,
              );
              return (
                <Card
                  key={r.id}
                  className="reveal-up overflow-hidden border-primary/15 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-gold"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar className="h-10 w-10 border border-primary/30">
                        <AvatarImage src={t?.photo ?? undefined} alt={t?.display_name ?? "Transporteur"} />
                        <AvatarFallback>{(t?.display_name ?? "T").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                          {t?.display_name ?? "Transporteur"}
                          {t?.verified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Vérifié" />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t?.total_trips ?? 0} trajet(s) · note {Number(t?.rating ?? 0).toFixed(1)}/5
                        </p>
                      </div>
                      <span className={cn("ml-auto rounded-full border px-3 py-1 text-xs font-medium", meta.className)}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                      <span>{r.departure_city}</span>
                      <ArrowRight className="h-4 w-4 text-primary/70" />
                      <span>{r.arrival_city}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        ({r.departure_country} → {r.arrival_country})
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-primary/80" />
                        {formatDate(r.departure_date)}
                        {r.departure_time ? ` · ${r.departure_time.slice(0, 5)}` : ""}
                      </span>
                      {r.available_weight != null && (
                        <span className="inline-flex items-center gap-1">
                          <Scale className="h-3.5 w-3.5 text-primary/80" /> {r.available_weight} kg dispo
                        </span>
                      )}
                      {r.vehicle_type && (
                        <Badge variant="secondary"><Truck className="mr-1 h-3 w-3" />{r.vehicle_type}</Badge>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-base font-bold text-primary">{formatFcfa(r.price, r.currency)}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : r.id)}
                      >
                        {isOpen ? "Masquer" : "Détails"}
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} />
                      </Button>
                    </div>
                  </div>

                  {/* Panneau de détails animé */}
                  <div
                    className={cn(
                      "grid transition-all duration-500 ease-out",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-primary/15 bg-secondary/20 p-5 text-sm">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
                            <p className="mt-1 text-muted-foreground">{r.description || "Aucune précision fournie."}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conditions</p>
                            <p className="mt-1 text-muted-foreground">{r.conditions || "Aucune condition particulière."}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capacité</p>
                            <p className="mt-1 text-muted-foreground">
                              {r.available_weight != null ? `${r.available_weight} kg` : "Non précisée"}
                              {r.available_volume ? ` · ${r.available_volume}` : ""}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tarif</p>
                            <p className="mt-1 font-semibold text-primary">{formatFcfa(r.price, r.currency)}</p>
                          </div>
                        </div>
                        {wa && r.status === "active" && (
                          <Button asChild variant="gold" size="sm" className="mt-4 rounded-full">
                            <a href={wa} target="_blank" rel="noopener noreferrer">Réserver ce trajet</a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
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

export default RoutesBrowse;
