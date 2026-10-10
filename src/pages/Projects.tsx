import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Layers3, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { apiRequest } from "@/lib/api";
import type { ProjectLifecycleStatus, ProjectRecord } from "@/lib/projects";
import { projectStatusLabel } from "@/lib/projects";

type Filter = "ALL" | ProjectLifecycleStatus;

const statusStyle: Record<ProjectLifecycleStatus, string> = {
  PLANNED: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  ONGOING: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  COMPLETED: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
};

const Projects = () => {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ items: ProjectRecord[]; count: number }>("/projects");
      setProjects(result.items);
    } catch {
      setError("Projects could not be loaded right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  const filtered = filter === "ALL" ? projects : projects.filter((project) => project.projectStatus === filter);

  return <Layout>
    <SEO title="IoT Projects | RUET IoT Club" description="Explore verified Internet of Things, embedded systems, and AI projects developed by RUET IoT Club." path="/projects" />
    <section className="py-20 sm:py-24">
      <div className="container">
        <SectionHeading level={1} title="Projects" subtitle="Student-led ideas engineered into practical IoT solutions" />
        <div className="mb-10 flex flex-wrap justify-center gap-2" aria-label="Filter projects by status">
          {(["ALL", "ONGOING", "COMPLETED", "PLANNED"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filter === value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{value === "ALL" ? "All" : projectStatusLabel(value)}</button>)}
        </div>

        {loading ? <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading projects">{[1, 2, 3].map((value) => <div key={value} className="overflow-hidden rounded-2xl border border-border bg-card/30"><div className="aspect-[16/9] animate-pulse bg-secondary/60" /><div className="space-y-3 p-6"><div className="h-4 w-24 animate-pulse rounded bg-secondary/60" /><div className="h-6 w-4/5 animate-pulse rounded bg-secondary/60" /><div className="h-4 animate-pulse rounded bg-secondary/60" /><div className="h-4 w-2/3 animate-pulse rounded bg-secondary/60" /></div></div>)}</div>
        : error ? <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-8 text-center"><h2 className="font-semibold">Unable to load projects</h2><p className="mt-2 text-sm text-muted-foreground">{error}</p><button type="button" onClick={() => void load()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><RefreshCw size={15} />Try Again</button></div>
        : filtered.length === 0 ? <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card/30 p-8 text-center"><Layers3 className="mx-auto text-primary" size={30} /><h2 className="mt-4 font-semibold">{projects.length ? `No ${filter.toLowerCase()} projects yet` : "Project portfolio is being updated"}</h2><p className="mt-2 text-sm text-muted-foreground">Only reviewed and published RUET IoT Club projects appear here. You can submit a project idea for review today.</p></div>
        : <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">{filtered.map((project, index) => <motion.article key={project.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.04 }} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/45 transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_16px_50px_-28px_hsl(var(--primary)/0.65)]">
          <Link to={`/projects/${encodeURIComponent(project.slug)}`} className="block overflow-hidden" aria-label={`View ${project.title}`}>
            <ProjectCardImage project={project} />
          </Link>
          <div className="flex flex-1 flex-col p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyle[project.projectStatus]}`}>{projectStatusLabel(project.projectStatus)}</span>{project.category && <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-medium text-primary">{project.category}</span>}</div>
            <h2 className="font-display text-xl font-semibold leading-tight transition-colors group-hover:text-primary"><Link to={`/projects/${encodeURIComponent(project.slug)}`}>{project.title}</Link></h2>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{project.shortDescription}</p>
            {project.technologies.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{project.technologies.slice(0, 3).map((technology) => <span key={technology} className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{technology}</span>)}</div>}
            <Link to={`/projects/${encodeURIComponent(project.slug)}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">View Project <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </motion.article>)}</div>}

        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5 p-8 text-center"><h2 className="font-display text-2xl font-bold">Have a Project Idea?</h2><p className="mx-auto mt-3 max-w-xl text-muted-foreground">Share your idea with RUET IoT Club. Students, researchers, innovators, and external collaborators are welcome.</p><Link to="/projects/submit" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">Submit Project Idea</Link></div>
      </div>
    </section>
  </Layout>;
};

export default Projects;

function ProjectCardImage({ project }: { project: ProjectRecord }) {
  const [failed, setFailed] = useState(false);
  if (project.coverImage && !failed) return <img src={project.coverImage.url} alt={project.coverImage.alt?.trim() || project.title} loading="lazy" onError={() => setFailed(true)} className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.025]" />;
  return <div className="circuit-pattern flex aspect-[16/9] items-center justify-center border-b border-primary/10 bg-gradient-to-br from-primary/[0.08] via-card to-background" aria-label={failed ? "Project image unavailable" : "No project image provided"}><span className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-background/60 text-primary"><Layers3 size={28} /></span></div>;
}
