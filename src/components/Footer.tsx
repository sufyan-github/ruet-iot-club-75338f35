import { Link } from "react-router-dom";
import { Facebook, Github, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-card/40">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">
              RUET IoT Club
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Building the future of IoT innovation at Rajshahi University of Engineering & Technology.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-foreground">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {["About", "Projects", "Events", "Team", "Gallery"].map((link) => (
                <Link
                  key={link}
                  to={`/${link.toLowerCase()}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-foreground">Contact</h4>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><MapPin size={14} className="text-primary" /> RUET, Rajshahi, Bangladesh</span>
              <span className="flex items-center gap-2"><Mail size={14} className="text-primary" /> iotclub@ruet.ac.bd</span>
              <span className="flex items-center gap-2"><Phone size={14} className="text-primary" /> +880 1XXX-XXXXXX</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-foreground">Follow Us</h4>
            <div className="flex gap-3">
              {[Facebook, Youtube, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} RUET IoT Club. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
