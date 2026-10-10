# Membership and Community Volunteer System

**Status:** Phase 5 implemented  
**Schema version:** membership `0.4.0`, payment workflows `0.5.0`  
**API base:** `/api/v1`

## Domain boundary

An account is identity and authentication only. Club membership and community volunteering are separate domain records with separate applications, lifecycle history, renewal/closure requests, and identity namespaces. A person may have both records without either state being copied onto the `users` table.

The platform now owns application drafts, submission, applicant cancellation, self-service history, review claims, payment requests and evidence, finance verification, approval/rejection decisions, transactional identity allocation, and lifecycle requests.

The browser cannot set workflow status, payment status, membership numbers, volunteer numbers, reviewer fields, issue dates, certificate eligibility, or approval data.

## Records

### Membership

- `membership_types` — configurable term, payment requirement, fee snapshot source, and application availability.
- `membership_applications` — applicant snapshots and the full application workflow.
- `memberships` — issued historical identity and term records.
- `membership_payment_requests` — immutable amount/currency snapshots created by an authorized reviewer.
- `membership_payments` — applicant evidence with a server-owned expected amount and finance-owned status.
- `payment_verification_decisions` — insert-once finance decisions.
- `membership_review_claims` and `membership_application_decisions` — insert-once concurrency and decision evidence.
- `membership_renewals` — renewal requests and decision metadata.
- `membership_closure_requests` — member-requested, admin-reviewed closure history.
- `membership_sequence_counters` — one transactional counter per batch; never `MAX()+1`.

### Community volunteers

- `volunteer_programs` — configurable volunteer programs and terms.
- `volunteer_applications` — a workflow independent of club membership.
- `volunteers` — issued volunteer identities and terms.
- `volunteer_renewals` and `volunteer_closure_requests` — lifecycle history.
- `volunteer_sequence_counters` — one counter per issue year, separate from all member counters.
- `volunteer_review_claims` and `volunteer_application_decisions` — immutable review and decision evidence.

## Application workflows

Membership:

```text
DRAFT -> SUBMITTED -> UNDER_REVIEW -> PAYMENT_PENDING
      -> CANCELLED                  -> PAYMENT_VERIFICATION
                                    -> APPROVED
                                    -> REJECTED
```

Volunteer:

```text
DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED
      -> CANCELLED                -> REJECTED
```

D1 triggers reject invalid transitions. Application content is editable only while the record is `DRAFT`; database triggers freeze applicant-controlled fields after submission. The applicant may cancel only a draft or a submitted record. Cancellation preserves the complete record, timestamp, and reason.

Client and Worker validation are both present. Server schemas are strict and reject unknown fields, so attempts to include `membershipNumber`, workflow state, payment state, or other privileged properties fail instead of being silently trusted.

## Identity rules

Membership number target format:

```text
RUET-IOT-{batch}-{sequence}
```

Community volunteer number target format:

```text
RUET-IOT-CV-{issueYear}-{sequence}
```

Only the approval command allocates a sequence and inserts an issued record. Member approval emits `RUET-IOT-{batch}-{sequence}`; volunteer approval emits `RUET-IOT-CV-{twoDigitIssueYear}-{sequence}`. The decision, allocation, counter increment, state transition, exact-number audit event, and idempotency completion share one D1 batch. No placeholder number is created and no query uses `MAX()+1`.

## API

All domain paths require a verified authenticated session. Mutations also require same-origin CSRF validation and an `Idempotency-Key`.

