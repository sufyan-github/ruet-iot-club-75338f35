# RUET IoT Club Cloudflare Platform Implementation Plan

**Status:** Accepted for phased implementation  
**Prepared:** 2026-08-20  
**Source baseline:** `main` at `1ff49fc8fa4daf413e432c9f9c732f06a4a598b1`  
**Target runtime:** React/Vite static assets + Cloudflare Worker API + D1 + R2 + Turnstile

## 1. Purpose and delivery rules

This plan converts the current React/Vite/Supabase application into a production-grade Cloudflare platform without discarding useful branding, content, components, or routes. The migration is incremental: public pages remain usable while individual data domains move behind typed Worker APIs.

The browser is never the authority for approval state, identity numbers, payment state, completion state, certificate issuance, roles, permissions, or permanent deletion. Those operations are implemented as authenticated Worker commands backed by D1 transactions and immutable audit events.

### Non-negotiable boundaries

- Public reads may use cacheable API endpoints.
- Authenticated user writes go through the Worker API.
- Privileged writes require server-side permission checks.
- D1 and R2 are reachable only through Worker bindings.
- Private R2 objects are served through authorized Worker routes or short-lived signed access.
- Email is queued; the browser never supplies arbitrary recipients.
- Every privileged mutation includes a request ID and creates an audit log in the same logical operation.
- Migration phases do not weaken current security while waiting for later phases.

## 2. Existing feature disposition

| Existing feature | Decision | Migration action |
|---|---|---|
| Public home page and IoT visual identity | Keep and improve | Preserve imagery, colors, content hierarchy, and carousel; add missing institutional sections and accessibility controls. |
| About page | Keep and improve | Preserve content; split History, Mission, and Vision into addressable sections and metadata. |
| Team/member directory | Refactor | Preserve cards and filters; create separate Executive, Advisors, Mentors, Members, Volunteers, and Alumni datasets. |
| Projects and research showcases | Keep and extend | Preserve card patterns; add slug detail routes, submissions, workflow, teams, reviewers, and media. |
| Events and registration | Refactor | Preserve listing UI; replace router-state registration with ID/slug lookup and transactional capacity enforcement. |
| Courses/LMS | Refactor | Preserve course and lesson UX; move enrollment, payment, progress, completion, and certificates to server-owned commands. |
| Blog and author submissions | Refactor | Preserve editor/list/detail experiences; implement draft/review/revision/publish workflow with author visibility. |
| Gallery | Extend | Replace flat images with R2-backed albums, associations, ordering, and optimized variants. |
| Join/membership application | Replace workflow, reuse presentation | Preserve the form's useful profile fields and styling; split account, application, payment, membership, renewal, and closure records. |
| User dashboard | Refactor by feature | Preserve summary-card concepts; load modular membership, volunteer, projects, research, events, certificates, mentorship, notifications, and settings panels. |
| Admin dashboard | Replace incrementally | Do not retain the 2,000+ line component architecture; split into permission-scoped feature modules with server pagination. |
| Notifications | Replace backend | Preserve bell/toast presentation after accessibility fixes; replace client-triggered bulk email with database queue and Worker consumer. |
| Certificate display/verification | Replace issuance, preserve public concept | Worker generates immutable certificate IDs and PDFs; public verification returns an allowlisted projection only. |
| Contact form | Keep UI, replace submission | Add Turnstile, server validation, rate limiting, persistence, and queued response notifications. |
| Password reset/auth pages | Reuse visual shell | Replace Supabase auth calls with application-controlled session-cookie APIs. |
| SEO component, sitemap, robots, `llms.txt` | Keep and improve | Use environment-based site URL, route-specific metadata, dynamic sitemap generation, and canonical slug routes. |

## 3. Existing database disposition

The PostgreSQL/Supabase schema is a source-model reference, not the final runtime. D1 becomes the system of record. Existing Supabase migrations remain temporarily under `supabase/` for traceability until data migration is validated; they are not applied in the Cloudflare runtime.

