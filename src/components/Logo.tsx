const Logo = () => (
  <a
    href="/"
    aria-label="TOUT DE SUITE ANNONCES — Accueil"
    title="TOUT DE SUITE ANNONCES"
    className="flex items-center group animate-fade-in min-w-0 max-w-full shrink-0"
  >
    <img
      src="/logo.png"
      alt="TOUT DE SUITE ANNONCES — Petites annonces au Sénégal"
      width={320}
      height={80}
      className="h-9 sm:h-11 md:h-14 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
      loading="eager"
      decoding="async"
    />
  </a>
);

export default Logo;
