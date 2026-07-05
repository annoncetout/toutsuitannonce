import logoAsset from "@/assets/logo-tout-de-suite.png.asset.json";

const Logo = () => (
  <a
    href="/"
    aria-label="TOUT DE SUITE Annonces — Accueil"
    className="flex items-center group animate-fade-in min-w-0 max-w-full"
  >
    <img
      src={logoAsset.url}
      alt="TOUT DE SUITE ANNONCES"
      className="h-10 sm:h-12 md:h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
    />
  </a>
);

export default Logo;
