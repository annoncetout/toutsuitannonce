import { useEffect } from "react";
import {
  Award,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  Crown,
  Gauge,
  Globe,
  Handshake,
  HeartHandshake,
  Quote,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { trackEvent } from "@/lib/analytics";

const PAGE_TITLE = "Qui sommes-nous — TOUT SUITE Annonces, la plateforme premium d'annonces";
const PAGE_DESC =
  "TOUT SUITE Annonces : plateforme professionnelle d'annonces en ligne. Sécurité, modération IA, comptes pros vérifiés, paiements protégés et support 7j/7. Découvrez notre mission, nos chiffres clés et nos offres dédiées aux professionnels.";
const PAGE_URL = "https://www.toutsuiteannonces.com/qui-sommes-nous";

const values = [
  {
    icon: Shield,
    title: "Confiance & Sécurité",
    desc: "Modération humaine et IA, vérification des comptes, paiements protégés : chaque transaction est encadrée.",
  },
  {
    icon: Sparkles,
    title: "Simplicité",
    desc: "Publier, rechercher, contacter — chaque parcours est pensé pour aller à l'essentiel, sans friction.",
  },
  {
    icon: HeartHandshake,
    title: "Proximité",
    desc: "Une équipe locale à votre écoute, un support réactif 7j/7 et une communauté engagée.",
  },
  {
    icon: TrendingUp,
    title: "Performance",
    desc: "Plateforme rapide, mobile-first, et outils de boost pour maximiser la visibilité de vos annonces.",
  },
];

const stats = [
  { value: "150K+", label: "Annonces publiées", icon: BarChart3 },
  { value: "80K+", label: "Utilisateurs actifs", icon: Users },
  { value: "98%", label: "Taux de satisfaction", icon: Star },
  { value: "7j/7", label: "Support client", icon: HeartHandshake },
];

const badges = [
  { icon: ShieldCheck, label: "Paiement sécurisé" },
  { icon: BadgeCheck, label: "Comptes pros vérifiés" },
  { icon: Gauge, label: "99,9% de disponibilité" },
  { icon: Globe, label: "Couverture nationale" },
  { icon: Trophy, label: "Top plateforme 2025" },
  { icon: Rocket, label: "Modération IA en temps réel" },
];

const milestones = [
  { year: "2022", title: "Lancement", desc: "Première version de TOUT SUITE Annonces et premiers 1 000 utilisateurs." },
  { year: "2023", title: "Croissance", desc: "50 000 annonces publiées, partenariats locaux et lancement des comptes pro." },
  { year: "2024", title: "Innovation", desc: "Modération IA, paiements intégrés, application mobile-first." },
  { year: "2025", title: "Référence", desc: "Plus de 80 000 utilisateurs actifs et un écosystème pro complet." },
];

const proBenefits = [
  { icon: BadgeCheck, title: "Compte pro vérifié", desc: "Badge officiel, page vitrine et confiance accrue auprès des acheteurs." },
  { icon: Rocket, title: "Boost & mise en avant", desc: "Carrousel premium, top des résultats et annonces sponsorisées." },
  { icon: BarChart3, title: "Analytics avancés", desc: "Vues, contacts, conversions et taux de transformation en temps réel." },
  { icon: Building2, title: "Multi-annonces", desc: "Publication en lot, gestion centralisée et import CSV pour gros catalogues." },
  { icon: ShieldCheck, title: "Paiements & facturation", desc: "Encaissements sécurisés et factures conformes téléchargeables." },
  { icon: Handshake, title: "Support prioritaire", desc: "Account manager dédié, onboarding personnalisé et SLA garanti." },
];

const testimonials = [
  {
    quote:
      "Depuis que nous publions sur TOUT SUITE Annonces, nos demandes ont triplé. L'outil de boost est redoutable.",
    author: "Karim B.",
    role: "Agence immobilière, Casablanca",
    verified: true,
  },
  {
    quote:
      "Interface claire, support réactif, et de vrais acheteurs. Une plateforme sérieuse pour les professionnels.",
    author: "Sophie L.",
    role: "Concessionnaire auto, Lyon",
    verified: true,
  },
  {
    quote:
      "J'ai vendu mon appartement en moins d'une semaine grâce à la mise en avant premium. Service au top.",
    author: "Mehdi A.",
    role: "Particulier, Rabat",
    verified: true,
  },
  {
    quote:
      "L'espace pro nous permet de gérer tout notre catalogue facilement. Les analytics sont précieux au quotidien.",
    author: "Claire D.",
    role: "Boutique mode, Paris",
    verified: true,
  },
  {
    quote:
      "Modération rapide et acheteurs sérieux. C'est devenu notre principal canal d'acquisition.",
    author: "Yassine M.",
    role: "Artisan menuisier, Marrakech",
    verified: false,
  },
];

const trackProPublishClick = (location: string) => {
  trackEvent("publish_pro_click", {
    location,
    page: "about",
    cta: "publier_annonce_pro",
  });
};

const trackProPricingClick = (location: string) => {
  trackEvent("pro_pricing_click", { location, page: "about" });
};

const About = () => {
  useEffect(() => {
    document.title = PAGE_TITLE;
    trackEvent("page_view", { page: "about", path: "/qui-sommes-nous" });


    const setMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta('meta[name="description"]', "name", "description", PAGE_DESC);
    setMeta('meta[property="og:title"]', "property", "og:title", PAGE_TITLE);
    setMeta('meta[property="og:description"]', "property", "og:description", PAGE_DESC);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:url"]', "property", "og:url", PAGE_URL);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", PAGE_TITLE);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", PAGE_DESC);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", PAGE_URL);

    const ldId = "ld-about-org";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "TOUT SUITE Annonces",
      url: "https://www.toutsuiteannonces.com",
      description: PAGE_DESC,
      sameAs: ["https://www.toutsuiteannonces.com"],
    });
    document.head.appendChild(ld);

    return () => {
      document.getElementById(ldId)?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-hero">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,hsl(43_74%_56%/0.22),transparent_55%),radial-gradient(circle_at_85%_80%,hsl(45_95%_65%/0.12),transparent_55%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="container mx-auto px-4 py-24 md:py-32 relative">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
                <Crown className="w-3.5 h-3.5" /> Notre histoire
              </span>
              <h1 className="mt-8 font-display text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight text-foreground">
                L'excellence des annonces,{" "}
                <span className="text-gradient-gold">façon premium.</span>
              </h1>
              <p className="mt-8 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                TOUT SUITE Annonces réinvente la petite annonce en ligne : une plateforme sûre, élégante et
                performante, conçue avec exigence pour les particuliers comme pour les professionnels.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-gold text-primary-foreground shadow-gold hover:shadow-gold-lg transition-shadow h-12 px-7"
                >
                  <Link to="/publier" onClick={() => trackProPublishClick("hero")}>
                    <Zap className="w-4 h-4 mr-1.5" /> Publier une annonce
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-7 border-primary/40 hover:bg-primary/10">
                  <Link to="/annonces">Explorer les annonces</Link>
                </Button>
              </div>

              {/* Trust badges row */}
              <div className="mt-12 flex flex-wrap gap-2.5">
                {badges.slice(0, 4).map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border text-xs text-foreground/80"
                  >
                    <Icon className="w-3.5 h-3.5 text-primary" /> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RÉFÉRENCES & CHIFFRES CLÉS */}
        <section className="border-b border-border bg-card/40">
          <div className="container mx-auto px-4 py-20">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
                <Trophy className="w-3.5 h-3.5" /> Références & chiffres clés
              </span>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold text-foreground leading-tight">
                Une plateforme qui inspire confiance.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Des milliers d'annonceurs, particuliers et professionnels nous font confiance chaque jour pour
                acheter, vendre et développer leur activité en toute sérénité.
              </p>
            </div>

            {/* Stats grid */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="relative p-6 rounded-2xl bg-gradient-to-br from-card to-card/60 border border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-gold group overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                  <Icon className="w-5 h-5 text-primary mb-3" />
                  <div className="font-display text-4xl md:text-5xl font-extrabold text-gradient-gold leading-none">
                    {value}
                  </div>
                  <div className="mt-3 text-xs md:text-sm text-muted-foreground uppercase tracking-widest">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Badges premium */}
            <div className="mt-10 p-6 md:p-8 rounded-2xl bg-background/50 border border-border">
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                {badges.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    <span className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-foreground/80 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {milestones.map((m) => (
                <div key={m.year} className="relative pl-6">
                  <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_hsl(43_74%_56%/0.8)]" />
                  <div className="absolute left-[5px] top-5 bottom-0 w-px bg-gradient-to-b from-primary/40 to-transparent" />
                  <div className="font-display text-2xl font-extrabold text-gradient-gold">{m.year}</div>
                  <div className="mt-1 font-semibold text-foreground">{m.title}</div>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section className="container mx-auto px-4 py-24 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
              <Target className="w-3.5 h-3.5" /> Notre mission
            </span>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Connecter les gens,{" "}
              <span className="text-gradient-gold">simplifier les échanges.</span>
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed text-base md:text-lg">
              Nous bâtissons un marché numérique où chaque annonce est valorisée, chaque utilisateur respecté et
              chaque transaction encadrée. Notre équipe combine ingénierie logicielle, design produit et expertise
              en confiance numérique pour offrir une expérience à la hauteur des standards internationaux.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Particulier ou professionnel, TOUT SUITE Annonces vous accompagne avec des outils concrets : mise en
              avant payante, statistiques de visibilité, messagerie intégrée, modération IA et support humain dédié.
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-radial-gold opacity-50 blur-2xl" />
            <div className="relative aspect-square rounded-3xl bg-gradient-gold-soft border border-primary/30 p-8 flex items-center justify-center shadow-gold-lg">
              <div className="grid grid-cols-2 gap-4 w-full">
                {[Users, Globe, Shield, Sparkles].map((Icon, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl bg-card border border-border flex items-center justify-center text-primary shadow-card hover:border-primary/40 transition-all hover:-translate-y-1"
                  >
                    <Icon className="w-12 h-12" strokeWidth={1.5} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="border-y border-border bg-card/40">
          <div className="container mx-auto px-4 py-24">
            <div className="max-w-2xl mx-auto text-center">
              <span className="inline-flex items-center gap-2 text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
                <HeartHandshake className="w-3.5 h-3.5" /> Nos valeurs
              </span>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold text-foreground leading-tight">
                Ce qui guide nos décisions au quotidien.
              </h2>
            </div>
            <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="group p-7 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-gold relative overflow-hidden"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/60 transition-colors" />
                  <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-lg">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROFESSIONNELS */}
        <section className="container mx-auto px-4 py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
              <Building2 className="w-3.5 h-3.5" /> Espace professionnels
            </span>
            <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Un partenaire de croissance pour{" "}
              <span className="text-gradient-gold">votre activité.</span>
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed text-base md:text-lg">
              Agences immobilières, concessionnaires, artisans, commerçants, e-commerçants : nous mettons à votre
              disposition une suite complète d'outils pour gagner en visibilité, structurer votre présence en ligne et
              convertir plus efficacement.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {proBenefits.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group flex gap-4 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-gold"
              >
                <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-gold-soft border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pro CTA card */}
          <div className="mt-12 relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-8 md:p-12">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
                  <Crown className="w-3.5 h-3.5" /> Offre Pro
                </span>
                <h3 className="mt-3 font-display text-2xl md:text-4xl font-extrabold text-foreground leading-tight">
                  Passez à la vitesse supérieure dès aujourd'hui.
                </h3>
                <p className="mt-3 text-muted-foreground max-w-xl">
                  Activez votre compte professionnel en quelques minutes : badge vérifié, boosts illimités, analytics
                  avancés et accompagnement dédié.
                </p>
                <ul className="mt-5 grid sm:grid-cols-2 gap-2.5">
                  {[
                    "Sans engagement",
                    "Essai gratuit 14 jours",
                    "Onboarding personnalisé",
                    "Facturation conforme",
                  ].map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-foreground/90">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-gold text-primary-foreground shadow-gold hover:shadow-gold-lg h-12 px-7 w-full md:w-auto"
                >
                  <Link to="/publier" onClick={() => trackProPublishClick("pro_cta_card")} data-analytics="publish-pro-cta">
                    <Rocket className="w-4 h-4 mr-1.5" /> Publier une annonce pro
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-7 border-primary/40 w-full md:w-auto">
                  <Link to="/tarifs" onClick={() => trackProPricingClick("pro_cta_card")}>Voir les offres & tarifs</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="border-y border-border bg-card/40">
          <div className="container mx-auto px-4 py-24">
            <div className="max-w-2xl mx-auto text-center">
              <span className="inline-flex items-center gap-2 text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
                <Award className="w-3.5 h-3.5" /> Ils nous font confiance
              </span>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold text-foreground leading-tight">
                La parole à nos partenaires.
              </h2>
            </div>
            <Carousel opts={{ align: "start", loop: true }} className="mt-12 max-w-5xl mx-auto">
              <CarouselContent className="-ml-4">
                {testimonials.map((t) => (
                  <CarouselItem key={t.author} className="pl-4 md:basis-1/2">
                    <figure className="relative h-full p-8 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors">
                      <Quote className="absolute top-5 right-5 w-8 h-8 text-primary/20" />
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex gap-0.5 text-primary">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        {t.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-semibold uppercase tracking-wider">
                            <BadgeCheck className="w-3 h-3" /> Annonce vérifiée
                          </span>
                        )}
                      </div>
                      <blockquote className="text-foreground/90 leading-relaxed">"{t.quote}"</blockquote>
                      <figcaption className="mt-5 pt-5 border-t border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                          {t.author.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{t.author}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t.role}</div>
                        </div>
                      </figcaption>
                    </figure>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-4 bg-card border-primary/30 hover:bg-primary hover:text-primary-foreground" />
              <CarouselNext className="hidden md:flex -right-4 bg-card border-primary/30 hover:bg-primary hover:text-primary-foreground" />
            </Carousel>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="container mx-auto px-4 py-20">
          <div className="rounded-3xl bg-gradient-hero border border-primary/30 p-10 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(43_74%_56%/0.22),transparent_65%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-6xl font-extrabold text-foreground leading-tight">
                Prêt à rejoindre la <span className="text-gradient-gold">communauté</span> ?
              </h2>
              <p className="mt-5 text-muted-foreground max-w-xl mx-auto text-base md:text-lg">
                Créez votre compte gratuitement et publiez votre première annonce en moins de deux minutes.
              </p>
              <div className="mt-10 flex flex-wrap gap-3 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-gold text-primary-foreground shadow-gold hover:shadow-gold-lg h-12 px-8"
                >
                  <Link to="/auth" onClick={() => trackEvent("signup_click", { location: "about_final_cta" })}>Créer mon compte</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-8 border-primary/40">
                  <Link to="/tarifs" onClick={() => trackProPricingClick("about_final_cta")}>Découvrir les offres pro</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
