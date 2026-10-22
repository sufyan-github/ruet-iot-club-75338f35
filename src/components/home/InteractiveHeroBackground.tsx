/**
 * InteractiveHeroBackground — High performance 60fps hero atmosphere.
 *
 * Requirements:
 * 1. Background node network:
 *    - Reduced density by half: 25-30 nodes on desktop, ~12 on mobile.
 *    - Fainter connecting lines, only between near neighbours (dist < 85px).
 *    - Connect to cursor on desktop only.
 * 2. Background icons & tiny robots:
 *    - Faint floating electronics icons (chip, resistor, ESP32, sensor, Wi-Fi, gear) at 8-12% opacity.
 *    - 4-5 tiny line-art robots (30-40px, same style as intro robot) drifting across background at 8-12% opacity.
 *    - Different speeds and directions (some L→R, some R→L, some floating up & down).
 * 3. Coding-vibe layer integrated on edges & corners.
 * 4. Soft animated aurora glows & vignette.
 * 5. Paused when tab is hidden, disabled under reduced motion, 60fps.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useIntro } from "@/contexts/IntroContext";

// ─── Tiny Line-Art Robot (Ambient Sci-Fi Cyber Companion) ─────────────────
const TinyRobot = ({ color = "#2de2c9" }: { color?: string }) => (
  <svg
    viewBox="0 0 36 52"
    width="34"
    height="48"
    fill="none"
    stroke={color}
    strokeWidth="1.6"
    className="overflow-visible"
    aria-hidden="true"
    style={{ filter: `drop-shadow(0 0 10px ${color}88)` }}
  >
    {/* Antenna with pulsing beacon */}
    <line x1="18" y1="8" x2="18" y2="2" strokeLinecap="round" strokeWidth="1.8" />
    <circle cx="18" cy="2" r="2.2" fill={color} style={{ animation: "tiny-robot-antenna 2s ease-in-out infinite" }} />
    {/* Antenna signal ring */}
    <circle cx="18" cy="2" r="4.5" stroke={color} strokeWidth="0.75" strokeOpacity="0.6" style={{ animation: "tiny-robot-wave 2s ease-out infinite" }} />
    {/* Head */}
    <rect x="8" y="8" width="20" height="15" rx="3.5" fill="#081524" stroke={color} strokeWidth="1.6" />
    {/* Glowing Eyes with Blink Animation */}
    <g style={{ animation: "robot-eye-blink 3.8s ease-in-out infinite", transformOrigin: "18px 15px" }}>
      <circle cx="13" cy="15" r="2" fill={color} />
      <circle cx="23" cy="15" r="2" fill="#00d2ff" />
    </g>
    {/* Body */}
    <rect x="7" y="25" width="22" height="19" rx="3" fill="#081524" stroke="#3b9bff" strokeWidth="1.6" />
    <line x1="11" y1="31" x2="25" y2="31" stroke={color} strokeWidth="1" strokeOpacity="0.8" />
    <circle cx="18" cy="37" r="1.8" fill={color} />
    {/* Arms */}
    <line x1="7" y1="27" x2="2" y2="36" strokeLinecap="round" strokeWidth="1.6" stroke={color} />
    <line x1="29" y1="27" x2="34" y2="36" strokeLinecap="round" strokeWidth="1.6" stroke="#3b9bff" />
    {/* Legs */}
    <line x1="12" y1="44" x2="10" y2="52" strokeLinecap="round" strokeWidth="1.8" stroke={color} />
    <line x1="24" y1="44" x2="26" y2="52" strokeLinecap="round" strokeWidth="1.8" stroke="#3b9bff" />
  </svg>
);

// ─── Cyber Audio Synthesizer (Crisp Sci-Fi Sonic Blast Feedback) ─────────────
const playBlastSound = () => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.20);
  } catch {
    // Fail silently if audio context is blocked
  }
};

