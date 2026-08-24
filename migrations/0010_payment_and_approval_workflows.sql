PRAGMA foreign_keys = ON;

-- The legacy Join Us screen advertised a BDT 300 club fee. Preserve that value as
-- a server-side configuration snapshot; administrators must confirm it before production.
UPDATE membership_types
SET fee_minor = 30000, currency = 'BDT', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE type_key = 'CLUB_MEMBER' AND payment_required = 1 AND fee_minor IS NULL;

CREATE TABLE membership_review_claims (
  application_id TEXT PRIMARY KEY REFERENCES membership_applications(id) ON DELETE RESTRICT,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  claimed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE volunteer_review_claims (
  application_id TEXT PRIMARY KEY REFERENCES volunteer_applications(id) ON DELETE RESTRICT,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  claimed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE membership_payment_requests (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE REFERENCES membership_applications(id) ON DELETE RESTRICT,
  expected_amount_minor INTEGER NOT NULL CHECK (expected_amount_minor >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

ALTER TABLE membership_payments ADD COLUMN payment_request_id TEXT
  REFERENCES membership_payment_requests(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX membership_payments_one_submitted_application_idx
  ON membership_payments(application_id) WHERE status = 'SUBMITTED';
CREATE UNIQUE INDEX membership_payments_transaction_reference_idx
  ON membership_payments(payment_method, transaction_reference)
  WHERE transaction_reference IS NOT NULL AND status != 'CANCELLED';

CREATE TABLE payment_verification_decisions (
  payment_id TEXT PRIMARY KEY REFERENCES membership_payments(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('VERIFIED', 'REJECTED')),
  decided_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  decided_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE membership_application_decisions (
  application_id TEXT PRIMARY KEY REFERENCES membership_applications(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
  decided_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  decided_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE volunteer_application_decisions (
  application_id TEXT PRIMARY KEY REFERENCES volunteer_applications(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
  decided_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  decided_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

DROP TRIGGER membership_applications_validate_transition;
CREATE TRIGGER membership_applications_validate_transition
BEFORE UPDATE OF status ON membership_applications
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status = 'DRAFT' AND NEW.status IN ('SUBMITTED', 'CANCELLED'))
  OR (OLD.status = 'SUBMITTED' AND NEW.status IN ('UNDER_REVIEW', 'CANCELLED'))
  OR (OLD.status = 'UNDER_REVIEW' AND NEW.status IN ('PAYMENT_PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
  OR (OLD.status = 'PAYMENT_PENDING' AND NEW.status IN ('PAYMENT_VERIFICATION', 'REJECTED', 'CANCELLED'))
  OR (OLD.status = 'PAYMENT_VERIFICATION' AND NEW.status IN ('PAYMENT_PENDING', 'APPROVED', 'REJECTED'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid membership application transition');
END;

CREATE TRIGGER membership_review_claims_validate_insert
BEFORE INSERT ON membership_review_claims
WHEN NOT EXISTS (
  SELECT 1 FROM membership_applications
  WHERE id = NEW.application_id AND status = 'SUBMITTED'
)
BEGIN
  SELECT RAISE(ABORT, 'membership application is not available for review');
END;

CREATE TRIGGER volunteer_review_claims_validate_insert
BEFORE INSERT ON volunteer_review_claims
WHEN NOT EXISTS (
  SELECT 1 FROM volunteer_applications
  WHERE id = NEW.application_id AND status = 'SUBMITTED'
)
BEGIN
  SELECT RAISE(ABORT, 'volunteer application is not available for review');
END;

CREATE TRIGGER membership_payment_requests_validate_insert
BEFORE INSERT ON membership_payment_requests
WHEN NOT EXISTS (
  SELECT 1
  FROM membership_applications ma
  JOIN membership_types mt ON mt.id = ma.membership_type_id
  WHERE ma.id = NEW.application_id
    AND ma.status = 'UNDER_REVIEW'
    AND mt.payment_required = 1
    AND mt.fee_minor IS NOT NULL
    AND NEW.expected_amount_minor = mt.fee_minor
    AND NEW.currency = mt.currency
)
BEGIN
  SELECT RAISE(ABORT, 'membership payment request is not eligible');
END;

CREATE TRIGGER membership_payments_validate_application_submission
BEFORE INSERT ON membership_payments
WHEN NEW.application_id IS NOT NULL AND NOT EXISTS (
  SELECT 1
  FROM membership_payment_requests mpr
  JOIN membership_applications ma ON ma.id = mpr.application_id
  WHERE mpr.id = NEW.payment_request_id
    AND mpr.application_id = NEW.application_id
    AND ma.user_id = NEW.submitted_by
    AND ma.status = 'PAYMENT_PENDING'
    AND NEW.expected_amount_minor = mpr.expected_amount_minor
    AND NEW.currency = mpr.currency
    AND NEW.status = 'SUBMITTED'
)
BEGIN
  SELECT RAISE(ABORT, 'membership payment submission is not eligible');
END;

CREATE TRIGGER payment_verification_decisions_validate_insert
BEFORE INSERT ON payment_verification_decisions
WHEN NOT EXISTS (
  SELECT 1 FROM membership_payments
  WHERE id = NEW.payment_id AND status = 'SUBMITTED'
)
BEGIN
  SELECT RAISE(ABORT, 'payment is not available for verification');
END;

CREATE TRIGGER membership_application_decisions_validate_insert
BEFORE INSERT ON membership_application_decisions
WHEN NOT EXISTS (
  SELECT 1
  FROM membership_applications ma
  JOIN membership_types mt ON mt.id = ma.membership_type_id
  WHERE ma.id = NEW.application_id
    AND (
      (NEW.decision = 'REJECTED' AND ma.status IN ('UNDER_REVIEW', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION'))
      OR (
        NEW.decision = 'APPROVED'
        AND (
          (ma.status = 'UNDER_REVIEW' AND mt.payment_required = 0)
          OR (
            ma.status = 'PAYMENT_VERIFICATION'
            AND EXISTS (
              SELECT 1 FROM membership_payments mp
              WHERE mp.application_id = ma.id AND mp.status = 'VERIFIED'
            )
          )
        )
      )
    )
)
BEGIN
  SELECT RAISE(ABORT, 'membership application decision is not eligible');
END;

CREATE TRIGGER volunteer_application_decisions_validate_insert
BEFORE INSERT ON volunteer_application_decisions
WHEN NOT EXISTS (
  SELECT 1 FROM volunteer_applications
  WHERE id = NEW.application_id AND status = 'UNDER_REVIEW'
)
BEGIN
  SELECT RAISE(ABORT, 'volunteer application decision is not eligible');
END;

CREATE TRIGGER membership_payments_protect_evidence
BEFORE UPDATE OF application_id, renewal_id, payment_request_id, expected_amount_minor,
  currency, payment_method, transaction_reference, submitted_by, submitted_at
ON membership_payments
BEGIN
  SELECT RAISE(ABORT, 'payment evidence fields are immutable');
END;

CREATE TRIGGER membership_review_claims_prevent_delete BEFORE DELETE ON membership_review_claims
BEGIN SELECT RAISE(ABORT, 'membership review claims cannot be hard deleted'); END;
CREATE TRIGGER volunteer_review_claims_prevent_delete BEFORE DELETE ON volunteer_review_claims
BEGIN SELECT RAISE(ABORT, 'volunteer review claims cannot be hard deleted'); END;
CREATE TRIGGER membership_payment_requests_prevent_delete BEFORE DELETE ON membership_payment_requests
BEGIN SELECT RAISE(ABORT, 'membership payment requests cannot be hard deleted'); END;
CREATE TRIGGER payment_verification_decisions_prevent_delete BEFORE DELETE ON payment_verification_decisions
BEGIN SELECT RAISE(ABORT, 'payment decisions cannot be hard deleted'); END;
CREATE TRIGGER membership_application_decisions_prevent_delete BEFORE DELETE ON membership_application_decisions
BEGIN SELECT RAISE(ABORT, 'membership decisions cannot be hard deleted'); END;
CREATE TRIGGER volunteer_application_decisions_prevent_delete BEFORE DELETE ON volunteer_application_decisions
BEGIN SELECT RAISE(ABORT, 'volunteer decisions cannot be hard deleted'); END;

INSERT INTO platform_settings (setting_key, value_json, is_public, description)
VALUES (
  'platform.payments.version',
  '"0.5.0"',
  1,
  'Membership payment verification and approval workflow schema version'
);
