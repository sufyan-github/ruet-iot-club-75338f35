import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SectionHeading from "@/components/SectionHeading";
import { ExternalLink, Handshake, ArrowRight } from "lucide-react";
import {
  fetchPartners,
  getCachedPartners,
  type PartnerData,
} from "@/lib/partnersService";
import { supabase } from "@/integrations/supabase/client";

// ─── Real Partner Logos matching the user's reference ──────────────────────

const IIDLogo = () => (
  <div className="flex items-center justify-center h-16 w-full">
    <div className="flex items-center gap-3">
      {/* IID Node Monogram */}
      <svg width="44" height="40" viewBox="0 0 54 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 16 C10 10, 16 6, 24 6 C32 6, 38 10, 38 16 C38 21, 33 24, 27 26 L27 36"
          stroke="#00d2ff"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="10" cy="16" r="4" fill="#0096c7" />
        <circle cx="24" cy="6" r="4" fill="#2de2c9" />
        <circle cx="38" cy="16" r="4" fill="#00b4d8" />
        <circle cx="27" cy="36" r="4" fill="#48cae4" />
        <path d="M10 26 L10 40" stroke="#00b4d8" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M44 20 L44 40" stroke="#0096c7" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="10" cy="40" r="3" fill="#0077b6" />
        <circle cx="44" cy="20" r="3" fill="#00b4d8" />
        <circle cx="44" cy="40" r="3" fill="#0077b6" />
      </svg>
      <div className="text-left font-sans leading-tight">
        <div className="text-[10px] tracking-wider font-semibold text-[#60d5ff]">Institute for</div>
        <div className="text-[10px] tracking-wider font-semibold text-[#60d5ff]">Informed</div>
        <div className="text-[10px] tracking-wider font-semibold text-[#60d5ff]">Development</div>
      </div>
    </div>
  </div>
);

const TheEarthSocietyLogo = () => (
  <div className="flex flex-col items-center justify-center h-16 w-full">
    <div className="flex flex-col items-center">
      <span className="font-serif text-[11px] font-semibold text-[#eab308] tracking-widest uppercase opacity-90">
        The
      </span>
      <div className="relative font-serif text-2xl font-extrabold text-[#eab308] tracking-wide flex items-center -mt-1 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">
        <span>E</span>
        <span className="relative inline-block mx-0.5">
          <span>a</span>
          {/* Smiley eye dots & smile curve inside 'a' */}
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            <span className="w-0.5 h-0.5 rounded-full bg-[#eab308]" />
            <span className="w-0.5 h-0.5 rounded-full bg-[#eab308]" />
          </span>
          <svg className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-1.5" viewBox="0 0 12 6" fill="none">
            <path d="M2 1 Q6 5 10 1" stroke="#eab308" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        <span>rth</span>
      </div>
    </div>
  </div>
);

