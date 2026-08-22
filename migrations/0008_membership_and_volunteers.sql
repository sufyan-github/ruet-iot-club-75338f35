PRAGMA foreign_keys = ON;

CREATE TABLE membership_types (
  id TEXT PRIMARY KEY,
  type_key TEXT NOT NULL UNIQUE CHECK (length(type_key) BETWEEN 2 AND 64),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 3 AND 500),
  term_months INTEGER NOT NULL DEFAULT 12 CHECK (term_months BETWEEN 1 AND 120),
  payment_required INTEGER NOT NULL DEFAULT 1 CHECK (payment_required IN (0, 1)),
  fee_minor INTEGER CHECK (fee_minor IS NULL OR fee_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK (length(currency) = 3),
  application_enabled INTEGER NOT NULL DEFAULT 1 CHECK (application_enabled IN (0, 1)),
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  deleted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  deletion_reason TEXT,
  CHECK (
    (deleted_at IS NULL AND deleted_by IS NULL AND deletion_reason IS NULL)
    OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND deletion_reason IS NOT NULL)
  )
) STRICT;

CREATE INDEX membership_types_active_idx ON membership_types(deleted_at, application_enabled, type_key);

CREATE TABLE membership_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  membership_type_id TEXT NOT NULL REFERENCES membership_types(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PAYMENT_PENDING',
      'PAYMENT_VERIFICATION', 'APPROVED', 'REJECTED', 'CANCELLED'
    )),
  full_name TEXT CHECK (full_name IS NULL OR length(full_name) BETWEEN 2 AND 100),
  email_snapshot TEXT,
  phone TEXT CHECK (phone IS NULL OR length(phone) BETWEEN 7 AND 30),
  student_id TEXT CHECK (student_id IS NULL OR length(student_id) BETWEEN 3 AND 50),
  department TEXT CHECK (department IS NULL OR length(department) BETWEEN 2 AND 100),
  batch TEXT CHECK (batch IS NULL OR length(batch) BETWEEN 2 AND 30),
  academic_session TEXT CHECK (academic_session IS NULL OR length(academic_session) BETWEEN 2 AND 30),
  gender TEXT CHECK (gender IS NULL OR gender IN ('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY')),
  address TEXT CHECK (address IS NULL OR length(address) <= 500),
  skills_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(skills_json) AND json_type(skills_json) = 'array'),
  interests_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(interests_json) AND json_type(interests_json) = 'array'),
  experience TEXT CHECK (experience IS NULL OR length(experience) <= 2000),
  motivation TEXT CHECK (motivation IS NULL OR length(motivation) <= 3000),
  portfolio_url TEXT CHECK (portfolio_url IS NULL OR length(portfolio_url) <= 500),
  github_url TEXT CHECK (github_url IS NULL OR length(github_url) <= 500),
  linkedin_url TEXT CHECK (linkedin_url IS NULL OR length(linkedin_url) <= 500),
  time_commitment TEXT CHECK (time_commitment IS NULL OR length(time_commitment) <= 100),
  declaration_accepted INTEGER NOT NULL DEFAULT 0 CHECK (declaration_accepted IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  submitted_at TEXT,
  review_started_at TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  decision_at TEXT,
  decision_reason TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  CHECK (
    status IN ('DRAFT', 'CANCELLED')
    OR (
      full_name IS NOT NULL AND email_snapshot IS NOT NULL AND phone IS NOT NULL
      AND student_id IS NOT NULL AND department IS NOT NULL AND batch IS NOT NULL
      AND json_array_length(skills_json) > 0 AND json_array_length(interests_json) > 0
      AND motivation IS NOT NULL AND length(motivation) >= 20
      AND time_commitment IS NOT NULL AND declaration_accepted = 1 AND submitted_at IS NOT NULL
    )
  ),
  CHECK (
    (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)
    OR status != 'CANCELLED'
  )
) STRICT;

CREATE UNIQUE INDEX membership_applications_one_open_idx
  ON membership_applications(user_id)
  WHERE status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION');
