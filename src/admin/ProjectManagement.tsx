import { useCallback, useEffect, useState } from "react";
import { Activity, Archive, CalendarClock, CheckCircle2, ExternalLink, Eye, FilePenLine, Github, Layers3, LoaderCircle, Pencil, Plus, Search, Send, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiRequest } from "@/lib/api";
import type { ProjectImage, ProjectLifecycleStatus, ProjectListResponse, ProjectOptions, ProjectPublicationStatus, ProjectRecord, ProjectStats } from "@/lib/projects";
import { projectSlug, projectStatusLabel } from "@/lib/projects";
import { AdminCard, AdminPageHeader, ConfirmDialog, EmptyState, ErrorState, StatusBadge, adminButton, adminInput, adminSecondaryButton } from "./AdminUI";
import { ProjectImageManager } from "./ProjectImageManager";

type ProjectFormState = {
  id: string;
  title: string;
  slug: string;
  slugTouched: boolean;
  shortDescription: string;
  description: string;
  projectStatus: ProjectLifecycleStatus;
  publicationStatus: Exclude<ProjectPublicationStatus, "ARCHIVED">;
  category: string;
  projectLead: string;
  teamMembers: string[];
  startDate: string;
  expectedCompletionDate: string;
  actualCompletionDate: string;
  images: ProjectImage[];
  coverKey: string | null;
  technologies: string[];
  tags: string[];
  objectives: string[];
  features: string[];
  outcomes: string;
  partners: string[];
  projectUrl: string;
  githubUrl: string;
  demoUrl: string;
  sortOrder: number;
  advanced: string;
};

const emptyStats: ProjectStats = { total: 0, ongoing: 0, completed: 0, planned: 0, drafts: 0 };
const emptyForm = (): ProjectFormState => ({
  id: "", title: "", slug: "", slugTouched: false, shortDescription: "", description: "", projectStatus: "PLANNED", publicationStatus: "DRAFT",
  category: "", projectLead: "", teamMembers: [], startDate: "", expectedCompletionDate: "", actualCompletionDate: "", images: [], coverKey: null,
  technologies: [], tags: [], objectives: [], features: [], outcomes: "", partners: [], projectUrl: "", githubUrl: "", demoUrl: "", sortOrder: 0, advanced: "{}",
});

function formFromProject(project: ProjectRecord): ProjectFormState {
  const images = [...project.gallery];
  if (project.coverImage && !images.some((image) => image.key === project.coverImage?.key)) images.unshift(project.coverImage);
  return {
    id: project.id, title: project.title, slug: project.slug, slugTouched: true, shortDescription: project.shortDescription, description: project.description,
    projectStatus: project.projectStatus, publicationStatus: project.publicationStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT", category: project.category,
    projectLead: project.projectLead, teamMembers: project.teamMembers, startDate: project.startDate ?? "", expectedCompletionDate: project.expectedCompletionDate ?? "",
    actualCompletionDate: project.actualCompletionDate ?? "", images, coverKey: project.coverImage?.key ?? null, technologies: project.technologies,
    tags: project.tags, objectives: project.objectives, features: project.features, outcomes: project.outcomes, partners: project.partners,
    projectUrl: project.projectUrl ?? "", githubUrl: project.githubUrl ?? "", demoUrl: project.demoUrl ?? "", sortOrder: project.sortOrder,
    advanced: JSON.stringify(project.advanced ?? {}, null, 2),
  };
}

function projectPayload(form: ProjectFormState, publicationStatus: "DRAFT" | "PUBLISHED") {
  let advanced: Record<string, unknown>;
  try { advanced = JSON.parse(form.advanced || "{}") as Record<string, unknown>; }
  catch { throw new Error("Advanced fields must contain valid JSON."); }
  const coverImage = form.images.find((image) => image.key === form.coverKey) ?? null;
  return {
    title: form.title.trim(), slug: form.slug.trim() || undefined, shortDescription: form.shortDescription.trim(), description: form.description.trim(),
    projectStatus: form.projectStatus, publicationStatus, category: form.category.trim(), projectLead: form.projectLead.trim(), teamMembers: form.teamMembers,
    startDate: form.startDate || undefined, expectedCompletionDate: form.expectedCompletionDate || undefined,
    actualCompletionDate: form.projectStatus === "COMPLETED" && form.actualCompletionDate ? form.actualCompletionDate : undefined,
    coverImage, gallery: form.images, technologies: form.technologies, tags: form.tags, objectives: form.objectives, features: form.features,
    outcomes: form.outcomes.trim(), partners: form.partners, projectUrl: form.projectUrl.trim() || undefined, githubUrl: form.githubUrl.trim() || undefined,
    demoUrl: form.demoUrl.trim() || undefined, sortOrder: form.sortOrder, advanced,
  };
}

