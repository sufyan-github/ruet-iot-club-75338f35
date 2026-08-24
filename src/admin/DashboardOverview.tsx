import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  FolderKanban,
  GraduationCap,
  Handshake,
  MailWarning,
  Newspaper,
  ShieldCheck,
  Users,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "./AdminUI";
import type { AdminSection } from "./AdminShell";
import type { OverviewData } from "./types";

const metricDefinitions = [
  {
    key: "totalMembers",
    label: "Total Members",
    description: "Current non-closed memberships",
    icon: Users,
    section: "membership" as AdminSection,
  },
  {
    key: "pendingMemberships",
    label: "Pending Memberships",
    description: "Applications requiring action",
    icon: UserRoundCheck,
    section: "membership" as AdminSection,
  },
  {
    key: "pendingProjects",
    label: "Pending Projects",
    description: "Proposals in the review pipeline",
    icon: FolderKanban,
    section: "applications" as AdminSection,
  },
  {
    key: "pendingResearch",
    label: "Pending Research",
    description: "Research proposals awaiting decisions",
    icon: GraduationCap,
    section: "research" as AdminSection,
  },
  {
    key: "pendingVolunteers",
    label: "Pending Volunteers",
    description: "Community volunteer applications",
    icon: Users,
    section: "volunteers" as AdminSection,
  },
  {
    key: "activeProjects",
    label: "Published Projects",
    description: "Projects visible on the website",
    icon: FolderKanban,
    section: "projects" as AdminSection,
  },
  {
    key: "publishedResearch",
    label: "Published Research",
    description: "Research visible on the website",
    icon: GraduationCap,
    section: "content" as AdminSection,
  },
  {
    key: "upcomingEvents",
    label: "Upcoming Events",
    description: "Published future events",
    icon: CalendarDays,
    section: "events" as AdminSection,
  },
  {
    key: "activeCourses",
    label: "Active Courses",
    description: "Published learning programs",
    icon: BookOpen,
    section: "courses" as AdminSection,
  },
  {
    key: "publishedPeople",
    label: "Public People",
    description: "Published public profiles",
    icon: Users,
    section: "people" as AdminSection,
  },
  {
    key: "activePartners",
    label: "Active Partners",
    description: "Published active partnerships",
    icon: Handshake,
    section: "partners" as AdminSection,
  },
  {
    key: "activeOpportunities",
    label: "Opportunities",
    description: "Current published opportunities",
    icon: BriefcaseBusiness,
    section: "opportunities" as AdminSection,
  },
  {
    key: "totalBlogs",
    label: "Blog Posts",
    description: "Published and draft articles",
    icon: Newspaper,
    section: "blogs" as AdminSection,
  },
  {
    key: "unreadNotifications",
    label: "Unread Notifications",
    description: "Updates requiring your attention",
    icon: Bell,
    section: "notifications" as AdminSection,
  },
];

