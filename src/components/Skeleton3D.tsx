export const ListingCardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-card border border-border/50">
    <div className="aspect-[4/3] skeleton-3d rounded-none" />
    <div className="p-4 space-y-2">
      <div className="h-4 w-3/4 skeleton-3d" />
      <div className="h-3 w-1/2 skeleton-3d" />
      <div className="h-5 w-1/3 skeleton-3d mt-2" />
    </div>
  </div>
);

export const ListingsGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <ListingCardSkeleton key={i} />
    ))}
  </div>
);

export const EmptyState3D = ({
  title = "Aucun résultat",
  message = "Aucune annonce ne correspond pour le moment.",
  icon,
}: {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}) => (
  <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/40 to-card p-10 text-center overflow-hidden">
    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[220px] rounded-full bg-primary/15 blur-3xl animate-orb-drift" />
    <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-gold shadow-gold flex items-center justify-center mb-4 animate-float">
      {icon ?? <span className="text-2xl">✦</span>}
    </div>
    <h3 className="relative font-display text-xl font-bold text-gradient-gold">{title}</h3>
    <p className="relative text-sm text-muted-foreground mt-2 max-w-md mx-auto">{message}</p>
  </div>
);

export default ListingCardSkeleton;
