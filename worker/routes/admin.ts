import { Hono, type Context } from "hono";
import { clientIp, enforceRateLimit } from "../auth/rate-limit";
import {
  csrfMiddleware,
  requireAuth,
  sessionMiddleware,
} from "../auth/session";
import { normalizeEmail, parseJson } from "../auth/validation";
import { hashPassword, timingSafeEqualStrings } from "../auth/crypto";
import { createAuditStatement } from "../db/audit";
import {
  executeIdempotentCommand,
  getIdempotentReplay,
  requireIdempotencyKey,
  type IdempotentCommandResult,
} from "../db/idempotency";
import { AppError } from "../lib/app-error";
import { success } from "../lib/api-envelope";
import { requirePermission } from "../middleware/authorization";
import { userHasPermission } from "../repositories/authorization-repository";
import type { AppEnvironment } from "../types";
import {
  archiveRoleSchema,
  archiveUserSchema,
  bootstrapAdminSchema,
  createRoleSchema,
  grantRoleSchema,
  provisionFixedSuperAdminsSchema,
  revokeRoleSchema,
  updateRolePermissionsSchema,
  updateUserStatusSchema,
} from "../validators/admin";

interface RolePermissionRow {
  id: string;
  role_key: string;
  name: string;
  description: string;
  is_system: number;
  deleted_at: string | null;
  permission_key: string | null;
}

interface PermissionRow {
  id: string;
  permission_key: string;
  category: string;
  description: string;
}

interface UserRow {
  id: string;
  primary_email: string;
  display_name: string;
  status: string;
  created_at: string;
  deleted_at: string | null;
}

interface RoleRow {
  id: string;
  role_key: string;
  is_system: number;
  deleted_at: string | null;
}

function idempotentJson(
  context: Context<AppEnvironment>,
  result: IdempotentCommandResult,
): Response {
  context.header("Idempotency-Replayed", result.replayed ? "true" : "false");
  if (result.status === 201)
    return context.json(success(result.data, context.get("requestId")), 201);
  if (result.status === 202)
    return context.json(success(result.data, context.get("requestId")), 202);
  return context.json(success(result.data, context.get("requestId")), 200);
}

function mapAuthorizationDatabaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (/last active super administrator/iu.test(message)) {
    throw new AppError({
      code: "LAST_SUPER_ADMIN_REQUIRED",
      message: "At least one active verified super administrator must remain.",
      status: 409,
    });
  }
  if (/bootstrap has already completed/iu.test(message)) {
    throw new AppError({
      code: "BOOTSTRAP_ALREADY_COMPLETED",
      message: "Authorization bootstrap is already complete.",
      status: 409,
    });
  }
  if (/UNIQUE constraint failed: user_roles/iu.test(message)) {
    throw new AppError({
      code: "ROLE_ALREADY_ASSIGNED",
      message: "That user already has an active assignment for this role.",
      status: 409,
    });
  }
  if (
    /system roles are immutable|super administrator permissions cannot be removed/iu.test(
      message,
    )
  ) {
    throw new AppError({
      code: "SYSTEM_ROLE_IMMUTABLE",
      message: "System roles cannot be changed or archived.",
      status: 409,
    });
  }
  if (/super administrator authority cannot be delegated/iu.test(message)) {
    throw new AppError({
      code: "SUPER_ADMIN_PERMISSION_NON_DELEGABLE",
      message:
        "Super administrator authority can only belong to the system SUPER_ADMIN role.",
      status: 422,
    });
  }
  throw error;
}

async function permissionRows(
  db: D1Database,
  keys: string[],
): Promise<PermissionRow[]> {
  const placeholders = keys.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `SELECT id, permission_key, category, description FROM permissions
       WHERE permission_key IN (${placeholders}) ORDER BY permission_key`,
    )
    .bind(...keys)
    .all<PermissionRow>();
  if (results.length !== keys.length) {
    throw new AppError({
      code: "UNKNOWN_PERMISSION",
      message: "One or more permission keys do not exist.",
      status: 422,
    });
  }
  return results;
}

async function activeRole(db: D1Database, roleKey: string): Promise<RoleRow> {
  const role = await db
    .prepare(
      "SELECT id, role_key, is_system, deleted_at FROM roles WHERE role_key = ? AND deleted_at IS NULL",
    )
    .bind(roleKey)
    .first<RoleRow>();
  if (!role)
    throw new AppError({
      code: "ROLE_NOT_FOUND",
      message: "The requested active role does not exist.",
      status: 404,
    });
  return role;
}

