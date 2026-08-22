import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Edit3,
  Eye,
  LoaderCircle,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ApiError, apiRequest } from "@/lib/api";
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
import { HeroImageField, type HeroImageValue } from "./HeroImageField";
import RichTextEditor from "./RichTextEditor";
import {
  type BlogFieldErrors,
  validateBlog,
} from "./blogValidation";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string;
  contentHtml: string;
  authorName: string;
  category: string;
  tags: string[];
  publicationDate: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  socialImageUrl: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
}

interface BlogPage {
  items: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
}
interface BlogStats {
  total: number;
  published: number;
  drafts: number;
  recent: BlogPost[];
}
interface EditorState extends BlogPost {
  slugTouched: boolean;
}
interface ActionState {
  blog: BlogPost;
  kind: "publish" | "unpublish" | "delete";
  reason: string;
}

const emptyEditor = (): EditorState => ({
  id: crypto.randomUUID(),
  title: "",
  slug: "",
  excerpt: "",
  featuredImageUrl: null,
  featuredImageAlt: "",
  contentHtml: "<p></p>",
  authorName: "RUET IoT Club",
  category: "General",
  tags: [],
  publicationDate: null,
  status: "DRAFT",
  seoTitle: null,
  seoDescription: null,
  seoKeywords: [],
  socialImageUrl: null,
  views: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  slugTouched: false,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 180);
const dateTimeLocal = (value: string | null) =>
  value
    ? new Date(
        new Date(value).getTime() -
          new Date(value).getTimezoneOffset() * 60_000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
const list = (value: string) => [
  ...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];
const mediaValue = (url: string | null): HeroImageValue | null =>
  url
    ? {
        key: managedMediaPath(url)?.slice("/api/v1/media/files/".length) ?? url,
        url: managedMediaPath(url) ?? url,
        originalName: decodeURIComponent(
          url.split("/").pop() || "Featured image",
        ),
      }
    : null;

const managedMediaPath = (url: string | null) => {
  if (!url) return null;
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    return pathname.startsWith("/api/v1/media/files/") ? pathname : null;
  } catch {
    return null;
  }
};

const focusBlogField = (field: string) => {
  window.setTimeout(() => {
    const target = document.getElementById(`blog-field-${field}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = target?.matches("input,textarea,[role='textbox']")
      ? target
      : target?.querySelector<HTMLElement>(
          "input,textarea,button,[role='textbox'],[tabindex]",
        );
    (focusable as HTMLElement | null)?.focus?.();
  }, 0);
};

export default function BlogManagement({
  canManage,
  canPublish,
  csrfToken,
  onCountChange,
}: {
  canManage: boolean;
  canPublish: boolean;
  csrfToken?: string;
  onCountChange: () => void | Promise<void>;
}) {
  const [data, setData] = useState<BlogPage | null>(null);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<BlogFieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [action, setAction] = useState<ActionState | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      q: query,
      category,
      sort,
      direction,
      page: String(page),
      pageSize: "15",
    });
    if (status) params.set("status", status);
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    try {
      const [nextData, nextStats] = await Promise.all([
        apiRequest<BlogPage>(`/admin/blogs?${params}`),
        apiRequest<BlogStats>("/admin/blogs/stats"),
      ]);
      setData(nextData);
      setStats(nextStats);
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : "Blog management data is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [category, direction, from, page, query, sort, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const categories = useMemo(
    () =>
      [
        ...new Set(
          (data?.items ?? []).map((item) => item.category).filter(Boolean),
        ),
      ].sort(),
    [data?.items],
  );
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 15));

  const openEditor = async (post?: BlogPost) => {
    if (!canManage) return;
    if (!post) {
      setEditor(emptyEditor());
      setFieldErrors({});
      setDirty(false);
      return;
    }
    setBusy(true);
    try {
      const detail = await apiRequest<BlogPost>(
        `/admin/blogs/${encodeURIComponent(post.id)}`,
      );
      setEditor({
        ...detail,
        featuredImageUrl:
          managedMediaPath(detail.featuredImageUrl) ?? detail.featuredImageUrl,
        slugTouched: true,
      });
      setFieldErrors({});
      setDirty(false);
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "The blog could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  };

  const clearFieldErrors = (...fields: string[]) =>
    setFieldErrors((current) => {
      if (!fields.some((field) => current[field])) return current;
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });

  const changeEditor = (value: EditorState | null, field?: string) => {
    setEditor(value);
    if (value) setDirty(true);
    if (field) clearFieldErrors(field);
  };

  const setTitle = (title: string) => {
    clearFieldErrors("title", "slug");
    setDirty(true);
    setEditor((current) =>
      current
        ? {
            ...current,
            title,
            slug: current.slugTouched ? current.slug : slugify(title),
          }
        : null,
    );
  };
  const setImage = (image: HeroImageValue | null) => {
    const featuredImageUrl = image?.url ?? null;
    if (!editor || editor.featuredImageUrl === featuredImageUrl) return;
    clearFieldErrors("featuredImageUrl");
    setDirty(true);
    setEditor({ ...editor, featuredImageUrl });
  };

  const save = async (targetStatus: "DRAFT" | "PUBLISHED") => {
    if (!editor || !csrfToken || uploading) return;
    if (targetStatus === "PUBLISHED" && !canPublish)
      return toast.error("Your role cannot publish blog posts.");
    const nextErrors = validateBlog(editor, targetStatus);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      focusBlogField(Object.keys(nextErrors)[0]);
      return;
    }
    setBusy(true);
    try {
      const saved = await apiRequest<{
        id: string;
        slug: string;
        status: "DRAFT" | "PUBLISHED";
      }>(`/admin/blogs/${encodeURIComponent(editor.id)}`, {
        method: "PUT",
        csrfToken,
        idempotencyKey: crypto.randomUUID(),
        body: {
          title: editor.title,
          slug: editor.slug,
          excerpt: editor.excerpt,
          featuredImageUrl:
            managedMediaPath(editor.featuredImageUrl) ||
            editor.featuredImageUrl ||
            null,
          featuredImageAlt: editor.featuredImageAlt || null,
          contentHtml: editor.contentHtml,
          authorName: editor.authorName,
          category: editor.category,
          tags: editor.tags,
          publicationDate: editor.publicationDate,
          status: targetStatus,
          seoTitle: editor.seoTitle || null,
          seoDescription: editor.seoDescription || null,
          seoKeywords: editor.seoKeywords,
          socialImageUrl: editor.socialImageUrl || null,
        },
      });
      toast.success(
        targetStatus === "PUBLISHED"
          ? "Blog published successfully."
          : "Draft saved successfully.",
      );
      setEditor((current) =>
        current
          ? {
              ...current,
              id: saved.id,
              slug: saved.slug,
              status: saved.status,
              updatedAt: new Date().toISOString(),
              slugTouched: true,
            }
          : current,
      );
      setFieldErrors({});
      setDirty(false);
      await load();
      await onCountChange();
    } catch (next) {
      if (next instanceof ApiError && next.details) {
        setFieldErrors(next.details);
        const first = Object.keys(next.details)[0];
        if (first) focusBlogField(first);
      }
      toast.error(
        next instanceof ApiError && next.details
          ? `${Object.values(next.details).flat().length} issue${Object.values(next.details).flat().length === 1 ? "" : "s"} need attention.`
          : next instanceof Error
            ? next.message
            : "The blog could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  const performAction = async () => {
    if (!action || !csrfToken) return;
    setBusy(true);
    try {
      if (action.kind === "delete")
        await apiRequest(`/admin/blogs/${encodeURIComponent(action.blog.id)}`, {
          method: "DELETE",
          csrfToken,
          body: { reason: action.reason },
        });
      else
        await apiRequest(
          `/admin/blogs/${encodeURIComponent(action.blog.id)}/status`,
          {
            method: "PATCH",
            csrfToken,
            body: {
              status: action.kind === "publish" ? "PUBLISHED" : "DRAFT",
              reason: action.reason,
            },
          },
        );
      toast.success(
        action.kind === "delete"
          ? "Blog moved to the archive."
          : action.kind === "publish"
            ? "Blog published."
            : "Blog unpublished.",
      );
      setAction(null);
      await load();
      await onCountChange();
    } catch (next) {
      if (
        action.kind === "publish" &&
        next instanceof ApiError &&
        next.details
      ) {
        const failedBlog = action.blog;
        setAction(null);
        await openEditor(failedBlog);
        setFieldErrors(next.details);
        const first = Object.keys(next.details)[0];
        if (first) focusBlogField(first);
      }
      toast.error(
        next instanceof ApiError && next.details
          ? `${Object.values(next.details).flat().length} issue${Object.values(next.details).flat().length === 1 ? "" : "s"} need attention.`
          : next instanceof Error
          ? next.message
          : "The blog status could not be changed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Blog Management"
        description="Create, review, publish, and measure secure articles stored in Cloudflare D1, with media served from R2."
        actions={
          canManage ? (
            <button
              type="button"
              className={adminButton}
              onClick={() => void openEditor()}
            >
              <Plus size={17} />
              Create blog
            </button>
          ) : undefined
        }
      />
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Total posts", stats.total],
            ["Published", stats.published],
            ["Drafts", stats.drafts],
          ].map(([label, value]) => (
            <AdminCard key={String(label)} className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {value}
              </p>
            </AdminCard>
          ))}
        </div>
      )}
      <AdminCard className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(14rem,1.5fr)_repeat(6,minmax(8rem,1fr))]">
          <label className="relative">
            <span className="sr-only">Search blogs</span>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search title, excerpt, author…"
              className={`${adminInput} pl-9`}
            />
          </label>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            className={adminInput}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className={adminInput}
          >
            <option value="">Active statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <input
            type="date"
            aria-label="Published from"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className={adminInput}
          />
          <input
            type="date"
            aria-label="Published through"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className={adminInput}
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className={adminInput}
          >
            <option value="updatedAt">Last updated</option>
            <option value="publicationDate">Publication date</option>
            <option value="title">Title</option>
            <option value="views">Views</option>
          </select>
          <select
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
            className={adminInput}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </AdminCard>
      {loading ? (
        <LoadingState label="Loading blogs…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !data?.items.length ? (
        <EmptyState
          title="No blogs found"
          description="Create the first article or adjust the current filters."
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[hsl(var(--admin-border))] text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Article</th>
                  <th className="px-4 py-4">Author / category</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Publication</th>
                  <th className="px-4 py-4">Views</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--admin-border))]">
                {data.items.map((post) => (
                  <tr key={post.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {post.featuredImageUrl ? (
                          <img
                            src={post.featuredImageUrl}
                            alt=""
                            className="h-12 w-20 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="h-12 w-20 rounded-lg bg-primary/[0.07]" />
                        )}
                        <div className="min-w-0">
                          <p className="max-w-sm truncate font-semibold">
                            {post.title}
                          </p>
                          <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">
                            /{post.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p>{post.authorName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {post.category}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      <p>
                        {post.publicationDate
                          ? new Date(post.publicationDate).toLocaleDateString()
                          : "Not scheduled"}
                      </p>
                      <p className="mt-1">
                        Updated {new Date(post.updatedAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-4 tabular-nums">{post.views}</td>
                    <td className="px-5 py-4">
                      <BlogActions
                        post={post}
                        canManage={canManage}
                        canPublish={canPublish}
                        busy={busy}
                        onEdit={() => void openEditor(post)}
                        onAction={(kind) =>
                          setAction({ blog: post, kind, reason: "" })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 lg:hidden">
            {data.items.map((post) => (
              <article
                key={post.id}
                className="rounded-xl border border-[hsl(var(--admin-border))] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{post.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {post.authorName} · {post.category}
                    </p>
                  </div>
                  <StatusBadge status={post.status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {post.excerpt}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Updated {new Date(post.updatedAt).toLocaleDateString()} ·{" "}
                  {post.views} views
                </p>
                <div className="mt-4">
                  <BlogActions
                    post={post}
                    canManage={canManage}
                    canPublish={canPublish}
                    busy={busy}
                    onEdit={() => void openEditor(post)}
                    onAction={(kind) =>
                      setAction({ blog: post, kind, reason: "" })
                    }
                  />
                </div>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-[hsl(var(--admin-border))] px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Page {page} of {pages} · {data.total} posts
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className={adminSecondaryButton}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((value) => value + 1)}
                className={adminSecondaryButton}
              >
                Next
              </button>
            </div>
          </div>
        </AdminCard>
      )}
      {editor && (
        <BlogEditor
          editor={editor}
          fieldErrors={fieldErrors}
          canPublish={canPublish}
          csrfToken={csrfToken}
          busy={busy}
          uploading={uploading}
          preview={preview}
          onChange={changeEditor}
          onUploadingChange={setUploading}
          onTitle={setTitle}
          onImage={setImage}
          onPreview={() => setPreview((value) => !value)}
          onClose={() => {
            if (
              dirty &&
              !window.confirm(
                "You have unsaved blog changes. Close the editor anyway?",
              )
            )
              return;
            setEditor(null);
            setFieldErrors({});
            setDirty(false);
            setPreview(false);
          }}
          onSave={save}
        />
      )}
      <ConfirmDialog
        open={Boolean(action)}
        title={
          action?.kind === "delete"
            ? "Archive this blog?"
            : action?.kind === "publish"
              ? "Publish this blog?"
              : "Unpublish this blog?"
        }
        description={
          action?.kind === "delete"
            ? `“${action?.blog.title ?? "This blog"}” will be removed from public access and retained in the audit trail.`
            : `Change the public status of “${action?.blog.title ?? "this blog"}”.`
        }
        confirmLabel={
          action?.kind === "delete"
            ? "Archive blog"
            : action?.kind === "publish"
              ? "Publish"
              : "Unpublish"
        }
        dangerous={action?.kind !== "publish"}
        reasonLabel="Reason"
        reason={action?.reason ?? ""}
        onReasonChange={(reason) =>
          setAction((current) => (current ? { ...current, reason } : null))
        }
        busy={busy}
        onCancel={() => setAction(null)}
        onConfirm={() => void performAction()}
      />
    </div>
  );
}

function BlogActions({
  post,
  canManage,
  canPublish,
  busy,
  onEdit,
  onAction,
}: {
  post: BlogPost;
  canManage: boolean;
  canPublish: boolean;
  busy: boolean;
  onEdit: () => void;
  onAction: (kind: ActionState["kind"]) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {post.status === "PUBLISHED" && (
        <Link
          to={`/blog/${post.slug}`}
          target="_blank"
          className={adminSecondaryButton}
        >
          <Eye size={15} />
          View
        </Link>
      )}
      {canManage && (
        <button
          type="button"
          disabled={busy}
          onClick={onEdit}
          className={adminSecondaryButton}
        >
          <Edit3 size={15} />
          Edit
        </button>
      )}
      {canPublish && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onAction(post.status === "PUBLISHED" ? "unpublish" : "publish")
          }
          className={adminSecondaryButton}
        >
          <Send size={15} />
          {post.status === "PUBLISHED" ? "Unpublish" : "Publish"}
        </button>
      )}
      {canManage && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction("delete")}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-500/25 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
        >
          <Trash2 size={15} />
          Archive
        </button>
      )}
    </div>
  );
}

function BlogEditor({
  editor,
  fieldErrors,
  canPublish,
  csrfToken,
  busy,
  uploading,
  preview,
  onChange,
  onUploadingChange,
  onTitle,
  onImage,
  onPreview,
  onClose,
  onSave,
}: {
  editor: EditorState;
  fieldErrors: BlogFieldErrors;
  canPublish: boolean;
  csrfToken?: string;
  busy: boolean;
  uploading: boolean;
  preview: boolean;
  onChange: (value: EditorState | null, field?: string) => void;
  onUploadingChange: (value: boolean) => void;
  onTitle: (value: string) => void;
  onImage: (value: HeroImageValue | null) => void;
  onPreview: () => void;
  onClose: () => void;
  onSave: (status: "DRAFT" | "PUBLISHED") => void;
}) {
  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) =>
    onChange({ ...editor, [key]: value }, key);
  const error = (field: string) => fieldErrors[field]?.[0];
  const invalidClass = (field: string) =>
    error(field) ? " border-red-400/70 focus:border-red-400 focus:ring-red-400/20" : "";
  const describedBy = (field: string) =>
    error(field) ? `blog-error-${field}` : undefined;
  const FieldError = ({ field }: { field: string }) =>
    error(field) ? (
      <span
        id={`blog-error-${field}`}
        role="alert"
        className="mt-1.5 block text-xs font-medium text-red-300"
      >
        {error(field)}
      </span>
    ) : null;
  const errorEntries = Object.entries(fieldErrors).flatMap(([field, messages]) =>
    messages.map((message) => ({ field, message })),
  );
  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Blog editor"
        className="ml-auto flex h-full w-full max-w-6xl flex-col border-l border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-background))] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[hsl(var(--admin-border))] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {editor.title ? `Edit: ${editor.title}` : "Create blog post"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Draft securely, preview, then publish when ready.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close blog editor"
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 md:p-7">
          {errorEntries.length > 0 && (
            <section
              role="alert"
              aria-labelledby="blog-error-summary-title"
              className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/[0.08] p-4"
            >
              <h3 id="blog-error-summary-title" className="font-semibold text-red-200">
                {errorEntries.length} issue{errorEntries.length === 1 ? "" : "s"} need attention
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-red-200/90">
                {errorEntries.map(({ field, message }, index) => (
                  <li key={`${field}-${index}`}>
                    <button
                      type="button"
                      onClick={() => focusBlogField(field)}
                      className="text-left underline decoration-red-300/50 underline-offset-2 hover:text-white"
                    >
                      {message}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-medium">
                  Title
                  <input
                    id="blog-field-title"
                    required
                    maxLength={240}
                    value={editor.title}
                    onChange={(event) => onTitle(event.target.value)}
                    aria-invalid={Boolean(error("title"))}
                    aria-describedby={describedBy("title")}
                    className={`${adminInput} mt-2${invalidClass("title")}`}
                  />
                  <FieldError field="title" />
                </label>
                <label className="sm:col-span-2 text-sm font-medium">
                  Slug
                  <input
                    id="blog-field-slug"
                    required
                    maxLength={180}
                    value={editor.slug}
                    onChange={(event) =>
                      onChange({
                        ...editor,
                        slug: slugify(event.target.value),
                        slugTouched: true,
                      }, "slug")
                    }
                    aria-invalid={Boolean(error("slug"))}
                    aria-describedby={describedBy("slug")}
                    className={`${adminInput} mt-2${invalidClass("slug")}`}
                  />
                  <FieldError field="slug" />
                </label>
                <label className="sm:col-span-2 text-sm font-medium">
                  Excerpt
                  <textarea
                    id="blog-field-excerpt"
                    required
                    maxLength={600}
                    rows={3}
                    value={editor.excerpt}
                    onChange={(event) => update("excerpt", event.target.value)}
                    aria-invalid={Boolean(error("excerpt"))}
                    aria-describedby={describedBy("excerpt")}
                    className={`${adminInput} mt-2 resize-y${invalidClass("excerpt")}`}
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {editor.excerpt.length}/600
                  </span>
                  <FieldError field="excerpt" />
                </label>
              </div>
              <div id="blog-field-contentHtml" tabIndex={-1}>
                <label className="mb-2 block text-sm font-medium">
                  Article content
                </label>
                {preview ? (
                  <iframe
                    title="Secure article preview"
                    sandbox=""
                    srcDoc={`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:32px;background:#071014;color:#dbeafe;font:16px/1.75 system-ui}h1,h2,h3{color:#fff}a{color:#22d3ee}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #334155;padding:8px}</style><article><h1>${editor.title}</h1>${editor.contentHtml}</article>`}
                    className="min-h-[32rem] w-full rounded-xl border border-[hsl(var(--admin-border))]"
                  />
                ) : (
                  <RichTextEditor
                    value={editor.contentHtml}
                    onChange={(value) => update("contentHtml", value)}
                    disabled={busy}
                    invalid={Boolean(error("contentHtml"))}
                    describedBy={describedBy("contentHtml")}
                  />
                )}
                <FieldError field="contentHtml" />
              </div>
              <div
                id="blog-field-featuredImageUrl"
                tabIndex={-1}
                aria-invalid={Boolean(error("featuredImageUrl"))}
                aria-describedby={describedBy("featuredImageUrl")}
                className={error("featuredImageUrl") ? "rounded-2xl ring-2 ring-red-400/35" : ""}
              >
                <HeroImageField
                  value={mediaValue(editor.featuredImageUrl)}
                  altText={editor.featuredImageAlt}
                  title={editor.title}
                  csrfToken={csrfToken}
                  disabled={busy}
                  onChange={onImage}
                  onAltTextChange={(value) => update("featuredImageAlt", value)}
                  onUploadingChange={onUploadingChange}
                />
                <FieldError field="featuredImageUrl" />
              </div>
            </div>
            <aside className="space-y-5">
              <AdminCard className="space-y-4 p-4">
                <h3 className="font-semibold">Publication</h3>
                <label className="block text-sm">
                  Author
                  <input
                    id="blog-field-authorName"
                    value={editor.authorName}
                    maxLength={160}
                    onChange={(event) =>
                      update("authorName", event.target.value)
                    }
                    aria-invalid={Boolean(error("authorName"))}
                    aria-describedby={describedBy("authorName")}
                    className={`${adminInput} mt-2${invalidClass("authorName")}`}
                  />
                  <FieldError field="authorName" />
                </label>
                <label className="block text-sm">
                  Category
                  <input
                    id="blog-field-category"
                    list="blog-categories"
                    value={editor.category}
                    maxLength={100}
                    onChange={(event) => update("category", event.target.value)}
                    aria-invalid={Boolean(error("category"))}
                    aria-describedby={describedBy("category")}
                    className={`${adminInput} mt-2${invalidClass("category")}`}
                  />
                  <datalist id="blog-categories">
                    <option>IoT</option>
                    <option>Embedded Systems</option>
                    <option>Machine Learning</option>
                    <option>Robotics</option>
                    <option>Tutorial</option>
                    <option>Project Showcase</option>
                    <option>General</option>
                  </datalist>
                  <FieldError field="category" />
                </label>
                <label className="block text-sm">
                  Tags
                  <input
                    id="blog-field-publicationDate"
                    value={editor.tags.join(", ")}
                    onChange={(event) =>
                      update("tags", list(event.target.value))
                    }
                    placeholder="IoT, tutorial, ESP32"
                    aria-invalid={Boolean(error("publicationDate"))}
                    aria-describedby={describedBy("publicationDate")}
                    className={`${adminInput} mt-2${invalidClass("publicationDate")}`}
                  />
                  <FieldError field="publicationDate" />
                </label>
                <label className="block text-sm">
                  Publication date
                  <input
                    id="blog-field-seoTitle"
                    type="datetime-local"
                    value={dateTimeLocal(editor.publicationDate)}
                    onChange={(event) =>
                      update(
                        "publicationDate",
                        event.target.value
                          ? new Date(event.target.value).toISOString()
                          : null,
                      )
                    }
                    aria-invalid={Boolean(error("seoTitle"))}
                    aria-describedby={describedBy("seoTitle")}
                    className={`${adminInput} mt-2${invalidClass("seoTitle")}`}
                  />
                </label>
              </AdminCard>
              <AdminCard className="space-y-4 p-4">
                <h3 className="font-semibold">SEO & sharing</h3>
                <label className="block text-sm">
                  SEO title
                  <input
                    value={editor.seoTitle ?? ""}
                    maxLength={70}
                    onChange={(event) => update("seoTitle", event.target.value)}
                    className={`${adminInput} mt-2`}
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {(editor.seoTitle ?? "").length}/70
                  </span>
                  <FieldError field="seoTitle" />
                </label>
                <label className="block text-sm">
                  Meta description
                  <textarea
                    id="blog-field-seoDescription"
                    value={editor.seoDescription ?? ""}
                    maxLength={180}
                    rows={3}
                    onChange={(event) =>
                      update("seoDescription", event.target.value)
                    }
                    aria-invalid={Boolean(error("seoDescription"))}
                    aria-describedby={describedBy("seoDescription")}
                    className={`${adminInput} mt-2${invalidClass("seoDescription")}`}
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {(editor.seoDescription ?? "").length}/180
                  </span>
                  <FieldError field="seoDescription" />
                </label>
                <label className="block text-sm">
                  SEO keywords
                  <input
                    value={editor.seoKeywords.join(", ")}
                    onChange={(event) =>
                      update("seoKeywords", list(event.target.value))
                    }
                    className={`${adminInput} mt-2`}
                  />
                </label>
                <label className="block text-sm">
                  Social image URL
                  <input
                    value={editor.socialImageUrl ?? ""}
                    onChange={(event) =>
                      update("socialImageUrl", event.target.value)
                    }
                    className={`${adminInput} mt-2`}
                  />
                </label>
              </AdminCard>
            </aside>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] px-5 py-4">
          <button
            type="button"
            onClick={onPreview}
            className={adminSecondaryButton}
          >
            <Eye size={16} />
            {preview ? "Edit content" : "Preview"}
          </button>
          <button
            type="button"
            disabled={busy || uploading}
            onClick={() => onSave("DRAFT")}
            className={adminSecondaryButton}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Calendar size={16} />
            )}
            Save draft
          </button>
          {canPublish && (
            <button
              type="button"
              disabled={busy || uploading}
              onClick={() => onSave("PUBLISHED")}
              className={adminButton}
            >
              <Send size={16} />
              Publish
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