| Existing data concept | Decision | D1 replacement |
|---|---|---|
| `profiles` | Split | `users`, `user_profiles`, `user_emails`, onboarding preferences; no membership state on the user. |
| Supabase auth users | Replace | Application-owned credentials, verification tokens, reset tokens, and revocable sessions. |
| `user_roles` | Replace | `roles`, `permissions`, `role_permissions`, `user_roles`; mutations require permissions and audit logging. |
| Membership fields on profiles | Replace | `membership_types`, `membership_applications`, `membership_payments`, `memberships`, `membership_renewals`, `membership_closure_requests`, `membership_sequences`. |
| Event participants | Replace | `event_registrations`, `event_payments`, `event_attendance`; capacity allocated transactionally. |
| Course registrations and progress | Replace | `course_enrollments`, `course_payments`, `lesson_progress`; server validates access and completion. |
| Certificates | Replace | `certificate_templates`, `certificate_template_versions`, `certificates`, `certificate_events`; PDFs in private R2. |
| Projects/research | Extend | Separate submission, review, assignment, public portfolio, people, and media records. |
| Blog posts | Extend | Slug, workflow status, revisions, categories, tags, SEO, publication scheduling. |
| Notifications | Replace | `notifications`, `notification_recipients`, `email_jobs`, `email_attempts`, preferences, retry metadata. |
| Club images/storage objects | Replace | R2 `storage_objects` metadata with visibility, owner, MIME, size, hash, and lifecycle state. |
| Public member RPC | Replace | Allowlisted public directory endpoint that never returns internal user IDs or student IDs by default. |

### D1 migration sequence

1. Platform foundation: users, profiles, sessions, verification/reset tokens, RBAC, audit logs, idempotency keys, settings.
2. Membership and volunteers: applications, payments, sequence counters, active records, renewals, closures.
3. Certificates: templates, immutable template versions, issuance records, verification projection.
4. Projects, research, collaboration, partners, people directories, alumni, mentorship, opportunities.
5. Events, courses, gallery, blog, announcements, notifications, email queue.
6. Staging import tables and deterministic Supabase-to-D1 data migration scripts.

All migrations are forward-only SQL files. Production migrations are backed up before application and paired with a documented rollback strategy.

## 4. Existing route disposition

| Existing route | Decision | Target route |
|---|---|---|
| `/` | Preserve | `/` |
| `/about` | Preserve | `/about`; anchored History/Mission/Vision initially, dedicated routes if content grows. |
| `/projects` | Preserve and extend | `/projects`, `/projects/:slug`, `/submit/project` |
| `/research` | Preserve and extend | `/research`, `/research/:slug`, `/research/submit` |
| `/events` | Preserve and extend | `/events`, `/events/:slug`, `/events/:eventId/register` |
| `/events/register` | Deprecate | Redirect to `/events`; never use route state as identity. |
| `/alumni` | Preserve and extend | `/alumni`, `/alumni/:slug`, `/alumni/stories/:slug` |
| `/members` and `/team` | Clarify | `/members`, `/executive`, `/advisors`, `/mentors`, `/volunteers`; redirect `/team` to `/executive`. |
| `/gallery` | Preserve | `/gallery`, `/gallery/:albumSlug` |
| `/join` | Preserve | `/join`; authenticated membership application workflow. |
| `/contact` | Preserve | `/contact` |
| `/auth` | Split | `/login`, `/register`, `/verify-email`, plus compatibility redirect. |
| `/forgot-password`, `/reset-password` | Preserve | Same routes with Worker APIs. |
| `/dashboard` | Preserve | `/dashboard/*` modular user workspace. |
| `/admin` | Preserve shell | `/admin/*` modular operations console. |
| `/blog` | Preserve and improve | `/blog`, `/blog/:slug`, `/blog/write` |
| `/courses`, `/courses/:id` | Preserve and improve | `/courses`, `/courses/:slug`, `/courses/:slug/learn` |
| `/certificate/:id` | Preserve | `/certificate/:certificateId`; safe public view only. |
| `/verify` | Preserve | `/verify` and API `/api/certificates/verify/:certificateId`. |
| New institutional pages | Add | `/partners`, `/collaborate`, `/opportunities`, `/announcements`, `/reports`. |

