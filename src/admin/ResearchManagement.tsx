import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Download, FilePlus2, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import {
  AdminCard,
  AdminPageHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  adminButton,
  adminInput,
  adminSecondaryButton,
} from "./AdminUI";
import SubmissionCenter from "./SubmissionCenter";

type Tab =
  | "overview"
  | "proposals"
  | "works"
  | "publications"
  | "researchers"
  | "reviews";
interface Researcher {
  id?: string;
  name: string;
  role?: string;
  institution?: string;
  email?: string;
  photoUrl?: string;
}
interface Document {
  id?: string;
  type: string;
  title: string;
  url: string;
  objectKey?: string;
  contentType?: string;
  byteSize?: number;
  sortOrder: number;
}
interface Work {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  abstract?: string;
  research_status: string;
  category?: string;
  research_area?: string;
  keywords: string[];
  publication_title?: string;
  journal_conference?: string;
  publisher?: string;
  publication_date?: string;
  doi?: string;
  isbn_issn?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  citation?: string;
  external_url?: string;
  cover_url?: string;
  workflow_status: string;
  featured: number;
  sort_order: number;
  researchers: Researcher[];
  documents: Document[];
  updated_at: string;
}
interface Form {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  abstract: string;
  researchStatus: string;
  category: string;
  researchArea: string;
  keywords: string;
  publicationTitle: string;
  journalConference: string;
  publisher: string;
  publicationDate: string;
  doi: string;
  isbnIssn: string;
  volume: string;
  issue: string;
  pages: string;
  citation: string;
  externalUrl: string;
  coverUrl: string;
  workflowStatus: string;
  featured: boolean;
  sortOrder: number;
  researchers: Researcher[];
  documents: Document[];
}
const emptyForm = (): Form => ({
  id: "",
  title: "",
  slug: "",
  shortDescription: "",
  abstract: "",
  researchStatus: "ONGOING",
  category: "",
  researchArea: "",
  keywords: "",
  publicationTitle: "",
  journalConference: "",
  publisher: "",
  publicationDate: "",
  doi: "",
  isbnIssn: "",
  volume: "",
  issue: "",
  pages: "",
  citation: "",
  externalUrl: "",
  coverUrl: "",
  workflowStatus: "DRAFT",
  featured: false,
  sortOrder: 0,
  researchers: [],
  documents: [],
});
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function ResearchManagement({
  permissions,
  csrfToken,
  onCountChange,
}: {
  permissions: string[];
  csrfToken?: string;
  onCountChange?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview"),
    [items, setItems] = useState<Work[]>([]),
    [proposalStats, setProposalStats] = useState({
      pending: 0,
      approved: 0,
      rejected: 0,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [form, setForm] = useState<Form | null>(null),
    [busy, setBusy] = useState(false),
    [archive, setArchive] = useState<Work | null>(null);
  const canManage = permissions.includes("research.manage"),
    canPublish = permissions.includes("content.publish");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<{
        items: Work[];
        proposalStats: { pending: number; approved: number; rejected: number };
      }>("/admin/research");
      setItems(data.items);
      setProposalStats(data.proposalStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      items.filter(
        (w) =>
          (!search ||
            `${w.title} ${w.research_area || ""}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (tab !== "publications" || w.research_status === "PUBLISHED"),
      ),
    [items, search, tab],
  );
  const open = (w?: Work) =>
    setForm(
      w
        ? {
            id: w.id,
            title: w.title,
            slug: w.slug,
            shortDescription: w.short_description || "",
            abstract: w.abstract || "",
            researchStatus: w.research_status,
            category: w.category || "",
            researchArea: w.research_area || "",
            keywords: (w.keywords || []).join(", "),
            publicationTitle: w.publication_title || "",
            journalConference: w.journal_conference || "",
            publisher: w.publisher || "",
            publicationDate: w.publication_date || "",
            doi: w.doi || "",
            isbnIssn: w.isbn_issn || "",
            volume: w.volume || "",
            issue: w.issue || "",
            pages: w.pages || "",
            citation: w.citation || "",
            externalUrl: w.external_url || "",
            coverUrl: w.cover_url || "",
            workflowStatus: w.workflow_status,
            featured: Boolean(w.featured),
            sortOrder: w.sort_order,
            researchers: w.researchers || [],
            documents: w.documents || [],
          }
        : emptyForm(),
    );
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !csrfToken) return;
    setBusy(true);
    try {
      const id = form.id || crypto.randomUUID();
      await apiRequest(`/admin/research/${id}`, {
        method: "PUT",
        csrfToken,
        body: {
          ...form,
          slug: form.slug || undefined,
          keywords: form.keywords
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          researchers: form.researchers,
          documents: form.documents,
        },
      });
      toast.success("Research work saved.");
      setForm(null);
      await load();
      onCountChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save research.");
    } finally {
      setBusy(false);
    }
  };
  const upload = async (files: FileList | null) => {
    if (!files || !form || !csrfToken) return;
    setBusy(true);
    try {
      const docs = [...form.documents];
      let coverUrl = form.coverUrl;
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("file", file);
        const media = await apiRequest<{
          key: string;
          url: string;
          originalName: string;
          contentType: string;
          byteSize: number;
        }>("/media/upload", { method: "POST", csrfToken, body });
        docs.push({
          type:
            file.type === "application/pdf"
              ? "PDF"
              : file.type.includes("presentation")
                ? "PRESENTATION"
                : file.type.startsWith("image/")
                  ? "COVER"
                  : "SUPPLEMENTARY",
          title: file.name,
          url: media.url,
          objectKey: media.key,
          contentType: media.contentType,
          byteSize: media.byteSize,
          sortOrder: docs.length,
        });
        if (file.type.startsWith("image/") && !coverUrl) coverUrl = media.url;
      }
      setForm({ ...form, documents: docs, coverUrl });
      toast.success("Research files uploaded to R2.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const doArchive = async () => {
    if (!archive || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/research/${archive.id}/archive`, {
        method: "POST",
        csrfToken,
      });
      toast.success("Research archived.");
      setArchive(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed.");
    } finally {
      setBusy(false);
    }
  };
  const exportCsv = () => {
    const rows = [
      [
        "Title",
        "Status",
        "Workflow",
        "Area",
        "Authors",
        "Publication",
        "Updated",
      ],
      ...visible.map((w) => [
        w.title,
        w.research_status,
        w.workflow_status,
        w.research_area,
        w.researchers.map((r) => r.name).join("; "),
        w.journal_conference,
        w.updated_at,
      ]),
    ];
    const blob = new Blob(
      [rows.map((r) => r.map(csv).join(",")).join("\r\n")],
      { type: "text/csv" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `research-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const stats = {
    total: items.length,
    ongoing: items.filter((w) => w.research_status === "ONGOING").length,
    completed: items.filter((w) => w.research_status === "COMPLETED").length,
    published: items.filter((w) => w.workflow_status === "PUBLISHED").length,
  };
  if (tab === "proposals")
    return (
      <div className="space-y-5">
        <ModuleTabs
          value={tab}
          onChange={setTab}
          pending={proposalStats.pending}
        />
        <SubmissionCenter
          section="research"
          permissions={permissions}
          csrfToken={csrfToken}
          onCountChange={onCountChange}
        />
      </div>
    );
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Research Management"
        description="Manage proposals, research works, authors, publication metadata, documents, and public publishing."
        actions={
          <>
            <button onClick={exportCsv} className={adminSecondaryButton}>
              <Download size={16} />
              Export CSV
            </button>
            {canManage && (
              <button onClick={() => open()} className={adminButton}>
                <FilePlus2 size={16} />
                Add Research Work
              </button>
            )}
          </>
        }
      />
      <ModuleTabs
        value={tab}
        onChange={setTab}
        pending={proposalStats.pending}
      />
      {tab === "overview" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total research", stats.total],
            ["Ongoing", stats.ongoing],
            ["Completed", stats.completed],
            ["Published", stats.published],
            ["Pending proposals", proposalStats.pending],
            ["Approved proposals", proposalStats.approved],
            ["Rejected proposals", proposalStats.rejected],
          ].map(([l, v]) => (
            <AdminCard key={String(l)} className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {l}
              </p>
              <p className="mt-2 text-3xl font-semibold">{v}</p>
            </AdminCard>
          ))}
        </div>
      )}
      {(tab === "works" || tab === "publications" || tab === "overview") && (
        <>
          <AdminCard className="p-4">
            <label className="relative block">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or research area…"
                className={`${adminInput} pl-9`}
              />
            </label>
          </AdminCard>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : visible.length === 0 ? (
            <EmptyState
              title="No research published yet"
              description="Add your first research work and publish it when review is complete."
              action={
                canManage && (
                  <button onClick={() => open()} className={adminButton}>
                    Add research work
                  </button>
                )
              }
            />
          ) : (
            <AdminCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="px-5 py-3">Research</th>
                      <th className="px-4 py-3">Authors</th>
                      <th className="px-4 py-3">Research status</th>
                      <th className="px-4 py-3">Workflow</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((w) => (
                      <tr
                        key={w.id}
                        className="border-t border-[hsl(var(--admin-border))]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium">{w.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.research_area || "No area"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {w.researchers.map((r) => r.name).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={w.research_status} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={w.workflow_status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {canManage && (
                              <button
                                onClick={() => open(w)}
                                className={adminSecondaryButton}
                              >
                                Edit
                              </button>
                            )}
                            {canManage && (
                              <button
                                aria-label="Archive"
                                onClick={() => setArchive(w)}
                                className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Archive size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )}
        </>
      )}
      {tab === "researchers" && (
        <AdminCard className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from(
              new Map(
                items
                  .flatMap((w) => w.researchers)
                  .map((r) => [r.email || r.name, r]),
              ).values(),
            ).map((r) => (
              <div
                key={r.email || r.name}
                className="rounded-xl border border-[hsl(var(--admin-border))] p-4"
              >
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.role || "Researcher"} ·{" "}
                  {r.institution || "Institution not specified"}
                </p>
              </div>
            ))}
          </div>
        </AdminCard>
      )}
      {tab === "reviews" && (
        <EmptyState
          title="No research reviews pending"
          description="Review activity appears here when a proposal or research work enters review."
        />
      )}
      {form && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/70">
          <button
            className="absolute inset-0"
            onClick={() => setForm(null)}
            aria-label="Close editor"
          />
          <aside className="relative h-full w-full max-w-3xl overflow-y-auto bg-[hsl(var(--admin-surface-elevated))] p-5">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Research Work</p>
                <h2 className="text-xl font-semibold">
                  {form.id ? "Edit" : "Add"} research
                </h2>
              </div>
              <button onClick={() => setForm(null)}>
                <X />
              </button>
            </div>
            <form onSubmit={save} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Title *"
                  value={form.title}
                  set={(v) => setForm({ ...form, title: v })}
                  required
                />
                <Field
                  label="Slug"
                  value={form.slug}
                  set={(v) => setForm({ ...form, slug: v })}
                />
                <Field
                  label="Research area"
                  value={form.researchArea}
                  set={(v) => setForm({ ...form, researchArea: v })}
                />
                <Field
                  label="Category"
                  value={form.category}
                  set={(v) => setForm({ ...form, category: v })}
                />
                <SelectField
                  label="Research status"
                  value={form.researchStatus}
                  set={(v) => setForm({ ...form, researchStatus: v })}
                  options={["ONGOING", "COMPLETED", "PUBLISHED", "ARCHIVED"]}
                />
                <SelectField
                  label="Workflow"
                  value={form.workflowStatus}
                  set={(v) => setForm({ ...form, workflowStatus: v })}
                  options={[
                    "DRAFT",
                    "REVIEW",
                    ...(canPublish ? ["PUBLISHED"] : []),
                    "ARCHIVED",
                  ]}
                />
              </div>
              <Area
                label="Short description"
                value={form.shortDescription}
                set={(v) => setForm({ ...form, shortDescription: v })}
              />
              <Area
                label="Full abstract"
                value={form.abstract}
                set={(v) => setForm({ ...form, abstract: v })}
                rows={8}
              />
              <Field
                label="Keywords (comma separated)"
                value={form.keywords}
                set={(v) => setForm({ ...form, keywords: v })}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Publication title"
                  value={form.publicationTitle}
                  set={(v) => setForm({ ...form, publicationTitle: v })}
                />
                <Field
                  label="Journal / conference"
                  value={form.journalConference}
                  set={(v) => setForm({ ...form, journalConference: v })}
                />
                <Field
                  label="DOI"
                  value={form.doi}
                  set={(v) => setForm({ ...form, doi: v })}
                />
                <Field
                  label="External URL"
                  value={form.externalUrl}
                  set={(v) => setForm({ ...form, externalUrl: v })}
                />
                <Field
                  label="Publication date"
                  type="date"
                  value={form.publicationDate}
                  set={(v) => setForm({ ...form, publicationDate: v })}
                />
                <Field
                  label="Publisher"
                  value={form.publisher}
                  set={(v) => setForm({ ...form, publisher: v })}
                />
                <Field
                  label="ISBN / ISSN"
                  value={form.isbnIssn}
                  set={(v) => setForm({ ...form, isbnIssn: v })}
                />
                <Field
                  label="Volume"
                  value={form.volume}
                  set={(v) => setForm({ ...form, volume: v })}
                />
                <Field
                  label="Issue"
                  value={form.issue}
                  set={(v) => setForm({ ...form, issue: v })}
                />
                <Field
                  label="Pages"
                  value={form.pages}
                  set={(v) => setForm({ ...form, pages: v })}
                />
                <Field
                  label="Cover image URL"
                  value={form.coverUrl}
                  set={(v) => setForm({ ...form, coverUrl: v })}
                />
                <Field
                  label="Display order"
                  type="number"
                  value={String(form.sortOrder)}
                  set={(v) => setForm({ ...form, sortOrder: Number(v) })}
                />
              </div>
              <Area
                label="Citation"
                value={form.citation}
                set={(v) => setForm({ ...form, citation: v })}
              />
              <section>
                <div className="flex justify-between">
                  <h3 className="font-semibold">Researchers / authors</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        researchers: [...form.researchers, { name: "" }],
                      })
                    }
                    className={adminSecondaryButton}
                  >
                    Add author
                  </button>
                </div>
                {form.researchers.map((r, i) => (
                  <div
                    key={i}
                    className="mt-3 grid gap-2 rounded-xl border border-[hsl(var(--admin-border))] p-3 md:grid-cols-2"
                  >
                    <Field
                      label="Name"
                      value={r.name}
                      set={(v) => {
                        const a = [...form.researchers];
                        a[i] = { ...r, name: v };
                        setForm({ ...form, researchers: a });
                      }}
                      required
                    />
                    <Field
                      label="Role"
                      value={r.role || ""}
                      set={(v) => {
                        const a = [...form.researchers];
                        a[i] = { ...r, role: v };
                        setForm({ ...form, researchers: a });
                      }}
                    />
                    <Field
                      label="Institution"
                      value={r.institution || ""}
                      set={(v) => {
                        const a = [...form.researchers];
                        a[i] = { ...r, institution: v };
                        setForm({ ...form, researchers: a });
                      }}
                    />
                    <Field
                      label="Email"
                      type="email"
                      value={r.email || ""}
                      set={(v) => {
                        const a = [...form.researchers];
                        a[i] = { ...r, email: v };
                        setForm({ ...form, researchers: a });
                      }}
                    />
                    <Field
                      label="Profile / photo URL"
                      value={r.photoUrl || ""}
                      set={(v) => {
                        const a = [...form.researchers];
                        a[i] = { ...r, photoUrl: v };
                        setForm({ ...form, researchers: a });
                      }}
                    />
                    <button
                      type="button"
                      className={`${adminSecondaryButton} self-end text-red-300`}
                      onClick={() =>
                        setForm({
                          ...form,
                          researchers: form.researchers.filter(
                            (_, index) => index !== i,
                          ),
                        })
                      }
                    >
                      Remove author
                    </button>
                  </div>
                ))}
              </section>
              <section>
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">Media & documents</h3>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC/DOCX, PPT/PPTX, images, ZIP, CSV, and MP4 up to 5
                      MB.
                    </p>
                  </div>
                  <label className={`${adminSecondaryButton} cursor-pointer`}>
                    <Upload size={16} />
                    Upload
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(e) => void upload(e.target.files)}
                    />
                  </label>
                </div>
                {form.documents.map((d, i) => (
                  <div
                    key={i}
                    className="mt-2 flex items-center justify-between rounded-lg border border-[hsl(var(--admin-border))] p-3 text-sm"
                  >
                    <span>
                      {d.title} · {d.type}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          documents: form.documents.filter((_, x) => x !== i),
                        })
                      }
                      className="text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </section>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                />
                Featured research
              </label>
              <button disabled={busy} className={`${adminButton} w-full`}>
                {busy ? "Saving…" : "Save research work"}
              </button>
            </form>
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(archive)}
        title="Archive research work?"
        description="The work will disappear from the public site while its audit history remains."
        confirmLabel="Archive"
        dangerous
        onCancel={() => setArchive(null)}
        onConfirm={() => void doArchive()}
        busy={busy}
      />
    </div>
  );
}
function ModuleTabs({
  value,
  onChange,
  pending,
}: {
  value: Tab;
  onChange: (v: Tab) => void;
  pending: number;
}) {
  return (
    <AdminCard className="p-2">
      <div className="flex gap-2 overflow-x-auto">
        {(
          [
            "overview",
            "proposals",
            "works",
            "publications",
            "researchers",
            "reviews",
          ] as Tab[]
        ).map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`${value === t ? adminButton : adminSecondaryButton} whitespace-nowrap capitalize`}
          >
            {t}
            {t === "proposals" && pending ? ` (${pending})` : ""}
          </button>
        ))}
      </div>
    </AdminCard>
  );
}
function Field({
  label,
  value,
  set,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`${adminInput} mt-2`}
      />
    </label>
  );
}
function Area({
  label,
  value,
  set,
  rows = 4,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`${adminInput} mt-2 resize-y`}
      />
    </label>
  );
}
function SelectField({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`${adminInput} mt-2`}
      >
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
}