// ─── Tiny Line-Art Quadcopter Drone (Subtle, Ambient, Low-Visibility) ─────────
const TinyDrone = ({
  color = "#2de2c9",
  isHovered = false,
}: {
  color?: string;
  isHovered?: boolean;
}) => (
  <svg
    viewBox="0 0 64 40"
    width="54"
    height="34"
    fill="none"
    stroke={color}
    strokeWidth="1.3"
    className="overflow-visible select-none"
    aria-hidden="true"
    style={{
      filter: isHovered
        ? `drop-shadow(0 0 6px ${color})`
        : `drop-shadow(0 0 4px ${color}55)`,
    }}
  >
    {/* Central cockpit chassis */}
    <rect x="22" y="13" width="20" height="13" rx="3.5" fill="#081524" stroke={color} strokeWidth="1.4" />
    
    {/* Camera gimbal with blinking optical sensor */}
    <circle cx="32" cy="19.5" r="3" stroke={color} strokeWidth="1.1" fill="#050b14" />
    <circle cx="32" cy="19.5" r="1.3" fill={color} fillOpacity="0.8" />
    
    {/* 4 Carbon fiber arms */}
    <line x1="22" y1="14" x2="11" y2="7" strokeWidth="1.4" stroke={color} />
    <line x1="42" y1="14" x2="53" y2="7" strokeWidth="1.4" stroke={color} />
    <line x1="22" y1="25" x2="11" y2="33" strokeWidth="1.4" stroke={color} />
    <line x1="42" y1="25" x2="53" y2="33" strokeWidth="1.4" stroke={color} />

    {/* 4 Motor hubs */}
    <circle cx="11" cy="7" r="2.8" stroke={color} strokeWidth="1.2" fill="#050b14" />
    <circle cx="53" cy="7" r="2.8" stroke={color} strokeWidth="1.2" fill="#050b14" />
    <circle cx="11" cy="33" r="2.8" stroke={color} strokeWidth="1.2" fill="#050b14" />
    <circle cx="53" cy="33" r="2.8" stroke={color} strokeWidth="1.2" fill="#050b14" />

    {/* Spinning Propeller Blades (lightweight rotor blur with will-change optimization) */}
    <g className="drone-rotor-cw" style={{ transformOrigin: "11px 7px", willChange: "transform" }}>
      <ellipse cx="11" cy="7" rx="8" ry="2" stroke={color} strokeWidth="1" strokeOpacity="0.75" fill={color} fillOpacity="0.18" />
      <line x1="3" y1="7" x2="19" y2="7" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </g>
    <g className="drone-rotor-ccw" style={{ transformOrigin: "53px 7px", willChange: "transform" }}>
      <ellipse cx="53" cy="7" rx="8" ry="2" stroke={color} strokeWidth="1" strokeOpacity="0.75" fill={color} fillOpacity="0.18" />
      <line x1="45" y1="7" x2="61" y2="7" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </g>
    <g className="drone-rotor-ccw" style={{ transformOrigin: "11px 33px", willChange: "transform" }}>
      <ellipse cx="11" cy="33" rx="8" ry="2" stroke={color} strokeWidth="1" strokeOpacity="0.75" fill={color} fillOpacity="0.18" />
      <line x1="3" y1="33" x2="19" y2="33" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </g>
    <g className="drone-rotor-cw" style={{ transformOrigin: "53px 33px", willChange: "transform" }}>
      <ellipse cx="53" cy="33" rx="8" ry="2" stroke={color} strokeWidth="1" strokeOpacity="0.75" fill={color} fillOpacity="0.18" />
      <line x1="45" y1="33" x2="61" y2="33" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </g>

    {/* Navigation LEDs */}
    <circle cx="11" cy="7" r="1.2" fill="#ff4d4d" />
    <circle cx="53" cy="7" r="1.2" fill="#2de2c9" />
    <circle cx="27" cy="16" r="1" fill="#3b9bff" />
    <circle cx="37" cy="16" r="1" fill="#3b9bff" />
  </svg>
);

// ─── SVG Electronics Icons ───────────────────────────────────────────────────
const ChipIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="5" y="5" width="14" height="14" rx="2" strokeOpacity="0.9" />
    <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.15" />
    <path d="M1 9h4M1 12h4M1 15h4M19 9h4M19 12h4M19 15h4M9 1v4M12 1v4M15 1v4M9 19v4M12 19v4M15 19v4" />
  </svg>
);

const ResistorIcon = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M1 12h5l2-4 3 8 3-8 3 8 2-4h5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ESP32Icon = () => (
  <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M7 5h10M7 7h4v2h2V7h4" strokeWidth="1.2" />
    <rect x="7" y="11" width="10" height="7" rx="1" fill="currentColor" fillOpacity="0.15" />
    <path d="M2 9h2M2 12h2M2 15h2M20 9h2M20 12h2M20 15h2" strokeLinecap="round" />
  </svg>
);

const SensorIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.18" />
    <path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10" strokeLinecap="round" />
    <path d="M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16" strokeLinecap="round" strokeOpacity="0.7" />
  </svg>
);

const WiFiIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M2 8.5a14 14 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5.5 5.5 0 0 1 7 0M12 19h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ─── Dynamic Moving Drone Types ───────────────────────────────────────────────
export interface FlyingDrone {
  id: number;
  x: number;
  y: number;
  baseY: number;
  vx: number;
  vy: number;
  amplitude: number;
  freq: number;
  phase: number;
  tilt: number;
  color: string;
  isBlasting: boolean;
  isHovered: boolean;
}

export interface BlastData {
  id: number;
  x: number;
  y: number;
  color: string;
  sparks: { tx: number; ty: number }[];
}

const DRONE_COLORS = ["#2de2c9", "#3b9bff", "#00d2ff", "#a78bfa", "#38ef7d"];

let droneIdCounter = 10;
let blastIdCounter = 1;

// Helper: generate a drone at a random location with active flight trajectory
const createRandomDrone = (
  id: number,
  w: number,
  h: number,
  customX?: number,
  customY?: number,
  customVx?: number,
  customVy?: number
): FlyingDrone => {
  const safeW = typeof window !== "undefined" ? Math.max(window.innerWidth, w || 1000) : 1200;
  const safeH = typeof window !== "undefined" ? Math.max(window.innerHeight, h || 700) : 800;
  const x = customX !== undefined ? customX : 80 + Math.random() * Math.max(200, safeW - 180);
  const y = customY !== undefined ? customY : 80 + Math.random() * Math.max(150, safeH - 180);
  const dir = Math.random() > 0.5 ? 1 : -1;
  // Calm, very slow ambient drone speed (reduced for smooth performance and zero distraction)
  const speed = 0.38 + Math.random() * 0.24;
  const vx = customVx !== undefined ? customVx : dir * speed;
  const vy = customVy !== undefined ? customVy : (Math.random() - 0.5) * 0.25;
  const colorIdx = Math.floor(Math.random() * DRONE_COLORS.length);

  return {
    id,
    x,
    y,
    baseY: y,
    vx,
    vy,
    amplitude: 6 + Math.random() * 6,
    freq: 0.018 + Math.random() * 0.012,
    phase: Math.random() * Math.PI * 2,
    tilt: vx > 0 ? 3 : -3,
    color: DRONE_COLORS[colorIdx],
    isBlasting: false,
    isHovered: false,
  };
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const InteractiveHeroBackground = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);


  // Check device capability & screen size (mobile/tablet < 1024px needs NO background animations)
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { isLowEnd, canRunHeavyAnimation } = useDeviceCapability();
  const isLightweight = isLowEnd || !canRunHeavyAnimation || !isDesktop;

  // Active drones state (2 calm ambient drones on desktop, 0 on mobile)
  const [drones, setDrones] = useState<FlyingDrone[]>(() => {
    if (isLightweight || !isDesktop) return [];
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    return [
      createRandomDrone(1, w, h, w * 0.18, h * 0.25, 0.48),
      createRandomDrone(2, w, h, w * 0.82, h * 0.55, -0.48),
    ];
  });

  const [blasts, setBlasts] = useState<BlastData[]>([]);

  // Drones master ref - strictly tracks in-flight physics coordinates without state overwrites
  const dronesRef = useRef<FlyingDrone[]>(drones);
  const droneElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const boundsRef = useRef({ width: 1200, height: 800 });
  const isVisibleRef = useRef(true);

  // IntersectionObserver: automatically pause animation loops when scrolled off screen!
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update container dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        boundsRef.current = {
          width: containerRef.current.offsetWidth || window.innerWidth,
          height: containerRef.current.offsetHeight || window.innerHeight,
        };
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Track cursor position inside hero container (only on capable devices)
  useEffect(() => {
    if (isLightweight) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !isVisibleRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999, active: false };
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [isLightweight]);

  // Handler: When a drone is hit by cursor or click -> Subtle blast! Then spawn replacement drone immediately visible!
  const handleDroneHit = useCallback((id: number) => {
    const drone = dronesRef.current.find(d => d.id === id);
    if (!drone || drone.isBlasting) return;
    drone.isBlasting = true;

    // Play subtle audio cue
    playBlastSound();

    const blastX = drone.x + 27;
    const blastY = drone.y + 17;
    const blastColor = drone.color;

    // Generate 6 refined, crisp cyber sparks with compact radius (16px to 26px)
    const sparks = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * 60 + (Math.random() * 16 - 8)) * (Math.PI / 180);
      const dist = 16 + Math.random() * 10;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
      };
    });

    const newBlast: BlastData = {
      id: blastIdCounter++,
      x: blastX,
      y: blastY,
      color: blastColor,
      sparks,
    };

    setBlasts(prev => [...prev, newBlast]);
    setTimeout(() => {
      setBlasts(prev => prev.filter(b => b.id !== newBlast.id));
    }, 360);

    // Spawn replacement drone immediately visible on screen!
    const bounds = boundsRef.current;
    const w = bounds.width || window.innerWidth || 1200;
    const h = bounds.height || window.innerHeight || 800;
    const isLeftHalf = blastX < w / 2;

    const spawnX = isLeftHalf
      ? w * 0.52 + Math.random() * Math.max(100, w * 0.38)
      : 80 + Math.random() * Math.max(100, w * 0.38);
    const spawnY = 80 + Math.random() * Math.max(100, h - 220);
    const spawnDir = isLeftHalf ? -1 : 1;
    const spawnVx = spawnDir * (0.38 + Math.random() * 0.24);
    const spawnVy = (Math.random() - 0.5) * 0.25;

    const replacementDrone = createRandomDrone(
      droneIdCounter++,
      w,
      h,
      spawnX,
      spawnY,
      spawnVx,
      spawnVy
    );

    // Update master ref directly
    dronesRef.current = dronesRef.current.filter(d => d.id !== id).concat(replacementDrone);
    // Sync state for React to render new list
    setDrones([...dronesRef.current]);
  }, []);

  const handleDroneHitRef = useRef(handleDroneHit);
  useEffect(() => {
    handleDroneHitRef.current = handleDroneHit;
  }, [handleDroneHit]);

  // Check intro status to pause background loops while intro robot is walking
  const { heroRevealStarted, phase } = useIntro();
  const isHeroActive = heroRevealStarted || phase === "done";
  const isHeroActiveRef = useRef(isHeroActive);
  isHeroActiveRef.current = isHeroActive;

  // 60fps RAF loop: smooth autonomous drone flight in random paths (only runs on capable devices when visible)
  useEffect(() => {
    if (isLightweight) return;
    let rafId: number;

    const flightLoop = () => {
      // Pause loop calculations when scrolled out of view, tab is hidden, or intro walk is playing
      if (!isVisibleRef.current || document.hidden || !isHeroActiveRef.current) {
        rafId = requestAnimationFrame(flightLoop);
        return;
      }

      const bounds = boundsRef.current;
      const w = bounds.width || window.innerWidth || 1200;
      const h = bounds.height || window.innerHeight || 800;
      const { x: mx, y: my, active: mouseActive } = mouseRef.current;

      const activeDrones = dronesRef.current;
      for (let i = 0; i < activeDrones.length; i++) {
        const drone = activeDrones[i];
        if (drone.isBlasting) continue;

        // Cruise horizontally and drift vertically (always active flight)
        drone.x += drone.vx;
        drone.baseY += drone.vy;

        // Bounce vertically if approaching upper/lower margins
        if (drone.baseY < 50) {
          drone.baseY = 50;
          drone.vy = Math.abs(drone.vy);
        } else if (drone.baseY > h - 90) {
          drone.baseY = h - 90;
          drone.vy = -Math.abs(drone.vy);
        }

        // Natural sinusoidal hover bobbing
        drone.phase += drone.freq;
        const currentY = drone.baseY + Math.sin(drone.phase) * drone.amplitude;
        drone.y = currentY;

        // Wrap around screen edges smoothly
        if (drone.vx > 0 && drone.x > w + 45) {
          drone.x = -50;
          drone.baseY = 60 + Math.random() * Math.max(100, h - 160);
          drone.vy = (Math.random() - 0.5) * 0.7;
        } else if (drone.vx < 0 && drone.x < -50) {
          drone.x = w + 45;
          drone.baseY = 60 + Math.random() * Math.max(100, h - 160);
          drone.vy = (Math.random() - 0.5) * 0.7;
        }

        drone.tilt = drone.vx > 0 ? 5 : -5;

        // Direct DOM transform update for ultra-smooth 60fps performance
        const el = droneElementsRef.current.get(drone.id);
        if (el) {
          el.style.transform = `translate3d(${drone.x}px, ${currentY}px, 0) rotate(${drone.tilt}deg)`;
        }

        // Proximity check with cursor
        if (mouseActive) {
          const cx = drone.x + 27;
          const cy = currentY + 17;
          const distSq = (mx - cx) ** 2 + (my - cy) ** 2;

          // Target acquisition hover state within 55px
          const isNear = distSq < 55 * 55;
          if (drone.isHovered !== isNear) {
            drone.isHovered = isNear;
            if (el) {
              el.style.opacity = isNear ? "0.85" : "0.35";
            }
          }

          // Detonation hit radius: 36px
          if (distSq < 36 * 36) {
            handleDroneHitRef.current(drone.id);
            break;
          }
        }
      }

      rafId = requestAnimationFrame(flightLoop);
    };

    rafId = requestAnimationFrame(flightLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isLightweight]);

  // Canvas particle network loop (optimized with distSq pre-check & paused when not visible)
  useEffect(() => {
    if (isLightweight || !isDesktop) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight);

    // Desktop pointer detection
    const isDesktopPointer =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches &&
      !("ontouchstart" in window);

    const isMobile = width < 768;

    // Calibrated node density: ~20 on desktop (down from 28 to reduce comparisons by 40%), ~10 on mobile
    const targetCount = isMobile ? 10 : 20;

    const mouse = { x: -1000, y: -1000, active: false };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDesktopPointer || !isVisibleRef.current) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    const nodes = Array.from({ length: targetCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: Math.random() * 0.8 + 1.2,
    }));

    let rafId: number;
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && isVisibleRef.current) {
        rafId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const reach = isMobile ? 70 : 95;
    const reachSq = reach * reach;

    const render = () => {
      if (!isTabVisible || !isVisibleRef.current || !isHeroActiveRef.current) {
        rafId = requestAnimationFrame(render);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      // Draw & update nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        n.x += n.vx;
        n.y += n.vy;

        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;

        // Connect to cursor gently: check distSq < 14400 before Math.sqrt
        if (mouse.active && isDesktopPointer) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 14400 && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / 120) * 0.04;
            n.x += (dx / dist) * force;
            n.y += (dy / dist) * force;

            // Faint cursor connection line
            ctx.strokeStyle = `rgba(0, 210, 255, ${(1 - dist / 120) * 0.25})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // Draw node dot — 28% opacity
        ctx.fillStyle = "rgba(45, 226, 201, 0.28)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect neighbours with elegant faint lines (reach 95px, alpha 0.10)
        // Optimization: check distSq < reachSq BEFORE computing Math.sqrt!
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < reachSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / reach) * 0.10;
            ctx.strokeStyle = `rgba(45, 226, 201, ${alpha})`;
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLightweight]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes float-drift-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes float-drift-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-16px) rotate(-3deg); }
        }
        @keyframes robot-drift-ltr {
          0%   { transform: translate(-25px, 0) rotate(-1deg); }
          50%  { transform: translate(30px, -15px) rotate(1deg); }
          100% { transform: translate(-25px, 0) rotate(-1deg); }
        }
        @keyframes robot-drift-rtl {
          0%   { transform: translate(25px, 0) rotate(1deg); }
          50%  { transform: translate(-30px, 14px) rotate(-1deg); }
          100% { transform: translate(25px, 0) rotate(1deg); }
        }
        @keyframes robot-float-v {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-18px); }
        }
        @keyframes robot-eye-blink {
          0%, 88%, 94%, 100% { transform: scaleY(1); opacity: 1; }
          91%                { transform: scaleY(0.1); opacity: 0.2; }
        }
        @keyframes tiny-robot-antenna {
          0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 2px #2de2c9); }
          50%      { opacity: 1; filter: drop-shadow(0 0 8px #2de2c9); transform: scale(1.25); }
        }
        @keyframes tiny-robot-wave {
          0%   { opacity: 0.8; transform: scale(0.8); }
          100% { opacity: 0;   transform: scale(1.6); }
        }
        /* High-speed rotor spins */
        @keyframes rotor-spin-cw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes rotor-spin-ccw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        .drone-rotor-cw {
          animation: rotor-spin-cw 0.12s linear infinite;
        }
        .drone-rotor-ccw {
          animation: rotor-spin-ccw 0.12s linear infinite;
        }
        /* Refined, compact cyber blast effects */
        @keyframes blast-shockwave {
          0%   { transform: scale(0.25); opacity: 0.70; border-width: 1.2px; }
          40%  { opacity: 0.50; }
          100% { transform: scale(1.45); opacity: 0; border-width: 0.5px; }
        }
        @keyframes blast-core-flash {
          0%   { transform: scale(0.35); opacity: 0.75; }
          30%  { transform: scale(1.15); opacity: 0.55; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes blast-spark-fly {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.85; }
          50%  { opacity: 0.60; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.2); opacity: 0; }
        }
      `}</style>

      {/* ── 1. Subtle Circuit Grid (Ultra-lightweight static SVG) ── */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id="hero-circuit-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0 L0 0 0 60" fill="none" stroke="#2de2c9" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-circuit-grid)" />
      </svg>

      {/* ── 2. Soft Animated Aurora Glows (GPU layer isolated with contain:paint) ── */}
      <div
        className="absolute -top-24 left-[10%] w-[680px] h-[550px] rounded-full pointer-events-none"
        style={{
          background: isLightweight
            ? "radial-gradient(ellipse 65% 50% at 50% 50%, rgba(45, 226, 201, 0.08) 0%, transparent 70%)"
            : "radial-gradient(ellipse 65% 50% at 50% 50%, rgba(45, 226, 201, 0.10) 0%, rgba(45, 226, 201, 0.02) 50%, transparent 75%)",
          filter: isLightweight ? "none" : "blur(50px)",
          transform: "translate3d(0,0,0)",
          contain: "paint",
        }}
      />
      <div
        className="absolute -bottom-20 right-[5%] w-[650px] h-[550px] rounded-full pointer-events-none"
        style={{
          background: isLightweight
            ? "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59, 155, 255, 0.07) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59, 155, 255, 0.08) 0%, rgba(59, 155, 255, 0.02) 50%, transparent 75%)",
          filter: isLightweight ? "none" : "blur(60px)",
          transform: "translate3d(0,0,0)",
          contain: "paint",
        }}
      />

      {/* ── 3. Subtle Ambient Node-Network Canvas (Only rendered on capable desktop devices) ── */}
      {!isLightweight && isDesktop && (
        <canvas ref={canvasRef} className="hidden lg:block absolute inset-0 w-full h-full z-0" />
      )}

      {/* ── 4. Floating Electronics Icons (Only rendered on capable desktop devices) ── */}
      {!isLightweight && isDesktop && (
        <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute top-[18%] left-[8%] text-[#2de2c9] opacity-[0.10]"
            style={{ animation: "float-drift-1 16s ease-in-out infinite" }}
          >
            <ChipIcon />
          </div>
          <div
            className="absolute top-[22%] right-[10%] text-[#3b9bff] opacity-[0.09]"
            style={{ animation: "float-drift-2 20s ease-in-out infinite", animationDelay: "-4s" }}
          >
            <ResistorIcon />
          </div>
          <div
            className="absolute bottom-[20%] left-[10%] text-[#2de2c9] opacity-[0.09]"
            style={{ animation: "float-drift-1 18s ease-in-out infinite", animationDelay: "-8s" }}
          >
            <ESP32Icon />
          </div>
          <div
            className="absolute bottom-[22%] right-[12%] text-[#2de2c9] opacity-[0.09]"
            style={{ animation: "float-drift-2 22s ease-in-out infinite", animationDelay: "-11s" }}
          >
            <SensorIcon />
          </div>
          <div
            className="absolute top-[48%] right-[6%] text-[#3b9bff] opacity-[0.08]"
            style={{ animation: "float-drift-1 19s ease-in-out infinite", animationDelay: "-6s" }}
          >
            <WiFiIcon />
          </div>
          <div
            className="absolute top-[52%] left-[6%] text-[#2de2c9] opacity-[0.09]"
            style={{ animation: "float-drift-2 24s ease-in-out infinite", animationDelay: "-14s" }}
          >
            <GearIcon />
          </div>
        </div>
      )}

      {/* ── 5. Floating Tiny Robots (Only rendered on capable desktop devices) ── */}
      {!isLightweight && isDesktop && (
        <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Robot 1: Top-left */}
          <div
            className="absolute top-[15%] left-[12%] opacity-[0.38]"
            style={{ animation: "robot-drift-ltr 22s ease-in-out infinite" }}
          >
            <TinyRobot color="#2de2c9" />
          </div>

          {/* Robot 2: Top-right */}
          <div
            className="absolute top-[22%] right-[14%] opacity-[0.34]"
            style={{ animation: "robot-drift-rtl 26s ease-in-out infinite", animationDelay: "-7s" }}
          >
            <TinyRobot color="#38bdf8" />
          </div>

          {/* Robot 3: Lower-left */}
          <div
            className="absolute bottom-[22%] left-[10%] opacity-[0.36]"
            style={{ animation: "robot-float-v 18s ease-in-out infinite", animationDelay: "-3s" }}
          >
            <TinyRobot color="#2de2c9" />
          </div>

          {/* Robot 4: Lower-right */}
          <div
            className="absolute bottom-[18%] right-[16%] opacity-[0.35]"
            style={{ animation: "robot-drift-ltr 24s ease-in-out infinite", animationDelay: "-11s" }}
          >
            <TinyRobot color="#00d2ff" />
          </div>
        </div>
      )}

      {/* ── 6. Dynamic Moving Drones & Subtle Blast Particles (Only on capable desktop devices) ── */}
      {!isLightweight && isDesktop && (
        <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none z-10">
          {/* Active Flying Autonomous Drones */}
          {drones.map(drone => (
            <div
              key={drone.id}
              ref={el => {
                if (el) {
                  droneElementsRef.current.set(drone.id, el);
                  el.style.transform = `translate3d(${drone.x}px, ${drone.y}px, 0) rotate(${drone.tilt}deg)`;
                } else {
                  droneElementsRef.current.delete(drone.id);
                }
              }}
              className="absolute top-0 left-0 pointer-events-auto cursor-crosshair transition-opacity duration-200"
              style={{
                opacity: drone.isHovered ? 0.85 : 0.35,
                willChange: "transform",
              }}
              onMouseEnter={() => handleDroneHit(drone.id)}
              onClick={() => handleDroneHit(drone.id)}
              title="Interactive IoT Drone — Hover to Blast"
            >
              <TinyDrone color={drone.color} isHovered={drone.isHovered} />
            </div>
          ))}

          {/* Detonation Blast Particle Explosions */}
          {blasts.map(blast => (
            <div
              key={blast.id}
              className="absolute pointer-events-none"
              style={{
                left: `${blast.x}px`,
                top: `${blast.y}px`,
                transform: "translate(-50%, -50%)",
                zIndex: 50,
              }}
            >
              {/* Compact Refined Expanding Shockwave Ring */}
              <div
                className="absolute -inset-3.5 rounded-full border"
                style={{
                  borderColor: blast.color,
                  boxShadow: `0 0 6px ${blast.color}44`,
                  animation: "blast-shockwave 0.36s cubic-bezier(0.1, 0.8, 0.3, 1) forwards",
                }}
              />

              {/* Subtle Core Energy Flash */}
              <div
                className="w-4 h-4 -ml-2 -mt-2 rounded-full"
                style={{
                  background: `radial-gradient(circle, #ffffff 0%, ${blast.color} 55%, transparent 100%)`,
                  boxShadow: `0 0 8px ${blast.color}66`,
                  animation: "blast-core-flash 0.30s ease-out forwards",
                }}
              />

              {/* Compact Radiant Sparks */}
              {blast.sparks.map((spark, idx) => (
                <span
                  key={idx}
                  className="absolute block w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : blast.color,
                    boxShadow: `0 0 3px ${blast.color}`,
                    animation: "blast-spark-fly 0.36s cubic-bezier(0.12, 0.88, 0.35, 1) forwards",
                    ["--tx" as string]: `${spark.tx}px`,
                    ["--ty" as string]: `${spark.ty}px`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── 7. Soft Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(5, 11, 20, 0.55) 80%, #050b14 100%)",
        }}
      />
    </div>
  );
};

export default InteractiveHeroBackground;
