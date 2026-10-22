// ─── Animation constants ────────────────────────────────────────────────────
// All durations are in seconds. All easings are cubic-bezier arrays or named
// strings accepted by Framer Motion.
// To change timings globally, edit this file only.

// Easings
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_STAGE_RISE = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.45, 0, 0.55, 1] as const;
export const EASE_OUT = [0, 0, 0.2, 1] as const;

// Cubic bezier evaluator for step interpolation
export function createCubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number) {
    return ((ax * t + bx) * t + cx) * t;
  }
  function sampleCurveY(t: number) {
    return ((ay * t + by) * t + cy) * t;
  }
  function sampleCurveDerivativeX(t: number) {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveCurveX(x: number) {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t) - x;
      if (Math.abs(x2) < 1e-5) return t;
      const d2 = sampleCurveDerivativeX(t);
      if (Math.abs(d2) < 1e-5) break;
      t -= x2 / d2;
    }
    return t;
  }

  return function ease(x: number) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleCurveY(solveCurveX(x));
  };
}

export const easeStageRise = createCubicBezier(0.22, 1, 0.36, 1);

// Spring presets
export const SPRING_GENTLE = { type: "spring", stiffness: 200, damping: 30, mass: 1 } as const;
export const SPRING_SNAPPY = { type: "spring", stiffness: 400, damping: 40, mass: 0.8 } as const;
export const SPRING_SLOW   = { type: "spring", stiffness: 100, damping: 25, mass: 1.2 } as const;

// Durations
export const DUR_XS  = 0.15;
export const DUR_SM  = 0.25;
export const DUR_MD  = 0.45;
export const DUR_LG  = 0.65;
export const DUR_XL  = 0.9;

// Intro & Transition timing constants
export const INTRO_WALK_DESKTOP = 2.4; // Phase 1 walk left (calm natural pace)
export const INTRO_HOLD_DURATION = 0.2; // Hold with finished pose
export const INTRO_RISE_DURATION = 0.85; // Stage rise from intro offset to 0
export const INTRO_BACKDROP_FADE = 0.7; // Backdrop fade duration
export const INTRO_TOTAL_DESKTOP = 4.55; // total intro sequence length (~4.55s)
export const INTRO_TOTAL_MOBILE  = 1.8; // mobile PCB trace draw
export const HERO_STAGGER_INTERVAL = 0.18; // 0.18s apart for crisp reveal
export const HERO_RISE_DISTANCE = 16;     // px rising for staggered items
export const BACKGROUND_FADE_DURATION = 1.0; // 1.0s fade-in for ambient background

// Stagger helpers
export const staggerChildren = (stagger = 0.07, delayChildren = 0) => ({
  staggerChildren: stagger,
  delayChildren,
});

// Fade-up preset (rising 16px with fade, ease-out over 0.7s as requested)
export const heroStaggerItem = {
  hidden: { opacity: 0, y: HERO_RISE_DISTANCE },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT, delay },
  }),
};

// Generic fadeUp (compatible with existing references)
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT, delay },
  }),
};

// Fade-in preset
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.7, ease: EASE_OUT, delay },
  }),
};