async function verifiedUserByEmail(
  db: D1Database,
  email: string,
): Promise<UserRow> {
  const user = await db
    .prepare(
      `SELECT id, primary_email, display_name, status, created_at, deleted_at
       FROM users WHERE primary_email_normalized = ? AND status = 'EMAIL_VERIFIED' AND deleted_at IS NULL`,
    )
    .bind(normalizeEmail(email))
    .first<UserRow>();
  if (!user)
    throw new AppError({
      code: "USER_NOT_FOUND",
      message: "No active verified user matches that email.",
      status: 404,
    });
  return user;
}

async function requireSuperAdminAuthority(
  db: D1Database,
  actorId: string,
): Promise<void> {
  if (!(await userHasPermission(db, actorId, "rbac.super_admin.manage"))) {
    throw new AppError({
      code: "SUPER_ADMIN_PERMISSION_REQUIRED",
      message:
        "Managing super administrator authority requires an additional permission.",
      status: 403,
    });
  }
}

export const adminRoutes = new Hono<AppEnvironment>();

adminRoutes.use("/admin/*", sessionMiddleware({ required: true }));

adminRoutes.get(
  "/admin/overview",
  requirePermission("admin.access"),
  async (context) => {
    const { user } = requireAuth(context);
    const has = (...permissions: string[]) =>
      permissions.some((permission) => user.permissions.includes(permission));
    const count = async (sql: string, bindings: unknown[] = []) =>
      (await context.env.DB.prepare(sql)
        .bind(...bindings)
        .first<number>("count")) ?? 0;

    const metrics: Record<string, number> = {};
    const attention: Array<{
      key: string;
      label: string;
      count: number;
      section: string;
    }> = [];
    const analytics: Record<
      string,
      Array<{ month: string; status: string; count: number }>
    > = {};

    if (has("membership.read")) {
      const [totalMembers, pendingMemberships, paymentPending] =
        await Promise.all([
          count(
            "SELECT COUNT(*) AS count FROM memberships WHERE status != 'CLOSED'",
          ),
          count(
            "SELECT COUNT(*) AS count FROM membership_applications WHERE status IN ('SUBMITTED','UNDER_REVIEW','PAYMENT_PENDING','PAYMENT_VERIFICATION')",
          ),
          count(
            "SELECT COUNT(*) AS count FROM membership_applications WHERE status IN ('PAYMENT_PENDING','PAYMENT_VERIFICATION')",
          ),
        ]);
      Object.assign(metrics, {
        totalMembers,
        pendingMemberships,
        paymentPending,
      });
      attention.push({
        key: "membership",
        label: "Membership applications",
        count: pendingMemberships,
        section: "membership",
      });
      const rows = await context.env.DB.prepare(
        `SELECT strftime('%Y-%m', created_at) AS month, status, COUNT(*) AS count
       FROM membership_applications WHERE created_at >= date('now','-5 months','start of month')
       GROUP BY month, status ORDER BY month`,
      ).all<{ month: string; status: string; count: number }>();
      analytics.membership = rows.results;
    }
    if (has("volunteer.read")) {
      const pendingVolunteers = await count(
        "SELECT COUNT(*) AS count FROM volunteer_applications WHERE status IN ('SUBMITTED','UNDER_REVIEW')",
      );
      metrics.pendingVolunteers = pendingVolunteers;
      attention.push({
        key: "volunteers",
        label: "Volunteer applications",
        count: pendingVolunteers,
        section: "volunteers",
      });
    }
    if (has("project.read", "project.review", "submissions.read")) {
      const [pendingProjects, activeProjects] = await Promise.all([
        count(
          "SELECT COUNT(*) AS count FROM platform_submissions WHERE submission_type = 'PROJECT' AND status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','REVISION_REQUESTED')",
        ),
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key = 'projects' AND status = 'PUBLISHED'",
        ),
      ]);
      Object.assign(metrics, { pendingProjects, activeProjects });
      attention.push({
        key: "projects",
        label: "Project proposals",
        count: pendingProjects,
        section: "applications",
      });
    }
    if (has("research.read", "research.review", "submissions.read")) {
      const [pendingResearch, publishedResearch] = await Promise.all([
        count(
          "SELECT COUNT(*) AS count FROM platform_submissions WHERE submission_type = 'RESEARCH' AND status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','REVISION_REQUESTED')",
        ),
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key = 'research_papers' AND status = 'PUBLISHED'",
        ),
      ]);
      Object.assign(metrics, { pendingResearch, publishedResearch });
      attention.push({
        key: "research",
        label: "Research proposals",
        count: pendingResearch,
        section: "research",
      });
    }
    if (has("people.read", "submissions.read")) {
      const pendingAlumni = await count(
        "SELECT COUNT(*) AS count FROM platform_submissions WHERE submission_type = 'ALUMNI' AND status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION')",
      );
      metrics.pendingAlumni = pendingAlumni;
      attention.push({
        key: "alumni",
        label: "Alumni applications",
        count: pendingAlumni,
        section: "alumni",
      });
    }
    if (has("partner.read", "submissions.read")) {
      const pendingCollaborations = await count(
        "SELECT COUNT(*) AS count FROM platform_submissions WHERE submission_type = 'COLLABORATION' AND status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION')",
      );
      metrics.pendingCollaborations = pendingCollaborations;
      attention.push({
        key: "collaboration",
        label: "Collaboration requests",
        count: pendingCollaborations,
        section: "partners",
      });
    }
    if (has("event.read")) {
      metrics.upcomingEvents = await count(
        "SELECT COUNT(*) AS count FROM managed_events WHERE workflow_status='PUBLISHED' AND ends_at>=datetime('now')",
      );
    }
    if (has("course.read"))
      metrics.activeCourses = await count(
        "SELECT COUNT(*) AS count FROM learning_courses WHERE status='PUBLISHED'",
      );
    if (has("people.read"))
      metrics.publishedPeople = await count(
        "SELECT COUNT(*) AS count FROM people_profiles WHERE workflow_status='PUBLISHED' AND public_profile=1",
      );
    if (has("partner.read"))
      metrics.activePartners = await count(
        "SELECT COUNT(*) AS count FROM partner_profiles WHERE workflow_status='PUBLISHED' AND active=1",
      );
    if (has("opportunity.read")) {
      const [activeOpportunities, pendingOpportunities] = await Promise.all([
        count(
          "SELECT COUNT(*) AS count FROM opportunities WHERE workflow_status='PUBLISHED' AND (application_deadline IS NULL OR application_deadline>=datetime('now'))",
        ),
        count(
          "SELECT COUNT(*) AS count FROM opportunity_applications WHERE status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION')",
        ),
      ]);
      Object.assign(metrics, { activeOpportunities, pendingOpportunities });
      attention.push({
        key: "opportunities",
        label: "Opportunity applications",
        count: pendingOpportunities,
        section: "applications",
      });
    }
    if (has("content.read")) {
      const [totalBlogs, publishedBlogs, draftBlogs] = await Promise.all([
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key='blog_posts' AND status!='ARCHIVED'",
        ),
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key='blog_posts' AND status='PUBLISHED'",
        ),
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key='blog_posts' AND status='DRAFT'",
        ),
      ]);
      Object.assign(metrics, { totalBlogs, publishedBlogs, draftBlogs });
    }
    metrics.unreadNotifications = await count(
      "SELECT COUNT(*) AS count FROM user_notifications WHERE user_id=? AND read_at IS NULL",
      [user.id],
    );
    if (has("finance.read")) {
      const finance = await context.env.DB.prepare(
        `SELECT
      COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='INCOME' AND transaction_date>=datetime('now','start of month') THEN amount_minor END),0) AS monthlyIncome,
      COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='EXPENSE' AND transaction_date>=datetime('now','start of month') THEN amount_minor END),0) AS monthlyExpenses,
      COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='INCOME' THEN amount_minor WHEN status='VERIFIED' AND direction='EXPENSE' THEN -amount_minor END),0) AS netBalance,
      COALESCE(SUM(CASE WHEN status IN ('PENDING','SUBMITTED') THEN 1 ELSE 0 END),0) AS pendingPayments
      FROM finance_transactions`,
      ).first<{
        monthlyIncome: number;
        monthlyExpenses: number;
        netBalance: number;
        pendingPayments: number;
      }>();
      Object.assign(
        metrics,
        finance ?? {
          monthlyIncome: 0,
          monthlyExpenses: 0,
          netBalance: 0,
          pendingPayments: 0,
        },
      );
      const pendingPayments = Number(finance?.pendingPayments ?? 0);
      attention.push({
        key: "payments",
        label: "Payment verifications",
        count: pendingPayments,
        section: "finance",
      });
    }

    let recentActivity: Array<Record<string, unknown>> = [];
    if (has("audit.read")) {
      const result = await context.env.DB.prepare(
        `SELECT a.id, a.action, a.entity_type AS entityType, a.entity_id AS entityId,
              a.reason, a.request_id AS requestId, a.created_at AS createdAt,
              COALESCE(u.display_name, u.primary_email, 'System') AS actorName
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT 12`,
      ).all<Record<string, unknown>>();
      recentActivity = result.results;
    }

    const system = has("settings.read", "rbac.read")
      ? {
          users: await count(
            "SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL",
          ),
          activeSessions: await count(
            "SELECT COUNT(*) AS count FROM sessions WHERE revoked_at IS NULL AND expires_at > ?",
            [new Date().toISOString()],
          ),
          failedEmails: await count(
            "SELECT COUNT(*) AS count FROM email_outbox WHERE status = 'FAILED'",
          ),
        }
      : null;

    return context.json(
      success(
        {
          metrics,
          attention: attention.filter((item) => item.count > 0),
          analytics,
          recentActivity,
          system,
        },
        context.get("requestId"),
      ),
    );
  },
);

