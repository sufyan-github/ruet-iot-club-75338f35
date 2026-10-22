import { useState, useEffect } from "react";

// Cache in memory so it processes only once across the entire application
let cachedDataUrl: string | null = null;

export const useTransparentLogo = (src: string): string => {
  const [cleanSrc, setCleanSrc] = useState<string>(cachedDataUrl || src);

  useEffect(() => {
    if (cachedDataUrl) {
      setCleanSrc(cachedDataUrl);
      return;
    }
    if (typeof window === "undefined") return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 200;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Detect white / near-white background pixels and make them transparent
          if (r > 218 && g > 218 && b > 218) {
            data[i + 3] = 0;
          } else if (r > 180 && g > 180 && b > 180) {
            // Anti-aliased feathering on the edges of the logo glyphs
            const avg = (r + g + b) / 3;
            data[i + 3] = Math.max(0, Math.min(255, Math.round((255 - avg) * 3.4)));
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const url = canvas.toDataURL("image/png");
        cachedDataUrl = url;
        setCleanSrc(url);
      } catch {
        // Fallback to original src if canvas access fails
      }
    };
  }, [src]);

  return cleanSrc;
};

export default useTransparentLogo;
