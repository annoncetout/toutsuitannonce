import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, ShoppingCart, Shield, Sparkles, User, X } from "lucide-react";
import Logo from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCloudflareAuth } from "@/hooks/useCloudflareAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useCart } from "@/hooks/useCart";
import { useAuthPrompt } from "@/components/AuthPromptDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NotificationsBell from "./NotificationsBell";

const navItems = [
  { label: "Accueil", to: "/" },
  { label: "Annonces", to: "/annonces" },
  { label: "Premium", to: "/annonces?sort=premium", accent: true },
  { label: "Tout Colis", to: "/tout-colis" },
  { label: "Tarifs", to: "/tarifs" },
  { label: "Contact", to: "/#contact" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user: supaUser, signOut } = useAuth();
  const cfAuth = useCloudflareAuth();
  const { isAdmin } = useAdmin();
  const { count } = useCart();
  const { requireAuth } = useAuthPrompt();

  // L'utilisateur est connecté via Cloudflare (Google) ou via le compte existant.
  const cfUser = cfAuth.user;
  const user = cfUser ?? supaUser;
  const displayName =
    cfUser?.full_name || cfUser?.given_name || cfUser?.email || (supaUser as { email?: string } | null)?.email || "";
  const avatarUrl = cfUser?.avatar_url ?? null;
  const isAdminUser = isAdmin || cfUser?.role === "admin";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (to: string) => {
    const [path, query] = to.split("?");
    if (query) return location.pathname + location.search === to;
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const goPublish = () => {
    if (cfAuth.available && !cfUser) {
      navigate("/connexion?redirect=%2Fpublier");
      return;
    }
    if (!requireAuth({ title: "Publier une annonce", message: "Connectez-vous pour publier votre annonce gratuitement." })) return;
    navigate("/publier");
  };

  const handleSignOut = async () => {
    await cfAuth.signOut();
    await signOut();
    navigate("/");
  };



  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "bg-background/70 backdrop-blur-2xl border-b border-primary/25 shadow-[0_10px_40px_-12px_hsl(43_74%_20%/0.6)]"
          : "bg-background/40 backdrop-blur-xl border-b border-primary/10"
      }`}
    >
      {/* Top shimmer accent bar */}
      <div className="relative h-[2px] w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(45 95% 65% / 0.9) 20%, hsl(42 78% 58%) 50%, hsl(45 95% 65% / 0.9) 80%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 6s linear infinite",
          }}
        />
      </div>

      {/* Ambient glow layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 w-[420px] h-[220px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-16 right-10 w-[300px] h-[180px] rounded-full bg-primary-glow/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto flex items-center justify-between gap-4 py-3 md:py-4 px-4">
        {/* Logo with 3D lift */}
        <div className="relative group [perspective:800px]">
          <div className="absolute -inset-3 rounded-2xl bg-gradient-radial-gold opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
          <div className="relative transition-transform duration-500 group-hover:[transform:rotateX(8deg)_rotateY(-6deg)_translateZ(10px)]">
            <Logo />
          </div>
        </div>

        {/* Nav with 3D pill hover */}
        <nav className="hidden lg:flex items-center gap-1 rounded-full border border-primary/15 bg-card/40 backdrop-blur-md px-2 py-1.5 shadow-[inset_0_1px_0_hsl(45_95%_65%/0.12),0_8px_30px_-15px_hsl(0_0%_0%/0.8)]">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`relative group px-4 py-2 rounded-full text-[13px] font-medium tracking-wide transition-all duration-300 ${
                  active
                    ? "text-primary-foreground"
                    : "text-foreground/80 hover:text-primary"
                }`}
              >
                {active && (
                  <span
                    className="absolute inset-0 rounded-full bg-gradient-gold shadow-gold"
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {item.accent && <Sparkles className="w-3.5 h-3.5" />}
                  {item.label}
                </span>
                {!active && (
                  <span className="absolute left-1/2 -bottom-0.5 h-[2px] w-0 -translate-x-1/2 rounded-full bg-gradient-gold transition-all duration-300 group-hover:w-2/3" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2.5">
          {user && <NotificationsBell />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outlineGold"
                  className="rounded-full gap-2 pl-1.5 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-gold"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName ? `Photo de profil de ${displayName}` : "Photo de profil"}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-primary/40"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="max-w-[140px] truncate">{displayName || "Mon compte"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-primary/30 bg-card/95 backdrop-blur-xl">
                <DropdownMenuItem onClick={() => navigate("/profil")}>
                  <User className="w-4 h-4 mr-2" /> Mon compte
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Mes annonces
                </DropdownMenuItem>
                {isAdminUser && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="w-4 h-4 mr-2" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate("/connexion")}
                className="rounded-full transition-transform duration-300 hover:-translate-y-0.5"
              >
                Connexion
              </Button>
              <Button
                variant="outlineGold"
                onClick={() => navigate("/inscription")}
                className="rounded-full transition-transform duration-300 hover:-translate-y-0.5"
              >
                <User className="w-4 h-4" />
                Inscription
              </Button>
            </>
          )}
          <Button
            variant="gold"
            onClick={() => navigate("/panier")}
            className="relative rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-gold-lg"
          >
            Panier
            <ShoppingCart className="w-4 h-4" />
            {count > 0 && (
              <span
                key={count}
                aria-label={`${count} article(s) dans le panier`}
                className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center animate-in zoom-in ring-2 ring-background"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
        </div>

        <button
          aria-label="Menu"
          onClick={() => setOpen(!open)}
          className="lg:hidden relative text-foreground p-2 rounded-full border border-primary/20 bg-card/40 backdrop-blur-md transition-transform duration-300 active:scale-90"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-primary/15 bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="container mx-auto py-4 flex flex-col gap-1 px-4">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 text-sm font-medium py-3 px-3 rounded-xl transition-colors ${
                    active
                      ? "bg-gradient-gold text-primary-foreground shadow-gold"
                      : "text-foreground/85 hover:bg-card/60"
                  }`}
                >
                  {item.accent && <Sparkles className="w-4 h-4" />}
                  {item.label}
                </Link>
              );
            })}
            <div className="flex flex-col gap-2 pt-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName ? `Photo de profil de ${displayName}` : "Photo de profil"}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-primary/40"
                      />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                    <span className="text-sm font-medium truncate">{displayName}</span>
                  </div>
                  <Button variant="outlineGold" onClick={() => { navigate("/profil"); setOpen(false); }}>Mon compte</Button>
                  <Button variant="outlineGold" onClick={() => { navigate("/dashboard"); setOpen(false); }}>Mes annonces</Button>
                  <Button variant="gold" onClick={() => { navigate("/publier"); setOpen(false); }}>Publier une annonce</Button>
                  <Button variant="ghost" onClick={handleSignOut}>Déconnexion</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => { navigate("/connexion"); setOpen(false); }}>Connexion</Button>
                  <Button variant="outlineGold" onClick={() => { navigate("/inscription"); setOpen(false); }}>Inscription</Button>
                  <Button variant="gold" onClick={() => { setOpen(false); goPublish(); }}>Publier une annonce</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