adminRoutes.get("/admin/access/me", (context) => {
  const { user } = requireAuth(context);
  return context.json(
    success(
      { roles: user.roles, permissions: user.permissions },
      context.get("requestId"),
    ),
  );
});

adminRoutes.get(
  "/admin/rbac/permissions",
  requirePermission("rbac.read"),
  async (context) => {
    const { results } = await context.env.DB.prepare(
      "SELECT id, permission_key, category, description FROM permissions ORDER BY category, permission_key",
    ).all<PermissionRow>();
    return context.json(
      success(
        results.map((row) => ({
          id: row.id,
          key: row.permission_key,
          category: row.category,
          description: row.description,
        })),
        context.get("requestId"),
      ),
    );
  },
);

adminRoutes.get(
  "/admin/rbac/roles",
  requirePermission("rbac.read"),
  async (context) => {
    const { results } = await context.env.DB.prepare(
      `SELECT r.id, r.role_key, r.name, r.description, r.is_system, r.deleted_at, p.permission_key
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     ORDER BY r.deleted_at, r.role_key, p.permission_key`,
    ).all<RolePermissionRow>();
    const roles = new Map<
      string,
      {
        id: string;
        key: string;
        name: string;
        description: string;
        system: boolean;
        archivedAt: string | null;
        permissions: string[];
      }
    >();
    for (const row of results) {
      const role = roles.get(row.id) ?? {
        id: row.id,
        key: row.role_key,
        name: row.name,
        description: row.description,
        system: row.is_system === 1,
        archivedAt: row.deleted_at,
        permissions: [],
      };
      if (row.permission_key) role.permissions.push(row.permission_key);
      roles.set(row.id, role);
    }
    return context.json(success([...roles.values()], context.get("requestId")));
  },
);

