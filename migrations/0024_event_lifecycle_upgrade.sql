PRAGMA foreign_keys = ON;

-- Extend the normalized event record without replacing or duplicating the
-- existing event, registration, finance, media, notification, or certificate systems.
ALTER TABLE managed_events ADD COLUMN country TEXT NOT NULL DEFAULT 'Bangladesh';
ALTER TABLE managed_events ADD COLUMN latitude REAL CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
ALTER TABLE managed_events ADD COLUMN longitude REAL CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
ALTER TABLE managed_events ADD COLUMN online_platform TEXT;
ALTER TABLE managed_events ADD COLUMN meeting_instructions TEXT;
ALTER TABLE managed_events ADD COLUMN payment_methods_json TEXT NOT NULL DEFAULT '["BKASH"]' CHECK (json_valid(payment_methods_json));
ALTER TABLE managed_events ADD COLUMN bkash_number TEXT NOT NULL DEFAULT '01580352238';
ALTER TABLE managed_events ADD COLUMN registration_capacity_override INTEGER NOT NULL DEFAULT 0 CHECK (registration_capacity_override IN (0,1));
ALTER TABLE managed_events ADD COLUMN certificate_available INTEGER NOT NULL DEFAULT 0 CHECK (certificate_available IN (0,1));
ALTER TABLE managed_events ADD COLUMN certificate_require_registration INTEGER NOT NULL DEFAULT 1 CHECK (certificate_require_registration IN (0,1));
ALTER TABLE managed_events ADD COLUMN certificate_require_payment INTEGER NOT NULL DEFAULT 1 CHECK (certificate_require_payment IN (0,1));
ALTER TABLE managed_events ADD COLUMN certificate_require_attendance INTEGER NOT NULL DEFAULT 1 CHECK (certificate_require_attendance IN (0,1));
ALTER TABLE managed_events ADD COLUMN certificate_min_attendance_percent INTEGER NOT NULL DEFAULT 100 CHECK (certificate_min_attendance_percent BETWEEN 0 AND 100);
ALTER TABLE managed_events ADD COLUMN organizer_person_id TEXT REFERENCES people_profiles(id) ON DELETE SET NULL;
ALTER TABLE managed_events ADD COLUMN co_organizer_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(co_organizer_ids_json));
ALTER TABLE managed_events ADD COLUMN partner_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(partner_ids_json));
ALTER TABLE managed_events ADD COLUMN sponsor_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(sponsor_ids_json));
ALTER TABLE managed_events ADD COLUMN speaker_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(speaker_ids_json));
ALTER TABLE managed_events ADD COLUMN trainer_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(trainer_ids_json));

ALTER TABLE event_registrations ADD COLUMN payer_phone TEXT;
ALTER TABLE event_registrations ADD COLUMN attendance_marked_at TEXT;
ALTER TABLE event_registrations ADD COLUMN attendance_marked_by TEXT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE event_registrations ADD COLUMN certificate_eligible_override INTEGER CHECK (certificate_eligible_override IS NULL OR certificate_eligible_override IN (0,1));
ALTER TABLE event_registrations ADD COLUMN updated_at TEXT;
UPDATE event_registrations SET updated_at = COALESCE(reviewed_at, registered_at) WHERE updated_at IS NULL;

ALTER TABLE learning_payments ADD COLUMN payer_phone TEXT;
ALTER TABLE learning_payments ADD COLUMN duplicate_flag INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_flag IN (0,1));
ALTER TABLE learning_payments ADD COLUMN duplicate_of_payment_id TEXT REFERENCES learning_payments(id) ON DELETE RESTRICT;
ALTER TABLE learning_payments ADD COLUMN updated_at TEXT;
UPDATE learning_payments SET updated_at = COALESCE(verified_at, submitted_at) WHERE updated_at IS NULL;

