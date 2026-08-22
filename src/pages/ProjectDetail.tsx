import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, Github, Layers3, RefreshCw, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { ApiError, apiRequest } from "@/lib/api";
import type { ProjectLifecycleStatus, ProjectRecord } from "@/lib/projects";
import { projectStatusLabel } from "@/lib/projects";

const statusStyle: Record<ProjectLifecycleStatus, string> = {
  PLANNED: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  ONGOING: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  COMPLETED: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
};

const formatDate = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "Not specified";

const ProjectDetail = () => {
  const { slug = "" } = useParams();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNotFound(false);
    try { setProject(await apiRequest<ProjectRecord>(`/projects/${encodeURIComponent(slug)}`)); }
    catch (nextError) {
      if (nextError instanceof ApiError && nextError.status === 404) setNotFound(true);
      else setError("This project could not be loaded right now. Please try again.");
    } finally { setLoading(false); }
  }, [slug]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <Layout><main className="container min-h-[65vh] py-24"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-5 w-32 rounded bg-secondary" /><div className="mt-8 aspect-[21/9] rounded-3xl bg-secondary/60" /><div className="mt-8 h-10 w-3/4 rounded bg-secondary" /><div className="mt-5 h-5 rounded bg-secondary/60" /></div></main></Layout>;
  if (notFound || error || !project) return <Layout><main className="container flex min-h-[65vh] items-center justify-center py-24"><div className="max-w-lg rounded-2xl border border-border bg-card/35 p-8 text-center"><Layers3 className="mx-auto text-primary" size={32} /><h1 className="mt-4 font-display text-2xl font-bold">{notFound ? "Project not found" : "Unable to load project"}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{notFound ? "This project may be unpublished, archived, or the address may be incorrect." : error}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link to="/projects" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm"><ArrowLeft size={15} />All Projects</Link>{!notFound && <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><RefreshCw size={15} />Try Again</button>}</div></div></main></Layout>;

  const dates: Array<[string, string]> = [
    ["Started", formatDate(project.startDate)],
    ["Expected completion", formatDate(project.expectedCompletionDate)],
    ...(project.projectStatus === "COMPLETED" ? [["Completed", formatDate(project.actualCompletionDate)] as [string, string]] : []),
  ];
  const seoDescription = project.shortDescription.slice(0, 160);

  return <Layout>
    <SEO title={`${project.title} | RUET IoT Club`} description={seoDescription} path={`/projects/${project.slug}`} image={project.coverImage ? `https://ruetiotclub.org${project.coverImage.url}` : undefined} type="article" jsonLd={{ "@context": "https://schema.org", "@type": "CreativeWork", name: project.title, description: project.shortDescription, url: `https://ruetiotclub.org/projects/${project.slug}`, ...(project.coverImage ? { image: `https://ruetiotclub.org${project.coverImage.url}` } : {}) }} />
    <main className="pb-24 pt-12 sm:pt-16">
      <div className="container max-w-6xl">
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"><ArrowLeft size={16} />Back to Projects</Link>
        <article className="mt-7 overflow-hidden rounded-3xl border border-border bg-card/35">
          <ProjectHero key={project.coverImage?.key ?? project.id} project={project} />
          <div className="p-6 sm:p-9 lg:p-12">
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${statusStyle[project.projectStatus]}`}>{projectStatusLabel(project.projectStatus)}</span>{project.category && <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1.5 text-xs font-medium text-primary">{project.category}</span>}</div>
            <h1 className="mt-5 max-w-4xl font-display text-3xl font-bold leading-tight sm:text-5xl">{project.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{project.shortDescription}</p>
            <div className="mt-8 grid gap-4 border-y border-border py-6 sm:grid-cols-2 lg:grid-cols-4"><Info icon={<Users size={18} />} label="Project lead" value={project.projectLead || "Not specified"} />{dates.map(([label, value]) => <Info key={label} icon={<CalendarDays size={18} />} label={label} value={value} />)}</div>
            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-10">{project.description && <ContentSection title="About the project"><p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground sm:text-base">{project.description}</p></ContentSection>}{project.objectives.length > 0 && <ListSection title="Objectives" values={project.objectives} />}{project.features.length > 0 && <ListSection title="Key Features" values={project.features} />}{project.outcomes && <ContentSection title="Outcomes & Results"><p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground sm:text-base">{project.outcomes}</p></ContentSection>}</div>
              <aside className="space-y-5"><TagBlock title="Technologies" values={project.technologies} /><TagBlock title="Team Members" values={project.teamMembers} /><TagBlock title="Partners & Sponsors" values={project.partners} /><TagBlock title="Tags" values={project.tags} />{(project.projectUrl || project.githubUrl || project.demoUrl) && <div className="rounded-2xl border border-border bg-background/30 p-5"><h2 className="font-semibold">Project Links</h2><div className="mt-4 grid gap-2">{project.projectUrl && <ProjectLink href={project.projectUrl} label="Project Website" />}{project.githubUrl && <ProjectLink href={project.githubUrl} label="GitHub Repository" github />}{project.demoUrl && <ProjectLink href={project.demoUrl} label="Live Demo" />}</div></div>}</aside>
            </div>
            {project.gallery.length > 1 && <section className="mt-12"><h2 className="font-display text-2xl font-semibold">Project Gallery</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{project.gallery.map((image) => <ProjectGalleryImage key={image.key} image={image} title={project.title} />)}</div></section>}
          </div>
        </article>
      </div>
    </main>
  </Layout>;
};

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex gap-3"><span className="mt-0.5 text-primary">{icon}</span><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>; }
function ContentSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="font-display text-2xl font-semibold">{title}</h2><div className="mt-4">{children}</div></section>; }
function ListSection({ title, values }: { title: string; values: string[] }) { return <ContentSection title={title}><ul className="grid gap-3">{values.map((value) => <li key={value} className="flex gap-3 text-sm leading-6 text-muted-foreground sm:text-base"><span className="mt-2.5 size-1.5 flex-none rounded-full bg-primary" />{value}</li>)}</ul></ContentSection>; }
function TagBlock({ title, values }: { title: string; values: string[] }) { return values.length ? <div className="rounded-2xl border border-border bg-background/30 p-5"><h2 className="text-sm font-semibold">{title}</h2><div className="mt-3 flex flex-wrap gap-2">{values.map((value) => <span key={value} className="rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-xs text-primary">{value}</span>)}</div></div> : null; }
function ProjectLink({ href, label, github }: { href: string; label: string; github?: boolean }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:text-primary">{github ? <Github size={15} /> : <ExternalLink size={15} />}{label}</a>; }
function ProjectHero({ project }: { project: ProjectRecord }) { const [failed, setFailed] = useState(false); return project.coverImage && !failed ? <img src={project.coverImage.url} alt={project.coverImage.alt?.trim() || project.title} onError={() => setFailed(true)} className="aspect-[21/9] max-h-[34rem] w-full object-cover" /> : <div className="circuit-pattern flex aspect-[21/9] max-h-[34rem] min-h-64 items-center justify-center border-b border-primary/10 bg-gradient-to-br from-primary/[0.09] via-card to-background" aria-label={failed ? "Project image unavailable" : "No project image provided"}><span className="flex size-24 items-center justify-center rounded-full border border-primary/20 bg-background/65 text-primary"><Layers3 size={40} /></span></div>; }
function ProjectGalleryImage({ image, title }: { image: ProjectRecord["gallery"][number]; title: string }) { const [failed, setFailed] = useState(false); return failed ? <div className="circuit-pattern flex aspect-video items-center justify-center rounded-2xl border border-border bg-background/40 text-primary" aria-label="Project gallery image unavailable"><Layers3 size={24} /></div> : <img src={image.url} alt={image.alt?.trim() || `${title} project image`} loading="lazy" onError={() => setFailed(true)} className="aspect-video w-full rounded-2xl border border-border object-cover" />; }

export default ProjectDetail;
