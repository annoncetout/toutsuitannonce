import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, MapPin, Star, ArrowLeft, MessageCircle, Calendar, Eye, ShoppingBag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SellerBadge, { SellerBadgeKind } from "@/components/SellerBadge";
import ListingCard, { ListingCardData } from "@/components/ListingCard";
import { useSEO, SITE_URL } from "@/lib/seo";

type Seller = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  active_listings_count: number;
  sales_count: number;
  total_views: number;
  avg_rating: number;
  reviews_count: number;
  response_rate: number;
  account_age_days: number;
  badge: SellerBadgeKind;
  rank_global: number | null;
  top_score: number;
};

type Review = {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string | null;
  reviewer_avatar?: string | null;
};

export default function SellerProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useSEO({
    title: seller?.display_name
      ? `${seller.display_name} — Profil vendeur | TOUT DE SUITE`
      : "Profil vendeur | TOUT DE SUITE",
    description: seller?.display_name
      ? `Découvrez les annonces et avis de ${seller.display_name}${seller.city ? ` à ${seller.city}` : ""}.`
      : "Profil du vendeur sur TOUT DE SUITE Annonces.",
    canonical: `${SITE_URL}/vendeur/${userId}`,
  });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: ls }, { data: rv }] = await Promise.all([
        supabase
          .from("seller_stats_public")
          .select(
            "user_id, display_name, avatar_url, city, active_listings_count, sales_count, total_views, avg_rating, reviews_count, response_rate, account_age_days, badge, rank_global, top_score"
          )
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("listings")
          .select(
            "id, title, price, currency, location, images, is_premium, is_urgent, published_at, expires_at, created_at"
          )
          .eq("user_id", userId)
          .eq("is_active", true)
          .eq("moderation_status", "approved")
          .order("is_premium", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(48),
        supabase
          .from("seller_reviews")
          .select("id, reviewer_id, rating, comment, created_at")
          .eq("seller_id", userId)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (!active) return;

      if (!s) {
        // Fallback to profiles table if no stats row yet
        const { data: p } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, city, created_at")
          .eq("id", userId)
          .maybeSingle();
        if (!p) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setSeller({
          user_id: p.id,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          city: p.city,
          active_listings_count: ls?.length ?? 0,
          sales_count: 0,
          total_views: 0,
          avg_rating: 0,
          reviews_count: 0,
          response_rate: 0,
          account_age_days: Math.floor(
            (Date.now() - new Date(p.created_at).getTime()) / 86400000
          ),
          badge: "none" as SellerBadgeKind,
          rank_global: null,
          top_score: 0,
        });
      } else {
        setSeller(s as Seller);
      }

      setListings((ls ?? []) as ListingCardData[]);

      // Fetch reviewer profiles in a second batch
      const reviewerIds = Array.from(new Set((rv ?? []).map((r) => r.reviewer_id)));
      let reviewersMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (reviewerIds.length) {
        const { data: rprofiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", reviewerIds);
        reviewersMap = Object.fromEntries(
          (rprofiles ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }])
        );
      }
      setReviews(
        (rv ?? []).map((r) => ({
          ...r,
          reviewer_name: reviewersMap[r.reviewer_id]?.display_name ?? "Utilisateur",
          reviewer_avatar: reviewersMap[r.reviewer_id]?.avatar_url ?? null,
        }))
      );

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !seller) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-3">Vendeur introuvable</h1>
          <p className="text-muted-foreground mb-6">Ce profil n'existe pas ou n'est plus disponible.</p>
          <Button asChild variant="gold">
            <Link to="/top-vendeurs"><ArrowLeft className="w-4 h-4 mr-1" /> Retour au classement</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const initials = (seller.display_name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/top-vendeurs"><ArrowLeft className="w-4 h-4 mr-1" /> Retour au classement</Link>
        </Button>

        {/* Hero */}
        <Card className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 ring-2 ring-primary/30">
              <AvatarImage src={seller.avatar_url ?? undefined} alt={seller.display_name ?? "Vendeur"} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold">{seller.display_name ?? "Vendeur"}</h1>
                <SellerBadge badge={seller.badge} size="sm" />
                {seller.rank_global && (
                  <Badge variant="secondary" className="text-xs">
                    🏆 #{seller.rank_global} au classement
                  </Badge>
                )}
              </div>

              {seller.city && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {seller.city}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-primary text-primary" />
                  <span className="font-semibold">{Number(seller.avg_rating).toFixed(1)}</span>
                  <span className="text-muted-foreground">({seller.reviews_count} avis)</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-4 h-4" /> Membre depuis {seller.account_age_days} j
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                <Stat icon={<ShoppingBag className="w-4 h-4" />} label="Annonces" value={seller.active_listings_count} />
                <Stat icon={<Eye className="w-4 h-4" />} label="Vues totales" value={seller.total_views} />
                <Stat icon={<Star className="w-4 h-4" />} label="Ventes" value={seller.sales_count} />
                <Stat icon={<MessageCircle className="w-4 h-4" />} label="Taux réponse" value={`${Math.round(Number(seller.response_rate) * 100)}%`} />
              </div>
            </div>
          </div>
        </Card>

        {/* Listings */}
        <section>
          <h2 className="text-xl font-bold mb-4">Annonces de ce vendeur ({listings.length})</h2>
          {listings.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Ce vendeur n'a pas d'annonces actives pour le moment.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-xl font-bold mb-4">Avis ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Aucun avis pour ce vendeur pour le moment.
            </Card>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={r.reviewer_avatar ?? undefined} />
                      <AvatarFallback>{(r.reviewer_name ?? "?")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{r.reviewer_name}</div>
                        <div className="flex items-center gap-1 text-sm">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                      {r.comment && <p className="text-sm">{r.comment}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">{icon} {label}</div>
      <div className="font-bold text-lg">{value}</div>
    </div>
  );
}