CREATE INDEX membership_applications_user_created_idx ON membership_applications(user_id, created_at DESC);
CREATE INDEX membership_applications_status_created_idx ON membership_applications(status, created_at ASC);
CREATE INDEX membership_applications_batch_status_idx ON membership_applications(batch, status);
CREATE INDEX membership_applications_student_idx ON membership_applications(student_id);

CREATE TABLE memberships (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE REFERENCES membership_applications(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  membership_type_id TEXT NOT NULL REFERENCES membership_types(id) ON DELETE RESTRICT,
  membership_number TEXT NOT NULL UNIQUE CHECK (length(membership_number) BETWEEN 8 AND 64),
  batch TEXT NOT NULL CHECK (length(batch) BETWEEN 2 AND 30),
  issue_date TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'RENEWAL_PENDING', 'EXPIRED', 'CLOSURE_REQUESTED', 'CLOSED')),
  certificate_eligible INTEGER NOT NULL DEFAULT 0 CHECK (certificate_eligible IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at TEXT,
  closed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  closure_reason TEXT,
  CHECK (end_date > start_date),
  CHECK (
    (status = 'CLOSED' AND closed_at IS NOT NULL AND closed_by IS NOT NULL AND closure_reason IS NOT NULL)
    OR status != 'CLOSED'
  )
) STRICT;

CREATE UNIQUE INDEX memberships_one_nonclosed_per_user_idx
  ON memberships(user_id) WHERE status != 'CLOSED';
CREATE INDEX memberships_user_created_idx ON memberships(user_id, created_at DESC);
CREATE INDEX memberships_batch_number_idx ON memberships(batch, membership_number);
CREATE INDEX memberships_status_end_idx ON memberships(status, end_date);

CREATE TABLE membership_sequence_counters (
  batch TEXT PRIMARY KEY CHECK (length(batch) BETWEEN 2 AND 30),
  next_value INTEGER NOT NULL DEFAULT 1 CHECK (next_value >= 1),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE membership_renewals (
  id TEXT PRIMARY KEY,
  membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE RESTRICT,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  proposed_start_date TEXT,
  proposed_end_date TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  decision_at TEXT,
  decision_reason TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  CHECK (proposed_end_date IS NULL OR proposed_start_date IS NULL OR proposed_end_date > proposed_start_date)
) STRICT;

CREATE UNIQUE INDEX membership_renewals_one_open_idx
  ON membership_renewals(membership_id)
  WHERE status IN ('REQUESTED', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION');
CREATE INDEX membership_renewals_status_requested_idx ON membership_renewals(status, requested_at);

CREATE TABLE membership_closure_requests (
  id TEXT PRIMARY KEY,
  membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE RESTRICT,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'ADMIN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  decision_at TEXT,
  decision_reason TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT
) STRICT;

CREATE UNIQUE INDEX membership_closure_one_open_idx
  ON membership_closure_requests(membership_id)
  WHERE status IN ('REQUESTED', 'ADMIN_REVIEW');
CREATE INDEX membership_closure_status_requested_idx ON membership_closure_requests(status, requested_at);

CREATE TABLE membership_payments (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES membership_applications(id) ON DELETE RESTRICT,
  renewal_id TEXT REFERENCES membership_renewals(id) ON DELETE RESTRICT,
  expected_amount_minor INTEGER NOT NULL CHECK (expected_amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK (length(currency) = 3),
  payment_method TEXT NOT NULL CHECK (length(payment_method) BETWEEN 2 AND 50),
  transaction_reference TEXT CHECK (transaction_reference IS NULL OR length(transaction_reference) BETWEEN 3 AND 200),
  status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'VERIFIED', 'REJECTED', 'CANCELLED')),
  submitted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  verified_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  verified_at TEXT,
  verification_reason TEXT,
  CHECK ((application_id IS NOT NULL) != (renewal_id IS NOT NULL)),
  CHECK (
    (status IN ('VERIFIED', 'REJECTED') AND verified_by IS NOT NULL AND verified_at IS NOT NULL AND verification_reason IS NOT NULL)
    OR status NOT IN ('VERIFIED', 'REJECTED')
  )
) STRICT;

CREATE INDEX membership_payments_application_idx ON membership_payments(application_id, submitted_at DESC);
CREATE INDEX membership_payments_renewal_idx ON membership_payments(renewal_id, submitted_at DESC);
CREATE INDEX membership_payments_status_idx ON membership_payments(status, submitted_at);

CREATE TABLE volunteer_programs (
  id TEXT PRIMARY KEY,
  program_key TEXT NOT NULL UNIQUE CHECK (length(program_key) BETWEEN 2 AND 64),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 3 AND 500),
  term_months INTEGER NOT NULL DEFAULT 12 CHECK (term_months BETWEEN 1 AND 120),
  application_enabled INTEGER NOT NULL DEFAULT 1 CHECK (application_enabled IN (0, 1)),
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  deleted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  deletion_reason TEXT,
  CHECK (
    (deleted_at IS NULL AND deleted_by IS NULL AND deletion_reason IS NULL)
    OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND deletion_reason IS NOT NULL)
  )
) STRICT;

