CREATE TRIGGER event_registrations_capacity_guard
BEFORE INSERT ON event_registrations
WHEN COALESCE((SELECT CAST(json_extract(data_json, '$.max_participants') AS INTEGER) FROM website_content_items WHERE id = NEW.event_id AND collection_key = 'events'), 0) > 0
 AND (SELECT COUNT(*) FROM event_registrations WHERE event_id = NEW.event_id AND registration_status IN ('PENDING', 'APPROVED')) >=
     (SELECT CAST(json_extract(data_json, '$.max_participants') AS INTEGER) FROM website_content_items WHERE id = NEW.event_id AND collection_key = 'events')
BEGIN
  SELECT RAISE(ABORT, 'event capacity reached');
END;
