PRAGMA foreign_keys = ON;

CREATE TABLE email_outbox_next (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  template TEXT NOT NULL CHECK (length(template) BETWEEN 3 AND 64),
  recipient_email TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  payload_iv TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  provider_message_id TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sent_at TEXT
) STRICT;

INSERT INTO email_outbox_next
  (id, user_id, template, recipient_email, encrypted_payload, payload_iv, status, attempts,
   next_attempt_at, provider_message_id, last_error, created_at, updated_at, sent_at)
SELECT id, user_id, template, recipient_email, encrypted_payload, payload_iv, status, attempts,
       next_attempt_at, provider_message_id, last_error, created_at, updated_at, sent_at
FROM email_outbox;

DROP TABLE email_outbox;
ALTER TABLE email_outbox_next RENAME TO email_outbox;

CREATE INDEX email_outbox_delivery_idx
  ON email_outbox(status, next_attempt_at, created_at);

CREATE TABLE platform_submissions (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE CHECK (length(reference_code) BETWEEN 12 AND 40),
  submission_type TEXT NOT NULL
    CHECK (submission_type IN ('CONTACT', 'PROJECT', 'RESEARCH', 'COLLABORATION', 'ALUMNI')),
  user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  submitter_name TEXT NOT NULL CHECK (length(submitter_name) BETWEEN 2 AND 100),
  submitter_email TEXT NOT NULL CHECK (length(submitter_email) BETWEEN 3 AND 254),
  submitter_email_normalized TEXT NOT NULL CHECK (submitter_email_normalized = lower(trim(submitter_email_normalized))),
  submitter_phone TEXT CHECK (submitter_phone IS NULL OR length(submitter_phone) BETWEEN 6 AND 32),
  institution TEXT CHECK (institution IS NULL OR length(institution) BETWEEN 2 AND 160),
  department TEXT CHECK (department IS NULL OR length(department) BETWEEN 2 AND 160),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 180),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 3 AND 2000),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json) AND length(payload_json) <= 65536),
  tracking_token_hash TEXT NOT NULL UNIQUE CHECK (length(tracking_token_hash) = 43),
  status TEXT NOT NULL
    CHECK (status IN (
      'EMAIL_VERIFICATION', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION',
      'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ONGOING',
      'COMPLETED', 'HIDDEN', 'ARCHIVED'
    )),
  assigned_reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  public_response TEXT CHECK (public_response IS NULL OR length(public_response) <= 5000),
  internal_notes TEXT CHECK (internal_notes IS NULL OR length(internal_notes) <= 10000),
  email_verified_at TEXT,
  submitted_at TEXT,
  last_status_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT,
  CHECK ((status = 'EMAIL_VERIFICATION' AND email_verified_at IS NULL) OR status != 'EMAIL_VERIFICATION'),
  CHECK ((status = 'ARCHIVED' AND archived_at IS NOT NULL) OR status != 'ARCHIVED')
) STRICT;

CREATE UNIQUE INDEX platform_submissions_user_active_alumni_idx
  ON platform_submissions(user_id)
  WHERE submission_type = 'ALUMNI' AND status != 'ARCHIVED' AND user_id IS NOT NULL;

CREATE INDEX platform_submissions_admin_queue_idx
  ON platform_submissions(submission_type, status, created_at DESC);

CREATE INDEX platform_submissions_user_idx
  ON platform_submissions(user_id, updated_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX platform_submissions_email_idx
  ON platform_submissions(submitter_email_normalized, created_at DESC);

CREATE TABLE submission_verification_tokens (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES platform_submissions(id) ON DELETE RESTRICT,
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 43),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX submission_verification_active_idx
  ON submission_verification_tokens(token_hash, expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE submission_events (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES platform_submissions(id) ON DELETE RESTRICT,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('GUEST', 'USER', 'ADMIN', 'SYSTEM')),
  event_type TEXT NOT NULL CHECK (length(event_type) BETWEEN 3 AND 80),
  from_status TEXT,
  to_status TEXT,
  public_message TEXT CHECK (public_message IS NULL OR length(public_message) <= 5000),
  internal_note TEXT CHECK (internal_note IS NULL OR length(internal_note) <= 10000),
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX submission_events_timeline_idx
  ON submission_events(submission_id, created_at ASC);

CREATE TABLE submission_attachments (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES platform_submissions(id) ON DELETE RESTRICT,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL CHECK (length(original_name) BETWEEN 1 AND 255),
  extension TEXT NOT NULL CHECK (extension IN ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip')),
  content_type TEXT NOT NULL CHECK (length(content_type) BETWEEN 3 AND 150),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  sha256_hex TEXT NOT NULL CHECK (length(sha256_hex) = 64),
  uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
) STRICT;

CREATE INDEX submission_attachments_submission_idx
  ON submission_attachments(submission_id, created_at ASC);

CREATE TABLE user_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notification_type TEXT NOT NULL CHECK (length(notification_type) BETWEEN 3 AND 80),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 180),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 3 AND 1000),
  action_url TEXT CHECK (action_url IS NULL OR length(action_url) <= 500),
  related_entity_type TEXT,
  related_entity_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX user_notifications_inbox_idx
  ON user_notifications(user_id, read_at, created_at DESC);

CREATE VIEW contact_messages AS
SELECT * FROM platform_submissions WHERE submission_type = 'CONTACT';

CREATE VIEW project_submissions AS
SELECT * FROM platform_submissions WHERE submission_type = 'PROJECT';

CREATE VIEW research_submissions AS
SELECT * FROM platform_submissions WHERE submission_type = 'RESEARCH';

CREATE VIEW collaboration_requests AS
SELECT * FROM platform_submissions WHERE submission_type = 'COLLABORATION';

CREATE VIEW alumni_applications AS
SELECT * FROM platform_submissions WHERE submission_type = 'ALUMNI';

CREATE TRIGGER platform_submissions_prevent_delete
BEFORE DELETE ON platform_submissions
BEGIN
  SELECT RAISE(ABORT, 'submissions require archival');
END;

CREATE TRIGGER submission_events_prevent_update
BEFORE UPDATE ON submission_events
BEGIN
  SELECT RAISE(ABORT, 'submission events are immutable');
END;

CREATE TRIGGER submission_events_prevent_delete
BEFORE DELETE ON submission_events
BEGIN
  SELECT RAISE(ABORT, 'submission events are immutable');
END;

CREATE TRIGGER submission_attachments_prevent_delete
BEFORE DELETE ON submission_attachments
BEGIN
  SELECT RAISE(ABORT, 'submission attachments require archival');
END;

INSERT INTO permissions (id, permission_key, category, description) VALUES
  ('permission:submissions.read', 'submissions.read', 'submissions', 'Read public and internal submission records.'),
  ('permission:submissions.manage', 'submissions.manage', 'submissions', 'Review submissions and manage their workflow state.'),
  ('permission:submissions.assign', 'submissions.assign', 'submissions', 'Assign submission reviewers.');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:SUPER_ADMIN', id FROM permissions WHERE category = 'submissions';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:ADMIN', id FROM permissions WHERE category = 'submissions';

INSERT INTO platform_settings (setting_key, value_json, is_public, description)
VALUES (
  'platform.submissions.version',
  '"1.0.0"',
  1,
  'Guest and account submission workflow schema version.'
);