adminRoutes.get(
  "/admin/rbac/assignments",
  requirePermission("rbac.read"),
  async (context) => {
    const query = normalizeEmail(context.req.query("email") ?? "");
    const pattern = query
      ? `%${query.replaceAll("%", "").replaceAll("_", "")}%`
      : "%";
    const { results } = await context.env.DB.prepare(
      `SELECT ur.id, ur.user_id, u.primary_email, u.display_name, r.role_key, r.name AS role_name,
            ur.grant_reason, ur.granted_at, ur.expires_at, ur.revoked_at, ur.revocation_reason,
            grantor.primary_email AS granted_by_email, revoker.primary_email AS revoked_by_email
     FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     JOIN roles r ON r.id = ur.role_id
     LEFT JOIN users grantor ON grantor.id = ur.granted_by
     LEFT JOIN users revoker ON revoker.id = ur.revoked_by
     WHERE u.primary_email_normalized LIKE ?
     ORDER BY ur.granted_at DESC LIMIT 100`,
    )
      .bind(pattern)
      .all();
    return context.json(success(results, context.get("requestId")));
  },
);

adminRoutes.get(
  "/admin/users",
  requirePermission("users.read"),
  async (context) => {
    const query = normalizeEmail(context.req.query("email") ?? "");
    const pattern = query
      ? `%${query.replaceAll("%", "").replaceAll("_", "")}%`
      : "%";
    const { results } = await context.env.DB.prepare(
      `SELECT id, primary_email, display_name, status, created_at, deleted_at
     FROM users WHERE primary_email_normalized LIKE ? ORDER BY created_at DESC LIMIT 50`,
    )
      .bind(pattern)
      .all<UserRow>();
    return context.json(
      success(
        results.map((row) => ({
          id: row.id,
          email: row.primary_email,
          displayName: row.display_name,
          status: row.status,
          createdAt: row.created_at,
          archivedAt: row.deleted_at,
        })),
        context.get("requestId"),
      ),
    );
  },
);

adminRoutes.get(
  "/admin/audit-logs",
  requirePermission("audit.read"),
  async (context) => {
    const limit = Math.min(
      Math.max(Number(context.req.query("limit") ?? 50) || 50, 1),
      100,
    );
    const before = context.req.query("before") ?? "9999-12-31T23:59:59.999Z";
    const action = context.req.query("action")?.trim() || null;
    const { results } = await context.env.DB.prepare(
      `SELECT id, actor_type, actor_id, action, entity_type, entity_id, reason, metadata_json, request_id, created_at
     FROM audit_logs
     WHERE created_at < ? AND (? IS NULL OR action = ?)
     ORDER BY created_at DESC LIMIT ?`,
    )
      .bind(before, action, action, limit)
      .all();
    return context.json(success(results, context.get("requestId")));
  },
);

