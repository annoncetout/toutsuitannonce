import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  PackagePlus,
  Search,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ParcelCard, { ParcelItem } from "@/components/toutcolis/ParcelCard";
import RouteCard, { RouteItem } from "@/components/toutcolis/RouteCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, useSEO } from "@/lib/seo";

const steps = [
  { icon: PackagePlus, title: "Publiez votre colis", text: "Décrivez le colis, le trajet et la date souhaitée." },
  { icon: Users, title: "Recevez des offres", text: "Les transporteurs vérifiés vous proposent leurs trajets." },
  { icon: Truck, title: "Suivez la livraison", text: "Choisissez, échangez et confirmez la remise du colis." },
];

const ToutColisHome = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [parcels, setParcels] = useState<ParcelItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);

  useSEO({
    title: "TOUT COLIS — Envoi et transport de colis au Sénégal",
    description:
      "Envoyez un colis ou proposez vos trajets partout au Sénégal et à l'international. Transporteurs vérifiés, tarifs négociés, mise en relation immédiate.",
    canonical: `${SITE_URL}/tout-colis`,
  });

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        supabase
          .from("parcel_listings")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("transport_routes")
          .select("*, transporter:transporters(display_name, photo, verified, rating, total_trips)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      setParcels((p.data as ParcelItem[]) ?? []);
      setRoutes((r.data as unknown as RouteItem[]) ?? []);
    })();
  }, []);

  const search = (tab: "colis" | "trajets") => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (date) params.set("date", date);
    params.set("tab", tab);
    navigate(`/tout-colis/annonces?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-primary/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/4 h-[320px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute top-10 right-10 h-[240px] w-[320px] rounded-full bg-primary-glow/10 blur-3xl" />
          </div>
          <div className="container relative mx-auto px-4 py-16 md:py-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/50 px-4 py-1.5 text-xs font-medium text-primary">
              <Truck className="h-3.5 w-3.5" /> Nouveau sur TOUT SUITE ANNONCES
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight text-foreground md:text-6xl">
              TOUT COLIS — envoyez et transportez partout au Sénégal
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              Mettez votre colis en relation avec des voyageurs et transporteurs de confiance, ou rentabilisez
              vos trajets en transportant les colis des autres.
            </p>

            <Card className="mt-8 border-primary/20 bg-card/70 p-4 backdrop-blur-xl md:p-5">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <Input
                    aria-label="Ville de départ"
                    placeholder="Départ (ex : Dakar)"
                    className="pl-9"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <Input
                    aria-label="Ville d'arrivée"
                    placeholder="Arrivée (ex : Thiès)"
                    className="pl-9"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <Input
                    aria-label="Date de départ"
                    type="date"
                    className="pl-9"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <Button variant="gold" onClick={() => search("trajets")}>
                  <Search className="h-4 w-4" /> Rechercher
                </Button>
              </div>
            </Card>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="gold" className="rounded-full" onClick={() => navigate("/tout-colis/envoyer")}>
                <PackagePlus className="h-4 w-4" /> Envoyer un colis
              </Button>
              <Button
                variant="outlineGold"
                className="rounded-full"
                onClick={() => navigate("/tout-colis/transporteur")}
              >
                <Truck className="h-4 w-4" /> Devenir transporteur
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">Comment ça marche</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Card key={s.title} className="border-primary/15 bg-card/60 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground font-bold">
                    {i + 1}
                  </span>
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Transporteurs vérifiés par notre équipe, coordonnées protégées jusqu'à la mise en relation.
          </div>
        </section>

        <section className="container mx-auto px-4 pb-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Colis à transporter</h2>
            <Link to="/tout-colis/annonces?tab=colis" className="text-sm text-primary hover:underline">
              Voir tous les colis <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
          {parcels.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Aucun colis publié pour le moment.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {parcels.map((p) => (
                <ParcelCard key={p.id} parcel={p} />
              ))}
            </div>
          )}
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Trajets disponibles</h2>
            <Link to="/tout-colis/annonces?tab=trajets" className="text-sm text-primary hover:underline">
              Voir tous les trajets <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
          {routes.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Aucun trajet publié pour le moment.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {routes.map((r) => (
                <RouteCard key={r.id} route={r} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ToutColisHome;
