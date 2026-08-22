import { useEffect, useId, useRef } from "react";

let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.ruetTurnstile = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
    document.head.append(script);
  });
  return scriptPromise;
}

export default function TurnstileWidget({
  siteKey,
  action,
  onToken,
  onError,
}: {
  siteKey: string;
  action: string;
  onToken: (token: string) => void;
  onError?: () => void;
}) {
  const reactId = useId().split(":").join("");
  const containerId = `turnstile-${reactId}`;
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widgetId.current = window.turnstile.render(`#${containerId}`, {
          sitekey: siteKey,
          action,
          size: "flexible",
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onError?.(),
        });
      })
      .catch(() => onError?.());
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, [action, containerId, onError, onToken, siteKey]);

  return <div id={containerId} className="min-h-[65px]" aria-label="Security verification" />;
}
