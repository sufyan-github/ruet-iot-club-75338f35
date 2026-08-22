# ADR 0002: Application-owned authentication

- Status: Accepted
- Date: 2026-08-21

## Context

The prototype used browser-side Supabase Auth while the target platform requires Worker-owned security decisions, verified email before login, revocable server sessions, auditable account workflows, and no browser secrets. Community accounts must not imply club membership.

## Decision

Use application-owned credentials and opaque sessions in D1 behind same-origin Hono routes. Hash passwords with Worker Web Crypto PBKDF2-HMAC-SHA256 using a random 16-byte salt and the runtime-supported maximum of 100,000 iterations. Store only hashes of random verification, reset, email-change, session, and CSRF tokens. Use secure HttpOnly SameSite cookies, exact-origin checks, and a rotating CSRF header for authenticated mutations.

Queue transactional email in D1 with AES-GCM-encrypted payloads and send through a replaceable Cloudflare Email Service binding. Treat account deletion as a reviewable request and immediate session revocation, not an unlogged hard delete.

## Consequences

- The Worker and D1 are authoritative for account state and session revocation.
- Login is unavailable until email verification succeeds.
- Password reset and email change revoke all active sessions.
- Cloudflare Email Service domain activation is required before remote delivery works.
- Membership, roles, student IDs, and approvals remain separate later-phase domains.
