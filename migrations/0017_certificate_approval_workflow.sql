PRAGMA foreign_keys = ON;

CREATE TABLE certificate_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES website_content_items(id) ON DELETE RESTRICT,
  enrollment_id TEXT NOT NULL REFERENCES website_submissions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('ELIGIBLE', 'REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ISSUED')),
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reviewed_at TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, course_id),
  UNIQUE (enrollment_id),
  CHECK (status != 'REJECTED' OR length(rejection_reason) >= 3)
) STRICT;

CREATE INDEX certificate_requests_queue_idx
  ON certificate_requests(status, requested_at DESC);

CREATE TABLE certificate_sequences (
  year INTEGER PRIMARY KEY,
  next_value INTEGER NOT NULL DEFAULT 1 CHECK (next_value > 0)
) STRICT;

CREATE TABLE certificates (
  id TEXT PRIMARY KEY,
  certificate_number TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL UNIQUE REFERENCES certificate_requests(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES website_content_items(id) ON DELETE RESTRICT,
  enrollment_id TEXT NOT NULL REFERENCES website_submissions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'REVOKED')),
  holder_name TEXT NOT NULL CHECK (length(holder_name) BETWEEN 1 AND 200),
  course_title TEXT NOT NULL CHECK (length(course_title) BETWEEN 1 AND 240),
  completion_date TEXT NOT NULL,
  issued_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  issued_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  certificate_url TEXT NOT NULL,
  revoked_at TEXT,
  revoked_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  revocation_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (status != 'REVOKED' OR (revoked_at IS NOT NULL AND length(revocation_reason) >= 3))
) STRICT;

CREATE INDEX certificates_owner_idx ON certificates(user_id, issued_at DESC);
CREATE INDEX certificates_course_idx ON certificates(course_id, issued_at DESC);

CREATE TRIGGER certificates_immutable_identity
BEFORE UPDATE OF certificate_number, request_id, user_id, course_id, enrollment_id,
  holder_name, course_title, completion_date, issued_at, issued_by, certificate_url
ON certificates
BEGIN
  SELECT RAISE(ABORT, 'issued certificate identity is immutable');
END;

CREATE TRIGGER certificates_prevent_delete
BEFORE DELETE ON certificates
BEGIN
  SELECT RAISE(ABORT, 'certificates cannot be deleted; revoke the certificate instead');
END;

CREATE TRIGGER certificate_requests_prevent_delete
BEFORE DELETE ON certificate_requests
BEGIN
  SELECT RAISE(ABORT, 'certificate requests are retained for audit history');
END;