adminRoutes.post(
  "/admin/rbac/roles",
  csrfMiddleware(),
  requirePermission("rbac.roles.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, createRoleSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.role.create",
      actorKey: user.id,
      idempotencyKey,
      requestData: input,
    });
    if (replay) return idempotentJson(context, replay);
    const permissions = await permissionRows(
      context.env.DB,
      input.permissionKeys,
    );
    const roleId = `role:${crypto.randomUUID()}`;
    const responseData = { roleId, roleKey: input.key, created: true };
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "rbac.role.create",
        actorKey: user.id,
        idempotencyKey,
        requestData: input,
        responseData,
        responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO roles (id, role_key, name, description, created_by) VALUES (?, ?, ?, ?, ?)`,
          ).bind(roleId, input.key, input.name, input.description, user.id),
          ...permissions.map((permission) =>
            context.env.DB.prepare(
              "INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)",
            ).bind(roleId, permission.id, user.id),
          ),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "ROLE_CREATED",
            entityType: "ROLE",
            entityId: roleId,
            reason: input.reason,
            metadata: {
              roleKey: input.key,
              permissionCount: permissions.length,
            },
          }),
        ],
      });
      return idempotentJson(context, result);
    } catch (error) {
      if (
        error instanceof Error &&
        /UNIQUE constraint failed: roles.role_key/iu.test(error.message)
      ) {
        throw new AppError({
          code: "ROLE_EXISTS",
          message: "A role with that key already exists.",
          status: 409,
        });
      }
      return mapAuthorizationDatabaseError(error);
    }
  },
);

adminRoutes.put(
  "/admin/rbac/roles/:roleKey/permissions",
  csrfMiddleware(),
  requirePermission("rbac.roles.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const roleKey = context.req.param("roleKey");
    const input = await parseJson(context, updateRolePermissionsSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { roleKey, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.role.permissions.replace",
      actorKey: user.id,
      idempotencyKey,
      requestData,
    });
    if (replay) return idempotentJson(context, replay);
    const role = await activeRole(context.env.DB, roleKey);
    if (role.is_system === 1) {
      throw new AppError({
        code: "SYSTEM_ROLE_IMMUTABLE",
        message: "System roles cannot be changed.",
        status: 409,
      });
    }
    const permissions = await permissionRows(
      context.env.DB,
      input.permissionKeys,
    );
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "rbac.role.permissions.replace",
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { roleId: role.id, roleKey: role.role_key, updated: true },
      responseStatus: 200,
      statements: [
        context.env.DB.prepare(
          "DELETE FROM role_permissions WHERE role_id = ?",
        ).bind(role.id),
        ...permissions.map((permission) =>
          context.env.DB.prepare(
            "INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)",
          ).bind(role.id, permission.id, user.id),
        ),
        context.env.DB.prepare(
          "UPDATE roles SET updated_at = ? WHERE id = ?",
        ).bind(new Date().toISOString(), role.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "ROLE_PERMISSIONS_REPLACED",
          entityType: "ROLE",
          entityId: role.id,
          reason: input.reason,
          metadata: {
            roleKey: role.role_key,
            permissionCount: permissions.length,
          },
        }),
      ],
    });
    return idempotentJson(context, result);
  },
);

adminRoutes.post(
  "/admin/rbac/roles/:roleKey/archive",
  csrfMiddleware(),
  requirePermission("rbac.roles.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const roleKey = context.req.param("roleKey");
    const input = await parseJson(context, archiveRoleSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { roleKey, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.role.archive",
      actorKey: user.id,
      idempotencyKey,
      requestData,
    });
    if (replay) return idempotentJson(context, replay);
    const role = await activeRole(context.env.DB, roleKey);
    if (role.is_system === 1) {
      throw new AppError({
        code: "SYSTEM_ROLE_IMMUTABLE",
        message: "System roles cannot be archived.",
        status: 409,
      });
    }
    const activeAssignments = await context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM user_roles
       WHERE role_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)`,
    )
      .bind(role.id, new Date().toISOString())
      .first<{ count: number }>();
    if ((activeAssignments?.count ?? 0) > 0) {
      throw new AppError({
        code: "ROLE_HAS_ACTIVE_ASSIGNMENTS",
        message: "Revoke active assignments before archiving this role.",
        status: 409,
      });
    }
    const now = new Date().toISOString();
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "rbac.role.archive",
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { roleId: role.id, roleKey: role.role_key, archived: true },
      responseStatus: 200,
      statements: [
        context.env.DB.prepare(
          "UPDATE roles SET deleted_at = ?, deleted_by = ?, deletion_reason = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        ).bind(now, user.id, input.reason, now, role.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "ROLE_ARCHIVED",
          entityType: "ROLE",
          entityId: role.id,
          reason: input.reason,
          metadata: { roleKey: role.role_key },
        }),
      ],
    });
    return idempotentJson(context, result);
  },
);

