# ADR 0003: Permission-Based Authorization with Database Invariants

- **Status:** Accepted
- **Date:** 2026-08-21
- **Decision owners:** RUET IoT Club platform maintainers

## Context

The prototype used browser-visible role assumptions and direct Supabase policies for authorization. The target platform has many administrative domains and state transitions whose authority cannot be trusted to client code. Role assignments, approvals, payments, publication, certificate issuance, and destructive actions also require durable accountability and safe retry behavior.

## Decision

The Worker authorizes privileged routes with explicit permission keys resolved from D1 on every request. Roles are permission bundles, not authorization checks embedded in application code. System roles and the permission catalogue are seeded through forward-only migrations; custom roles are managed through audited commands.

Privileged mutations require secure session authentication, same-origin CSRF protection, route-specific permission middleware, schema validation, a reason, and an idempotency key. Command reservation, state mutation, audit insertion, and response storage execute atomically in one D1 batch.

Critical invariants are duplicated at the database boundary: immutable audit events and permissions, immutable system roles, soft deletion/revocation instead of hard deletion, non-delegable super-admin authority, one-time bootstrap, and preservation of at least one active verified super administrator.

## Consequences

- A revoked role loses authority on the next request because permission state is not trusted from the browser or a long-lived token.
- New privileged capabilities require an explicit migration, route permission, audit action, and security test.
- Idempotent retries do not duplicate state or audit events.
- Direct database scripts are constrained by the same critical invariants as the Worker.
- D1 reads are added to authenticated privileged requests; correctness and immediate revocation are preferred over long-lived authorization caches.
- The `SUPER_ADMIN` role remains an emergency and governance boundary. Its special management permission cannot be delegated to a custom role.

## Alternatives rejected

- **Frontend role checks:** presentation-only checks are bypassable and cannot protect Worker bindings.
- **Hard-coded role checks in each handler:** roles would become coupled to features and difficult to delegate safely.
- **Permissions embedded only in session data:** authority would remain stale until session refresh or expiry.
- **Service-only last-admin checks:** future routes or maintenance scripts could bypass them.
- **Best-effort audit writes:** an operation could commit without its accountability record.
