/**
 * IoTLogoTitle — Refined, robotic display lettering for "RUET IoT CLUB".
 *
 * Requirements:
 * - Perfectly centered on page vertical axis.
 * - Base line under title matches title text width EXACTLY (not wider) and does not pass through the robot.
 * - Corner solder pad on top-left of 'R' where soldering iron touches.
 * - Measures 'R' glyph bounding client rect to set capHeight for the resting robot.
 * - Soft gradient feathered mask support for clean reveal of final 'B' and all glyph layers.
 * - Animate only transform and opacity. Respects reduced motion.
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useIntro } from "@/contexts/IntroContext";

interface IoTLogoTitleProps {
  className?: string;
  reduced?: boolean;
  maskProgress?: number | null; // feather center in % (null/undefined means fully visible)
}

export const TITLE_VIEWBOX_WIDTH = 516;
export const TITLE_VIEWBOX_HEIGHT = 108;
export const TITLE_FONT = "'Oxanium', sans-serif";

const IoTLogoTitle = ({ className = "", reduced = false, maskProgress = null }: IoTLogoTitleProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rGlyphRef = useRef<SVGTextElement | null>(null);
  const { setRCapHeight } = useIntro();

  // Measure 'R' glyph height with getBoundingClientRect to ensure robot height exactly matches title cap-height
  useEffect(() => {
    const measure = () => {
      if (rGlyphRef.current) {
        const rect = rGlyphRef.current.getBoundingClientRect();
        if (rect.height > 0) {
          setRCapHeight(rect.height);
        }
      }
    };

    measure();
    // Re-measure after fonts load and on window resize
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [setRCapHeight]);

  // Feathered gradient mask: 8% feather edge mapped to robot position
  // When maskProgress is null or <= -4%, the entire title is 100% visible (mask: none)
  // When maskProgress >= 104%, the entire title is 100% hidden (transparent mask)
  const maskStyle: React.CSSProperties =
    maskProgress === null || maskProgress === undefined || maskProgress <= -4
      ? {
          WebkitMaskImage: "none",
          maskImage: "none",
          opacity: 1,
        }
      : maskProgress >= 104
      ? {
          WebkitMaskImage: "linear-gradient(transparent, transparent)",
          maskImage: "linear-gradient(transparent, transparent)",
          opacity: 0,
        }
      : {
          WebkitMaskImage: `linear-gradient(to right, transparent 0%, transparent ${Math.max(0, maskProgress - 4)}%, black ${Math.min(100, maskProgress + 4)}%, black 100%)`,
          maskImage: `linear-gradient(to right, transparent 0%, transparent ${Math.max(0, maskProgress - 4)}%, black ${Math.min(100, maskProgress + 4)}%, black 100%)`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          opacity: 1,
        };

  return (
    <div
      id="hero-title-text-block"
      className={`relative inline-flex items-center justify-center p-2 overflow-visible select-none ${className}`}
      style={maskStyle}
    >
      <style>{`
        @keyframes iot-dial-needle {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${TITLE_VIEWBOX_WIDTH} ${TITLE_VIEWBOX_HEIGHT}`}
        role="img"
        aria-label="RUET IoT Club"
        className="w-[min(90vw,700px)] h-auto select-none overflow-visible block"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: "drop-shadow(0 4px 18px rgba(0, 0, 0, 0.65))",
        }}
      >
        <defs>
          {/* Luminous Ice-White gradient for RUET */}
          <linearGradient id="ruetWhiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Electric Teal-to-Cyan gradient for IoT */}
          <linearGradient id="iotTealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2de2c9" />
            <stop offset="50%" stopColor="#00d2ff" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Electric Cyan-to-Azure gradient for CLUB */}
          <linearGradient id="clubAzureGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d2ff" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Crisp glowing outline gradient */}
          <linearGradient id="crispOutlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#2de2c9" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
          </linearGradient>

          {/* Delicate circuit pattern for inside glyphs */}
          <pattern id="glyphCircuitDelicate" width="16" height="16" patternUnits="userSpaceOnUse">
            <path
              d="M0 8 H16 M8 0 V16 M3 3 H5 V5 H3 Z M11 11 H13 V13 H11 Z"
              fill="none"
              stroke="#2de2c9"
              strokeWidth="0.75"
              strokeOpacity="0.35"
            />
            <circle cx="5" cy="5" r="1" fill="#2de2c9" opacity="0.6" />
            <circle cx="13" cy="13" r="1" fill="#00d2ff" opacity="0.6" />
          </pattern>

          {/* 3D Depth Soft Shadows with generous bounding box */}
          <filter id="refinedTitleDepth" x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.9" />
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#00d2ff" floodOpacity="0.3" />
          </filter>

          {/* Base trace pulse gradient */}
          <linearGradient id="baseTraceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2de2c9" stopOpacity="0" />
            <stop offset="50%" stopColor="#00d2ff" stopOpacity="1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── Main Glyph Group with Refined 3D Filter ── */}
        <g filter="url(#refinedTitleDepth)">
          {/* 1. "R" OF "RUET" — Shifted right to x=58 for complete clearance from resting robot */}
          <g className="iot-title-letter">
            <text
              ref={rGlyphRef}
              id="r-glyph-element"
              x="58"
              y="76"
              textAnchor="start"
              fill="url(#ruetWhiteGrad)"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              R
            </text>
            <text
              x="58"
              y="76"
              textAnchor="start"
              fill="url(#glyphCircuitDelicate)"
              pointerEvents="none"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              R
            </text>
            <text
              x="58"
              y="76"
              textAnchor="start"
              fill="none"
              stroke="url(#crispOutlineGrad)"
              strokeWidth="0.8"
              pointerEvents="none"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              R
            </text>

            {/* Corner solder pad on top-left corner of R (where robot's soldering iron touches) */}
            <circle cx="61" cy="40" r="3" fill="#081827" stroke="#2de2c9" strokeWidth="1.2" />
            <circle cx="61" cy="40" r="1.4" fill="#2de2c9" />
          </g>

          {/* "UET" OF "RUET" — Seamless tight kerning with R (gap ~2px) */}
          <g className="iot-title-letter">
            <text
              x="90"
              y="76"
              textAnchor="start"
              fill="url(#ruetWhiteGrad)"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              UET
            </text>
            <text
              x="90"
              y="76"
              textAnchor="start"
              fill="url(#glyphCircuitDelicate)"
              pointerEvents="none"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              UET
            </text>
            <text
              x="90"
              y="76"
              textAnchor="start"
              fill="none"
              stroke="url(#crispOutlineGrad)"
              strokeWidth="0.8"
              pointerEvents="none"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              UET
            </text>
          </g>

          {/* 2. REAL CAPITAL "I" IN "IoT" */}
          <g className="iot-title-letter">
            <path
              d="M 208 36 H 230 V 42 H 222 V 70 H 230 V 76 H 208 V 70 H 216 V 42 H 208 Z"
              fill="url(#iotTealGrad)"
            />
            <path
              d="M 208 36 H 230 V 42 H 222 V 70 H 230 V 76 H 208 V 70 H 216 V 42 H 208 Z"
              fill="url(#glyphCircuitDelicate)"
              pointerEvents="none"
            />
            <path
              d="M 208 36 H 230 V 42 H 222 V 70 H 230 V 76 H 208 V 70 H 216 V 42 H 208 Z"
              fill="none"
              stroke="url(#crispOutlineGrad)"
              strokeWidth="0.8"
              pointerEvents="none"
            />
            {/* Solder nodes on I */}
            <circle cx="210" cy="39" r="1.6" fill="#081827" stroke="#2de2c9" strokeWidth="0.8" />
            <circle cx="210" cy="39" r="0.8" fill="#2de2c9" />
            <circle cx="228" cy="39" r="1.6" fill="#081827" stroke="#2de2c9" strokeWidth="0.8" />
            <circle cx="228" cy="39" r="0.8" fill="#2de2c9" />
          </g>

          {/* 3. SENSOR DIAL "o" — Tight 6px spacing from I and T */}
          <g className="iot-title-letter">
            <circle
              cx="254"
              cy="56"
              r="18"
              fill="#081827"
              stroke="url(#iotTealGrad)"
              strokeWidth="3.2"
            />
            <circle
              cx="254"
              cy="56"
              r="18"
              fill="none"
              stroke="url(#crispOutlineGrad)"
              strokeWidth="0.8"
            />
            <circle cx="254" cy="39" r="1.4" fill="#2de2c9" />
            <circle cx="271" cy="56" r="1.4" fill="#00d2ff" />
            <circle cx="254" cy="73" r="1.4" fill="#2de2c9" />
            <circle cx="237" cy="56" r="1.4" fill="#00d2ff" />

            {/* Rotating dial needle */}
            <g
              style={{
                transformOrigin: "254px 56px",
                animation: reduced ? "none" : "iot-dial-needle 12s linear infinite",
              }}
            >
              <line
                x1="254"
                y1="56"
                x2="254"
                y2="42"
                stroke="#2de2c9"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="254" cy="56" r="2.5" fill="#2de2c9" />
            </g>
          </g>

          {/* 4. "T" IN "IoT" — Tight 6px spacing after dial */}
          <g className="iot-title-letter">
            <text
              x="278"
              y="76"
              textAnchor="start"
              fill="url(#iotTealGrad)"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              T
            </text>
            <text
              x="278"
              y="76"
              textAnchor="start"
              fill="url(#glyphCircuitDelicate)"
              pointerEvents="none"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              T
            </text>
            <text
              x="278"
              y="76"
              textAnchor="start"
              fill="none"
              stroke="url(#crispOutlineGrad)"
              strokeWidth="0.8"
              pointerEvents="none"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              T
            </text>
          </g>

          {/* 5. "CLUB" in Electric Azure gradient — Tight letter spacing */}
          <g className="iot-title-letter">
            <text
              x="330"
              y="76"
              textAnchor="start"
              fill="url(#clubAzureGrad)"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              CLUB
            </text>
            <text
              x="330"
              y="76"
              textAnchor="start"
              fill="url(#glyphCircuitDelicate)"
              pointerEvents="none"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              CLUB
            </text>
            <text
              x="330"
              y="76"
              textAnchor="start"
              fill="none"
              stroke="url(#crispOutlineGrad)"
              strokeWidth="0.8"
              pointerEvents="none"
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 800,
                fontSize: "54px",
                letterSpacing: "-0.015em",
              }}
            >
              CLUB
            </text>
          </g>
        </g>

        {/* ── Base Line Under Title matching title text width EXACTLY (58 to 464) ── */}
        {/* Does NOT pass through robot (which is located at x <= 35) */}
        <g>
          <line
            x1="58"
            y1="96"
            x2="464"
            y2="96"
            stroke="#2de2c9"
            strokeWidth="1.2"
            strokeOpacity="0.3"
          />
          <circle cx="58" cy="96" r="2.2" fill="#081827" stroke="#2de2c9" strokeWidth="1" strokeOpacity="0.7" />
          <circle cx="464" cy="96" r="2.2" fill="#081827" stroke="#3b9bff" strokeWidth="1" strokeOpacity="0.7" />

          {!reduced && (
            <motion.rect
              y="94.5"
              width="50"
              height="3"
              rx="1.5"
              fill="url(#baseTraceGrad)"
              initial={{ x: 58 }}
              animate={{
                x: [58, 464, 464],
                opacity: [0, 0.95, 0],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                repeatDelay: 2,
                ease: "easeInOut",
              }}
            />
          )}
        </g>
      </svg>
    </div>
  );
};

export default IoTLogoTitle;
