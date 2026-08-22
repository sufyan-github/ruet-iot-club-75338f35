import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Copy,
  FileText,
  FilePlus2,
  Grid2X2,
  Image as ImageIcon,
  List,
  Search,
  Upload,
  X,
} from "lucide-react";
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
import type { AdminSection } from "./AdminShell";
import type { MediaObject, WebsiteContentItem } from "./types";

const collections = [
  "hero_slides",
  "research_papers",
  "events",
  "courses",
  "lessons",
  "team_members",
  "alumni",
  "partners",
  "opportunities",
  "activities",
  "activity_photos",
  "blog_posts",
  "announcements",
  "certificates",
];
const fixedCollection: Partial<Record<AdminSection, string>> = {
  research: "research_papers",
  events: "events",
  courses: "courses",
  people: "team_members",
  partners: "partners",
  opportunities: "opportunities",
  certificates: "certificates",
  alumni: "alumni",
};
const friendly = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const contentErrorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.code === "CSRF_VALIDATION_FAILED"
    ? "Your security session changed in another browser tab. Refresh this page once, then try again."
    : error instanceof Error
      ? error.message
      : fallback;

interface ContentEditorState {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  originalStatus: "DRAFT" | "PUBLISHED";
  sortOrder: number;
  data: Record<string, unknown>;
  advanced: string;
  heroImage: HeroImageValue | null;
  imageAlt: string;
  imageUploading: boolean;
}

const heroImageFields = new Set([
  "image_url",
  "image_key",
  "image_name",
  "image_alt",
  "image_content_type",
  "image_byte_size",
]);

function parseHeroImage(data: Record<string, unknown>): HeroImageValue | null {
  const key = typeof data.image_key === "string" ? data.image_key : "";
  const storedUrl = typeof data.image_url === "string" ? data.image_url : "";
  const url = storedUrl || (key ? `/api/v1/media/files/${key}` : "");
  if (!url) return null;
  const fallbackName = key
    ? decodeURIComponent(key.split("/").pop() || "Selected image")
    : "Selected image";
  return {
    key,
    url,
    originalName:
      typeof data.image_name === "string" ? data.image_name : fallbackName,
    ...(typeof data.image_content_type === "string"
      ? { contentType: data.image_content_type }
      : {}),
    ...(typeof data.image_byte_size === "number"
      ? { byteSize: data.image_byte_size }
      : {}),
  };
}

