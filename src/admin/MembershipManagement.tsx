import { useCallback, useEffect, useState } from "react";
import { Download, Search, UserRoundCheck, Users } from "lucide-react";
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
  adminInput,
  adminSecondaryButton,
} from "./AdminUI";
import type { DomainApplication } from "./types";

interface ActivePerson {
  id: string;
  name: string;
  email: string;
  status: string;
  startDate: string;
  endDate: string;
  joinedAt: string;
  membershipNumber?: string;
  volunteerNumber?: string;
  studentId?: string;
  organization?: string;
  department?: string;
  batch?: string;
  membershipType?: string;
  programName?: string;
}

export default function MembershipManagement({
  domain,
  permissions,
  csrfToken,
  onCountChange,
}: {
  domain: "membership" | "volunteers";
  permissions: string[];
  csrfToken?: string;
  onCountChange?: () => void;
}) {
  const [tab, setTab] = useState<"applications" | "people">("applications");
  const [applications, setApplications] = useState<DomainApplication[]>([]);
  const [people, setPeople] = useState<ActivePerson[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [action, setAction] = useState<{
    path: string;
    title: string;
    description: string;
    label: string;
    dangerous: boolean;
    reason: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const isMembership = domain === "membership";
  const permissionDomain = isMembership ? "membership" : "volunteer";
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "applications") {
        const statuses = isMembership
          ? [
              "SUBMITTED",
              "UNDER_REVIEW",
              "PAYMENT_PENDING",
              "PAYMENT_VERIFICATION",
            ]
          : ["SUBMITTED", "UNDER_REVIEW"];
        const queues = await Promise.all(
          statuses.map((value) =>
            apiRequest<DomainApplication[]>(
              `/admin/${domain}/applications?status=${value}`,
            ),
          ),
        );
        const merged = queues
          .flat()
          .filter(
            (item) =>
              !search.trim() ||
              `${item.fullName} ${item.email} ${item.studentId ?? ""} ${item.organization ?? ""}`
                .toLowerCase()
                .includes(search.trim().toLowerCase()),
          );
        setApplications(
          status ? merged.filter((item) => item.status === status) : merged,
        );
      } else {
        const query = new URLSearchParams();
        if (search.trim()) query.set("search", search.trim());
        if (status) query.set("status", status);
        const result = await apiRequest<{
          items: ActivePerson[];
          total: number;
        }>(`/admin/${domain}/${isMembership ? "members" : "people"}?${query}`);
        setPeople(result.items);
        setTotal(result.total);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "This workflow is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [domain, isMembership, search, status, tab]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  const run = async () => {
    if (!action || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(action.path, {
        method: "POST",
        csrfToken,
        idempotencyKey: crypto.randomUUID(),
        body: { reason: action.reason },
      });
      toast.success(
        `${isMembership ? "Membership" : "Volunteer"} workflow updated successfully.`,
      );
      setAction(null);
      await load();
      onCountChange?.();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Unable to complete this action. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const decide = (
    application: DomainApplication,
    operation: string,
    label: string,
    dangerous = false,
  ) =>
    setAction({
      path: `/admin/${domain}/applications/${application.applicationId}/${operation}`,
      title: `${label} application`,
      description: `This decision affects ${application.fullName}, is revalidated by the Worker, and will be permanently recorded in the audit trail.`,
      label,
      dangerous,
      reason: "",
    });
  const can = (key: string) =>
    permissions.includes(`${permissionDomain}.${key}`);
  const title = isMembership ? "Membership Management" : "Community Volunteers";
  const description = isMembership
    ? "Review applications, payments, active memberships, and lifecycle dates from one workspace."
    : "Review volunteer applications and manage approved community volunteer records.";
  const exportCsv = () => {
    const quote = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows =
      tab === "applications"
        ? [
            [
              "Name",
              "Email",
              "Phone",
              "Student ID",
              "Organization",
              "Program",
              "Status",
              "Submitted",
            ],
            ...applications.map((item) => [
              item.fullName,
              item.email,
              item.phone,
              item.studentId,
              item.organization,
              item.membershipTypeName ?? item.volunteerProgramName,
              item.status,
              item.submittedAt,
            ]),
          ]
        : [
            [
              "Name",
              "Email",
              "Identity",
              "Department",
              "Batch",
              "Program",
              "Status",
              "Start",
              "End",
            ],
            ...people.map((item) => [
              item.name,
              item.email,
              item.membershipNumber ?? item.volunteerNumber,
              item.department ?? item.organization,
              item.batch,
              item.membershipType ?? item.programName,
              item.status,
              item.startDate,
              item.endDate,
            ]),
          ];
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.map(quote).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${domain}-${tab}-${status || "all"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <button
            type="button"
            disabled={
              (tab === "applications" ? applications : people).length === 0
            }
            onClick={exportCsv}
            className={adminSecondaryButton}
          >
            <Download size={16} />
            Export filtered CSV
          </button>
        }
      />
      <div
        role="tablist"
        className="inline-flex rounded-lg border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] p-1"
      >
        <button
          role="tab"
          aria-selected={tab === "applications"}
          onClick={() => {
            setTab("applications");
            setStatus("");
          }}
          className={`rounded-md px-4 py-2 text-sm font-medium ${tab === "applications" ? "bg-primary/12 text-primary" : "text-muted-foreground"}`}
        >
          Applications
        </button>
        <button
          role="tab"
          aria-selected={tab === "people"}
          onClick={() => {
            setTab("people");
            setStatus("");
          }}
          className={`rounded-md px-4 py-2 text-sm font-medium ${tab === "people" ? "bg-primary/12 text-primary" : "text-muted-foreground"}`}
        >
          {isMembership ? "Members" : "Approved volunteers"}
        </button>
      </div>
      <AdminCard className="p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="relative">
            <span className="sr-only">Search</span>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${tab === "applications" ? "applicants" : isMembership ? "members" : "volunteers"}…`}
              className={`${adminInput} pl-9`}
            />
          </label>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={adminInput}
          >
            <option value="">All statuses</option>
            {(tab === "applications"
              ? isMembership
                ? [
                    "SUBMITTED",
                    "UNDER_REVIEW",
                    "PAYMENT_PENDING",
                    "PAYMENT_VERIFICATION",
                  ]
                : ["SUBMITTED", "UNDER_REVIEW"]
              : [
                  "ACTIVE",
                  "EXPIRING_SOON",
                  "RENEWAL_PENDING",
                  "EXPIRED",
                  "CLOSURE_REQUESTED",
                  "CLOSED",
                ]
            ).map((value) => (
              <option key={value}>{value.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </AdminCard>
      {loading ? (
        <LoadingState label={`Loading ${tab}…`} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : tab === "applications" ? (
        applications.length === 0 ? (
          <EmptyState
            title={`No pending ${isMembership ? "membership" : "volunteer"} applications`}
            description="New applications requiring action will appear here."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {applications.map((application) => (
              <AdminCard key={application.applicationId} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRoundCheck size={19} />
                    </span>
                    <div>
                      <h2 className="font-body font-semibold">
                        {application.fullName}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {application.email}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={application.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Program</dt>
                    <dd className="mt-1">
                      {application.membershipTypeName ??
                        application.volunteerProgramName ??
                        "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Department / organization
                    </dt>
                    <dd className="mt-1">
                      {application.department ??
                        application.organization ??
                        "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd className="mt-1">{application.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Submitted</dt>
                    <dd className="mt-1">
                      {application.submittedAt
                        ? new Date(application.submittedAt).toLocaleDateString()
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {isMembership && application.feeMinor != null && (
                  <div className="mt-4 rounded-lg bg-white/[0.025] p-3 text-sm">
                    <span className="text-muted-foreground">
                      Configured fee
                    </span>
                    <strong className="float-right">
                      {new Intl.NumberFormat("en-BD", {
                        style: "currency",
                        currency: application.currency ?? "BDT",
                      }).format(application.feeMinor / 100)}
                    </strong>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {application.status === "SUBMITTED" && can("review") && (
                    <button
                      type="button"
                      onClick={() =>
                        decide(application, "start-review", "Start review")
                      }
                      className={adminSecondaryButton}
                    >
                      Start review
                    </button>
                  )}
                  {isMembership &&
                    application.status === "UNDER_REVIEW" &&
                    application.paymentRequired === 1 &&
                    application.latestPaymentStatus == null &&
                    can("review") && (
                      <button
                        type="button"
                        onClick={() =>
                          decide(
                            application,
                            "request-payment",
                            "Request payment",
                          )
                        }
                        className={adminSecondaryButton}
                      >
                        Request payment
                      </button>
                    )}
                  {application.status === "UNDER_REVIEW" &&
                    (!isMembership || application.paymentRequired === 0 || application.latestPaymentStatus === "VERIFIED") &&
                    can("approve") && (
                      <button
                        type="button"
                        onClick={() =>
                          decide(application, "approve", "Approve")
                        }
                        className={adminSecondaryButton}
                      >
                        Approve
                      </button>
                    )}
                  {isMembership &&
                    application.status === "PAYMENT_VERIFICATION" &&
                    application.latestPaymentStatus === "VERIFIED" &&
                    can("approve") && (
                      <button
                        type="button"
                        onClick={() =>
                          decide(application, "approve", "Approve")
                        }
                        className={adminSecondaryButton}
                      >
                        Approve
                      </button>
                    )}
                  {[
                    "UNDER_REVIEW",
                    "PAYMENT_PENDING",
                    "PAYMENT_VERIFICATION",
                  ].includes(application.status) &&
                    can("reject") && (
                      <button
                        type="button"
                        onClick={() =>
                          decide(application, "reject", "Reject", true)
                        }
                        className="min-h-10 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10"
                      >
                        Reject
                      </button>
                    )}
                </div>
              </AdminCard>
            ))}
          </div>
        )
      ) : people.length === 0 ? (
        <EmptyState
          title={`No ${isMembership ? "members" : "approved volunteers"} found`}
          description={`Approved ${isMembership ? "memberships" : "volunteer records"} will appear here.`}
        />
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--admin-border))] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Person</th>
                  <th className="px-4 py-3">Identity</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Valid through</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr
                    key={person.id}
                    className="border-b border-[hsl(var(--admin-border))] last:border-0"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Users size={17} />
                        </span>
                        <div>
                          <p className="font-medium">{person.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {person.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">
                      {person.membershipNumber ?? person.volunteerNumber}
                    </td>
                    <td className="px-4 py-4">
                      {person.membershipType ?? person.programName}
                    </td>
                    <td className="px-4 py-4">
                      {new Date(person.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={person.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-[hsl(var(--admin-border))] px-5 py-3 text-xs text-muted-foreground">
            {total} total records
          </p>
        </AdminCard>
      )}
      <ConfirmDialog
        open={Boolean(action)}
        title={action?.title ?? "Confirm action"}
        description={action?.description ?? ""}
        confirmLabel={action?.label ?? "Confirm"}
        dangerous={action?.dangerous}
        reasonLabel="Required decision reason"
        reason={action?.reason}
        onReasonChange={(value) =>
          setAction((current) =>
            current ? { ...current, reason: value } : null,
          )
        }
        busy={busy}
        onCancel={() => setAction(null)}
        onConfirm={() => void run()}
      />
    </div>
  );
}
