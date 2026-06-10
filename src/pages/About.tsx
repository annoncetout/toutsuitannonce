import { useEffect } from "react";
import { Award, Globe, HeartHandshake, Shield, Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: Shield,
    title: "Confiance & Sécurité",
    desc: "Modération humaine et IA, vérification des comptes, paiements sécurisés : chaque transaction est protégée.",
  },
  {
    icon: Sparkles,
    title: "Simplicité",
    desc: "Publier, rechercher, contacter — tout est pensé pour aller à l'essentiel, sans friction.",
  },
  {
    icon: HeartHandshake,
    title: "Proximité",
    desc: "Une équipe locale à votre écoute, un support réactif 7j/7, et une communauté engagée.",
  },
  {
    icon: TrendingUp,
    title: "Performance",
    desc: "Une plateforme rapide, mobile-first, et des outils de boost pour maximiser la visibilité de vos annonces.",
  },
];

const stats = [
  { value: "150K+", label: "Annonces publiées" },
  { value: "80K+", label: "Utilisateurs actifs" },
  { value: "98%", label: "Taux de satisfaction" },
  { value: "7j/7", label: "Support client" },
];

const About = () => {
  useEffect(() => {
    document.title = "Qui sommes-nous — TOUT SUITE Annonces";
    const desc = "Découvrez TOUT SUITE Annonces : une plateforme professionnelle d'annonces en ligne, sécurisée, locale et pensée pour particuliers et professionnels.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-hero">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(43_74%_56%/0.15),transparent_60%)]" />
          <div className="container mx-auto px-4 py-20 md:py-28 relative">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold tracking-widest uppercase">
                <Award className="w-3.5 h-3.5" /> Notre histoire
              </span>
              <h1 className="mt-6 font-display text-4xl md:text-6xl font-extrabold leading-tight text-foreground">
                Une plateforme <span className="text-gradient-gold">professionnelle</span> d'annonces, pensée pour vous.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                TOUT SUITE Annonces est née d'une conviction : acheter, vendre ou proposer un service en ligne doit être
                rapide, transparent et sûr. Nous mettons notre expertise technique et notre rigueur professionnelle au
                service d'une communauté grandissante de particuliers et de professionnels.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold">
                  <Link to="/publier">Publier une annonce</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/annonces">Explorer les annonces</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-border bg-card/30">
          <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-extrabold text-gradient-gold">{s.value}</div>
                <div className="mt-2 text-xs md:text-sm text-muted-foreground uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="container mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-primary text-xs font-semibold tracking-widest uppercase">
              <Target className="w-3.5 h-3.5" /> Notre mission
            </span>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold text-foreground">
              Connecter les gens, simplifier les échanges.
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              Nous bâtissons un marché numérique où chaque annonce est valorisée, chaque utilisateur respecté, et chaque
              transaction encadrée. Notre équipe combine ingénierie logicielle, design produit et expertise en confiance
              numérique pour offrir une expérience à la hauteur des standards internationaux.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Que vous soyez particulier cherchant la bonne affaire ou professionnel souhaitant développer votre
              activité, TOUT SUITE Annonces vous accompagne avec des outils concrets : mise en avant payante, statistiques
              de visibilité, messagerie intégrée, modération IA, et support humain dédié.
            </p>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-gradient-gold-soft border border-primary/20 p-8 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4 w-full">
                {[Users, Globe, Shield, Sparkles].map((Icon, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl bg-card border border-border flex items-center justify-center text-primary shadow-card"
                  >
                    <Icon className="w-10 h-10" strokeWidth={1.5} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-y border-border bg-card/30">
          <div className="container mx-auto px-4 py-20">
            <div className="max-w-2xl mx-auto text-center">
              <span className="inline-flex items-center gap-2 text-primary text-xs font-semibold tracking-widest uppercase">
                <HeartHandshake className="w-3.5 h-3.5" /> Nos valeurs
              </span>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Ce qui guide nos décisions au quotidien.
              </h2>
            </div>
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-gold"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pros */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <span className="inline-flex items-center gap-2 text-primary text-xs font-semibold tracking-widest uppercase">
                <TrendingUp className="w-3.5 h-3.5" /> Pour les professionnels
              </span>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Un partenaire de croissance pour votre activité.
              </h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">
                Nous offrons aux professionnels — agences immobilières, concessionnaires, artisans, commerçants — un
                ensemble d'outils pensés pour gagner en visibilité et structurer leur présence en ligne.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                "Comptes professionnels avec badge vérifié et page vitrine.",
                "Boosts d'annonces, mise en avant et carrousel premium.",
                "Tableau de bord analytique : vues, contacts, conversions.",
                "Facturation conforme et paiements sécurisés.",
                "Support prioritaire et accompagnement personnalisé.",
              ].map((item) => (
                <li key={item} className="flex gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    ✓
                  </div>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 pb-20">
          <div className="rounded-3xl bg-gradient-hero border border-primary/20 p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(43_74%_56%/0.18),transparent_60%)]" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-5xl font-extrabold text-foreground">
                Prêt à rejoindre la communauté ?
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                Créez votre compte gratuitement et publiez votre première annonce en moins de deux minutes.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                <Button asChild size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold">
                  <Link to="/auth">Créer mon compte</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/tarifs">Voir les offres pro</Link>
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
