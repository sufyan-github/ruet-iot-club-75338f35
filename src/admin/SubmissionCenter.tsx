import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Download, Filter, Search, UserRound, X } from "lucide-react";
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
import type { AdminSection } from "./AdminShell";
import type { AdminSubmission } from "./types";

const sectionType: Partial<Record<AdminSection, string>> = {
  projects: "PROJECT",
  research: "RESEARCH",
  alumni: "ALUMNI",
  partners: "COLLABORATION",
};
const titles: Partial<Record<AdminSection, [string, string]>> = {
  applications: [
    "Application Center",
    "Review contact messages, project and research proposals, alumni applications, and collaboration requests in one place.",
  ],
  projects: [
    "Project Proposals",
    "Review project ideas, supporting documents, teams, technology plans, and publication readiness.",
  ],
  research: [
    "Research Proposals",
    "Manage research review, revision, approval, and publication decisions.",
  ],
  alumni: [
    "Alumni Applications",
    "Verify RUET history, professional details, consent, and public profile readiness.",
  ],
  partners: [
    "Partners & Collaboration",
    "Review partnership requests and manage published partner content.",
  ],
};
const statuses = [
  "EMAIL_VERIFICATION",
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_INFORMATION",
  "REVISION_REQUESTED",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "HIDDEN",
  "ARCHIVED",
];
const nextStatuses: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  UNDER_REVIEW: [
    "NEEDS_INFORMATION",
    "REVISION_REQUESTED",
    "APPROVED",
    "REJECTED",
    "ARCHIVED",
  ],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  REVISION_REQUESTED: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  APPROVED: ["PUBLISHED", "ONGOING", "COMPLETED", "HIDDEN", "ARCHIVED"],
  REJECTED: ["UNDER_REVIEW", "ARCHIVED"],
  PUBLISHED: ["ONGOING", "COMPLETED", "HIDDEN", "ARCHIVED"],
  ONGOING: ["COMPLETED", "HIDDEN", "ARCHIVED"],
  COMPLETED: ["PUBLISHED", "HIDDEN", "ARCHIVED"],
  HIDDEN: ["PUBLISHED", "ARCHIVED"],
};

function friendlyLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
function StructuredValue({ value }: { value: unknown }) {
  if (
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
    return <span className="text-muted-foreground">Not provided</span>;
  if (Array.isArray(value))
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, index) =>
          typeof item === "object" ? (
            <div key={index} className="w-full rounded-lg bg-black/10 p-3">
              <StructuredObject value={item as Record<string, unknown>} />
            </div>
          ) : (
            <span
              key={index}
              className="rounded-full bg-primary/8 px-2 py-1 text-xs text-primary"
            >
              {String(item)}
            </span>
          ),
        )}
      </div>
    );
  if (typeof value === "object")
    return <StructuredObject value={value as Record<string, unknown>} />;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  return <span className="whitespace-pre-wrap leading-6">{String(value)}</span>;
}
function StructuredObject({ value }: { value: Record<string, unknown> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {Object.entries(value).map(([key, item]) => (
        <div
          key={key}
          className={
            typeof item === "string" && item.length > 160 ? "sm:col-span-2" : ""
          }
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {friendlyLabel(key)}
          </dt>
          <dd className="mt-1 text-sm">
            <StructuredValue value={item} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function SubmissionCenter({
  section,
  permissions,
  csrfToken,
  onCountChange,
}: {
  section: AdminSection;
  permissions: string[];
  csrfToken?: string;
  onCountChange?: () => void;
}) {
  const fixedType = sectionType[section] ?? "";
  const [items, setItems] = useState<AdminSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState(fixedType);
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AdminSubmission | null>(null);
  const [reviewers, setReviewers] = useState<Array<{ id: string; displayName: string; email: string }>>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decision, setDecision] = useState<{
    status: string;
    reason: string;
    publicResponse: string;
    internalNote: string;
    priority: string;
    assignedReviewerId: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, description] = titles[section] ?? titles.applications!;
  const canManage = (submissionType: string) =>
    permissions.includes("submissions.manage") ||
    (submissionType === "PROJECT" &&
      permissions.some((key) =>
        ["project.review", "project.manage"].includes(key),
      )) ||
    (submissionType === "RESEARCH" &&
      permissions.some((key) =>
        ["research.review", "research.approve", "research.manage"].includes(
          key,
        ),
      )) ||
    (submissionType === "ALUMNI" && permissions.includes("people.manage")) ||
    (submissionType === "COLLABORATION" &&
      permissions.includes("partner.manage")) ||
    (submissionType === "OPPORTUNITY" &&
      permissions.some((key) => ["opportunity.manage", "submissions.manage"].includes(key))) ||
    (submissionType === "CONTACT" && permissions.includes("content.manage"));

  const availableStatuses = (item: AdminSubmission) => {
    if (item.source === "OPPORTUNITY") {
      const transitions: Record<string, string[]> = {
        SUBMITTED: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
        UNDER_REVIEW: ["NEEDS_INFORMATION", "APPROVED", "REJECTED", "ARCHIVED"],
        NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
        APPROVED: ["COMPLETED", "ARCHIVED"],
        REJECTED: ["UNDER_REVIEW", "ARCHIVED"],
        COMPLETED: ["ARCHIVED"],
      };
      return transitions[item.status] ?? [];
    }
    return nextStatuses[item.status] ?? [];
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        limit: "20",
        offset: String(offset),
      });
      if (type) query.set("type", type);
      if (status) query.set("status", status);
      if (search.trim()) query.set("search", search.trim());
      const endpoint = section === "applications" ? "/admin/applications" : "/admin/submissions";
      const data = await apiRequest<{
        items: AdminSubmission[];
        total: number;
      }>(`${endpoint}?${query}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Submission information is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [offset, search, section, status, type]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    setType(fixedType);
    setOffset(0);
    setSelected(null);
  }, [fixedType]);
  useEffect(() => {
    if (section !== "applications") return;
    void apiRequest<Array<{ id: string; displayName: string; email: string }>>("/admin/application-reviewers")
      .then(setReviewers)
      .catch(() => setReviewers([]));
  }, [section]);
  const open = async (item: AdminSubmission) => {
    setDetailLoading(true);
    try {
      setSelected(
        item.source === "OPPORTUNITY"
          ? await apiRequest<AdminSubmission>(`/admin/opportunity-applications/${item.id}`)
          : item.source && item.source !== "PLATFORM"
            ? item
            : await apiRequest<AdminSubmission>(`/admin/submissions/${item.id}`),
      );
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Unable to open the application.",
      );
    } finally {
      setDetailLoading(false);
    }
  };
  const applyDecision = async () => {
    if (!selected || !decision || !csrfToken) return;
    setBusy(true);
    try {
      const endpoint = selected.source === "OPPORTUNITY"
        ? `/admin/opportunity-applications/${selected.id}`
        : `/admin/submissions/${selected.id}`;
      await apiRequest(endpoint, {
        method: "PATCH",
        csrfToken,
        body: {
          status: decision.status,
          publicResponse: decision.publicResponse || null,
          internalNote: decision.internalNote || undefined,
          priority: decision.priority,
          assignedReviewerId: decision.assignedReviewerId || null,
          reason: decision.reason,
        },
      });
      toast.success(
        `${selected.type.toLowerCase()} workflow updated successfully.`,
      );
      setDecision(null);
      setSelected(null);
      await load();
      onCountChange?.();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Unable to update this workflow. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const convertPartner = async () => {
    if (!selected || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/partnership-applications/${selected.id}/convert`, {
        method: "POST",
        csrfToken,
      });
      toast.success("Published-partner draft created. Complete its profile below the applications queue.");
      setSelected(null);
      await load();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Unable to convert this application.");
    } finally {
      setBusy(false);
    }
  };
  const exportCsv = async () => {
    setBusy(true);
    try {
      const exported: AdminSubmission[] = [];
      let nextOffset = 0;
      do {
        const query = new URLSearchParams({
          limit: "100",
          offset: String(nextOffset),
        });
        if (type) query.set("type", type);
        if (status) query.set("status", status);
        if (search.trim()) query.set("search", search.trim());
        const endpoint = section === "applications" ? "/admin/applications" : "/admin/submissions";
        const page = await apiRequest<{
          items: AdminSubmission[];
          total: number;
        }>(`${endpoint}?${query}`);
        exported.push(...page.items);
        nextOffset += page.items.length;
        if (page.items.length === 0 || nextOffset >= page.total) break;
      } while (nextOffset < 10000);
      const quote = (value: unknown) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;
      const rows = [
        [
          "Reference",
          "Type",
          "Title",
          "Applicant",
          "Email",
          "Phone",
          "Institution",
          "Department",
          "Status",
          "Submitted",
        ],
        ...exported.map((item) => [
          item.referenceCode,
          item.type,
          item.title,
          item.submitter.name,
          item.submitter.email,
          item.submitter.phone,
          item.submitter.institution,
          item.submitter.department,
          item.status,
          item.createdAt,
        ]),
      ];
      const url = URL.createObjectURL(
        new Blob([rows.map((row) => row.map(quote).join(",")).join("\r\n")], {
          type: "text/csv;charset=utf-8",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fixedType ? fixedType.toLowerCase() : "applications"}-${status || "all"}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Unable to export applications.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <button
            type="button"
            disabled={busy || total === 0}
            onClick={() => void exportCsv()}
            className={adminSecondaryButton}
          >
            <Download size={16} />
            Export filtered CSV
          </button>
        }
      />
      <AdminCard className="p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_13rem]">
          <label className="relative">
            <span className="sr-only">Search submissions</span>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              placeholder="Search name, email, title, or reference…"
              className={`${adminInput} pl-9`}
            />
          </label>
          {!fixedType && (
            <label className="relative">
              <span className="sr-only">Filter by type</span>
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={15}
              />
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  setOffset(0);
                }}
                className={`${adminInput} pl-9`}
              >
                <option value="">All application types</option>
                {[
                  "CONTACT",
                  "PROJECT",
                  "RESEARCH",
                  "ALUMNI",
                  "COLLABORATION",
                  "MEMBERSHIP",
                  "VOLUNTEER",
                  "OPPORTUNITY",
                  "EVENT_REGISTRATION",
                  "COURSE_REGISTRATION",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          )}
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setOffset(0);
            }}
            className={adminInput}
          >
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value}>{friendlyLabel(value)}</option>
            ))}
          </select>
        </div>
      </AdminCard>
      {loading ? (
        <LoadingState label="Loading applications…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${fixedType ? friendlyLabel(fixedType).toLowerCase() : "matching"} applications`}
          description="Applications submitted through the website will appear here when they match your filters and permissions."
        />
      ) : (
        <AdminCard>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--admin-border))] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Applicant</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[hsl(var(--admin-border))] last:border-0 hover:bg-white/[0.015]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium">{item.submitter.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.submitter.email}
                      </p>
                    </td>
                    <td className="max-w-sm px-4 py-4">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.type} · {item.referenceCode} · {friendlyLabel(item.priority ?? "NORMAL")}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void open(item)}
                        className={adminSecondaryButton}
                      >
                        View & review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[hsl(var(--admin-border))] lg:hidden">
            {items.map((item) => (
              <article key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.submitter.name} · {item.type}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar size={14} />
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
                <button
                  type="button"
                  onClick={() => void open(item)}
                  className={`${adminSecondaryButton} mt-4 w-full`}
                >
                  View & review
                </button>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-[hsl(var(--admin-border))] px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {offset + 1}–{Math.min(offset + items.length, total)} of{" "}
              {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 20))}
                className={adminSecondaryButton}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={offset + items.length >= total}
                onClick={() => setOffset(offset + 20)}
                className={adminSecondaryButton}
              >
                Next
              </button>
            </div>
          </div>
        </AdminCard>
      )}
      {(selected || detailLoading) && (
        <div
          className="fixed inset-0 z-[80] flex justify-end bg-black/65"
          role="presentation"
        >
          <button
            aria-label="Close application details"
            className="absolute inset-0"
            onClick={() => setSelected(null)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-detail-title"
            className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs text-muted-foreground">
                  Application details
                </p>
                <h2
                  id="submission-detail-title"
                  className="font-body text-lg font-semibold"
                >
                  {selected?.referenceCode ?? "Loading…"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close details"
                className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>
            {detailLoading || !selected ? (
              <div className="p-5">
                <LoadingState />
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {selected.type}
                      </p>
                      <h3 className="mt-1 font-body text-xl font-semibold">
                        {selected.title}
                      </h3>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {selected.summary}
                  </p>
                </div>
                <AdminCard className="p-5">
                  <h3 className="font-body font-semibold">Applicant</h3>
                  <div className="mt-4 flex gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRound size={19} />
                    </span>
                    <div>
                      <p className="font-medium">{selected.submitter.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selected.submitter.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          selected.submitter.phone,
                          selected.submitter.institution,
                          selected.submitter.department,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                </AdminCard>
                <AdminCard className="p-5">
                  <h3 className="font-body font-semibold">
                    Submitted information
                  </h3>
                  <div className="mt-4">
                    <StructuredObject value={selected.payload} />
                  </div>
                </AdminCard>
                {selected.attachments && selected.attachments.length > 0 && (
                  <AdminCard className="p-5">
                    <h3 className="font-body font-semibold">Attachments</h3>
                    <div className="mt-3 space-y-2">
                      {selected.attachments.map((file) => (
                        <a
                          key={file.id}
                          href={`/api/v1/submissions/${selected.id}/attachments/${file.id}`}
                          className="flex items-center justify-between rounded-lg border border-[hsl(var(--admin-border))] p-3 text-sm hover:border-primary/30"
                        >
                          <span>
                            {file.originalName}{" "}
                            <span className="text-muted-foreground">
                              ({Math.ceil(file.byteSize / 1024)} KB)
                            </span>
                          </span>
                          <Download size={16} />
                        </a>
                      ))}
                    </div>
                  </AdminCard>
                )}
                {selected.events && selected.events.length > 0 && (
                  <AdminCard className="p-5">
                    <h3 className="font-body font-semibold">Timeline</h3>
                    <ol className="mt-4 space-y-3 border-l border-[hsl(var(--admin-border))] pl-5">
                      {selected.events.map((event, index) => (
                        <li key={`${String(event.createdAt ?? event.created_at)}-${index}`}>
                          <p className="text-sm font-medium">
                            {friendlyLabel(String(event.toStatus ?? event.to_status ?? event.eventType ?? event.event_type ?? "Update"))}
                          </p>
                          {event.note ?? event.public_message ?? event.internal_note ? <p className="mt-1 text-sm text-muted-foreground">{String(event.note ?? event.public_message ?? event.internal_note)}</p> : null}
                          <time className="text-xs text-muted-foreground">
                            {event.createdAt ?? event.created_at ? new Date(String(event.createdAt ?? event.created_at)).toLocaleString() : ""}
                          </time>
                        </li>
                      ))}
                    </ol>
                  </AdminCard>
                )}
                {selected.internalNotes && (
                  <AdminCard className="border-amber-500/20 p-5">
                    <h3 className="font-body font-semibold text-amber-200">
                      Private review notes
                    </h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {selected.internalNotes}
                    </p>
                  </AdminCard>
                )}
                {(!selected.source || selected.source === "PLATFORM" || selected.source === "OPPORTUNITY") && canManage(selected.type) &&
                  availableStatuses(selected).length > 0 && (
                    <AdminCard className="p-5">
                      <h3 className="font-body font-semibold">
                        Review actions
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Every decision is revalidated by the Worker and recorded
                        in the audit trail.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium">
                          Priority
                          <select
                            value={selected.priority ?? "NORMAL"}
                            onChange={(event) => setSelected({ ...selected, priority: event.target.value })}
                            className={`${adminInput} mt-1`}
                          >
                            {["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium">
                          Assigned reviewer
                          <select
                            value={selected.assignedReviewerId ?? ""}
                            onChange={(event) => setSelected({ ...selected, assignedReviewerId: event.target.value || null })}
                            className={`${adminInput} mt-1`}
                          >
                            <option value="">Unassigned</option>
                            {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.displayName} · {reviewer.email}</option>)}
                          </select>
                        </label>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {availableStatuses(selected).map((next) => (
                          <button
                            type="button"
                            key={next}
                            onClick={() =>
                              setDecision({
                                status: next,
                                reason: "",
                                publicResponse: selected.publicResponse ?? "",
                                internalNote: "",
                                priority: selected.priority ?? "NORMAL",
                                assignedReviewerId: selected.assignedReviewerId ?? "",
                              })
                            }
                            className={
                              next === "REJECTED" || next === "ARCHIVED"
                                ? "min-h-10 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10"
                                : adminSecondaryButton
                            }
                          >
                            {friendlyLabel(next)}
                          </button>
                        ))}
                      </div>
                    </AdminCard>
                  )}
                {selected.type === "COLLABORATION" &&
                  ["APPROVED", "PUBLISHED"].includes(selected.status) &&
                  permissions.includes("partner.manage") && (
                    <AdminCard className="border-primary/20 p-5">
                      <h3 className="font-body font-semibold">Published partner</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Convert this approved application into a separate partner draft, then review and publish the public profile.
                      </p>
                      <button type="button" disabled={busy} onClick={() => void convertPartner()} className={`${adminSecondaryButton} mt-4`}>
                        Convert to Published Partner
                      </button>
                    </AdminCard>
                  )}
              </div>
            )}
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(decision)}
        title={`${decision ? friendlyLabel(decision.status) : "Update"} application`}
        description="This changes the workflow state, notifies the submitter, and creates an immutable audit event. Confirm only after reviewing the full application."
        confirmLabel={decision ? friendlyLabel(decision.status) : "Confirm"}
        dangerous={
          decision?.status === "REJECTED" || decision?.status === "ARCHIVED"
        }
        reasonLabel="Decision reason"
        reason={decision?.reason}
        onReasonChange={(value) =>
          setDecision((current) =>
            current ? { ...current, reason: value } : null,
          )
        }
        busy={busy}
        onCancel={() => setDecision(null)}
        onConfirm={() => void applyDecision()}
      />
    </div>
  );
}
