import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Download, Eye, RefreshCw, Search, ShieldX, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { AdminCard, AdminPageHeader, ConfirmDialog, EmptyState, ErrorState, LoadingState, StatusBadge, adminButton, adminInput, adminSecondaryButton } from "@/admin/AdminUI";

interface CertificateRequest {
  id: string; student: string; email: string; course: string; status: string; requestedAt: string;
  completionDate: string; progress: number; paymentStatus: string; enrollmentId: string;
}

interface IssuedCertificate {
  id: string; certificateNumber: string; student: string; course: string; status: string;
  issuedAt: string; certificateUrl: string; revocationReason?: string | null;
}

interface CertificateData { requests: CertificateRequest[]; certificates: IssuedCertificate[]; }
type Decision = { kind: "approve" | "reject" | "revoke"; id: string; label: string } | null;

const filters = ["ALL", "REQUESTED", "UNDER_REVIEW", "ISSUED", "REJECTED"] as const;
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export default function CertificateManagement({ permissions, csrfToken }: { permissions: string[]; csrfToken?: string }) {
  const [data, setData] = useState<CertificateData>({ requests: [], certificates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]>("ALL");
  const [decision, setDecision] = useState<Decision>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const canIssue = permissions.includes("certificate.issue");
  const canRevoke = permissions.includes("certificate.revoke") || permissions.includes("certificate.manage");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await apiRequest<CertificateData>(`/admin/certificates?status=ALL&search=${encodeURIComponent(search)}`)); }
    catch (next) { setError(next instanceof Error ? next.message : "Certificates are unavailable."); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 220); return () => window.clearTimeout(timer); }, [load]);

  const requests = useMemo(() => data.requests.filter((item) => status === "ALL" || item.status === status), [data.requests, status]);
  const certificates = useMemo(() => data.certificates.filter((item) => status === "ALL" || status === "ISSUED" ? status === "ALL" || item.status === "ISSUED" : false), [data.certificates, status]);
  const stats = useMemo(() => ({
    all: data.requests.length,
    pending: data.requests.filter((item) => ["REQUESTED", "UNDER_REVIEW"].includes(item.status)).length,
    issued: data.certificates.filter((item) => item.status === "ISSUED").length,
    revoked: data.certificates.filter((item) => item.status === "REVOKED").length,
  }), [data]);

  const act = async () => {
    if (!decision) return;
    setBusy(true);
    try {
      const path = decision.kind === "revoke"
        ? `/admin/certificates/${decision.id}/revoke`
        : `/admin/certificates/${decision.id}/${decision.kind}`;
      await apiRequest(path, { method: "POST", body: decision.kind === "approve" ? {} : { reason }, csrfToken });
      toast.success(decision.kind === "approve" ? "Certificate approved and issued." : decision.kind === "reject" ? "Certificate request rejected." : "Certificate revoked with audit history preserved.");
      setDecision(null); setReason(""); await load();
    } catch (next) { toast.error(next instanceof Error ? next.message : "The certificate action failed."); }
    finally { setBusy(false); }
  };

  const exportCsv = () => {
    const rows = [
      ["Student", "Email", "Course", "Request status", "Requested", "Progress", "Payment", "Certificate ID", "Certificate status", "Issued"],
      ...requests.map((request) => {
        const cert = data.certificates.find((item) => item.course === request.course && item.student === request.student);
        return [request.student, request.email, request.course, request.status, request.requestedAt, `${request.progress}%`, request.paymentStatus, cert?.certificateNumber, cert?.status, cert?.issuedAt];
      }),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = `certificates-${status.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(anchor.href);
  };

  return <div className="space-y-6">
    <AdminPageHeader title="Certificate Management" description="Review eligible learner requests, issue immutable certificate IDs, and preserve revocation history." actions={<><button type="button" onClick={() => void load()} className={adminSecondaryButton}><RefreshCw size={16} />Refresh</button><button type="button" onClick={exportCsv} className={adminButton}><Download size={16} />Export CSV</button></>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["All requests", stats.all], ["Pending review", stats.pending], ["Issued", stats.issued], ["Revoked", stats.revoked]].map(([label, value]) => <AdminCard key={String(label)} className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold text-foreground">{value}</p></AdminCard>)}</div>
    <AdminCard className="p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, email, course, or request ID…" className={`${adminInput} pl-9`} /></div><div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button type="button" key={item} onClick={() => setStatus(item)} className={`${status === item ? adminButton : adminSecondaryButton} whitespace-nowrap`}>{item.replace(/_/g, " ")}</button>)}</div></div></AdminCard>
    {loading ? <LoadingState label="Loading certificate workflow…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : requests.length === 0 && certificates.length === 0 ? <EmptyState title="No certificate requests" description="Certificate requests will appear here when learners complete eligible courses and request approval." /> : <>
      {requests.length > 0 && <AdminCard className="overflow-hidden"><div className="border-b border-[hsl(var(--admin-border))] px-5 py-4"><h2 className="font-semibold">Requests</h2></div><div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-primary/[0.035] text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Course</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Requested</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{requests.map((item) => <tr key={item.id} className="border-t border-[hsl(var(--admin-border))]"><td className="px-5 py-4"><p className="font-medium">{item.student}</p><p className="text-xs text-muted-foreground">{item.email}</p></td><td className="px-5 py-4">{item.course}</td><td className="px-5 py-4"><span className="font-semibold text-emerald-300">{item.progress}%</span></td><td className="px-5 py-4"><StatusBadge status={item.paymentStatus} /></td><td className="px-5 py-4 text-muted-foreground">{new Date(item.requestedAt).toLocaleDateString()}</td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2">{canIssue && ["REQUESTED", "UNDER_REVIEW"].includes(item.status) && <><button type="button" onClick={() => setDecision({ kind: "approve", id: item.id, label: item.student })} className={adminButton}><CheckCircle2 size={15} />Issue</button><button type="button" onClick={() => setDecision({ kind: "reject", id: item.id, label: item.student })} className={adminSecondaryButton}><XCircle size={15} />Reject</button></>}</div></td></tr>)}</tbody></table></div></AdminCard>}
      {certificates.length > 0 && <AdminCard className="overflow-hidden"><div className="border-b border-[hsl(var(--admin-border))] px-5 py-4"><h2 className="font-semibold">Issued certificates</h2></div><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-sm"><thead className="bg-primary/[0.035] text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Certificate</th><th className="px-5 py-3">Learner</th><th className="px-5 py-3">Course</th><th className="px-5 py-3">Issued</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{certificates.map((item) => <tr key={item.id} className="border-t border-[hsl(var(--admin-border))]"><td className="px-5 py-4 font-mono text-primary">{item.certificateNumber}</td><td className="px-5 py-4 font-medium">{item.student}</td><td className="px-5 py-4">{item.course}</td><td className="px-5 py-4 text-muted-foreground">{new Date(item.issuedAt).toLocaleDateString()}</td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><a href={item.certificateUrl} target="_blank" rel="noreferrer" className={adminSecondaryButton}><Eye size={15} />View</a>{canRevoke && item.status === "ISSUED" && <button type="button" onClick={() => setDecision({ kind: "revoke", id: item.id, label: item.certificateNumber })} className={adminSecondaryButton}><ShieldX size={15} />Revoke</button>}</div></td></tr>)}</tbody></table></div></AdminCard>}
    </>}
    <ConfirmDialog open={Boolean(decision)} title={decision?.kind === "approve" ? "Approve and issue certificate?" : decision?.kind === "reject" ? "Reject certificate request?" : "Revoke issued certificate?"} description={decision?.kind === "approve" ? `A unique immutable certificate ID will be issued for ${decision?.label}.` : `This decision is preserved in the immutable audit history for ${decision?.label}.`} confirmLabel={decision?.kind === "approve" ? "Approve & Issue" : decision?.kind === "reject" ? "Reject request" : "Revoke certificate"} reasonLabel={decision?.kind === "approve" ? undefined : "Reason"} reason={reason} onReasonChange={setReason} dangerous={decision?.kind !== "approve"} busy={busy} onCancel={() => { setDecision(null); setReason(""); }} onConfirm={() => void act()} />
  </div>;
}