-- Certificate tables remain the single certificate infrastructure. Domain
-- metadata distinguishes course and event records while legacy foreign keys
-- continue to point to website content/submission compatibility records.
ALTER TABLE certificate_requests ADD COLUMN domain_type TEXT NOT NULL DEFAULT 'COURSE' CHECK (domain_type IN ('COURSE','EVENT'));
ALTER TABLE certificate_requests ADD COLUMN event_id TEXT REFERENCES managed_events(id) ON DELETE RESTRICT;
ALTER TABLE certificate_requests ADD COLUMN event_registration_id TEXT REFERENCES event_registrations(id) ON DELETE RESTRICT;
ALTER TABLE certificates ADD COLUMN domain_type TEXT NOT NULL DEFAULT 'COURSE' CHECK (domain_type IN ('COURSE','EVENT'));
ALTER TABLE certificates ADD COLUMN event_id TEXT REFERENCES managed_events(id) ON DELETE RESTRICT;
ALTER TABLE certificates ADD COLUMN event_registration_id TEXT REFERENCES event_registrations(id) ON DELETE RESTRICT;

CREATE INDEX event_registrations_event_operations_idx
  ON event_registrations(event_id, registration_status, payment_status, attendance_status, registered_at DESC);
CREATE INDEX learning_payments_event_operations_idx
  ON learning_payments(domain_type, domain_id, status, submitted_at DESC);
CREATE INDEX certificate_requests_event_operations_idx
  ON certificate_requests(domain_type, event_id, status, requested_at DESC);
CREATE INDEX certificates_event_owner_idx
  ON certificates(domain_type, event_id, user_id, issued_at DESC);

CREATE TABLE event_registration_events (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES event_registrations(id) ON DELETE RESTRICT,
  event_id TEXT NOT NULL REFERENCES managed_events(id) ON DELETE RESTRICT,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_registration_status TEXT,
  to_registration_status TEXT,
  from_payment_status TEXT,
  to_payment_status TEXT,
  from_attendance_status TEXT,
  to_attendance_status TEXT,
  note TEXT,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX event_registration_events_history_idx ON event_registration_events(registration_id, created_at DESC);

CREATE TABLE learning_payment_events (
  id TEXT PRIMARY KEY,
  payment_id TEXT REFERENCES learning_payments(id) ON DELETE RESTRICT,
  registration_id TEXT NOT NULL REFERENCES event_registrations(id) ON DELETE RESTRICT,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  transaction_reference TEXT,
  note TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX learning_payment_events_history_idx ON learning_payment_events(registration_id, created_at DESC);

CREATE TRIGGER event_registration_events_immutable_update BEFORE UPDATE ON event_registration_events BEGIN
  SELECT RAISE(ABORT, 'event registration history is immutable');
END;
CREATE TRIGGER event_registration_events_immutable_delete BEFORE DELETE ON event_registration_events BEGIN
  SELECT RAISE(ABORT, 'event registration history is immutable');
END;
CREATE TRIGGER learning_payment_events_immutable_update BEFORE UPDATE ON learning_payment_events BEGIN
  SELECT RAISE(ABORT, 'payment history is immutable');
END;
CREATE TRIGGER learning_payment_events_immutable_delete BEFORE DELETE ON learning_payment_events BEGIN
  SELECT RAISE(ABORT, 'payment history is immutable');
END;

DROP TRIGGER event_registrations_capacity_guard;
CREATE TRIGGER event_registrations_capacity_guard
BEFORE INSERT ON event_registrations
WHEN COALESCE(
       (SELECT max_participants FROM managed_events WHERE id = NEW.event_id),
       (SELECT CAST(json_extract(data_json,'$.max_participants') AS INTEGER) FROM website_content_items WHERE id = NEW.event_id),
       0
     ) > 0
 AND COALESCE((SELECT registration_capacity_override FROM managed_events WHERE id = NEW.event_id), 0) = 0
 AND (SELECT COUNT(*) FROM event_registrations WHERE event_id = NEW.event_id AND registration_status IN ('PENDING','APPROVED')) >=
     COALESCE(
       (SELECT max_participants FROM managed_events WHERE id = NEW.event_id),
       (SELECT CAST(json_extract(data_json,'$.max_participants') AS INTEGER) FROM website_content_items WHERE id = NEW.event_id),
       0
     )
BEGIN
  SELECT RAISE(ABORT, 'event capacity reached');
END;

INSERT OR REPLACE INTO platform_settings(setting_key,value_json,is_public,description,updated_at)
VALUES('platform.event_management.version','"2.0.0"',0,'Connected event lifecycle schema version',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
