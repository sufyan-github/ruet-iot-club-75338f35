import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  adminButton,
  adminInput,
  adminSecondaryButton,
} from "./AdminUI";
import type { AuditEvent } from "./types";

type PaymentMethod = "BKASH" | "NAGAD";

export interface WebsiteSettings {
  contact: { generalEmail: string; phone: string };
  membership: {
    phone: string;
    paymentNumber: string;
    paymentMethods: PaymentMethod[];
    paymentInstructions: string;
  };
  location: { address: string; mapEmbedUrl: string; mapOpenUrl: string };
}
const emptySettings: WebsiteSettings = {
  contact: { generalEmail: "", phone: "" },
  membership: {
    phone: "",
    paymentNumber: "01580352238",
    paymentMethods: ["BKASH", "NAGAD"],
    paymentInstructions: "",
  },
  location: { address: "", mapEmbedUrl: "", mapOpenUrl: "" },
};
const friendly = (value: string) =>
  value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function SettingsManagement({
  canManage,
  csrfToken,
}: {
  canManage: boolean;
  csrfToken?: string;
}) {
  const [value, setValue] = useState<WebsiteSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setValue(await apiRequest<WebsiteSettings>("/admin/settings/website"));
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : "Website settings are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!csrfToken) return;
    setBusy(true);
    try {
      await apiRequest("/admin/settings/website", {
        method: "PUT",
        csrfToken,
        body: value,
      });
      toast.success("Website settings published.");
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "Settings could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Manage the public contact, membership payment guidance, and verified RUET location served directly from D1."
      />
      {loading ? (
        <LoadingState label="Loading website settings…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <form onSubmit={(event) => void save(event)} className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-3">
            <SettingCard
              icon={<Settings2 size={18} />}
              title="Public contact"
              description="Shown on public contact and help surfaces."
            >
              <Field
                label="General email"
                type="email"
                value={value.contact.generalEmail}
                onChange={(generalEmail) =>
                  setValue({
                    ...value,
                    contact: { ...value.contact, generalEmail },
                  })
                }
              />
              <Field
                label="Phone number"
                value={value.contact.phone}
                onChange={(phone) =>
                  setValue({ ...value, contact: { ...value.contact, phone } })
                }
              />
            </SettingCard>
            <SettingCard
              icon={<Settings2 size={18} />}
              title="Membership & payment"
              description="Official assistance and applicant payment guidance."
            >
              <Field
                label="Membership phone"
                value={value.membership.phone}
                onChange={(phone) =>
                  setValue({
                    ...value,
                    membership: { ...value.membership, phone },
                  })
                }
              />
              <Field
                label="Official payment number"
                value={value.membership.paymentNumber}
                onChange={(paymentNumber) =>
                  setValue({
                    ...value,
                    membership: { ...value.membership, paymentNumber },
                  })
                }
              />
              <fieldset>
                <legend className="text-sm font-medium">Accepted payment channels</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["BKASH", "NAGAD"] as PaymentMethod[]).map((method) => (
                    <label key={method} className="flex items-center gap-2 rounded-lg border border-[hsl(var(--admin-border))] px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={value.membership.paymentMethods.includes(method)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...new Set([...value.membership.paymentMethods, method])]
                            : value.membership.paymentMethods.filter((item) => item !== method);
                          if (next.length > 0) {
                            setValue({
                              ...value,
                              membership: { ...value.membership, paymentMethods: next },
                            });
                          }
                        }}
                      />
                      {method === "BKASH" ? "bKash" : "Nagad"}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">At least one channel must remain enabled. New payment requests snapshot these values.</p>
              </fieldset>
              <label className="block text-sm font-medium">
                Payment instructions
                <textarea
                  required
                  minLength={10}
                  rows={5}
                  value={value.membership.paymentInstructions}
                  onChange={(event) =>
                    setValue({
                      ...value,
                      membership: {
                        ...value.membership,
                        paymentInstructions: event.target.value,
                      },
                    })
                  }
                  className={`${adminInput} mt-2 resize-y`}
                />
              </label>
            </SettingCard>
            <SettingCard
              icon={<Settings2 size={18} />}
              title="Location & map"
              description="Verified location details and Google Maps destinations."
            >
              <label className="block text-sm font-medium">
                Address
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={value.location.address}
                  onChange={(event) =>
                    setValue({
                      ...value,
                      location: {
                        ...value.location,
                        address: event.target.value,
                      },
                    })
                  }
                  className={`${adminInput} mt-2 resize-y`}
                />
              </label>
              <Field
                label="Map embed URL"
                type="url"
                value={value.location.mapEmbedUrl}
                onChange={(mapEmbedUrl) =>
                  setValue({
                    ...value,
                    location: { ...value.location, mapEmbedUrl },
                  })
                }
              />
              <Field
                label="Open map URL"
                type="url"
                value={value.location.mapOpenUrl}
                onChange={(mapOpenUrl) =>
                  setValue({
                    ...value,
                    location: { ...value.location, mapOpenUrl },
                  })
                }
              />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Live preview
                </p>
                <GoogleMapEmbed
                  address={value.location.address}
                  embedUrl={value.location.mapEmbedUrl}
                  openUrl={value.location.mapOpenUrl}
                  heightClassName="h-44"
                />
              </div>
            </SettingCard>
          </div>
          {canManage && (
            <AdminCard className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-medium">Publish settings</p>
                <p className="text-sm text-muted-foreground">
                  Changes take effect on the public website immediately and are
                  audit logged.
                </p>
              </div>
              <button disabled={busy} className={adminButton}>
                {busy ? "Publishing…" : "Publish changes"}
              </button>
            </AdminCard>
          )}
        </form>
      )}
    </div>
  );
}

function SettingCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="p-5">
      <div className="flex gap-3">
        <span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300">
          {icon}
        </span>
        <div>
          <h2 className="font-body font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </AdminCard>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${adminInput} mt-2`}
      />
    </label>
  );
}

export function AuditLogManagement() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(
        await apiRequest<AuditEvent[]>(
          `/admin/audit-logs?limit=100${action ? `&action=${encodeURIComponent(action)}` : ""}`,
        ),
      );
    } catch (next) {
      setError(
        next instanceof Error ? next.message : "Audit records are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [action]);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          !query ||
          `${item.action} ${item.entity_type} ${item.entity_id ?? ""} ${item.reason ?? ""} ${item.request_id}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [items, query],
  );
  const actions = [...new Set(items.map((item) => item.action))].sort();
  const exportCsv = () => {
    const quote = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      [
        "timestamp",
        "action",
        "actor_type",
        "actor_id",
        "entity_type",
        "entity_id",
        "reason",
        "request_id",
      ],
      ...visible.map((item) => [
        item.created_at,
        item.action,
        item.actor_type,
        item.actor_id,
        item.entity_type,
        item.entity_id,
        item.reason,
        item.request_id,
      ]),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ruet-iot-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Log"
        description="Immutable security, workflow, content, finance, and administration events recorded by the Worker."
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className={adminSecondaryButton}
          >
            <Download size={16} />
            Export CSV
          </button>
        }
      />
      <AdminCard className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_18rem]">
          <label className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <span className="sr-only">Search audit log</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search action, resource, reason, or request ID…"
              className={`${adminInput} pl-9`}
            />
          </label>
          <select
            aria-label="Filter audit action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className={adminInput}
          >
            <option value="">All actions</option>
            {actions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      </AdminCard>
      {loading ? (
        <LoadingState label="Loading audit history…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No audit events found"
          description="Adjust your search or action filter."
        />
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--admin-border))] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Time</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-5 py-3">Request</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[hsl(var(--admin-border))] align-top last:border-0"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={friendly(item.action)} />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {friendly(item.actor_type)}
                        {item.actor_id
                          ? ` · ${item.actor_id.slice(0, 8)}…`
                          : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{friendly(item.entity_type)}</p>
                      <p
                        className="max-w-48 truncate text-xs text-muted-foreground"
                        title={item.entity_id ?? undefined}
                      >
                        {item.entity_id ?? "—"}
                      </p>
                    </td>
                    <td className="max-w-sm px-4 py-4 text-muted-foreground">
                      {item.reason ?? "No reason recorded"}
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs text-muted-foreground">
                        {item.request_id}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
