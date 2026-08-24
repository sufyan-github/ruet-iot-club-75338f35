import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Check, Copy, IdCard, RefreshCw, ShieldCheck, Smartphone, UserRoundCheck } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface ApplicationRecord {
  applicationId: string;
  status: string;
  membershipTypeName?: string;
  volunteerProgramName?: string;
  createdAt: string;
  submittedAt: string | null;
  decisionAt: string | null;
  decisionReason: string | null;
  cancellationReason: string | null;
}

interface ActiveRecord {
  membershipId?: string;
  volunteerId?: string;
  membershipNumber?: string;
  volunteerNumber?: string;
  membershipTypeName?: string;
  volunteerProgramName?: string;
  status: string;
  startDate: string;
  endDate: string;
  certificateEligible: number;
}

interface LifecycleRequest {
  renewalId?: string;
  closureRequestId?: string;
  status: string;
  requestedAt: string;
  reason?: string;
  decisionReason?: string | null;
}

interface PaymentRequest {
  paymentRequestId: string;
  applicationId: string;
  expectedAmountMinor: number;
  currency: string;
  paymentMethodsJson: string;
  paymentNumber: string;
  paymentInstructions: string;
  requestedAt: string;
  reason: string;
}

interface PaymentRecord {
  paymentId: string;
  applicationId: string;
  expectedAmountMinor: number;
  currency: string;
  paymentMethod: string;
  payerPhone: string;
  transactionReference: string;
  status: string;
  submittedAt: string;
  verificationReason: string | null;
}

interface MembershipWorkspaceData {
  applications: ApplicationRecord[];
  memberships: ActiveRecord[];
  renewals: LifecycleRequest[];
  closures: LifecycleRequest[];
  paymentRequests: PaymentRequest[];
  payments: PaymentRecord[];
}

interface VolunteerWorkspaceData {
  applications: ApplicationRecord[];
  volunteers: ActiveRecord[];
  renewals: LifecycleRequest[];
  closures: LifecycleRequest[];
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  return <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{statusLabel(status)}</span>;
}

