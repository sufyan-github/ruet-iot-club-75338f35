# ADR 0004: Separate Membership and Volunteer Domains

- **Status:** Accepted
- **Date:** 2026-08-21
- **Decision owners:** RUET IoT Club platform maintainers

## Context

The prototype mixed account profile data, membership application fields, payment submission, approval status, and potential identity information in browser-managed Supabase records. Community volunteers need a different eligibility model and identity namespace. Encoding either state on the account would create authorization, history, renewal, and reporting ambiguity.

## Decision

Accounts remain authentication identities only. Club membership and community volunteering use separate application, issued-record, renewal, closure, and sequence tables. Applications snapshot review-relevant information without turning profile fields into approval authority.

The Worker owns all mutations. Strict schemas reject privileged/unknown fields, D1 triggers enforce workflow transitions and freeze submitted content, and important history cannot be hard-deleted. Self-service commands use CSRF protection, idempotency, atomic audit writes, and ownership checks. Administrative queues use the Phase 3 permission system.

Member and volunteer numbers use independent server-side sequence counters. Phase 4 creates the constraints and namespaces but defers counter allocation to the Phase 5 approval transaction.

## Consequences

- A user may independently apply for and hold both a membership and volunteer identity.
- Changing an account profile cannot approve an application or change an issued identity.
- Application history survives rejection, cancellation, expiration, renewal, and closure.
- Reviewers receive bounded, permission-scoped queues instead of direct database access.
- Phase 5 can add payment and approval commands without reshaping the domain model.
- Some review fields are snapshots and intentionally do not follow later profile changes.

## Alternatives rejected

- **Membership columns on `users` or profiles:** loses history and makes client profile changes security-sensitive.
- **One shared member/volunteer table and counter:** conflates governance and can produce ambiguous public identities.
- **Browser-generated numbers:** races under concurrency and permits forgery.
- **Direct client payment records:** lets the browser choose amount/status before server review.
- **Delete-and-reapply drafts:** destroys accountability; cancellation plus a later new application preserves history.
