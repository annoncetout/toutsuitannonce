import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";

const StickySearchBar = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(false);
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y > 320);
      setCondensed(y > 480);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onSearch = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    trackEvent("search", { search_term: q.trim(), source: "sticky" });
    navigate(`/annonces?${params.toString()}`);
  };

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 z-40 px-3 sm:px-4 transition-all duration-300 ease-out ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
      style={{ top: "calc(env(safe-area-inset-top) + 64px)" }}
    >
      <div className="container mx-auto">
        <div
          className={`bg-background/85 backdrop-blur-xl border border-primary/25 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300 ${
            condensed ? "p-1.5 sm:p-2" : "p-2 sm:p-3"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_auto] gap-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
                placeholder="Que recherchez-vous ?"
                className={`pl-11 bg-transparent border-0 focus-visible:ring-0 text-base text-white placeholder:text-white/70 transition-all duration-300 ${
                  condensed ? "h-10 sm:h-11" : "h-12 sm:h-12"
                }`}
              />
            </div>
            <button
              onClick={() => navigate("/annonces")}
              className={`hidden md:flex items-center gap-2 px-4 rounded-lg bg-secondary/60 hover:bg-secondary text-left text-sm transition-all duration-300 ${
                condensed ? "h-10 sm:h-11" : "h-12"
              }`}
            >
              <span className="flex-1 text-muted-foreground">Toutes catégories</span>
              <span className="text-primary">▾</span>
            </button>
            <button
              onClick={() => navigate("/annonces")}
              className={`hidden md:flex items-center gap-2 px-4 rounded-lg bg-secondary/60 hover:bg-secondary text-left text-sm transition-all duration-300 ${
                condensed ? "h-10 sm:h-11" : "h-12"
              }`}
            >
              <MapPin className="w-4 h-4 text-primary" />
              <span className="flex-1 text-muted-foreground">Toutes les localités</span>
            </button>
            <Button
              variant="gold"
              onClick={onSearch}
              className={`px-5 sm:px-7 transition-all duration-300 ${condensed ? "h-10 sm:h-11" : "h-12"}`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Rechercher</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickySearchBar;
