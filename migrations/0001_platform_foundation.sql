PRAGMA foreign_keys = ON;

CREATE TABLE platform_settings (
  setting_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE idempotency_keys (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  actor_id TEXT,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  response_body_json TEXT CHECK (response_body_json IS NULL OR json_valid(response_body_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX idempotency_keys_scope_unique
  ON idempotency_keys(operation, actor_id, id);
CREATE INDEX idempotency_keys_expires_at_idx
  ON idempotency_keys(expires_at);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM', 'SERVICE')),
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  reason TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs(action, created_at DESC);
CREATE INDEX audit_logs_request_idx ON audit_logs(request_id);

CREATE TABLE storage_objects (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  owner_id TEXT,
  purpose TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'QUARANTINED', 'ARCHIVED')),
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256 TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
) STRICT;

CREATE INDEX storage_objects_owner_idx ON storage_objects(owner_id, created_at DESC);
CREATE INDEX storage_objects_purpose_idx ON storage_objects(purpose, status, created_at DESC);

INSERT INTO platform_settings (setting_key, value_json, is_public, description)
VALUES ('platform.foundation.version', '"0.1.0"', 1, 'Cloudflare platform foundation schema version');
