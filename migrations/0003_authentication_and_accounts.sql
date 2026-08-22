PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  primary_email TEXT NOT NULL,
  primary_email_normalized TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 2 AND 100),
  status TEXT NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION'
    CHECK (status IN ('PENDING_EMAIL_VERIFICATION', 'EMAIL_VERIFIED', 'SUSPENDED', 'DELETION_REQUESTED', 'DELETED')),
  onboarding_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (onboarding_status IN ('PENDING', 'COMPLETED', 'DISMISSED')),
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT
) STRICT;

CREATE INDEX users_status_created_idx ON users(status, created_at DESC);

CREATE TABLE password_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TEXT
) STRICT;

CREATE TABLE email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_normalized TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX email_verification_tokens_user_idx
  ON email_verification_tokens(user_id, created_at DESC);
CREATE INDEX email_verification_tokens_expiry_idx
  ON email_verification_tokens(expires_at);

CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX password_reset_tokens_user_idx ON password_reset_tokens(user_id, created_at DESC);
CREATE INDEX password_reset_tokens_expiry_idx ON password_reset_tokens(expires_at);

CREATE TABLE email_change_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_email TEXT NOT NULL,
  new_email_normalized TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX email_change_requests_user_idx ON email_change_requests(user_id, created_at DESC);
CREATE INDEX email_change_requests_email_idx ON email_change_requests(new_email_normalized);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  user_agent_hash TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revocation_reason TEXT
) STRICT;

CREATE INDEX sessions_user_active_idx ON sessions(user_id, revoked_at, expires_at);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_email INTEGER NOT NULL DEFAULT 1 CHECK (account_email IN (0, 1)),
  event_email INTEGER NOT NULL DEFAULT 1 CHECK (event_email IN (0, 1)),
  announcement_email INTEGER NOT NULL DEFAULT 1 CHECK (announcement_email IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE account_deletion_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'CANCELLED', 'COMPLETED')),
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT,
  UNIQUE(user_id, status)
) STRICT;

CREATE INDEX account_deletion_requests_status_idx
  ON account_deletion_requests(status, requested_at);

CREATE TABLE auth_rate_limits (
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  window_started_at INTEGER NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1 CHECK (hit_count >= 1),
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (scope, key_hash, window_started_at)
) STRICT;

CREATE INDEX auth_rate_limits_expiry_idx ON auth_rate_limits(expires_at);

CREATE TABLE email_outbox (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  template TEXT NOT NULL CHECK (template IN ('VERIFY_EMAIL', 'RESET_PASSWORD', 'VERIFY_EMAIL_CHANGE', 'ACCOUNT_DELETION_REQUESTED')),
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

CREATE INDEX email_outbox_delivery_idx
  ON email_outbox(status, next_attempt_at, created_at);

INSERT INTO platform_settings (setting_key, value_json, is_public, description)
VALUES ('platform.authentication.version', '"0.2.0"', 1, 'Authentication and account system schema version');
