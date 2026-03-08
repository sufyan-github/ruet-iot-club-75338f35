import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Projects", path: "/projects" },
  { label: "Events", path: "/events" },
  { label: "Research", path: "/research" },
  { label: "Courses", path: "/courses" },
  { label: "Alumni", path: "/alumni" },
  { label: "Team", path: "/team" },
  { label: "Gallery", path: "/gallery" },
  { label: "Blog", path: "/blog" },
  { label: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, isAdmin } = useAuth();

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
          ? "bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-lg shadow-black/10"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <img src={logo} alt="RUET IoT Club" className="h-9 w-9 relative z-10" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:bg-primary/30 transition-colors" />
          </div>
          <span className="font-display text-sm font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">
            RUET IoT Club
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden xl:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === link.path
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative z-10">{link.label}</span>
              {location.pathname === link.path && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </Link>
          ))}

          {isAdmin && (
            <Link
              to="/admin"
              className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                location.pathname === "/admin"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield size={13} className="relative z-10" />
              <span className="relative z-10">Admin</span>
              {location.pathname === "/admin" && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </Link>
          )}

          <div className="w-px h-6 bg-border/50 mx-2" />

          {user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all duration-200 glow-border"
            >
              Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/join"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all duration-200 glow-border"
              >
                Join Us
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="xl:hidden p-2 rounded-lg text-foreground hover:bg-secondary/50 transition-colors"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
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
            className="xl:hidden bg-background/95 backdrop-blur-xl border-t border-border/30 overflow-hidden"
          >
            <div className="container py-4 flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    location.pathname === "/admin"
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Shield size={14} /> Admin
                </Link>
              )}
              <div className="h-px bg-border/30 my-2" />
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm text-center"
                >
                  Dashboard
                </Link>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2.5 rounded-lg border border-border/50 text-foreground font-medium text-sm text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/join"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm text-center"
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
