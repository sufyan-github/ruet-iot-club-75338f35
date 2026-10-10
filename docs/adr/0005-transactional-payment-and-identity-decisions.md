# ADR 0005: Transactional Payment and Identity Decisions

- **Status:** Accepted
- **Date:** 2026-08-21
- **Decision owners:** RUET IoT Club platform maintainers

## Context

Payment verification, application approval, and identity allocation are high-contention privileged actions. A conditional D1 update that affects no rows does not by itself prove that an actor won a race. Reading a sequence and writing it in separate operations can duplicate numbers. Letting the browser supply an amount or status permits payment forgery.

## Decision

Each review claim, finance decision, and application decision is represented by an insert-once row protected by a primary or unique key. A competing command fails its D1 batch and therefore cannot write an audit event or idempotent success response.

Payment requests snapshot the amount and currency from `membership_types`. Applicant submissions contain only a method and transaction reference. D1 triggers require the snapshot, applicant ownership, current workflow state, and an independent verification decision before approval.

Approval inserts the decision, initializes the relevant counter, inserts the issued identity using the counter, increments the counter, transitions the application, writes both decision and exact-identity audit events, and completes the idempotency record in one D1 batch. Member counters are keyed by RUET batch; volunteer counters are keyed by UTC issue year. No workflow uses `MAX()+1`.

## Consequences

- Review and finance races have a single persisted winner.
- A client cannot choose the expected amount, currency, payment status, sequence, or identity number.
- Rejected payment evidence remains immutable and a new submission may be added.
- Member and volunteer identity namespaces cannot consume each other's counters.
- Database triggers reject privileged state changes that lack the corresponding claim, request, decision, payment, or issued record.
- The default BDT 300 fee is inherited from the legacy Join Us screen and must be confirmed by an authorized owner before production activation.

## Alternatives rejected

- **Conditional updates alone:** a zero-row update may not fail the surrounding command.
- **Pre-reading a counter in the Worker:** creates a race between read and write.
- **`MAX(identity_number) + 1`:** unsafe under concurrency and couples allocation to historical parsing.
- **Browser-supplied amount/status:** makes finance authority forgeable.
- **Mutable decision rows:** destroys the historical evidence required for audit and dispute handling.
