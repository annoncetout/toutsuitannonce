import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Crown, Flame, Briefcase, BadgeCheck, Sparkles, Star, Zap, PartyPopper,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useSEO, SITE_URL } from "@/lib/seo";
import { useAuthPrompt } from "@/components/AuthPromptDialog";
import PaymentDialog, { type PaymentOffer, MERCHANT_PHONE } from "@/components/PaymentDialog";

type ParticulierPlan = {
  id: string;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  cta: string;
  icon: typeof Crown;
  accent: "muted" | "gold" | "goldPlus" | "red";
  popular?: boolean;
  // either route or payment offer
  route?: string;
  offer?: Omit<PaymentOffer, "listingId">;
};

const PARTICULIERS: ParticulierPlan[] = [
  {
    id: "gratuit",
    name: "Gratuit",
    price: 0,
    tagline: "Pour commencer",
    icon: Sparkles,
    accent: "muted",
    features: ["1 annonce standard", "Publication simple", "Visible dans les résultats"],
    cta: "Publier gratuitement",
    route: "/publier",
  },
  {
    id: "premium-7",
    name: "Premium",
    price: 2500,
    tagline: "7 jours en tête",
    icon: Crown,
    accent: "gold",
    features: ["Mise en avant pendant 7 jours", "Plus de visibilité", "Plus de contacts", "Badge Premium"],
    cta: "Choisir Premium",
    offer: { id: "premium-7", label: "Premium 7 jours", amount: 2500, kind: "listing_boost", boostType: "premium", durationDays: 7 },
  },
  {
    id: "premium-30",
    name: "Premium Plus",
    price: 5000,
    tagline: "30 jours prioritaires",
    icon: Star,
    accent: "goldPlus",
    popular: true,
    features: ["Mise en avant pendant 30 jours", "Priorité dans les résultats", "Plus de vues", "Vente plus rapide"],
    cta: "Choisir Premium Plus",
    offer: { id: "premium-30", label: "Premium Plus 30 jours", amount: 5000, kind: "listing_boost", boostType: "premium", durationDays: 30 },
  },
  {
    id: "urgent-7",
    name: "Urgent Boost",
    price: 7500,
    tagline: "Top visibilité",
    icon: Flame,
    accent: "red",
    features: ["Badge Urgent", "Top visibilité", "Position prioritaire", "Vente rapide"],
    cta: "Choisir Urgent Boost",
    offer: { id: "urgent-7", label: "Urgent Boost 7 jours", amount: 7500, kind: "listing_boost", boostType: "urgent", durationDays: 7 },
  },
];

type ProPlan = {
  id: "starter_pro" | "business_pro" | "elite_pro";
  name: string;
  price: number;
  features: string[];
  icon: typeof Crown;
  featured?: boolean;
};

const PROS: ProPlan[] = [
  {
    id: "starter_pro",
    name: "Starter Pro",
    price: 15000,
    icon: Briefcase,
    features: ["Jusqu'à 10 annonces", "Badge professionnel", "Support client"],
  },
  {
    id: "business_pro",
    name: "Business Pro",
    price: 30000,
    icon: BadgeCheck,
    featured: true,
    features: ["Jusqu'à 30 annonces", "Visibilité renforcée", "Logo entreprise", "Statistiques"],
  },
  {
    id: "elite_pro",
    name: "Elite Pro",
    price: 50000,
    icon: Zap,
    features: ["Annonces illimitées", "Priorité maximale", "Publicité dédiée", "Accompagnement VIP"],
  },
];

const accentClasses: Record<ParticulierPlan["accent"], string> = {
  muted: "border-border bg-card",
  gold: "border-primary/40 bg-primary/5",
  goldPlus: "border-primary bg-gradient-to-b from-primary/15 to-transparent shadow-gold-lg",
  red: "border-red-500/50 bg-red-500/5",
};

