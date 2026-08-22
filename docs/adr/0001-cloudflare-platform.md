# ADR-0001: Adopt a Same-Origin Cloudflare Platform

**Status:** Accepted  
**Date:** 2026-08-20  
**Deciders:** RUET IoT Club platform maintainers

## Context

The existing React/Vite application uses Supabase directly from the browser for data, workflow state, storage, authentication, and notifications. The audit found that this permits clients to influence membership approval, payments, course completion, certificates, and other privileged state. The replacement must preserve useful frontend work while establishing a server-owned security boundary and Cloudflare deployment path.

## Decision

Use a same-origin Cloudflare Worker with Hono for `/api/v1` and Worker Static Assets for the React/Vite application. Use D1 for relational state and R2 for object bytes. Use application-controlled, revocable cookie sessions. Use Turnstile on public writes and Queues for asynchronous email when those phases are introduced.

The migration is domain-by-domain. Supabase remains a temporary compatibility dependency only for frontend features not yet cut over; no new privileged behavior may be added there.

## Options considered

### Cloudflare Worker + D1 + R2

| Dimension | Assessment |
|---|---|
| Complexity | Medium; one edge runtime and explicit domain services |
| Security | Strong server boundary with binding-only data access |
| Scalability | Appropriate for the club's expected traffic; easy global static delivery |
| Migration | Incremental; current React UI can remain |
| Operations | Unified Wrangler configuration and Cloudflare observability |

### Retain Supabase and harden RLS/RPC

| Dimension | Assessment |
|---|---|
| Complexity | Low initially, medium for comprehensive policy repair |
| Security | Can be secure, but contradicts the approved no-Supabase target |
| Scalability | Adequate |
| Migration | Minimal |
| Operations | Continues split Supabase/hosting ownership |

### Full frontend and backend rewrite

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Security | Potentially strong, but large unvalidated surface |
| Scalability | Depends on replacement |
| Migration | High risk; discards useful UI/content |
| Operations | Longest path to a stable release |

## Trade-off analysis

The selected option creates more backend code than patching Supabase policies, but it directly meets the approved Cloudflare architecture and provides one enforceable place for authorization, validation, transactions, audit logging, rate limits, and storage controls. Incremental cutover avoids the business and visual regression risk of a blind rewrite.

## Consequences

- Privileged browser-to-database writes are prohibited.
- D1 schema and Worker commands become the authoritative domain model.
- Frontend features need typed API migration before Supabase can be removed.
- Cloudflare environment bindings and secrets must be managed separately for staging and production.
- Email, certificate rendering, and long-running work require asynchronous designs rather than request-blocking calls.
- Production deployment requires confirmed domain/resource ownership and a backup/rollback owner.

## Action items

1. Complete the Phase 2 account and session system.
2. Establish RBAC, permission middleware, and audit repositories.
3. Migrate membership and payments before exposing new administrative workflows.
4. Run data reconciliation in staging before each domain cutover.
5. Remove Supabase and legacy migrations only after final acceptance.
