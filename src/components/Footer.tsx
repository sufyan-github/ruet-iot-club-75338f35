import { Link } from "react-router-dom";
import { Facebook, Github, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-primary/15 bg-gradient-to-b from-card/50 to-background">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div aria-hidden="true" className="absolute -right-24 -top-24 size-72 rounded-full bg-technology-blue/[0.06] blur-3xl" />
      <div className="container relative py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="mb-4 font-display text-base font-bold tracking-tight text-primary">
              RUET IoT Club
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Building the future of IoT innovation at Rajshahi University of Engineering & Technology.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-foreground">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {["About", "Projects", "Events", "Partners", "Opportunities", "Team", "Gallery"].map((link) => (
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
              <span className="flex items-center gap-2"><Mail size={14} className="text-primary" /> ruetiotclub@gmail.com</span>
              <span className="flex items-center gap-2"><Phone size={14} className="text-primary" /> +880 1580-352238</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-foreground">Follow Us</h4>
            <div className="flex gap-3">
              <a href="https://www.facebook.com/ruet.iot.club" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary">
                <Facebook size={16} />
              </a>
              <a href="https://www.linkedin.com/company/ruet-iot-club" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
              className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary">
                <Linkedin size={16} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub"
              className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary">
                <Github size={16} />
              </a>
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
