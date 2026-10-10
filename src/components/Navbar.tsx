import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import logo from "@/assets/iot_club_logo.png";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Projects", path: "/projects" },
  { label: "Events", path: "/events" },
  { label: "Research", path: "/research" },
  { label: "Courses", path: "/courses" },
  { label: "Alumni", path: "/alumni" },
  { label: "Our People", path: "/team" },
  { label: "Gallery", path: "/gallery" },
  { label: "Blog", path: "/blog" },
  { label: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-primary/15 bg-background/[0.9] shadow-[0_18px_55px_-32px_hsl(var(--primary)/0.55)] backdrop-blur-2xl"
          : "border-b border-primary/[0.08] bg-background/[0.62] backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-[1920px] items-center justify-between gap-3 px-3 sm:px-4 min-[1400px]:gap-4 min-[1400px]:px-6">
        <Link to="/" className="group flex min-w-[156px] shrink-0 items-center gap-3 whitespace-nowrap min-[1400px]:min-w-[176px]">
          <div className="relative aspect-square size-10 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-card/80 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.65)] min-[1400px]:size-11">
            <img src={logo} alt="RUET IoT Club" className="relative z-10 size-full rounded-full object-contain" width={44} height={44} />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:bg-primary/30 transition-colors" />
          </div>
          <span className="whitespace-nowrap font-display text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary min-[1400px]:text-[17px]">
            RUET IoT Club
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden min-w-0 flex-1 items-center justify-between gap-1.5 min-[1200px]:flex min-[1400px]:gap-2.5">
          <div className="flex min-w-0 shrink-0 items-center gap-0 min-[1400px]:gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative shrink-0 whitespace-nowrap rounded-lg px-1.5 py-2.5 text-xs font-medium transition-all duration-200 min-[1280px]:text-[13px] min-[1400px]:px-2 min-[1600px]:px-2.5 min-[1600px]:text-sm ${
                  location.pathname === link.path
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-primary/[0.055] hover:text-foreground"
                }`}
              >
                <span className="relative z-10 whitespace-nowrap">{link.label}</span>
                {location.pathname === link.path && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg border border-primary/30 bg-primary/[0.1] shadow-[inset_0_-2px_0_hsl(var(--primary)/0.52)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-0 min-[1400px]:gap-0.5">
            {isAdmin && (
              <Link
                to="/admin"
                className={`relative flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-1.5 py-2.5 text-xs font-medium transition-all duration-200 min-[1280px]:text-[13px] min-[1400px]:px-2 min-[1600px]:px-2.5 min-[1600px]:text-sm ${
                  location.pathname === "/admin"
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-primary/[0.055] hover:text-foreground"
                }`}
              >
                <Shield size={13} className="relative z-10 shrink-0" />
                <span className="relative z-10 whitespace-nowrap">Admin</span>
                {location.pathname === "/admin" && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg border border-primary/30 bg-primary/[0.1] shadow-[inset_0_-2px_0_hsl(var(--primary)/0.52)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            )}

            {user && <div className="shrink-0"><NotificationBell /></div>}
            <div className="mx-1 h-6 w-px shrink-0 bg-border/50 min-[1400px]:mx-1.5" />

            {loading ? null : user ? (
              <div className="flex shrink-0 items-center gap-0 min-[1400px]:gap-0.5">
                <Link to="/dashboard/membership" className="shrink-0 whitespace-nowrap rounded-lg px-1.5 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground min-[1280px]:text-[13px] min-[1400px]:px-2 min-[1600px]:px-2.5 min-[1600px]:text-sm">Membership</Link>
                <Link to="/account/security" className="shrink-0 whitespace-nowrap rounded-lg px-1.5 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground min-[1280px]:text-[13px] min-[1400px]:px-2 min-[1600px]:px-2.5 min-[1600px]:text-sm">Account</Link>
                <Link to="/dashboard" className="glow-border shrink-0 whitespace-nowrap rounded-xl bg-primary px-2.5 py-2.5 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 min-[1280px]:text-[13px] min-[1400px]:px-3 min-[1600px]:px-4 min-[1600px]:text-sm">Dashboard</Link>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-1 min-[1400px]:gap-2">
                <Link
                  to="/auth"
                  className="shrink-0 whitespace-nowrap rounded-lg border border-border/50 px-2.5 py-2.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:text-foreground min-[1280px]:text-[13px] min-[1400px]:px-3 min-[1600px]:px-4 min-[1600px]:text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="glow-border shrink-0 whitespace-nowrap rounded-xl bg-primary px-2.5 py-2.5 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 min-[1280px]:text-[13px] min-[1400px]:px-3 min-[1600px]:px-4 min-[1600px]:text-sm"
                >
                  Join Us
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary/50 min-[1200px]:hidden"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls="primary-mobile-navigation"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            id="primary-mobile-navigation"
            className="max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-primary/15 bg-background/[0.97] shadow-2xl backdrop-blur-2xl min-[1200px]:hidden"
          >
            <div className="container py-4 flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={`whitespace-nowrap rounded-lg px-4 py-3 text-[15px] font-medium transition-colors ${
                    location.pathname === link.path
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-3 text-[15px] font-medium transition-colors ${
                    location.pathname === "/admin"
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Shield size={14} /> Admin
                </Link>
              )}
              {user && (
                <div className="px-4 py-1">
                  <NotificationBell />
                </div>
              )}
              <div className="h-px bg-border/30 my-2" />
              {loading ? null : user ? (
                <div className="flex flex-col gap-2">
                  <Link to="/dashboard/membership" onClick={() => setOpen(false)} className="rounded-xl border border-border/50 px-4 py-3 text-center text-[15px] font-medium text-foreground">Membership & volunteering</Link>
                  <Link to="/account/security" onClick={() => setOpen(false)} className="rounded-xl border border-border/50 px-4 py-3 text-center text-[15px] font-medium text-foreground">Account & security</Link>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="rounded-xl bg-primary px-4 py-3 text-center text-[15px] font-semibold text-primary-foreground">Dashboard</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-border/50 px-4 py-3 text-center text-[15px] font-medium text-foreground"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth?mode=signup"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-primary px-4 py-3 text-center text-[15px] font-semibold text-primary-foreground"
                  >
                    Join Us
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