function humanAction(action: string) {
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function membershipChart(rows: OverviewData["analytics"][string] = []) {
  const result = new Map<string, Record<string, string | number>>();
  for (const row of rows) {
    const item = result.get(row.month) ?? { month: row.month };
    const normalized = ["APPROVED"].includes(row.status)
      ? "approved"
      : ["REJECTED", "CANCELLED"].includes(row.status)
        ? "rejected"
        : "pending";
    item[normalized] = Number(item[normalized] ?? 0) + row.count;
    result.set(row.month, item);
  }
  return [...result.values()];
}

export default function DashboardOverview({
  data,
  loading,
  error,
  onRetry,
  onNavigate,
}: {
  data: OverviewData | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onNavigate: (section: AdminSection) => void;
}) {
  if (loading)
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Dashboard"
          description="Loading the current organization overview."
        />
        <LoadingState label="Preparing your permission-aware dashboard…" />
      </div>
    );
  if (error || !data)
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Dashboard"
          description="Organization overview and work requiring attention."
        />
        <ErrorState
          message={error || "The dashboard response was unavailable."}
          onRetry={onRetry}
        />
      </div>
    );
  const chartData = membershipChart(data.analytics.membership);
  const visibleMetrics = metricDefinitions.filter(
    (metric) => metric.key in data.metrics,
  );
  const financialMetrics = [
    ["Monthly income", data.metrics.monthlyIncome],
    ["Monthly expenses", data.metrics.monthlyExpenses],
    ["Net balance", data.metrics.netBalance],
  ] as const;
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="See what needs attention, what changed recently, and the current state of RUET IoT Club operations."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleMetrics.map((metric) => (
          <button
            type="button"
            key={metric.key}
            onClick={() => onNavigate(metric.section)}
            className="group rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-[hsl(var(--admin-surface-elevated))]"
          >
            <div className="flex items-start justify-between">
              <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <metric.icon size={20} />
              </span>
              <span className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
                Open →
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold tabular-nums">
              {data.metrics[metric.key] ?? 0}
            </p>
            <h2 className="mt-1 font-body text-sm font-semibold">
              {metric.label}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {metric.description}
            </p>
          </button>
        ))}
      </div>
      {"monthlyIncome" in data.metrics && (
        <div className="grid gap-4 sm:grid-cols-3">
          {financialMetrics.map(([label, value]) => (
            <button
              type="button"
              key={label}
              onClick={() => onNavigate("finance")}
              className="rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] p-5 text-left"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {new Intl.NumberFormat("en-BD", {
                  style: "currency",
                  currency: "BDT",
                }).format((value ?? 0) / 100)}
              </p>
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <AdminCard className="p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-300" size={19} />
            <h2 className="font-body text-lg font-semibold">Needs attention</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Open queues assigned to areas you are permitted to manage.
          </p>
          <div className="mt-4 space-y-2">
            {data.attention.length === 0 ? (
              <EmptyState
                title="You're all caught up"
                description="There are no pending applications or verification queues in your permitted areas."
              />
            ) : (
              data.attention.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => onNavigate(item.section as AdminSection)}
                  className="flex w-full items-center justify-between rounded-lg border border-[hsl(var(--admin-border))] px-4 py-3 text-left transition hover:border-primary/30 hover:bg-white/[0.02]"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="rounded-full bg-amber-400/12 px-2.5 py-1 text-xs font-bold text-amber-200">
                    {item.count}
                  </span>
                </button>
              ))
            )}
          </div>
        </AdminCard>
        <AdminCard className="p-5">
          <h2 className="font-body text-lg font-semibold">
            Membership activity
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly application outcomes from D1.
          </p>
          {chartData.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No membership activity yet"
                description="Monthly application activity will appear when applications are submitted."
              />
            </div>
          ) : (
            <div className="mt-5 h-72" aria-label="Membership activity chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--admin-border))"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--admin-surface-elevated))",
                      border: "1px solid hsl(var(--admin-border))",
                      borderRadius: 10,
                    }}
                  />
                  <Bar
                    dataKey="approved"
                    name="Approved"
                    stackId="a"
                    fill="#34d399"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="pending"
                    name="Pending"
                    stackId="a"
                    fill="#22d3ee"
                  />
                  <Bar
                    dataKey="rejected"
                    name="Rejected"
                    stackId="a"
                    fill="#f87171"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminCard>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminCard className="p-5">
          <div className="flex items-center gap-2">
            <Activity className="text-primary" size={19} />
            <h2 className="font-body text-lg font-semibold">Recent activity</h2>
          </div>
          <div className="mt-4 divide-y divide-[hsl(var(--admin-border))]">
            {data.recentActivity.length === 0 ? (
              <EmptyState
                title="No activity available"
                description="Recent authorized actions will appear here when audit access is available."
              />
            ) : (
              data.recentActivity.map((event) => (
                <div key={event.id} className="flex gap-3 py-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Activity size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {humanAction(event.action)}
                      </p>
                      <StatusBadge status={event.entityType} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.actorName} ·{" "}
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                    {event.reason && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {event.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminCard>
        {data.system && (
          <AdminCard className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary" size={19} />
              <h2 className="font-body text-lg font-semibold">System health</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Visible only with system-level access.
            </p>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-white/[0.025] p-3">
                <span className="flex items-center gap-2 text-sm">
                  <Users size={16} />
                  User accounts
                </span>
                <strong>{data.system.users}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/[0.025] p-3">
                <span className="flex items-center gap-2 text-sm">
                  <ShieldCheck size={16} />
                  Active sessions
                </span>
                <strong>{data.system.activeSessions}</strong>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("settings")}
                className="flex w-full items-center justify-between rounded-lg bg-white/[0.025] p-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm">
                  <MailWarning size={16} />
                  Failed emails
                </span>
                <strong
                  className={
                    data.system.failedEmails
                      ? "text-red-300"
                      : "text-emerald-300"
                  }
                >
                  {data.system.failedEmails}
                </strong>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("finance")}
                className="flex w-full items-center justify-between rounded-lg bg-white/[0.025] p-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm">
                  <WalletCards size={16} />
                  Payment queue
                </span>
                <strong>{data.metrics.pendingPayments ?? 0}</strong>
              </button>
            </div>
          </AdminCard>
        )}
      </div>
    </div>
  );
}