CREATE INDEX volunteer_programs_active_idx ON volunteer_programs(deleted_at, application_enabled, program_key);

CREATE TABLE volunteer_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  volunteer_program_id TEXT NOT NULL REFERENCES volunteer_programs(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')),
  full_name TEXT CHECK (full_name IS NULL OR length(full_name) BETWEEN 2 AND 100),
  email_snapshot TEXT,
  phone TEXT CHECK (phone IS NULL OR length(phone) BETWEEN 7 AND 30),
  organization TEXT CHECK (organization IS NULL OR length(organization) <= 150),
  department TEXT CHECK (department IS NULL OR length(department) <= 100),
  batch TEXT CHECK (batch IS NULL OR length(batch) <= 30),
  address TEXT CHECK (address IS NULL OR length(address) <= 500),
  skills_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(skills_json) AND json_type(skills_json) = 'array'),
  interests_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(interests_json) AND json_type(interests_json) = 'array'),
  experience TEXT CHECK (experience IS NULL OR length(experience) <= 2000),
  motivation TEXT CHECK (motivation IS NULL OR length(motivation) <= 3000),
  portfolio_url TEXT CHECK (portfolio_url IS NULL OR length(portfolio_url) <= 500),
  github_url TEXT CHECK (github_url IS NULL OR length(github_url) <= 500),
  linkedin_url TEXT CHECK (linkedin_url IS NULL OR length(linkedin_url) <= 500),
  time_commitment TEXT CHECK (time_commitment IS NULL OR length(time_commitment) <= 100),
  declaration_accepted INTEGER NOT NULL DEFAULT 0 CHECK (declaration_accepted IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  submitted_at TEXT,
  review_started_at TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  decision_at TEXT,
  decision_reason TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  CHECK (
    status IN ('DRAFT', 'CANCELLED')
    OR (
      full_name IS NOT NULL AND email_snapshot IS NOT NULL AND phone IS NOT NULL
      AND json_array_length(skills_json) > 0 AND json_array_length(interests_json) > 0
      AND motivation IS NOT NULL AND length(motivation) >= 20
      AND time_commitment IS NOT NULL AND declaration_accepted = 1 AND submitted_at IS NOT NULL
    )
  ),
  CHECK (
    (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)
    OR status != 'CANCELLED'
  )
) STRICT;

CREATE UNIQUE INDEX volunteer_applications_one_open_idx
  ON volunteer_applications(user_id)
  WHERE status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW');
CREATE INDEX volunteer_applications_user_created_idx ON volunteer_applications(user_id, created_at DESC);
CREATE INDEX volunteer_applications_status_created_idx ON volunteer_applications(status, created_at ASC);

CREATE TABLE volunteers (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE REFERENCES volunteer_applications(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  volunteer_program_id TEXT NOT NULL REFERENCES volunteer_programs(id) ON DELETE RESTRICT,
  volunteer_number TEXT NOT NULL UNIQUE CHECK (length(volunteer_number) BETWEEN 8 AND 64),
  issue_year INTEGER NOT NULL CHECK (issue_year BETWEEN 2000 AND 9999),
  issue_date TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'RENEWAL_PENDING', 'EXPIRED', 'CLOSURE_REQUESTED', 'CLOSED')),
  certificate_eligible INTEGER NOT NULL DEFAULT 0 CHECK (certificate_eligible IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at TEXT,
  closed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  closure_reason TEXT,
  CHECK (end_date > start_date),
  CHECK (
    (status = 'CLOSED' AND closed_at IS NOT NULL AND closed_by IS NOT NULL AND closure_reason IS NOT NULL)
    OR status != 'CLOSED'
  )
) STRICT;

