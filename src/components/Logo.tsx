import { Infinity } from "lucide-react";

const Logo = () => (
  <a
    href="/"
    aria-label="TOUT SUITE Annonces — Accueil"
    className="flex items-center gap-1.5 sm:gap-2 group animate-fade-in min-w-0 max-w-full"
  >
    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
      <span className="font-display text-lg sm:text-2xl md:text-4xl font-extrabold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary whitespace-nowrap">
        TOUT
      </span>
      <Infinity
        className="shrink-0 w-5 h-5 sm:w-7 sm:h-7 md:w-11 md:h-11 text-primary drop-shadow-[0_0_10px_hsl(43_74%_56%/0.65)] transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-[8deg] animate-glow-pulse"
        strokeWidth={2.5}
      />
      <span className="font-display text-lg sm:text-2xl md:text-4xl font-extrabold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary whitespace-nowrap">
        SUITE
      </span>
    </div>
    <span className="hidden md:block text-[11px] tracking-[0.35em] text-primary/80 font-semibold ml-6 mt-1.5 transition-opacity duration-300 group-hover:text-primary whitespace-nowrap">
      ANNONCES
    </span>
  </a>
);

export default Logo;
