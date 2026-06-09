import { Infinity } from "lucide-react";

const Logo = () => (
  <a
    href="/"
    aria-label="TOUT SUITE Annonces — Accueil"
    className="flex items-center gap-2 group animate-fade-in"
  >
    <div className="flex items-center gap-2">
      <span className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
        TOUT
      </span>
      <Infinity
        className="w-9 h-9 md:w-11 md:h-11 text-primary drop-shadow-[0_0_10px_hsl(43_74%_56%/0.65)] transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-[8deg] animate-glow-pulse"
        strokeWidth={2.5}
      />
      <span className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
        SUITE
      </span>
    </div>
    <span className="hidden sm:block text-[11px] tracking-[0.35em] text-primary/80 font-semibold ml-1 mt-1.5 transition-opacity duration-300 group-hover:text-primary">
      ANNONCES
    </span>
  </a>
);

export default Logo;
