/**
 * Utility for detecting low-configuration / low-performance devices
 * to disable heavy animations, particle loops, and physics loops,
 * ensuring high performance, zero stutter, and low battery/CPU consumption.
 */

export interface DeviceCapability {
  isLowEnd: boolean;
  isReducedMotion: boolean;
  canRunHeavyAnimation: boolean;
  cores: number;
  memoryGb?: number;
  reason?: string;
}

export function isMobilePhoneDevice(): boolean {
  if (typeof window === "undefined") return false;
  const isTouch = "ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  const isMobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isCoarse = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
  // A real handheld mobile phone: touch screen + mobile user-agent + screen width < 640px
  return isMobileUA && isTouch && isCoarse && window.innerWidth < 640;
}

export function detectDeviceCapability(): DeviceCapability {
  if (typeof window === "undefined") {
    return {
      isLowEnd: false,
      isReducedMotion: false,
      canRunHeavyAnimation: true,
      cores: 8,
    };
  }

  // 1. Explicit query parameter overrides (useful for testing or forced mode)
  try {
    const params = new URLSearchParams(window.location.search);
    const perf = params.get("perf");
    if (perf === "low" || perf === "light") {
      return {
        isLowEnd: true,
        isReducedMotion: false,
        canRunHeavyAnimation: false,
        cores: 2,
        reason: "Forced by URL parameter (?perf=low)",
      };
    }
    if (perf === "high" || perf === "full") {
      return {
        isLowEnd: false,
        isReducedMotion: false,
        canRunHeavyAnimation: true,
        cores: 8,
        reason: "Forced by URL parameter (?perf=high)",
      };
    }
    const intro = params.get("intro");
    if (intro === "0") {
      return {
        isLowEnd: true,
        isReducedMotion: false,
        canRunHeavyAnimation: false,
        cores: 2,
        reason: "Intro disabled (?intro=0)",
      };
    }
    if (intro === "force" || intro === "1") {
      return {
        isLowEnd: false,
        isReducedMotion: false,
        canRunHeavyAnimation: true,
        cores: 8,
        reason: "Intro forced (?intro=force)",
      };
    }
  } catch {
    // ignore
  }

  // 2. Reduced motion preference (Accessibility / Battery Saver on Windows, Android, iOS, macOS)
  const isReducedMotion = !!(
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // 3. Data saver / low network mode
  const nav = navigator as any;
  const isSaveData = !!nav?.connection?.saveData;

  // 4. Hardware concurrency (Logical CPU Cores)
  const cores = nav?.hardwareConcurrency || 4;

  // 5. Device RAM (deviceMemory in GB, Chromium only)
  const memoryGb = nav?.deviceMemory;

  // 6. WebGL GPU capability test
  let isSoftwareGpu = false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) {
      isSoftwareGpu = true;
    } else {
      const debugInfo = (gl as WebGLRenderingContext).getExtension(
        "WEBGL_debug_renderer_info"
      );
      if (debugInfo) {
        const renderer =
          (gl as WebGLRenderingContext).getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL
          ) || "";
        if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) {
          isSoftwareGpu = true;
        }
      }
    }
  } catch {
    // ignore
  }

  // 7. Handheld Mobile Phone Check
  // Per user requirement: mobile phones (< 640px touch screen) do not need heavy animations
  const isSmallScreen = isMobilePhoneDevice();

  // Determine low-end / no-heavy-animation status:
  // - If on mobile phone -> heavy animations disabled
  // - If saveData is enabled -> heavy animations disabled
  // - Single-core or ultra-budget (< 1GB RAM)
  const isLowEnd =
    isSmallScreen ||
    isSaveData ||
    cores <= 1 ||
    (typeof memoryGb === "number" && memoryGb < 1);

  return {
    isLowEnd,
    isReducedMotion,
    canRunHeavyAnimation: !isLowEnd,
    cores,
    memoryGb,
    reason: isSmallScreen
      ? "Mobile or small screen (animations disabled)"
      : isReducedMotion
      ? "Reduced motion preferred"
      : isSaveData
      ? "Save-data enabled"
      : isSoftwareGpu
      ? "Software GPU detected"
      : cores <= 4
      ? `Low CPU core count (${cores})`
      : memoryGb && memoryGb <= 4
      ? `Low RAM (${memoryGb}GB)`
      : undefined,
  };
}

export function isLowConfigurationDevice(): boolean {
  return detectDeviceCapability().isLowEnd;
}
