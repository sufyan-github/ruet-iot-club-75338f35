/**
 * IntroSplash — Plain full-screen dark backdrop overlay (z-30).
 *
 * Requirements:
 * 1. Contains NO title and NO robot (they live inside TitleStage in the hero).
 * 2. Fades out (opacity only) while TitleStage rises to hero position.
 * 3. Shows subtle circuit grid and center teal glow.
 * 4. Displays Mobile PCB trace draw on mobile/tablet devices (< 1024px).
 * 5. Contains Skip button (z-50) for immediate skip to hero.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useIntro } from "@/contexts/IntroContext";
import { INTRO_TOTAL_MOBILE, EASE_OUT_EXPO } from "@/lib/motion";

// ─── Mobile PCB-Trace Draw Animation (1.5-2s, no robot) ─────────────────────
const MobileTraceIntro = ({ onComplete }: { onComplete: () => void }) => {
  const { isGentleIntro } = useIntro();

  useEffect(() => {
    if (isGentleIntro) {
      const gentleTimer = setTimeout(onComplete, 1200);
      return () => clearTimeout(gentleTimer);
    }
    const timer = setTimeout(onComplete, INTRO_TOTAL_MOBILE * 1000);
    return () => clearTimeout(timer);
  }, [isGentleIntro, onComplete]);

  return (
    <div className="flex items-center justify-center w-full h-full px-6">
      <svg
        viewBox="0 0 400 80"
        className="w-[min(90vw,400px)] h-auto select-none overflow-visible"
        fill="none"
        aria-label="RUET IoT Club"
        role="img"
      >
        <defs>
          <linearGradient id="mobTraceGrad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2de2c9" />
            <stop offset="100%" stopColor="#3b9bff" />
          </linearGradient>
          <filter id="mobTraceGlow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* PCB Trace line drawing across */}
        <motion.path
          d="M10 65 H390 M10 65 V15 H390 M200 15 V65"
          stroke="url(#mobTraceGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#mobTraceGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: INTRO_TOTAL_MOBILE * 0.75, ease: EASE_OUT_EXPO }}
        />

        {/* Solder nodes glowing at once after draw */}
        {[
          [10, 15], [10, 65], [200, 15], [200, 65], [390, 15], [390, 65],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={5}
            fill="#2de2c9"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: INTRO_TOTAL_MOBILE * 0.7, duration: 0.3 }}
          />
        ))}

        {/* Club Name */}
        <motion.text
          x="200"
          y="45"
          textAnchor="middle"
          fontFamily="'Orbitron', sans-serif"
          fontWeight="700"
          fontSize="18"
          fill="#e2f6ff"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: INTRO_TOTAL_MOBILE * 0.55, duration: 0.4 }}
        >
          RUET IoT CLUB
        </motion.text>
      </svg>
    </div>
  );
};

// ─── Main Plain Dark Backdrop Component ─────────────────────────────────────
const IntroSplash = () => {
  const {
    showBackdrop,
    backdropOpacity,
    isDesktop,
    fontsReady,
    skipIntro,
    finishIntro,
  } = useIntro();

  const location = useLocation();

  if (!showBackdrop || (location.pathname !== "/" && location.pathname !== "")) {
    return null;
  }

  return (
    <>
      {/* ── 1. Plain Dark Backdrop Overlay — z-10 (Behind TitleStage and Hero content so Robot & Title are fully visible) ── */}
      <div
        id="intro-dark-backdrop"
        className="fixed inset-0 z-10 bg-[#050b14] overflow-hidden select-none pointer-events-none"
        style={{
          opacity: backdropOpacity,
          willChange: "opacity",
        }}
        aria-hidden="true"
      >
        {/* Background circuit grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
          <defs>
            <pattern id="splash-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 L0 0 0 40" fill="none" stroke="#2de2c9" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#splash-grid-pattern)" />
        </svg>

        {/* Center soft teal radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 45% at 50% 50%, rgba(45, 226, 201, 0.12) 0%, rgba(45, 226, 201, 0.02) 50%, transparent 75%)",
          }}
        />

        {/* Mobile PCB trace draw on mobile/tablet (no robot) */}
        {!isDesktop && fontsReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <MobileTraceIntro onComplete={finishIntro} />
          </div>
        )}
      </div>

      {/* ── 2. Skip button — fixed z-50 (Always on top of all layers, fully clickable) ── */}
      <button
        onClick={skipIntro}
        className="pointer-events-auto fixed bottom-8 right-8 z-50 text-xs font-mono text-[#2de2c9]/80 hover:text-[#2de2c9] border border-[#2de2c9]/40 hover:border-[#2de2c9]/80 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2de2c9]"
        aria-label="Skip intro animation"
      >
        Skip ›
      </button>
    </>
  );
};

export default IntroSplash;
