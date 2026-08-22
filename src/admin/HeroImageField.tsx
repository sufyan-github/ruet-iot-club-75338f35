import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Image as ImageIcon, LoaderCircle, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiRequest } from "@/lib/api";
import { adminButton, adminInput, adminSecondaryButton } from "./AdminUI";
import type { MediaObject } from "./types";

const HERO_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HERO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export interface HeroImageValue {
  key: string;
  url: string;
  originalName: string;
  contentType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
}

interface HeroImageFieldProps {
  value: HeroImageValue | null;
  altText: string;
  title: string;
  csrfToken?: string;
  disabled?: boolean;
  onChange: (value: HeroImageValue | null) => void;
  onAltTextChange: (value: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}

interface UploadedMedia {
  key: string;
  url: string;
  originalName: string;
  contentType: string;
  byteSize: number;
}

const mediaUrl = (key: string) => `/api/v1/media/files/${key}`;
const formatBytes = (bytes?: number) => bytes ? `${Math.ceil(bytes / 1024)} KB` : "Size unavailable";

function filenameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url, window.location.origin).pathname.split("/").pop() || "Selected image");
  } catch {
    return "Selected image";
  }
}

function resolveDimensions(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "The upload timed out. Please try again.";
  if (error instanceof ApiError && error.code === "CSRF_VALIDATION_FAILED") return "Your security session changed in another browser tab. Refresh this page once, then try again.";
  if (error instanceof Error && /too large|file is too large/iu.test(error.message)) return "This image is too large. Choose an image up to 5 MB.";
  if (error instanceof Error && /PNG|JPEG|WebP|supported image/iu.test(error.message)) return error.message;
  return "Image upload failed. Please try again.";
}

