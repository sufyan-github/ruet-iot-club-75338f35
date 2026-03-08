import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Users, Lightbulb, Calendar, BookOpen, Wifi, FlaskConical } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import HeroCarousel from "@/components/HeroCarousel";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { label: "Members", value: "120+", icon: Users },
  { label: "Projects", value: "45+", icon: Cpu },
  { label: "Workshops", value: "30+", icon: BookOpen },
  { label: "Alumni", value: "80+", icon: Lightbulb },
];

const Index = () => {
  const [featuredProjects, setFeaturedProjects] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [projRes, evtRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(3),
        supabase.from("events").select("*").order("date", { ascending: true }).limit(3),
      ]);
      setFeaturedProjects(projRes.data || []);
      setUpcomingEvents(evtRes.data || []);
    };
    fetchData();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Wifi className="text-primary" size={20} />
                <span className="text-sm font-mono text-primary tracking-wider">RAJSHAHI UNIVERSITY OF ENGINEERING & TECHNOLOGY</span>
              </div>
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-wide leading-tight mb-6">
                <span className="text-foreground">RUET</span>{" "}
                <span className="text-gradient glow-text">IoT Club</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-4 leading-relaxed">
                Innovating the future through Internet of Things. Building smart solutions, fostering research, and empowering the next generation of IoT engineers.
              </p>
              <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
                <FlaskConical size={16} className="text-accent" />
                <span>We conduct and operate <strong className="text-foreground">research-based</strong> work in IoT, AI & embedded systems.</span>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/join"
                  className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border flex items-center gap-2"
                >
                  Join Us <ArrowRight size={18} />
                </Link>
                <Link
                  to="/projects"
                  className="px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors border border-border"
                >
                  Explore Projects
                </Link>
              </div>
            </motion.div>

            {/* Carousel */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <HeroCarousel />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-xl glass"
              >
                <stat.icon className="mx-auto mb-3 text-primary" size={28} />
                <div className="font-display text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-20">
        <div className="container">
          <SectionHeading title="About Us" subtitle="Pioneering IoT innovation at RUET since 2020" />
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-6 rounded-xl glass">
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-3">Our Mission</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Build an IoT innovation ecosystem, promote research and hands-on learning, and encourage student-led project development.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="p-6 rounded-xl glass">
              <h3 className="font-display text-sm font-bold tracking-wider text-accent mb-3">Our Vision</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Become the leading IoT innovation hub among universities in Bangladesh, producing industry-ready engineers.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="p-6 rounded-xl glass">
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-3">
                <FlaskConical size={14} className="inline mr-1" /> Research Focus
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We conduct research in IoT, embedded systems, AI integration, and smart solutions for real-world problems in Bangladesh.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-20 bg-card/30">
        <div className="container">
          <SectionHeading title="Featured Projects" subtitle="Explore our latest innovations" />
          {featuredProjects.length === 0 ? (
            <p className="text-center text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {featuredProjects.map((project, i) => (
                <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="rounded-xl glass hover:border-primary/30 transition-colors group overflow-hidden">
                  {project.image_url && <img src={project.image_url} alt={project.title} className="w-full h-40 object-cover" />}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {project.category && <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">{project.category}</span>}
                      <span className={`text-xs font-mono px-2 py-1 rounded ${
                        project.status === "completed" || project.status === "published" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                      }`}>{project.status}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{project.title}</h3>
                    {project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <div className="text-center mt-8">
            <Link to="/projects" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              View All Projects <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Upcoming Events" subtitle="Don't miss out on our latest activities" />
          {upcomingEvents.length === 0 ? (
            <p className="text-center text-muted-foreground">No upcoming events.</p>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {upcomingEvents.map((event, i) => (
                <motion.div key={event.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl glass hover:border-primary/30 transition-colors">
                  <Calendar className="text-primary shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground">{event.title}</h4>
                    <p className="text-xs text-muted-foreground">{event.venue || "TBA"}</p>
                  </div>
                  <span className="text-xs font-mono text-primary shrink-0">
                    {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
          <div className="text-center mt-8">
            <Link to="/events" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              View All Events <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-card/30">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-lg mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient mb-4">Ready to Innovate?</h2>
            <p className="text-muted-foreground mb-6">Join RUET IoT Club and be part of Bangladesh's leading IoT community.</p>
            <Link to="/join" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border">
              Become a Member <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