const YouthForCareLogo = () => (
  <div className="flex items-center justify-center h-16 w-full">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2de2c9]/20 to-[#00d2ff]/30 border border-[#2de2c9]/45 flex items-center justify-center shadow-[0_0_14px_rgba(45,226,201,0.3)]">
        {/* Heart & caring hands emblem */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2de2c9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      </div>
      <div className="text-left leading-tight font-sans">
        <div className="text-xs font-semibold text-[#f0f9ff] tracking-wide">Youth For</div>
        <div className="text-sm font-extrabold text-[#2de2c9] tracking-wider">CARE</div>
      </div>
    </div>
  </div>
);

// Fallback dynamic logo renderer
const renderPartnerLogo = (partner: PartnerData) => {
  if (partner.presetLogoId === "iid") return <IIDLogo />;
  if (partner.presetLogoId === "earth-society") return <TheEarthSocietyLogo />;
  if (partner.presetLogoId === "youth-for-care") return <YouthForCareLogo />;
  if (partner.logoUrl) {
    return (
      <div className="flex items-center justify-center h-16 w-full px-2">
        <img
          src={partner.logoUrl}
          alt={partner.name}
          className="max-h-14 max-w-[180px] object-contain filter drop-shadow-[0_0_10px_rgba(45,226,201,0.3)]"
          onError={(e) => {
            // fallback if image fails to load
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }
  // Generic glowing badge logo
  return (
    <div className="w-14 h-14 rounded-2xl bg-[#081726] border border-[#2de2c9]/40 flex items-center justify-center shadow-[0_0_16px_rgba(45,226,201,0.25)]">
      <span className="font-mono text-lg font-bold text-[#2de2c9]">
        {partner.name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
};

const PartnersCollaborators = () => {
  const [partners, setPartners] = useState<PartnerData[]>(getCachedPartners);

  useEffect(() => {
    // 1. Initial fetch from Supabase
    fetchPartners().then((data) => {
      if (data && data.length > 0) {
        setPartners(data);
      }
    });

    // 2. Realtime listener for partner updates
    const channel = supabase
      .channel("partners_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: "title=eq.PARTNERS_LIST_CONFIG",
        },
        (payload) => {
          if (payload.new && (payload.new as any).message) {
            try {
              const updated = JSON.parse((payload.new as any).message);
              if (Array.isArray(updated)) {
                setPartners(updated);
              }
            } catch (err) {
              console.error("Failed to parse realtime partners config", err);
            }
          }
        }
      )
      .subscribe();

    // 3. Storage event listener for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ruet_iot_partners_list" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setPartners(parsed);
          }
        } catch { /* silent */ }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const activePartners = partners.filter((p) => p.active !== false);
  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-b from-background via-card/20 to-background border-t border-b border-[#2de2c9]/15">
      {/* Circuit Pattern Accent */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(#2de2c9 1px, transparent 1px), linear-gradient(90deg, rgba(45,226,201,0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px, 112px 112px",
        }}
      />

      <div className="container relative z-10 max-w-5xl">
        <SectionHeading
          title="Partners & Collaborators"
          subtitle="Organizations supporting innovation, learning, and research"
        />

        {/* ── Partner Cards (Exact original compact shape from user design) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-4xl mx-auto justify-items-center">
          {activePartners.map((partner, index) => {
            const CardWrapper = partner.website ? "a" : "div";
            const cardProps = partner.website
              ? {
                  href: partner.website,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  title: `Visit ${partner.name}`,
                }
              : {};

            return (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.35 }}
                className="w-full max-w-[270px]"
              >
                <CardWrapper
                  {...cardProps}
                  className="group relative flex flex-col items-center justify-start text-center h-[210px] w-full p-5 rounded-2xl bg-[#071320]/85 hover:bg-[#0a1828]/95 backdrop-blur-xl border border-[#1e3a5f]/60 hover:border-[#2de2c9]/70 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_6px_28px_rgba(45,226,201,0.22)] transition-all duration-300 select-none overflow-hidden hover:-translate-y-1 block"
                >
                  {/* Subtle Ambient Hover Glow */}
                  <div
                    className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-35 transition-opacity pointer-events-none"
                    style={{ background: partner.accentGlow || "rgba(45, 226, 201, 0.35)" }}
                  />

                  {/* Logo Container (Fixed compact height for clean vertical alignment) */}
                  <div className="h-14 w-full flex items-center justify-center shrink-0 mb-2">
                    {renderPartnerLogo(partner)}
                  </div>

                  {/* Partner Name */}
                  <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-[#2de2c9] transition-colors mb-1.5 truncate w-full px-1">
                    {partner.name}
                  </h3>

                  {/* Partner Description (Truncated with clean ellipsis) */}
                  <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3 text-center px-1">
                    {partner.description}
                  </p>
                </CardWrapper>
              </motion.div>
            );
          })}
        </div>

        {/* ── Partner With Us Call to Action Footer Box ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#071829]/95 via-[#0a233b]/90 to-[#071829]/95 border border-[#2de2c9]/35 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-xl bg-[#2de2c9]/15 border border-[#2de2c9]/40 flex items-center justify-center shrink-0 text-[#2de2c9]">
              <Handshake size={24} />
            </div>
            <div>
              <h4 className="font-display text-base sm:text-lg font-bold text-foreground">
                Interested in Partnering with RUET IoT Club?
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Collaborate with us on IoT research, tech competitions, hardware sponsorships, and skill development.
              </p>
            </div>
          </div>

          <Link
            to="/contact?subject=Partnership"
            className="shrink-0 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold text-xs sm:text-sm flex items-center gap-2 shadow-[0_2px_16px_rgba(45,226,201,0.4)] hover:shadow-[0_2px_22px_rgba(45,226,201,0.65)] hover:brightness-110 transition-all"
          >
            Become a Partner <ArrowRight size={15} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PartnersCollaborators;