function humanError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code === "CSRF_VALIDATION_FAILED") return "Your security session changed in another tab. Refresh this page once, then try again.";
  return error instanceof Error ? error.message : fallback;
}

export default function ProjectManagement({ canManage, csrfToken }: { canManage: boolean; csrfToken?: string }) {
  const [items, setItems] = useState<ProjectRecord[]>([]);
  const [stats, setStats] = useState<ProjectStats>(emptyStats);
  const [facets, setFacets] = useState({ categories: [] as string[], leads: [] as string[] });
  const [options, setOptions] = useState<ProjectOptions>({ people: [], partners: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [publicationStatus, setPublicationStatus] = useState("");
  const [category, setCategory] = useState("");
  const [lead, setLead] = useState("");
  const [sort, setSort] = useState("updated");
  const [form, setForm] = useState<ProjectFormState | null>(null);
  const [details, setDetails] = useState<ProjectRecord | null>(null);
  const [archive, setArchive] = useState<ProjectRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ sort });
      if (search.trim()) query.set("search", search.trim());
      if (projectStatus) query.set("projectStatus", projectStatus);
      if (publicationStatus) query.set("publicationStatus", publicationStatus);
      if (category) query.set("category", category);
      if (lead) query.set("lead", lead);
      const result = await apiRequest<ProjectListResponse>(`/admin/projects?${query}`);
      setItems(result.items); setStats(result.stats); setFacets(result.facets);
    } catch (nextError) { setError(humanError(nextError, "Unable to load projects. Please try again.")); }
    finally { setLoading(false); }
  }, [category, lead, projectStatus, publicationStatus, search, sort]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 220); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { void apiRequest<ProjectOptions>("/admin/projects/options").then(setOptions).catch(() => undefined); }, []);

  const persist = async (nextForm: ProjectFormState, status: "DRAFT" | "PUBLISHED", close = true) => {
    if (!csrfToken) { toast.error("Your administrator session is not ready. Refresh the page and try again."); return; }
    if (!nextForm.title.trim() || !nextForm.shortDescription.trim()) { toast.error("Project title and short description are required."); return; }
    setBusy(true);
    try {
      const id = nextForm.id || crypto.randomUUID();
      const result = await apiRequest<{ created: boolean }>(`/admin/projects/${encodeURIComponent(id)}`, { method: "PUT", csrfToken, body: projectPayload(nextForm, status) });
      toast.success(status === "PUBLISHED" ? "Project published successfully." : result.created ? "Project created successfully." : "Project updated successfully.");
      if (close) setForm(null);
      await load();
    } catch (nextError) { toast.error(humanError(nextError, "Project could not be saved. Please try again.")); }
    finally { setBusy(false); }
  };

  const changePublication = async (project: ProjectRecord, status: "DRAFT" | "PUBLISHED") => {
    await persist(formFromProject(project), status);
  };
  const archiveProject = async () => {
    if (!archive || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/projects/${encodeURIComponent(archive.id)}/archive`, { method: "POST", csrfToken });
      toast.success("Project archived successfully."); setArchive(null); await load();
    } catch (nextError) { toast.error(humanError(nextError, "Project could not be archived. Please try again.")); }
    finally { setBusy(false); }
  };

  const statCards = [
    { label: "Total Projects", value: stats.total, icon: Layers3 }, { label: "Ongoing", value: stats.ongoing, icon: Activity },
    { label: "Completed", value: stats.completed, icon: CheckCircle2 }, { label: "Planned", value: stats.planned, icon: CalendarClock },
    { label: "Drafts", value: stats.drafts, icon: FilePenLine },
  ];

  return <div className="space-y-6">
    <AdminPageHeader title="Projects" description="Create, manage, review, and publish RUET IoT Club projects." actions={canManage && <button type="button" onClick={() => setForm(emptyForm())} className={adminButton}><Plus size={17} />Create Project</button>} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{statCards.map(({ label, value, icon: Icon }) => <AdminCard key={label} className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-white/5" /> : value}</p></div><span className="rounded-xl bg-primary/[0.08] p-2 text-primary"><Icon size={18} /></span></div></AdminCard>)}</div>
    <AdminCard className="p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(14rem,1fr)_10rem_11rem_12rem_12rem_11rem]"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><span className="sr-only">Search projects</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects…" className={`${adminInput} pl-9`} /></label><FilterSelect label="Project status" value={projectStatus} onChange={setProjectStatus} options={["PLANNED", "ONGOING", "COMPLETED"]} all="All statuses" /><FilterSelect label="Publication status" value={publicationStatus} onChange={setPublicationStatus} options={["DRAFT", "PUBLISHED", "ARCHIVED"]} all="All publication" /><FilterSelect label="Category" value={category} onChange={setCategory} options={facets.categories} all="All categories" /><FilterSelect label="Project lead" value={lead} onChange={setLead} options={facets.leads} all="All project leads" /><FilterSelect label="Sort projects" value={sort} onChange={setSort} options={["newest", "oldest", "updated", "alphabetical"]} all="" /></div></AdminCard>
    {loading ? <ProjectSkeleton /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : items.length === 0 ? <EmptyState title="No projects yet" description="Create your first project to start building the RUET IoT Club project portfolio." action={canManage && <button type="button" onClick={() => setForm(emptyForm())} className={adminButton}><Plus size={16} />Create Project</button>} /> : <ProjectList items={items} canManage={canManage} onView={setDetails} onEdit={(project) => setForm(formFromProject(project))} onPublish={(project) => void changePublication(project, project.publicationStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED")} onArchive={setArchive} busy={busy} />}
    {form && <ProjectEditor form={form} setForm={setForm} options={options} csrfToken={csrfToken} busy={busy} onClose={() => setForm(null)} onSave={(status) => void persist(form, status)} />}
    {details && <ProjectDetails project={details} onClose={() => setDetails(null)} onEdit={canManage && details.publicationStatus !== "ARCHIVED" ? () => { setForm(formFromProject(details)); setDetails(null); } : undefined} />}
    <ConfirmDialog open={Boolean(archive)} title="Archive project" description={`Archive ${archive?.title ?? "this project"}? It will be removed from public listings. Associated R2 images will not be deleted.`} confirmLabel="Archive project" dangerous busy={busy} onCancel={() => setArchive(null)} onConfirm={() => void archiveProject()} />
  </div>;
}

function FilterSelect({ label, value, onChange, options, all }: { label: string; value: string; onChange: (value: string) => void; options: string[]; all: string }) {
  return <label><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={adminInput}>{all && <option value="">{all}</option>}{options.map((option) => <option key={option} value={option}>{projectStatusLabel(option)}</option>)}</select></label>;
}

function ProjectSkeleton() { return <div className="space-y-3"><div className="hidden rounded-2xl border border-primary/10 p-5 lg:block">{[0, 1, 2, 3].map((item) => <div key={item} className="mb-4 h-14 animate-pulse rounded-xl bg-white/[0.035] last:mb-0" />)}</div><div className="grid gap-3 sm:grid-cols-2 lg:hidden">{[0, 1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-primary/10 bg-white/[0.025]" />)}</div></div>; }

function ProjectList({ items, canManage, busy, onView, onEdit, onPublish, onArchive }: { items: ProjectRecord[]; canManage: boolean; busy: boolean; onView: (project: ProjectRecord) => void; onEdit: (project: ProjectRecord) => void; onPublish: (project: ProjectRecord) => void; onArchive: (project: ProjectRecord) => void }) {
  const actions = (project: ProjectRecord) => <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => onView(project)} className={adminSecondaryButton}><Eye size={15} />View</button>{canManage && project.publicationStatus !== "ARCHIVED" && <><button type="button" onClick={() => onEdit(project)} className={adminSecondaryButton}><Pencil size={15} />Edit</button><button type="button" disabled={busy} onClick={() => onPublish(project)} className={adminSecondaryButton}><Send size={15} />{project.publicationStatus === "PUBLISHED" ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => onArchive(project)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3 text-sm text-red-300 hover:bg-red-500/10"><Archive size={15} />Archive</button></>}</div>;
  return <AdminCard><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b border-[hsl(var(--admin-border))] text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3">Project</th><th className="px-4 py-3">Project Status</th><th className="px-4 py-3">Publication</th><th className="px-4 py-3">Project Lead</th><th className="px-4 py-3">Start Date</th><th className="px-4 py-3">Last Updated</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{items.map((project) => <tr key={project.id} className="border-b border-[hsl(var(--admin-border))] last:border-0"><td className="max-w-sm px-5 py-4"><div className="flex items-center gap-3">{project.coverImage ? <img src={project.coverImage.url} alt="" className="size-11 flex-none rounded-lg object-cover" /> : <span className="flex size-11 flex-none items-center justify-center rounded-lg bg-primary/[0.06] text-primary"><Layers3 size={18} /></span>}<div className="min-w-0"><p className="truncate font-medium">{project.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{project.shortDescription}</p></div></div></td><td className="px-4 py-4"><StatusBadge status={project.projectStatus} /></td><td className="px-4 py-4"><StatusBadge status={project.publicationStatus} /></td><td className="px-4 py-4 text-muted-foreground">{project.projectLead || "—"}</td><td className="px-4 py-4 text-muted-foreground">{project.startDate ? new Date(`${project.startDate}T00:00:00`).toLocaleDateString() : "—"}</td><td className="px-4 py-4 text-muted-foreground">{new Date(project.updatedAt).toLocaleDateString()}</td><td className="px-5 py-4">{actions(project)}</td></tr>)}</tbody></table></div><div className="divide-y divide-[hsl(var(--admin-border))] lg:hidden">{items.map((project) => <article key={project.id} className="p-4"><div className="flex items-start gap-3">{project.coverImage ? <img src={project.coverImage.url} alt="" className="size-14 flex-none rounded-xl object-cover" /> : <span className="flex size-14 flex-none items-center justify-center rounded-xl bg-primary/[0.06] text-primary"><Layers3 size={20} /></span>}<div className="min-w-0 flex-1"><h3 className="font-semibold">{project.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{project.shortDescription}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><StatusBadge status={project.projectStatus} /><StatusBadge status={project.publicationStatus} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted-foreground">Project lead</dt><dd className="mt-1 font-medium">{project.projectLead || "—"}</dd></div><div><dt className="text-muted-foreground">Updated</dt><dd className="mt-1 font-medium">{new Date(project.updatedAt).toLocaleDateString()}</dd></div></dl><div className="mt-4">{actions(project)}</div></article>)}</div></AdminCard>;
}

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-[hsl(var(--admin-border))] bg-black/[0.08] p-4 sm:p-5"><h3 className="font-semibold">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}<div className="mt-4 space-y-4">{children}</div></section>; }

function ProjectEditor({ form, setForm, options, csrfToken, busy, onClose, onSave }: { form: ProjectFormState; setForm: (form: ProjectFormState | null) => void; options: ProjectOptions; csrfToken?: string; busy: boolean; onClose: () => void; onSave: (status: "DRAFT" | "PUBLISHED") => void }) {
  const [imageUploading, setImageUploading] = useState(false);
  const patch = (values: Partial<ProjectFormState>) => setForm({ ...form, ...values });
  const peopleNames = options.people.map((person) => person.name);
  const partnerNames = options.partners.map((partner) => partner.name);
  return <div className="fixed inset-0 z-[90] flex justify-end bg-black/70"><button type="button" aria-label="Close project editor" className="absolute inset-0" onClick={onClose} /><aside role="dialog" aria-modal="true" aria-labelledby="project-editor-title" className="relative h-full w-full max-w-4xl overflow-y-auto border-l border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] shadow-2xl"><header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/95 px-4 py-4 backdrop-blur sm:px-6"><div><p className="text-xs text-muted-foreground">Project Management</p><h2 id="project-editor-title" className="text-lg font-semibold">{form.id ? "Edit Project" : "Create Project"}</h2></div><button type="button" aria-label="Close editor" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-white/5"><X size={20} /></button></header><form onSubmit={(event) => { event.preventDefault(); onSave(form.publicationStatus); }} className="space-y-5 p-4 sm:p-6">
    <FormSection title="1. Basic Information"><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-medium">Project Title *<input required maxLength={200} value={form.title} onChange={(event) => { const title = event.target.value; patch({ title, ...(!form.slugTouched ? { slug: projectSlug(title) } : {}) }); }} className={`${adminInput} mt-2`} /></label><label className="sm:col-span-2 text-sm font-medium">Short Description *<textarea required maxLength={500} rows={3} value={form.shortDescription} onChange={(event) => patch({ shortDescription: event.target.value })} className={`${adminInput} mt-2 resize-y`} /></label><label className="sm:col-span-2 text-sm font-medium">Description<textarea maxLength={10000} rows={7} value={form.description} onChange={(event) => patch({ description: event.target.value })} className={`${adminInput} mt-2 resize-y`} /></label><label className="text-sm font-medium">Category<input maxLength={100} value={form.category} onChange={(event) => patch({ category: event.target.value })} className={`${adminInput} mt-2`} /></label><label className="text-sm font-medium">SEO Slug<input maxLength={220} value={form.slug} onChange={(event) => patch({ slug: projectSlug(event.target.value), slugTouched: true })} className={`${adminInput} mt-2`} /><span className="mt-1 block text-xs font-normal text-muted-foreground">The Worker guarantees uniqueness.</span></label></div></FormSection>
    <FormSection title="2. Project Status & Timeline"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-medium">Project Status *<select required value={form.projectStatus} onChange={(event) => patch({ projectStatus: event.target.value as ProjectLifecycleStatus, ...(event.target.value !== "COMPLETED" ? { actualCompletionDate: "" } : {}) })} className={`${adminInput} mt-2`}><option value="PLANNED">Planned</option><option value="ONGOING">Ongoing</option><option value="COMPLETED">Completed</option></select></label><label className="text-sm font-medium">Publication Status<select value={form.publicationStatus} onChange={(event) => patch({ publicationStatus: event.target.value as "DRAFT" | "PUBLISHED" })} className={`${adminInput} mt-2`}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label><label className="text-sm font-medium">Display Order<input type="number" min={-100000} max={100000} value={form.sortOrder} onChange={(event) => patch({ sortOrder: Number(event.target.value) || 0 })} className={`${adminInput} mt-2`} /></label><label className="text-sm font-medium">Start Date<input type="date" value={form.startDate} onChange={(event) => patch({ startDate: event.target.value })} className={`${adminInput} mt-2`} /></label><label className="text-sm font-medium">Expected Completion Date<input type="date" min={form.startDate || undefined} value={form.expectedCompletionDate} onChange={(event) => patch({ expectedCompletionDate: event.target.value })} className={`${adminInput} mt-2`} /></label><label className="text-sm font-medium">Actual Completion Date<input type="date" disabled={form.projectStatus !== "COMPLETED"} min={form.startDate || undefined} value={form.actualCompletionDate} onChange={(event) => patch({ actualCompletionDate: event.target.value })} className={`${adminInput} mt-2`} /></label></div></FormSection>
    <FormSection title="3. Project Images (Optional)" description="Files stay in the shared Cloudflare R2 media library; D1 stores only image references."><ProjectImageManager images={form.images} coverKey={form.coverKey} title={form.title} csrfToken={csrfToken} disabled={busy} onUploadingChange={setImageUploading} onChange={(images, coverKey) => patch({ images, coverKey })} /></FormSection>
    <FormSection title="4. Team & People"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Project Lead<input list="project-people-options" maxLength={200} value={form.projectLead} onChange={(event) => patch({ projectLead: event.target.value })} className={`${adminInput} mt-2`} /></label><div className="sm:col-span-2"><TagEditor label="Team Members" values={form.teamMembers} suggestions={peopleNames} onChange={(teamMembers) => patch({ teamMembers })} placeholder="Add a team member" /></div><datalist id="project-people-options">{peopleNames.map((name) => <option key={name} value={name} />)}</datalist></div></FormSection>
    <FormSection title="5. Technologies & Tags"><div className="grid gap-4 sm:grid-cols-2"><TagEditor label="Technologies / Tools" values={form.technologies} onChange={(technologies) => patch({ technologies })} placeholder="Add a technology" /><TagEditor label="Tags" values={form.tags} onChange={(tags) => patch({ tags })} placeholder="Add a tag" /></div></FormSection>
    <FormSection title="6. Objectives & Outcomes"><div className="grid gap-4 sm:grid-cols-2"><TagEditor label="Objectives" values={form.objectives} onChange={(objectives) => patch({ objectives })} placeholder="Add an objective" /><TagEditor label="Key Features" values={form.features} onChange={(features) => patch({ features })} placeholder="Add a feature" /><label className="sm:col-span-2 text-sm font-medium">Outcomes / Results<textarea maxLength={10000} rows={5} value={form.outcomes} onChange={(event) => patch({ outcomes: event.target.value })} className={`${adminInput} mt-2 resize-y`} /></label><div className="sm:col-span-2"><TagEditor label="Partners / Sponsors" values={form.partners} suggestions={partnerNames} onChange={(partners) => patch({ partners })} placeholder="Add a partner or sponsor" /></div></div></FormSection>
    <FormSection title="7. External Links"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Project URL<input type="url" maxLength={1000} value={form.projectUrl} onChange={(event) => patch({ projectUrl: event.target.value })} placeholder="https://" className={`${adminInput} mt-2`} /></label><label className="text-sm font-medium">GitHub Repository<input type="url" maxLength={1000} value={form.githubUrl} onChange={(event) => patch({ githubUrl: event.target.value })} placeholder="https://github.com/…" className={`${adminInput} mt-2`} /></label><label className="text-sm font-medium sm:col-span-2">Demo URL<input type="url" maxLength={1000} value={form.demoUrl} onChange={(event) => patch({ demoUrl: event.target.value })} placeholder="https://" className={`${adminInput} mt-2`} /></label></div></FormSection>
    <details className="rounded-2xl border border-[hsl(var(--admin-border))] p-4"><summary className="cursor-pointer font-semibold">8. Advanced Fields</summary><p className="mt-2 text-xs text-muted-foreground">Optional JSON fields are preserved inside the existing project content record.</p><textarea rows={10} value={form.advanced} onChange={(event) => patch({ advanced: event.target.value })} className={`${adminInput} mt-3 font-mono text-xs`} /></details>
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:justify-end sm:px-6"><button type="button" onClick={onClose} className={adminSecondaryButton}>Cancel</button><button type="button" disabled={busy || imageUploading} onClick={() => onSave("DRAFT")} className={adminSecondaryButton}>{busy || imageUploading ? <LoaderCircle className="animate-spin" size={16} /> : <FilePenLine size={16} />}Save Draft</button><button type="button" disabled={busy || imageUploading} onClick={() => onSave("PUBLISHED")} className={adminButton}>{busy || imageUploading ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}Save & Publish</button></div>
  </form></aside></div>;
}

function TagEditor({ label, values, onChange, suggestions = [], placeholder }: { label: string; values: string[]; onChange: (values: string[]) => void; suggestions?: string[]; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => { const value = draft.trim(); if (!value || values.some((item) => item.toLowerCase() === value.toLowerCase())) return; onChange([...values, value]); setDraft(""); };
  const listId = `list-${label.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`;
  return <div><label className="text-sm font-medium">{label}<span className="mt-2 flex gap-2"><input list={suggestions.length ? listId : undefined} value={draft} maxLength={200} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder={placeholder} className={adminInput} /><button type="button" onClick={add} className={`${adminSecondaryButton} flex-none px-3`}><Plus size={16} />Add</button></span></label>{suggestions.length > 0 && <datalist id={listId}>{suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist>}{values.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{values.map((value) => <span key={value} className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-xs">{value}<button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`} className="rounded-full p-0.5 text-muted-foreground hover:text-red-300"><X size={12} /></button></span>)}</div>}</div>;
}