Legacy links receive explicit redirects rather than silent breakage. Public entity URLs use stable slugs; internal APIs may use UUIDs.

## 5. Existing component disposition

| Component/group | Decision | Required work |
|---|---|---|
| `Layout`, `Navbar`, `Footer` | Reuse/refactor | Add skip link, accessible menu labels, institutional navigation, active-state semantics, and mobile overflow tests. |
| `HeroCarousel` | Reuse/refactor | Add pause/play, reduced-motion behavior, keyboard controls, and database-driven slides. |
| `SectionHeading` | Refactor | Accept semantic heading level and guarantee one meaningful page `h1`. |
| `SEO` | Reuse/refactor | Environment site URL, complete OG/Twitter/canonical data, structured-data helpers. |
| `ImageUpload` | Replace transport | Retain selection/preview UX; use Worker-issued upload commands, MIME/size validation, and R2 metadata. |
| `NotificationBell` | Reuse presentation | Add accessible names and semantic controls; source notifications from Worker API. |
| `PaymentSlip` | Replace print implementation | Eliminate interpolated `document.write`; render a safe component/PDF response. |
| shadcn/Radix UI primitives | Keep | Continue as accessible base components; validate usage rather than assuming primitives guarantee accessibility. |
| Page components | Split by feature | Move data access, schemas, and commands into `src/features/*`; pages become route composition. |
| `AuthContext` | Replace internally | Keep a stable consumer API during migration, backed by cookie-session `/api/auth/session`. |
| Supabase client/types | Compatibility-only then remove | No new imports; migrate feature-by-feature to typed API client and delete after cutover. |

## 6. New feature delivery map

| Feature | Required D1 records | Worker API/services | Primary UI |
|---|---|---|---|
| Account/auth | users, emails, credentials, sessions, tokens | register, verify, login/logout, reset, revoke sessions | registration, verification, login, settings |
| Membership | types, applications, payments, memberships, sequences, renewals, closures | submit/review/pay/verify/approve/renew/close commands | application wizard, status timeline, admin queues |
| Volunteers | applications, records, sequences, renewals, closures | separate approval and identity namespace | volunteer onboarding and management |
| Certificates | templates, versions, certificates, events | eligibility, issuance, PDF render, revoke, verify | request flow, admin issuer, public verification |
| Projects | submissions, projects, contributors, assignments, reviews, media | guest verification, review workflow, publish | submission form, portfolio, reviewer/admin views |
| Research | proposals, reviews, scores, contributors, publications | submission/review/conflict/decision | proposal form, reviewer workspace, public research |
| Collaboration/partners | requests, partners, contacts, assets | submit/review/activate/archive/reorder | public form, directories, admin pipeline |
| People/alumni | terms, positions, people, affiliations, alumni profiles/stories | curated public reads and permissioned CRUD | directories, profile/story pages, admin modules |
| Mentorship | mentors, requests, matches, sessions, goals | request/accept/match/progress | mentor finder and relationship workspace |
| Opportunities | opportunities, submissions, approvals | submit/review/publish/expire | searchable directory and admin queue |
| Events | events, registrations, payments, attendance | capacity-safe register, payment verify, QR check-in | detail, registration, attendee admin |
| Courses | courses, lessons, enrollments, payments, progress | enroll/access/progress/complete/certify | catalog, learner, course admin |
| Content | posts, revisions, taxonomy, albums, media, announcements | review/publish/schedule/archive | author workspace, CMS, public pages |
| Notifications/email | notifications, recipients, jobs, attempts | authorized enqueue, queue consumer, retries | preferences, inbox, admin composer |
| Reporting/audit | audit_logs, report snapshots | allowlisted reports, immutable audit write/read | admin audit explorer and reports |

## 7. Security remediation map

