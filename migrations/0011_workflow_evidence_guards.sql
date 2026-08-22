PRAGMA foreign_keys = ON;

CREATE TRIGGER membership_applications_require_workflow_evidence
BEFORE UPDATE OF status ON membership_applications
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status = 'DRAFT' AND NEW.status IN ('SUBMITTED', 'CANCELLED'))
  OR (OLD.status = 'SUBMITTED' AND NEW.status = 'CANCELLED')
  OR (
    OLD.status = 'SUBMITTED' AND NEW.status = 'UNDER_REVIEW'
    AND EXISTS (SELECT 1 FROM membership_review_claims WHERE application_id = OLD.id)
  )
  OR (
    OLD.status = 'UNDER_REVIEW' AND NEW.status = 'PAYMENT_PENDING'
    AND EXISTS (SELECT 1 FROM membership_payment_requests WHERE application_id = OLD.id)
  )
  OR (
    OLD.status = 'PAYMENT_PENDING' AND NEW.status = 'PAYMENT_VERIFICATION'
    AND EXISTS (
      SELECT 1 FROM membership_payments
      WHERE application_id = OLD.id AND status = 'SUBMITTED'
    )
  )
  OR (
    OLD.status = 'PAYMENT_VERIFICATION' AND NEW.status = 'PAYMENT_PENDING'
    AND EXISTS (
      SELECT 1 FROM membership_payments
      WHERE application_id = OLD.id AND status = 'REJECTED'
    )
  )
  OR (
    NEW.status = 'APPROVED'
    AND EXISTS (
      SELECT 1 FROM membership_application_decisions
      WHERE application_id = OLD.id AND decision = 'APPROVED'
    )
    AND EXISTS (SELECT 1 FROM memberships WHERE application_id = OLD.id)
  )
  OR (
    NEW.status = 'REJECTED'
    AND EXISTS (
      SELECT 1 FROM membership_application_decisions
      WHERE application_id = OLD.id AND decision = 'REJECTED'
    )
  )
  OR (NEW.status = 'CANCELLED' AND OLD.status IN ('UNDER_REVIEW', 'PAYMENT_PENDING'))
)
BEGIN
  SELECT RAISE(ABORT, 'membership application workflow evidence is missing');
END;

CREATE TRIGGER volunteer_applications_require_workflow_evidence
BEFORE UPDATE OF status ON volunteer_applications
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status = 'DRAFT' AND NEW.status IN ('SUBMITTED', 'CANCELLED'))
  OR (OLD.status = 'SUBMITTED' AND NEW.status = 'CANCELLED')
  OR (
    OLD.status = 'SUBMITTED' AND NEW.status = 'UNDER_REVIEW'
    AND EXISTS (SELECT 1 FROM volunteer_review_claims WHERE application_id = OLD.id)
  )
  OR (
    NEW.status = 'APPROVED'
    AND EXISTS (
      SELECT 1 FROM volunteer_application_decisions
      WHERE application_id = OLD.id AND decision = 'APPROVED'
    )
    AND EXISTS (SELECT 1 FROM volunteers WHERE application_id = OLD.id)
  )
  OR (
    NEW.status = 'REJECTED'
    AND EXISTS (
      SELECT 1 FROM volunteer_application_decisions
      WHERE application_id = OLD.id AND decision = 'REJECTED'
    )
  )
  OR (OLD.status = 'UNDER_REVIEW' AND NEW.status = 'CANCELLED')
)
BEGIN
  SELECT RAISE(ABORT, 'volunteer application workflow evidence is missing');
END;

CREATE TRIGGER membership_payments_require_verification_decision
BEFORE UPDATE OF status ON membership_payments
WHEN NEW.status != OLD.status AND NEW.status IN ('VERIFIED', 'REJECTED') AND NOT EXISTS (
  SELECT 1 FROM payment_verification_decisions
  WHERE payment_id = OLD.id AND decision = NEW.status
)
BEGIN
  SELECT RAISE(ABORT, 'payment verification decision is missing');
END;

CREATE TRIGGER membership_review_claims_prevent_update BEFORE UPDATE ON membership_review_claims
BEGIN SELECT RAISE(ABORT, 'membership review claims are immutable'); END;
CREATE TRIGGER volunteer_review_claims_prevent_update BEFORE UPDATE ON volunteer_review_claims
BEGIN SELECT RAISE(ABORT, 'volunteer review claims are immutable'); END;
CREATE TRIGGER membership_payment_requests_prevent_update BEFORE UPDATE ON membership_payment_requests
BEGIN SELECT RAISE(ABORT, 'membership payment requests are immutable'); END;
CREATE TRIGGER payment_verification_decisions_prevent_update BEFORE UPDATE ON payment_verification_decisions
BEGIN SELECT RAISE(ABORT, 'payment decisions are immutable'); END;
CREATE TRIGGER membership_application_decisions_prevent_update BEFORE UPDATE ON membership_application_decisions
BEGIN SELECT RAISE(ABORT, 'membership decisions are immutable'); END;
CREATE TRIGGER volunteer_application_decisions_prevent_update BEFORE UPDATE ON volunteer_application_decisions
BEGIN SELECT RAISE(ABORT, 'volunteer decisions are immutable'); END;
