import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Coins,
  MapPin,
  MessageSquare,
  PackagePlus,
  PackageSearch,
  Search,
  ShieldCheck,
  Sparkles,
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
  {
    icon: PackagePlus,
    title: "Publiez votre colis",
    text: "Indiquez le contenu, le trajet et la date souhaitée. La publication prend moins de deux minutes.",
  },
  {
    icon: Users,
    title: "Comparez les offres",
    text: "Les transporteurs vérifiés vous proposent leur trajet et leur tarif. Vous choisissez librement.",
  },
  {
    icon: Truck,
    title: "Suivez la livraison",
    text: "Échangez directement, confirmez le retrait puis la remise du colis à l'arrivée.",
  },
];

const benefits = [
  { icon: Coins, title: "Des tarifs justes", text: "Vous négociez directement avec le transporteur, sans intermédiaire." },
  { icon: BadgeCheck, title: "Transporteurs vérifiés", text: "Identité et documents contrôlés par notre équipe avant validation." },
  { icon: Clock3, title: "Départs quotidiens", text: "Des trajets partout au Sénégal et vers l'international, chaque jour." },
  { icon: MessageSquare, title: "Contact protégé", text: "Vos coordonnées restent privées jusqu'à la mise en relation." },
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
          .from("parcel_listings_public")
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
        {/* ---------- HERO ---------- */}
        <section className="relative overflow-hidden border-b border-primary/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-28 left-1/4 h-[340px] w-[440px] rounded-full bg-primary/10 blur-3xl animate-orb-drift" />
            <div className="absolute top-8 right-4 h-[260px] w-[340px] rounded-full bg-primary-glow/10 blur-3xl animate-float" />
            <div className="absolute inset-x-0 bottom-0 h-[2px] conveyor-line opacity-60" />
          </div>

          <div className="container relative mx-auto px-4 py-16 md:py-24">
            <span className="reveal-up inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/50 px-4 py-1.5 text-xs font-medium tracking-wide text-primary backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 animate-sparkle" />
              Nouveau service TOUT SUITE ANNONCES
            </span>

            <h1
              className="reveal-up mt-5 max-w-3xl text-4xl font-bold leading-[1.1] text-foreground md:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Envoyer vos colis partout au Senegal et dans le Monde
            </h1>

            <p
              className="reveal-up mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
              style={{ animationDelay: "160ms" }}
            >
              TOUT COLIS met en relation les expéditeurs et les voyageurs qui font déjà le trajet.
              Envoyez un colis à moindre coût, ou rentabilisez vos déplacements en transportant ceux des autres.
            </p>

            {/* Barre de recherche */}
            <Card
              className="reveal-up mt-8 border-primary/20 bg-card/70 p-4 shadow-card backdrop-blur-xl transition-shadow duration-500 hover:shadow-gold md:p-5"
              style={{ animationDelay: "240ms" }}
            >
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
                <Button
                  variant="gold"
                  className="transition-transform duration-300 hover:-translate-y-0.5"
                  onClick={() => search("trajets")}
                >
                  <Search className="h-4 w-4" /> Rechercher
                </Button>
              </div>
            </Card>

            <div className="reveal-up mt-6 flex flex-wrap gap-3" style={{ animationDelay: "320ms" }}>
              <Button
                variant="gold"
                className="rounded-full transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-gold"
                onClick={() => navigate("/tout-colis/envoyer")}
              >
                <PackagePlus className="h-4 w-4" /> Envoyer un colis
              </Button>
              <Button
                variant="outlineGold"
                className="rounded-full transition-transform duration-300 hover:-translate-y-0.5"
                onClick={() => navigate("/tout-colis/transporteur")}
              >
                <Truck className="h-4 w-4" /> Devenir transporteur
              </Button>
            </div>

            {/* Repères de confiance */}
            <div
              className="reveal-up mt-10 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4"
              style={{ animationDelay: "400ms" }}
            >
              {[
                { value: "100 %", label: "Transporteurs vérifiés" },
                { value: "0 FCFA", label: "Frais de publication" },
                { value: "2 min", label: "Pour publier un colis" },
                { value: "7j/7", label: "Départs disponibles" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-primary/15 bg-card/50 px-4 py-3 backdrop-blur-md transition-transform duration-300 hover:-translate-y-1"
                >
                  <p className="bg-gradient-gold bg-clip-text text-lg font-bold text-transparent">{s.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- COMMENT ÇA MARCHE ---------- */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Mode d'emploi</span>
            <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Comment ça marche ?</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              Trois étapes simples, du dépôt de l'annonce jusqu'à la remise du colis à destination.
            </p>
          </div>

          <div className="relative mt-8 grid gap-4 md:grid-cols-3">
            <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-[2px] conveyor-line opacity-40 md:block" />
            {steps.map((s, i) => (
              <Card
                key={s.title}
                className="card-3d reveal-up relative border-primary/15 bg-card/60 p-6 backdrop-blur-md"
                style={{ animationDelay: `${i * 110}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold font-bold text-primary-foreground shadow-gold">
                    {i + 1}
                  </span>
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-primary/15 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Chaque transporteur est vérifié par notre équipe et vos coordonnées restent protégées
              jusqu'à la mise en relation.
            </span>
          </div>
        </section>

        {/* ---------- POURQUOI TOUT COLIS ---------- */}
        <section className="border-y border-primary/10 bg-card/20">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Nos engagements</span>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Pourquoi choisir TOUT COLIS ?</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                Un service pensé pour l'envoi entre particuliers et professionnels, rapide, économique et sécurisé.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b, i) => (
                <Card
                  key={b.title}
                  className="card-3d reveal-up group border-primary/15 bg-card/60 p-5 backdrop-blur-md"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                    <b.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- COLIS À TRANSPORTER ---------- */}
        <section className="container mx-auto px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Demandes récentes</span>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Colis à transporter</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Des colis en attente d'un transporteur sur votre trajet.
              </p>
            </div>
            <Link
              to="/tout-colis/annonces?tab=colis"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              Voir tous les colis
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {parcels.length === 0 ? (
            <Card className="mt-6 flex flex-col items-center gap-3 border-dashed border-primary/20 bg-card/40 px-6 py-12 text-center">
              <PackageSearch className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                Aucun colis publié pour le moment. Soyez le premier à publier votre envoi.
              </p>
              <Button variant="gold" className="rounded-full" onClick={() => navigate("/tout-colis/envoyer")}>
                <PackagePlus className="h-4 w-4" /> Publier un colis
              </Button>
            </Card>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {parcels.map((p, i) => (
                <div key={p.id} className="reveal-up" style={{ animationDelay: `${i * 70}ms` }}>
                  <ParcelCard parcel={p} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------- TRAJETS DISPONIBLES ---------- */}
        <section className="container mx-auto px-4 pb-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Transporteurs actifs</span>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Trajets disponibles</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Réservez une place pour votre colis sur un trajet déjà programmé.
              </p>
            </div>
            <Link
              to="/tout-colis/annonces?tab=trajets"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              Voir tous les trajets
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {routes.length === 0 ? (
            <Card className="mt-6 flex flex-col items-center gap-3 border-dashed border-primary/20 bg-card/40 px-6 py-12 text-center">
              <Truck className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                Aucun trajet publié pour le moment. Publiez le vôtre et recevez des demandes.
              </p>
              <Button
                variant="outlineGold"
                className="rounded-full"
                onClick={() => navigate("/tout-colis/transporteur")}
              >
                <Truck className="h-4 w-4" /> Proposer un trajet
              </Button>
            </Card>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {routes.map((r, i) => (
                <div key={r.id} className="reveal-up" style={{ animationDelay: `${i * 70}ms` }}>
                  <RouteCard route={r} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------- APPEL À L'ACTION ---------- */}
        <section className="container mx-auto px-4 pb-20">
          <Card className="relative overflow-hidden border-primary/25 bg-card/60 p-8 text-center backdrop-blur-xl md:p-12">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 left-1/2 h-[260px] w-[360px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl animate-orb-drift" />
            </div>
            <div className="relative">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Prêt à envoyer votre premier colis ?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                La publication est gratuite et vous recevez des propositions de transporteurs vérifiés
                en quelques heures.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  variant="gold"
                  className="rounded-full transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-gold"
                  onClick={() => navigate("/tout-colis/envoyer")}
                >
                  <PackagePlus className="h-4 w-4" /> Envoyer un colis
                </Button>
                <Button
                  variant="outlineGold"
                  className="rounded-full transition-transform duration-300 hover:-translate-y-0.5"
                  onClick={() => navigate("/tout-colis/annonces")}
                >
                  <PackageSearch className="h-4 w-4" /> Parcourir les annonces
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ToutColisHome;
