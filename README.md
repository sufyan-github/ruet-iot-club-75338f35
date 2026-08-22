# RUET IoT Club Platform

Production-oriented web platform for the RUET IoT Club, implemented as a same-origin Cloudflare architecture with React, TypeScript, Hono, Workers, D1, R2, and Turnstile.

## Current status

Phases 1–5 establish the Cloudflare foundation, application-owned community accounts, D1-backed permission authorization, separate membership/community-volunteer domains, and transactional payment/approval/identity workflows. Authentication, active website content, submissions, profiles, and media now use only same-origin Worker APIs, D1, and R2; the legacy external cloud runtime has been removed.

See [the implementation plan](docs/implementation-plan.md) for the full feature, route, database, component, security, and Cloudflare migration maps.
See [database authorization](docs/authorization.md) for the RBAC model, privileged API, bootstrap runbook, idempotency contract, and extension checklist.
See [membership and volunteering](docs/membership.md) for application, payment, approval, lifecycle, identity, and production-owner rules.

## Architecture

```text
React/Vite static assets + /api/v1 requests
                    │
                    ▼
          Cloudflare Worker (Hono)
          ├─ validation and auth
          ├─ domain business logic
          ├─ structured errors/logging
          └─ security headers
              │             │
              ▼             ▼
             D1             R2
```

Privileged business state is server-owned. Membership approval, payments, identity numbers, roles, course completion, certificate issuance, and destructive operations must never be set directly by the browser.

## Requirements

- Node.js 22 LTS or a newer supported version (`.nvmrc` is provided)
- npm 10+
- A Cloudflare account for remote staging/production resources

## Local setup

```bash
npm ci
cp .env.example .env.local
cp .dev.vars.example .dev.vars
npm run cf:types
npm run db:migrate:local
```

Fill the local files with environment-specific values. Never commit `.env.local` or `.dev.vars`.

Run the Worker in one terminal:

```bash
npm run build
npm run dev:worker
```

Run Vite in another terminal when developing the frontend with hot reload:

```bash
npm run dev:web
```

Vite proxies `/api` to `http://127.0.0.1:8787`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev:web` | Start the Vite frontend on port 8080. |
| `npm run dev:worker` | Start the Worker/API on port 8787. |
| `npm run cf:types` | Regenerate binding/runtime types from `wrangler.jsonc`. |
| `npm run db:migrate:local` | Apply D1 migrations to local storage. |
| `npm run typecheck` | Typecheck the frontend and strict Worker projects. |
| `npm run test:worker` | Run integration tests inside the Workers runtime. |
| `npm run build` | Build the React application. |
| `npm run build:worker` | Produce a Wrangler dry-run bundle without deploying. |
| `npm run check:phase1` | Run the complete Phase 1 local verification gate. |
| `npm run check:phase2` | Run the Phase 2 type, security, migration, test, audit, and build gate. |
| `npm run check:phase3` | Run the Phase 3 authorization, invariant, migration, security, audit, and build gate. |
| `npm run check:phase4` | Run the Phase 4 membership/volunteer schema, workflow, security, migration, audit, and build gate. |
| `npm run check:phase5` | Run the Phase 5 payment, approval, identity-allocation, contention, migration, audit, and build gate. |

## Configuration and secrets

Non-secret Worker configuration and bindings live in `wrangler.jsonc`. Required secret names are declared there, but values must be installed through Wrangler:

```bash
npx wrangler secret put SESSION_SECRET --env staging
npx wrangler secret put TURNSTILE_SECRET --env staging
npx wrangler secret put BOOTSTRAP_ADMIN_SECRET --env staging
```

Repeat for production. Never pass secret values as command arguments and never commit real secret files.

## D1 and R2

D1 migrations are forward-only SQL files under `migrations/`. Wrangler records applied versions in `d1_migrations`. R2 stores file bytes; D1 stores ownership, purpose, visibility, MIME, size, checksum, and lifecycle metadata.

Before a remote migration:

1. Export or back up the target D1 database.
2. Apply and verify the migration in staging.
3. Run the security and integration suites.
4. Apply production with the explicit production environment.
5. Verify readiness and domain invariants.

## Testing and CI

GitHub Actions installs from the single npm lockfile, validates generated bindings, typechecks, lints the Worker boundary, runs frontend tests, runs Worker-runtime tests, applies D1 migrations locally, builds the frontend, and validates the Worker bundle.

The legacy frontend lint backlog remains documented in the project audit and will be eliminated before the final release gate; new Worker code is held to strict TypeScript and zero-warning linting immediately.

## Deployment

Do not deploy production until the Cloudflare account, intended custom domain, D1/R2 resource names, secrets, Email Service sending domain, and backup owner are confirmed.

Replace the `.invalid` staging and production URLs, Turnstile site keys, and `EMAIL_FROM` placeholders in `wrangler.jsonc` before any remote deployment. Onboard and verify the sending domain in Cloudflare Email Service before enabling the scheduled dispatcher remotely.

```bash
npm run check:phase5
npx wrangler deploy --env staging
```

Promote the same verified commit to production only after staging acceptance:

```bash
npx wrangler deploy --env production
```

Use `npx wrangler versions list` and `npx wrangler rollback` for Worker code rollback. Database rollback uses a reviewed forward-fix or a pre-migration export; never improvise destructive rollback SQL in production.

## Security

- Secure state transitions are Worker commands, not client updates.
- D1 and R2 are accessed through bindings only.
- API responses use request IDs and structured error envelopes.
- Static and API responses receive CSP, frame, MIME, referrer, permission, and production HSTS headers.
- Public submission routes will require server-validated Turnstile tokens.
- Passwords use salted PBKDF2-HMAC-SHA256; opaque sessions and one-time tokens are stored only as hashes.
- Authenticated mutations require rotating CSRF tokens and an allowlisted same-origin request.
- Privileged routes resolve explicit D1 permissions on every request; client-visible roles are presentation data only.
- Every privileged mutation creates an immutable audit event atomically with the domain state change.
- Privileged commands require idempotency keys and safely replay their original response without duplicate state or audit events.
- Database triggers preserve at least one active verified super administrator and reject hard deletion of protected records.
- Membership and volunteer state live in separate D1 domains; submitted content and issued identity fields are immutable.
- Membership/volunteer application, renewal, and closure commands are server-validated, ownership-checked, idempotent, and audited.
- Review claims, payment requests, finance decisions, approvals, counters, issued identities, and audit events use insert-once evidence plus atomic D1 batches.
- Expected payment amounts and currencies are server snapshots; applicants can submit evidence but cannot set finance state.
- Private R2 objects will be accessible only through authorized Worker routes.

Report vulnerabilities privately to the designated RUET IoT Club platform administrators. Do not include secrets or personal data in public issues.