function ProjectDetails({ project, onClose, onEdit }: { project: ProjectRecord; onClose: () => void; onEdit?: () => void }) {
  const imageAlt = project.coverImage?.alt?.trim() || project.title;
  const list = (label: string, values: string[]) => values.length > 0 && <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-2 flex flex-wrap gap-2">{values.map((value) => <span key={value} className="rounded-full bg-primary/[0.07] px-2.5 py-1 text-xs text-primary">{value}</span>)}</dd></div>;
  return <div className="fixed inset-0 z-[95] flex justify-end bg-black/70"><button type="button" aria-label="Close project details" className="absolute inset-0" onClick={onClose} /><aside role="dialog" aria-modal="true" aria-labelledby="project-details-title" className="relative h-full w-full max-w-3xl overflow-y-auto border-l border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/95 p-4 backdrop-blur sm:px-6"><div><p className="text-xs text-muted-foreground">Project Details</p><h2 id="project-details-title" className="text-lg font-semibold">{project.title}</h2></div><button type="button" aria-label="Close details" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-white/5"><X size={20} /></button></header><div className="space-y-5 p-4 sm:p-6">{project.coverImage ? <img src={project.coverImage.url} alt={imageAlt} className="aspect-video w-full rounded-2xl object-cover" /> : <div className="circuit-pattern flex aspect-video items-center justify-center rounded-2xl border border-primary/10 bg-gradient-to-br from-card to-background text-primary"><Layers3 size={38} /></div>}<div className="flex flex-wrap gap-2"><StatusBadge status={project.projectStatus} /><StatusBadge status={project.publicationStatus} />{project.category && <span className="rounded-full border border-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">{project.category}</span>}</div><p className="text-sm font-medium leading-6">{project.shortDescription}</p>{project.description && <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{project.description}</p>}<dl className="grid gap-5 rounded-2xl border border-[hsl(var(--admin-border))] p-5 sm:grid-cols-2"><Detail label="Project lead" value={project.projectLead} /><Detail label="Start date" value={project.startDate} /><Detail label="Expected completion" value={project.expectedCompletionDate} /><Detail label="Actual completion" value={project.actualCompletionDate} />{list("Team members", project.teamMembers)}{list("Technologies", project.technologies)}{list("Tags", project.tags)}{list("Partners", project.partners)}</dl>{project.objectives.length > 0 && <TextList title="Objectives" values={project.objectives} />}{project.features.length > 0 && <TextList title="Key features" values={project.features} />}{project.outcomes && <div><h3 className="font-semibold">Outcomes / Results</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{project.outcomes}</p></div>}{project.gallery.length > 1 && <div><h3 className="font-semibold">Project Gallery</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{project.gallery.map((image) => <img key={image.key} src={image.url} alt={image.alt?.trim() || project.title} className="aspect-video w-full rounded-xl object-cover" />)}</div></div>}<div className="flex flex-wrap gap-2">{project.projectUrl && <ExternalButton href={project.projectUrl} label="Project Website" />}{project.githubUrl && <ExternalButton href={project.githubUrl} label="GitHub" github />}{project.demoUrl && <ExternalButton href={project.demoUrl} label="Live Demo" />}</div>{onEdit && <button type="button" onClick={onEdit} className={`${adminButton} w-full`}><Pencil size={16} />Edit Project</button>}</div></aside></div>;
}

function Detail({ label, value }: { label: string; value: string | null }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value || "—"}</dd></div>; }
function TextList({ title, values }: { title: string; values: string[] }) { return <div><h3 className="font-semibold">{title}</h3><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{values.map((value) => <li key={value} className="flex gap-2"><span className="mt-2 size-1.5 flex-none rounded-full bg-primary" />{value}</li>)}</ul></div>; }
function ExternalButton({ href, label, github }: { href: string; label: string; github?: boolean }) { return <a href={href} target="_blank" rel="noopener noreferrer" className={adminSecondaryButton}>{github ? <Github size={16} /> : <ExternalLink size={16} />}{label}</a>; }