adminRoutes.post(
  "/admin/rbac/assignments",
  csrfMiddleware(),
  requirePermission("rbac.assignments.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, grantRoleSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.assignment.grant",
      actorKey: user.id,
      idempotencyKey,
      requestData: input,
    });
    if (replay) return idempotentJson(context, replay);
    const [target, role] = await Promise.all([
      verifiedUserByEmail(context.env.DB, input.userEmail),
      activeRole(context.env.DB, input.roleKey),
    ]);
    if (input.expiresAt && input.expiresAt <= new Date().toISOString()) {
      throw new AppError({
        code: "INVALID_EXPIRY",
        message: "Role assignment expiry must be in the future.",
        status: 422,
      });
    }
    if (role.role_key === "SUPER_ADMIN")
      await requireSuperAdminAuthority(context.env.DB, user.id);
    const assignmentId = crypto.randomUUID();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "rbac.assignment.grant",
        actorKey: user.id,
        idempotencyKey,
        requestData: input,
        responseData: {
          assignmentId,
          userId: target.id,
          roleKey: role.role_key,
          granted: true,
        },
        responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).bind(
            assignmentId,
            target.id,
            role.id,
            user.id,
            input.reason,
            input.expiresAt ?? null,
          ),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "ROLE_GRANTED",
            entityType: "USER_ROLE",
            entityId: assignmentId,
            reason: input.reason,
            metadata: {
              targetUserId: target.id,
              roleKey: role.role_key,
              expiresAt: input.expiresAt ?? null,
            },
          }),
        ],
      });
      return idempotentJson(context, result);
    } catch (error) {
      return mapAuthorizationDatabaseError(error);
    }
  },
);

adminRoutes.post(
  "/admin/rbac/assignments/:assignmentId/revoke",
  csrfMiddleware(),
  requirePermission("rbac.assignments.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const assignmentId = context.req.param("assignmentId");
    const input = await parseJson(context, revokeRoleSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { assignmentId, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.assignment.revoke",
      actorKey: user.id,
      idempotencyKey,
      requestData,
    });
    if (replay) return idempotentJson(context, replay);
    const assignment = await context.env.DB.prepare(
      `SELECT ur.id, ur.user_id, r.role_key
       FROM user_roles ur JOIN roles r ON r.id = ur.role_id
       WHERE ur.id = ? AND ur.revoked_at IS NULL`,
    )
      .bind(assignmentId)
      .first<{ id: string; user_id: string; role_key: string }>();
    if (!assignment)
      throw new AppError({
        code: "ASSIGNMENT_NOT_FOUND",
        message: "The active role assignment was not found.",
        status: 404,
      });
    if (assignment.role_key === "SUPER_ADMIN")
      await requireSuperAdminAuthority(context.env.DB, user.id);
    const now = new Date().toISOString();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "rbac.assignment.revoke",
        actorKey: user.id,
        idempotencyKey,
        requestData,
        responseData: {
          assignmentId: assignment.id,
          roleKey: assignment.role_key,
          revoked: true,
        },
        responseStatus: 200,
        statements: [
          context.env.DB.prepare(
            `UPDATE user_roles SET revoked_at = ?, revoked_by = ?, revocation_reason = ?
             WHERE id = ? AND revoked_at IS NULL`,
          ).bind(now, user.id, input.reason, assignment.id),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "ROLE_REVOKED",
            entityType: "USER_ROLE",
            entityId: assignment.id,
            reason: input.reason,
            metadata: {
              targetUserId: assignment.user_id,
              roleKey: assignment.role_key,
            },
          }),
        ],
      });
      return idempotentJson(context, result);
    } catch (error) {
      return mapAuthorizationDatabaseError(error);
    }
  },
);

