import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Image as ImageIcon, LoaderCircle, Search, Star, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiRequest } from "@/lib/api";
import type { ProjectImage } from "@/lib/projects";
import { adminButton, adminInput, adminSecondaryButton } from "./AdminUI";
import type { MediaObject } from "./types";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const mediaUrl = (key: string) => `/api/v1/media/files/${key}`;
const formatBytes = (bytes?: number) => bytes ? `${Math.ceil(bytes / 1024)} KB` : "Size unavailable";

function readDimensions(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function uploadMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "CSRF_VALIDATION_FAILED") return "Your security session changed. Refresh this page once, then try again.";
  if (error instanceof DOMException && error.name === "AbortError") return "The image upload timed out. Please try again.";
  return error instanceof Error && /PNG|JPEG|WebP|too large|valid image/iu.test(error.message) ? error.message : "Image upload failed. Please try again.";
}

export function ProjectImageManager({ images, coverKey, title, csrfToken, disabled, onUploadingChange, onChange }: {
  images: ProjectImage[];
  coverKey: string | null;
  title: string;
  csrfToken?: string;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  onChange: (images: ProjectImage[], coverKey: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [media, setMedia] = useState<MediaObject[]>([]);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [dimensions, setDimensions] = useState<Record<string, { width: number; height: number }>>({});

  useEffect(() => {
    if (!mediaOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setMediaLoading(true);
      setMediaError("");
      try {
        const query = new URLSearchParams();
        if (mediaSearch.trim()) query.set("search", mediaSearch.trim());
        const result = await apiRequest<{ items: MediaObject[]; total: number }>(`/admin/media?${query}`, { signal: controller.signal });
        setMedia(result.items);
        setMediaTotal(result.total);
      } catch {
        if (!controller.signal.aborted) setMediaError("Unable to load project media. Please try again.");
      } finally {
        if (!controller.signal.aborted) setMediaLoading(false);
      }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [mediaOpen, mediaSearch]);

  useEffect(() => {
    if (!mediaOpen) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeMedia(); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  });

  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length || disabled) return;
    if (images.length + files.length > 20) { toast.error(`A project can contain up to 20 images. You can add ${Math.max(0, 20 - images.length)} more.`); return; }
    if (!csrfToken) { toast.error("Your administrator session is not ready. Refresh the page and try again."); return; }
    const invalid = files.find((file) => !IMAGE_TYPES.has(file.type) || file.size < 1 || file.size > MAX_BYTES);
    if (invalid) { toast.error(`${invalid.name}: choose a JPG, PNG, or WebP image up to 5 MB.`); return; }
    setUploadTotal(files.length);
    onUploadingChange?.(true);
    const additions: ProjectImage[] = [];
    for (let index = 0; index < files.length; index += 1) {
      setUploading(index + 1);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30_000);
      try {
        const body = new FormData();
        const file = files[index];
        if (!file) continue;
        body.set("file", file);
        body.set("purpose", "project");
        const uploaded = await apiRequest<{ key: string; url: string; originalName: string; contentType: string; byteSize: number }>("/media/upload", { method: "POST", csrfToken, body, signal: controller.signal });
        const size = await readDimensions(uploaded.url);
        additions.push({ ...uploaded, ...(size ?? {}), alt: title.trim() || undefined });
      } catch (error) {
        toast.error(uploadMessage(error));
        break;
      } finally {
        window.clearTimeout(timeout);
      }
    }
    setUploading(0);
    setUploadTotal(0);
    onUploadingChange?.(false);
    if (additions.length) {
      const merged = [...images];
      for (const image of additions) if (!merged.some((current) => current.key === image.key)) merged.push(image);
      onChange(merged, coverKey ?? merged[0]?.key ?? null);
      toast.success(`${additions.length} project image${additions.length === 1 ? "" : "s"} uploaded successfully.`);
    }
  };

  const closeMedia = () => { setMediaOpen(false); setMediaSearch(""); setSelectedKeys(new Set()); };
  const applyMedia = async () => {
    const chosen = media.filter((item) => selectedKeys.has(item.objectKey) && !images.some((image) => image.key === item.objectKey));
    if (images.length + chosen.length > 20) { toast.error(`A project can contain up to 20 images. Select at most ${Math.max(0, 20 - images.length)} more.`); return; }
    const additions = await Promise.all(chosen.map(async (item): Promise<ProjectImage> => {
      const url = mediaUrl(item.objectKey);
      const size = dimensions[item.objectKey] ?? await readDimensions(url);
      return { key: item.objectKey, url, originalName: item.originalName, contentType: item.contentType, byteSize: item.byteSize, ...(size ?? {}), alt: title.trim() || undefined };
    }));
    const merged = [...images, ...additions];
    onChange(merged, coverKey ?? merged[0]?.key ?? null);
    closeMedia();
    if (additions.length) toast.success(`${additions.length} existing image${additions.length === 1 ? "" : "s"} added without duplication.`);
  };
  const remove = (key: string) => {
    const next = images.filter((image) => image.key !== key);
    onChange(next, coverKey === key ? next[0]?.key ?? null : coverKey);
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next, coverKey);
  };
  const setAlt = (key: string, alt: string) => onChange(images.map((image) => image.key === key ? { ...image, alt } : image), coverKey);
  const cover = images.find((image) => image.key === coverKey) ?? null;

  return <section aria-labelledby="project-images-heading" className="space-y-4">
    <div><h3 id="project-images-heading" className="text-base font-semibold">Project Images <span className="font-normal text-muted-foreground">(Optional)</span></h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Add project images to showcase this project. Images are optional. Removing an image only removes this project association; the R2 asset remains available.</p></div>
    {cover ? <div className="grid overflow-hidden rounded-2xl border border-primary/15 bg-black/15 md:grid-cols-[minmax(0,1fr)_15rem]"><div className="relative aspect-video"><img src={cover.url} alt={cover.alt?.trim() || title || "Project cover"} className="h-full w-full object-cover" /><span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground"><Star size={12} />Cover image</span></div><div className="flex flex-col justify-between gap-4 border-t border-primary/10 p-4 md:border-l md:border-t-0"><div className="min-w-0"><p className="truncate text-sm font-semibold">{cover.originalName ?? "Selected cover image"}</p><p className="mt-1 text-xs text-muted-foreground">{cover.width && cover.height ? `${cover.width} × ${cover.height} px` : formatBytes(cover.byteSize)}</p></div><div className="grid gap-2"><button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || uploading > 0} className={adminSecondaryButton}><Upload size={16} />Change / add images</button><button type="button" onClick={() => remove(cover.key)} disabled={disabled} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-500/25 px-4 text-sm font-medium text-red-300 hover:bg-red-500/10"><X size={16} />Remove</button></div></div></div> : <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--admin-border))] px-5 text-center"><ImageIcon size={30} className="text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No cover image selected</p><p className="mt-1 text-xs text-muted-foreground">This is a valid state. You can save and publish without an image.</p></div>}
    <div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={disabled || uploading > 0} onClick={() => inputRef.current?.click()} className={adminButton}>{uploading > 0 ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}{uploading > 0 ? `Uploading ${uploading} of ${uploadTotal}…` : "+ Upload Images"}</button><button type="button" disabled={disabled || uploading > 0} onClick={() => setMediaOpen(true)} className={adminSecondaryButton}><ImageIcon size={16} />Select from Media</button></div>
    <input ref={inputRef} multiple type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => void uploadFiles(event)} />
    {images.length > 0 && <div><div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold">Gallery</h4><span className="text-xs text-muted-foreground">{images.length}/20 images</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{images.map((image, index) => <article key={image.key} className={`overflow-hidden rounded-xl border bg-[hsl(var(--admin-surface))] ${image.key === coverKey ? "border-primary/40" : "border-[hsl(var(--admin-border))]"}`}><div className="relative aspect-video bg-black/20"><img src={image.url} alt="" className="h-full w-full object-cover" />{image.key === coverKey && <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">COVER</span>}</div><div className="space-y-3 p-3"><p className="truncate text-xs font-semibold" title={image.originalName}>{image.originalName ?? image.key.split("/").pop()}</p><input aria-label={`Alt text for ${image.originalName ?? `image ${index + 1}`}`} value={image.alt ?? ""} maxLength={300} onChange={(event) => setAlt(image.key, event.target.value)} placeholder={title ? `Describe image for ${title}` : "Accessible alt text"} className={`${adminInput} py-2 text-xs`} /><div className="grid grid-cols-2 gap-2"><button type="button" disabled={image.key === coverKey} onClick={() => onChange(images, image.key)} className={`${adminSecondaryButton} px-2 text-xs`}><Star size={14} />Set cover</button><button type="button" onClick={() => remove(image.key)} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-red-500/20 text-xs text-red-300 hover:bg-red-500/10"><X size={14} />Remove</button></div><div className="grid grid-cols-2 gap-2"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} className={`${adminSecondaryButton} px-2 text-xs`}><ChevronLeft size={14} />Earlier</button><button type="button" disabled={index === images.length - 1} onClick={() => move(index, 1)} className={`${adminSecondaryButton} px-2 text-xs`}>Later<ChevronRight size={14} /></button></div></div></article>)}</div></div>}
    {mediaOpen && <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="project-media-title" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] shadow-2xl sm:rounded-2xl"><header className="flex items-start justify-between gap-4 border-b border-[hsl(var(--admin-border))] p-5"><div><h2 id="project-media-title" className="text-lg font-semibold">Select project images</h2><p className="mt-1 text-sm text-muted-foreground">Choose multiple existing R2 assets. Files are not duplicated.</p></div><button type="button" aria-label="Close media selector" onClick={closeMedia} className="rounded-lg p-2 text-muted-foreground hover:bg-white/5"><X size={20} /></button></header><div className="border-b border-[hsl(var(--admin-border))] p-4"><label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><span className="sr-only">Search media</span><input autoFocus value={mediaSearch} onChange={(event) => setMediaSearch(event.target.value)} placeholder="Search images…" className={`${adminInput} pl-9`} /></label></div><div className="min-h-64 flex-1 overflow-y-auto p-4" aria-live="polite">{mediaLoading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin text-primary" size={22} />Loading media…</div> : mediaError ? <div role="alert" className="flex min-h-64 flex-col items-center justify-center text-center"><AlertCircle className="text-red-300" /><p className="mt-3 text-sm">{mediaError}</p></div> : media.length === 0 ? <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">No images found.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{media.map((item) => { const selected = selectedKeys.has(item.objectKey); const alreadyAdded = images.some((image) => image.key === item.objectKey); return <button key={item.objectKey} type="button" disabled={alreadyAdded} aria-pressed={selected} onClick={() => setSelectedKeys((current) => { const next = new Set(current); if (next.has(item.objectKey)) next.delete(item.objectKey); else next.add(item.objectKey); return next; })} className={`group min-w-0 overflow-hidden rounded-xl border text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-primary bg-primary/[0.08]" : "border-[hsl(var(--admin-border))]"}`}><span className="relative block aspect-video bg-black/20"><img src={mediaUrl(item.objectKey)} alt="" loading="lazy" className="h-full w-full object-cover" onLoad={(event) => setDimensions((current) => current[item.objectKey] ? current : { ...current, [item.objectKey]: { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight } })} />{selected && <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground"><Check size={14} /></span>}{alreadyAdded && <span className="absolute inset-x-2 bottom-2 rounded bg-background/85 px-2 py-1 text-center text-[10px]">Already added</span>}</span><span className="block min-w-0 p-3"><span className="block truncate text-xs font-semibold">{item.originalName}</span><span className="mt-1 block text-[11px] text-muted-foreground">{dimensions[item.objectKey] ? `${dimensions[item.objectKey].width} × ${dimensions[item.objectKey].height} px` : formatBytes(item.byteSize)}</span></span></button>; })}</div>}</div><footer className="flex flex-col gap-3 border-t border-[hsl(var(--admin-border))] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{selectedKeys.size ? `${selectedKeys.size} selected` : `${mediaTotal} images available`}</p><div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={closeMedia} className={adminSecondaryButton}>Cancel</button><button type="button" disabled={selectedKeys.size === 0} onClick={() => void applyMedia()} className={adminButton}>Use Selected Images</button></div></footer></div></div>}
  </section>;
}