| Current issue | Remediation and acceptance evidence |
|---|---|
| Users can update privileged profile membership columns | Privileged columns leave the profile model; Worker commands own membership state. Security test proves self-approval and ID modification return `403`. |
| Users can submit arbitrary payment amount/status | Server loads expected amount from membership/event/course configuration; submission records cannot mark verification. Tests prove forged amount/status are ignored or rejected. |
| Course completion/certificates are client-forgeable | Lesson progress endpoints constrain records; completion and issuance are server-calculated and transactional. |
| Notification function lacks authorization | Replace with permissioned Worker commands and queued jobs; recipients resolved server-side. |
| Admin role changes are non-atomic | Transactional role command checks permission, prevents removing the last super admin, and logs before commit. |
| Storage policy blocks legitimate joins while exposing unsafe paths | R2 upload service validates purpose, ownership, MIME, extension, size, and visibility before issuing object keys. |
| Event registration depends on router state and has no capacity lock | Fetch by route ID/slug and allocate capacity inside one D1 transaction/idempotent command. |
| Public directory leaks internal identifiers | Return explicit public DTOs with no user UUID/student ID/private contacts. |
| Contact and public submissions are spammable | Turnstile server verification, per-route rate limits, normalized validation, duplicate controls, and safe error responses. |
| Bulk emails disclose recipients | Queue one logical notification and resolve/send individual recipients or provider-safe batches server-side. |
| Tracked `.env` and multiple lockfiles | Remove tracked runtime env file, add `.env.example`, use npm only, keep one lockfile, and document Wrangler secrets. |
| Weak TypeScript/lint/test gates | Strict Worker TypeScript immediately; tighten frontend incrementally; CI blocks on typecheck, lint, unit, integration, security, E2E, accessibility, and build checks. |

## 8. Cloudflare replacement mapping

| Current Supabase/Lovable capability | Cloudflare target | Migration boundary |
|---|---|---|
| Supabase Postgres and RPC | D1 + repositories/services | Worker-only D1 binding; no browser SQL client. |
| Supabase Auth | Application-controlled auth | Secure HttpOnly cookies, server-side credential hashing, verification/reset/session tables. |
| Supabase Storage | R2 | Public/private key namespaces and metadata; Worker-controlled private downloads. |
| Supabase Edge Function | Worker routes + Queues | Hono API for commands; queue consumer for email and retries. |
| RLS policies | Worker authorization + SQL constraints | Permission middleware, ownership checks, transactions, and security tests. |
| Realtime notifications | Polling/query invalidation initially | Add push/realtime only after core correctness; avoid premature stateful infrastructure. |
| Lovable hosting/tagger | Cloudflare Worker Static Assets | Remove runtime/build dependency after visual migration is stable. |
| Public anti-abuse gap | Turnstile + Worker validation/rate limits | Mandatory on public writes, validated only by server. |
| Ad-hoc logs | Workers Logs/Traces + D1 audit log | Structured operational events; immutable business audit records. |

## 9. Target repository organization

```text
src/
  app/
  components/
  features/
    auth/ membership/ volunteers/ projects/ research/ events/
    alumni/ mentorship/ collaboration/ partners/ certificates/
    opportunities/ content/ admin/
  hooks/ lib/ schemas/ services/ types/
worker/
  index.ts
  app.ts
  auth/
  db/
  email/
  middleware/
  repositories/
  routes/
  services/
  storage/
  validators/
migrations/
docs/
tests/
```

The frontend and Worker share only runtime-neutral schemas and DTO types. Worker code must never be imported into the browser bundle.

## 10. Phased implementation and gates

### Phase 1 — Architecture and Cloudflare foundation

- [x] Audit existing repository, schema, routes, UI, workflows, and vulnerabilities.
- [x] Record the migration/disposition plan before substantial code.
- [x] Add Wrangler 4, Hono, Cloudflare generated binding types, and a strict Worker TypeScript project.
- [x] Add `wrangler.jsonc` for Worker Static Assets, D1, R2, Turnstile config, environment separation, security headers, and observability.
- [x] Add structured API envelopes, request IDs, error middleware, health/readiness endpoints, and API versioning.
- [x] Add D1/R2/Turnstile binding adapters and local development scripts.
- [x] Add an architecture decision record and environment/deployment documentation.
- [x] Add CI foundation and one package manager/lockfile.

