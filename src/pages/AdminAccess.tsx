import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, LockKeyhole } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import type { AdminSection } from "@/admin/AdminShell";
import {
  AdminCard,
  AdminPageHeader,
  LoadingState,
  adminButton,
} from "@/admin/AdminUI";
import type { OverviewData, UserNotification } from "@/admin/types";

const AdminShell = lazy(() => import("@/admin/AdminShell"));
const DashboardOverview = lazy(() => import("@/admin/DashboardOverview"));
const SubmissionCenter = lazy(() => import("@/admin/SubmissionCenter"));
const MembershipManagement = lazy(
  () => import("@/admin/MembershipManagement"),
);
const ProjectManagement = lazy(() => import("@/admin/ProjectManagement"));
const CertificateManagement = lazy(
  () => import("@/admin/CertificateManagement"),
);
const ResearchManagement = lazy(() => import("@/admin/ResearchManagement"));
const CourseManagement = lazy(() => import("@/admin/CourseManagement"));
const EventManagement = lazy(() => import("@/admin/EventManagement"));
const CommunityManagement = lazy(
  () => import("@/admin/CommunityManagement"),
);
const BlogManagement = lazy(() => import("@/admin/BlogManagement"));
const ContentManagement = lazy(() =>
  import("@/admin/ContentManagement").then((module) => ({
    default: module.ContentManagement,
  })),
);
const MediaLibrary = lazy(() =>
  import("@/admin/ContentManagement").then((module) => ({
    default: module.MediaLibrary,
  })),
);
const FinanceManagement = lazy(() =>
  import("@/admin/OperationsManagement").then((module) => ({
    default: module.FinanceManagement,
  })),
);
const NotificationCenter = lazy(() =>
  import("@/admin/OperationsManagement").then((module) => ({
    default: module.NotificationCenter,
  })),
);
const EmailOperations = lazy(() =>
  import("@/admin/OperationsManagement").then((module) => ({
    default: module.EmailOperations,
  })),
);
const AccessManagement = lazy(() =>
  import("@/admin/AccessManagement").then((module) => ({
    default: module.AccessManagement,
  })),
);
const AuditLogManagement = lazy(() =>
  import("@/admin/GovernanceManagement").then((module) => ({
    default: module.AuditLogManagement,
  })),
);
const SettingsManagement = lazy(() =>
  import("@/admin/GovernanceManagement").then((module) => ({
    default: module.SettingsManagement,
  })),
);

const sections: AdminSection[] = [
  "dashboard",
  "applications",
  "membership",
  "volunteers",
  "projects",
  "research",
  "events",
  "courses",
  "people",
  "alumni",
  "partners",
  "opportunities",
  "blogs",
  "certificates",
  "finance",
  "notifications",
  "media",
  "content",
  "users",
  "audit",
  "settings",
];
const contentSections: AdminSection[] = ["content"];

