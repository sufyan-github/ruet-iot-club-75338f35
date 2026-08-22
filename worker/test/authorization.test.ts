import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createSessionMaterial } from "../auth/session";

interface Envelope<T> {
  success: boolean;
  data?: T;
  code?: string;
}

interface TestIdentity {
  id: string;
  email: string;
  cookie: string;
  csrf: string;
}

const origin = "https://test.invalid";

async function createIdentity(email: string, displayName: string): Promise<TestIdentity> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users
      (id, primary_email, primary_email_normalized, display_name, status, email_verified_at)
     VALUES (?, ?, ?, ?, 'EMAIL_VERIFIED', ?)`,
  )
    .bind(id, email, email.toLowerCase(), displayName, new Date().toISOString())
    .run();
  const session = await createSessionMaterial();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, csrf_token_hash, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(session.id, id, session.tokenHash, session.csrfTokenHash, session.expiresAt)
    .run();
  return { id, email, cookie: `__Host-ruet_session=${session.token}`, csrf: session.csrfToken };
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    identity?: TestIdentity;
    idempotencyKey?: string;
    bootstrapSecret?: string;
  } = {},
) {
  const headers = new Headers({ Accept: "application/json", Origin: origin });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.identity) {
    headers.set("Cookie", options.identity.cookie);
    headers.set("X-CSRF-Token", options.identity.csrf);
  }
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
  if (options.bootstrapSecret) headers.set("X-Bootstrap-Token", options.bootstrapSecret);
  const response = await exports.default.fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  return { response, body: await response.json<Envelope<T>>() };
}

beforeAll(async () => {
  const migrations = (env as Env & { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS;
  await applyD1Migrations(env.DB, migrations);
});

describe("Phase 3 database authorization", () => {
  it("bootstraps exactly one super administrator and replays the command safely", async () => {
    const first = await createIdentity("super-one@example.com", "Super One");
    const second = await createIdentity("super-two@example.com", "Super Two");
    const key = "bootstrap-command-0001";
    const input = { email: first.email, reason: "Initial controlled platform bootstrap" };

    const wrongSecret = await request("/internal/bootstrap-super-admin", {
      method: "POST",
      body: input,
      idempotencyKey: key,
      bootstrapSecret: "incorrect-bootstrap-secret-value",
    });
    expect(wrongSecret.response.status).toBe(403);

    const bootstrap = await request<{ assignmentId: string; bootstrapped: boolean }>("/internal/bootstrap-super-admin", {
      method: "POST",
      body: input,
      idempotencyKey: key,
      bootstrapSecret: env.BOOTSTRAP_ADMIN_SECRET,
    });
    expect(bootstrap.response.status).toBe(201);
    expect(bootstrap.body.data?.bootstrapped).toBe(true);
    expect(bootstrap.response.headers.get("Idempotency-Replayed")).toBe("false");

    const replay = await request<{ assignmentId: string }>("/internal/bootstrap-super-admin", {
      method: "POST",
      body: input,
      idempotencyKey: key,
      bootstrapSecret: env.BOOTSTRAP_ADMIN_SECRET,
    });
    expect(replay.response.status).toBe(201);
    expect(replay.body.data?.assignmentId).toBe(bootstrap.body.data?.assignmentId);
    expect(replay.response.headers.get("Idempotency-Replayed")).toBe("true");

    const repeatedBootstrap = await request("/internal/bootstrap-super-admin", {
      method: "POST",
      body: { email: second.email, reason: "Attempt a second system bootstrap" },
      idempotencyKey: "bootstrap-command-0002",
      bootstrapSecret: env.BOOTSTRAP_ADMIN_SECRET,
    });
    expect(repeatedBootstrap.response.status).toBe(409);
    expect(repeatedBootstrap.body.code).toBe("BOOTSTRAP_ALREADY_COMPLETED");

    const bootstrapAuditCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'AUTHORIZATION_BOOTSTRAPPED'",
    ).first<number>("count");
    expect(bootstrapAuditCount).toBe(1);
  });

  it("serves a permission-scoped overview to every built-in administrator role", async () => {
    const grantor = await env.DB.prepare("SELECT user_id FROM user_roles WHERE role_id = 'role:SUPER_ADMIN' AND revoked_at IS NULL LIMIT 1").first<string>("user_id");
    const roles = ["SUPER_ADMIN", "ADMIN", "EXECUTIVE", "MEMBERSHIP_MANAGER", "PROJECT_MANAGER", "RESEARCH_MANAGER", "EVENT_MANAGER", "CONTENT_MANAGER", "FINANCE_MANAGER", "CERTIFICATE_MANAGER", "REVIEWER", "MENTOR"];
    for (const [index, role] of roles.entries()) {
      const identity = await createIdentity(`overview-${index}@example.com`, `${role} Overview`);
      if (role === "SUPER_ADMIN") {
        await env.DB.prepare("UPDATE sessions SET user_id = ? WHERE user_id = ?").bind(grantor, identity.id).run();
      } else {
        await env.DB.prepare(
          "INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason) VALUES (?, ?, ?, ?, ?)",
        ).bind(crypto.randomUUID(), identity.id, `role:${role}`, grantor, "Verify the permission-scoped administration overview").run();
      }
      const result = await request<{ metrics: Record<string, number>; analytics: Record<string, unknown[]> }>("/admin/overview", { identity });
      expect(result.response.status, role).toBe(200);
      expect(result.body.data?.metrics, role).toBeTypeOf("object");
      expect(result.body.data?.analytics, role).toBeTypeOf("object");
    }
    const communityUser = await createIdentity("overview-denied@example.com", "Community User");
    const denied = await request("/admin/overview", { identity: communityUser });
    expect(denied.response.status).toBe(403);
    expect(denied.body.code).toBe("PERMISSION_DENIED");
  });

  it("enforces permissions, atomic idempotency, and immediate role revocation", async () => {
    const superAdmin = await env.DB.prepare("SELECT id, primary_email FROM users WHERE primary_email_normalized = ?")
      .bind("super-one@example.com")
      .first<{ id: string; primary_email: string }>();
    const adminTarget = await env.DB.prepare("SELECT id, primary_email FROM users WHERE primary_email_normalized = ?")
      .bind("super-two@example.com")
      .first<{ id: string; primary_email: string }>();
    expect(superAdmin).toBeTruthy();
    expect(adminTarget).toBeTruthy();

    const superIdentity = await createIdentity("super-session@example.com", "Super Session");
    await env.DB.prepare(
      `UPDATE sessions SET user_id = ? WHERE user_id = ?`,
    ).bind(superAdmin!.id, superIdentity.id).run();
    const normalIdentity = await createIdentity("normal-user@example.com", "Normal User");

    const denied = await request("/admin/rbac/roles", { identity: normalIdentity });
    expect(denied.response.status).toBe(403);
    expect(denied.body.code).toBe("PERMISSION_DENIED");

    const roles = await request<Array<{ key: string }>>("/admin/rbac/roles", { identity: superIdentity });
    expect(roles.response.status).toBe(200);
    expect(roles.body.data?.some((role) => role.key === "SUPER_ADMIN")).toBe(true);

    const missingKey = await request("/admin/rbac/assignments", {
      method: "POST",
      identity: superIdentity,
      body: { userEmail: adminTarget!.primary_email, roleKey: "ADMIN", reason: "Operational administration" },
    });
    expect(missingKey.response.status).toBe(400);
    expect(missingKey.body.code).toBe("IDEMPOTENCY_KEY_REQUIRED");

    const grantKey = "grant-admin-command-0001";
    const grantInput = { userEmail: adminTarget!.primary_email, roleKey: "ADMIN", reason: "Operational administration" };
    const grant = await request<{ assignmentId: string }>("/admin/rbac/assignments", {
      method: "POST",
      identity: superIdentity,
      idempotencyKey: grantKey,
      body: grantInput,
    });
    expect(grant.response.status).toBe(201);

    const grantReplay = await request<{ assignmentId: string }>("/admin/rbac/assignments", {
      method: "POST",
      identity: superIdentity,
      idempotencyKey: grantKey,
      body: grantInput,
    });
    expect(grantReplay.body.data?.assignmentId).toBe(grant.body.data?.assignmentId);
    expect(grantReplay.response.headers.get("Idempotency-Replayed")).toBe("true");

    const conflict = await request("/admin/rbac/assignments", {
      method: "POST",
      identity: superIdentity,
      idempotencyKey: grantKey,
      body: { ...grantInput, reason: "A different request with the same key" },
    });
    expect(conflict.response.status).toBe(409);
    expect(conflict.body.code).toBe("IDEMPOTENCY_CONFLICT");

    const adminSession = await createIdentity("temporary-session-owner@example.com", "Temporary Session Owner");
    await env.DB.prepare("UPDATE sessions SET user_id = ? WHERE user_id = ?")
      .bind(adminTarget!.id, adminSession.id)
      .run();
    expect((await request("/admin/rbac/roles", { identity: adminSession })).response.status).toBe(200);
    expect((await request("/admin/rbac/roles", { identity: adminSession, method: "POST" })).response.status).not.toBe(200);

    const revoke = await request("/admin/rbac/assignments/" + grant.body.data!.assignmentId + "/revoke", {
      method: "POST",
      identity: superIdentity,
      idempotencyKey: "revoke-admin-command-0001",
      body: { reason: "Administrative access is no longer required" },
    });
    expect(revoke.response.status).toBe(200);
    const revokeReplay = await request("/admin/rbac/assignments/" + grant.body.data!.assignmentId + "/revoke", {
      method: "POST",
      identity: superIdentity,
      idempotencyKey: "revoke-admin-command-0001",
      body: { reason: "Administrative access is no longer required" },
    });
    expect(revokeReplay.response.status).toBe(200);
    expect(revokeReplay.response.headers.get("Idempotency-Replayed")).toBe("true");
    expect((await request("/admin/rbac/roles", { identity: adminSession })).response.status).toBe(403);

    const assignmentCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM user_roles WHERE user_id = ? AND role_id = 'role:ADMIN'",
    ).bind(adminTarget!.id).first<number>("count");
    expect(assignmentCount).toBe(1);
    const grantAuditCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'ROLE_GRANTED' AND entity_id = ?",
    ).bind(grant.body.data!.assignmentId).first<number>("count");
    expect(grantAuditCount).toBe(1);
  });

  it("protects the last super administrator at the database boundary", async () => {
    const first = await env.DB.prepare(
      `SELECT ur.id AS assignment_id, u.id AS user_id
       FROM user_roles ur JOIN users u ON u.id = ur.user_id
       WHERE ur.role_id = 'role:SUPER_ADMIN' AND ur.revoked_at IS NULL LIMIT 1`,
    ).first<{ assignment_id: string; user_id: string }>();
    const firstSessionOwner = await createIdentity("last-admin-session@example.com", "Last Admin Session");
    await env.DB.prepare("UPDATE sessions SET user_id = ? WHERE user_id = ?")
      .bind(first!.user_id, firstSessionOwner.id)
      .run();

    const lastRevoke = await request(`/admin/rbac/assignments/${first!.assignment_id}/revoke`, {
      method: "POST",
      identity: firstSessionOwner,
      idempotencyKey: "revoke-last-super-admin",
      body: { reason: "This must be rejected by the database guard" },
    });
    expect(lastRevoke.response.status).toBe(409);
    expect(lastRevoke.body.code).toBe("LAST_SUPER_ADMIN_REQUIRED");

    const lastSuspend = await request(`/admin/users/${first!.user_id}/status`, {
      method: "PUT",
      identity: firstSessionOwner,
      idempotencyKey: "suspend-last-super-admin",
      body: { status: "SUSPENDED", reason: "This must also be rejected" },
    });
    expect(lastSuspend.response.status).toBe(409);
    expect(lastSuspend.body.code).toBe("LAST_SUPER_ADMIN_REQUIRED");

    await expect(
      env.DB.prepare("DELETE FROM users WHERE id = ?").bind(first!.user_id).run(),
    ).rejects.toThrow(/users require soft deletion/iu);
    await expect(
      env.DB.prepare("UPDATE roles SET deleted_at = ? WHERE id = 'role:SUPER_ADMIN'")
        .bind(new Date().toISOString())
        .run(),
    ).rejects.toThrow(/system roles are immutable/iu);
    await expect(
      env.DB.prepare("UPDATE roles SET name = 'Changed system role' WHERE id = 'role:ADMIN'").run(),
    ).rejects.toThrow(/system roles are immutable/iu);
  });

  it("supports audited custom-role lifecycle and soft deletion", async () => {
    const superAdmin = await env.DB.prepare(
      "SELECT user_id FROM user_roles WHERE role_id = 'role:SUPER_ADMIN' AND revoked_at IS NULL LIMIT 1",
    ).first<{ user_id: string }>();
    const sessionOwner = await createIdentity("role-lifecycle-session@example.com", "Role Lifecycle Session");
    await env.DB.prepare("UPDATE sessions SET user_id = ? WHERE user_id = ?")
      .bind(superAdmin!.user_id, sessionOwner.id)
      .run();
    const customTarget = await createIdentity("custom-role-target@example.com", "Custom Role Target");

    const created = await request<{ roleId: string }>("/admin/rbac/roles", {
      method: "POST",
      identity: sessionOwner,
      idempotencyKey: "create-custom-role-0001",
      body: {
        key: "COMMUNITY_COORDINATOR",
        name: "Community Coordinator",
        description: "Coordinates public community activities.",
        permissionKeys: ["admin.access", "event.read", "content.read"],
        reason: "Create a least-privilege coordination role",
      },
    });
    expect(created.response.status).toBe(201);

    const grant = await request<{ assignmentId: string }>("/admin/rbac/assignments", {
      method: "POST",
      identity: sessionOwner,
      idempotencyKey: "grant-custom-role-0001",
      body: {
        userEmail: customTarget.email,
        roleKey: "COMMUNITY_COORDINATOR",
        reason: "Coordinate the autumn community program",
      },
    });
    expect(grant.response.status).toBe(201);

    const archiveBlocked = await request("/admin/rbac/roles/COMMUNITY_COORDINATOR/archive", {
      method: "POST",
      identity: sessionOwner,
      idempotencyKey: "archive-custom-role-blocked",
      body: { reason: "Attempt while assignment is active" },
    });
    expect(archiveBlocked.response.status).toBe(409);
    expect(archiveBlocked.body.code).toBe("ROLE_HAS_ACTIVE_ASSIGNMENTS");

    await request(`/admin/rbac/assignments/${grant.body.data!.assignmentId}/revoke`, {
      method: "POST",
      identity: sessionOwner,
      idempotencyKey: "revoke-custom-role-0001",
      body: { reason: "Coordination term completed" },
    });
    const archived = await request("/admin/rbac/roles/COMMUNITY_COORDINATOR/archive", {
      method: "POST",
      identity: sessionOwner,
      idempotencyKey: "archive-custom-role-0001",
      body: { reason: "The temporary coordination role is retired" },
    });
    expect(archived.response.status).toBe(200);
    const archiveReplay = await request("/admin/rbac/roles/COMMUNITY_COORDINATOR/archive", {
      method: "POST",
      identity: sessionOwner,
      idempotencyKey: "archive-custom-role-0001",
      body: { reason: "The temporary coordination role is retired" },
    });
    expect(archiveReplay.response.status).toBe(200);
    expect(archiveReplay.response.headers.get("Idempotency-Replayed")).toBe("true");
    const role = await env.DB.prepare("SELECT deleted_at, deleted_by, deletion_reason FROM roles WHERE id = ?")
      .bind(created.body.data!.roleId)
      .first<{ deleted_at: string | null; deleted_by: string | null; deletion_reason: string | null }>();
    expect(role?.deleted_at).toBeTruthy();
    expect(role?.deleted_by).toBe(superAdmin!.user_id);
    expect(role?.deletion_reason).toBe("The temporary coordination role is retired");

    const delegatedSuperAdmin = await request("/admin/rbac/roles", {
      method: "POST",
      identity: sessionOwner,
      idempotencyKey: "create-delegated-super-admin-role",
      body: {
        key: "DELEGATED_SUPER_ADMIN",
        name: "Delegated Super Admin",
        description: "This role must be rejected by the database invariant.",
        permissionKeys: ["admin.access", "rbac.super_admin.manage"],
        reason: "Verify non-delegable authority protection",
      },
    });
    expect(delegatedSuperAdmin.response.status).toBe(422);
    expect(delegatedSuperAdmin.body.code).toBe("SUPER_ADMIN_PERMISSION_NON_DELEGABLE");
  });
});
