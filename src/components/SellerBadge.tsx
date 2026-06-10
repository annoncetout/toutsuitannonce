import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SellerBadgeKind = "gold" | "silver" | "bronze" | "none";

const META: Record<Exclude<SellerBadgeKind, "none">, { label: string; classes: string; Icon: typeof Trophy }> = {
  gold: { label: "Top Vendeur Or", classes: "bg-gradient-to-r from-amber-400 to-yellow-600 text-black border-amber-300", Icon: Trophy },
  silver: { label: "Top Vendeur Argent", classes: "bg-gradient-to-r from-zinc-200 to-zinc-400 text-black border-zinc-300", Icon: Medal },
  bronze: { label: "Top Vendeur Bronze", classes: "bg-gradient-to-r from-amber-700 to-amber-900 text-white border-amber-600", Icon: Award },
};

export const SellerBadge = ({
  badge,
  rank,
  size = "sm",
  className,
}: {
  badge: SellerBadgeKind;
  rank?: number | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}) => {
  if (!badge || badge === "none") return null;
  const meta = META[badge];
  const sizes = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1 [&_svg]:size-3",
    sm: "text-xs px-2 py-1 gap-1.5 [&_svg]:size-3.5",
    md: "text-sm px-3 py-1.5 gap-2 [&_svg]:size-4",
  } as const;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center rounded-full border font-bold shadow-sm",
              meta.classes,
              sizes[size],
              className,
            )}
            aria-label={meta.label}
          >
            <meta.Icon />
            {meta.label}
            {rank ? <span className="opacity-80">#{rank}</span> : null}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Top Vendeur IA — score calculé sur ventes, avis, réactivité, vues, ancienneté et qualité des annonces.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SellerBadge;