adminRoutes.put(
  "/admin/users/:userId/status",
  csrfMiddleware(),
  requirePermission("users.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const userId = context.req.param("userId");
    const input = await parseJson(context, updateUserStatusSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { userId, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "users.status.update",
      actorKey: user.id,
      idempotencyKey,
      requestData,
    });
    if (replay) return idempotentJson(context, replay);
    const target = await context.env.DB.prepare(
      "SELECT id, primary_email, display_name, status, created_at, deleted_at FROM users WHERE id = ?",
    )
      .bind(userId)
      .first<UserRow>();
    if (!target || target.deleted_at)
      throw new AppError({
        code: "USER_NOT_FOUND",
        message: "The active user was not found.",
        status: 404,
      });
    const targetIsSuperAdmin = await userHasPermission(
      context.env.DB,
      target.id,
      "rbac.super_admin.manage",
    );
    if (targetIsSuperAdmin)
      await requireSuperAdminAuthority(context.env.DB, user.id);
    const now = new Date().toISOString();
    try {
      const statements = [
        context.env.DB.prepare(
          "UPDATE users SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        ).bind(input.status, now, target.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action:
            input.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_RESTORED",
          entityType: "USER",
          entityId: target.id,
          reason: input.reason,
        }),
      ];
      if (input.status === "SUSPENDED") {
        statements.splice(
          1,
          0,
          context.env.DB.prepare(
            "UPDATE sessions SET revoked_at = ?, revocation_reason = 'USER_SUSPENDED' WHERE user_id = ? AND revoked_at IS NULL",
          ).bind(now, target.id),
        );
      }
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "users.status.update",
        actorKey: user.id,
        idempotencyKey,
        requestData,
        responseData: {
          userId: target.id,
          status: input.status,
          updated: true,
        },
        responseStatus: 200,
        statements,
      });
      return idempotentJson(context, result);
    } catch (error) {
      return mapAuthorizationDatabaseError(error);
    }
  },
);

adminRoutes.post(
  "/admin/users/:userId/archive",
  csrfMiddleware(),
  requirePermission("users.archive"),
  async (context) => {
    const { user } = requireAuth(context);
    const userId = context.req.param("userId");
    const input = await parseJson(context, archiveUserSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { userId, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "users.archive",
      actorKey: user.id,
      idempotencyKey,
      requestData,
    });
    if (replay) return idempotentJson(context, replay);
    const target = await context.env.DB.prepare(
      "SELECT id, primary_email, display_name, status, created_at, deleted_at FROM users WHERE id = ?",
    )
      .bind(userId)
      .first<UserRow>();
    if (!target || target.deleted_at)
      throw new AppError({
        code: "USER_NOT_FOUND",
        message: "The active user was not found.",
        status: 404,
      });
    if (
      normalizeEmail(input.confirmationEmail) !==
      normalizeEmail(target.primary_email)
    ) {
      throw new AppError({
        code: "ARCHIVE_CONFIRMATION_MISMATCH",
        message: "The confirmation email does not match the account.",
        status: 422,
      });
    }
    if (
      await userHasPermission(
        context.env.DB,
        target.id,
        "rbac.super_admin.manage",
      )
    ) {
      await requireSuperAdminAuthority(context.env.DB, user.id);
    }
    const now = new Date().toISOString();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "users.archive",
        actorKey: user.id,
        idempotencyKey,
        requestData,
        responseData: { userId: target.id, archived: true },
        responseStatus: 202,
        statements: [
          context.env.DB.prepare(
            `UPDATE users SET status = 'DELETED', deleted_at = ?, deleted_by = ?, deletion_reason = ?, updated_at = ?
             WHERE id = ? AND deleted_at IS NULL`,
          ).bind(now, user.id, input.reason, now, target.id),
          context.env.DB.prepare(
            "UPDATE sessions SET revoked_at = ?, revocation_reason = 'USER_ARCHIVED' WHERE user_id = ? AND revoked_at IS NULL",
          ).bind(now, target.id),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "USER_ARCHIVED",
            entityType: "USER",
            entityId: target.id,
            reason: input.reason,
            metadata: { previousStatus: target.status },
          }),
        ],
      });
      return idempotentJson(context, result);
    } catch (error) {
      return mapAuthorizationDatabaseError(error);
    }
  },
);

