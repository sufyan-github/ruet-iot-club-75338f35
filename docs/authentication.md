# Authentication and Account System

## Scope

Phase 2 replaces Supabase Auth with a same-origin Worker account service. A verified community account grants authentication only. It does not grant club membership, a member/volunteer ID, an administrative role, course access, payment approval, or any other domain authorization.

## API surface

All responses use the platform success/error envelope and include an `X-Request-ID`.

| Method | Route | Authentication | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/auth/config` | Public | Return the non-secret Turnstile site key. |
| `POST` | `/api/v1/auth/register` | Public + Turnstile | Create an unverified account and queue verification email. |
| `POST` | `/api/v1/auth/resend-verification` | Public | Invalidate old links and queue a new link with a non-enumerating response. |
| `POST` | `/api/v1/auth/verify-email` | One-time token | Verify the primary email. |
| `POST` | `/api/v1/auth/login` | Public | Validate credentials and create an opaque session; verified accounts only. |
| `GET` | `/api/v1/auth/session` | Optional cookie | Restore account state and rotate the CSRF token. |
| `POST` | `/api/v1/auth/logout` | Cookie + CSRF | Revoke the current session. |
| `POST` | `/api/v1/auth/logout-all` | Cookie + CSRF | Revoke every session for the account. |
| `POST` | `/api/v1/auth/forgot-password` | Public | Queue reset email with a non-enumerating response. |
| `POST` | `/api/v1/auth/reset-password` | One-time token | Replace the password and revoke every session. |
| `POST` | `/api/v1/auth/change-password` | Cookie + CSRF + current password | Replace the password, clear the first-login requirement, and revoke other sessions. |
| `POST` | `/api/v1/auth/change-email/request` | Cookie + CSRF + password | Queue verification to an unused new address. |
| `POST` | `/api/v1/auth/change-email/verify` | One-time token | Change the address and revoke every session. |
| `POST` | `/api/v1/auth/onboarding` | Cookie + CSRF | Complete or dismiss community onboarding. |
| `GET/PATCH` | `/api/v1/account/notification-preferences` | Cookie; CSRF on write | Read/update account notification preferences. |
| `POST` | `/api/v1/account/deletion-request` | Cookie + CSRF | Record a reviewable deletion request and revoke every session. |

## Fixed super administrators

Production has exactly two protected, allowlisted super-administrator identities:

- `ruetiotclub@gmail.com`
- `abusufyan.cse20@gmail.com`

They are provisioned through a one-time bootstrap-secret endpoint, never through public registration. Each receives a unique temporary password and `must_change_password = 1`. Until the password is changed, the Worker permits account-security access but rejects permission-protected administration routes. The fixed email address, verified state, account status, fixed flag, and active `SUPER_ADMIN` role are protected by D1 triggers. Fixed administrators cannot change their email or request account deletion, but can change their password from `/account/security`.

## Cryptography and tokens

- Passwords: PBKDF2-HMAC-SHA256, 100,000 iterations (the Workers Web Crypto runtime ceiling), random 16-byte salt, 32-byte output.
- Password input: 12–128 characters; long passphrases are accepted without composition rules.
- Opaque tokens: 32 random bytes encoded as base64url.
- Database token values: SHA-256 digests only; raw verification/reset/session/CSRF tokens are not stored.
- Email outbox: AES-256-GCM with a random 12-byte IV and a purpose-separated key derived from `SESSION_SECRET`.
- Verification lifetime: 24 hours.
- Password-reset and email-change lifetime: one hour.
- Session lifetime: 30 days with server-side expiry/revocation.

The PBKDF2 work factor is encoded into every password hash to support future rehash-on-login upgrades.

## Session and CSRF behavior

Staging/production/test sessions use `__Host-ruet_session` with `Secure`, `HttpOnly`, `Path=/`, `SameSite=Lax`, and no `Domain` attribute. Local HTTP development uses `ruet_session` because browsers reject `Secure` cookies over plain HTTP.

The session token is random and only its digest is stored. Every authenticated mutation requires:

1. a live, unrevoked D1 session;
2. an exact `Origin` match against `SITE_URL` or `FRONTEND_ORIGIN`; and
3. an `X-CSRF-Token` whose digest matches the session record.

`GET /auth/session` rotates the CSRF token so the SPA can safely recover after a reload without storing security tokens in local storage. Password reset, confirmed email change, logout-all, and deletion request revoke all sessions. An authenticated password change preserves the current session and revokes every other session.

## Abuse and enumeration controls

- Registration requires server-side Turnstile Siteverify with action `register`.
- Auth/account request bodies are limited to 16 KiB and validated with bounded Zod schemas.
- D1 fixed-window limits protect registration, login, verification resend, and password recovery.
- Login limits use a digest of route/IP/email rather than storing the raw rate-limit identifier.
- Five failed password attempts lock the account for 15 minutes.
- Missing-account password recovery and ineligible-account recovery return the same message.
- Resend verification returns the same message regardless of account state.
- Operational logs contain request/outbox identifiers, not tokens or rendered email bodies.

## Email delivery

Each account operation creates its token and encrypted outbox record in one atomic D1 batch. The scheduled handler claims up to ten records every five minutes and sends both HTML and plain text through `env.EMAIL`. It records the provider message ID, uses exponential retry backoff, and reclaims interrupted deliveries after a 15-minute lease.

Remote delivery requires all of the following:

1. authenticate Wrangler with a scoped `CLOUDFLARE_API_TOKEN`;
2. onboard and verify the real sending domain in Cloudflare Email Service;
3. replace `.invalid` URLs, Turnstile site keys, and `EMAIL_FROM` placeholders;
4. install `SESSION_SECRET` and `TURNSTILE_SECRET` separately in staging/production;
5. run the Phase 2 gate and a staging inbox delivery test before production promotion.

The local/test Turnstile keys are Cloudflare test values only and must never be copied to production.

## D1 records

- `users`
- `password_credentials`
- `email_verification_tokens`
- `password_reset_tokens`
- `email_change_requests`
- `sessions`
- `notification_preferences`
- `account_deletion_requests`
- `auth_rate_limits`
- `email_outbox`
- `user_profiles`
- `website_content_items`
- `website_submissions`
- `website_media_objects` (metadata; bytes are stored in R2)

Account workflow events are also appended to immutable `audit_logs` in the same D1 batch as their corresponding mutation.

## Verification

Run:

```bash
npm run check:phase2
```

The gate validates generated bindings, frontend and strict Worker typechecks, zero-warning Worker lint, frontend tests, Workers-runtime lifecycle/security tests, local forward migrations, frontend build, Wrangler dry-run bundle, and high-severity dependency audit.
