/**
 * IntroContext — Coordinates the single shared TitleStage (title + robot),
 * the dark backdrop overlay, the rise from intro center to hero position,
 * and the staggered reveal of the hero section.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useReducedMotion } from "framer-motion";
import { easeStageRise } from "@/lib/motion";
import { isLowConfigurationDevice, isMobilePhoneDevice } from "@/lib/deviceCapability";

export type IntroPhase = "playing" | "done";

export interface StageGeometry {
  stageRect: DOMRect;
  rRect: DOMRect | null;
  titleRect: DOMRect | null;
}

interface IntroContextType {
  phase: IntroPhase;
  stageY: number;
  stageOpacity: number;
  robotX: number;
  facing: number;
  walkPhase: number;
  robotMode: "walking" | "resting";
  maskProgress: number | null;
  showBackdrop: boolean;
  backdropOpacity: number;
  heroRevealStarted: boolean;
  isDesktop: boolean;
  fontsReady: boolean;
  rCapHeight: number;
  setRCapHeight: (h: number) => void;
  isGentleIntro: boolean;
  isLowEnd: boolean;
  finishIntro: () => void;
  skipIntro: () => void;
  registerGeometry: (geom: StageGeometry, calculatedOffset: number) => void;
}

const IntroContext = createContext<IntroContextType | undefined>(undefined);

export const IntroProvider = ({ children }: { children: ReactNode }) => {
  const reducedMotion = useReducedMotion();
  const [fontsReady, setFontsReady] = useState(false);
  const [rCapHeight, setRCapHeight] = useState(42);

  // Synchronously evaluate low-end device capability
  const [isLowEnd] = useState(() => {
    if (typeof window === "undefined") return false;
    return isLowConfigurationDevice();
  });

  // Check if running on an actual handheld mobile smartphone (touch phone < 640px)
  // Non-phone browsers (laptops, desktops, even when window is resized/snapped beside code) always play intro!
  const isTouchPhone = typeof window !== "undefined" && isMobilePhoneDevice();

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return !isTouchPhone;
  });

  // Query parameter handling:
  // ?intro=force -> bypasses prefers-reduced-motion, plays full robot walk + rise
  // ?intro=1     -> forces intro unless reduced motion is on
  // ?intro=0     -> disables intro immediately (phase = "done")
  const [phase, setPhase] = useState<IntroPhase>(() => {
    if (typeof window === "undefined") return "done";
    const searchParams = new URLSearchParams(window.location.search);
    const introParam = searchParams.get("intro");
    // Clean up ?freeze=... or ?intro=0 from browser URL so animation always runs smoothly to completion
    if (searchParams.has("freeze") || introParam === "0") {
      try {
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete("freeze");
        if (introParam === "0") cleanParams.delete("intro");
        const cleanQuery = cleanParams.toString();
        const cleanUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : "") + window.location.hash;
        window.history.replaceState({}, "", cleanUrl);
      } catch {
        // Safe fallback
      }
      if (introParam === "0") return "done";
    }

    const isHome = window.location.pathname === "/" || window.location.pathname === "";
    if (!isHome) return "done";

    // Only real handheld mobile smartphones (< 640px touch screen) skip intro immediately
    if (isTouchPhone) {
      return "done";
    }

    return "playing";
  });

  // Desktop always plays the full walking robot title-wipe animation
  const isGentleIntro = false;

  const isInitialDone = phase === "done";

  // Timeline-driven state
  const [stageY, setStageY] = useState(0);
  const [stageOpacity, setStageOpacity] = useState(isInitialDone ? 1 : 0);
  const [robotX, setRobotX] = useState(isInitialDone ? 18 : 1200);
  const [facing, setFacing] = useState<number>(isInitialDone ? 1 : -1);
  const [walkPhase, setWalkPhase] = useState(0);
  const [robotMode, setRobotMode] = useState<"walking" | "resting">(isInitialDone ? "resting" : "walking");
  const [maskProgress, setMaskProgress] = useState<number | null>(isInitialDone ? null : 140);
  const [showBackdrop, setShowBackdrop] = useState(!isInitialDone);
  const [backdropOpacity, setBackdropOpacity] = useState(isInitialDone ? 0 : 1);
  const [heroRevealStarted, setHeroRevealStarted] = useState(isInitialDone);

  const geometryRef = useRef<StageGeometry | null>(null);
  const introOffsetRef = useRef<number>(0);
  const timelineStartedRef = useRef(false);
  const switchedToRestingRef = useRef(false);
  const heroRevealTriggeredRef = useRef(false);
  const rCapHeightRef = useRef(rCapHeight);
  rCapHeightRef.current = rCapHeight;

  const finishIntro = useCallback(() => {
    if (typeof document !== "undefined") {
      const stageEl = document.getElementById("hero-title-stage");
      const robotEl = document.getElementById("hero-robot-wrapper");
      const titleTextEl = document.getElementById("hero-title-text-block");
      const backdropEl = document.getElementById("intro-dark-backdrop");

      if (stageEl) {
        stageEl.style.transform = "translate3d(0, 0, 0)";
        stageEl.style.opacity = "1";
      }
      if (robotEl) {
        robotEl.style.transform = "translate3d(18px, 0, 0) scaleX(1)";
      }
      if (titleTextEl) {
        titleTextEl.style.webkitMaskImage = "none";
        titleTextEl.style.maskImage = "none";
        titleTextEl.style.opacity = "1";
      }
      if (backdropEl) {
        backdropEl.style.opacity = "0";
        backdropEl.style.display = "none";
      }
    }

    setStageY(0);
    setStageOpacity(1);
    setRobotX(18);
    setFacing(1);
    setMaskProgress(null);
    setRobotMode("resting");
    setShowBackdrop(false);
    setBackdropOpacity(0);
    setHeroRevealStarted(true);
    setPhase("done");
  }, []);

  const skipIntro = useCallback(() => {
    finishIntro();
  }, [finishIntro]);

  // Wait for document.fonts.ready
  useEffect(() => {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready
        .then(() => setFontsReady(true))
        .catch(() => setFontsReady(true));
    } else {
      setFontsReady(true);
    }
  }, []);

  // Desktop/laptop check listener (true for all non-phone devices)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateDesktop = () => {
      setIsDesktop(!isMobilePhoneDevice());
    };
    updateDesktop();
    window.addEventListener("resize", updateDesktop);
    return () => window.removeEventListener("resize", updateDesktop);
  }, []);

  // 8-second safety timeout that guarantees phase transitions to "done"
  useEffect(() => {
    if (phase === "done") return;
    const safetyTimer = setTimeout(() => {
      finishIntro();
    }, 8000);
    return () => clearTimeout(safetyTimer);
  }, [phase, finishIntro]);

  // Lock body scroll while intro backdrop is active
  useEffect(() => {
    if (!showBackdrop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showBackdrop]);

  // ─── Timeline Driver (Zero React Re-render Direct GPU Pipeline) ───────────
  // Total intro time: ~4.55s
  // Phase 1: Robot starts outside title right, walks left at calm pace (~210 px/s). Mask wipes title directly via GPU.
  // Phase 2: Arrives just past 'R' (title 100% revealed). Brief pause 0.15s, smooth scaleX turn around 0.25s.
  // Phase 3: Gentle decelerating step into resting position beside 'R' (0.35s).
  // Phase 4: Working pose beside R (soldering iron on corner pad, sparks, idle sway) for 0.35s.
  // Hold   : Hold finished title and robot pose still (0.20s).
  // Rise   : TitleStage rises from intro offset to 0 (0.85s) with cubic-bezier(0.22, 1, 0.36, 1).
  // Handover: Stage reaches 0, backdrop gone, phase is "done".
  const startDesktopTimeline = useCallback(
    (offset: number, geom: StageGeometry) => {
      if (timelineStartedRef.current) return;
      timelineStartedRef.current = true;
      switchedToRestingRef.current = false;
      heroRevealTriggeredRef.current = false;

      // Apply initial offset immediately so title starts at vertical center
      setStageY(offset);
      setStageOpacity(1);
      setMaskProgress(140); // 100% hidden at start
      setShowBackdrop(true);
      setBackdropOpacity(1);
      setHeroRevealStarted(false);

      const robotWidth = (rCapHeightRef.current || 42) * (140 / 144);
      const stageRect = geom.stageRect;

      const titleWidth = geom.titleRect && geom.titleRect.width > 50 ? geom.titleRect.width : stageRect.width;
      const titleLeft = geom.titleRect ? geom.titleRect.left : stageRect.left;
      const titleRightRel = (titleLeft - stageRect.left) + titleWidth;

      // Coordinates relative to stage wrapper:
      // Start just outside title on right so robot begins wiping immediately without dead-space walking
      const x_start = titleRightRel + 32;

      // Turnaround point: just past 'R' so mask wipe completes 100% without long traversal across margins
      const x_left = -14;

      // Resting position snug beside 'R' with reduced distance
      const x_rest = 18;

      setRobotX(x_start);
      setFacing(-1);
      setWalkPhase(0);
      setRobotMode("walking");

      // Direct DOM handles for hardware-accelerated 60-144 FPS animation with zero React re-renders
      const stageEl = document.getElementById("hero-title-stage");
      const robotEl = document.getElementById("hero-robot-wrapper");
      const titleTextEl = document.getElementById("hero-title-text-block");
      const backdropEl = document.getElementById("intro-dark-backdrop");

      if (stageEl) {
        stageEl.style.transform = `translate3d(0, ${offset}px, 0)`;
        stageEl.style.opacity = "1";
      }
      if (robotEl) {
        robotEl.style.transform = `translate3d(${x_start}px, 0, 0) scaleX(-1)`;
      }
      if (titleTextEl) {
        titleTextEl.style.webkitMaskImage = "linear-gradient(transparent, transparent)";
        titleTextEl.style.maskImage = "linear-gradient(transparent, transparent)";
        titleTextEl.style.opacity = "0";
      }
      if (backdropEl) {
        backdropEl.style.opacity = "1";
        backdropEl.style.display = "block";
      }

      let rafId: number;
      let startTime: number | null = null;

      // Calibrated durations: Robot maintains a calm, natural walking pace (~210 px/s, smooth step cadence)
      // Overall animation time is ~5.0s, clear and readable text-wipe reveal behind robot.
      const T_P1 = 2.80; // walk left across title (calm, natural 210 px/s pace)
      const T_PAUSE = 0.15; // brief pause past 'R' before turning
      const T_TURN1 = 0.25; // scaleX turn
      const T_P2 = T_PAUSE + T_TURN1; // 0.40s
      const T_P3 = 0.35; // return walk right to 'R' (short gentle 32px step)
      const T_P4 = 0.35; // working pose beside R with sparks
      const T_HOLD = 0.20; // brief hold of finished title
      const T_RISE = 0.85; // stage rise
      const T_TOTAL = T_P1 + T_P2 + T_P3 + T_P4 + T_HOLD + T_RISE;

      const step = (ts: number) => {
        if (startTime === null) startTime = ts;
        const elapsed = (ts - startTime) / 1000;

        if (elapsed < T_P1) {
          // ── Phase 1: Walk Left Across Title ──
          const p = elapsed / T_P1;
          const currentX = x_start + p * (x_left - x_start);
          if (robotEl) {
            robotEl.style.transform = `translate3d(${currentX}px, 0, 0) scaleX(-1)`;
          }

          // Mask wipe driven by robot center X
          const robotCenterViewportX = (stageRect.left + currentX) + robotWidth / 2;
          const maskPct = ((robotCenterViewportX - titleLeft) / titleWidth) * 100;

          if (titleTextEl) {
            if (maskPct <= -4) {
              titleTextEl.style.webkitMaskImage = "none";
              titleTextEl.style.maskImage = "none";
              titleTextEl.style.opacity = "1";
            } else {
              const featherMin = Math.max(0, maskPct - 4);
              const featherMax = Math.min(100, maskPct + 4);
              const maskVal = `linear-gradient(to right, transparent 0%, transparent ${featherMin}%, black ${featherMax}%, black 100%)`;
              titleTextEl.style.webkitMaskImage = maskVal;
              titleTextEl.style.maskImage = maskVal;
              titleTextEl.style.webkitMaskSize = "100% 100%";
              titleTextEl.style.maskSize = "100% 100%";
              titleTextEl.style.webkitMaskRepeat = "no-repeat";
              titleTextEl.style.maskRepeat = "no-repeat";
              titleTextEl.style.opacity = "1";
            }
          }
        } else if (elapsed < T_P1 + T_P2) {
          // ── Phase 2: Pause and Smooth ScaleX Turn Just Past 'R' ──
          const p2Elapsed = elapsed - T_P1;
          let curFacing = -1;
          if (p2Elapsed >= T_PAUSE) {
            const turnP = Math.min(1, (p2Elapsed - T_PAUSE) / T_TURN1);
            curFacing = -1 + 2 * turnP;
          }
          if (robotEl) {
            robotEl.style.transform = `translate3d(${x_left}px, 0, 0) scaleX(${curFacing})`;
          }
          if (titleTextEl) {
            titleTextEl.style.webkitMaskImage = "none";
            titleTextEl.style.maskImage = "none";
            titleTextEl.style.opacity = "1";
          }
        } else if (elapsed < T_P1 + T_P2 + T_P3) {
          // ── Phase 3: Gentle Step into Resting Position Beside 'R' ──
          const p3Elapsed = elapsed - (T_P1 + T_P2);
          const p = Math.min(1, p3Elapsed / T_P3);
          const eased = 1 - Math.pow(1 - p, 2.5);
          const currentX = x_left + eased * (x_rest - x_left);
          if (robotEl) {
            robotEl.style.transform = `translate3d(${currentX}px, 0, 0) scaleX(1)`;
          }
        } else if (elapsed < T_P1 + T_P2 + T_P3 + T_P4) {
          // ── Phase 4: Working Pose beside 'R' with Sparks & Idle Sway ──
          if (robotEl) {
            robotEl.style.transform = `translate3d(${x_rest}px, 0, 0) scaleX(1)`;
          }
          if (!switchedToRestingRef.current) {
            switchedToRestingRef.current = true;
            setRobotMode("resting");
          }
        } else if (elapsed < T_P1 + T_P2 + T_P3 + T_P4 + T_HOLD) {
          // ── Hold Still Briefly ──
          if (robotEl) {
            robotEl.style.transform = `translate3d(${x_rest}px, 0, 0) scaleX(1)`;
          }
        } else if (elapsed <= T_TOTAL) {
          // ── Rise: Animate stageY from introOffset to 0 over 0.85s ──
          const riseElapsed = elapsed - (T_P1 + T_P2 + T_P3 + T_P4 + T_HOLD);
          const riseProgress = Math.min(1, riseElapsed / T_RISE);
          const easeVal = easeStageRise(riseProgress);

          const currentStageY = offset * (1 - easeVal);
          if (stageEl) {
            stageEl.style.transform = `translate3d(0, ${currentStageY}px, 0)`;
          }
          if (robotEl) {
            robotEl.style.transform = `translate3d(${x_rest}px, 0, 0) scaleX(1)`;
          }

          // Hero elements stagger in starting when stage is ~55% of the way up
          if (easeVal >= 0.55 && !heroRevealTriggeredRef.current) {
            heroRevealTriggeredRef.current = true;
            setHeroRevealStarted(true);
          }

          // Dark backdrop fades out over 0.70s starting 0.12s into the rise
          if (backdropEl && riseElapsed >= 0.12) {
            const backdropProgress = Math.min(1, (riseElapsed - 0.12) / 0.70);
            backdropEl.style.opacity = String(Math.max(0, 1 - backdropProgress));
          }
        } else {
          // ── Intro Complete: Handover to Hero ──
          finishIntro();
          return;
        }

        rafId = requestAnimationFrame(step);
      };

      rafId = requestAnimationFrame(step);
    },
    [finishIntro]
  );

  // Registration callback from TitleStage
  const registerGeometry = useCallback(
    (geom: StageGeometry, calculatedOffset: number) => {
      geometryRef.current = geom;
      introOffsetRef.current = calculatedOffset;

      if (phase !== "playing") {
        finishIntro();
        return;
      }

      // On desktop/laptop: launch the out-and-back walk + text-reveal + rise timeline
      const canRunDesktopIntro = isDesktop;
      if (canRunDesktopIntro && !timelineStartedRef.current) {
        startDesktopTimeline(calculatedOffset, geom);
      } else if (!canRunDesktopIntro) {
        // Handheld mobile phones (< 640px touch screen): skip intro immediately per user requirement
        finishIntro();
      }
    },
    [phase, isDesktop, finishIntro, startDesktopTimeline]
  );

  return (
    <IntroContext.Provider
      value={{
        phase,
        stageY,
        stageOpacity,
        robotX,
        facing,
        walkPhase,
        robotMode,
        maskProgress,
        showBackdrop,
        backdropOpacity,
        heroRevealStarted,
        isDesktop,
        fontsReady,
        rCapHeight,
        setRCapHeight,
        isGentleIntro,
        isLowEnd,
        finishIntro,
        skipIntro,
        registerGeometry,
      }}
    >
      {children}
    </IntroContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useIntro = (): IntroContextType => {
  const context = useContext(IntroContext);
  if (!context) {
    return {
      phase: "done",
      stageY: 0,
      stageOpacity: 1,
      robotX: 18,
      facing: 1,
      walkPhase: 0,
      robotMode: "resting",
      maskProgress: null,
      showBackdrop: false,
      backdropOpacity: 0,
      heroRevealStarted: true,
      isDesktop: true,
      fontsReady: true,
      rCapHeight: 42,
      setRCapHeight: () => {},
      isGentleIntro: false,
      isLowEnd: false,
      finishIntro: () => {},
      skipIntro: () => {},
      registerGeometry: () => {},
    };
  }
  return context;
};
