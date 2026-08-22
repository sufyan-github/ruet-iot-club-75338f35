import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Cpu } from "lucide-react";
import { cloudflareData } from "@/integrations/cloudflare/client";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface HeroSlide {
  id: string;
  src: string | null;
  label: string;
  description: string;
  alt: string;
}

const managedMediaUrl = (key: unknown): string | null => typeof key === "string" && key
  ? `/api/v1/media/files/${key}`
  : null;

const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const slideCount = Math.max(slides.length, 1);

  useEffect(() => {
    const fetchSlides = async () => {
      const { data } = await cloudflareData
        .from("hero_slides")
        .select("*")
        .order("sort_order", { ascending: true });
      const nextSlides = Array.isArray(data) ? data.map((slide: Record<string, unknown>): HeroSlide => {
        const label = typeof slide.title === "string" ? slide.title : typeof slide.tagline === "string" ? slide.tagline : "";
        const description = typeof slide.description === "string" ? slide.description : "";
        const storedUrl = typeof slide.image_url === "string" && slide.image_url ? slide.image_url : managedMediaUrl(slide.image_key);
        return {
          id: typeof slide.id === "string" ? slide.id : crypto.randomUUID(),
          src: storedUrl ? getOptimizedImageUrl(storedUrl, { width: 960, height: 600 }) : null,
          label,
          description,
          alt: typeof slide.image_alt === "string" && slide.image_alt.trim() ? slide.image_alt.trim() : label || "RUET IoT Club innovation activity",
        };
      }) : [];
      setSlides(nextSlides);
      setFailedImages(new Set());
    };
    void fetchSlides();

    const channel = cloudflareData
      .channel("hero_slides_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "hero_slides" }, () => void fetchSlides())
      .subscribe();

    return () => { cloudflareData.removeChannel(channel); };
  }, []);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((previous) => (previous + 1) % slideCount);
  }, [slideCount]);

  const previous = useCallback(() => {
    setDirection(-1);
    setCurrent((currentIndex) => (currentIndex - 1 + slideCount) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(next, 4_000);
    return () => window.clearInterval(timer);
  }, [next, slides.length]);

  useEffect(() => {
    setCurrent(0);
  }, [slides.length]);

  const variants = {
    enter: (value: number) => ({ x: value > 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (value: number) => ({ x: value > 0 ? -300 : 300, opacity: 0, scale: 0.95 }),
  };

  const fallbackSlide: HeroSlide = {
    id: "managed-hero-fallback",
    src: null,
    label: "Build. Connect. Innovate.",
    description: "RUET IoT Club brings students together around connected systems, embedded engineering, and responsible innovation.",
    alt: "",
  };
  const displaySlides = slides.length > 0 ? slides : [fallbackSlide];
  const safeIndex = current >= displaySlides.length ? 0 : current;
  const slide = displaySlides[safeIndex] ?? fallbackSlide;
  const showImage = Boolean(slide.src) && !failedImages.has(slide.id);

  return (
    <div className="relative mx-auto w-full max-w-2xl transition-transform duration-300 hover:-translate-y-1">
      <div className="absolute -inset-5 rounded-[1.75rem] bg-gradient-to-br from-primary/20 via-technology-blue/10 to-primary/5 blur-2xl" />
      <div className="absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-primary/55 via-technology-blue/15 to-accent/35" />

      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.3rem] bg-card shadow-2xl shadow-primary/15 sm:aspect-[16/10]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {showImage ? (
              <img
                src={slide.src!}
                alt={slide.alt}
                className="h-full w-full object-cover"
                width={960}
                height={600}
                loading="lazy"
                onError={() => setFailedImages((currentFailures) => new Set(currentFailures).add(slide.id))}
              />
            ) : (
              <div className="circuit-pattern flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-card via-background to-technology-blue/[0.12] px-8 text-center">
                <span className="rounded-2xl border border-primary/20 bg-primary/[0.08] p-4 text-primary shadow-[0_0_45px_-18px_hsl(var(--primary))]"><Cpu size={34} /></span>
                <p className="mt-5 font-display text-lg font-semibold text-foreground">{slide.label || "RUET IoT Club"}</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{slide.description || "A published Hero image has not been configured yet."}</p>
              </div>
            )}
            {showImage && <>
              <div className="absolute inset-0 bg-gradient-to-tr from-background/20 via-transparent to-technology-blue/10" />
              <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background via-background/65 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                {slide.label && <span className="font-display text-sm font-semibold tracking-wide text-foreground">{slide.label}</span>}
                {slide.description && <p className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">{slide.description}</p>}
              </div>
            </>}
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && <>
          <button type="button" onClick={previous} aria-label="Previous slide" className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/60 p-1.5 text-foreground backdrop-blur-sm transition-colors hover:bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/40"><ChevronLeft size={18} /></button>
          <button type="button" onClick={next} aria-label="Next slide" className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/60 p-1.5 text-foreground backdrop-blur-sm transition-colors hover:bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/40"><ChevronRight size={18} /></button>
        </>}
      </div>

      {slides.length > 1 && <div className="mt-4 flex justify-center gap-2">
        {slides.map((item, index) => (
          <button key={item.id} type="button" onClick={() => { setDirection(index > current ? 1 : -1); setCurrent(index); }} aria-label={`Go to slide ${index + 1}${item.label ? `: ${item.label}` : ""}`} className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 ${index === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`} />
        ))}
      </div>}
    </div>
  );
};

export default HeroCarousel;
