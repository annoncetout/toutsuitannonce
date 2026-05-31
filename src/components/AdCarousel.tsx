import { useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence, type TargetAndTransition, type Transition } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type Ad = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  discount: number | null;
  button_text: string | null;
  redirect_url: string | null;
  theme_color: string | null;
  animation_type: string;
};

const IMPRESSION_KEY = "ad_impressions_v1";

function shouldTrackImpression(id: string) {
  try {
    const raw = sessionStorage.getItem(IMPRESSION_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(id)) return false;
    seen.push(id);
    sessionStorage.setItem(IMPRESSION_KEY, JSON.stringify(seen));
    return true;
  } catch {
    return true;
  }
}

const ANIM_VARIANTS: Record<string, { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition }> = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } },
  slide: { initial: { x: 60, opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { duration: 0.6, ease: "easeOut" } },
  zoom: { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.6 } },
  glow: { initial: { opacity: 0, filter: "brightness(0.4)" }, animate: { opacity: 1, filter: "brightness(1)" }, transition: { duration: 0.8 } },
};

const AdCarousel = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const autoplay = useRef(Autoplay({ delay: 5500, stopOnInteraction: false, stopOnMouseEnter: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [autoplay.current]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("advertisements")
        .select("id,title,subtitle,description,image_url,discount,button_text,redirect_url,theme_color,animation_type")
        .eq("is_active", true)
        .lte("start_date", nowIso)
        .gte("end_date", nowIso)
        .order("position", { ascending: true })
        .limit(12);
      if (cancel) return;
      if (!error && data) setAds(data as Ad[]);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  // Track impression for current ad
  useEffect(() => {
    const ad = ads[selectedIndex];
    if (!ad) return;
    if (!shouldTrackImpression(ad.id)) return;
    supabase.rpc("increment_ad_metric", { _ad_id: ad.id, _metric: "impression" });
  }, [ads, selectedIndex]);

  const handleClick = async (ad: Ad) => {
    supabase.rpc("increment_ad_metric", { _ad_id: ad.id, _metric: "click" });
    if (ad.redirect_url) {
      if (/^https?:\/\//i.test(ad.redirect_url)) {
        window.open(ad.redirect_url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = ad.redirect_url;
      }
    }
  };

  const dots = useMemo(() => ads.map((_, i) => i), [ads]);

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="h-64 md:h-80 rounded-3xl bg-card/40 border border-border/60 animate-pulse" />
      </section>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  return (
    <section id="publicites" className="container mx-auto px-4 py-10 md:py-16">
      <div className="flex items-end justify-between mb-6 md:mb-8">
        <div>
          <div className="text-[10px] tracking-[0.3em] text-primary font-semibold uppercase mb-2 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Offres du moment
          </div>
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold">Promotions & nouveautés</h2>
        </div>
        {ads.length > 1 && (
          <div className="hidden md:flex items-center gap-1.5">
            {dots.map((i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Aller à la publicité ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === selectedIndex ? "w-8 bg-primary" : "w-3 bg-border hover:bg-primary/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
        <div className="flex">
          {ads.map((ad) => {
            const anim = ANIM_VARIANTS[ad.animation_type] || ANIM_VARIANTS.fade;
            const accent = ad.theme_color || "#d4af37";
            return (
              <div key={ad.id} className="relative flex-[0_0_100%] min-w-0 px-1">
                <AnimatePresence mode="wait">
                  <motion.article
                    key={ad.id + selectedIndex}
                    initial={anim.initial}
                    animate={anim.animate}
                    transition={anim.transition}
                    className="group relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-background via-card to-background min-h-[280px] md:min-h-[360px]"
                    style={{ boxShadow: `0 30px 80px -40px ${accent}55` }}
                  >
                    {/* Background image */}
                    {ad.image_url && (
                      <img
                        src={ad.image_url}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-[1200ms]"
                      />
                    )}
                    {/* Gradients & glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30 md:to-transparent" />
                    <div
                      className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
                    />

                    {/* Discount badge */}
                    {typeof ad.discount === "number" && ad.discount > 0 && (
                      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
                        <div
                          className="relative px-4 py-2 rounded-2xl font-display font-bold text-background text-lg md:text-xl shadow-2xl animate-pulse"
                          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                        >
                          -{ad.discount}%
                          <span className="absolute inset-0 rounded-2xl ring-2 ring-primary/60 animate-ping" />
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="relative z-[5] p-6 md:p-10 lg:p-14 max-w-2xl flex flex-col justify-center h-full min-h-[280px] md:min-h-[360px]">
                      {ad.subtitle && (
                        <div className="text-[10px] md:text-xs tracking-[0.3em] font-semibold uppercase mb-3" style={{ color: accent }}>
                          {ad.subtitle}
                        </div>
                      )}
                      <h3 className="font-display text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3">
                        {ad.title}
                      </h3>
                      {ad.description && (
                        <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-xl">
                          {ad.description}
                        </p>
                      )}
                      {(ad.button_text || ad.redirect_url) && (
                        <div>
                          <button
                            onClick={() => handleClick(ad)}
                            className="group/btn inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-background transition-all duration-300 hover:scale-105 hover:shadow-gold"
                            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}
                          >
                            {ad.button_text || "Découvrir"}
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.article>
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile dots */}
      {ads.length > 1 && (
        <div className="flex md:hidden justify-center items-center gap-1.5 mt-4">
          {dots.map((i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Aller à la publicité ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === selectedIndex ? "w-6 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default AdCarousel;
