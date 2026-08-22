import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Users, Lightbulb, Calendar, BookOpen, Wifi, FlaskConical, Handshake, Layers3 } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import SEO from "@/components/SEO";
import HeroCarousel from "@/components/HeroCarousel";
import HomeMembershipLink from "@/components/HomeMembershipLink";
import { cloudflareData } from "@/integrations/cloudflare/client";
import { apiRequest } from "@/lib/api";
import type { ProjectRecord } from "@/lib/projects";
import { projectStatusLabel } from "@/lib/projects";
import heroBg from "@/assets/hero-bg.webp";

const Index = () => {
  const [featuredProjects, setFeaturedProjects] = useState<ProjectRecord[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ members: 0, projects: 0, events: 0, alumni: 0 });
  const [partners, setPartners] = useState<Array<{ id: string; name?: string; title?: string; logo_url?: string; website?: string; description?: string }>>([]);

  const fetchProjects = async () => {
    try {
      const result = await apiRequest<{ items: ProjectRecord[]; count: number }>("/projects");
      setFeaturedProjects(result.items.slice(0, 3));
    } catch { setFeaturedProjects([]); }
  };

  const fetchEvents = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data } = await cloudflareData
      .from("events")
      .select("*")
      .gte("date", todayStart.toISOString())
      .order("date", { ascending: true })
      .limit(3);
    setUpcomingEvents(data || []);
  };

  const fetchStats = async () => {
    const [mRes, pRes, eRes, aRes] = await Promise.all([
      cloudflareData.rpc("get_approved_member_count"),
      cloudflareData.from("projects").select("id", { count: "exact", head: true }),
      cloudflareData.from("events").select("id", { count: "exact", head: true }),
      cloudflareData.from("alumni").select("id", { count: "exact", head: true }),
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
    void apiRequest<{ items: typeof partners }>("/data/query", { method: "POST", body: { table: "partners", filters: [], limit: 50, single: false, countOnly: false } }).then((result) => setPartners(result.items)).catch(() => undefined);

    // Realtime subscriptions for live updates
    const projectsChannel = cloudflareData
      .channel("homepage_projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        fetchProjects();
        fetchStats();
      })
      .subscribe();

    const eventsChannel = cloudflareData
      .channel("homepage_events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        fetchEvents();
        fetchStats();
      })
      .subscribe();

    const membersChannel = cloudflareData
      .channel("homepage_members")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      cloudflareData.removeChannel(projectsChannel);
      cloudflareData.removeChannel(eventsChannel);
      cloudflareData.removeChannel(membersChannel);
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
      {/* Hero Section */}
      <section className="relative flex min-h-[82vh] items-center overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-[0.16] saturate-75" width={1440} height={810} loading="eager" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/45 via-background/80 to-background" />
          <div className="absolute -left-48 top-1/4 size-[34rem] rounded-full bg-primary/[0.065] blur-3xl" />
          <div className="absolute -right-48 top-1/3 size-[38rem] rounded-full bg-technology-blue/[0.075] blur-3xl" />
        </div>
        <div className="container relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-6 flex items-center gap-2">
                <Wifi className="text-primary" size={20} />
                <span className="tech-label">RAJSHAHI UNIVERSITY OF ENGINEERING & TECHNOLOGY</span>
              </div>
              <h1 className="mb-6 font-display text-4xl font-bold leading-[1.04] tracking-tight md:text-6xl lg:text-7xl">
                <span className="text-foreground">RUET</span>{" "}
                <span className="text-gradient glow-text">IoT Club</span>
                <span className="block text-base md:text-xl font-medium tracking-normal text-muted-foreground mt-3">
                  Innovating through IoT, Embedded Systems & AI Research
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-4 leading-relaxed">
                Innovating the future through Internet of Things. Building smart solutions, fostering research, and empowering the next generation of IoT engineers.
              </p>
              <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
                <FlaskConical size={16} className="text-accent" />
                <span>We conduct and operate <strong className="text-foreground">research-based</strong> work in IoT, AI & embedded systems.</span>
              </div>
              <div className="flex flex-wrap gap-4">
                <HomeMembershipLink
                  className="glow-border flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  {(state) => <>{state === "authenticated" ? "Continue Application" : "Join Us"} <ArrowRight size={18} /></>}
                </HomeMembershipLink>
                <Link
                  to="/projects"
                  className="rounded-xl border border-primary/20 bg-secondary/70 px-6 py-3 font-semibold text-secondary-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary"
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
              className="block"
            >
              <HeroCarousel />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats - now dynamic */}
      <section className="py-16 border-y border-border/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="tech-surface-hover rounded-2xl p-6 text-center glass"
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
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="tech-surface-hover rounded-2xl p-6 glass">
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-3">Our Mission</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Build an IoT innovation ecosystem, promote research and hands-on learning, and encourage student-led project development.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="tech-surface-hover rounded-2xl p-6 glass">
              <h3 className="font-display text-sm font-bold tracking-wider text-accent mb-3">Our Vision</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Become the leading IoT innovation hub among universities in Bangladesh, producing industry-ready engineers.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="tech-surface-hover rounded-2xl p-6 glass">
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
                <motion.article key={project.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="rounded-xl glass hover:border-primary/30 transition-colors group overflow-hidden">
                  <Link to={`/projects/${encodeURIComponent(project.slug)}`} className="block">
                    <FeaturedProjectImage project={project} />
                  </Link>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {project.category && <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">{project.category}</span>}
                      <span className={`text-xs font-mono px-2 py-1 rounded ${project.projectStatus === "COMPLETED" ? "bg-green-500/10 text-green-400" : project.projectStatus === "ONGOING" ? "bg-yellow-500/10 text-yellow-400" : "bg-blue-500/10 text-blue-400"}`}>{projectStatusLabel(project.projectStatus)}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors"><Link to={`/projects/${encodeURIComponent(project.slug)}`}>{project.title}</Link></h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.shortDescription}</p>
                  </div>
                </motion.article>
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
                    <h3 className="font-semibold text-sm text-foreground">{event.title}</h3>
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

      {/* Get Involved */}
      {partners.length > 0 && <section className="py-16 bg-card/20"><div className="container"><SectionHeading title="Partners & Collaborators" subtitle="Organizations supporting innovation, learning, and research" /><div className="mx-auto flex max-w-5xl flex-wrap items-stretch justify-center gap-4">{partners.map((partner) => <a key={partner.id} href={partner.website || undefined} target={partner.website ? "_blank" : undefined} rel={partner.website ? "noopener noreferrer" : undefined} className="flex min-h-28 w-56 flex-col items-center justify-center rounded-xl glass p-5 text-center hover:border-primary/30">{partner.logo_url && <img src={partner.logo_url} alt={`${partner.name || partner.title || "Partner"} logo`} loading="lazy" className="mb-3 h-10 max-w-36 object-contain" />}<strong className="text-sm">{partner.name || partner.title}</strong>{partner.description && <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{partner.description}</span>}</a>)}</div></div></section>}

      <section className="py-20">
        <div className="container">
          <SectionHeading title="Get Involved" subtitle="Build, research, and collaborate with RUET IoT Club" />
          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <HomeMembershipLink className="group rounded-xl glass p-6 transition-colors hover:border-primary/40">
              {(state) => <>
                <Users className="text-primary" size={26} />
                <h3 className="mt-4 font-semibold group-hover:text-primary">{state === "authenticated" ? "Continue Membership Application" : "Become a Club Member"}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{state === "authenticated" ? "Open your application, continue a draft, or review its current status." : "Create an account and begin the verified membership application."}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">{state === "authenticated" ? "Continue" : "Get started"} <ArrowRight size={13} /></span>
              </>}
            </HomeMembershipLink>
            {[
              { title: "Submit a Project Idea", description: "Propose an IoT, embedded, AI, or interdisciplinary project.", to: "/projects/submit", icon: Lightbulb },
              { title: "Submit Research", description: "Share a research proposal for structured review and collaboration.", to: "/research/submit", icon: FlaskConical },
              { title: "Collaborate With Us", description: "Start an academic, industry, community, or technology collaboration.", to: "/collaborate", icon: Handshake },
            ].map((item) => <Link key={item.title} to={item.to} className="group rounded-xl glass p-6 transition-colors hover:border-primary/40"><item.icon className="text-primary" size={26} /><h3 className="mt-4 font-semibold group-hover:text-primary">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Get started <ArrowRight size={13} /></span></Link>)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-card/30">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-lg mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient mb-4">Ready to Innovate?</h2>
            <p className="text-muted-foreground mb-6">Join RUET IoT Club and be part of Bangladesh's leading IoT community.</p>
            <HomeMembershipLink className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border">
              {(state) => <>{state === "authenticated" ? "Open Membership Application" : "Become a Member"} <ArrowRight size={18} /></>}
            </HomeMembershipLink>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;

function FeaturedProjectImage({ project }: { project: ProjectRecord }) {
  const [failed, setFailed] = useState(false);
  return project.coverImage && !failed ? <img src={project.coverImage.url} alt={project.coverImage.alt?.trim() || project.title} onError={() => setFailed(true)} className="h-40 w-full object-cover" width={323} height={160} loading="lazy" /> : <div className="circuit-pattern flex h-40 items-center justify-center border-b border-primary/10 bg-gradient-to-br from-primary/[0.08] to-background text-primary" aria-label={failed ? "Project image unavailable" : "No project image provided"}><Layers3 size={28} /></div>;
}
