import type { ReactNode } from "react";
import { AlertCircle, Inbox, LoaderCircle, X } from "lucide-react";

export const adminInput = "w-full rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]/90 px-3.5 py-2.5 text-sm text-foreground shadow-inner shadow-black/10 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/[0.15] disabled:cursor-not-allowed disabled:opacity-50";
export const adminButton = "glow-border inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50";
export const adminSecondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]/90 px-4 py-2 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-[hsl(var(--admin-surface-elevated))] focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-primary/[0.12] bg-[hsl(var(--admin-surface))]/90 shadow-[0_20px_55px_-38px_hsl(var(--primary)/0.55)] backdrop-blur-xl ${className}`}>{children}</section>;
}

export function AdminPageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="font-body text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p></div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>;
}

const statusTone = (status: string) => {
  const key = status.toUpperCase();
  if (["APPROVED", "PUBLISHED", "ACTIVE", "VERIFIED", "SENT", "COMPLETED", "EMAIL_VERIFIED"].includes(key)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (["REJECTED", "FAILED", "SUSPENDED", "REVOKED", "CANCELLED"].includes(key)) return "border-red-500/25 bg-red-500/10 text-red-300";
  if (["PENDING", "SUBMITTED", "UNDER_REVIEW", "PAYMENT_PENDING", "PAYMENT_VERIFICATION", "NEEDS_INFORMATION", "REVISION_REQUESTED"].includes(key)) return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-sky-500/25 bg-sky-500/10 text-sky-200";
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusTone(status)}`}>{status.replace(/_/g, " ")}</span>;
}

export function LoadingState({ label = "Loading information…" }: { label?: string }) {
  return <div role="status" className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[hsl(var(--admin-border))] text-sm text-muted-foreground"><LoaderCircle className="animate-spin text-primary" size={24} /><span>{label}</span></div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--admin-border))] px-6 text-center"><span className="mb-3 rounded-full bg-primary/10 p-3 text-primary"><Inbox size={24} /></span><h3 className="font-body text-base font-semibold">{title}</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-red-500/25 bg-red-500/5 px-6 text-center"><AlertCircle className="text-red-300" size={24} /><h3 className="mt-3 font-body font-semibold">Unable to load this section</h3><p className="mt-1 max-w-lg text-sm text-muted-foreground">{message}</p>{onRetry && <button type="button" onClick={onRetry} className={`${adminSecondaryButton} mt-4`}>Try again</button>}</div>;
}

export function ConfirmDialog({ open, title, description, confirmLabel, reasonLabel, reason, onReasonChange, confirmationLabel, confirmation, onConfirmationChange, dangerous = false, busy, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel: string; reasonLabel?: string; reason?: string; onReasonChange?: (value: string) => void; confirmationLabel?: string; confirmation?: string; onConfirmationChange?: (value: string) => void; dangerous?: boolean; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  const invalid = Boolean(reasonLabel && (reason?.trim().length ?? 0) < 3) || Boolean(confirmationLabel && !confirmation?.trim());
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-description" className="w-full max-w-lg rounded-t-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-6 shadow-2xl sm:rounded-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="admin-confirm-title" className="font-body text-lg font-semibold">{title}</h2><p id="admin-confirm-description" className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div><button type="button" aria-label="Close confirmation" onClick={onCancel} className="rounded-md p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"><X size={18} /></button></div>{reasonLabel && <label className="mt-5 block text-sm font-medium">{reasonLabel}<textarea autoFocus required minLength={3} maxLength={1000} rows={4} value={reason ?? ""} onChange={(event) => onReasonChange?.(event.target.value)} className={`${adminInput} mt-2 resize-y`} /></label>}{confirmationLabel && <label className="mt-4 block text-sm font-medium">{confirmationLabel}<input required value={confirmation ?? ""} onChange={(event) => onConfirmationChange?.(event.target.value)} className={`${adminInput} mt-2`} /></label>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className={adminSecondaryButton}>Cancel</button><button type="button" disabled={busy || invalid} onClick={onConfirm} className={dangerous ? "inline-flex min-h-10 items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50" : adminButton}>{busy ? "Working…" : confirmLabel}</button></div></div></div>;
}
