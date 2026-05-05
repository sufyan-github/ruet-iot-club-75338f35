import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import activity1 from "@/assets/activity-1.jpg";
import activity2 from "@/assets/activity-2.jpg";
import activity3 from "@/assets/activity-3.jpg";
import activity4 from "@/assets/activity-4.jpg";

const fallbackSlides = [
  { src: activity1, label: "Hands-on IoT Lab" },
  { src: activity2, label: "Workshop Sessions" },
  { src: activity3, label: "Hackathon Events" },
  { src: activity4, label: "Research & Development" },
];

const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [slides, setSlides] = useState<{ src: string; label: string }[]>(fallbackSlides);

  useEffect(() => {
    const fetchSlides = async () => {
      const { data } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) {
        setSlides(data.map((s: any) => ({
          src: getOptimizedImageUrl(s.image_url, { width: 600, height: 600 }),
          label: s.tagline || "",
        })));
      }
    };
    fetchSlides();

    // Realtime updates
    const channel = supabase
      .channel("hero_slides_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "hero_slides" }, () => {
        fetchSlides();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  // Reset current if slides change
  useEffect(() => {
    setCurrent(0);
  }, [slides.length]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0, scale: 0.95 }),
  };

  if (slides.length === 0) return null;
  const safeIndex = current >= slides.length ? 0 : current;
  const slide = slides[safeIndex];
  if (!slide) return null;

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 blur-sm" />
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-primary/40 via-transparent to-accent/30" />
      
      <div className="relative rounded-2xl overflow-hidden bg-card aspect-square">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={safeIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <img
              src={slide.src}
              alt={slide.label}
              className="w-full h-full object-cover"
              width={512}
              height={512}
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="text-sm font-display font-semibold text-foreground tracking-wider">
                {slide.label}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        <button onClick={prev} aria-label="Previous slide"
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-colors z-10">
          <ChevronLeft size={18} />
        </button>
        <button onClick={next} aria-label="Next slide"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-colors z-10">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {slides.map((_, i) => (
          <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
            aria-label={`Go to slide ${i + 1}: ${slides[i].label}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === current ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