CREATE UNIQUE INDEX volunteers_one_nonclosed_per_user_idx
  ON volunteers(user_id) WHERE status != 'CLOSED';
CREATE INDEX volunteers_user_created_idx ON volunteers(user_id, created_at DESC);
CREATE INDEX volunteers_year_number_idx ON volunteers(issue_year, volunteer_number);
CREATE INDEX volunteers_status_end_idx ON volunteers(status, end_date);

CREATE TABLE volunteer_sequence_counters (
  issue_year INTEGER PRIMARY KEY CHECK (issue_year BETWEEN 2000 AND 9999),
  next_value INTEGER NOT NULL DEFAULT 1 CHECK (next_value >= 1),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE volunteer_renewals (
  id TEXT PRIMARY KEY,
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE RESTRICT,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  proposed_start_date TEXT,
  proposed_end_date TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  decision_at TEXT,
  decision_reason TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  CHECK (proposed_end_date IS NULL OR proposed_start_date IS NULL OR proposed_end_date > proposed_start_date)
) STRICT;

CREATE UNIQUE INDEX volunteer_renewals_one_open_idx
  ON volunteer_renewals(volunteer_id) WHERE status = 'REQUESTED';
CREATE INDEX volunteer_renewals_status_requested_idx ON volunteer_renewals(status, requested_at);

CREATE TABLE volunteer_closure_requests (
  id TEXT PRIMARY KEY,
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE RESTRICT,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'ADMIN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  decision_at TEXT,
  decision_reason TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT
) STRICT;

CREATE UNIQUE INDEX volunteer_closure_one_open_idx
  ON volunteer_closure_requests(volunteer_id)
  WHERE status IN ('REQUESTED', 'ADMIN_REVIEW');
CREATE INDEX volunteer_closure_status_requested_idx ON volunteer_closure_requests(status, requested_at);

INSERT INTO membership_types (
  id, type_key, name, description, term_months, payment_required, fee_minor, currency
) VALUES (
  'membership-type:CLUB_MEMBER',
  'CLUB_MEMBER',
  'Club Membership',
  'One-year RUET IoT Club membership. The fee is confirmed by administrators before payment.',
  12,
  1,
  NULL,
  'BDT'
);

INSERT INTO volunteer_programs (
  id, program_key, name, description, term_months
) VALUES (
  'volunteer-program:COMMUNITY_VOLUNTEER',
  'COMMUNITY_VOLUNTEER',
  'Community Volunteer',
  'One-year community volunteer program with an identity namespace separate from club membership.',
  12
);

CREATE TRIGGER membership_applications_validate_transition
BEFORE UPDATE OF status ON membership_applications
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status = 'DRAFT' AND NEW.status IN ('SUBMITTED', 'CANCELLED'))
  OR (OLD.status = 'SUBMITTED' AND NEW.status IN ('UNDER_REVIEW', 'CANCELLED'))
  OR (OLD.status = 'UNDER_REVIEW' AND NEW.status IN ('PAYMENT_PENDING', 'REJECTED', 'CANCELLED'))
  OR (OLD.status = 'PAYMENT_PENDING' AND NEW.status IN ('PAYMENT_VERIFICATION', 'CANCELLED'))
  OR (OLD.status = 'PAYMENT_VERIFICATION' AND NEW.status IN ('APPROVED', 'REJECTED'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid membership application transition');
END;

CREATE TRIGGER volunteer_applications_validate_transition
BEFORE UPDATE OF status ON volunteer_applications
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status = 'DRAFT' AND NEW.status IN ('SUBMITTED', 'CANCELLED'))
  OR (OLD.status = 'SUBMITTED' AND NEW.status IN ('UNDER_REVIEW', 'CANCELLED'))
  OR (OLD.status = 'UNDER_REVIEW' AND NEW.status IN ('APPROVED', 'REJECTED', 'CANCELLED'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid volunteer application transition');
END;

CREATE TRIGGER membership_applications_freeze_submitted_content
BEFORE UPDATE OF
  membership_type_id, full_name, email_snapshot, phone, student_id, department, batch,
  academic_session, gender, address, skills_json, interests_json, experience, motivation,
  portfolio_url, github_url, linkedin_url, time_commitment, declaration_accepted
ON membership_applications
WHEN OLD.status != 'DRAFT'
BEGIN
  SELECT RAISE(ABORT, 'submitted membership application content is immutable');
END;

CREATE TRIGGER volunteer_applications_freeze_submitted_content
BEFORE UPDATE OF
  volunteer_program_id, full_name, email_snapshot, phone, organization, department, batch,
  address, skills_json, interests_json, experience, motivation, portfolio_url, github_url,
  linkedin_url, time_commitment, declaration_accepted
ON volunteer_applications
WHEN OLD.status != 'DRAFT'
BEGIN
  SELECT RAISE(ABORT, 'submitted volunteer application content is immutable');
END;

CREATE TRIGGER memberships_prevent_identity_mutation
BEFORE UPDATE OF application_id, user_id, membership_type_id, membership_number, batch, issue_date ON memberships
BEGIN
  SELECT RAISE(ABORT, 'membership identity fields are immutable');
END;

CREATE TRIGGER volunteers_prevent_identity_mutation
BEFORE UPDATE OF application_id, user_id, volunteer_program_id, volunteer_number, issue_year, issue_date ON volunteers
BEGIN
  SELECT RAISE(ABORT, 'volunteer identity fields are immutable');
END;

CREATE TRIGGER membership_types_prevent_delete BEFORE DELETE ON membership_types
BEGIN SELECT RAISE(ABORT, 'membership types require soft deletion'); END;
CREATE TRIGGER membership_applications_prevent_delete BEFORE DELETE ON membership_applications
BEGIN SELECT RAISE(ABORT, 'membership applications cannot be hard deleted'); END;
CREATE TRIGGER memberships_prevent_delete BEFORE DELETE ON memberships
BEGIN SELECT RAISE(ABORT, 'memberships cannot be hard deleted'); END;
CREATE TRIGGER membership_renewals_prevent_delete BEFORE DELETE ON membership_renewals
BEGIN SELECT RAISE(ABORT, 'membership renewals cannot be hard deleted'); END;
CREATE TRIGGER membership_closure_prevent_delete BEFORE DELETE ON membership_closure_requests
BEGIN SELECT RAISE(ABORT, 'membership closure requests cannot be hard deleted'); END;
CREATE TRIGGER membership_payments_prevent_delete BEFORE DELETE ON membership_payments
BEGIN SELECT RAISE(ABORT, 'membership payments cannot be hard deleted'); END;
CREATE TRIGGER volunteer_programs_prevent_delete BEFORE DELETE ON volunteer_programs
BEGIN SELECT RAISE(ABORT, 'volunteer programs require soft deletion'); END;
CREATE TRIGGER volunteer_applications_prevent_delete BEFORE DELETE ON volunteer_applications
BEGIN SELECT RAISE(ABORT, 'volunteer applications cannot be hard deleted'); END;
CREATE TRIGGER volunteers_prevent_delete BEFORE DELETE ON volunteers
BEGIN SELECT RAISE(ABORT, 'volunteers cannot be hard deleted'); END;
CREATE TRIGGER volunteer_renewals_prevent_delete BEFORE DELETE ON volunteer_renewals
BEGIN SELECT RAISE(ABORT, 'volunteer renewals cannot be hard deleted'); END;
CREATE TRIGGER volunteer_closure_prevent_delete BEFORE DELETE ON volunteer_closure_requests
BEGIN SELECT RAISE(ABORT, 'volunteer closure requests cannot be hard deleted'); END;

INSERT INTO platform_settings (setting_key, value_json, is_public, description)
VALUES (
  'platform.membership.version',
  '"0.4.0"',
  1,
  'Membership and community volunteer domain schema version'
);
