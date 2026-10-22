/**
 * TitleStage — Single unified wrapper for the title and the robot.
 *
 * Requirements:
 * 1. ONE title element and ONE robot element for the entire sequence.
 * 2. Positioned in the hero at its FINAL location from the start.
 * 3. Shared Y offset (`stageY`) applied to the whole wrapper via transform: translateY
 *    so title, robot, ladder, sparks and WIP tag rise together with identical motion.
 * 4. Measures introOffset = (viewportHeight / 2) - titleCenterY so title starts
 *    at vertical center of screen.
 * 5. Measures R glyph position relative to the stage wrapper (offset-independent).
 * 6. Keeps the feathered mask inside the stage so it moves with it.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { useIntro } from "@/contexts/IntroContext";
import IoTLogoTitle from "@/components/home/IoTLogoTitle";
import BuildingRobot from "@/components/home/BuildingRobot";

export const TitleStage = () => {
  const {
    stageY,
    stageOpacity,
    robotX,
    facing,
    walkPhase,
    robotMode,
    maskProgress,
    isDesktop,
    rCapHeight,
    isGentleIntro,
    isLowEnd,
    phase,
    registerGeometry,
  } = useIntro();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageYRef = useRef(stageY);
  stageYRef.current = stageY;
  const [baselineOffset, setBaselineOffset] = useState(16);

  // Measure and register geometry with IntroContext
  const measureAndRegister = useCallback(() => {
    const stageEl = stageRef.current;
    if (!stageEl || typeof window === "undefined") return;

    const sRect = stageEl.getBoundingClientRect();
    if (sRect.width <= 10 || sRect.height <= 5) {
      // Re-schedule measurement if element hasn't finished initial layout
      requestAnimationFrame(measureAndRegister);
      return;
    }

    const unshiftedTop = sRect.top - stageYRef.current;
    const titleCenterY = unshiftedTop + sRect.height / 2;
    const viewportCenterY = window.innerHeight / 2;
    let offset = viewportCenterY - titleCenterY;

    // Sensible fallback if measurement fails or title is already near center
    if (isNaN(offset) || !isFinite(offset) || offset <= 10) {
      offset = Math.round(window.innerHeight * 0.18);
    }

    const rEl = document.getElementById("r-glyph-element");
    const titleEl = document.getElementById("hero-title-text-block");

    // Measure baseline offset relative to stage wrapper (offset-independent)
    if (rEl) {
      const rRect = rEl.getBoundingClientRect();
      const bOffset = Math.max(0, sRect.bottom - rRect.bottom);
      setBaselineOffset(bOffset);
    }

    registerGeometry(
      {
        stageRect: sRect,
        rRect: rEl ? rEl.getBoundingClientRect() : null,
        titleRect: titleEl ? titleEl.getBoundingClientRect() : null,
      },
      offset
    );
  }, [registerGeometry]);

  // Initial measurement after fonts ready and on resize
  useEffect(() => {
    measureAndRegister();

    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measureAndRegister).catch(() => {});
    }

    const onResize = () => {
      if (phase !== "done") {
        measureAndRegister();
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureAndRegister, phase]);

  return (
    <div
      ref={stageRef}
      id="hero-title-stage"
      className="relative inline-flex items-center justify-center overflow-visible z-40 select-none"
      style={{
        transform: `translate3d(0, ${stageY}px, 0)`,
        opacity: stageOpacity,
        willChange: "transform, opacity",
      }}
    >
      {/* ── Single Shared Robot (Resting / Walking) ── */}
      {/* Hidden below 1024px; rises with stageY */}
      {isDesktop && (
        <div
          id="hero-robot-wrapper"
          className="absolute pointer-events-none select-none z-20"
          style={{
            left: 0,
            bottom: `${baselineOffset}px`,
            transform: `translate3d(${robotX}px, 0, 0)`,
            transformOrigin: "bottom center",
            height: `${rCapHeight}px`,
            willChange: "transform",
          }}
        >
          <BuildingRobot
            mode={robotMode}
            walkPhase={walkPhase}
            capHeight={rCapHeight}
            facing={facing}
            reduced={!isDesktop}
          />
        </div>
      )}

      {/* ── Single Shared Title ── */}
      {/* Mask is inside TitleStage so it moves with it and never clips during rise */}
      <div className="relative z-10 overflow-visible">
        <IoTLogoTitle
          reduced={!isDesktop}
          maskProgress={maskProgress}
        />
      </div>
    </div>
  );
};

export default TitleStage;
