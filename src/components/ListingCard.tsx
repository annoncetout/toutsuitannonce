import { useNavigate } from "react-router-dom";
import { Flag, Heart } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthPrompt } from "@/components/AuthPromptDialog";
import { useFavorites } from "@/hooks/useFavorites";
import ReportListingDialog from "@/components/ReportListingDialog";
import { formatPublished, getExpiry, isNew } from "@/lib/listingDate";
import ListingBadges from "@/components/ListingBadges";
import { listingPath } from "@/lib/slug";

export interface ListingCardData {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  location: string | null;
  images: string[];
  is_premium: boolean;
  is_urgent?: boolean | null;
  seller_verified?: boolean | null;
  seller_pro?: boolean | null;
  published_at?: string | null;
  expires_at?: string | null;
}

const ListingCard = ({ listing }: { listing: ListingCardData }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requireAuth } = useAuthPrompt();
  const { isFavorite, toggle } = useFavorites();
  const isFav = isFavorite(listing.id);
  const [reportOpen, setReportOpen] = useState(false);

  const toggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggle(listing.id);
  };

  const price = listing.price
    ? `${Number(listing.price).toLocaleString("fr-FR")} ${listing.currency}`
    : "À discuter";

  return (
    <div className="card-3d-wrap">
    <article
      onClick={() => {
        import("@/lib/analytics").then(({ trackEvent }) =>
          trackEvent("listing_click", {
            listing_id: listing.id,
            is_premium: !!listing.is_premium,
            is_urgent: !!listing.is_urgent,
          }),
        );
        navigate(listingPath(listing.title, listing.id));
      }}
      className={`card-3d group relative rounded-2xl overflow-hidden bg-card border cursor-pointer ${
        listing.is_premium
          ? "border-primary/40 shadow-[0_0_0_1px_hsl(43_74%_56%/0.25),0_20px_50px_-20px_hsl(43_74%_56%/0.4)]"
          : "border-border/50 hover:border-primary/50"
      }`}
    >
      {listing.is_premium && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(600px circle at 50% -20%, hsl(45 95% 65% / 0.18), transparent 60%)",
          }}
        />
      )}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={`${listing.title}${listing.location ? ` — ${listing.location}` : ""}`}
            loading="lazy"
            decoding="async"
            width={400}
            height={300}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Pas de photo</div>
        )}
        <div className="absolute top-3 left-3 max-w-[calc(100%-6rem)]">
          <ListingBadges listing={listing} />
          {!listing.is_premium && !listing.is_urgent && isNew(listing.published_at) && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded inline-block">
              NOUVEAU
            </span>
          )}
        </div>
        {(() => {
          const exp = getExpiry(listing.expires_at);
          if (exp.status === "expired")
            return <span className="absolute bottom-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold tracking-widest px-2.5 py-1 rounded">EXPIRÉE</span>;
          if (exp.status === "imminent")
            return <span className="absolute bottom-3 left-3 bg-amber-500 text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded">EXPIRE BIENTÔT</span>;
          return null;
        })()}
        <button
          aria-label="Favoris"
          onClick={toggleFav}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center border border-border hover:bg-primary/20"
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-primary text-primary" : "text-foreground"}`} />
        </button>
        <button
          aria-label="Signaler"
          onClick={(e) => { e.stopPropagation(); if (!requireAuth({ title: "Signaler une annonce", message: "Connectez-vous pour signaler cette annonce." })) return; setReportOpen(true); }}
          className="absolute top-3 right-14 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center border border-border hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-semibold text-foreground line-clamp-1">{listing.title}</h3>
        {listing.location && <p className="text-xs text-muted-foreground">{listing.location}</p>}
        {listing.published_at && (
          <p className="text-[11px] text-muted-foreground/80">{formatPublished(listing.published_at)}</p>
        )}
        <p className="pt-2 font-bold text-primary text-lg">{price}</p>
      </div>
      <ReportListingDialog listingId={listing.id} open={reportOpen} onOpenChange={setReportOpen} />
    </article>
    </div>
  );
};

export default ListingCard;
