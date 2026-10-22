/**
 * BuildingRobot — Desktop hero robot.
 *
 * Requirements:
 * - Resting pose:
 *   - Height EXACTLY equal to title cap-height (from R glyph getBoundingClientRect).
 *   - Upright but leaning back, torso tilted ~10-12 degrees toward the R, back against the R.
 *   - Legs slightly crossed, feet on the same baseline as title letters.
 *   - One hand on the soldering iron touching the R's corner pad (2-3 tiny spark dots).
 *   - Idle breathing sway (animating only transform and opacity).
 *   - Small ladder/crate sitting right behind the robot's feet on the same baseline, same scale.
 *   - "WIP" tag above robot's head (not above the R), fully visible, never overlapping any letter.
 * - Walking pose (during intro):
 *   - Faces LEFT, walks right-to-left with swinging limbs and bobbing torso.
 * - Animate only transform and opacity. Respects reduced motion.
 */

import { motion } from "framer-motion";

interface BuildingRobotProps {
  mode: "walking" | "resting";
  walkPhase?: number;
  capHeight?: number;
  facing?: number; // scaleX factor: 1 = right, -1 = left, smooth interpolation in between
  reduced?: boolean;
  className?: string;
}

export const BuildingRobot = ({
  mode,
  walkPhase = 0,
  capHeight = 42,
  facing = -1,
  reduced = false,
  className = "",
}: BuildingRobotProps) => {
  const isResting = mode === "resting";

  // Walking cycle angles for legs and arms
  const legAngle = isResting ? 0 : Math.sin(walkPhase * Math.PI * 2) * 26;
  const armAngle = isResting ? 0 : Math.sin(walkPhase * Math.PI * 2) * 22;
  const bodyBob  = isResting ? 0 : Math.abs(Math.sin(walkPhase * Math.PI * 2)) * -3.5;

  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      style={{
        height: `${capHeight}px`,
        width: "auto",
        display: "inline-block",
      }}
    >
      <style>{`
        @keyframes robot-idle-sway {
          0%, 100% { transform: rotate(10deg) translateY(0px); }
          50%      { transform: rotate(12.5deg) translateY(-2px); }
        }
        @keyframes robot-antenna-pulse {
          0%, 100% { opacity: 0.45; filter: drop-shadow(0 0 2px #2de2c9); }
          50%      { opacity: 1; filter: drop-shadow(0 0 8px #2de2c9); transform: scale(1.2); }
        }
        @keyframes robot-antenna-wave {
          0%, 100% { opacity: 0.2; transform: scale(0.9); }
          50%      { opacity: 0.95; transform: scale(1.15); }
        }
        @keyframes robot-eye-blink {
          0%, 88%, 94%, 100% { transform: scaleY(1); opacity: 1; }
          91%                { transform: scaleY(0.1); opacity: 0.2; }
        }
        @keyframes robot-led-pulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; filter: drop-shadow(0 0 4px #2de2c9); }
        }
        @keyframes robot-walk-front-leg {
          0%, 100% { transform: rotate(24deg); }
          50%      { transform: rotate(-24deg); }
        }
        @keyframes robot-walk-back-leg {
          0%, 100% { transform: rotate(-24deg); }
          50%      { transform: rotate(24deg); }
        }
        @keyframes robot-walk-bob {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-3.5px); }
        }
        @keyframes robot-walk-front-arm {
          0%, 100% { transform: rotate(-22deg); }
          50%      { transform: rotate(22deg); }
        }
        @keyframes robot-walk-back-arm {
          0%, 100% { transform: rotate(22deg); }
          50%      { transform: rotate(-22deg); }
        }
        @keyframes tiny-spark-1 {
          0%   { transform: translate(0, 0) scale(1.2); opacity: 1; }
          100% { transform: translate(8px, -12px) scale(0); opacity: 0; }
        }
        @keyframes tiny-spark-2 {
          0%   { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(4px, -15px) scale(0); opacity: 0; }
        }
        @keyframes tiny-spark-3 {
          0%   { transform: translate(0, 0) scale(1.1); opacity: 1; }
          100% { transform: translate(11px, -8px) scale(0); opacity: 0; }
        }
      `}</style>

      {/* ── "WIP" Tag Sitting Above the Robot's Head (never overlapping R) ── */}
      {isResting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0a1826]/95 border border-[#2de2c9]/80 shadow-[0_0_10px_rgba(45,226,201,0.35)] whitespace-nowrap"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#2de2c9] animate-pulse" />
          <span className="font-mono text-[8px] font-bold text-[#2de2c9] tracking-wider uppercase">
            WIP
          </span>
        </motion.div>
      )}

      {/* ── Main Robot SVG (Height matches cap-height exactly) ── */}
      <svg
        id="building-robot-svg"
        viewBox="0 0 140 144"
        style={{
          height: "100%",
          width: "auto",
          overflow: "visible",
          display: "block",
          transformOrigin: "bottom center",
          transform: isResting
            ? reduced
              ? "rotate(11deg)"
              : undefined
            : `scaleX(${facing})`,
          animation: isResting && !reduced
            ? "robot-idle-sway 3.6s ease-in-out infinite"
            : !reduced
            ? "robot-walk-bob 0.21s ease-in-out infinite"
            : "none",
          willChange: "transform",
        }}
        aria-hidden="true"
      >
        <defs>
          <filter id="robotGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Small Ladder / Crate (right behind robot's feet on same baseline y = 140) ── */}
        {isResting && (
          <g id="mini-toolbox-ladder">
            {/* Wooden / metallic electronics crate */}
            <rect x="2" y="106" width="30" height="34" rx="3" fill="#07101b" stroke="#3b9bff" strokeWidth="1.6" />
            {/* Shelf / rungs */}
            <line x1="2" y1="118" x2="32" y2="118" stroke="#2de2c9" strokeWidth="1.2" strokeOpacity="0.7" />
            <line x1="2" y1="128" x2="32" y2="128" stroke="#2de2c9" strokeWidth="1.2" strokeOpacity="0.7" />
            {/* Miniature handle */}
            <path d="M 11 106 V 101 H 23 V 106" stroke="#2de2c9" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            {/* Small tool / wire spool sticking out */}
            <line x1="8" y1="106" x2="4" y2="96" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="17" cy="123" r="1.6" fill="#2de2c9" />
          </g>
        )}

        {/* ── LEGS ── */}
        {isResting ? (
          /* RESTING POSE: Legs slightly crossed at the ankles/feet, resting on baseline y = 140 */
          <g id="resting-legs">
            {/* Left leg (crossed behind right) */}
            <path
              d="M 58 96 L 52 118 L 68 140 H 78"
              stroke="#2de2c9"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Right leg (crossed in front) */}
            <path
              d="M 80 96 L 76 116 L 62 140 H 72"
              stroke="#3b9bff"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        ) : (
          /* WALKING CYCLE LEGS (Walking Leftwards) */
          <g id="walking-legs">
            {/* Front Leg */}
            <g
              style={{
                transformOrigin: "58px 96px",
                animation: !reduced ? "robot-walk-front-leg 0.42s ease-in-out infinite" : "none",
              }}
            >
              <line x1="58" y1="96" x2="54" y2="118" stroke="#2de2c9" strokeWidth="3.6" strokeLinecap="round" />
              <line x1="54" y1="118" x2="58" y2="138" stroke="#2de2c9" strokeWidth="3.6" strokeLinecap="round" />
              <path d="M50 138 H66" stroke="#2de2c9" strokeWidth="4" strokeLinecap="round" />
            </g>
            {/* Back Leg */}
            <g
              style={{
                transformOrigin: "80px 96px",
                animation: !reduced ? "robot-walk-back-leg 0.42s ease-in-out infinite" : "none",
              }}
            >
              <line x1="80" y1="96" x2="84" y2="118" stroke="#3b9bff" strokeWidth="3.6" strokeLinecap="round" />
              <line x1="84" y1="118" x2="80" y2="138" stroke="#3b9bff" strokeWidth="3.6" strokeLinecap="round" />
              <path d="M72 138 H88" stroke="#3b9bff" strokeWidth="4" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* ── TORSO (Upright, tilted ~11° toward R when resting) ── */}
        <g id="robot-torso">
          <rect x="65" y="50" width="8" height="4" fill="#3b9bff" rx="1" />
          <rect
            x="44"
            y="54"
            width="50"
            height="44"
            rx="6"
            fill="#0b1726"
            stroke="#3b9bff"
            strokeWidth="2.4"
          />
          {/* Internal circuit panel */}
          <rect
            x="52"
            y="60"
            width="34"
            height="20"
            rx="3"
            fill="#07101b"
            stroke="#2de2c9"
            strokeWidth="1.4"
            strokeOpacity="0.8"
          />
          <line x1="57" y1="67" x2="81" y2="67" stroke="#2de2c9" strokeWidth="1.4" strokeOpacity="0.8" />
          <line x1="57" y1="73" x2="73" y2="73" stroke="#3b9bff" strokeWidth="1.4" strokeOpacity="0.8" />
          <circle cx="60" cy="88" r="2.2" fill="#2de2c9" />
          <circle cx="69" cy="88" r="2.2" fill="#3b9bff" />
          <circle cx="78" cy="88" r="2.2" fill="#2de2c9" />
        </g>

        {/* ── ARMS & SOLDERING IRON ── */}
        {isResting ? (
          /* RESTING POSE: Leaning back against R, one hand holding soldering iron touching R's corner pad */
          <g id="resting-arms">
            {/* Left arm: relaxed beside torso */}
            <path
              d="M 44 62 Q 38 78 48 90"
              stroke="#2de2c9"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="48" cy="90" r="3.2" fill="#2de2c9" />

            {/* Right arm: raised extending up-right, holding soldering iron touching R corner pad */}
            <g id="soldering-arm">
              <path
                d="M 94 62 L 112 48 L 126 34"
                stroke="#3b9bff"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="126" cy="34" r="3" fill="#3b9bff" />

              {/* Soldering iron handle and tip touching corner pad (tip reaches x=136, y=24) */}
              <rect
                x="124"
                y="30"
                width="14"
                height="5"
                rx="1.2"
                fill="#0a1a2b"
                stroke="#2de2c9"
                strokeWidth="1"
                transform="rotate(-40 124 30)"
              />
              <line x1="131" y1="28" x2="138" y2="20" stroke="#f1f5f9" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="138" cy="20" r="1.5" fill="#2de2c9" />

              {/* 2-3 Tiny spark dots from soldering iron touching the corner pad */}
              {!reduced && (
                <g pointerEvents="none">
                  <circle
                    cx="138"
                    cy="20"
                    r="1.2"
                    fill="#ffffff"
                    style={{ animation: "tiny-spark-1 0.8s ease-out infinite" }}
                  />
                  <circle
                    cx="139"
                    cy="19"
                    r="1"
                    fill="#38bdf8"
                    style={{ animation: "tiny-spark-2 1.1s ease-out infinite", animationDelay: "0.2s" }}
                  />
                  <circle
                    cx="137"
                    cy="21"
                    r="0.8"
                    fill="#2de2c9"
                    style={{ animation: "tiny-spark-3 0.9s ease-out infinite", animationDelay: "0.4s" }}
                  />
                </g>
              )}
            </g>
          </g>
        ) : (
          /* WALKING CYCLE ARMS */
          <g id="walking-arms">
            <g
              style={{
                transformOrigin: "44px 62px",
                animation: !reduced ? "robot-walk-front-arm 0.42s ease-in-out infinite" : "none",
              }}
            >
              <line x1="44" y1="62" x2="34" y2="78" stroke="#2de2c9" strokeWidth="3" strokeLinecap="round" />
              <line x1="34" y1="78" x2="31" y2="92" stroke="#2de2c9" strokeWidth="3" strokeLinecap="round" />
              <circle cx="31" cy="92" r="3.2" fill="#2de2c9" />
            </g>
            <g
              style={{
                transformOrigin: "94px 62px",
                animation: !reduced ? "robot-walk-back-arm 0.42s ease-in-out infinite" : "none",
              }}
            >
              <line x1="94" y1="62" x2="104" y2="78" stroke="#3b9bff" strokeWidth="3" strokeLinecap="round" />
              <line x1="104" y1="78" x2="107" y2="92" stroke="#3b9bff" strokeWidth="3" strokeLinecap="round" />
              <circle cx="107" cy="92" r="3.2" fill="#3b9bff" />
            </g>
          </g>
        )}

        {/* ── HEAD & ANTENNA ── */}
        <g id="robot-head">
          <line x1="69" y1="20" x2="69" y2="6" stroke="#2de2c9" strokeWidth="2.4" strokeLinecap="round" />
          <circle
            cx="69"
            cy="6"
            r="3.8"
            fill="#2de2c9"
            filter="url(#robotGlow)"
            style={{ transformOrigin: "69px 6px", animation: !reduced ? "robot-antenna-pulse 1.8s ease-in-out infinite" : "none" }}
          />
          <path
            d="M61 8 A10 10 0 0 1 77 8"
            fill="none"
            stroke="#2de2c9"
            strokeWidth="1.4"
            style={{ transformOrigin: "69px 8px", animation: !reduced ? "robot-antenna-wave 1.8s ease-in-out infinite" : "none" }}
          />
          <rect x="43" y="28" width="4" height="11" rx="1.5" fill="#3b9bff" />
          <rect x="91" y="28" width="4" height="11" rx="1.5" fill="#3b9bff" />
          <rect
            x="47"
            y="20"
            width="44"
            height="30"
            rx="6.5"
            fill="#0b1726"
            stroke="#2de2c9"
            strokeWidth="2.4"
          />
          {/* Animated Blinking Cyber Eyes */}
          <g style={{ transformOrigin: "69px 34px", animation: !reduced ? "robot-eye-blink 3.8s ease-in-out infinite" : "none" }}>
            <circle cx="60" cy="34" r="4.6" fill="#2de2c9" style={{ filter: "drop-shadow(0 0 4px #2de2c9)" }} />
            <circle cx="78" cy="34" r="4.6" fill="#3b9bff" style={{ filter: "drop-shadow(0 0 4px #3b9bff)" }} />
            <circle cx="61.5" cy="32.5" r="1.4" fill="#ffffff" />
            <circle cx="79.5" cy="32.5" r="1.4" fill="#ffffff" />
          </g>
          {/* Speaker grill */}
          <line x1="61" y1="43" x2="77" y2="43" stroke="#2de2c9" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.75" />
        </g>
      </svg>
    </div>
  );
};

export default BuildingRobot;
