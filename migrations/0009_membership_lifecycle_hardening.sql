PRAGMA foreign_keys = ON;

ALTER TABLE membership_renewals ADD COLUMN previous_membership_status TEXT
  CHECK (previous_membership_status IS NULL OR previous_membership_status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED'));
ALTER TABLE membership_closure_requests ADD COLUMN previous_membership_status TEXT
  CHECK (previous_membership_status IS NULL OR previous_membership_status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED'));
ALTER TABLE volunteer_renewals ADD COLUMN previous_volunteer_status TEXT
  CHECK (previous_volunteer_status IS NULL OR previous_volunteer_status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED'));
ALTER TABLE volunteer_closure_requests ADD COLUMN previous_volunteer_status TEXT
  CHECK (previous_volunteer_status IS NULL OR previous_volunteer_status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED'));

CREATE TRIGGER memberships_validate_transition
BEFORE UPDATE OF status ON memberships
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status = 'ACTIVE' AND NEW.status IN ('EXPIRING_SOON', 'EXPIRED', 'RENEWAL_PENDING', 'CLOSURE_REQUESTED'))
  OR (OLD.status = 'EXPIRING_SOON' AND NEW.status IN ('ACTIVE', 'EXPIRED', 'RENEWAL_PENDING', 'CLOSURE_REQUESTED'))
  OR (OLD.status = 'EXPIRED' AND NEW.status IN ('RENEWAL_PENDING', 'CLOSURE_REQUESTED'))
  OR (OLD.status = 'RENEWAL_PENDING' AND NEW.status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED'))
  OR (OLD.status = 'CLOSURE_REQUESTED' AND NEW.status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CLOSED'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid membership lifecycle transition');
END;

CREATE TRIGGER volunteers_validate_transition
BEFORE UPDATE OF status ON volunteers
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status = 'ACTIVE' AND NEW.status IN ('EXPIRING_SOON', 'EXPIRED', 'RENEWAL_PENDING', 'CLOSURE_REQUESTED'))
  OR (OLD.status = 'EXPIRING_SOON' AND NEW.status IN ('ACTIVE', 'EXPIRED', 'RENEWAL_PENDING', 'CLOSURE_REQUESTED'))
  OR (OLD.status = 'EXPIRED' AND NEW.status IN ('RENEWAL_PENDING', 'CLOSURE_REQUESTED'))
  OR (OLD.status = 'RENEWAL_PENDING' AND NEW.status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED'))
  OR (OLD.status = 'CLOSURE_REQUESTED' AND NEW.status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CLOSED'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid volunteer lifecycle transition');
END;
