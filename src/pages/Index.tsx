import AdCarousel from "@/components/AdCarousel";
import HomepageCategories from "@/components/Categories";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import StickySearchBar from "@/components/StickySearchBar";

import Listings from "@/components/Listings";
import PromoBanner from "@/components/PromoBanner";
import TopSellersWidget from "@/components/TopSellersWidget";
import TrustBar from "@/components/TrustBar";
import WhatsAppBar from "@/components/WhatsAppBar";
import AIRecommendations from "@/components/AIRecommendations";
import { useAuth } from "@/hooks/useAuth";
import { useSEO, SITE_URL, DEFAULT_IMAGE } from "@/lib/seo";

const Index = () => {
  const { user } = useAuth();
  useSEO({
    title: "TOUT DE SUITE — Petites annonces au Sénégal",
    description:
      "Petites annonces gratuites au Sénégal : immobilier Dakar, voitures occasion, emploi Sénégal, électronique, services. Publiez et trouvez en quelques clics.",
    canonical: `${SITE_URL}/`,
    image: DEFAULT_IMAGE,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "TOUT DE SUITE",
      url: SITE_URL,
      logo: DEFAULT_IMAGE,
      areaServed: "SN",
    },
  });
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StickySearchBar />
      <main>
        <Hero />
        <AdCarousel />
        <HomepageCategories />
        <Listings />
        <TopSellersWidget />
        <AIRecommendations mode="foryou" userId={user?.id} title="Recommandé pour vous" />
        <PromoBanner />
        <TrustBar />
      </main>
      <WhatsAppBar />
      <Footer />
    </div>
  );
};

export default Index;