**Gate:** generated binding types are current; Worker typecheck/tests/build/dry-run pass; public Vite build remains operational; no secrets are committed.

**Verified 2026-08-20:** clean `npm ci`, generated-type check, frontend and strict Worker typechecks, Worker lint, frontend tests, four Workers-runtime integration tests, both local D1 migrations, Vite 8 production build, Wrangler dry-run bundle, zero known npm audit vulnerabilities, and live health/readiness/deep-link requests all passed.

### Phase 2 — Authentication and account system

- [x] Create D1 account, credential, verification/reset/change-token, session, preference, deletion-request, rate-limit, and encrypted-email-outbox records.
- [x] Require verified email before login and provide safe resend behavior.
- [x] Hash passwords with Worker-native PBKDF2-HMAC-SHA256, per-password salts, and the Cloudflare Web Crypto maximum of 100,000 iterations.
- [x] Add random server-side sessions, secure HttpOnly SameSite cookies, CSRF rotation, origin checks, expiry, and revocation.
- [x] Add password reset, verified email change, logout, logout-all, onboarding, preferences, and reviewable account deletion.
- [x] Protect registration with Turnstile, bounded JSON bodies, Zod validation, fixed-window D1 rate limits, and login lockouts.
- [x] Replace Supabase Auth usage in the SPA while preserving temporary Supabase data-domain compatibility.
- [x] Add encrypted transactional-email outbox and replaceable Cloudflare Email Service dispatcher.
- [x] Add Workers-runtime integration tests for the complete account lifecycle and core security invariants.

**Gate:** unverified accounts cannot log in or perform sensitive submissions; session fixation/reuse tests pass.

**Verified 2026-08-21:** production-strength password hashing, mandatory verification, one-time tokens, secure cookie attributes, CSRF rejection, session revocation, non-enumerating recovery, password-reset revocation, preference writes, and non-destructive deletion requests passed in the Workers runtime. Remote email/domain activation and staging deployment remain an explicit operator step because no Cloudflare API token or confirmed sending domain is available locally.

### Phase 3 — Database and authorization

- [x] Add strict D1 permissions, roles, role-permission mappings, assignments, and command-idempotency records with foreign keys, checks, and indexes.
- [x] Seed 49 granular domain permissions and all 12 required system roles.
- [x] Resolve effective permissions from D1 on every privileged request and enforce explicit route permissions in Worker middleware.
- [x] Add atomic, replay-safe privileged commands for custom roles, assignments, account status, and account archival.
- [x] Write immutable actor/action/entity/reason/metadata/request-ID audit events in the same batch as every privileged mutation.
- [x] Enforce soft deletion/revocation, immutable system roles, non-delegable super-admin authority, and last-active-super-admin protection at the database boundary.
- [x] Add a rate-limited, secret-authenticated, one-time super-admin bootstrap command.
- [x] Replace the legacy admin landing route with a permission-aware RBAC and audit console.
- [x] Add Workers-runtime authorization, denial, replay, conflict, revocation, lifecycle, and database-invariant tests.

**Gate:** every privileged route requires an explicit permission and writes an audit event; last-super-admin protection passes.

**Verified 2026-08-21:** generated bindings, strict frontend/Worker typechecks, zero-warning Worker lint, 11 Workers-runtime tests, all seven local forward migrations, Vite production build, Wrangler dry-run bundle, and high-severity dependency audit passed. Security tests prove permission denial, one-time bootstrap, atomic replay without duplicate audit records, immediate revocation, custom-role lifecycle, non-delegable super-admin authority, immutable system roles, soft deletion, and last-super-admin preservation. Remote migration/bootstrap remain explicit operator actions.

### Phase 4 — Membership and community volunteers