export function ContentManagement({
  section,
  canManage,
  canPublish,
  csrfToken,
}: {
  section: AdminSection;
  canManage: boolean;
  canPublish: boolean;
  csrfToken?: string;
}) {
  const lockedCollection = fixedCollection[section];
  const [collection, setCollection] = useState(
    lockedCollection ?? "hero_slides",
  );
  const [items, setItems] = useState<WebsiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editor, setEditor] = useState<ContentEditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [archive, setArchive] = useState<{
    id: string;
    name: string;
    reason: string;
  } | null>(null);
  const [publishConfirm, setPublishConfirm] = useState(false);
  useEffect(() => {
    if (lockedCollection) setCollection(lockedCollection);
  }, [lockedCollection]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(
        await apiRequest<WebsiteContentItem[]>(`/admin/content/${collection}`),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Content is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [collection]);
  useEffect(() => {
    void load();
    setEditor(null);
  }, [collection, load]);
  const visible = items.filter(
    (item) =>
      (!search.trim() ||
        String(item.title ?? item.name ?? item.id)
          .toLowerCase()
          .includes(search.trim().toLowerCase())) &&
      (!statusFilter || item.status.toUpperCase() === statusFilter),
  );
  const openEditor = (item?: WebsiteContentItem) => {
    const data = item
      ? Object.fromEntries(
          Object.entries(item).filter(
            ([key]) =>
              ![
                "id",
                "status",
                "sort_order",
                "created_at",
                "updated_at",
              ].includes(key),
          ),
        )
      : {};
    const title = String(data.title ?? data.name ?? data.tagline ?? "");
    const description = String(data.description ?? data.summary ?? "");
    const itemStatus =
      item?.status.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const advancedData =
      collection === "hero_slides"
        ? Object.fromEntries(
            Object.entries(data).filter(([key]) => !heroImageFields.has(key)),
          )
        : data;
    setEditor({
      id: item?.id ?? "",
      title,
      description,
      status: itemStatus,
      originalStatus: itemStatus,
      sortOrder: Number(item?.sort_order ?? 0),
      data,
      advanced: JSON.stringify(advancedData, null, 2),
      heroImage: collection === "hero_slides" ? parseHeroImage(data) : null,
      imageAlt:
        collection === "hero_slides" && typeof data.image_alt === "string"
          ? data.image_alt
          : "",
      imageUploading: false,
    });
  };
  const persist = async () => {
    if (!editor || !csrfToken) return;
    if (editor.imageUploading) {
      toast.error("Wait for the image upload to finish before saving.");
      return;
    }
    if (
      collection === "hero_slides" &&
      editor.status === "PUBLISHED" &&
      !editor.heroImage?.key
    ) {
      toast.error("Select a valid R2 Hero image before publishing.");
      return;
    }
    let advanced: Record<string, unknown>;
    try {
      advanced = JSON.parse(editor.advanced || "{}") as Record<string, unknown>;
    } catch {
      toast.error("Advanced fields must contain valid JSON.");
      return;
    }
    const data: Record<string, unknown> = {
      ...advanced,
      ...(editor.title
        ? {
            ["name" in advanced && !("title" in advanced) ? "name" : "title"]:
              editor.title,
          }
        : {}),
      ...(editor.description
        ? {
            ["summary" in advanced && !("description" in advanced)
              ? "summary"
              : "description"]: editor.description,
          }
        : {}),
    };
    if (collection === "hero_slides") {
      for (const key of heroImageFields) delete data[key];
      if (editor.heroImage) {
        data.image_key = editor.heroImage.key;
        data.image_url = editor.heroImage.url;
        data.image_name = editor.heroImage.originalName;
        if (editor.heroImage.contentType)
          data.image_content_type = editor.heroImage.contentType;
        if (editor.heroImage.byteSize)
          data.image_byte_size = editor.heroImage.byteSize;
      }
      if (editor.imageAlt.trim()) data.image_alt = editor.imageAlt.trim();
    }
    setBusy(true);
    try {
      await apiRequest(
        `/admin/content/${collection}/${encodeURIComponent(editor.id.trim() || crypto.randomUUID())}`,
        {
          method: "PUT",
          csrfToken,
          body: { data, status: editor.status, sortOrder: editor.sortOrder },
        },
      );
      toast.success(
        `${friendly(collection).replace(/s$/, "")} saved successfully.`,
      );
      setEditor(null);
      setPublishConfirm(false);
      await load();
    } catch (nextError) {
      toast.error(
        contentErrorMessage(
          nextError,
          "Unable to save this content. Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      editor?.status === "PUBLISHED" &&
      editor.originalStatus !== "PUBLISHED"
    ) {
      setPublishConfirm(true);
      return;
    }
    void persist();
  };
  const archiveItem = async () => {
    if (!archive || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(
        `/admin/content/${collection}/${encodeURIComponent(archive.id)}`,
        { method: "DELETE", csrfToken },
      );
      toast.success("Content archived successfully.");
      setArchive(null);
      await load();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Unable to archive this content.",
      );
    } finally {
      setBusy(false);
    }
  };
  const title = lockedCollection
    ? friendly(lockedCollection)
    : "Content Management";
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description="Create, review, publish, and archive website content using the same D1-backed publishing workflow."
        actions={
          canManage && (
            <button
              type="button"
              onClick={() => openEditor()}
              className={adminButton}
            >
              <FilePlus2 size={17} />
              Create {friendly(collection).replace(/s$/, "")}
            </button>
          )
        }
      />
      <AdminCard className="p-4">
        <div
          className={`grid gap-3 ${lockedCollection ? "md:grid-cols-[1fr_14rem]" : "md:grid-cols-[14rem_1fr_14rem]"}`}
        >
          {!lockedCollection && (
            <select
              aria-label="Content collection"
              value={collection}
              onChange={(event) => setCollection(event.target.value)}
              className={adminInput}
            >
              {collections.map((value) => (
                <option key={value} value={value}>
                  {friendly(value)}
                </option>
              ))}
            </select>
          )}
          <label className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <span className="sr-only">Search content</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${friendly(collection).toLowerCase()}…`}
              className={`${adminInput} pl-9`}
            />
          </label>
          <select
            aria-label="Filter content status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={adminInput}
          >
            <option value="">All statuses</option>
            <option>DRAFT</option>
            <option>PUBLISHED</option>
          </select>
        </div>
      </AdminCard>
      {loading ? (
        <LoadingState
          label={`Loading ${friendly(collection).toLowerCase()}…`}
        />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={`No ${friendly(collection).toLowerCase()} found`}
          description={`Create the first ${friendly(collection).replace(/s$/, "").toLowerCase()} or adjust the current filters.`}
          action={
            canManage && (
              <button
                type="button"
                onClick={() => openEditor()}
                className={adminButton}
              >
                Create content
              </button>
            )
          }
        />
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--admin-border))] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Content</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Last modified</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[hsl(var(--admin-border))] last:border-0"
                  >
                    <td className="max-w-lg px-5 py-4">
                      <p className="truncate font-medium">
                        {String(item.title ?? item.name ?? "Untitled content")}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {String(item.description ?? item.summary ?? item.id)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      {item.sort_order}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {item.updated_at
                        ? new Date(item.updated_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openEditor(item)}
                            className={adminSecondaryButton}
                          >
                            Edit
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() =>
                              setArchive({
                                id: item.id,
                                name: String(
                                  item.title ?? item.name ?? "this content",
                                ),
                                reason: "",
                              })
                            }
                            className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
                            aria-label={`Archive ${String(item.title ?? item.name ?? "content")}`}
                          >
                            <Archive size={17} />
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
      {editor && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-black/65">
          <button
            aria-label="Close editor"
            className="absolute inset-0"
            onClick={() => setEditor(null)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="content-editor-title"
            className={`relative h-full w-full overflow-y-auto border-l border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] ${collection === "hero_slides" ? "max-w-3xl" : "max-w-xl"}`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs text-muted-foreground">
                  {friendly(collection)}
                </p>
                <h2
                  id="content-editor-title"
                  className="font-body text-lg font-semibold"
                >
                  {editor.id ? "Edit content" : "Create content"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditor(null)}
                aria-label="Close editor"
                className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-5 p-5">
              <label className="block text-sm font-medium">
                Title / name *
                <input
                  required
                  maxLength={200}
                  value={editor.title}
                  onChange={(event) =>
                    setEditor({ ...editor, title: event.target.value })
                  }
                  className={`${adminInput} mt-2`}
                />
              </label>
              <label className="block text-sm font-medium">
                Description
                <textarea
                  rows={6}
                  maxLength={5000}
                  value={editor.description}
                  onChange={(event) =>
                    setEditor({ ...editor, description: event.target.value })
                  }
                  className={`${adminInput} mt-2 resize-y`}
                />
              </label>
              {collection === "hero_slides" && (
                <HeroImageField
                  value={editor.heroImage}
                  altText={editor.imageAlt}
                  title={editor.title}
                  csrfToken={csrfToken}
                  disabled={busy}
                  onChange={(heroImage) =>
                    setEditor((current) =>
                      current ? { ...current, heroImage } : current,
                    )
                  }
                  onAltTextChange={(imageAlt) =>
                    setEditor((current) =>
                      current ? { ...current, imageAlt } : current,
                    )
                  }
                  onUploadingChange={(imageUploading) =>
                    setEditor((current) =>
                      current ? { ...current, imageUploading } : current,
                    )
                  }
                />
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Status
                  <select
                    value={editor.status}
                    disabled={!canPublish}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        status: event.target.value as "DRAFT" | "PUBLISHED",
                      })
                    }
                    className={`${adminInput} mt-2`}
                  >
                    <option value="DRAFT">Draft</option>
                    {canPublish && <option value="PUBLISHED">Published</option>}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Display order
                  <input
                    type="number"
                    min={-100000}
                    max={100000}
                    value={editor.sortOrder}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        sortOrder: Number(event.target.value),
                      })
                    }
                    className={`${adminInput} mt-2`}
                  />
                </label>
              </div>
              <details className="rounded-xl border border-[hsl(var(--admin-border))] p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Advanced fields
                </summary>
                <p className="mt-2 text-xs text-muted-foreground">
                  Use only for fields not represented above. Existing fields are
                  preserved.
                </p>
                <textarea
                  rows={14}
                  value={editor.advanced}
                  onChange={(event) =>
                    setEditor({ ...editor, advanced: event.target.value })
                  }
                  className={`${adminInput} mt-3 font-mono text-xs`}
                />
              </details>
              <button
                disabled={busy || editor.imageUploading}
                className={`${adminButton} w-full`}
              >
                {busy
                  ? "Saving…"
                  : editor.imageUploading
                    ? "Waiting for image upload…"
                    : editor.status === "PUBLISHED"
                      ? "Save and publish"
                      : "Save draft"}
              </button>
            </form>
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={publishConfirm}
        title="Publish content"
        description="Publish this content to the public website now? The Worker will validate your publish permission and audit the change."
        confirmLabel="Publish content"
        busy={busy}
        onCancel={() => setPublishConfirm(false)}
        onConfirm={() => void persist()}
      />
      <ConfirmDialog
        open={Boolean(archive)}
        title="Archive content"
        description={`Archive ${archive?.name ?? "this content"}? It will no longer appear publicly and the action will be audited.`}
        confirmLabel="Archive content"
        dangerous
        reasonLabel="Archive reason"
        reason={archive?.reason}
        onReasonChange={(value) =>
          setArchive((current) =>
            current ? { ...current, reason: value } : null,
          )
        }
        busy={busy}
        onCancel={() => setArchive(null)}
        onConfirm={() => void archiveItem()}
      />
    </div>
  );
}

export function MediaLibrary({
  canManage,
  csrfToken,
}: {
  canManage: boolean;
  csrfToken?: string;
}) {
  const [items, setItems] = useState<MediaObject[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [busy, setBusy] = useState(false);
  const [archive, setArchive] = useState<{
    item: MediaObject;
    reason: string;
  } | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      const result = await apiRequest<{ items: MediaObject[]; total: number }>(
        `/admin/media?${query}`,
      );
      setItems(result.items);
      setTotal(result.total);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Media could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [search]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!csrfToken || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        await apiRequest("/media/upload", { method: "POST", csrfToken, body });
      }
      toast.success(
        `${files.length} media file${files.length === 1 ? "" : "s"} uploaded.`,
      );
      await load();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Unable to upload media.",
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };
  const archiveMedia = async () => {
    if (!archive || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(
        `/admin/media/${encodeURIComponent(archive.item.objectKey)}`,
        { method: "DELETE", csrfToken },
      );
      toast.success("Unused media archived.");
      setArchive(null);
      await load();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Unable to archive media.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Media Library"
        description="Browse and upload R2 images, documents, presentations, data files, and video resources. In-use assets are protected from archival."
        actions={
          canManage && (
            <label className={`${adminButton} cursor-pointer`}>
              <Upload size={17} />
              {busy ? "Uploading…" : "Upload media"}
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/zip,video/mp4,.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.zip,.mp4"
                className="sr-only"
                disabled={busy}
                onChange={(event) => void upload(event)}
              />
            </label>
          )
        }
      />
      <AdminCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <span className="sr-only">Search media</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search media by filename…"
              className={`${adminInput} pl-9`}
            />
          </label>
          <div className="flex rounded-lg border border-[hsl(var(--admin-border))] p-1">
            <button
              aria-label="Grid view"
              onClick={() => setView("grid")}
              className={`rounded-md p-2 ${view === "grid" ? "bg-primary/12 text-primary" : "text-muted-foreground"}`}
            >
              <Grid2X2 size={17} />
            </button>
            <button
              aria-label="List view"
              onClick={() => setView("list")}
              className={`rounded-md p-2 ${view === "list" ? "bg-primary/12 text-primary" : "text-muted-foreground"}`}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </AdminCard>
      {loading ? (
        <LoadingState label="Loading media library…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No media found"
          description="Uploaded R2 website files will appear here."
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((item) => (
            <AdminCard key={item.objectKey} className="overflow-hidden">
              <div className="aspect-video bg-black/20">
                {item.contentType.startsWith("image/") ? (
                  <img
                    src={`/api/v1/media/files/${item.objectKey}`}
                    alt={item.originalName}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-primary/60">
                    <FileText size={42} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-sm font-medium">
                  {item.originalName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Math.ceil(item.byteSize / 1024)} KB ·{" "}
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        `/api/v1/media/files/${item.objectKey}`,
                      );
                      toast.success("Media URL copied.");
                    }}
                    className={`${adminSecondaryButton} flex-1`}
                  >
                    <Copy size={15} />
                    Copy URL
                  </button>
                  {canManage && (
                    <button
                      aria-label={`Archive ${item.originalName}`}
                      onClick={() => setArchive({ item, reason: "" })}
                      className="rounded-lg border border-[hsl(var(--admin-border))] p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Archive size={16} />
                    </button>
                  )}
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      ) : (
        <AdminCard>
          <div className="divide-y divide-[hsl(var(--admin-border))]">
            {items.map((item) => (
              <div
                key={item.objectKey}
                className="flex flex-wrap items-center gap-3 p-4"
              >
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-black/20">
                  {item.contentType.startsWith("image/") ? (
                    <img
                      src={`/api/v1/media/files/${item.objectKey}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText size={22} className="text-primary/60" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.contentType} · {Math.ceil(item.byteSize / 1024)} KB
                  </p>
                </div>
                <button
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      `/api/v1/media/files/${item.objectKey}`,
                    )
                  }
                  className={adminSecondaryButton}
                >
                  <Copy size={15} />
                  Copy URL
                </button>
              </div>
            ))}
          </div>
        </AdminCard>
      )}
      <p className="text-xs text-muted-foreground">{total} media objects</p>
      <ConfirmDialog
        open={Boolean(archive)}
        title="Archive unused media"
        description="The Worker will refuse this action if the object is referenced by active content. The R2 object is retained for recovery."
        confirmLabel="Archive media"
        dangerous
        reasonLabel="Archive reason"
        reason={archive?.reason}
        onReasonChange={(value) =>
          setArchive((current) =>
            current ? { ...current, reason: value } : null,
          )
        }
        busy={busy}
        onCancel={() => setArchive(null)}
        onConfirm={() => void archiveMedia()}
      />
    </div>
  );
}
