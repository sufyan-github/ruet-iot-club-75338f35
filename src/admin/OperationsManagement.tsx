import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Download,
  Mail,
  Plus,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  adminButton,
  adminInput,
  adminSecondaryButton,
} from "./AdminUI";
import type { EmailLog, PaymentEvidence, UserNotification } from "./types";

const money = (amount: number, currency = "BDT") =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency }).format(
    amount / 100,
  );
const csv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  pendingVerification: number;
  thisMonth: number;
  thisYear: number;
}
interface FinanceTransaction {
  id: string;
  transactionCode: string;
  transactionDate: string;
  transactionType: string;
  category: string;
  direction: "INCOME" | "EXPENSE";
  amountMinor: number;
  currency: string;
  paymentMethod: string | null;
  externalReference: string | null;
  description: string;
  relatedModule: string;
  relatedEntityId: string | null;
  status: string;
}
const blankTransaction = () => ({
  transactionDate: new Date().toISOString().slice(0, 16),
  transactionType: "Other Income",
  category: "Other Income",
  direction: "INCOME",
  amount: "",
  currency: "BDT",
  paymentMethod: "",
  externalReference: "",
  description: "",
  relatedModule: "OTHER",
  relatedEntityId: "",
  status: "PENDING",
  receiptObjectKey: "",
  notes: "",
});