- [x] Add separate membership and volunteer configuration, application, issued-record, renewal, closure, payment-foundation, and sequence-counter tables.
- [x] Preserve account/domain separation and independent member-versus-volunteer identity namespaces.
- [x] Add strict application workflows, transition guards, frozen submitted content, immutable issued identity fields, indexes, foreign keys, and hard-delete protection.
- [x] Replace the browser-owned Supabase join/payment path with authenticated Worker draft, submit, cancellation, renewal, and closure commands.
- [x] Add applicant-owned history APIs and a dedicated `/dashboard/membership` workspace.
- [x] Add `membership.read` and `volunteer.read` administration queues without exposing Phase 5 approval/payment authority.
- [x] Add client-side UX validation and strict server-side validation that rejects unknown privileged fields.
- [x] Add Workers-runtime ownership, permission, idempotency, immutability, namespace, renewal, and closure tests.

**Gate:** users cannot self-approve, forge identity numbers, edit submitted application content, read other applicants, or access administrative queues; member and volunteer histories remain separate and non-destructive.

**Verified 2026-08-21:** current generated bindings, frontend and strict Worker typechecks, zero-warning Worker lint, 1 frontend test, 14 Workers-runtime tests, all nine local forward migrations, Vite production build, Wrangler static-assets/Worker dry run, and high-severity dependency audit passed. Runtime security tests prove strict unknown-field rejection, ownership isolation, permissioned queues, replay-safe draft/submission/cancellation/renewal/closure commands, frozen submitted content, independent identity namespaces, immutable issued IDs, invalid-transition rejection, and hard-delete protection. Remote migration remains an explicit operator action.

### Phase 5 — Payment and approval workflows

- [x] Add immutable review claims, payment requests, finance decisions, and application decisions as single-winner concurrency evidence.
- [x] Snapshot the expected amount and currency from server-owned membership configuration.
- [x] Reject client-supplied amount, currency, payment state, approval state, identity, and unknown privileged fields.
- [x] Add permission-scoped review, payment-request, finance verification/rejection, application approval/rejection, and queue APIs.
- [x] Enforce applicant/reviewer and submitter/verifier separation for self-decisions.
- [x] Allocate member numbers per batch and volunteer numbers per issue year without `MAX()+1`.
- [x] Commit decision, counter, issued record, state, audit events, and idempotency response atomically in D1.
- [x] Add applicant payment UI, administrative workflow controls, and an independent finance queue.
- [x] Add Workers-runtime forged-payment, permission, retry, replay, evidence, immutability, and contention tests.

**Gate:** applicants cannot forge amounts or statuses; managers cannot perform finance verification; self-decisions fail; competing reviewers have one winner; approval requires persisted evidence; issued identities are unique, immutable, and isolated by namespace.

**Verified 2026-08-21:** local migrations `0010` and `0011`, strict Worker and frontend typechecks, zero-warning Worker lint, Worker-runtime workflow integration tests, transactional identity allocation, and evidence guards passed during implementation. The final full Phase 5 gate result is recorded in the Phase 5 implementation report. Remote migration and payment activation remain explicit operator actions; the inherited BDT 300 fee requires owner confirmation.

### Phases 6–20

Proceed in the master brief order: certificates; projects; research; collaboration/partners; people/alumni/mentors; events/courses/opportunities; content; user dashboard; admin operations; notifications/email; hardening; tests; SEO/performance/accessibility; deployment; production acceptance.

Every phase must meet its security, migration, test, accessibility, and rollback gate before the next domain becomes authoritative.

## 11. Migration and cutover strategy

1. Introduce the Worker API alongside the existing UI.
2. Prevent new direct Supabase calls in migrated feature folders.
3. Implement and test a domain in D1.
4. Import a sanitized staging snapshot and compare record counts/invariants.
5. Switch the frontend domain to the Worker API behind a feature flag/config boundary.
6. Observe errors and reconcile differences.
7. Freeze writes in the old domain for the production cutover window.
8. Run final incremental import, verify checksums/invariants, and activate the Worker route.
9. Keep rollback instructions and old read-only data for the agreed retention window.
10. Remove Supabase runtime packages and `supabase/` only after all domains pass acceptance.

## 12. Definition of done

The migration is complete only when the master brief's security, workflow, identity, payment, certificate, storage, accessibility, responsive, SEO, performance, documentation, CI/CD, deep-link, backup, rollback, and production acceptance conditions pass in a Cloudflare staging environment and production no longer depends on Lovable or Supabase.
