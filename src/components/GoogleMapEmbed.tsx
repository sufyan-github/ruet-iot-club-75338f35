import { ExternalLink, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

interface GoogleMapEmbedProps {
  address: string;
  embedUrl?: string | null;
  openUrl?: string | null;
  className?: string;
  heightClassName?: string;
}

function allowedGoogleMapsUrl(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" &&
      ["google.com", "www.google.com", "maps.google.com"].includes(host)
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export default function GoogleMapEmbed({
  address,
  embedUrl,
  openUrl,
  className = "",
  heightClassName = "h-56",
}: GoogleMapEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const safeEmbed = useMemo(() => {
    const candidate = allowedGoogleMapsUrl(embedUrl);
    if (!candidate) return null;
    const parsed = new URL(candidate);
    return parsed.pathname.startsWith("/maps") &&
      (parsed.searchParams.get("output") === "embed" ||
        parsed.pathname.includes("/embed"))
      ? parsed.toString()
      : null;
  }, [embedUrl]);
  const safeOpen = useMemo(
    () =>
      allowedGoogleMapsUrl(openUrl) ??
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    [address, openUrl],
  );

  return (
    <div className={className}>
      <div
        className={`relative overflow-hidden rounded-xl border border-border/70 bg-secondary/35 ${heightClassName}`}
      >
        {safeEmbed ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 grid place-items-center bg-card text-center text-sm text-muted-foreground">
                <span>
                  <MapPin className="mx-auto mb-2 text-primary" size={24} />
                  Loading verified RUET location…
                </span>
              </div>
            )}
            <iframe
              src={safeEmbed}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="RUET IoT Club location at Rajshahi University of Engineering & Technology"
              onLoad={() => setLoaded(true)}
              className="absolute inset-0 h-full w-full"
            />
          </>
        ) : (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <MapPin className="mx-auto text-primary" size={28} />
              <p className="mt-3 font-medium">Map preview unavailable</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {address || "A verified location has not been configured yet."}
              </p>
            </div>
          </div>
        )}
      </div>
      <a
        href={safeOpen}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        Open in Google Maps <ExternalLink size={14} />
      </a>
    </div>
  );
}
