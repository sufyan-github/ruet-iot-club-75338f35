/**
 * Hero section — RUET IoT Club.
 *
 * Requirements:
 * - ONE title and ONE robot sequence using TitleStage.
 * - TitleStage lives in the hero at its FINAL location from the start.
 * - During the intro, TitleStage has translateY(stageY) and moves up smoothly to 0.
 * - When stage is about 60% of the way up (heroRevealStarted is true), surrounding hero elements
 *   (university label, motto, subtitle, Join Us, scroll indicator) stagger in ~0.25s apart,
 *   rising 16px with a fade (ease-out, 0.7s each).
 * - Background layers fade in over 1.5s.
 * - Animate only transform and opacity. Respects reduced motion.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, Cpu } from "lucide-react";
import TitleStage from "@/components/home/TitleStage";
import InteractiveHeroBackground from "@/components/home/InteractiveHeroBackground";
import { useIntro } from "@/contexts/IntroContext";
import logo from "@/assets/iot_club_logo.png";
import { useTransparentLogo } from "@/hooks/useTransparentLogo";
import {
  HERO_STAGGER_INTERVAL,
  EASE_OUT,
  BACKGROUND_FADE_DURATION,
  SPRING_GENTLE,
} from "@/lib/motion";
import { useDesktopNavOpen } from "@/components/Navbar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  fetchHeroBannerConfig,
  getCachedHeroBanner,
  type HeroBannerConfig,
} from "@/lib/heroBannerService";
import { supabase } from "@/integrations/supabase/client";

// ─── Motto Characters for Typewriter Reveal ──────────────────────────────────
const mottoItems = [
  // LEARN
  { char: "L", color: "#ffffff" },
  { char: "E", color: "#ffffff" },
  { char: "A", color: "#ffffff" },
  { char: "R", color: "#ffffff" },
  { char: "N", color: "#ffffff" },
  // space (word-spacing: 0.6em)
  { isSpace: true },
  // IoT
  { char: "I", color: "#2de2c9" },
  { char: "o", color: "#2de2c9" },
  { char: "T", color: "#2de2c9" },
  // dot separator with margin
  { isDot: true },
  // SHAPE
  { char: "S", color: "#ffffff" },
  { char: "H", color: "#ffffff" },
  { char: "A", color: "#ffffff" },
  { char: "P", color: "#ffffff" },
  { char: "E", color: "#ffffff" },
  // space
  { isSpace: true },
  // TECHNOLOGY
  { char: "T", color: "#3b9bff" },
  { char: "E", color: "#3b9bff" },
  { char: "C", color: "#3b9bff" },
  { char: "H", color: "#3b9bff" },
  { char: "N", color: "#3b9bff" },
  { char: "O", color: "#3b9bff" },
  { char: "L", color: "#3b9bff" },
  { char: "O", color: "#3b9bff" },
  { char: "G", color: "#3b9bff" },
  { char: "Y", color: "#3b9bff" },
];

const charVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// Helper to check if a link is external
const isExternalLink = (url?: string) => {
  return url ? url.startsWith("http://") || url.startsWith("https://") : false;
};

// ─── Main Hero Component ─────────────────────────────────────────────────────
const Hero = () => {
  const { phase, heroRevealStarted, isLowEnd } = useIntro();
  const reduced = useReducedMotion() || isLowEnd;
  const cleanLogo = useTransparentLogo(logo);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isDesktopNavOpen = useDesktopNavOpen();

  // Dynamic Hero Banner & CTA configuration state
  const [bannerConfig, setBannerConfig] = useState<HeroBannerConfig>(getCachedHeroBanner);

  useEffect(() => {
    // 1. Fetch remote config from Supabase
    fetchHeroBannerConfig().then((cfg) => {
      setBannerConfig(cfg);
    });

    // 2. Realtime listener for hero banner changes
    const channel = supabase
      .channel("hero_banner_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: "title=eq.HERO_BANNER_CONFIG",
        },
        (payload) => {
          if (payload.new && (payload.new as any).message) {
            try {
              const updated = JSON.parse((payload.new as any).message);
              setBannerConfig((prev) => ({ ...prev, ...updated }));
            } catch (err) {
              console.error("Failed to parse realtime banner config", err);
            }
          }
        }
      )
      .subscribe();

    // 3. Storage event for cross-tab or same-window sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ruet_iot_hero_banner_config" && e.newValue) {
        try {
          setBannerConfig(JSON.parse(e.newValue));
        } catch { /* silent */ }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Surrounding hero elements are revealed when stage is ~60% up (heroRevealStarted) or intro is done
  const isSurroundingVisible = heroRevealStarted || phase === "done";

  // Stagger delays (rising with a smooth fade on desktop, instantaneous on mobile/low-end devices)
  const isMobileOrLow = isLowEnd || !isDesktop;
  const dLogo = isMobileOrLow ? 0 : 0.00;
  const dUniversity = isMobileOrLow ? 0 : dLogo + 0.15;
  const dMotto = isMobileOrLow ? 0 : dUniversity + HERO_STAGGER_INTERVAL; // 0.40s
  const dSubtitle = isMobileOrLow ? 0 : dMotto + HERO_STAGGER_INTERVAL;   // 0.65s
  const dJoin = isMobileOrLow ? 0 : dSubtitle + HERO_STAGGER_INTERVAL;     // 0.90s
  const dScroll = isMobileOrLow ? 0 : dJoin + HERO_STAGGER_INTERVAL;       // 1.15s

  // Stagger variants: 16px rise with fade on desktop, static/instantaneous opacity on mobile
  const staggerVariant = {
    hidden: { opacity: 0, y: reduced || !isDesktop ? 0 : 16 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: isMobileOrLow ? 0.2 : reduced ? 0.8 : 0.5,
        ease: EASE_OUT,
        delay: isMobileOrLow ? 0 : delay,
      },
    }),
  };

  // Banner inner markup (High-Tech Cyber HUD Redesign with Gradient Text Color)
  const renderBannerContent = () => (
    <>
      {/* 1. Cyber HUD Corner Brackets */}
      <span className="absolute top-0 left-0 w-2 h-2 sm:w-2.5 sm:h-2.5 border-t-2 border-l-2 border-[#2de2c9] pointer-events-none rounded-tl-[3px] group-hover:border-[#00f0ff] transition-colors" />
      <span className="absolute top-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 border-t-2 border-r-2 border-[#2de2c9] pointer-events-none rounded-tr-[3px] group-hover:border-[#00f0ff] transition-colors" />
      <span className="absolute bottom-0 left-0 w-2 h-2 sm:w-2.5 sm:h-2.5 border-b-2 border-l-2 border-[#2de2c9] pointer-events-none rounded-bl-[3px] group-hover:border-[#00f0ff] transition-colors" />
      <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 border-b-2 border-r-2 border-[#2de2c9] pointer-events-none rounded-br-[3px] group-hover:border-[#00f0ff] transition-colors" />

      {/* 2. Top & Bottom Cyber Neon Scanlines */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#2de2c9] to-transparent pointer-events-none shadow-[0_0_8px_#2de2c9]" />
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d2ff]/40 to-transparent pointer-events-none" />

      {/* 3. Micro-circuit matrix texture */}
      <div
        className="absolute inset-0 opacity-[0.06] group-hover:opacity-[0.12] pointer-events-none transition-opacity"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(45,226,201,0.6) 1px, transparent 1px), linear-gradient(rgba(45,226,201,0.6) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      />

      {/* 4. Left: Live pulsing beacon + Monospace badge */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-10">
        <span className="relative flex h-2 w-2 sm:h-3 sm:w-3 shrink-0 items-center justify-center">
          <span className="hidden sm:inline-flex animate-ping absolute h-full w-full rounded-full bg-[#2de2c9] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 bg-[#2de2c9] shadow-[0_0_10px_#2de2c9]" />
        </span>

        {bannerConfig.badge && (
          <span className="font-mono text-[8px] xs:text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2.5 py-0.5 rounded sm:rounded-md bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/45 tracking-wider uppercase shrink-0 shadow-[0_0_8px_rgba(45,226,201,0.2)]">
            {bannerConfig.badge}
          </span>
        )}
      </div>

      {/* 5. Center: Full Announcement Title (Luminous Cyber Cyan/Blue Gradient Color) */}
      <div className="flex-1 min-w-0 text-left px-1.5 sm:px-3 z-10">
        <span className="font-body text-[10.5px] xs:text-[12px] sm:text-[13.5px] md:text-sm font-semibold sm:font-bold tracking-wide bg-gradient-to-r from-[#2de2c9] via-[#67e8f9] to-[#38bdf8] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(45,226,201,0.45)] group-hover:brightness-125 transition-all truncate block">
          {bannerConfig.title}
        </span>
      </div>

      {/* 6. Right: Days left pill / CTA indicator */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-10">
        {bannerConfig.daysLeft && (
          <span className="hidden sm:inline-flex items-center font-mono text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#00d2ff]/15 text-[#38bdf8] border border-[#00d2ff]/40 shadow-[0_0_10px_rgba(0,210,255,0.2)] shrink-0">
            {bannerConfig.daysLeft}
          </span>
        )}

        <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-md bg-[#2de2c9]/15 group-hover:bg-[#2de2c9]/25 text-[#2de2c9] border border-[#2de2c9]/50 shadow-[0_0_10px_rgba(45,226,201,0.2)] group-hover:border-[#2de2c9] group-hover:shadow-[0_0_16px_rgba(45,226,201,0.4)] transition-all font-mono text-[10px] sm:text-xs font-bold">
          <span className="hidden sm:inline">Details</span>
          <ArrowRight
            size={12}
            className="sm:w-3.5 sm:h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0"
          />
        </div>
      </div>
    </>
  );

  return (
    <section
      id="hero-section"
      className="relative z-20 min-h-[100svh] h-[100svh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6"
      aria-label="RUET IoT Club hero"
    >
      {/* ── Background: Fades in slowly (1.5s) once surrounding elements reveal ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isSurroundingVisible ? 1 : 0 }}
        transition={{ duration: BACKGROUND_FADE_DURATION, ease: EASE_OUT }}
      >
        <InteractiveHeroBackground />
      </motion.div>

      {/* ── Synchronized Announcement Banner (On same line as Menu Button on Mobile) ── */}
      {bannerConfig.isActive && (
        <motion.div
          initial={{
            opacity: 0,
            y: isDesktop ? (isDesktopNavOpen ? 72 : 14) : 14,
          }}
          animate={{
            opacity: isSurroundingVisible ? 1 : 0,
            y: isDesktop ? (isDesktopNavOpen ? 72 : 14) : 14,
          }}
          transition={SPRING_GENTLE}
          className="absolute top-0 left-0 right-0 z-30 flex items-center justify-start lg:justify-center pl-3.5 pr-16 sm:pl-6 sm:pr-20 lg:px-6 pointer-events-none"
        >
          <div className="w-full max-w-4xl xl:max-w-5xl pointer-events-auto">
            {isExternalLink(bannerConfig.linkUrl) ? (
              <a
                href={bannerConfig.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-full flex items-center justify-between gap-1.5 sm:gap-4 px-2 sm:px-5 py-1 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#06101c]/92 hover:bg-[#091728]/95 backdrop-blur-2xl border border-[#2de2c9]/35 hover:border-[#2de2c9]/70 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_20px_rgba(45,226,201,0.14)] hover:shadow-[0_4px_30px_rgba(0,0,0,0.8),0_0_30px_rgba(45,226,201,0.32)] transition-all duration-300 select-none overflow-hidden min-h-[34px] sm:min-h-0"
              >
                {renderBannerContent()}
              </a>
            ) : (
              <Link
                to={bannerConfig.linkUrl || "/join"}
                className="group relative w-full flex items-center justify-between gap-1.5 sm:gap-4 px-2 sm:px-5 py-1 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#06101c]/92 hover:bg-[#091728]/95 backdrop-blur-2xl border border-[#2de2c9]/35 hover:border-[#2de2c9]/70 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_20px_rgba(45,226,201,0.14)] hover:shadow-[0_4px_30px_rgba(0,0,0,0.8),0_0_30px_rgba(45,226,201,0.32)] transition-all duration-300 select-none overflow-hidden min-h-[34px] sm:min-h-0"
              >
                {renderBannerContent()}
              </Link>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Center Content Container (Precisely vertically centered in viewport) ── */}
      <motion.div
        animate={{
          y: isDesktop ? (isDesktopNavOpen ? 0 : -42) : 0,
        }}
        transition={SPRING_GENTLE}
        className="relative z-30 flex flex-col items-center text-center max-w-5xl w-full"
      >

        {/* 1. Prominent Center Club Logo Emblem */}
        <motion.div
          variants={staggerVariant}
          initial="hidden"
          animate={isSurroundingVisible ? "visible" : "hidden"}
          custom={dLogo}
          className="relative flex items-center justify-center select-none"
        >
          <div className="relative group">
            {/* Ambient teal aura pulse glow */}
            <div
              className="absolute -inset-2.5 rounded-full pointer-events-none transition-all duration-500 opacity-60 group-hover:opacity-100 group-hover:scale-110"
              style={{
                background:
                  "radial-gradient(circle, rgba(45,226,201,0.38) 0%, rgba(59,155,255,0.18) 50%, transparent 75%)",
                filter: "blur(14px)",
              }}
            />

            {/* Glassmorphic border ring container (dark silicon aesthetic, no harsh white) */}
            <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full p-3.5 bg-[#081524]/90 backdrop-blur-xl border border-[#2de2c9]/45 hover:border-[#2de2c9] shadow-[0_0_24px_rgba(45,226,201,0.25)] hover:shadow-[0_0_36px_rgba(45,226,201,0.45)] transition-all duration-300 transform group-hover:scale-105 flex items-center justify-center">
              <img
                src={cleanLogo}
                alt="RUET IoT Club Official Crest"
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(45,226,201,0.35)]"
                width={96}
                height={96}
              />
            </div>
          </div>
        </motion.div>

        {/* 2. University label — comfortable spacing below logo */}
        <motion.p
          className="font-mono text-[11px] md:text-xs tracking-[0.24em] uppercase text-[#2de2c9] opacity-90 drop-shadow-[0_0_8px_rgba(45,226,201,0.3)] mt-3 sm:mt-3.5"
          variants={staggerVariant}
          initial="hidden"
          animate={isSurroundingVisible ? "visible" : "hidden"}
          custom={dUniversity}
        >
          Rajshahi University of Engineering &amp; Technology
        </motion.p>

        {/* 2. Single Shared Title & Robot Stage (Significantly reduced gap from university label) */}
        {/* Title text block is centered on vertical axis (|titleCenterX - viewportCenterX| < 2px) */}
        {/* TitleStage rises together from intro center to this final position with identical translateY */}
        <div className="relative flex flex-col items-center justify-center w-full min-h-[70px] -mt-6 sm:-mt-8 md:-mt-9">
          {/* Large soft teal radial glow behind the title */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] max-w-[92vw] h-[260px] pointer-events-none rounded-full"
            style={{
              background: isLowEnd
                ? "radial-gradient(ellipse 65% 50% at 50% 50%, rgba(45, 226, 201, 0.12) 0%, transparent 70%)"
                : "radial-gradient(ellipse 65% 50% at 50% 50%, rgba(45, 226, 201, 0.16) 0%, rgba(45, 226, 201, 0.04) 50%, transparent 75%)",
              filter: isLowEnd ? "none" : "blur(40px)",
              transform: "translate3d(-50%, -50%, 0)",
              contain: "paint",
            }}
          />

          <TitleStage />
        </div>

        {/* 3. Motto: "LEARN IoT · SHAPE TECHNOLOGY" (Ample comfortable breathing space below title) */}
        <motion.div
          className="font-mono text-xs sm:text-sm tracking-[0.22em] md:tracking-[0.3em] uppercase font-semibold flex items-center justify-center select-none mt-3.5 sm:mt-4"
          style={{ wordSpacing: "0.6em" }}
          variants={staggerVariant}
          initial="hidden"
          animate={isSurroundingVisible ? "visible" : "hidden"}
          custom={dMotto}
          aria-label="LEARN IoT · SHAPE TECHNOLOGY"
        >
          <motion.span
            className="inline-flex items-center flex-wrap justify-center"
            initial="hidden"
            animate={isSurroundingVisible ? "visible" : "hidden"}
            transition={{
              staggerChildren: isLowEnd ? 0 : 0.035,
              delayChildren: isLowEnd ? 0 : dMotto,
            }}
          >
            {mottoItems.map((item, index) => {
              if (item.isSpace) {
                return (
                  <motion.span
                    key={index}
                    variants={charVariants}
                    className="inline-block"
                    style={{ width: "0.6em" }}
                    aria-hidden="true"
                  />
                );
              }
              if (item.isDot) {
                return (
                  <motion.span
                    key={index}
                    variants={charVariants}
                    className="inline-block text-[#2de2c9]"
                    style={{ margin: "0 0.45em" }}
                  >
                    ·
                  </motion.span>
                );
              }
              return (
                <motion.span
                  key={index}
                  variants={charVariants}
                  style={{ color: item.color }}
                >
                  {item.char}
                </motion.span>
              );
            })}
            {/* Terminal typewriter cursor */}
            <motion.span
              animate={isDesktop ? { opacity: [0, 1, 0] } : { opacity: 0.9 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block w-1.5 h-3.5 ml-1 bg-[#2de2c9] align-middle shadow-[0_0_8px_#2de2c9]"
              aria-hidden="true"
            />
          </motion.span>
        </motion.div>

        {/* 4. Subtitle: Comfortable breathing room below motto */}
        <motion.p
          className="font-body leading-relaxed max-w-3xl font-normal mt-2.5 sm:mt-3"
          style={{
            fontSize: "clamp(0.95rem, 1.6vw, 1.3rem)",
            color: "#c3d3e3",
          }}
          variants={staggerVariant}
          initial="hidden"
          animate={isSurroundingVisible ? "visible" : "hidden"}
          custom={dSubtitle}
        >
          Innovating through{" "}
          <span className="text-[#2de2c9] font-medium drop-shadow-[0_0_12px_rgba(45,226,201,0.35)]">
            IoT
          </span>
          ,{" "}
          <span className="text-[#2de2c9] font-medium drop-shadow-[0_0_12px_rgba(45,226,201,0.35)]">
            Embedded Systems
          </span>{" "}
          &amp;{" "}
          <span className="text-[#2de2c9] font-medium drop-shadow-[0_0_12px_rgba(45,226,201,0.35)]">
            AI Research
          </span>
        </motion.p>

        {/* 5. CTA Buttons: Join Us + Unique Microchip-Styled Explore Projects */}
        <motion.div
          variants={staggerVariant}
          initial="hidden"
          animate={isSurroundingVisible ? "visible" : "hidden"}
          custom={dJoin}
          className="pt-6 sm:pt-7 md:pt-8 flex flex-wrap items-center justify-center gap-5 sm:gap-6"
        >
          {/* Button 1: Dynamic Primary Chip (Join Us / Register Now / Event CTA) */}
          {isExternalLink(bannerConfig.buttonUrl) ? (
            <a
              href={bannerConfig.buttonUrl || "/join"}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-3 px-8 py-3.5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2de2c9] transition-all duration-300"
            >
              {/* Silicon IC Body with 45° Chamfered Corners (Primary Glowing Teal) */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#2de2c9] via-[#00d2ff] to-[#38bdf8] transition-all duration-300 shadow-[0_4px_24px_rgba(45,226,201,0.45)] group-hover:shadow-[0_4px_32px_rgba(45,226,201,0.7)] group-hover:brightness-110"
                style={{
                  clipPath:
                    "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)",
                }}
              />

              {/* Micro-Circuit Bus Grid inside Package */}
              <div
                className="absolute inset-0 opacity-20 group-hover:opacity-30 pointer-events-none transition-opacity"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(5,11,20,0.35) 1px, transparent 1px), linear-gradient(rgba(5,11,20,0.35) 1px, transparent 1px)",
                  backgroundSize: "8px 8px",
                  clipPath:
                    "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)",
                }}
              />

              {/* Pin-1 Index Notch / Orientation Marker */}
              <span className="relative z-10 w-2 h-2 rounded-full bg-[#050b14] flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-[#2de2c9] shadow-[0_0_4px_#2de2c9]" />
              </span>

              {/* Chip Label & Text */}
              <div className="relative z-10 flex items-center gap-2.5">
                <span className="font-bold text-sm text-[#050b14] tracking-wide">
                  {bannerConfig.buttonText || "Join Us"}
                </span>
                <ArrowRight
                  size={16}
                  className="text-[#050b14] transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>
            </a>
          ) : (
            <Link
              to={bannerConfig.buttonUrl || "/join"}
              className="group relative inline-flex items-center gap-3 px-8 py-3.5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2de2c9] transition-all duration-300"
            >
              {/* Silicon IC Body with 45° Chamfered Corners (Primary Glowing Teal) */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#2de2c9] via-[#00d2ff] to-[#38bdf8] transition-all duration-300 shadow-[0_4px_24px_rgba(45,226,201,0.45)] group-hover:shadow-[0_4px_32px_rgba(45,226,201,0.7)] group-hover:brightness-110"
                style={{
                  clipPath:
                    "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)",
                }}
              />

              {/* Micro-Circuit Bus Grid inside Package */}
              <div
                className="absolute inset-0 opacity-20 group-hover:opacity-30 pointer-events-none transition-opacity"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(5,11,20,0.35) 1px, transparent 1px), linear-gradient(rgba(5,11,20,0.35) 1px, transparent 1px)",
                  backgroundSize: "8px 8px",
                  clipPath:
                    "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)",
                }}
              />

              {/* Pin-1 Index Notch / Orientation Marker */}
              <span className="relative z-10 w-2 h-2 rounded-full bg-[#050b14] flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-[#2de2c9] shadow-[0_0_4px_#2de2c9]" />
              </span>

              {/* Chip Label & Text */}
              <div className="relative z-10 flex items-center gap-2.5">
                <span className="font-bold text-sm text-[#050b14] tracking-wide">
                  {bannerConfig.buttonText || "Join Us"}
                </span>
                <ArrowRight
                  size={16}
                  className="text-[#050b14] transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>
            </Link>
          )}

          {/* Button 2: Unique Microchip / IC Package Styled Explore Projects (Clean, no protruding pins) */}
          <Link
            to="/projects"
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2de2c9] transition-all duration-300"
          >
            {/* Silicon IC Body with 45° Chamfered Corners */}
            <div
              className="absolute inset-0 bg-[#071322]/90 group-hover:bg-[#0b1c30] backdrop-blur-xl border border-[#2de2c9]/50 group-hover:border-[#00d2ff] transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(45,226,201,0.15)] group-hover:shadow-[0_4px_28px_rgba(0,0,0,0.8),0_0_24px_rgba(45,226,201,0.4)]"
              style={{
                clipPath:
                  "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)",
              }}
            />

            {/* Micro-Circuit Bus Grid inside Package */}
            <div
              className="absolute inset-0 opacity-15 group-hover:opacity-30 pointer-events-none transition-opacity"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(45,226,201,0.2) 1px, transparent 1px), linear-gradient(rgba(45,226,201,0.2) 1px, transparent 1px)",
                backgroundSize: "8px 8px",
                clipPath:
                  "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)",
              }}
            />

            {/* Pin-1 Index Notch / Orientation Marker */}
            <span className="relative z-10 w-2 h-2 rounded-full bg-[#031526] border border-[#2de2c9] flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-[#2de2c9] shadow-[0_0_4px_#2de2c9]" />
            </span>

            {/* Chip Label & Text */}
            <div className="relative z-10 flex items-center gap-2.5">
              <span className="font-semibold text-sm text-[#e2f8ff] group-hover:text-[#2de2c9] transition-colors tracking-wide">
                Explore Projects
              </span>
              <Cpu
                size={16}
                className="text-[#2de2c9] group-hover:rotate-90 group-hover:scale-110 transition-transform duration-300"
              />
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* 6. Bouncing scroll indicator — rises 16px with fade */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground pointer-events-none"
        variants={staggerVariant}
        initial="hidden"
        animate={isSurroundingVisible ? "visible" : "hidden"}
        custom={dScroll}
        aria-hidden="true"
      >
        <span className="font-mono text-[9px] tracking-widest uppercase opacity-50">scroll</span>
        <motion.div
          animate={isDesktop ? { y: [0, 6, 0] } : undefined}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={16} className="opacity-40 text-[#2de2c9]" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
