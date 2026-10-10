# ADR-007: Connected event lifecycle on the existing Cloudflare platform

- Status: Accepted
- Date: 2026-08-22

## Context

The platform already stores canonical event content in `managed_events`, keeps a compatibility copy in `website_content_items`, stores registrations in `event_registrations`, routes course and event payments through `learning_payments`, mirrors verified payments into finance through existing D1 triggers, and issues certificates through one certificate sequence and verification system.

Building separate event, payment, finance, attendance, notification, media, or certificate subsystems would split the source of truth and make existing records unreliable.

## Decision

1. `managed_events` remains the canonical event record. `website_content_items` remains a transactional compatibility mirror for older readers.
2. A dedicated `/api/v1/admin/events` API validates the complete event model and prevents the generic community editor from dropping event-only settings.
3. Media references remain R2-backed Media Library URLs; no binary data or third-party storage is introduced.
4. Internal registrations remain in `event_registrations`; paid registrations create one `learning_payments` row. Existing finance triggers remain the only finance integration.
5. Registration and payment changes append immutable domain-history records as well as the platform audit entry.
6. Event certificates use the existing `certificate_requests`, `certificates`, sequence, public verification, and generator workflow with `domain_type='EVENT'` metadata.
7. Existing IDs and records are preserved. Deletion is archival, and operational histories remain immutable.

## Consequences

- Existing event URLs, routes, permissions, registration records, payments, finance transactions, and certificates remain compatible.
- Deployment requires migration `0024_event_lifecycle_upgrade.sql` before the Worker using the new columns is activated.
- Rollback of Worker code is safe after migration because all schema changes are additive and legacy fields remain populated.
- Event certificate identity still uses the historical `course_id` and `enrollment_id` compatibility foreign keys while explicit event foreign keys remove ambiguity for new code.
