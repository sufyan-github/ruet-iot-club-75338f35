# Platform Architecture

## Decision

RUET IoT Club will use one Cloudflare Worker as the same-origin API and static-asset gateway, Cloudflare D1 as the relational system of record, and Cloudflare R2 as object storage. The existing React/Vite application remains the public presentation layer and is migrated feature-by-feature.

```text
Browser
  ├─ public React/Vite assets ───────────────┐
  └─ /api/v1 typed requests                 │
                                             ▼
                                  Cloudflare Worker + Hono
                                   ├─ authentication/session
                                   ├─ validation/authorization
                                   ├─ domain services
                                   ├─ structured errors/logs
                                   └─ immutable audit events
                                      │       │       │
                                      ▼       ▼       ▼
                                     D1      R2     Queues (later phase)
```

## Why this shape

- A same-origin Worker simplifies secure cookies, CSRF policy, CORS, and deployment.
- Worker bindings keep database and storage credentials out of the browser and avoid REST calls back into Cloudflare.
- D1 provides the relational constraints and transactional command model needed by membership, payments, identity sequences, permissions, and certificates.
- R2 cleanly separates large objects from relational metadata.
- Hono provides a small typed routing layer without forcing a rewrite of the React application.

## Server ownership

The API is the sole writer of privileged state. Browser-supplied workflow states, amounts, roles, IDs, or certificate numbers are never persisted. Command handlers load authoritative state, validate the transition and permission, write the domain mutation, and append an audit event.

## Cloudflare-only runtime boundary

All active browser data requests use same-origin `/api/v1` Worker endpoints. Cloudflare D1 stores accounts, sessions, permissions, website content, submissions, profiles, audit records, and R2 object metadata. Cloudflare R2 stores uploaded website media. No Supabase SDK, Supabase environment variable, Supabase network endpoint, or Supabase cloud service is used by the production runtime. The frontend receives a stable compatibility adapter while page components are incrementally renamed; no Worker implementation module is imported into the browser bundle.

## Environment separation

Development, staging, and production have separate D1 databases, R2 buckets, variables, and secrets. Named Wrangler environments repeat non-inheritable bindings deliberately. Production deployment is blocked operationally until the intended custom domain and Cloudflare resource ownership are confirmed.

## Follow-up decisions

- D1 transactional sequence allocation details (Phase 4).
- Queue retry/dead-letter expansion beyond the Phase 2 encrypted D1 outbox (Phase 15).
- Certificate PDF rendering implementation and template snapshot format (Phase 6).

## Authentication boundary

Authentication is application-owned under `/api/v1/auth`. Passwords use PBKDF2-HMAC-SHA256 with a unique 128-bit salt, a 256-bit result, and the Cloudflare Workers Web Crypto maximum of 100,000 iterations. Verification, reset, email-change, session, and CSRF tokens are generated with the Workers cryptographic random source; only SHA-256 token digests are stored.

Sessions are opaque D1 records, not browser-readable JWTs. Production/staging cookies use the `__Host-` prefix with `Secure`, `HttpOnly`, `Path=/`, and `SameSite=Lax`; local HTTP development uses a non-prefixed cookie. Authenticated mutations require both an exact configured origin and a rotating `X-CSRF-Token`. Password reset, email change, logout-all, and deletion requests revoke server-side sessions.

Community accounts are deliberately independent of membership. Creating or verifying a user does not create a membership, role, student ID, or approval state.

## Transactional email boundary

Auth handlers write encrypted HTML/text email payloads to `email_outbox` in the same D1 batch as their one-time token. A scheduled Worker decrypts bounded batches and uses the native Cloudflare Email Service `EMAIL` binding. Delivery has an atomic claim, retry backoff, stale-lease recovery, and no browser-selectable recipients. The account domain therefore depends on an `EmailService` boundary, not a vendor API key.
