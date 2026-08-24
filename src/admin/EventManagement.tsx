import { useCallback, useEffect, useState } from "react";
import { Archive, Download, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import {
  AdminCard,
  EmptyState,
  LoadingState,
  StatusBadge,
  adminButton,
  adminInput,
  adminSecondaryButton,
} from "./AdminUI";

type Tab = "events" | "registrations" | "payments" | "attendance";
type EventStatus = "draft" | "published";

interface EventRecord {
  id: string;
  title: string;
  description?: string;
  date: string;
  venue?: string;
  type?: string;
  image_url?: string;
  max_participants?: number;
  is_paid?: boolean;
  registration_fee?: number;
  currency?: string;
  payment_instructions?: string;
  status: EventStatus;
  sort_order: number;
}
interface RegistrationRow {
  id: string;
  participant_name: string;
  email: string;
  phone?: string;
  event_title: string;
  event_type: string;
  fee_minor: number;
  currency: string;
  payment_status: string;
  registration_status: string;
  attendance_status: string;
  registered_at: string;
}

const emptyEvent = (): EventRecord => ({
  id: crypto.randomUUID(),
  title: "",
  description: "",
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  venue: "",
  type: "Workshop",
  image_url: "",
  max_participants: 0,
  is_paid: false,
  registration_fee: 0,
  currency: "BDT",
  payment_instructions: "",
  status: "draft",
  sort_order: 0,
});
const csv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export default function EventManagement({
  permissions,
  csrfToken,
  operationsOnly = false,
}: {
  permissions: string[];
  csrfToken?: string;
  operationsOnly?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(operationsOnly ? "registrations" : "events");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [editor, setEditor] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [registrationFilter, setRegistrationFilter] = useState("ALL");
  const canManage =
    permissions.includes("content.manage") ||
    permissions.includes("event.manage");
  const canPublish = permissions.includes("content.publish");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await apiRequest<EventRecord[]>("/admin/content/events"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Events are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await apiRequest<RegistrationRow[]>("/admin/event-registrations"),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Registrations are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (tab === "events") void loadEvents();
    else void loadRegistrations();
  }, [tab, loadEvents, loadRegistrations]);

  const saveEvent = async () => {
    if (!editor || !csrfToken) return;
    if (!editor.title.trim() || !editor.date)
      return toast.error("Title and date are required.");
    if (editor.is_paid && Number(editor.registration_fee) <= 0)
      return toast.error("Paid events require a positive registration fee.");
    setBusy(true);
    try {
      const { id, status, sort_order, ...data } = editor;
      await apiRequest(`/admin/content/events/${id}`, {
        method: "PUT",
        csrfToken,
        body: {
          data: {
            ...data,
            title: data.title.trim(),
            date: new Date(data.date).toISOString(),
            max_participants: Math.max(0, Number(data.max_participants || 0)),
            registration_fee: data.is_paid
              ? Number(data.registration_fee || 0)
              : 0,
            currency: (data.currency || "BDT").toUpperCase(),
          },
          status: status.toUpperCase(),
          sortOrder: Number(sort_order || 0),
        },
      });
      toast.success(
        status === "published" ? "Event published." : "Event draft saved.",
      );
      setEditor(null);
      await loadEvents();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save event.",
      );
    } finally {
      setBusy(false);
    }
  };
  const archiveEvent = async (event: EventRecord) => {
    if (!csrfToken || !window.confirm(`Archive “${event.title}”?`)) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/content/events/${event.id}`, {
        method: "DELETE",
        csrfToken,
      });
      toast.success("Event archived.");
      await loadEvents();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to archive event.",
      );
    } finally {
      setBusy(false);
    }
  };
  const uploadEventImage = async (file?: File) => {
    if (!file || !editor || !csrfToken) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const media = await apiRequest<{ url: string }>("/media/upload", {
        method: "POST",
        csrfToken,
        body,
      });
      setEditor({ ...editor, image_url: media.url });
      toast.success("Event image uploaded to R2.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const decide = async (id: string, action: string) => {
    if (!csrfToken) return;
    try {
      await apiRequest(`/admin/event-registrations/${id}/decision`, {
        method: "POST",
        csrfToken,
        body: {
          action,
          reason: `Administrator ${action.toLowerCase()} action`,
        },
      });
      toast.success("Event registration updated.");
      await loadRegistrations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    }
  };
  const filtered = rows.filter((row) => {
    if (tab === "payments" && row.event_type !== "PAID") return false;
    if (tab === "attendance" && row.registration_status !== "APPROVED")
      return false;
    const term = registrationSearch.trim().toLowerCase();
    if (
      term &&
      !`${row.participant_name} ${row.email} ${row.phone || ""} ${row.event_title}`
        .toLowerCase()
        .includes(term)
    )
      return false;
    if (eventFilter !== "ALL" && row.event_title !== eventFilter) return false;
    if (
      registrationFilter !== "ALL" &&
      row.registration_status !== registrationFilter
    )
      return false;
    return true;
  });
  const exportCsv = () => {
    const data = [
      [
        "Participant",
        "Email",
        "Phone",
        "Event",
        "Type",
        "Fee",
        "Currency",
        "Payment",
        "Registration",
        "Attendance",
        "Date",
      ],
      ...filtered.map((row) => [
        row.participant_name,
        row.email,
        row.phone,
        row.event_title,
        row.event_type,
        row.fee_minor / 100,
        row.currency,
        row.payment_status,
        row.registration_status,
        row.attendance_status,
        row.registered_at,
      ]),
    ];
    const blob = new Blob(
      [data.map((row) => row.map(csv).join(",")).join("\r\n")],
      { type: "text/csv" },
    );
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `event-${tab}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  return (
    <div className="space-y-5">
      <AdminCard className="p-2">
        <div className="flex gap-2 overflow-x-auto">
          {(operationsOnly
            ? (["registrations", "payments", "attendance"] as Tab[])
            : (["events", "registrations", "payments", "attendance"] as Tab[])
          ).map(
            (item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`${tab === item ? adminButton : adminSecondaryButton} capitalize`}
              >
                {item}
              </button>
            ),
          )}
          {tab === "events" && canManage && (
            <button
              onClick={() => setEditor(emptyEvent())}
              className={`${adminButton} ml-auto`}
            >
              <Plus size={15} />
              New event
            </button>
          )}
          {tab !== "events" && (
            <button
              onClick={exportCsv}
              className={`${adminSecondaryButton} ml-auto`}
            >
              <Download size={15} />
              Export CSV
            </button>
          )}
        </div>
      </AdminCard>

      {tab !== "events" && (
        <AdminCard className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative lg:col-span-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              className={`${adminInput} pl-9`}
              value={registrationSearch}
              onChange={(event) => setRegistrationSearch(event.target.value)}
              placeholder="Search participant, email, phone…"
            />
          </label>
          <select
            className={adminInput}
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value)}
          >
            <option value="ALL">All events</option>
            {Array.from(new Set(rows.map((row) => row.event_title))).map(
              (title) => (
                <option key={title}>{title}</option>
              ),
            )}
          </select>
          <select
            className={adminInput}
            value={registrationFilter}
            onChange={(event) => setRegistrationFilter(event.target.value)}
          >
            <option value="ALL">All registration statuses</option>
            {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </AdminCard>
      )}

      {tab === "events" ? (
        loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <EmptyState
            title="No events found"
            description="Create a free or paid event and publish it when registration is ready."
            action={
              canManage ? (
                <button
                  onClick={() => setEditor(emptyEvent())}
                  className={adminButton}
                >
                  Create event
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {events.map((event) => (
              <AdminCard key={event.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <StatusBadge status={event.status} />
                      <StatusBadge status={event.is_paid ? "PAID" : "FREE"} />
                    </div>
                    <h3 className="font-body text-lg font-semibold">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleString()} ·{" "}
                      {event.venue || "Venue pending"}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {event.description || "No description yet."}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {event.max_participants
                        ? `${event.max_participants} seats`
                        : "Unlimited seats"}
                      {event.is_paid
                        ? ` · ${event.currency || "BDT"} ${event.registration_fee || 0}`
                        : ""}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        aria-label="Edit event"
                        onClick={() =>
                          setEditor({
                            ...event,
                            date: new Date(event.date)
                              .toISOString()
                              .slice(0, 16),
                          })
                        }
                        className={adminSecondaryButton}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        aria-label="Archive event"
                        disabled={busy}
                        onClick={() => void archiveEvent(event)}
                        className={adminSecondaryButton}
                      >
                        <Archive size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </AdminCard>
            ))}
          </div>
        )
      ) : loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={`No ${tab} found`}
          description="Records will appear when users register for published events."
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-5 py-3">Participant</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[hsl(var(--admin-border))]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium">{row.participant_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.email}
                      </p>
                    </td>
                    <td className="px-4 py-4">{row.event_title}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.payment_status} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.registration_status} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.attendance_status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {permissions.includes("finance.verify") &&
                          row.payment_status === "SUBMITTED" && (
                            <button
                              onClick={() =>
                                void decide(row.id, "VERIFY_PAYMENT")
                              }
                              className={adminButton}
                            >
                              Verify
                            </button>
                          )}
                        {permissions.includes("event.manage") &&
                          row.registration_status === "PENDING" && (
                            <button
                              onClick={() => void decide(row.id, "APPROVE")}
                              className={adminSecondaryButton}
                            >
                              Approve
                            </button>
                          )}
                        {permissions.includes("event.manage") &&
                          row.registration_status === "APPROVED" && (
                            <>
                              <button
                                onClick={() => void decide(row.id, "PRESENT")}
                                className={adminSecondaryButton}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => void decide(row.id, "ABSENT")}
                                className={adminSecondaryButton}
                              >
                                Absent
                              </button>
                            </>
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
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-body text-xl font-semibold">
                  {events.some((item) => item.id === editor.id)
                    ? "Edit event"
                    : "Create event"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure schedule, capacity, pricing, and payment
                  instructions.
                </p>
              </div>
              <button
                aria-label="Close event editor"
                onClick={() => setEditor(null)}
                className={adminSecondaryButton}
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-medium">
                Title
                <input
                  className={`${adminInput} mt-2`}
                  value={editor.title}
                  onChange={(event) =>
                    setEditor({ ...editor, title: event.target.value })
                  }
                />
              </label>
              <label className="sm:col-span-2 text-sm font-medium">
                Description
                <textarea
                  rows={5}
                  className={`${adminInput} mt-2 resize-y`}
                  value={editor.description || ""}
                  onChange={(event) =>
                    setEditor({ ...editor, description: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Date and time
                <input
                  type="datetime-local"
                  className={`${adminInput} mt-2`}
                  value={editor.date}
                  onChange={(event) =>
                    setEditor({ ...editor, date: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Venue
                <input
                  className={`${adminInput} mt-2`}
                  value={editor.venue || ""}
                  onChange={(event) =>
                    setEditor({ ...editor, venue: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Event type
                <input
                  className={`${adminInput} mt-2`}
                  value={editor.type || ""}
                  onChange={(event) =>
                    setEditor({ ...editor, type: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Maximum participants
                <input
                  type="number"
                  min="0"
                  className={`${adminInput} mt-2`}
                  value={editor.max_participants || 0}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      max_participants: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="sm:col-span-2 text-sm font-medium">
                Image URL
                <input
                  className={`${adminInput} mt-2`}
                  value={editor.image_url || ""}
                  onChange={(event) =>
                    setEditor({ ...editor, image_url: event.target.value })
                  }
                  placeholder="https://… or /api/v1/media/files/…"
                />
              </label>
              <label
                className={`${adminSecondaryButton} sm:col-span-2 cursor-pointer`}
              >
                Upload event image to R2
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) =>
                    void uploadEventImage(event.target.files?.[0])
                  }
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[hsl(var(--admin-border))] p-4 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(editor.is_paid)}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      is_paid: event.target.checked,
                      registration_fee: event.target.checked
                        ? editor.registration_fee || 0
                        : 0,
                    })
                  }
                />
                Paid registration
              </label>
              <label className="text-sm font-medium">
                Registration fee
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!editor.is_paid}
                  className={`${adminInput} mt-2`}
                  value={editor.registration_fee || 0}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      registration_fee: Number(event.target.value),
                    })
                  }
                />
              </label>
              {editor.is_paid && (
                <>
                  <label className="text-sm font-medium">
                    Currency
                    <input
                      maxLength={3}
                      className={`${adminInput} mt-2 uppercase`}
                      value={editor.currency || "BDT"}
                      onChange={(event) =>
                        setEditor({ ...editor, currency: event.target.value })
                      }
                    />
                  </label>
                  <label className="sm:col-span-2 text-sm font-medium">
                    Payment instructions
                    <textarea
                      rows={4}
                      className={`${adminInput} mt-2 resize-y`}
                      value={editor.payment_instructions || ""}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          payment_instructions: event.target.value,
                        })
                      }
                    />
                  </label>
                </>
              )}
              <label className="text-sm font-medium">
                Status
                <select
                  className={`${adminInput} mt-2`}
                  value={editor.status}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      status: event.target.value as EventStatus,
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  {canPublish && <option value="published">Published</option>}
                </select>
              </label>
              <label className="text-sm font-medium">
                Display order
                <input
                  type="number"
                  className={`${adminInput} mt-2`}
                  value={editor.sort_order}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      sort_order: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditor(null)}
                className={adminSecondaryButton}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={() => void saveEvent()}
                className={adminButton}
              >
                {busy
                  ? "Saving…"
                  : editor.status === "published"
                    ? "Save and publish"
                    : "Save draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
