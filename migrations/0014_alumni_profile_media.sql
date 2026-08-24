DROP TRIGGER submission_attachments_prevent_delete;
DROP INDEX submission_attachments_submission_idx;

ALTER TABLE submission_attachments RENAME TO submission_attachments_legacy;

CREATE TABLE submission_attachments (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES platform_submissions(id) ON DELETE RESTRICT,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL CHECK (length(original_name) BETWEEN 1 AND 255),
  extension TEXT NOT NULL CHECK (extension IN ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip', 'jpg', 'jpeg', 'png', 'webp')),
  content_type TEXT NOT NULL CHECK (length(content_type) BETWEEN 3 AND 150),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  sha256_hex TEXT NOT NULL CHECK (length(sha256_hex) = 64),
  uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
) STRICT;

INSERT INTO submission_attachments SELECT * FROM submission_attachments_legacy;
DROP TABLE submission_attachments_legacy;

CREATE INDEX submission_attachments_submission_idx ON submission_attachments(submission_id, created_at ASC);

CREATE TRIGGER submission_attachments_prevent_delete
BEFORE DELETE ON submission_attachments
BEGIN
  SELECT RAISE(ABORT, 'submission attachments require archival');
END;

UPDATE platform_settings
SET value_json = '"1.1.0"', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE setting_key = 'platform.submissions.version';
