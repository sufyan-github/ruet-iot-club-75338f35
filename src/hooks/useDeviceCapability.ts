import { useState, useEffect } from "react";
import { detectDeviceCapability, type DeviceCapability } from "@/lib/deviceCapability";

export const useDeviceCapability = (): DeviceCapability => {
  const [capability, setCapability] = useState<DeviceCapability>(detectDeviceCapability);

  useEffect(() => {
    // Dynamic FPS monitor safeguard:
    // If during the first 1-2 seconds, the device severely drops frames (e.g. avg frame time > 45ms = < 22 FPS),
    // automatically degrade to lightweight mode to save the user from freezing!
    if (!capability.isLowEnd && typeof window !== "undefined") {
      let frameCount = 0;
      let lastTime = performance.now();
      let slowFrames = 0;
      let rafId: number;

      const monitorFps = (time: number) => {
        const delta = time - lastTime;
        lastTime = time;

        if (delta > 45) {
          slowFrames++;
        }

        frameCount++;
        if (frameCount < 40) {
          rafId = requestAnimationFrame(monitorFps);
        } else {
          // If >= 10 frames out of 40 took > 45ms, switch to lightweight mode
          if (slowFrames >= 10) {
            setCapability((prev) => ({
              ...prev,
              isLowEnd: true,
              canRunHeavyAnimation: false,
              reason: "Frame drop detected (low FPS)",
            }));
          }
        }
      };

      rafId = requestAnimationFrame(monitorFps);
      return () => cancelAnimationFrame(rafId);
    }
  }, [capability.isLowEnd]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setCapability(detectDeviceCapability());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return capability;
};