export default function AdminAccess() {
  const { user, loading: authLoading, isAdmin, csrfToken } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get("section") as AdminSection | null;
  const section =
    requested && sections.includes(requested) ? requested : "dashboard";
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [unread, setUnread] = useState(0);
  const permissions = useMemo(
    () => user?.permissions ?? [],
    [user?.permissions],
  );
  const can = useCallback(
    (key: string) => permissions.includes(key),
    [permissions],
  );
  const loadOverview = useCallback(async () => {
    if (!isAdmin || user?.mustChangePassword) return;
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const [nextOverview, notifications] = await Promise.all([
        apiRequest<OverviewData>("/admin/overview"),
        apiRequest<UserNotification[]>("/notifications").catch(() => []),
      ]);
      setOverview(nextOverview);
      setUnread(notifications.filter((item) => !item.readAt).length);
    } catch (next) {
      setOverviewError(
        next instanceof Error
          ? next.message
          : "The administration overview is unavailable.",
      );
    } finally {
      setOverviewLoading(false);
    }
  }, [isAdmin, user?.mustChangePassword]);
  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);
  const navigate = (next: AdminSection) =>
    setParams(next === "dashboard" ? {} : { section: next });
  const counts = useMemo(
    () => ({ ...(overview?.metrics ?? {}), allNotifications: unread }),
    [overview, unread],
  );

  if (authLoading)
    return (
      <main className="admin-app grid min-h-screen place-items-center bg-[hsl(var(--admin-background))] p-6">
        <LoadingState label="Verifying your administration session…" />
      </main>
    );
  if (!user) return <Navigate to="/auth?mode=signin&next=%2Fadmin" replace />;
  if (!isAdmin)
    return (
      <AccessMessage
        title="Administrator access required"
        message="Your account is signed in, but it has no active administration role. Ask a super administrator to assign an appropriate role."
      />
    );
  if (user.mustChangePassword)
    return (
      <AccessMessage
        title="Secure your account first"
        message="This administrator account is using an initial password. Set a private password before accessing organization data."
        action={
          <Link to="/account/security" className={adminButton}>
            <LockKeyhole size={17} />
            Change password
          </Link>
        }
      />
    );

  const shared = {
    permissions,
    csrfToken: csrfToken ?? undefined,
    onCountChange: loadOverview,
  };
  let page: React.ReactNode;
  if (section === "dashboard")
    page = (
      <DashboardOverview
        data={overview}
        loading={overviewLoading}
        error={overviewError}
        onRetry={() => void loadOverview()}
        onNavigate={navigate}
      />
    );
  else if (["applications", "alumni"].includes(section))
    page = <SubmissionCenter section={section} {...shared} />;
  else if (section === "research")
    page = can("research.read") ? (
      <ResearchManagement {...shared} />
    ) : (
      <PermissionMessage />
    );
  else if (section === "courses")
    page = can("course.read") ? (
      <CourseManagement
        permissions={permissions}
        csrfToken={csrfToken ?? undefined}
      />
    ) : (
      <PermissionMessage />
    );
  else if (section === "events")
    page = can("event.read") ? (
      <div className="space-y-12">
        <CommunityManagement
          kind="events"
          permissions={permissions}
          csrfToken={csrfToken ?? undefined}
        />
        <section
          aria-label="Event registration operations"
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold">
            Registration, payment, and attendance operations
          </h2>
          <EventManagement
            operationsOnly
            permissions={permissions}
            csrfToken={csrfToken ?? undefined}
          />
        </section>
      </div>
    ) : (
      <PermissionMessage />
    );
  else if (section === "projects")
    page = can("project.read") ? (
      <ProjectManagement
        canManage={can("project.manage")}
        csrfToken={csrfToken ?? undefined}
      />
    ) : (
      <PermissionMessage />
    );
  else if (section === "membership" || section === "volunteers")
    page = <MembershipManagement domain={section} {...shared} />;
  else if (section === "certificates")
    page = can("certificate.read") ? (
      <CertificateManagement
        permissions={permissions}
        csrfToken={csrfToken ?? undefined}
      />
    ) : (
      <PermissionMessage />
    );
  else if (section === "people")
    page = can("people.read") ? (
      <CommunityManagement
        kind="people"
        permissions={permissions}
        csrfToken={csrfToken ?? undefined}
      />
    ) : (
      <PermissionMessage />
    );
  else if (section === "partners")
    page = can("partner.read") ? (
      <div className="space-y-12">
        <SubmissionCenter section={section} {...shared} />
        <CommunityManagement
          kind="partners"
          permissions={permissions}
          csrfToken={csrfToken ?? undefined}
        />
      </div>
    ) : (
      <PermissionMessage />
    );
  else if (section === "opportunities")
    page = can("opportunity.read") ? (
      <CommunityManagement
        kind="opportunities"
        permissions={permissions}
        csrfToken={csrfToken ?? undefined}
      />
    ) : (
      <PermissionMessage />
    );
  else if (section === "blogs")
    page = can("content.read") ? (
      <BlogManagement
        canManage={can("content.manage")}
        canPublish={can("content.publish")}
        csrfToken={csrfToken ?? undefined}
        onCountChange={loadOverview}
      />
    ) : (
      <PermissionMessage />
    );
  else if (contentSections.includes(section))
    page = can("content.read") ? (
      <ContentManagement
        section={section}
        canManage={can("content.manage")}
        canPublish={can("content.publish")}
        csrfToken={csrfToken ?? undefined}
      />
    ) : (
      <PermissionMessage />
    );
  else if (section === "media")
    page = can("content.read") ? (
      <MediaLibrary
        canManage={can("content.manage")}
        csrfToken={csrfToken ?? undefined}
      />
    ) : (
      <PermissionMessage />
    );
  else if (section === "finance")
    page = can("finance.read") ? (
      <FinanceManagement
        canVerify={can("finance.verify")}
        canManage={can("finance.manage")}
        csrfToken={csrfToken ?? undefined}
      />
    ) : (
      <PermissionMessage />
    );
  else if (section === "notifications")
    page = <NotificationCenter csrfToken={csrfToken ?? undefined} />;
  else if (section === "users")
    page =
      can("users.read") || can("rbac.read") ? (
        <AccessManagement
          permissions={permissions}
          csrfToken={csrfToken ?? undefined}
        />
      ) : (
        <PermissionMessage />
      );
  else if (section === "audit")
    page = can("audit.read") ? <AuditLogManagement /> : <PermissionMessage />;
  else if (section === "settings")
    page = can("settings.read") ? (
      <div className="space-y-10">
        <SettingsManagement
          canManage={can("settings.manage")}
          csrfToken={csrfToken ?? undefined}
        />
        {can("audit.read") && (
          <EmailOperations
            canRetry={can("settings.manage")}
            csrfToken={csrfToken ?? undefined}
          />
        )}
      </div>
    ) : (
      <PermissionMessage />
    );
  else page = <PermissionMessage />;

  return (
    <Suspense
      fallback={
        <main className="admin-app grid min-h-screen place-items-center bg-[hsl(var(--admin-background))] p-6">
          <LoadingState label="Loading administration workspace…" />
        </main>
      }
    >
      <AdminShell section={section} onNavigate={navigate} counts={counts}>
        <Suspense fallback={<LoadingState label="Loading section…" />}>
          {page}
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}

function AccessMessage({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="admin-app grid min-h-screen place-items-center bg-[hsl(var(--admin-background))] p-6">
      <AdminCard className="w-full max-w-lg p-7 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
          <AlertTriangle size={22} />
        </span>
        <h1 className="mt-5 font-body text-2xl font-semibold">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {message}
        </p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
        <Link
          to="/"
          className="mt-5 inline-block text-sm text-cyan-300 hover:underline"
        >
          Return to website
        </Link>
      </AdminCard>
    </main>
  );
}
function PermissionMessage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Access restricted"
        description="This module is outside your current administrator role."
      />
      <AdminCard className="p-8">
        <p className="text-sm text-muted-foreground">
          The Worker denied this area because your session does not contain the
          required permission. Ask a super administrator if your
          responsibilities have changed.
        </p>
      </AdminCard>
    </div>
  );
}