export default function MembershipWorkspace() {
  const { user, loading, csrfToken } = useAuth();
  const [membership, setMembership] = useState<MembershipWorkspaceData | null>(null);
  const [volunteer, setVolunteer] = useState<VolunteerWorkspaceData | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"BKASH" | "NAGAD" | "">("");
  const [payerPhone, setPayerPhone] = useState("");
  const [transactionReference, setTransactionReference] = useState("");

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      apiRequest<MembershipWorkspaceData>("/membership/me"),
      apiRequest<VolunteerWorkspaceData>("/volunteers/me"),
    ]).then(([membershipData, volunteerData]) => {
      setMembership(membershipData);
      setVolunteer(volunteerData);
    }).catch((error) => toast.error(error instanceof Error ? error.message : "Could not load membership history."));
  }, [refresh, user]);

  const requestRenewal = async (domain: "membership" | "volunteers") => {
    if (!csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(`/${domain}/renew`, { method: "POST", csrfToken, idempotencyKey: crypto.randomUUID() });
      toast.success("Renewal request recorded.");
      setRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request renewal.");
    } finally { setBusy(false); }
  };

  const requestClosure = async (domain: "membership" | "volunteers") => {
    if (!csrfToken) return;
    const reason = window.prompt("Explain why you are requesting closure. This becomes part of the historical record.");
    if (!reason) return;
    setBusy(true);
    try {
      await apiRequest(`/${domain}/closure-request`, {
        method: "POST", csrfToken, idempotencyKey: crypto.randomUUID(), body: { reason },
      });
      toast.success("Closure request recorded for administrator review.");
      setRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request closure.");
    } finally { setBusy(false); }
  };

  const submitPayment = async (event: React.FormEvent, applicationId: string) => {
    event.preventDefault();
    if (!csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(`/membership/applications/${applicationId}/payment`, {
        method: "POST", csrfToken, idempotencyKey: crypto.randomUUID(),
        body: { paymentMethod, payerPhone, transactionReference },
      });
      toast.success("Payment evidence submitted for independent finance verification.");
      setPaymentMethod("");
      setPayerPhone("");
      setTransactionReference("");
      setRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit payment evidence.");
    } finally { setBusy(false); }
  };

  if (loading) return <Layout><section className="py-24"><div className="container">Loading workspace...</div></section></Layout>;
  if (!user) return <Layout><section className="py-24"><div className="container max-w-xl text-center"><h1 className="text-2xl font-bold">Sign in to view your workspace</h1><Link to="/auth" className="mt-4 inline-block text-primary hover:underline">Sign in</Link></div></section></Layout>;

  const currentMembership = membership?.memberships.find((record) => record.status !== "CLOSED");
  const currentVolunteer = volunteer?.volunteers.find((record) => record.status !== "CLOSED");
  const paymentApplication = membership?.applications.find((record) =>
    membership.paymentRequests.some((request) => request.applicationId === record.applicationId)
    && !membership.payments.some((payment) =>
      payment.applicationId === record.applicationId && ["SUBMITTED", "VERIFIED"].includes(payment.status),
    ),
  );
  const paymentRequest = membership?.paymentRequests.find((record) => record.applicationId === paymentApplication?.applicationId);

  return (
    <Layout>
      <SEO title="Membership and Volunteer Workspace" description="View RUET IoT Club application and lifecycle history." path="/dashboard/membership" />
      <section className="py-20"><div className="container space-y-8">
        <header><h1 className="font-display text-3xl font-bold text-gradient">Membership workspace</h1><p className="mt-2 text-muted-foreground">Applications, identity records, renewals, and closure requests remain separate from your account and preserve their history.</p></header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl glass p-6 space-y-5">
            <div className="flex items-center gap-3"><IdCard className="text-primary" /><div><h2 className="text-xl font-semibold">Club membership</h2><p className="text-xs text-muted-foreground">Identity namespace: RUET-IOT-batch-sequence</p></div></div>
            {currentMembership ? <div className="rounded-lg border border-border p-4"><div className="flex items-center justify-between gap-3"><strong>{currentMembership.membershipNumber}</strong><StatusBadge status={currentMembership.status} /></div><p className="mt-2 text-sm text-muted-foreground">{currentMembership.membershipTypeName} · {currentMembership.startDate} to {currentMembership.endDate}</p><div className="mt-4 flex flex-wrap gap-3"><button disabled={busy || !["EXPIRING_SOON", "EXPIRED"].includes(currentMembership.status)} onClick={() => void requestRenewal("membership")} className="rounded-lg border border-primary px-3 py-2 text-sm text-primary disabled:opacity-40">Request renewal</button><button disabled={busy || ["RENEWAL_PENDING", "CLOSURE_REQUESTED"].includes(currentMembership.status)} onClick={() => void requestClosure("membership")} className="rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive disabled:opacity-40">Request closure</button></div></div> : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No issued membership yet. An application does not become a membership until authorized approval and server-side identity allocation.</p>}
            {paymentApplication && paymentRequest && <PaymentRequestForm
              request={paymentRequest}
              busy={busy}
              paymentMethod={paymentMethod}
              payerPhone={payerPhone}
              transactionReference={transactionReference}
              onPaymentMethod={setPaymentMethod}
              onPayerPhone={setPayerPhone}
              onTransactionReference={setTransactionReference}
              onSubmit={(event) => void submitPayment(event, paymentApplication.applicationId)}
            />}
            <History title="Applications" records={membership?.applications ?? []} />
            <PaymentHistory records={membership?.payments ?? []} />
            <History title="Renewals" records={membership?.renewals ?? []} />
            <History title="Closure requests" records={membership?.closures ?? []} />
          </section>

          <section className="rounded-xl glass p-6 space-y-5">
            <div className="flex items-center gap-3"><UserRoundCheck className="text-primary" /><div><h2 className="text-xl font-semibold">Community volunteer</h2><p className="text-xs text-muted-foreground">Separate identity namespace: RUET-IOT-CV-year-sequence</p></div></div>
            {currentVolunteer ? <div className="rounded-lg border border-border p-4"><div className="flex items-center justify-between gap-3"><strong>{currentVolunteer.volunteerNumber}</strong><StatusBadge status={currentVolunteer.status} /></div><p className="mt-2 text-sm text-muted-foreground">{currentVolunteer.volunteerProgramName} · {currentVolunteer.startDate} to {currentVolunteer.endDate}</p><div className="mt-4 flex flex-wrap gap-3"><button disabled={busy || !["EXPIRING_SOON", "EXPIRED"].includes(currentVolunteer.status)} onClick={() => void requestRenewal("volunteers")} className="rounded-lg border border-primary px-3 py-2 text-sm text-primary disabled:opacity-40">Request renewal</button><button disabled={busy || ["RENEWAL_PENDING", "CLOSURE_REQUESTED"].includes(currentVolunteer.status)} onClick={() => void requestClosure("volunteers")} className="rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive disabled:opacity-40">Request closure</button></div></div> : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No issued volunteer identity yet. Volunteer identity counters never share the member sequence.</p>}
            <History title="Applications" records={volunteer?.applications ?? []} />
            <History title="Renewals" records={volunteer?.renewals ?? []} />
            <History title="Closure requests" records={volunteer?.closures ?? []} />
          </section>
        </div>

        <div className="flex flex-wrap gap-3"><Link to="/join" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Start or continue an application</Link><button onClick={() => setRefresh((value) => value + 1)} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm"><RefreshCw size={16} /> Refresh</button></div>
      </div></section>
    </Layout>
  );
}

function formatMinor(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency }).format(amount / 100);
}

function paymentMethods(request: PaymentRequest): Array<"BKASH" | "NAGAD"> {
  try {
    const parsed: unknown = JSON.parse(request.paymentMethodsJson);
    return Array.isArray(parsed)
      ? parsed.filter((method): method is "BKASH" | "NAGAD" => method === "BKASH" || method === "NAGAD")
      : [];
  } catch {
    return [];
  }
}

