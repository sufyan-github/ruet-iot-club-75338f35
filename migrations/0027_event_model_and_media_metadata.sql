PRAGMA foreign_keys = ON;

-- Event lifecycle overrides are stored separately from derived lifecycle states.
-- Existing scheduled/ongoing/completed values remain preserved for compatibility,
-- while every API response derives the current status from the event interval.
ALTER TABLE managed_events ADD COLUMN event_status_override TEXT
  CHECK (event_status_override IS NULL OR event_status_override IN ('CANCELLED','POSTPONED'));
ALTER TABLE managed_events ADD COLUMN registration_opens_at TEXT;
ALTER TABLE managed_events ADD COLUMN registration_status_override TEXT
  CHECK (registration_status_override IS NULL OR registration_status_override IN ('UPCOMING','OPEN','CLOSED','FULL'));

-- Media Library object keys are the canonical relationship. URL columns remain
-- intact for backward compatibility with existing events and published URLs.
ALTER TABLE managed_events ADD COLUMN hero_media_key TEXT REFERENCES website_media_objects(object_key) ON DELETE RESTRICT;
ALTER TABLE managed_events ADD COLUMN hero_image_alt TEXT;
ALTER TABLE managed_events ADD COLUMN gallery_media_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(gallery_media_json));
ALTER TABLE managed_events ADD COLUMN og_media_key TEXT REFERENCES website_media_objects(object_key) ON DELETE RESTRICT;
ALTER TABLE managed_events ADD COLUMN og_image_alt TEXT;

-- Metadata is captured at upload time and returned by the Media Library API.
-- Nullable columns preserve all existing R2 objects; the UI can resolve legacy
-- dimensions from the image while newly uploaded objects are fully populated.
ALTER TABLE website_media_objects ADD COLUMN width INTEGER CHECK (width IS NULL OR width > 0);
ALTER TABLE website_media_objects ADD COLUMN height INTEGER CHECK (height IS NULL OR height > 0);
ALTER TABLE website_media_objects ADD COLUMN alt_text TEXT;

UPDATE managed_events
SET event_status_override = event_status
WHERE event_status IN ('CANCELLED','POSTPONED') AND event_status_override IS NULL;

UPDATE managed_events
SET hero_media_key = substr(cover_image_url, length('/api/v1/media/files/') + 1)
WHERE cover_image_url LIKE '/api/v1/media/files/%'
  AND EXISTS (
    SELECT 1 FROM website_media_objects m
    WHERE m.object_key = substr(managed_events.cover_image_url, length('/api/v1/media/files/') + 1)
  );

UPDATE managed_events
SET og_media_key = substr(og_image_url, length('/api/v1/media/files/') + 1)
WHERE og_image_url LIKE '/api/v1/media/files/%'
  AND EXISTS (
    SELECT 1 FROM website_media_objects m
    WHERE m.object_key = substr(managed_events.og_image_url, length('/api/v1/media/files/') + 1)
  );

CREATE INDEX managed_events_slug_workflow_idx ON managed_events(slug, workflow_status);
CREATE INDEX managed_events_registration_window_idx ON managed_events(registration_opens_at, registration_deadline);

INSERT OR REPLACE INTO platform_settings(setting_key,value_json,is_public,description,updated_at)
VALUES('platform.event_management.version','"3.0.0"',0,'Canonical event model, lifecycle, and media metadata version',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
