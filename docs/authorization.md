# Database Authorization and Administrative Commands

**Status:** Implemented in Phase 3  
**Authorization schema version:** `0.3.1`  
**API base:** `/api/v1`

## Security model

Authorization is permission-based and resolved from D1 on every authenticated request. The browser receives roles and permissions for navigation and presentation, but it is never an authority. Every privileged route has server-side session, CSRF, and explicit permission middleware before its handler runs.

Effective authority is the union of permissions from active assignments whose role is not archived, whose assignment is not revoked, and whose optional expiry is still in the future. A suspended, unverified, or archived account cannot maintain an authenticated session.

```text
secure session -> active user -> active role assignments -> role permissions
      |                                                      |
      +---------------- Worker enforcement -------------------+
```

The system seeds 49 granular permissions across system, membership, volunteer, project, research, event, course, content, finance, certificate, people, partner, and opportunity domains. New domain routes must depend on a named permission; role-name checks are not an acceptable authorization boundary.

## System roles

The seeded system roles are `SUPER_ADMIN`, `ADMIN`, `EXECUTIVE`, `MEMBERSHIP_MANAGER`, `PROJECT_MANAGER`, `RESEARCH_MANAGER`, `EVENT_MANAGER`, `CONTENT_MANAGER`, `FINANCE_MANAGER`, `CERTIFICATE_MANAGER`, `REVIEWER`, and `MENTOR`.

System roles are immutable at the database boundary. They cannot be renamed, edited, archived, or hard-deleted. Custom roles can be created, reconfigured, and soft-deleted through audited commands. Permissions themselves are immutable seeded records.

`rbac.super_admin.manage` is intentionally non-delegable. A D1 trigger permits it only on the system `SUPER_ADMIN` role. An actor needs this permission in addition to normal role-assignment or user-management permission before changing a super administrator's authority or account state.

## Last-super-admin invariant

D1 triggers reject any role revocation, effective expiry, suspension, or archival that would leave the platform without an active, verified super administrator. This invariant applies even if a bug, script, or future route bypasses normal service logic.

The first super administrator is assigned once through the bootstrap command. A database trigger prevents later system-bootstrap assignments after an active verified super administrator exists.

## Privileged API

| Method and path | Required permission | Purpose |
|---|---|---|
| `GET /admin/access/me` | authenticated session | Return current effective roles and permissions. |
| `GET /admin/rbac/permissions` | `rbac.read` | List the permission catalogue. |
| `GET /admin/rbac/roles` | `rbac.read` | List system/custom roles and their permissions. |
| `GET /admin/rbac/assignments` | `rbac.read` | List recent assignments, optionally filtered by email. |
| `GET /admin/users` | `users.read` | List account administration projections. |
| `GET /admin/audit-logs` | `audit.read` | Read paginated immutable audit events. |
| `POST /admin/rbac/roles` | `rbac.roles.manage` | Create a custom role. |
| `PUT /admin/rbac/roles/:roleKey/permissions` | `rbac.roles.manage` | Replace a custom role's permission set. |
| `POST /admin/rbac/roles/:roleKey/archive` | `rbac.roles.manage` | Soft-delete an unassigned custom role. |
| `POST /admin/rbac/assignments` | `rbac.assignments.manage` | Grant a role to a verified active account. |
| `POST /admin/rbac/assignments/:assignmentId/revoke` | `rbac.assignments.manage` | Revoke an active assignment. |
| `PUT /admin/users/:userId/status` | `users.manage` | Suspend or restore an account. |
| `POST /admin/users/:userId/archive` | `users.archive` | Soft-delete an account after email confirmation. |

Mutating routes also require the current CSRF token, an allowlisted same-origin request, a validated JSON body, a reason, and a valid `Idempotency-Key` header.

## Idempotent commands and atomicity

An idempotency key contains 8–128 safe characters and is scoped to the operation and actor. Only SHA-256 hashes of the key and canonical request are stored. A completed response is retained for 24 hours.

The reservation, domain mutation, immutable audit insert, and stored response completion execute in one `D1Database.batch()` call. D1 rolls the batch back if any statement fails. Retrying the same key and body returns the original status/body with `Idempotency-Replayed: true`; reusing the key for a different body returns `409 IDEMPOTENCY_CONFLICT`.

Replay lookup happens before mutable resource preconditions. This means a network retry after a successful revoke or archive still returns the original response instead of incorrectly reporting that the now-changed record cannot be found.

## Audit and deletion policy

Every privileged mutation writes an audit event in the same atomic batch. Events record actor type/ID, action, entity type/ID, timestamp, mandatory reason, metadata, and request ID. Database triggers reject audit-log updates and deletes.

Users and roles use soft deletion with `deleted_at`, `deleted_by`, and `deletion_reason`. Role assignments use revocation fields rather than deletion. Database triggers reject hard deletion of users, roles, and assignments. A future permanent-deletion workflow must receive a separate permission, confirmation ceremony, retention review, and purpose-built migration or command; direct table deletion remains prohibited.

## Initial bootstrap

1. Generate strong independent values for `SESSION_SECRET`, `TURNSTILE_SECRET`, and `BOOTSTRAP_ADMIN_SECRET`.
2. Install secrets with interactive Wrangler commands for the intended environment.
3. Register and verify the intended administrator account normally.
4. Submit the one-time command with a new idempotency key:

```bash
curl -X POST https://HOST/api/v1/internal/bootstrap-super-admin \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: bootstrap-unique-command-0001" \
  -H "X-Bootstrap-Token: YOUR_SECRET" \
  --data '{"email":"admin@example.com","reason":"Initial controlled platform bootstrap"}'
```

5. Confirm one `AUTHORIZATION_BOOTSTRAPPED` audit event and that the account can read `/admin/access/me`.
6. Rotate and securely retain the bootstrap secret. The database guard keeps the command one-time; the configured secret should not be weakened or exposed.

The endpoint is rate-limited and compares the supplied secret in constant time. Never put the bootstrap token in source control, shell history, tickets, logs, or frontend code.

## Adding a privileged route

1. Select or seed the narrowest domain permission in a forward-only migration.
2. Add `sessionMiddleware({ required: true })`, CSRF middleware for mutations, and `requirePermission("domain.action")`.
3. Validate path, query, and JSON input with a bounded schema.
4. Require a human-readable reason and idempotency key for privileged mutations.
5. Execute the state change and `createAuditStatement()` in one idempotent D1 batch.
6. Add Workers-runtime tests for denial, success, replay, conflict, immediate revocation, and database invariants.
7. Treat any frontend visibility check only as presentation logic.

## Operational checks

Run `npm run check:phase3` before staging promotion. Before any remote D1 migration, export the database, apply to staging, exercise bootstrap/RBAC with disposable accounts, verify audit records, and test last-super-admin protection. Production migration and bootstrap require an explicitly confirmed Cloudflare account, resource bindings, domain, secrets, and operator.

Relevant Cloudflare behavior is documented in the official [D1 batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch), [D1 foreign-key guidance](https://developers.cloudflare.com/d1/sql-api/foreign-keys/), [D1 SQL support](https://developers.cloudflare.com/d1/sql-api/sql-statements/), and [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