export function PaymentRequestForm({
  request,
  busy,
  paymentMethod,
  payerPhone,
  transactionReference,
  onPaymentMethod,
  onPayerPhone,
  onTransactionReference,
  onSubmit,
}: {
  request: PaymentRequest;
  busy: boolean;
  paymentMethod: "BKASH" | "NAGAD" | "";
  payerPhone: string;
  transactionReference: string;
  onPaymentMethod: (method: "BKASH" | "NAGAD") => void;
  onPayerPhone: (phone: string) => void;
  onTransactionReference: (reference: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const methods = paymentMethods(request);
  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(request.paymentNumber);
      toast.success("Payment number copied.");
    } catch {
      toast.error("Could not copy the number. Select and copy it manually.");
    }
  };
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={22} />
        <div>
          <h3 className="font-semibold">Submit corrected payment evidence</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Amount due: <strong className="text-foreground">{formatMinor(request.expectedAmountMinor, request.currency)}</strong>.
            The previous evidence was not accepted. The amount, channels, and receiver below are the immutable server snapshot for this application.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-border/70 bg-background/55 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Send Money to</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xl font-bold tracking-wide text-foreground">{request.paymentNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground">{methods.map((method) => method === "BKASH" ? "bKash" : "Nagad").join(" or ")}</p>
          </div>
          <button type="button" onClick={() => void copyNumber()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/50">
            <Copy size={15} /> Copy
          </button>
        </div>
      </div>
      <p className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-3 text-xs leading-5 text-amber-100">
        {request.paymentInstructions} Never share your PIN or verification code. The club verifies only the transaction ID and payment details.
      </p>
      <fieldset>
        <legend className="text-sm font-medium">Payment method</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {methods.map((method) => (
            <button
              key={method}
              type="button"
              aria-pressed={paymentMethod === method}
              onClick={() => onPaymentMethod(method)}
              className={"flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors " + (paymentMethod === method ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/60 text-muted-foreground hover:border-primary/40")}
            >
              {paymentMethod === method ? <Check size={16} /> : <Smartphone size={16} />}
              {method === "BKASH" ? "bKash" : "Nagad"}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-medium">
        Sender mobile number
        <input
          required
          inputMode="tel"
          autoComplete="tel"
          value={payerPhone}
          onChange={(event) => onPayerPhone(event.target.value)}
          placeholder="01XXXXXXXXX"
          pattern="(?:\+?88)?01[3-9][0-9]{8}"
          className="mt-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium">
        Transaction ID
        <input
          required
          minLength={6}
          maxLength={64}
          autoCapitalize="characters"
          value={transactionReference}
          onChange={(event) => onTransactionReference(event.target.value)}
          placeholder="Enter the bKash or Nagad transaction ID"
          className="mt-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
        />
      </label>
      <button disabled={busy || !paymentMethod} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Submitting…" : "Submit payment evidence"}
      </button>
      <p className="text-xs text-muted-foreground">Submission does not auto-approve the payment. An authorized finance reviewer must independently match and verify it.</p>
    </form>
  );
}

function PaymentHistory({ records }: { records: PaymentRecord[] }) {
  return <div><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarClock size={15} /> Payments</h3>{records.length === 0 ? <p className="text-xs text-muted-foreground">No payment evidence.</p> : <div className="space-y-2">{records.map((record) => <div key={record.paymentId} className="rounded-lg border border-border/60 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span>{formatMinor(record.expectedAmountMinor, record.currency)} · {record.paymentMethod}</span><StatusBadge status={record.status} /></div><p className="mt-1 text-xs text-muted-foreground">Sender {record.payerPhone} · Reference {record.transactionReference} · {new Date(record.submittedAt).toLocaleString()}</p>{record.verificationReason && <p className="mt-2 text-xs">{record.verificationReason}</p>}</div>)}</div>}</div>;
}

function History({ title, records }: { title: string; records: Array<ApplicationRecord | LifecycleRequest> }) {
  return <div><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarClock size={15} /> {title}</h3>{records.length === 0 ? <p className="text-xs text-muted-foreground">No records.</p> : <div className="space-y-2">{records.map((record, index) => <div key={("applicationId" in record && record.applicationId) || ("renewalId" in record && record.renewalId) || ("closureRequestId" in record && record.closureRequestId) || index} className="rounded-lg border border-border/60 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span>{"membershipTypeName" in record ? record.membershipTypeName : "volunteerProgramName" in record ? record.volunteerProgramName : title.slice(0, -1)}</span><StatusBadge status={record.status} /></div><p className="mt-1 text-xs text-muted-foreground">{new Date(("createdAt" in record ? record.createdAt : record.requestedAt)).toLocaleString()}</p>{"decisionReason" in record && record.decisionReason && <p className="mt-2 text-xs">{record.decisionReason}</p>}</div>)}</div>}</div>;
}
