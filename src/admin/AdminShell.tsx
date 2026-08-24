import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderKanban,
  GraduationCap,
  Handshake,
  Image,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export type AdminSection =
  | "dashboard"
  | "applications"
  | "membership"
  | "volunteers"
  | "projects"
  | "research"
  | "events"
  | "courses"
  | "people"
  | "alumni"
  | "partners"
  | "opportunities"
  | "blogs"
  | "certificates"
  | "finance"
  | "notifications"
  | "media"
  | "content"
  | "users"
  | "audit"
  | "settings";

interface NavigationItem {
  id: AdminSection;
  label: string;
  icon: typeof LayoutDashboard;
  permissions: string[];
  countKey?: string;
}
interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const groups: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        permissions: ["admin.access"],
      },
    ],
  },
  {
    label: "Workflows",
    items: [
      {
        id: "applications",
        label: "Application Center",
        icon: ClipboardList,
        permissions: [
          "membership.read",
          "volunteer.read",
          "project.read",
          "research.read",
          "submissions.read",
        ],
        countKey: "allAttention",
      },
      {
        id: "membership",
        label: "Membership",
        icon: Users,
        permissions: ["membership.read"],
        countKey: "pendingMemberships",
      },
      {
        id: "volunteers",
        label: "Volunteers",
        icon: Handshake,
        permissions: ["volunteer.read"],
        countKey: "pendingVolunteers",
      },
      {
        id: "research",
        label: "Research",
        icon: GraduationCap,
        permissions: ["research.read", "research.review", "submissions.read"],
        countKey: "pendingResearch",
      },
      {
        id: "alumni",
        label: "Alumni Applications",
        icon: Award,
        permissions: ["people.read", "submissions.read"],
        countKey: "pendingAlumni",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        id: "content",
        label: "Content Overview",
        icon: FileText,
        permissions: ["content.read"],
      },
      {
        id: "projects",
        label: "Projects",
        icon: FolderKanban,
        permissions: ["project.read"],
      },
      {
        id: "events",
        label: "Events",
        icon: CalendarDays,
        permissions: ["event.read", "content.read"],
      },
      {
        id: "courses",
        label: "Courses",
        icon: BookOpen,
        permissions: ["course.read", "content.read"],
      },
      {
        id: "people",
        label: "People",
        icon: Users,
        permissions: ["people.read", "content.read"],
      },
      {
        id: "partners",
        label: "Partners",
        icon: Handshake,
        permissions: ["partner.read", "content.read"],
        countKey: "pendingCollaborations",
      },
      {
        id: "opportunities",
        label: "Opportunities",
        icon: BriefcaseBusiness,
        permissions: ["opportunity.read", "content.read"],
      },
      {
        id: "blogs",
        label: "Blogs",
        icon: Newspaper,
        permissions: ["content.read"],
      },
      {
        id: "media",
        label: "Media Library",
        icon: Image,
        permissions: ["content.read"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        id: "certificates",
        label: "Certificates",
        icon: Award,
        permissions: ["certificate.read", "content.read"],
      },
      {
        id: "finance",
        label: "Finance",
        icon: WalletCards,
        permissions: ["finance.read"],
        countKey: "pendingPayments",
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        permissions: ["admin.access"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        id: "users",
        label: "Users & Access",
        icon: LockKeyhole,
        permissions: ["users.read", "rbac.read"],
      },
      {
        id: "audit",
        label: "Audit Logs",
        icon: Activity,
        permissions: ["audit.read"],
      },
      {
        id: "settings",
        label: "Settings",
        icon: Settings,
        permissions: ["settings.read"],
      },
    ],
  },
];

const hasAny = (permissions: string[], required: string[]) =>
  required.some((key) => permissions.includes(key));
const humanRole = (role: string) => role.replace(/_/g, " ");

export default function AdminShell({
  section,
  onNavigate,
  counts = {},
  children,
}: {
  section: AdminSection;
  onNavigate: (section: AdminSection) => void;
  counts?: Record<string, number>;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState("");
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            hasAny(user?.permissions ?? [], item.permissions),
          ),
        }))
        .filter((group) => group.items.length),
    [user?.permissions],
  );
  const active = groups
    .flatMap((group) => group.items)
    .find((item) => item.id === section);
  const searchResults = search.trim()
    ? visibleGroups
        .flatMap((group) => group.items)
        .filter((item) =>
          item.label.toLowerCase().includes(search.trim().toLowerCase()),
        )
        .slice(0, 6)
    : [];
  const role = user?.roles[0] ?? "ADMIN";

  const choose = (next: AdminSection) => {
    onNavigate(next);
    setMobileOpen(false);
    setSearch("");
  };
  const logout = async () => {
    await signOut();
    navigate("/");
  };
  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-[hsl(var(--admin-border))] px-4">
        <img
          src="/club-logo.png"
          alt="RUET IoT Club"
          className="size-9 rounded-full border border-primary/20 bg-card object-contain shadow-[0_0_20px_-8px_hsl(var(--primary)/0.65)]"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">RUET IoT Club</p>
            <p className="text-[11px] text-muted-foreground">
              Management Platform
            </p>
          </div>
        )}
        <button
          type="button"
          className="ml-auto hidden rounded-lg p-2 text-muted-foreground hover:bg-primary/[0.07] hover:text-foreground lg:block"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>
      <nav
        aria-label="Administration"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-5">
            {!collapsed && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const attentionKeys = [
                  "pendingMemberships",
                  "pendingVolunteers",
                  "pendingProjects",
                  "pendingResearch",
                  "pendingAlumni",
                  "pendingCollaborations",
                  "pendingPayments",
                ];
                const count =
                  item.countKey === "allAttention"
                    ? attentionKeys.reduce(
                        (sum, key) => sum + (counts[key] ?? 0),
                        0,
                      )
                    : item.countKey
                      ? counts[item.countKey]
                      : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => choose(item.id)}
                    title={collapsed ? item.label : undefined}
                    aria-current={section === item.id ? "page" : undefined}
                    className={`flex min-h-10 w-full items-center rounded-xl border px-2.5 text-sm transition ${section === item.id ? "border-primary/20 bg-primary/[0.1] text-primary shadow-[inset_3px_0_0_hsl(var(--primary)/0.65)]" : "border-transparent text-slate-300 hover:border-primary/[0.08] hover:bg-primary/[0.045] hover:text-white"} ${collapsed ? "justify-center" : "gap-3"}`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {Boolean(count) && (
                          <span className="min-w-5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-center text-[10px] font-bold text-amber-200">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-[hsl(var(--admin-border))] p-3">
        <Link
          to="/"
          title={collapsed ? "Back to Home" : undefined}
          className={`mb-2 flex min-h-10 w-full items-center rounded-xl border border-primary/[0.1] bg-primary/[0.035] px-2.5 text-sm text-slate-300 transition hover:border-primary/25 hover:bg-primary/[0.08] hover:text-white ${collapsed ? "justify-center" : "gap-3"}`}
        >
          <ExternalLink size={18} />
          {!collapsed && <span>Back to Home</span>}
        </Link>
        <button
          type="button"
          onClick={() => setAccountOpen((value) => !value)}
          className={`flex w-full items-center rounded-xl p-2 text-left hover:bg-primary/[0.05] ${collapsed ? "justify-center" : "gap-3"}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/15 text-sm font-semibold text-primary">
            {user?.displayName?.slice(0, 1).toUpperCase() ?? "A"}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.displayName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {humanRole(role)}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-app min-h-screen bg-[hsl(var(--admin-background))] text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[hsl(var(--admin-border))] bg-gradient-to-b from-[hsl(var(--admin-sidebar))] to-[hsl(var(--admin-background))] shadow-[18px_0_60px_-48px_hsl(var(--primary)/0.75)] transition-[width] lg:block ${collapsed ? "w-20" : "w-64"}`}
      >
        {sidebar}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[min(19rem,88vw)] border-r border-[hsl(var(--admin-border))] bg-gradient-to-b from-[hsl(var(--admin-sidebar))] to-[hsl(var(--admin-background))] shadow-2xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div
        className={`transition-[padding] ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-background))]/90 px-4 shadow-[0_16px_45px_-38px_hsl(var(--primary)/0.7)] backdrop-blur-2xl md:px-6">
          <button
            type="button"
            onClick={() => {
              setCollapsed(false);
              setMobileOpen(true);
            }}
            className="rounded-xl border border-[hsl(var(--admin-border))] p-2 text-muted-foreground hover:border-primary/25 hover:text-foreground lg:hidden"
            aria-label="Open administration menu"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">
              Administration /{" "}
              <span className="text-foreground">
                {active?.label ?? "Dashboard"}
              </span>
            </p>
          </div>
          <div className="relative hidden w-72 md:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              aria-label="Search administration sections"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search administration…"
              className="w-full rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/[0.12]"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-12 w-full rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-2 shadow-2xl">
                {searchResults.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => choose(item.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-primary/[0.06]"
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            to="/"
            className="hidden min-h-10 items-center gap-2 rounded-xl border border-primary/[0.1] px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/25 hover:text-foreground sm:flex"
          >
            <ExternalLink size={16} />
            View Website
          </Link>
          <button
            type="button"
            onClick={() => choose("notifications")}
            aria-label="Open notifications"
            className="relative rounded-xl p-2 text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground"
          >
            <Bell size={19} />
            {(counts.allNotifications ?? 0) > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" />
            )}
          </button>
          <a
            href="mailto:ruetiotclub@gmail.com"
            aria-label="Contact support"
            className="hidden rounded-xl p-2 text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground md:block"
          >
            <CircleHelp size={19} />
          </a>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((value) => !value)}
              className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-primary/[0.06]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/15 text-xs font-semibold text-primary">
                {user?.displayName?.slice(0, 1).toUpperCase() ?? "A"}
              </span>
              <div className="hidden text-left xl:block">
                <p className="max-w-32 truncate text-xs font-medium">
                  {user?.displayName}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {humanRole(role)}
                </p>
              </div>
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-12 w-64 rounded-2xl border border-primary/[0.14] bg-[hsl(var(--admin-surface-elevated))] p-2 shadow-2xl">
                <div className="border-b border-[hsl(var(--admin-border))] px-3 py-3">
                  <p className="truncate text-sm font-medium">
                    {user?.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                    {humanRole(role)}
                  </span>
                </div>
                <Link
                  to="/"
                  className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-primary/[0.06]"
                >
                  <ExternalLink size={16} />
                  View Website
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-primary/[0.06]"
                >
                  <Users size={16} />
                  Profile
                </Link>
                <Link
                  to="/account/security"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-primary/[0.06]"
                >
                  <ShieldCheck size={16} />
                  Security & sessions
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