adminRoutes.post("/internal/bootstrap-super-admin", async (context) => {
  await enforceRateLimit({
    db: context.env.DB,
    scope: "authorization-bootstrap",
    identifier: clientIp(context.req.raw),
    limit: 5,
    windowSeconds: 3600,
  });
  const suppliedSecret = context.req.header("X-Bootstrap-Token") ?? "";
  if (
    !(await timingSafeEqualStrings(
      suppliedSecret,
      context.env.BOOTSTRAP_ADMIN_SECRET,
    ))
  ) {
    throw new AppError({
      code: "BOOTSTRAP_AUTHENTICATION_FAILED",
      message: "Bootstrap authentication failed.",
      status: 403,
    });
  }
  const input = await parseJson(context, bootstrapAdminSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({
    db: context.env.DB,
    operation: "authorization.bootstrap",
    actorKey: "SYSTEM_BOOTSTRAP",
    idempotencyKey,
    requestData: input,
  });
  if (replay) return idempotentJson(context, replay);
  const target = await verifiedUserByEmail(context.env.DB, input.email);
  const assignmentId = crypto.randomUUID();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "authorization.bootstrap",
      actorKey: "SYSTEM_BOOTSTRAP",
      idempotencyKey,
      requestData: input,
      responseData: {
        assignmentId,
        userId: target.id,
        roleKey: "SUPER_ADMIN",
        bootstrapped: true,
      },
      responseStatus: 201,
      statements: [
        context.env.DB.prepare(
          `INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason)
           VALUES (?, ?, 'role:SUPER_ADMIN', NULL, ?)`,
        ).bind(assignmentId, target.id, input.reason),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorType: "SYSTEM",
          action: "AUTHORIZATION_BOOTSTRAPPED",
          entityType: "USER_ROLE",
          entityId: assignmentId,
          reason: input.reason,
          metadata: { targetUserId: target.id, roleKey: "SUPER_ADMIN" },
        }),
      ],
    });
    return idempotentJson(context, result);
  } catch (error) {
    return mapAuthorizationDatabaseError(error);
  }
});

adminRoutes.post("/internal/provision-fixed-super-admins", async (context) => {
  await enforceRateLimit({
    db: context.env.DB,
    scope: "fixed-super-admin-provisioning",
    identifier: clientIp(context.req.raw),
    limit: 3,
    windowSeconds: 3600,
  });
  const suppliedSecret = context.req.header("X-Bootstrap-Token") ?? "";
  if (
    !(await timingSafeEqualStrings(
      suppliedSecret,
      context.env.BOOTSTRAP_ADMIN_SECRET,
    ))
  ) {
    throw new AppError({
      code: "BOOTSTRAP_AUTHENTICATION_FAILED",
      message: "Bootstrap authentication failed.",
      status: 403,
    });
  }

  const input = await parseJson(context, provisionFixedSuperAdminsSchema);
  const existing = await context.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM users WHERE is_fixed_super_admin = 1",
  ).first<number>("count");
  if ((existing ?? 0) > 0) {
    throw new AppError({
      code: "FIXED_SUPER_ADMINS_ALREADY_PROVISIONED",
      message:
        "The fixed super administrator accounts are already provisioned.",
      status: 409,
    });
  }

  const now = new Date().toISOString();
  const accounts = await Promise.all(
    input.accounts.map(async (account) => ({
      ...account,
      id: crypto.randomUUID(),
      passwordHash: await hashPassword(account.password),
      assignmentId: crypto.randomUUID(),
    })),
  );
  const statements: D1PreparedStatement[] = [];
  for (const account of accounts) {
    statements.push(
      context.env.DB.prepare(
        `INSERT INTO users
          (id, primary_email, primary_email_normalized, display_name, status, onboarding_status,
           email_verified_at, is_fixed_super_admin)
         VALUES (?, ?, ?, ?, 'EMAIL_VERIFIED', 'COMPLETED', ?, 1)`,
      ).bind(
        account.id,
        account.email,
        normalizeEmail(account.email),
        account.displayName,
        now,
      ),
      context.env.DB.prepare(
        `INSERT INTO password_credentials (user_id, password_hash, must_change_password)
         VALUES (?, ?, 1)`,
      ).bind(account.id, account.passwordHash),
      context.env.DB.prepare(
        "INSERT INTO notification_preferences (user_id) VALUES (?)",
      ).bind(account.id),
      context.env.DB.prepare(
        "INSERT INTO user_profiles (user_id) VALUES (?)",
      ).bind(account.id),
      context.env.DB.prepare(
        `INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason)
         VALUES (?, ?, 'role:SUPER_ADMIN', NULL, ?)`,
      ).bind(account.assignmentId, account.id, input.reason),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorType: "SYSTEM",
        action: "FIXED_SUPER_ADMIN_PROVISIONED",
        entityType: "USER",
        entityId: account.id,
        reason: input.reason,
        metadata: {
          email: account.email,
          roleKey: "SUPER_ADMIN",
          passwordChangeRequired: true,
        },
      }),
    );
  }

  try {
    await context.env.DB.batch(statements);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/UNIQUE constraint failed/iu.test(message)) {
      throw new AppError({
        code: "FIXED_SUPER_ADMIN_CONFLICT",
        message: "One of the fixed administrator accounts already exists.",
        status: 409,
      });
    }
    throw error;
  }

  return context.json(
    success(
      {
        provisioned: accounts.map((account) => ({
          email: account.email,
          role: "SUPER_ADMIN",
          mustChangePassword: true,
        })),
      },
      context.get("requestId"),
    ),
    201,
  );
});
