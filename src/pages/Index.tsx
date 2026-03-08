import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Users, Lightbulb, Calendar, BookOpen, Wifi } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { label: "Members", value: "120+", icon: Users },
  { label: "Projects", value: "45+", icon: Cpu },
  { label: "Workshops", value: "30+", icon: BookOpen },
  { label: "Alumni", value: "80+", icon: Lightbulb },
];

const featuredProjects = [
  { title: "Smart Campus System", category: "IoT", status: "Ongoing", tech: ["ESP32", "MQTT", "React"] },
  { title: "Air Quality Monitor", category: "Environmental", status: "Completed", tech: ["Arduino", "Sensors", "Cloud"] },
  { title: "Automated Greenhouse", category: "Agriculture", status: "Ongoing", tech: ["Raspberry Pi", "AI", "IoT"] },
];

const upcomingEvents = [
  { title: "IoT Workshop: ESP32 Basics", date: "Mar 15, 2026", venue: "RUET Auditorium" },
  { title: "Hackathon 2026", date: "Apr 5-6, 2026", venue: "CSE Building" },
  { title: "AI + IoT Bootcamp", date: "Apr 20, 2026", venue: "Online" },
];

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-2 mb-6">
              <Wifi className="text-primary" size={20} />
              <span className="text-sm font-mono text-primary tracking-wider">RAJSHAHI UNIVERSITY OF ENGINEERING & TECHNOLOGY</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-wide leading-tight mb-6">
              <span className="text-foreground">RUET</span>{" "}
              <span className="text-gradient glow-text">IoT Club</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
              Innovating the future through Internet of Things. Building smart solutions, fostering research, and empowering the next generation of IoT engineers.
            </p>
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
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-xl glass"
            >
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-3">Our Mission</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Build an IoT innovation ecosystem, promote research and hands-on learning, and encourage student-led project development that solves real-world problems.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-xl glass"
            >
              <h3 className="font-display text-sm font-bold tracking-wider text-accent mb-3">Our Vision</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Become the leading IoT innovation hub among universities in Bangladesh, producing industry-ready engineers and groundbreaking research.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-20 bg-card/30">
        <div className="container">
          <SectionHeading title="Featured Projects" subtitle="Explore our latest innovations" />
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {featuredProjects.map((project, i) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl glass hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">{project.category}</span>
                  <span className={`text-xs font-mono px-2 py-1 rounded ${project.status === "Completed" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">{project.title}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
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
          <div className="max-w-2xl mx-auto space-y-4">
            {upcomingEvents.map((event, i) => (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl glass hover:border-primary/30 transition-colors"
              >
                <Calendar className="text-primary shrink-0" size={20} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground">{event.title}</h4>
                  <p className="text-xs text-muted-foreground">{event.venue}</p>
                </div>
                <span className="text-xs font-mono text-primary shrink-0">{event.date}</span>
              </motion.div>
            ))}
          </div>
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-lg mx-auto"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient mb-4">Ready to Innovate?</h2>
            <p className="text-muted-foreground mb-6">Join RUET IoT Club and be part of Bangladesh's leading IoT community.</p>
            <Link
              to="/join"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border"
            >
              Become a Member <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
