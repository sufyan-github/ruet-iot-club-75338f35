/**
 * Navbar — Updated layout:
 *
 * Desktop (≥ 1024px):
 *   ─ Club logo at top LEFT (links to "/").
 *   ─ Menu handle at top RIGHT (shows unread badge; fades out when bar is open).
 *   ─ Clicking Menu handle slides glass navbar down from top.
 *   ─ Inside the bar: Logo on left, links in middle, Sign In / Join Us / Notifications
 *     on right, plus a small 'X' close button.
 *   ─ Closing (X, Esc, outside click) slides bar up and fades handle back in.
 *   ─ No full-screen overlay or background blur.
 *
 * Mobile / tablet (< 1024px):
 *   ─ Logo on the LEFT.
 *   ─ Hamburger on the RIGHT (with notification dot).
 *   ─ shadcn Sheet drawer opens from the RIGHT with staggered links.
 *   ─ Sign In and Join Us at bottom of drawer.
 *   ─ Closes on route change.
 *
 * Accessibility & State:
 *   ─ Focus management, aria-expanded, aria-current, and role-based admin links.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Shield, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useIntro } from "@/contexts/IntroContext";
import { SPRING_GENTLE, SPRING_SNAPPY, staggerChildren, EASE_OUT } from "@/lib/motion";
import logo from "@/assets/iot_club_logo.png";
import { useTransparentLogo } from "@/hooks/useTransparentLogo";

// ─── Nav links ───────────────────────────────────────────────────────────────
const navLinks = [
  { label: "Home",     path: "/" },
  { label: "About",    path: "/about" },
  { label: "Team",     path: "/team" },
  { label: "Projects", path: "/projects" },
  { label: "Events",   path: "/events" },
  { label: "Research", path: "/research" },
  { label: "Courses",  path: "/courses" },
  { label: "Alumni",   path: "/alumni" },
  { label: "Gallery",  path: "/gallery" },
  { label: "Blog",     path: "/blog" },
  { label: "Contact",  path: "/contact" },
];

// ─── Stagger variants for mobile sheet links ──────────────────────────────────
const linkListVariants = {
  hidden: {},
  visible: staggerChildren(0.05, 0.12),
};
const linkItemVariants = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { ...SPRING_SNAPPY } },
};

// ─── Club Logo (links to "/") ────────────────────────────────────────────────
interface LogoProps {
  showText?: boolean;
  size?: number;
  className?: string;
}

const Logo = ({ showText = true, size = 44, className = "" }: LogoProps) => {
  const cleanLogo = useTransparentLogo(logo);

  return (
    <Link
      to="/"
      tabIndex={0}
      className={`flex items-center gap-3 group select-none origin-left ${className}`}
      aria-label="RUET IoT Club Home"
    >
      <div className="relative shrink-0">
        <div
          className="relative z-10 rounded-full p-1 bg-[#081524]/90 border border-[#2de2c9]/40 backdrop-blur-md shadow-[0_0_12px_rgba(45,226,201,0.25)] group-hover:border-[#2de2c9] transition-all duration-300 group-hover:scale-105 flex items-center justify-center overflow-hidden"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <img
            src={cleanLogo}
            alt="RUET IoT Club"
            className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(45,226,201,0.3)]"
            width={size}
            height={size}
          />
        </div>
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:bg-primary/40 transition-colors pointer-events-none" />
      </div>

    <AnimatePresence>
      {showText && (
        <motion.div
          key="brand-name-text"
          initial={{ opacity: 0, x: -8, width: 0 }}
          animate={{ opacity: 1, x: 0, width: "auto" }}
          exit={{ opacity: 0, x: -8, width: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="overflow-hidden whitespace-nowrap"
        >
          <span className="font-display text-sm md:text-base font-bold tracking-wider group-hover:text-primary transition-colors">
            <span className="text-foreground">RUET </span>
            <span className="text-[#2de2c9]">IoT Club</span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  </Link>
  );
};

// ─── Dynamic scroll state hook for hero title exit ──────────────────────────
const useHeroScrollState = () => {
  const location = useLocation();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    if (location.pathname !== "/" && location.pathname !== "") {
      setScrolledPastHero(true);
      return;
    }

    const checkScroll = () => {
      // Dynamic check against the hero title stage element:
      // When the top of the title scrolls up close to the navbar (<= 90px from top)
      // or if scrollY > 160px
      const titleEl = document.getElementById("hero-title-stage");
      if (titleEl) {
        const rect = titleEl.getBoundingClientRect();
        setScrolledPastHero(rect.top <= 90);
      } else {
        setScrolledPastHero(window.scrollY > 160);
      }
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => window.removeEventListener("scroll", checkScroll);
  }, [location.pathname]);

  return location.pathname !== "/" && location.pathname !== "" ? true : scrolledPastHero;
};

// ─── Desktop Active-Link Underline (layoutId) ─────────────────────────────────
const ActiveUnderline = () => (
  <motion.span
    layoutId="nav-underline"
    className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full"
    style={{
      background: "linear-gradient(90deg, #2de2c9, #3b9bff)",
      boxShadow: "0 0 8px #2de2c9aa",
    }}
    transition={SPRING_GENTLE}
  />
);

// ─── Desktop Bar Component ───────────────────────────────────────────────────
interface DesktopBarProps {
  open: boolean;
  handleRef: React.RefObject<HTMLButtonElement | null>;
  barRef:    React.RefObject<HTMLDivElement | null>;
  unread:    number;
  onToggle:  () => void;
  onClose:   () => void;
}

const DesktopBar = ({ open, handleRef, barRef, unread, onToggle, onClose }: DesktopBarProps) => {
  const location = useLocation();
  const { user, isAdmin, isModerator, loading } = useAuth();
  const { heroRevealStarted, phase } = useIntro();
  const showBrandText = useHeroScrollState();
  const alreadyOpenOnMount = useRef(open);

  // On non-home routes or when intro is done / reveal started, nav elements are visible
  const isNavVisible = location.pathname !== "/" || phase === "done" || heroRevealStarted;

  return (
    <>
      {/* ── Club Logo at top LEFT (reveals when scrolled past hero or on subpages) ── */}
      <div className="fixed top-0 left-6 z-50 flex items-center pointer-events-none">
        <motion.div
          className="pointer-events-auto mt-3.5"
          initial={alreadyOpenOnMount.current ? { opacity: 0 } : false}
          animate={{
            opacity: isNavVisible && showBrandText && !open ? 1 : 0,
            pointerEvents: isNavVisible && showBrandText && !open ? "auto" : "none",
          }}
          transition={{ duration: open ? 0.15 : 0.35, ease: EASE_OUT }}
        >
          <Logo showText={true} size={38} />
        </motion.div>
      </div>

      {/* ── Menu Handle at top RIGHT (fades out while bar is open, fades in when hero reveals) ── */}
      <div className="fixed top-0 right-6 z-50 flex pointer-events-none">
        <motion.button
          ref={handleRef}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          aria-expanded={open}
          aria-controls="desktop-nav-bar"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          initial={alreadyOpenOnMount.current ? { opacity: 0 } : false}
          animate={{
            opacity: !isNavVisible ? 0 : open ? 0 : 1,
            pointerEvents: !isNavVisible ? "none" : open ? "none" : "auto",
            boxShadow: open
              ? "none"
              : [
                  "0 0 10px rgba(45,226,201,0.1)",
                  "0 0 20px rgba(45,226,201,0.3)",
                  "0 0 10px rgba(45,226,201,0.1)",
                ],
          }}
          transition={{ duration: open ? 0.2 : 0.7, ease: EASE_OUT }}
          className="pointer-events-auto mt-3.5 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs md:text-sm font-mono text-[#2de2c9] border border-[#2de2c9]/60 hover:border-[#2de2c9] bg-card/85 backdrop-blur-2xl hover:bg-card shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(45,226,201,0.15)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_20px_rgba(45,226,201,0.3)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2de2c9] select-none"
        >
          <Menu size={18} />
          {unread > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          <ChevronDown size={14} />
        </motion.button>
      </div>

      {/* ── Sliding Glass Navbar (slides down from top, no full-screen overlay) ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="desktop-nav-bar"
            ref={barRef}
            role="navigation"
            aria-label="Main navigation"
            key="desktop-bar"
            initial={alreadyOpenOnMount.current ? { y: 0, opacity: 1 } : { y: -85, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -85, opacity: 0 }}
            transition={SPRING_GENTLE}
            className="fixed top-0 left-0 right-0 z-40 flex items-center h-16 px-4 xl:px-6 bg-[#050b14]/90 backdrop-blur-2xl border-b border-[#2de2c9]/25 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          >
            {/* Logo on the left inside bar */}
            <div className="shrink-0 mr-2 xl:mr-4">
              <Logo showText={true} size={34} />
            </div>

            {/* Links in the middle - compact responsive font size and overflow-hidden */}
            <nav className="flex items-center justify-center gap-0.5 xl:gap-1 flex-1 min-w-0 overflow-hidden px-1">
              {navLinks.map((link) => {
                const active = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    aria-current={active ? "page" : undefined}
                    className={`relative px-1.5 lg:px-2 xl:px-3 py-1.5 rounded-lg text-xs lg:text-[13px] xl:text-sm font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      active
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                    {active && <ActiveUnderline />}
                  </Link>
                );
              })}

              {(isAdmin || isModerator) && (
                <Link
                  to="/admin"
                  aria-current={location.pathname === "/admin" ? "page" : undefined}
                  className={`relative px-1.5 lg:px-2 xl:px-3 py-1.5 rounded-lg text-xs lg:text-[13px] xl:text-sm font-medium whitespace-nowrap flex items-center gap-1 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    location.pathname === "/admin"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Shield size={12} />
                  Admin
                  {location.pathname === "/admin" && <ActiveUnderline />}
                </Link>
              )}
            </nav>

            {/* Right side: Notifications, Sign In / Join Us, and Small 'X' Close Button */}
            <div className="flex items-center gap-2 xl:gap-3 ml-2 xl:ml-4 shrink-0">
              {user && <NotificationBell />}
              <div className="w-px h-5 bg-border/40" />

              {loading ? null : user ? (
                <Link
                  to="/dashboard"
                  className="px-2.5 xl:px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors glow-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Dashboard
                </Link>
              ) : (
                <div className="flex items-center gap-1.5 xl:gap-2">
                  <Link
                    to="/auth"
                    className="px-2.5 xl:px-3 py-1.5 chip-shape text-xs font-medium text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/join"
                    className="inline-flex items-center gap-1.5 px-3 xl:px-3.5 py-1.5 chip-shape bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold text-xs shadow-[0_2px_12px_rgba(45,226,201,0.35)] hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#050b14]" />
                    Join Us
                  </Link>
                </div>
              )}

              {/* Small X Close Button */}
              <button
                onClick={onClose}
                aria-label="Close navigation menu"
                className="p-1.5 rounded-full text-muted-foreground hover:text-[#2de2c9] hover:bg-[#2de2c9]/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2de2c9]"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Mobile Sheet Component ──────────────────────────────────────────────────
const MobileSheet = ({ unread }: { unread: number }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, isModerator, loading } = useAuth();
  const showBrandText = useHeroScrollState();

  // Close drawer on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* ── Logo on the LEFT on mobile (reveals when scrolled past hero or on subpages) ── */}
      <div className="fixed top-3.5 left-4 z-50 pointer-events-none">
        <motion.div
          className="pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{
            opacity: showBrandText && !sheetOpen ? 1 : 0,
            pointerEvents: showBrandText && !sheetOpen ? "auto" : "none",
          }}
          transition={{ duration: sheetOpen ? 0.15 : 0.35, ease: EASE_OUT }}
        >
          <Logo showText={true} size={36} />
        </motion.div>
      </div>

      {/* ── Hamburger on the RIGHT on mobile ── */}
      <div className="fixed top-3.5 right-4 z-50">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              aria-label={sheetOpen ? "Close navigation menu" : "Open navigation menu"}
              className="relative p-2.5 rounded-xl bg-card/85 backdrop-blur-xl border border-border/60 text-foreground hover:bg-secondary/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {sheetOpen ? <X size={20} /> : <Menu size={20} />}
              {unread > 0 && !sheetOpen && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold px-0.5">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </SheetTrigger>

          {/* Drawer opens from the RIGHT */}
          <SheetContent
            side="right"
            className="w-[82vw] max-w-[320px] bg-background/95 backdrop-blur-2xl border-l border-border/40 p-0 flex flex-col"
          >
            {/* Logo at top of drawer */}
            <div className="flex items-center gap-2 px-5 pt-6 pb-4 border-b border-border/30">
              <Logo showText={true} size={36} />
            </div>

            {/* Staggered link list */}
            <motion.nav
              variants={linkListVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-0.5 px-3 py-4 flex-1 overflow-y-auto"
              aria-label="Mobile navigation"
            >
              {navLinks.map((link) => {
                const active = location.pathname === link.path;
                return (
                  <motion.div key={link.path} variants={linkItemVariants}>
                    <Link
                      to={link.path}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setSheetOpen(false)}
                      className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        active
                          ? "text-primary bg-primary/10 font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}

              {(isAdmin || isModerator) && (
                <motion.div variants={linkItemVariants}>
                  <Link
                    to="/admin"
                    onClick={() => setSheetOpen(false)}
                    aria-current={location.pathname === "/admin" ? "page" : undefined}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      location.pathname === "/admin"
                        ? "text-primary bg-primary/10 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Shield size={13} /> Admin
                  </Link>
                </motion.div>
              )}

              {user && (
                <div className="px-4 py-2">
                  <NotificationBell />
                </div>
              )}
            </motion.nav>

            {/* Bottom auth area: Sign In and Join Us */}
            <div className="px-5 pb-6 pt-3 border-t border-border/30 flex flex-col gap-2">
              {loading ? null : user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setSheetOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth"
                    onClick={() => setSheetOpen(false)}
                    className="px-4 py-2.5 chip-shape border border-border/50 text-foreground font-medium text-sm text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/join"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 chip-shape bg-gradient-to-r from-[#2de2c9] via-[#00d2ff] to-[#38bdf8] text-[#050b14] font-bold text-sm text-center shadow-[0_2px_14px_rgba(45,226,201,0.4)] hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#050b14]" />
                    Join Us
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

// ─── Shared Global State for Persistent Desktop Navbar ───────────────────────
// Ensures the navbar stays down when switching tabs / navigating routes until the cross ('X') button is pressed.
let globalDesktopNavOpen = false;
const desktopNavListeners = new Set<(open: boolean) => void>();

const setGlobalDesktopNavOpen = (val: boolean) => {
  globalDesktopNavOpen = val;
  desktopNavListeners.forEach((fn) => fn(val));
};

export const useDesktopNavOpen = () => {
  const [open, setOpen] = useState(globalDesktopNavOpen);
  useEffect(() => {
    const listener = (val: boolean) => setOpen(val);
    desktopNavListeners.add(listener);
    return () => {
      desktopNavListeners.delete(listener);
    };
  }, []);
  return open;
};

// ─── Root Navbar Component ───────────────────────────────────────────────────
const Navbar = () => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [open, setOpen] = useState(globalDesktopNavOpen);
  const handleRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const unread = 0;

  // Sync state across route transitions / page re-renders
  useEffect(() => {
    const listener = (val: boolean) => setOpen(val);
    desktopNavListeners.add(listener);
    return () => {
      desktopNavListeners.delete(listener);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGlobalDesktopNavOpen(false);
        handleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // NOTE: Outside click listener has been intentionally removed per user request:
  // Once the navbar slides down, it stays open even when clicking outside or switching tabs,
  // until the cross ('X') button is clicked!

  const toggle = useCallback(() => {
    setGlobalDesktopNavOpen(!globalDesktopNavOpen);
  }, []);

  const close = useCallback(() => {
    setGlobalDesktopNavOpen(false);
    handleRef.current?.focus();
  }, []);

  if (isDesktop) {
    return (
      <DesktopBar
        open={open}
        handleRef={handleRef}
        barRef={barRef}
        unread={unread}
        onToggle={toggle}
        onClose={close}
      />
    );
  }

  return <MobileSheet unread={unread} />;
};

export default Navbar;
