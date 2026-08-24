PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN is_fixed_super_admin INTEGER NOT NULL DEFAULT 0
  CHECK (is_fixed_super_admin IN (0, 1));

ALTER TABLE password_credentials ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0
  CHECK (must_change_password IN (0, 1));

CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  data_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE website_content_items (
  id TEXT PRIMARY KEY,
  collection_key TEXT NOT NULL CHECK (length(collection_key) BETWEEN 2 AND 64),
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  updated_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT,
  archived_at TEXT,
  CHECK ((status = 'PUBLISHED' AND published_at IS NOT NULL) OR status != 'PUBLISHED'),
  CHECK ((status = 'ARCHIVED' AND archived_at IS NOT NULL) OR status != 'ARCHIVED')
) STRICT;

CREATE INDEX website_content_public_idx
  ON website_content_items(collection_key, status, sort_order, created_at DESC);

CREATE TABLE website_submissions (
  id TEXT PRIMARY KEY,
  submission_type TEXT NOT NULL CHECK (length(submission_type) BETWEEN 2 AND 64),
  submitted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX website_submissions_queue_idx
  ON website_submissions(submission_type, status, created_at DESC);

CREATE TABLE website_media_objects (
  object_key TEXT PRIMARY KEY,
  original_name TEXT NOT NULL CHECK (length(original_name) BETWEEN 1 AND 255),
  content_type TEXT NOT NULL CHECK (length(content_type) BETWEEN 3 AND 100),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
) STRICT;

CREATE TRIGGER users_fixed_super_admin_allowlist_insert
BEFORE INSERT ON users
WHEN NEW.is_fixed_super_admin = 1
  AND NEW.primary_email_normalized NOT IN ('ruetiotclub@gmail.com', 'abusufyan.cse20@gmail.com')
BEGIN
  SELECT RAISE(ABORT, 'fixed super administrator email is not allowlisted');
END;

CREATE TRIGGER users_fixed_super_admin_allowlist_update
BEFORE UPDATE OF is_fixed_super_admin ON users
WHEN NEW.is_fixed_super_admin = 1
  AND NEW.primary_email_normalized NOT IN ('ruetiotclub@gmail.com', 'abusufyan.cse20@gmail.com')
BEGIN
  SELECT RAISE(ABORT, 'fixed super administrator email is not allowlisted');
END;

CREATE TRIGGER users_protect_fixed_super_admin
BEFORE UPDATE OF primary_email, primary_email_normalized, status, deleted_at, is_fixed_super_admin ON users
WHEN OLD.is_fixed_super_admin = 1
  AND (
    NEW.primary_email != OLD.primary_email
    OR NEW.primary_email_normalized != OLD.primary_email_normalized
    OR NEW.status != 'EMAIL_VERIFIED'
    OR NEW.deleted_at IS NOT NULL
    OR NEW.is_fixed_super_admin != 1
  )
BEGIN
  SELECT RAISE(ABORT, 'fixed super administrator account is immutable');
END;

CREATE TRIGGER user_roles_protect_fixed_super_admin
BEFORE UPDATE OF revoked_at, expires_at ON user_roles
WHEN OLD.role_id = 'role:SUPER_ADMIN'
  AND EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id AND is_fixed_super_admin = 1)
  AND (NEW.revoked_at IS NOT NULL OR NEW.expires_at IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'fixed super administrator role cannot be revoked or expired');
END;

DROP TRIGGER user_roles_prevent_repeated_system_bootstrap;

CREATE TRIGGER user_roles_prevent_repeated_system_bootstrap
BEFORE INSERT ON user_roles
WHEN NEW.role_id = 'role:SUPER_ADMIN'
  AND NEW.granted_by IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM users target
    WHERE target.id = NEW.user_id AND target.is_fixed_super_admin = 1
  )
  AND EXISTS (
    SELECT 1
    FROM user_roles existing
    JOIN users account ON account.id = existing.user_id
    WHERE existing.role_id = 'role:SUPER_ADMIN'
      AND existing.revoked_at IS NULL
      AND (existing.expires_at IS NULL OR existing.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      AND account.status = 'EMAIL_VERIFIED'
      AND account.deleted_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'authorization bootstrap has already completed');
END;

CREATE TRIGGER website_content_prevent_delete
BEFORE DELETE ON website_content_items
BEGIN
  SELECT RAISE(ABORT, 'website content requires archival');
END;

CREATE TRIGGER website_media_prevent_delete
BEFORE DELETE ON website_media_objects
BEGIN
  SELECT RAISE(ABORT, 'website media requires archival');
END;

INSERT INTO platform_settings (setting_key, value_json, is_public, description)
VALUES (
  'platform.storage.runtime',
  '{"database":"Cloudflare D1","objects":"Cloudflare R2","legacySupabase":false}',
  1,
  'Authoritative production storage providers.'
);

UPDATE platform_settings
SET value_json = '"0.4.0"', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE setting_key = 'platform.authorization.version';