export function HeroImageField({ value, altText, title, csrfToken, disabled, onChange, onAltTextChange, onUploadingChange }: HeroImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaObject[]>([]);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaRequestVersion, setMediaRequestVersion] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaObject | null>(null);
  const [dimensions, setDimensions] = useState<Record<string, { width: number; height: number }>>({});

  useEffect(() => {
    setImageUnavailable(false);
  }, [value?.url]);

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
        setMediaItems(result.items);
        setMediaTotal(result.total);
        setSelectedMedia((current) => current ?? result.items.find((item) => item.objectKey === value?.key) ?? null);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMediaError("The media library could not be loaded. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setMediaLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mediaOpen, mediaRequestVersion, mediaSearch, value?.key]);

  useEffect(() => {
    if (!mediaOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMediaOpen(false);
        setMediaSearch("");
        setSelectedMedia(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mediaOpen]);

  const setUploadState = (next: boolean) => {
    setUploading(next);
    onUploadingChange(next);
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled) return;
    if (!HERO_IMAGE_TYPES.has(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > HERO_IMAGE_MAX_BYTES) {
      toast.error("This image is too large. Choose an image up to 5 MB.");
      return;
    }
    if (!csrfToken) {
      toast.error("Your administrator session is not ready. Refresh the page and try again.");
      return;
    }

    setUploadState(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("purpose", "hero");
      const uploaded = await apiRequest<UploadedMedia>("/media/upload", {
        method: "POST",
        csrfToken,
        body,
        signal: controller.signal,
      });
      const imageDimensions = await resolveDimensions(uploaded.url);
      onChange({
        key: uploaded.key,
        url: uploaded.url,
        originalName: uploaded.originalName,
        contentType: uploaded.contentType,
        byteSize: uploaded.byteSize,
        ...(imageDimensions ?? {}),
      });
      toast.success("Hero image uploaded and selected.");
    } catch (error) {
      toast.error(uploadErrorMessage(error));
    } finally {
      window.clearTimeout(timeout);
      setUploadState(false);
    }
  };

  const applySelectedMedia = async () => {
    if (!selectedMedia) return;
    const url = mediaUrl(selectedMedia.objectKey);
    const knownDimensions = dimensions[selectedMedia.objectKey] ?? await resolveDimensions(url);
    onChange({
      key: selectedMedia.objectKey,
      url,
      originalName: selectedMedia.originalName,
      contentType: selectedMedia.contentType,
      byteSize: selectedMedia.byteSize,
      ...(knownDimensions ?? {}),
    });
    setMediaOpen(false);
    setMediaSearch("");
    setSelectedMedia(null);
  };

  const closeMedia = () => {
    setMediaOpen(false);
    setMediaSearch("");
    setSelectedMedia(null);
  };

  const previewAlt = altText.trim() || title.trim() || "Hero slide preview";
  const selectedDimensions = value?.width && value.height ? `${value.width} × ${value.height} px` : "Dimensions unavailable";

  return (
    <section aria-labelledby="hero-image-label" className="space-y-3">
      <div>
        <h3 id="hero-image-label" className="text-sm font-medium">Hero Image <span aria-hidden="true" className="text-primary">*</span></h3>
        <p className="mt-1 text-xs text-muted-foreground">Required before publishing. JPG, PNG, or WebP up to 5 MB.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--admin-border))] bg-black/15">
        {value && !imageUnavailable ? (
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="relative aspect-video min-w-0 bg-black/25">
              <img src={value.url} alt={previewAlt} className="h-full w-full object-cover" onLoad={(event) => { if (!value.width || !value.height) onChange({ ...value, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); }} onError={() => setImageUnavailable(true)} />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/95 via-background/55 to-transparent" />
              {(title.trim() || altText.trim()) && <div className="absolute inset-x-0 bottom-0 p-4"><p className="line-clamp-1 text-sm font-semibold text-foreground">{title.trim() || "Hero slide"}</p>{altText.trim() && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{altText.trim()}</p>}</div>}
            </div>
            <div className="flex min-w-0 flex-col justify-between gap-4 border-t border-[hsl(var(--admin-border))] p-4 lg:border-l lg:border-t-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={value.originalName}>{value.originalName || filenameFromUrl(value.url)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selectedDimensions}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatBytes(value.byteSize)}</p>
              </div>
              <div className="grid gap-2">
                <button type="button" disabled={disabled || uploading} onClick={() => fileInputRef.current?.click()} className={adminSecondaryButton}><Upload size={16} />Change image</button>
                <button type="button" disabled={disabled || uploading} onClick={() => onChange(null)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-500/25 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400/30 disabled:opacity-50"><X size={16} />Remove</button>
              </div>
            </div>
          </div>
        ) : imageUnavailable && value ? (
          <div role="alert" className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
            <AlertCircle className="text-amber-300" size={30} />
            <p className="mt-3 text-sm font-semibold">Image reference is unavailable</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">The referenced R2 object could not be loaded. Choose another image before publishing.</p>
            <button type="button" onClick={() => onChange(null)} className="mt-4 text-sm font-medium text-red-300 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-400/30">Remove unavailable reference</button>
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
            <span className="rounded-2xl border border-primary/15 bg-primary/[0.07] p-4 text-primary"><ImageIcon size={28} /></span>
            <p className="mt-4 text-sm font-semibold">No image selected</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">Upload a new image or choose an existing image from the media library.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={disabled || uploading} onClick={() => fileInputRef.current?.click()} className={adminButton}>
          {uploading ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}
          {uploading ? "Uploading image…" : value ? "Upload replacement" : "Upload image"}
        </button>
        <button type="button" disabled={disabled || uploading} onClick={() => setMediaOpen(true)} className={adminSecondaryButton}><ImageIcon size={16} />Select from media</button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" disabled={disabled || uploading} onChange={(event) => void uploadImage(event)} aria-label="Upload hero image" />
      <div aria-live="polite" className="sr-only">{uploading ? "Hero image upload in progress." : ""}</div>

      <label className="block text-sm font-medium">Alt text <span className="font-normal text-muted-foreground">(optional)</span>
        <input value={altText} maxLength={300} onChange={(event) => onAltTextChange(event.target.value)} placeholder={title.trim() ? `Describe the image for “${title.trim()}”` : "Describe the image for screen reader users"} className={`${adminInput} mt-2`} />
        <span className="mt-1.5 block text-xs font-normal leading-5 text-muted-foreground">If left empty, the slide title will be used. Filenames are never used as alt text.</span>
      </label>

      {mediaOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="hero-media-title" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--admin-border))] px-5 py-4">
              <div><h2 id="hero-media-title" className="font-body text-lg font-semibold">Select image</h2><p className="mt-1 text-sm text-muted-foreground">Choose an existing R2 image without uploading a duplicate.</p></div>
              <button type="button" onClick={closeMedia} aria-label="Close media selector" className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"><X size={20} /></button>
            </div>
            <div className="border-b border-[hsl(var(--admin-border))] p-4">
              <label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><span className="sr-only">Search images</span><input autoFocus value={mediaSearch} onChange={(event) => setMediaSearch(event.target.value)} placeholder="Search images…" className={`${adminInput} pl-9`} /></label>
            </div>
            <div className="min-h-64 flex-1 overflow-y-auto p-4" aria-live="polite">
              {mediaLoading ? (
                <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="animate-spin text-primary" size={22} />Loading media library…</div>
              ) : mediaError ? (
                <div role="alert" className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><AlertCircle className="text-red-300" size={26} /><p className="mt-3 text-sm font-semibold">Media library unavailable</p><p className="mt-1 text-xs text-muted-foreground">{mediaError}</p><button type="button" onClick={() => setMediaRequestVersion((current) => current + 1)} className={`${adminSecondaryButton} mt-4`}>Try again</button></div>
              ) : mediaItems.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><ImageIcon className="text-muted-foreground" size={28} /><p className="mt-3 text-sm font-semibold">No images found</p><p className="mt-1 text-xs text-muted-foreground">Upload a Hero image or adjust the search.</p></div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {mediaItems.map((item) => {
                    const selected = selectedMedia?.objectKey === item.objectKey;
                    const itemDimensions = dimensions[item.objectKey];
                    return <button key={item.objectKey} type="button" aria-pressed={selected} onClick={() => setSelectedMedia(item)} className={`group min-w-0 overflow-hidden rounded-xl border text-left outline-none transition focus:ring-2 focus:ring-primary/40 ${selected ? "border-primary bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary))]" : "border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] hover:border-primary/35"}`}>
                      <span className="relative block aspect-video overflow-hidden bg-black/20"><img src={mediaUrl(item.objectKey)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" onLoad={(event) => { const image=event.currentTarget; setDimensions((current) => current[item.objectKey] ? current : { ...current, [item.objectKey]: { width: image.naturalWidth, height: image.naturalHeight } }); }} />{selected && <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground"><Check size={14} /></span>}</span>
                      <span className="block min-w-0 p-3"><span className="block truncate text-xs font-semibold" title={item.originalName}>{item.originalName}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{itemDimensions ? `${itemDimensions.width} × ${itemDimensions.height} px` : formatBytes(item.byteSize)}</span></span>
                    </button>;
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 truncate text-xs text-muted-foreground">{selectedMedia ? <>Selected: <span className="font-medium text-foreground">{selectedMedia.originalName}</span></> : `${mediaTotal} image${mediaTotal === 1 ? "" : "s"} available`}</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={closeMedia} className={adminSecondaryButton}>Cancel</button><button type="button" disabled={!selectedMedia} onClick={() => void applySelectedMedia()} className={adminButton}>Use this image</button></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