const Pricing = () => {
  const navigate = useNavigate();
  const { requireAuth } = useAuthPrompt();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [activeOffer, setActiveOffer] = useState<PaymentOffer | null>(null);

  useSEO({
    title: "Tarifs Premium, Boost & Pro — TOUT SUITE ANNONCES",
    description:
      "Découvrez nos formules : Gratuit, Premium, Premium Plus, Urgent Boost et abonnements Pro. Boostez vos annonces et vendez plus vite au Sénégal.",
    canonical: `${SITE_URL}/tarifs`,
  });

  const openPayment = (offer: PaymentOffer) => {
    if (!requireAuth({ title: "Finaliser votre achat", message: "Connectez-vous pour payer et activer votre offre." })) return;
    setActiveOffer(offer);
    setPaymentOpen(true);
  };

  const handleParticulier = (plan: ParticulierPlan) => {
    if (plan.route) {
      if (plan.route === "/publier") {
        if (!requireAuth({ title: "Publier une annonce", message: "Connectez-vous pour publier votre annonce gratuitement." })) return;
      }
      navigate(plan.route);
      return;
    }
    if (plan.offer) openPayment({ ...plan.offer });
  };

  const handlePro = (plan: ProPlan) => {
    openPayment({
      id: plan.id,
      label: `Abonnement ${plan.name}`,
      amount: plan.price,
      kind: "subscription",
      plan: plan.id,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 space-y-16">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto animate-fade-in">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Choisissez l'offre qui{" "}
            <span className="text-gradient-gold">vous correspond</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Publier reste 100% gratuit. Donnez plus de visibilité à vos annonces avec nos formules Premium et Pro.
          </p>
        </section>

        {/* Launch banner */}
        <section className="animate-fade-in">
          <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 md:p-6 flex items-center gap-4">
            <PartyPopper className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="font-display font-bold text-lg">🎉 Offre de lancement</p>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">20% de réduction</strong> sur les abonnements professionnels pendant les 3 premiers mois.
              </p>
            </div>
          </div>
        </section>

        {/* Particuliers */}
        <section>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Offres Particuliers</h2>
            <p className="text-sm text-muted-foreground">Boost à l'unité — paiement Wave ou Orange Money</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PARTICULIERS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-gold-lg ${accentClasses[plan.accent]}`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest bg-gradient-gold text-primary-foreground px-3 py-1 rounded-full shadow-gold uppercase">
                      ★ Le plus populaire
                    </span>
                  )}
                  <Icon
                    className={`w-7 h-7 mb-3 ${
                      plan.accent === "red" ? "text-red-500" : plan.accent === "muted" ? "text-muted-foreground" : "text-primary"
                    }`}
                  />
                  <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>
                  <div className="mb-5">
                    {plan.price === 0 ? (
                      <p className="text-3xl font-bold">Gratuit</p>
                    ) : (
                      <p className="text-3xl font-bold">
                        {plan.price.toLocaleString("fr-FR")}{" "}
                        <span className="text-sm font-normal text-muted-foreground">FCFA</span>
                      </p>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6 flex-1 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.popular ? "gold" : plan.accent === "muted" ? "outline" : "outlineGold"}
                    onClick={() => handleParticulier(plan)}
                  >
                    {plan.cta}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pros */}
        <section>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Offres Professionnels</h2>
            <p className="text-sm text-muted-foreground">Abonnements mensuels — paiement Wave ou Orange Money</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PROS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-gold-lg ${
                    plan.featured
                      ? "border-primary bg-gradient-to-b from-primary/15 to-transparent shadow-gold-lg"
                      : "border-border bg-card"
                  }`}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest bg-gradient-gold text-primary-foreground px-3 py-1 rounded-full shadow-gold uppercase">
                      ★ Le plus populaire
                    </span>
                  )}
                  <Icon className="w-7 h-7 text-primary mb-3" />
                  <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  <p className="text-3xl font-bold mt-3 mb-5">
                    {plan.price.toLocaleString("fr-FR")}{" "}
                    <span className="text-sm font-normal text-muted-foreground">FCFA / mois</span>
                  </p>
                  <ul className="space-y-2 mb-6 flex-1 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan.featured ? "gold" : "outlineGold"} onClick={() => handlePro(plan)}>
                    Souscrire
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Paiements */}
        <section className="bg-card rounded-2xl border border-primary/20 p-6 md:p-8">
          <h2 className="font-display text-2xl font-bold mb-2">Moyens de paiement</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Effectuez votre paiement vers le numéro ci-dessous puis confirmez dans l'application. Notre équipe valide sous 24h.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-background p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Wave</p>
              <p className="font-display text-2xl font-bold">{MERCHANT_PHONE}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Orange Money</p>
              <p className="font-display text-2xl font-bold">{MERCHANT_PHONE}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} offer={activeOffer} />
    </div>
  );
};

export default Pricing;