| Method and path | Purpose |
|---|---|
| `GET /membership/types` | List membership types currently accepting applications. |
| `GET /membership/me` | Return the caller's applications, issued memberships, renewals, and closure requests. |
| `PUT /membership/draft` | Create or replace the caller's editable draft. |
| `POST /membership/apply` | Create a submitted application or submit the caller's existing draft. |
| `POST /membership/applications/:applicationId/cancel` | Cancel an owned draft/submitted application with a reason. |
| `POST /membership/applications/:applicationId/payment` | Submit method/reference evidence for a server-created payment request. |
| `POST /membership/renew` | Request renewal for an expiring or expired membership. |
| `POST /membership/closure-request` | Request reviewed closure of a current membership. |
| `GET /volunteers/programs` | List volunteer programs accepting applications. |
| `GET /volunteers/me` | Return the caller's volunteer history. |
| `PUT /volunteers/draft` | Create or replace a volunteer draft. |
| `POST /volunteers/apply` | Submit a volunteer application. |
| `POST /volunteers/applications/:applicationId/cancel` | Cancel an owned volunteer application. |
| `POST /volunteers/renew` | Request volunteer-term renewal when expiring/expired. |
| `POST /volunteers/closure-request` | Request reviewed volunteer closure. |
| `GET /admin/membership/applications` | List a bounded status queue; requires `membership.read`. |
| `GET /admin/volunteers/applications` | List a bounded status queue; requires `volunteer.read`. |
| `POST /admin/membership/applications/:id/start-review` | Claim review; requires `membership.review`. |
| `POST /admin/membership/applications/:id/request-payment` | Snapshot the configured fee; requires `membership.review`. |
| `POST /admin/membership/applications/:id/approve` | Decide and allocate a member identity; requires `membership.approve`. |
| `POST /admin/membership/applications/:id/reject` | Persist a rejection; requires `membership.reject`. |
| `POST /admin/volunteers/applications/:id/start-review` | Claim volunteer review; requires `volunteer.review`. |
| `POST /admin/volunteers/applications/:id/approve` | Decide and allocate a volunteer identity; requires `volunteer.approve`. |
| `POST /admin/volunteers/applications/:id/reject` | Persist volunteer rejection; requires `volunteer.reject`. |
| `GET /admin/membership/payments` | List a bounded payment queue; requires `finance.read`. |
| `POST /admin/membership/payments/:id/verify` | Persist independent verification; requires `finance.verify`. |
| `POST /admin/membership/payments/:id/reject` | Reject evidence and reopen payment submission; requires `finance.verify`. |

All state-changing commands reserve an idempotency record, mutate domain state, write an audit event, and store the response in one D1 batch. A same-key/same-body retry returns the original response; a different body returns a conflict.

## Lifecycle rules

Issued member and volunteer terms use:

```text
ACTIVE -> EXPIRING_SOON -> EXPIRED
   |           |             |
   +-----> RENEWAL_PENDING <-+
   +-----> CLOSURE_REQUESTED -> CLOSED
```

Renewal becomes available only in `EXPIRING_SOON` or `EXPIRED`. The request stores the previous state so Phase 5 can restore it after rejection/cancellation or establish a new term after approval. Closure stores its reason and previous state and requires a later administrative decision. Closed and expired records remain historical records.

## UI

- `/join` now offers separate club-member and community-volunteer forms.
- Applicants can save private drafts, submit declarations, see the current workflow state, and cancel before review begins.
- `/dashboard/membership` displays both namespaces, application history, issued records, renewals, and closure requests.
- `/admin` shows all open workflow states, permission-scoped action controls, and an independent finance queue.
- `/dashboard/membership` displays the server amount and accepts only payment method/reference when payment is pending.
- The legacy dashboard no longer presents Supabase profile state as an authoritative membership ID or approval state.

The Phase 4 join UI no longer writes files, profile membership state, payment methods, transaction IDs, or payment statuses directly to Supabase. R2 application-file uploads will use Worker-issued object keys and metadata when that upload workflow is implemented; no temporary public-storage workaround is used.

## Data protection and audit

Applications contain personal and academic information and are returned only to the owning account or explicitly authorized readers. Queue endpoints are bounded to 100 records and require `membership.read` or `volunteer.read`.

Important records reject hard deletion. Submitted payment evidence, review claims, decisions, payment requests, and issued identity fields reject mutation. Every state-changing command creates a request-ID-linked audit event in the same transactional batch.

## Production owner decision

The default `CLUB_MEMBER` fee is BDT 300 (`30000` minor units), inherited from the previous Join Us interface. It is intentionally documented as provisional. An authorized club owner must confirm the amount, account/payment instructions, accepted methods, and finance operating procedure before remote activation.

## Phase 6 handoff

Phase 6 should implement certificate templates, immutable versions, server-side issuance linked to eligible member/volunteer records, private R2 PDFs, revocation history, and a safe public verification projection. Renewal and closure administrative decisions remain scheduled with later lifecycle operations and must reuse the stored previous-state fields.

Implementation follows Cloudflare's official [D1 batch behavior](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch), [foreign-key guidance](https://developers.cloudflare.com/d1/sql-api/foreign-keys/), [supported SQL behavior](https://developers.cloudflare.com/d1/sql-api/sql-statements/), and [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
