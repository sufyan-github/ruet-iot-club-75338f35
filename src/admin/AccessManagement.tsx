import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  KeyRound,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
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
import type { Assignment, Permission, Role, UserRecord } from "./types";

type Tab = "users" | "roles" | "assignments";
const label = (value: string) =>
  value
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AccessManagement({
  permissions: ownPermissions,
  csrfToken,
}: {
  permissions: string[];
  csrfToken?: string;
}) {
  const can = useCallback(
    (permission: string) => ownPermissions.includes(permission),
    [ownPermissions],
  );
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<Permission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [userAction, setUserAction] = useState<{
    user: UserRecord;
    action: "suspend" | "restore" | "archive";
    reason: string;
    confirmationEmail?: string;
  } | null>(null);
  const [roleEditor, setRoleEditor] = useState<{
    role?: Role;
    key: string;
    name: string;
    description: string;
    permissions: string[];
    reason: string;
  } | null>(null);
  const [grant, setGrant] = useState<{
    email: string;
    roleKey: string;
    expiresAt: string;
    reason: string;
  } | null>(null);
  const [revoke, setRevoke] = useState<{
    assignment: Assignment;
    reason: string;
  } | null>(null);
  const load = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError("");
    try {
      const jobs: Promise<unknown>[] = [];
      if (can("users.read"))
        jobs.push(
          apiRequest<UserRecord[]>(
            `/admin/users${searchQuery ? `?email=${encodeURIComponent(searchQuery)}` : ""}`,
          ).then(setUsers),
        );
      if (can("rbac.read")) {
        jobs.push(apiRequest<Role[]>("/admin/rbac/roles").then(setRoles));
        jobs.push(
          apiRequest<Permission[]>("/admin/rbac/permissions").then(
            setPermissionCatalog,
          ),
        );
        jobs.push(
          apiRequest<Assignment[]>(
            `/admin/rbac/assignments${searchQuery ? `?email=${encodeURIComponent(searchQuery)}` : ""}`,
          ).then(setAssignments),
        );
      }
      await Promise.all(jobs);
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : "Access management data is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [can]);
  useEffect(() => {
    void load("");
  }, [load]);
  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          !query ||
          `${user.displayName} ${user.email}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [users, query],
  );
  const activeAssignments = assignments.filter(
    (assignment) => !assignment.revoked_at,
  );
  const performUserAction = async () => {
    if (!userAction || !csrfToken) return;
    setBusy(true);
    try {
      const archive = userAction.action === "archive";
      await apiRequest(
        archive
          ? `/admin/users/${userAction.user.id}/archive`
          : `/admin/users/${userAction.user.id}/status`,
        {
          method: archive ? "POST" : "PUT",
          csrfToken,
          idempotencyKey: crypto.randomUUID(),
          body: archive
            ? {
                reason: userAction.reason,
                confirmationEmail: userAction.confirmationEmail,
              }
            : {
                reason: userAction.reason,
                status:
                  userAction.action === "suspend" ? "SUSPENDED" : "ACTIVE",
              },
        },
      );
      toast.success(
        archive
          ? "Account archived."
          : `Account ${userAction.action === "suspend" ? "suspended" : "restored"}.`,
      );
      setUserAction(null);
      await load(query);
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "Account update failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveRole = async () => {
    if (!roleEditor || !csrfToken) return;
    setBusy(true);
    try {
      if (roleEditor.role)
        await apiRequest(
          `/admin/rbac/roles/${roleEditor.role.key}/permissions`,
          {
            method: "PUT",
            csrfToken,
            idempotencyKey: crypto.randomUUID(),
            body: {
              permissionKeys: roleEditor.permissions,
              reason: roleEditor.reason,
            },
          },
        );
      else
        await apiRequest("/admin/rbac/roles", {
          method: "POST",
          csrfToken,
          idempotencyKey: crypto.randomUUID(),
          body: {
            key: roleEditor.key.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
            name: roleEditor.name,
            description: roleEditor.description,
            permissionKeys: roleEditor.permissions,
            reason: roleEditor.reason,
          },
        });
      toast.success(
        roleEditor.role ? "Role permissions updated." : "Custom role created.",
      );
      setRoleEditor(null);
      await load(query);
    } catch (next) {
      toast.error(next instanceof Error ? next.message : "Role update failed.");
    } finally {
      setBusy(false);
    }
  };
  const grantRole = async () => {
    if (!grant || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest("/admin/rbac/assignments", {
        method: "POST",
        csrfToken,
        idempotencyKey: crypto.randomUUID(),
        body: {
          userEmail: grant.email,
          roleKey: grant.roleKey,
          expiresAt: grant.expiresAt
            ? new Date(grant.expiresAt).toISOString()
            : null,
          reason: grant.reason,
        },
      });
      toast.success("Role assigned.");
      setGrant(null);
      await load(query);
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "Role assignment failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const revokeRole = async () => {
    if (!revoke || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(
        `/admin/rbac/assignments/${revoke.assignment.id}/revoke`,
        {
          method: "POST",
          csrfToken,
          idempotencyKey: crypto.randomUUID(),
          body: { reason: revoke.reason },
        },
      );
      toast.success("Role assignment revoked.");
      setRevoke(null);
      await load(query);
    } catch (next) {
      toast.error(
        next instanceof Error ? next.message : "Role revocation failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const tabs: Array<{
    id: Tab;
    name: string;
    icon: typeof Users;
    allowed: boolean;
  }> = [
    { id: "users", name: "Users", icon: Users, allowed: can("users.read") },
    {
      id: "roles",
      name: "Roles & permissions",
      icon: ShieldCheck,
      allowed: can("rbac.read"),
    },
    {
      id: "assignments",
      name: "Assignments",
      icon: UserCog,
      allowed: can("rbac.read"),
    },
  ];
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users & Access"
        description="Manage accounts, reusable roles, and permission assignments. Fixed super administrator safeguards remain enforced by the server."
        actions={
          tab === "roles" && can("rbac.roles.manage") ? (
            <button
              type="button"
              className={adminButton}
              onClick={() =>
                setRoleEditor({
                  key: "",
                  name: "",
                  description: "",
                  permissions: [],
                  reason: "",
                })
              }
            >
              <KeyRound size={16} />
              Create role
            </button>
          ) : tab === "assignments" && can("rbac.assignments.manage") ? (
            <button
              type="button"
              className={adminButton}
              onClick={() =>
                setGrant({
                  email: "",
                  roleKey: roles.find((role) => !role.archivedAt)?.key ?? "",
                  expiresAt: "",
                  reason: "",
                })
              }
            >
              <UserCog size={16} />
              Assign role
            </button>
          ) : undefined
        }
      />
      <AdminCard className="p-2">
        <div className="flex flex-wrap gap-1">
          {tabs
            .filter((item) => item.allowed)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${tab === item.id ? "bg-cyan-400/10 text-cyan-300" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
              >
                <item.icon size={16} />
                {item.name}
              </button>
            ))}
        </div>
      </AdminCard>
      <AdminCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-64 flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <span className="sr-only">Search accounts</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email…"
              className={`${adminInput} pl-9`}
            />
          </label>
          <button
            type="button"
            onClick={() => void load(query)}
            className={adminSecondaryButton}
          >
            Search
          </button>
        </div>
      </AdminCard>
      {loading ? (
        <LoadingState label="Loading access controls…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load(query)} />
      ) : tab === "users" ? (
        filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try a different account name or email."
          />
        ) : (
          <AdminCard>
            <div className="divide-y divide-[hsl(var(--admin-border))]">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center gap-4 p-5"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-cyan-400/10 font-semibold text-cyan-300">
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-56 flex-1">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email} · joined{" "}
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={user.status} />
                  {can("users.manage") && !user.archivedAt && (
                    <button
                      type="button"
                      onClick={() =>
                        setUserAction({
                          user,
                          action:
                            user.status === "SUSPENDED" ? "restore" : "suspend",
                          reason: "",
                        })
                      }
                      className={adminSecondaryButton}
                    >
                      {user.status === "SUSPENDED" ? "Restore" : "Suspend"}
                    </button>
                  )}
                  {can("users.archive") && !user.archivedAt && (
                    <button
                      aria-label={`Archive ${user.displayName}`}
                      type="button"
                      onClick={() =>
                        setUserAction({
                          user,
                          action: "archive",
                          reason: "",
                          confirmationEmail: "",
                        })
                      }
                      className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Archive size={17} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </AdminCard>
        )
      ) : tab === "roles" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {roles
            .filter((role) => !role.archivedAt)
            .map((role) => (
              <AdminCard key={role.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{role.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                  {role.system && <StatusBadge status="System role" />}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 8).map((permission) => (
                    <span
                      key={permission}
                      title={permission}
                      className="rounded-full border border-[hsl(var(--admin-border))] px-2 py-1 text-xs text-muted-foreground"
                    >
                      {label(permission)}
                    </span>
                  ))}
                  {role.permissions.length > 8 && (
                    <span className="px-2 py-1 text-xs text-muted-foreground">
                      +{role.permissions.length - 8} more
                    </span>
                  )}
                </div>
                {can("rbac.roles.manage") && !role.system && (
                  <button
                    type="button"
                    onClick={() =>
                      setRoleEditor({
                        role,
                        key: role.key,
                        name: role.name,
                        description: role.description,
                        permissions: role.permissions,
                        reason: "",
                      })
                    }
                    className={`${adminSecondaryButton} mt-4`}
                  >
                    Edit permissions
                  </button>
                )}
              </AdminCard>
            ))}
        </div>
      ) : (
        <AdminCard>
          {activeAssignments.length === 0 ? (
            <EmptyState
              title="No active assignments"
              description="Assign a role to a verified user to grant administrative access."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--admin-border))] text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Granted</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssignments.map((assignment) => (
                    <tr
                      key={assignment.id}
                      className="border-b border-[hsl(var(--admin-border))] last:border-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium">{assignment.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.primary_email}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={assignment.role_name} />
                      </td>
                      <td className="px-4 py-4">
                        {new Date(assignment.granted_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        {assignment.expires_at
                          ? new Date(assignment.expires_at).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {can("rbac.assignments.manage") && (
                          <button
                            type="button"
                            onClick={() =>
                              setRevoke({ assignment, reason: "" })
                            }
                            className={adminSecondaryButton}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      )}
      {roleEditor && (
        <EditorDialog
          title={
            roleEditor.role
              ? `Edit ${roleEditor.role.name}`
              : "Create custom role"
          }
          onClose={() => setRoleEditor(null)}
          onSubmit={() => void saveRole()}
          busy={busy}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Role key
              <input
                disabled={Boolean(roleEditor.role)}
                required
                value={roleEditor.key}
                onChange={(event) =>
                  setRoleEditor({ ...roleEditor, key: event.target.value })
                }
                className={`${adminInput} mt-2`}
              />
            </label>
            <label className="text-sm font-medium">
              Display name
              <input
                disabled={Boolean(roleEditor.role)}
                required
                value={roleEditor.name}
                onChange={(event) =>
                  setRoleEditor({ ...roleEditor, name: event.target.value })
                }
                className={`${adminInput} mt-2`}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Description
            <textarea
              disabled={Boolean(roleEditor.role)}
              required
              value={roleEditor.description}
              onChange={(event) =>
                setRoleEditor({
                  ...roleEditor,
                  description: event.target.value,
                })
              }
              className={`${adminInput} mt-2`}
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium">Permissions</legend>
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[hsl(var(--admin-border))] p-3">
              {permissionCatalog.map((permission) => (
                <label
                  key={permission.id}
                  className="flex gap-3 rounded-md p-2 hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={roleEditor.permissions.includes(permission.key)}
                    onChange={(event) =>
                      setRoleEditor({
                        ...roleEditor,
                        permissions: event.target.checked
                          ? [...roleEditor.permissions, permission.key]
                          : roleEditor.permissions.filter(
                              (value) => value !== permission.key,
                            ),
                      })
                    }
                  />
                  <span>
                    <span className="block text-sm">
                      {label(permission.key)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {permission.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium">
            Change reason
            <textarea
              required
              minLength={5}
              value={roleEditor.reason}
              onChange={(event) =>
                setRoleEditor({ ...roleEditor, reason: event.target.value })
              }
              className={`${adminInput} mt-2`}
            />
          </label>
        </EditorDialog>
      )}
      {grant && (
        <EditorDialog
          title="Assign administrator role"
          onClose={() => setGrant(null)}
          onSubmit={() => void grantRole()}
          busy={busy}
        >
          <label className="block text-sm font-medium">
            Verified user email
            <input
              type="email"
              required
              value={grant.email}
              onChange={(event) =>
                setGrant({ ...grant, email: event.target.value })
              }
              className={`${adminInput} mt-2`}
            />
          </label>
          <label className="block text-sm font-medium">
            Role
            <select
              required
              value={grant.roleKey}
              onChange={(event) =>
                setGrant({ ...grant, roleKey: event.target.value })
              }
              className={`${adminInput} mt-2`}
            >
              {roles
                .filter((role) => !role.archivedAt)
                .map((role) => (
                  <option key={role.id} value={role.key}>
                    {role.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Optional expiry
            <input
              type="datetime-local"
              value={grant.expiresAt}
              onChange={(event) =>
                setGrant({ ...grant, expiresAt: event.target.value })
              }
              className={`${adminInput} mt-2`}
            />
          </label>
          <label className="block text-sm font-medium">
            Grant reason
            <textarea
              required
              minLength={5}
              value={grant.reason}
              onChange={(event) =>
                setGrant({ ...grant, reason: event.target.value })
              }
              className={`${adminInput} mt-2`}
            />
          </label>
        </EditorDialog>
      )}
      <ConfirmDialog
        open={Boolean(userAction)}
        title={`${userAction ? label(userAction.action) : "Update"} account`}
        description={`${userAction ? label(userAction.action) : "Update"} ${userAction?.user.email ?? "this account"}. Security protections for super administrators are enforced by the server.`}
        confirmLabel={`${userAction ? label(userAction.action) : "Update"} account`}
        dangerous={userAction?.action !== "restore"}
        reasonLabel="Action reason"
        reason={userAction?.reason}
        onReasonChange={(reason) =>
          setUserAction((current) => (current ? { ...current, reason } : null))
        }
        confirmationLabel={
          userAction?.action === "archive"
            ? "Type the account email to confirm"
            : undefined
        }
        confirmation={userAction?.confirmationEmail}
        onConfirmationChange={(confirmationEmail) =>
          setUserAction((current) =>
            current ? { ...current, confirmationEmail } : null,
          )
        }
        busy={busy}
        onCancel={() => setUserAction(null)}
        onConfirm={() => void performUserAction()}
      />
      <ConfirmDialog
        open={Boolean(revoke)}
        title="Revoke role assignment"
        description={`Remove ${revoke?.assignment.role_name ?? "this role"} from ${revoke?.assignment.primary_email ?? "the user"}?`}
        confirmLabel="Revoke role"
        dangerous
        reasonLabel="Revocation reason"
        reason={revoke?.reason}
        onReasonChange={(reason) =>
          setRevoke((current) => (current ? { ...current, reason } : null))
        }
        busy={busy}
        onCancel={() => setRevoke(null)}
        onConfirm={() => void revokeRole()}
      />
    </div>
  );
}

function EditorDialog({
  title,
  children,
  onClose,
  onSubmit,
  busy,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/70 p-0 sm:place-items-center sm:p-4">
      <button
        className="absolute inset-0"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-5 shadow-2xl sm:rounded-2xl"
      >
        <h2 className="font-body text-lg font-semibold">{title}</h2>
        {children}
        <div className="flex justify-end gap-3 border-t border-[hsl(var(--admin-border))] pt-4">
          <button
            type="button"
            onClick={onClose}
            className={adminSecondaryButton}
          >
            Cancel
          </button>
          <button disabled={busy} className={adminButton}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
