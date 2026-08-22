PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO course_enrollments
  (id, legacy_submission_id, course_id, user_id, course_type, price_minor, currency,
   payment_status, enrollment_status, enrolled_at, last_activity_at, completed_at, created_at, updated_at)
SELECT s.id, s.id, json_extract(s.data_json, '$.course_id'), s.submitted_by,
       c.course_type, c.price_minor, c.currency,
       CASE
         WHEN c.course_type = 'FREE' THEN 'NOT_REQUIRED'
         WHEN lower(COALESCE(json_extract(s.data_json, '$.payment_status'), '')) = 'confirmed' THEN 'VERIFIED'
         WHEN lower(COALESCE(json_extract(s.data_json, '$.payment_status'), '')) IN ('pending', 'unpaid') THEN 'SUBMITTED'
         WHEN lower(COALESCE(json_extract(s.data_json, '$.payment_status'), '')) = 'rejected' THEN 'REJECTED'
         ELSE 'PENDING'
       END,
       CASE
         WHEN json_extract(s.data_json, '$.completed') = 1 THEN 'COMPLETED'
         WHEN c.course_type = 'PAID' AND lower(COALESCE(json_extract(s.data_json, '$.payment_status'), '')) != 'confirmed' THEN 'PENDING'
         ELSE 'ENROLLED'
       END,
       s.created_at, s.updated_at,
       CASE WHEN json_extract(s.data_json, '$.completed') = 1 THEN COALESCE(json_extract(s.data_json, '$.completion_date'), s.updated_at) END,
       s.created_at, s.updated_at
FROM website_submissions s
JOIN learning_courses c ON c.id = json_extract(s.data_json, '$.course_id')
WHERE s.submission_type = 'course_registrations' AND s.submitted_by IS NOT NULL AND s.status != 'ARCHIVED';

INSERT OR IGNORE INTO event_registrations
  (id, legacy_submission_id, event_id, user_id, participant_name, email, phone, event_type,
   fee_minor, currency, payment_status, registration_status, attendance_status, registered_at)
SELECT s.id, s.id, json_extract(s.data_json, '$.event_id'), s.submitted_by,
       COALESCE(json_extract(s.data_json, '$.name'), u.display_name),
       COALESCE(json_extract(s.data_json, '$.email'), u.primary_email),
       json_extract(s.data_json, '$.phone'),
       CASE WHEN json_extract(e.data_json, '$.is_paid') = 1 THEN 'PAID' ELSE 'FREE' END,
       CASE WHEN json_extract(e.data_json, '$.is_paid') = 1 THEN CAST(COALESCE(json_extract(e.data_json, '$.registration_fee'), 0) * 100 AS INTEGER) ELSE 0 END,
       COALESCE(json_extract(e.data_json, '$.currency'), 'BDT'),
       CASE
         WHEN json_extract(e.data_json, '$.is_paid') != 1 THEN 'NOT_REQUIRED'
         WHEN lower(COALESCE(json_extract(s.data_json, '$.payment_status'), '')) = 'confirmed' THEN 'VERIFIED'
         WHEN lower(COALESCE(json_extract(s.data_json, '$.payment_status'), '')) IN ('pending', 'unpaid') THEN 'SUBMITTED'
         WHEN lower(COALESCE(json_extract(s.data_json, '$.payment_status'), '')) = 'rejected' THEN 'REJECTED'
         ELSE 'PENDING'
       END,
       CASE WHEN lower(COALESCE(json_extract(s.data_json, '$.approval_status'), 'pending')) = 'approved' THEN 'APPROVED' ELSE 'PENDING' END,
       CASE WHEN lower(COALESCE(json_extract(s.data_json, '$.attendance'), '')) = 'present' THEN 'PRESENT' WHEN lower(COALESCE(json_extract(s.data_json, '$.attendance'), '')) = 'absent' THEN 'ABSENT' ELSE 'NOT_MARKED' END,
       s.created_at
FROM website_submissions s
JOIN users u ON u.id = s.submitted_by
JOIN website_content_items e ON e.id = json_extract(s.data_json, '$.event_id') AND e.collection_key = 'events'
WHERE s.submission_type = 'event_registrations' AND s.submitted_by IS NOT NULL AND s.status != 'ARCHIVED';