export function FinanceManagement({
  canVerify,
  canManage,
  csrfToken,
}: {
  canVerify: boolean;
  canManage: boolean;
  csrfToken?: string;
}) {
  const [tab, setTab] = useState<"ledger" | "membership">("ledger");
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [payments, setPayments] = useState<PaymentEvidence[]>([]);
  const [status, setStatus] = useState("");
  const [direction, setDirection] = useState("");
  const [module, setModule] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<ReturnType<
    typeof blankTransaction
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [transactionDecision, setTransactionDecision] = useState<{
    item: FinanceTransaction;
    status: "VERIFIED" | "REJECTED";
    reason: string;
  } | null>(null);
  const [paymentDecision, setPaymentDecision] = useState<{
    payment: PaymentEvidence;
    action: "verify" | "reject";
    reason: string;
  } | null>(null);
  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (direction) params.set("direction", direction);
      if (module) params.set("module", module);
      if (query) params.set("q", query);
      const [rows, metrics] = await Promise.all([
        apiRequest<FinanceTransaction[]>(
          `/admin/finance/transactions?${params}`,
        ),
        apiRequest<FinanceSummary>("/admin/finance/summary"),
      ]);
      setTransactions(rows);
      setSummary(metrics);
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : "Finance records are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [status, direction, module, query]);
  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPayments(
        await apiRequest<PaymentEvidence[]>(
          `/admin/membership/payments?status=${status || "SUBMITTED"}`,
        ),
      );
    } catch (next) {
      setError(
        next instanceof Error ? next.message : "Payments are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    if (tab === "ledger") void loadLedger();
    else void loadPayments();
  }, [tab, loadLedger, loadPayments]);
  const create = async () => {
    if (!editor || !csrfToken) return;
    const amount = Math.round(Number(editor.amount) * 100);
    if (!Number.isFinite(amount) || amount < 0)
      return toast.error("Enter a valid amount.");
    setBusy(true);
    try {
      await apiRequest("/admin/finance/transactions", {
        method: "POST",
        csrfToken,
        body: {
          ...editor,
          transactionDate: new Date(editor.transactionDate).toISOString(),
          amountMinor: amount,
          paymentMethod: editor.paymentMethod || null,
          externalReference: editor.externalReference || null,
          relatedEntityId: editor.relatedEntityId || null,
          receiptObjectKey: editor.receiptObjectKey || null,
          notes: editor.notes || null,
        },
      });
      toast.success("Financial transaction recorded.");
      setEditor(null);
      await loadLedger();
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "Unable to record transaction.",
      );
    } finally {
      setBusy(false);
    }
  };
  const decideTransaction = async () => {
    if (!transactionDecision || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(
        `/admin/finance/transactions/${transactionDecision.item.id}/status`,
        {
          method: "PATCH",
          csrfToken,
          body: {
            status: transactionDecision.status,
            reason: transactionDecision.reason,
          },
        },
      );
      toast.success("Transaction status updated.");
      setTransactionDecision(null);
      await loadLedger();
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "Finance decision failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const decidePayment = async () => {
    if (!paymentDecision || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(
        `/admin/membership/payments/${paymentDecision.payment.paymentId}/${paymentDecision.action}`,
        {
          method: "POST",
          csrfToken,
          idempotencyKey: crypto.randomUUID(),
          body: { reason: paymentDecision.reason },
        },
      );
      toast.success(
        paymentDecision.action === "verify"
          ? "Payment verified."
          : "Payment rejected.",
      );
      setPaymentDecision(null);
      await loadPayments();
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "Payment decision failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const exportCsv = () => {
    const rows = [
      [
        "Transaction ID",
        "Date",
        "Direction",
        "Type",
        "Category",
        "Amount",
        "Currency",
        "Method",
        "Reference",
        "Module",
        "Related ID",
        "Status",
        "Description",
      ],
      ...transactions.map((item) => [
        item.transactionCode,
        item.transactionDate,
        item.direction,
        item.transactionType,
        item.category,
        item.amountMinor / 100,
        item.currency,
        item.paymentMethod,
        item.externalReference,
        item.relatedModule,
        item.relatedEntityId,
        item.status,
        item.description,
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map(csv).join(",")).join("\r\n")],
      { type: "text/csv" },
    );
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `ruet-iot-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Finance"
        description="Track income and expenses, verify payments, link transactions to club programs, and retain a complete audit trail."
        actions={
          <div className="flex gap-2">
            {tab === "ledger" && transactions.length > 0 && (
              <button onClick={exportCsv} className={adminSecondaryButton}>
                <Download size={16} />
                Export CSV
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setEditor(blankTransaction())}
                className={adminButton}
              >
                <Plus size={16} />
                New transaction
              </button>
            )}
          </div>
        }
      />
      <AdminCard className="p-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setTab("ledger");
              setStatus("");
            }}
            className={tab === "ledger" ? adminButton : adminSecondaryButton}
          >
            <WalletCards size={16} />
            Transaction ledger
          </button>
          <button
            onClick={() => {
              setTab("membership");
              setStatus("SUBMITTED");
            }}
            className={
              tab === "membership" ? adminButton : adminSecondaryButton
            }
          >
            <CreditCard size={16} />
            Membership payments
          </button>
        </div>
      </AdminCard>
      {tab === "ledger" && summary && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {(
            [
              ["Total income", summary.totalIncome, "text-emerald-300"],
              ["Total expenses", summary.totalExpenses, "text-red-300"],
              ["Net balance", summary.netBalance, "text-cyan-300"],
              ["Pending", summary.pendingVerification, "text-amber-300"],
              ["This month", summary.thisMonth, "text-violet-300"],
              ["This year", summary.thisYear, "text-blue-300"],
            ] as const
          ).map(([label, value, color]) => (
            <AdminCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`mt-2 text-xl font-semibold tabular-nums ${color}`}>
                {label === "Pending" ? value : money(value)}
              </p>
            </AdminCard>
          ))}
        </div>
      )}
      <AdminCard className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative xl:col-span-2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              aria-label="Search finance"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Transaction ID, reference, description…"
              className={`${adminInput} pl-9`}
            />
          </label>
          <select
            aria-label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={adminInput}
          >
            <option value="">All statuses</option>
            {["PENDING", "SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED"].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
          {tab === "ledger" && (
            <>
              <select
                aria-label="Direction"
                value={direction}
                onChange={(event) => setDirection(event.target.value)}
                className={adminInput}
              >
                <option value="">Income and expense</option>
                <option>INCOME</option>
                <option>EXPENSE</option>
              </select>
              <select
                aria-label="Related module"
                value={module}
                onChange={(event) => setModule(event.target.value)}
                className={adminInput}
              >
                <option value="">All modules</option>
                {[
                  "EVENT",
                  "RESEARCH",
                  "COURSE",
                  "PROJECT",
                  "MEMBERSHIP",
                  "OPPORTUNITY",
                  "PARTNERSHIP",
                  "DONATION",
                  "OTHER",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </AdminCard>
      {loading ? (
        <LoadingState label="Loading finance records…" />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() =>
            void (tab === "ledger" ? loadLedger() : loadPayments())
          }
        />
      ) : tab === "ledger" ? (
        transactions.length === 0 ? (
          <EmptyState
            title="No transactions match these filters"
            description="Record the first income or expense, or adjust the filters."
          />
        ) : (
          <FinanceTable
            items={transactions}
            canVerify={canVerify}
            onDecision={setTransactionDecision}
          />
        )
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments in this queue"
          description="Submitted membership payment evidence will appear here."
        />
      ) : (
        <PaymentTable
          items={payments}
          canVerify={canVerify}
          onDecision={setPaymentDecision}
        />
      )}
      {editor && (
        <TransactionEditor
          value={editor}
          busy={busy}
          onChange={setEditor}
          onCancel={() => setEditor(null)}
          onSave={() => void create()}
        />
      )}
      <ConfirmDialog
        open={Boolean(transactionDecision)}
        title={
          transactionDecision?.status === "VERIFIED"
            ? "Verify transaction"
            : "Reject transaction"
        }
        description="This decision is permanent and retained in the financial audit trail."
        confirmLabel={
          transactionDecision?.status === "VERIFIED"
            ? "Verify transaction"
            : "Reject transaction"
        }
        dangerous={transactionDecision?.status === "REJECTED"}
        reasonLabel="Decision reason"
        reason={transactionDecision?.reason}
        onReasonChange={(reason) =>
          setTransactionDecision((current) =>
            current ? { ...current, reason } : null,
          )
        }
        busy={busy}
        onCancel={() => setTransactionDecision(null)}
        onConfirm={() => void decideTransaction()}
      />
      <ConfirmDialog
        open={Boolean(paymentDecision)}
        title={
          paymentDecision?.action === "verify"
            ? "Verify payment"
            : "Reject payment"
        }
        description="The membership workflow and applicant status will be updated by the server."
        confirmLabel={
          paymentDecision?.action === "verify"
            ? "Verify payment"
            : "Reject payment"
        }
        dangerous={paymentDecision?.action === "reject"}
        reasonLabel="Decision reason"
        reason={paymentDecision?.reason}
        onReasonChange={(reason) =>
          setPaymentDecision((current) =>
            current ? { ...current, reason } : null,
          )
        }
        busy={busy}
        onCancel={() => setPaymentDecision(null)}
        onConfirm={() => void decidePayment()}
      />
    </div>
  );
}

function FinanceTable({
  items,
  canVerify,
  onDecision,
}: {
  items: FinanceTransaction[];
  canVerify: boolean;
  onDecision: (value: {
    item: FinanceTransaction;
    status: "VERIFIED" | "REJECTED";
    reason: string;
  }) => void;
}) {
  return (
    <AdminCard>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--admin-border))] text-left text-xs uppercase text-muted-foreground">
              <th className="px-5 py-3">Transaction</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Relation</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const sourceManaged =
                item.id.startsWith("membership-payment:") ||
                item.id.startsWith("learning-payment:");
              return (
                <tr
                  key={item.id}
                  className="border-b border-[hsl(var(--admin-border))] last:border-0"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium">{item.transactionCode}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.transactionDate).toLocaleString()} ·{" "}
                      {item.externalReference || "No reference"}
                    </p>
                    <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {item.transactionType}
                    <p className="text-xs text-muted-foreground">
                      {item.category}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={item.relatedModule} />
                    <p className="mt-1 max-w-36 truncate text-xs text-muted-foreground">
                      {item.relatedEntityId || "—"}
                    </p>
                  </td>
                  <td
                    className={`px-4 py-4 font-semibold ${item.direction === "INCOME" ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {item.direction === "EXPENSE" ? "−" : "+"}
                    {money(item.amountMinor, item.currency)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {sourceManaged ? (
                        <span className="text-xs text-muted-foreground">
                          Use linked {item.relatedModule.toLowerCase()} workflow
                        </span>
                      ) : (
                        canVerify &&
                        ["PENDING", "SUBMITTED"].includes(item.status) && (
                          <>
                            <button
                              onClick={() =>
                                onDecision({
                                  item,
                                  status: "VERIFIED",
                                  reason: "",
                                })
                              }
                              className={adminButton}
                            >
                              <CheckCircle2 size={15} />
                              Verify
                            </button>
                            <button
                              onClick={() =>
                                onDecision({
                                  item,
                                  status: "REJECTED",
                                  reason: "",
                                })
                              }
                              className={adminSecondaryButton}
                            >
                              Reject
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
function PaymentTable({
  items,
  canVerify,
  onDecision,
}: {
  items: PaymentEvidence[];
  canVerify: boolean;
  onDecision: (value: {
    payment: PaymentEvidence;
    action: "verify" | "reject";
    reason: string;
  }) => void;
}) {
  return (
    <AdminCard>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--admin-border))] text-left text-xs uppercase text-muted-foreground">
              <th className="px-5 py-3">Applicant</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-5 py-3 text-right">Decision</th>
            </tr>
          </thead>
          <tbody>
            {items.map((payment) => (
              <tr
                key={payment.paymentId}
                className="border-b border-[hsl(var(--admin-border))] last:border-0"
              >
                <td className="px-5 py-4">
                  <p className="font-medium">{payment.applicantName}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.applicantEmail}
                  </p>
                </td>
                <td className="px-4 py-4">
                  {payment.transactionReference}
                  <p className="text-xs text-muted-foreground">
                    {payment.paymentMethod} · {payment.payerPhone}
                  </p>
                </td>
                <td className="px-4 py-4 font-semibold">
                  {money(payment.expectedAmountMinor, payment.currency)}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={payment.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {canVerify && payment.status === "SUBMITTED" && (
                      <>
                        <button
                          onClick={() =>
                            onDecision({
                              payment,
                              action: "verify",
                              reason: "",
                            })
                          }
                          className={adminButton}
                        >
                          Verify
                        </button>
                        <button
                          onClick={() =>
                            onDecision({
                              payment,
                              action: "reject",
                              reason: "",
                            })
                          }
                          className={adminSecondaryButton}
                        >
                          Reject
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
  );
}
function TransactionEditor({
  value,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  value: ReturnType<typeof blankTransaction>;
  busy: boolean;
  onChange: (value: ReturnType<typeof blankTransaction>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const patch = (key: string, next: string) =>
    onChange({ ...value, [key]: next });
  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/75">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-6"
      >
        <div className="flex justify-between">
          <h2 className="text-xl font-semibold">New financial transaction</h2>
          <button
            type="button"
            onClick={onCancel}
            className={adminSecondaryButton}
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["transactionDate", "Date and time", "datetime-local"],
              ["transactionType", "Transaction type", "text"],
              ["category", "Category", "text"],
              ["amount", "Amount", "number"],
              ["currency", "Currency", "text"],
              ["paymentMethod", "Payment method", "text"],
              ["externalReference", "External reference", "text"],
              ["relatedEntityId", "Related entity ID", "text"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="text-sm font-medium">
              {label}
              <input
                required={[
                  "transactionDate",
                  "transactionType",
                  "category",
                  "amount",
                  "currency",
                ].includes(key)}
                type={type}
                step={type === "number" ? "0.01" : undefined}
                min={type === "number" ? "0" : undefined}
                value={value[key]}
                onChange={(event) => patch(key, event.target.value)}
                className={`${adminInput} mt-2`}
              />
            </label>
          ))}
          <label className="text-sm font-medium">
            Direction
            <select
              value={value.direction}
              onChange={(event) => patch("direction", event.target.value)}
              className={`${adminInput} mt-2`}
            >
              <option>INCOME</option>
              <option>EXPENSE</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Related module
            <select
              value={value.relatedModule}
              onChange={(event) => patch("relatedModule", event.target.value)}
              className={`${adminInput} mt-2`}
            >
              {[
                "EVENT",
                "RESEARCH",
                "COURSE",
                "PROJECT",
                "MEMBERSHIP",
                "OPPORTUNITY",
                "PARTNERSHIP",
                "DONATION",
                "OTHER",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Description
            <textarea
              required
              minLength={3}
              rows={4}
              value={value.description}
              onChange={(event) => patch("description", event.target.value)}
              className={`${adminInput} mt-2`}
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Notes
            <textarea
              rows={3}
              value={value.notes}
              onChange={(event) => patch("notes", event.target.value)}
              className={`${adminInput} mt-2`}
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={adminSecondaryButton}
          >
            Cancel
          </button>
          <button disabled={busy} className={adminButton}>
            {busy ? "Recording…" : "Record transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface NotificationInbox {
  items: UserNotification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}
export function NotificationCenter({ csrfToken }: { csrfToken?: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<NotificationInbox>({
    items: [],
    total: 0,
    unreadCount: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (query) params.set("q", query);
      if (type) params.set("type", type);
      if (unread) params.set("unread", "true");
      setData(
        await apiRequest<NotificationInbox>(`/notifications/inbox?${params}`),
      );
    } catch (next) {
      setError(
        next instanceof Error ? next.message : "Notifications are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, query, type, unread]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);
  const types = useMemo(
    () => Array.from(new Set(data.items.map((item) => item.type))).sort(),
    [data.items],
  );
  const markRead = async (item: UserNotification) => {
    if (!csrfToken) return;
    try {
      if (!item.readAt)
        await apiRequest(`/notifications/${item.id}/read`, {
          method: "POST",
          csrfToken,
        });
      if (item.actionUrl) navigate(item.actionUrl);
      else await load();
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "Unable to update notification.",
      );
    }
  };
  const markAll = async () => {
    if (!csrfToken) return;
    try {
      await apiRequest("/notifications/mark-all-read", {
        method: "POST",
        csrfToken,
      });
      toast.success("All notifications marked as read.");
      await load();
    } catch (next) {
      toast.error(
        next instanceof Error
          ? next.message
          : "Unable to mark all notifications read.",
      );
    }
  };
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications"
        description="Search and act on application, payment, membership, security, and content workflow updates."
        actions={
          data.unreadCount > 0 ? (
            <button
              onClick={() => void markAll()}
              className={adminSecondaryButton}
            >
              Mark all read ({data.unreadCount})
            </button>
          ) : undefined
        }
      />
      <AdminCard className="grid gap-3 p-4 md:grid-cols-[1fr_14rem_auto]">
        <label className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            aria-label="Search notifications"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search notifications…"
            className={`${adminInput} pl-9`}
          />
        </label>
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className={adminInput}
          aria-label="Notification type"
        >
          <option value="">All types</option>
          {types.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-[hsl(var(--admin-border))] px-4 text-sm">
          <input
            type="checkbox"
            checked={unread}
            onChange={(event) => setUnread(event.target.checked)}
          />
          Unread only
        </label>
      </AdminCard>
      {loading ? (
        <LoadingState label="Loading notifications…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="You’re all caught up"
          description="No notifications match the current filters."
        />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => void markRead(item)}
                className={`flex w-full gap-4 rounded-xl border p-4 text-left ${item.readAt ? "border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]" : "border-cyan-400/30 bg-cyan-400/[0.06]"}`}
              >
                <span
                  className={`rounded-lg p-2 ${item.readAt ? "bg-white/5 text-muted-foreground" : "bg-cyan-400/10 text-cyan-300"}`}
                >
                  <Bell size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    <time className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {item.message}
                  </span>
                  <span className="mt-2 flex gap-2 text-xs">
                    <StatusBadge status={item.type} />
                    {!item.readAt && (
                      <span className="text-cyan-300">Unread</span>
                    )}
                    {item.actionUrl && (
                      <span className="text-primary">
                        Open related record →
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {pages} · {data.total} total
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className={adminSecondaryButton}
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className={adminSecondaryButton}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function EmailOperations({
  canRetry,
  csrfToken,
}: {
  canRetry: boolean;
  csrfToken?: string;
}) {
  const [items, setItems] = useState<EmailLog[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(
        await apiRequest<EmailLog[]>(
          `/admin/email-outbox${status ? `?status=${status}` : ""}`,
        ),
      );
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : "Email delivery logs are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    void load();
  }, [load]);
  const retry = async (id: string) => {
    if (!csrfToken) return;
    setBusy(id);
    try {
      await apiRequest(`/admin/email-outbox/${id}/retry`, {
        method: "POST",
        csrfToken,
      });
      toast.success("Email retry queued.");
      await load();
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "Unable to retry email.",
      );
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Email Delivery"
        description="Operational visibility for Cloudflare-native transactional email delivery."
      />
      <AdminCard className="p-4">
        <select
          aria-label="Email status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={`${adminInput} w-48`}
        >
          <option value="">All statuses</option>
          <option>PENDING</option>
          <option>SENDING</option>
          <option>SENT</option>
          <option>FAILED</option>
        </select>
      </AdminCard>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No email deliveries found"
          description="Delivery events will appear as transactional messages are queued."
        />
      ) : (
        <AdminCard>
          <div className="divide-y divide-[hsl(var(--admin-border))]">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 p-5"
              >
                <Mail size={18} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.recipientEmail}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.template} · {item.attempts} attempts ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {item.lastError && (
                    <p className="text-xs text-red-300">{item.lastError}</p>
                  )}
                </div>
                <StatusBadge status={item.status} />
                {canRetry && item.status === "FAILED" && (
                  <button
                    disabled={busy === item.id}
                    onClick={() => void retry(item.id)}
                    className={adminSecondaryButton}
                  >
                    <RefreshCw size={15} />
                    Retry
                  </button>
                )}
              </div>
            ))}
          </div>
        </AdminCard>
      )}
    </div>
  );
}
