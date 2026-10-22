import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Users, Lightbulb, Calendar, BookOpen, FlaskConical } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import SEO from "@/components/SEO";
import Hero from "@/components/home/Hero";
import MembersShowcase from "@/components/MembersShowcase";
import PartnersCollaborators from "@/components/home/PartnersCollaborators";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { useIntro } from "@/contexts/IntroContext";
import { EASE_OUT } from "@/lib/motion";
// HeroCarousel removed from hero — re-add below as its own section when ready:
// import HeroCarousel from "@/components/HeroCarousel";

interface ProjectItem {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  status?: string | null;
}

interface EventItem {
  id: string;
  title: string;
  venue?: string | null;
  date: string;
}

const Index = () => {
  const { phase } = useIntro();
  const isDone = phase === "done";
  const [featuredProjects, setFeaturedProjects] = useState<ProjectItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [stats, setStats] = useState({ members: 0, projects: 0, events: 0, alumni: 0 });

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(3);
    setFeaturedProjects(data || []);
  };

  const fetchEvents = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("events")
      .select("*")
      .gte("date", todayStart.toISOString())
      .order("date", { ascending: true })
      .limit(3);
    setUpcomingEvents(data || []);
  };

  const fetchStats = async () => {
    const [mRes, pRes, eRes, aRes] = await Promise.all([
      supabase.rpc("get_approved_member_count"),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("alumni").select("id", { count: "exact", head: true }),
    ]);
    setStats({
      members: (mRes.data as number) || 0,
      projects: pRes.count || 0,
      events: eRes.count || 0,
      alumni: aRes.count || 0,
    });
  };

  useEffect(() => {
    fetchProjects();
    fetchEvents();
    fetchStats();

    // Realtime subscriptions for live updates
    const projectsChannel = supabase
      .channel("homepage_projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        fetchProjects();
        fetchStats();
      })
      .subscribe();

    const eventsChannel = supabase
      .channel("homepage_events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        fetchEvents();
        fetchStats();
      })
      .subscribe();

    const membersChannel = supabase
      .channel("homepage_members")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, []);

  const statCards = [
    { label: "Members", value: `${stats.members}+`, icon: Users },
    { label: "Projects", value: `${stats.projects}+`, icon: Cpu },
    { label: "Events", value: `${stats.events}+`, icon: BookOpen },
    { label: "Alumni", value: `${stats.alumni}+`, icon: Lightbulb },
  ];

  return (
    <Layout>
      <SEO
        title="RUET IoT Club — IoT Innovation & Research at RUET"
        description="The official Internet of Things community at Rajshahi University of Engineering & Technology. Projects, research, workshops, courses, and hackathons in IoT, embedded systems, and AI."
        path="/"
      />
      {/* ── New Hero ── */}
      <Hero />

      {/* Sections below hero stay hidden during intro and fade in smoothly upon handover */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isDone ? 1 : 0 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
        style={{ pointerEvents: isDone ? "auto" : "none" }}
      >
        {/* About Preview - IC Logic Core Cards */}
        <section className="py-20">
          <div className="container">
            <SectionHeading title="About Us" subtitle="Pioneering IoT innovation at RUET since 2020" />
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative group p-6 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 transition-all duration-300 overflow-hidden"
              >
                <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#2de2c9]/80 tracking-wider">
                  <span>CORE_01 // MISSION</span>
                  <span className="chip-pin-1" />
                </div>
                <h3 className="font-display text-base font-bold tracking-wider text-primary mb-3">Our Mission</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Build an IoT innovation ecosystem, promote research and hands-on learning, and encourage student-led project development.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative group p-6 chip-card border border-[#3b9bff]/25 hover:border-[#3b9bff]/70 transition-all duration-300 overflow-hidden"
              >
                <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#3b9bff]/60 pointer-events-none transition-colors" />
                <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#3b9bff]/60 pointer-events-none transition-colors" />
                <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#3b9bff]/80 tracking-wider">
                  <span>CORE_02 // VISION</span>
                  <span className="chip-pin-1" />
                </div>
                <h3 className="font-display text-base font-bold tracking-wider text-accent mb-3">Our Vision</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Become the leading IoT innovation hub among universities in Bangladesh, producing industry-ready engineers.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative group p-6 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 transition-all duration-300 overflow-hidden"
              >
                <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#2de2c9]/80 tracking-wider">
                  <span>CORE_03 // R&amp;D</span>
                  <span className="chip-pin-1" />
                </div>
                <h3 className="font-display text-base font-bold tracking-wider text-primary mb-3">
                  <FlaskConical size={15} className="inline mr-1 text-[#2de2c9]" /> Research Focus
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We conduct research in IoT, embedded systems, AI integration, and smart solutions for real-world problems in Bangladesh.
                </p>
              </motion.div>
            </div>

            {/* Stats - IC Modular Chip Cards (Now placed directly below Mission, Vision & R&D) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto pt-10 border-t border-border/30">
              {statCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative group text-center p-6 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 transition-all duration-300 select-none overflow-hidden"
                >
                  {/* Pin-1 Index Notch Socket */}
                  <span className="chip-pin-1 absolute top-2.5 left-2.5 z-20" />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                  <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />

                  {/* Silkscreen Module Label */}
                  <span className="absolute top-2.5 right-3 font-mono text-[9px] text-[#2de2c9]/45 group-hover:text-[#2de2c9]/75 tracking-wider uppercase transition-colors">
                    0{i + 1} // MOD
                  </span>

                  {/* Subtle Background Circuit Grid */}
                  <div
                    className="absolute inset-0 opacity-10 group-hover:opacity-20 pointer-events-none transition-opacity"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, rgba(45,226,201,0.15) 1px, transparent 1px), linear-gradient(rgba(45,226,201,0.15) 1px, transparent 1px)",
                      backgroundSize: "12px 12px",
                    }}
                  />

                  <stat.icon className="mx-auto mb-3 text-[#2de2c9] group-hover:scale-110 transition-transform duration-300" size={28} />
                  <div className="font-display text-2xl md:text-3xl font-bold text-foreground group-hover:text-[#2de2c9] transition-colors">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 tracking-wide">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Projects - Unique Chip Cards */}
        <section className="py-20 bg-card/30">
          <div className="container">
            <SectionHeading title="Featured Projects" subtitle="Explore our latest innovations" />
            {featuredProjects.length === 0 ? (
              <p className="text-center text-muted-foreground">No projects yet.</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {featuredProjects.map((project, i) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative group chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 transition-all duration-300 overflow-hidden"
                  >
                    {project.image_url && (
                      <div className="relative overflow-hidden">
                        <img
                          src={getOptimizedImageUrl(project.image_url, { width: 400, height: 200 })}
                          alt={project.title}
                          className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105"
                          width={323}
                          height={160}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#071322] via-transparent to-transparent opacity-80" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        {project.category && (
                          <span className="text-[11px] font-mono px-2 py-0.5 chip-shape bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/30">
                            {project.category}
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 chip-shape ${
                            project.status === "completed" || project.status === "published"
                              ? "bg-green-500/15 text-green-400 border border-green-500/30"
                              : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                      )}
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

        {/* Upcoming Events - Chip Strip Cards */}
        <section className="py-20">
          <div className="container">
            <SectionHeading title="Upcoming Events" subtitle="Don't miss out on our latest activities" />
            {upcomingEvents.length === 0 ? (
              <p className="text-center text-muted-foreground">No upcoming events.</p>
            ) : (
              <div className="max-w-2xl mx-auto space-y-4">
                {upcomingEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative group flex items-center gap-4 p-4 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 transition-all duration-300"
                  >
                    <Calendar className="text-[#2de2c9] shrink-0" size={20} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-[#2de2c9] transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{event.venue || "TBA"}</p>
                    </div>
                    <span className="text-xs font-mono text-[#2de2c9] shrink-0 px-2.5 py-1 chip-shape bg-[#2de2c9]/10 border border-[#2de2c9]/30">
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

        {/* Partners & Collaborators Section */}
        <PartnersCollaborators />



        {/* CTA - Chip Core Module Card */}
        <section className="py-20 bg-card/30">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-xl mx-auto p-8 sm:p-10 chip-card border border-[#2de2c9]/40 relative overflow-hidden"
            >
              {/* Pin-1 Index Marker */}
              <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-[#2de2c9] shadow-[0_0_6px_#2de2c9]" />

              <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient mb-4">
                Ready to Innovate?
              </h2>
              <p className="text-muted-foreground mb-6">
                Join RUET IoT Club and be part of Bangladesh's leading IoT community.
              </p>
              <motion.div
                animate={{
                  boxShadow: [
                    "0 4px 20px rgba(45,226,201,0.35)",
                    "0 4px 34px rgba(45,226,201,0.75), 0 0 24px rgba(0,210,255,0.5)",
                    "0 4px 20px rgba(45,226,201,0.35)",
                  ],
                  opacity: [0.88, 1, 0.88],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="inline-block"
              >
                <Link
                  to="/join"
                  className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 chip-shape bg-gradient-to-r from-[#2de2c9] via-[#00d2ff] to-[#38bdf8] text-[#050b14] font-bold hover:brightness-110"
                >
                  Become a Member <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </Layout>
  );
};

export default Index;
