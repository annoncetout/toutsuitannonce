import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, MapPin, Search, Star, Truck, Users, X } from "lucide-react";
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
import { contactTransporter } from "@/lib/toutcolisContact";
import { SITE_URL, useSEO } from "@/lib/seo";
import { SENEGAL_CITIES, VEHICLE_TYPES } from "@/lib/toutcolis";

interface TransporterItem {
  id: string;
  display_name: string | null;
  photo: string | null;
  bio: string | null;
  city: string | null;
  vehicle_type: string | null;
  max_weight: number | null;
  verified: boolean;
  rating: number;
  total_trips: number;
  created_at: string;
}

type SortKey = "rating" | "trips" | "recent";

const TransporterCardSkeleton = () => (
  <Card className="border-primary/10 bg-card/60 p-5">
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-full skeleton-3d" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 skeleton-3d" />
        <div className="h-3 w-1/3 skeleton-3d" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-3 w-full skeleton-3d" />
      <div className="h-3 w-2/3 skeleton-3d" />
    </div>
    <div className="mt-5 h-9 w-full skeleton-3d rounded-full" />
  </Card>
);

const TransportersBrowse = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TransporterItem[]>([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [vehicle, setVehicle] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("rating");

  useSEO({
    title: "Transporteurs vérifiés — TOUT COLIS",
    description:
      "Découvrez les transporteurs TOUT COLIS : profils vérifiés, véhicules, capacités et notes. Contactez celui qui correspond à votre envoi.",
    canonical: `${SITE_URL}/tout-colis/transporteurs`,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transporters_public")
      .select("id, display_name, photo, bio, city, vehicle_type, max_weight, verified, rating, total_trips, created_at")
      .limit(120);
    setItems((data as unknown as TransporterItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((t) => {
      if (verifiedOnly && !t.verified) return false;
      if (city !== "all" && (t.city ?? "").toLowerCase() !== city.toLowerCase()) return false;
      if (vehicle !== "all" && (t.vehicle_type ?? "") !== vehicle) return false;
      if (!q) return true;
      return [t.display_name, t.city, t.vehicle_type, t.bio]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
    return list.sort((a, b) => {
      if (sort === "trips") return b.total_trips - a.total_trips;
      if (sort === "recent") return +new Date(b.created_at) - +new Date(a.created_at);
      return Number(b.rating) - Number(a.rating);
    });
  }, [items, query, city, vehicle, verifiedOnly, sort]);

  const reset = () => {
    setQuery("");
    setCity("all");
    setVehicle("all");
    setVerifiedOnly(false);
    setSort("rating");
  };

  const activeFilters = (city !== "all" ? 1 : 0) + (vehicle !== "all" ? 1 : 0) + (verifiedOnly ? 1 : 0) + (query ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <header className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/30 to-card p-8 reveal-up">
          <div className="absolute -top-24 right-0 h-56 w-56 rounded-full bg-primary/15 blur-3xl animate-orb-drift" />
          <p className="relative inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-3 py-1 text-xs text-primary">
            <Users className="h-3.5 w-3.5" /> Réseau TOUT COLIS
          </p>
          <h1 className="relative mt-3 font-display text-3xl font-bold text-gradient-gold md:text-4xl">
            Nos transporteurs
          </h1>
          <p className="relative mt-2 max-w-2xl text-sm text-muted-foreground">
            Comparez les profils, vérifiez les capacités et contactez directement le transporteur qui dessert votre trajet.
          </p>
        </header>

        {/* Recherche et filtres */}
        <Card className="mt-6 border-primary/15 bg-card/60 p-5 backdrop-blur-sm reveal-up">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label htmlFor="tsearch">Rechercher</Label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="tsearch"
                  className="pl-9"
                  placeholder="Nom, ville, véhicule…"
                  aria-label="Rechercher un transporteur"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Ville</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  {SENEGAL_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Véhicule</Label>
              <Select value={vehicle} onValueChange={setVehicle}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les véhicules</SelectItem>
                  {VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant={verifiedOnly ? "gold" : "outline"}
              className="rounded-full"
              onClick={() => setVerifiedOnly((v) => !v)}
            >
              <BadgeCheck className="h-4 w-4" /> Vérifiés uniquement
            </Button>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-[190px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Meilleures notes</SelectItem>
                <SelectItem value="trips">Plus de trajets</SelectItem>
                <SelectItem value="recent">Nouveaux profils</SelectItem>
              </SelectContent>
            </Select>
            {activeFilters > 0 && (
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={reset}>
                <X className="h-4 w-4" /> Réinitialiser ({activeFilters})
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {loading ? "Chargement…" : `${filtered.length} transporteur(s)`}
            </span>
          </div>
        </Card>

        {loading ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <TransporterCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState3D
              title="Aucun transporteur trouvé"
              message="Élargissez votre recherche ou publiez votre colis : les transporteurs viendront à vous."
              icon={<Truck className="h-6 w-6 text-primary-foreground" />}
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t, i) => {
              return (
                <Card
                  key={t.id}
                  className="group reveal-up border-primary/15 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-gold"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-primary/30 transition-transform duration-300 group-hover:scale-105">
                      <AvatarImage src={t.photo ?? undefined} alt={t.display_name ?? "Transporteur"} />
                      <AvatarFallback>{(t.display_name ?? "T").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                        {t.display_name ?? "Transporteur"}
                        {t.verified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Transporteur vérifié" />}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {t.city ?? "Sénégal"}
                      </p>
                    </div>
                  </div>

                  {t.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{t.bio}</p>}

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary"><Star className="mr-1 h-3 w-3 text-primary" />{Number(t.rating).toFixed(1)}/5</Badge>
                    <Badge variant="secondary">{t.total_trips} trajet(s)</Badge>
                    {t.vehicle_type && (
                      <Badge variant="secondary"><Truck className="mr-1 h-3 w-3" />{t.vehicle_type}</Badge>
                    )}
                    {t.max_weight != null && <Badge variant="secondary">{t.max_weight} kg max</Badge>}
                  </div>

                  <div className="mt-5 flex gap-2">
                    <Button asChild variant="gold" size="sm" className="flex-1 rounded-full">
                      <Link to={`/tout-colis/routes?transporteur=${t.id}`}>Voir ses trajets</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        contactTransporter(
                          t.id,
                          `Bonjour ${t.display_name ?? ""}, je souhaite faire transporter un colis.`,
                        )
                      }
                    >
                      Contacter
                    </Button>
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

export default TransportersBrowse;
