PRAGMA foreign_keys = ON;

CREATE TABLE research_works (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 240),
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 3 AND 260),
  short_description TEXT,
  abstract TEXT,
  research_status TEXT NOT NULL DEFAULT 'ONGOING' CHECK (research_status IN ('ONGOING', 'COMPLETED', 'PUBLISHED', 'ARCHIVED')),
  category TEXT,
  research_area TEXT,
  keywords_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(keywords_json)),
  publication_title TEXT,
  journal_conference TEXT,
  publisher TEXT,
  publication_date TEXT,
  doi TEXT,
  isbn_issn TEXT,
  volume TEXT,
  issue TEXT,
  pages TEXT,
  citation TEXT,
  external_url TEXT,
  cover_url TEXT,
  workflow_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (workflow_status IN ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  publish_date TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  updated_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT,
  CHECK (workflow_status != 'PUBLISHED' OR publish_date IS NOT NULL)
) STRICT;

CREATE INDEX research_works_public_idx ON research_works(workflow_status, featured DESC, sort_order, publish_date DESC);
CREATE INDEX research_works_status_idx ON research_works(research_status, updated_at DESC);

CREATE TABLE researchers (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  person_content_id TEXT REFERENCES website_content_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  role TEXT,
  institution TEXT,
  email TEXT,
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE research_authors (
  research_id TEXT NOT NULL REFERENCES research_works(id) ON DELETE RESTRICT,
  researcher_id TEXT NOT NULL REFERENCES researchers(id) ON DELETE RESTRICT,
  author_order INTEGER NOT NULL DEFAULT 0,
  author_role TEXT,
  PRIMARY KEY (research_id, researcher_id)
) STRICT;

CREATE TABLE research_documents (
  id TEXT PRIMARY KEY,
  research_id TEXT NOT NULL REFERENCES research_works(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL CHECK (document_type IN ('COVER', 'PDF', 'PAPER', 'DATASET', 'PRESENTATION', 'SUPPLEMENTARY')),
  title TEXT NOT NULL,
  object_key TEXT,
  url TEXT NOT NULL,
  content_type TEXT,
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size BETWEEN 1 AND 5242880),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE learning_courses (
  id TEXT PRIMARY KEY REFERENCES website_content_items(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 240),
  short_description TEXT,
  full_description TEXT,
  thumbnail_url TEXT,
  instructor TEXT,
  instructor_bio TEXT,
  category TEXT,
  level TEXT NOT NULL DEFAULT 'BEGINNER' CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  duration TEXT,
  language TEXT NOT NULL DEFAULT 'English',
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  objectives_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(objectives_json)),
  prerequisites_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(prerequisites_json)),
  course_type TEXT NOT NULL DEFAULT 'FREE' CHECK (course_type IN ('FREE', 'PAID')),
  price_minor INTEGER NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK (length(currency) = 3),
  payment_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  updated_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (course_type = 'PAID' OR price_minor = 0),
  CHECK (status != 'PUBLISHED' OR published_at IS NOT NULL)
) STRICT;

CREATE INDEX learning_courses_public_idx ON learning_courses(status, featured DESC, sort_order, published_at DESC);

CREATE TABLE course_modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES learning_courses(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX course_modules_order_idx ON course_modules(course_id, sort_order);

CREATE TABLE course_lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES learning_courses(id) ON DELETE RESTRICT,
  module_id TEXT NOT NULL REFERENCES course_modules(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description TEXT,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX course_lessons_order_idx ON course_lessons(module_id, sort_order);

CREATE TABLE lesson_contents (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES course_lessons(id) ON DELETE RESTRICT,
  content_type TEXT NOT NULL CHECK (content_type IN ('TEXT', 'RICH_TEXT', 'YOUTUBE', 'VIDEO', 'PDF', 'DOC', 'PPT', 'IMAGE', 'EXTERNAL', 'DOWNLOAD')),
  title TEXT,
  body TEXT,
  url TEXT,
  object_key TEXT,
  content_type_metadata TEXT,
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size BETWEEN 1 AND 5242880),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (body IS NOT NULL OR url IS NOT NULL OR object_key IS NOT NULL)
) STRICT;

CREATE INDEX lesson_contents_order_idx ON lesson_contents(lesson_id, sort_order);

CREATE TABLE course_enrollments (
  id TEXT PRIMARY KEY,
  legacy_submission_id TEXT UNIQUE REFERENCES website_submissions(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES learning_courses(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_type TEXT NOT NULL CHECK (course_type IN ('FREE', 'PAID')),
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('NOT_REQUIRED', 'PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'REFUNDED')),
  enrollment_status TEXT NOT NULL DEFAULT 'ENROLLED' CHECK (enrollment_status IN ('PENDING', 'ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  enrolled_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_activity_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (course_id, user_id),
  CHECK (course_type = 'PAID' OR (price_minor = 0 AND payment_status = 'NOT_REQUIRED')),
  CHECK (enrollment_status != 'COMPLETED' OR completed_at IS NOT NULL)
) STRICT;

CREATE INDEX course_enrollments_admin_idx ON course_enrollments(enrollment_status, payment_status, enrolled_at DESC);
CREATE INDEX course_enrollments_user_idx ON course_enrollments(user_id, enrolled_at DESC);

CREATE TABLE course_progress (
  enrollment_id TEXT NOT NULL REFERENCES course_enrollments(id) ON DELETE RESTRICT,
  lesson_id TEXT NOT NULL REFERENCES course_lessons(id) ON DELETE RESTRICT,
  completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (enrollment_id, lesson_id)
) STRICT;

CREATE TABLE learning_payments (
  id TEXT PRIMARY KEY,
  domain_type TEXT NOT NULL CHECK (domain_type IN ('COURSE', 'EVENT')),
  domain_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expected_amount_minor INTEGER NOT NULL CHECK (expected_amount_minor > 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  payment_method TEXT NOT NULL,
  transaction_reference TEXT,
  evidence_object_key TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'REFUNDED')),
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  verified_at TEXT,
  verified_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  decision_reason TEXT,
  UNIQUE (domain_type, domain_id, user_id),
  UNIQUE (payment_method, transaction_reference)
) STRICT;

CREATE TABLE event_registrations (
  id TEXT PRIMARY KEY,
  legacy_submission_id TEXT UNIQUE REFERENCES website_submissions(id) ON DELETE RESTRICT,
  event_id TEXT NOT NULL REFERENCES website_content_items(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  participant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('FREE', 'PAID')),
  fee_minor INTEGER NOT NULL DEFAULT 0 CHECK (fee_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK (length(currency) = 3),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('NOT_REQUIRED', 'PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'REFUNDED')),
  registration_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (registration_status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  attendance_status TEXT NOT NULL DEFAULT 'NOT_MARKED' CHECK (attendance_status IN ('NOT_MARKED', 'PRESENT', 'ABSENT')),
  registered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reviewed_at TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (event_id, user_id),
  CHECK (event_type = 'PAID' OR (fee_minor = 0 AND payment_status = 'NOT_REQUIRED'))
) STRICT;

CREATE INDEX event_registrations_admin_idx ON event_registrations(registration_status, payment_status, registered_at DESC);

CREATE TRIGGER research_works_prevent_delete BEFORE DELETE ON research_works BEGIN SELECT RAISE(ABORT, 'research works require archival'); END;
CREATE TRIGGER learning_courses_prevent_delete BEFORE DELETE ON learning_courses BEGIN SELECT RAISE(ABORT, 'courses require archival'); END;
CREATE TRIGGER course_modules_prevent_delete BEFORE DELETE ON course_modules BEGIN SELECT RAISE(ABORT, 'course modules require archival through status changes'); END;
CREATE TRIGGER course_lessons_prevent_delete BEFORE DELETE ON course_lessons BEGIN SELECT RAISE(ABORT, 'course lessons require archival through status changes'); END;
CREATE TRIGGER course_enrollments_prevent_delete BEFORE DELETE ON course_enrollments BEGIN SELECT RAISE(ABORT, 'course enrollments are retained for audit history'); END;
CREATE TRIGGER event_registrations_prevent_delete BEFORE DELETE ON event_registrations BEGIN SELECT RAISE(ABORT, 'event registrations are retained for audit history'); END;

INSERT OR IGNORE INTO research_works
  (id, title, slug, short_description, abstract, research_status, research_area, keywords_json,
   doi, external_url, workflow_status, sort_order, publish_date, created_by, updated_by, created_at, updated_at)
SELECT id,
       COALESCE(json_extract(data_json, '$.title'), 'Untitled research'),
       lower(replace(replace(COALESCE(json_extract(data_json, '$.slug'), json_extract(data_json, '$.title'), id), ' ', '-'), '/', '-')),
       json_extract(data_json, '$.description'), json_extract(data_json, '$.abstract'),
       upper(COALESCE(json_extract(data_json, '$.status'), 'ONGOING')),
       json_extract(data_json, '$.research_area'), COALESCE(json_extract(data_json, '$.tags'), '[]'),
       json_extract(data_json, '$.doi_link'), json_extract(data_json, '$.doi_link'),
       status, sort_order, COALESCE(published_at, created_at), created_by, updated_by, created_at, updated_at
FROM website_content_items
WHERE collection_key = 'research_papers' AND status != 'ARCHIVED';

INSERT OR IGNORE INTO learning_courses
  (id, title, short_description, full_description, thumbnail_url, instructor, instructor_bio, category,
   level, duration, language, tags_json, objectives_json, prerequisites_json, course_type, price_minor,
   currency, payment_instructions, status, sort_order, published_at, created_by, updated_by, created_at, updated_at)
SELECT id, COALESCE(json_extract(data_json, '$.title'), 'Untitled course'),
       json_extract(data_json, '$.description'), COALESCE(json_extract(data_json, '$.full_description'), json_extract(data_json, '$.description')),
       json_extract(data_json, '$.image_url'), json_extract(data_json, '$.instructor'), json_extract(data_json, '$.instructor_bio'),
       json_extract(data_json, '$.category'), upper(COALESCE(json_extract(data_json, '$.level'), 'BEGINNER')),
       json_extract(data_json, '$.duration'), COALESCE(json_extract(data_json, '$.language'), 'English'),
       COALESCE(json_extract(data_json, '$.tags'), '[]'), COALESCE(json_extract(data_json, '$.learning_objectives'), '[]'),
       COALESCE(json_extract(data_json, '$.prerequisites'), '[]'),
       CASE WHEN json_extract(data_json, '$.is_paid') = 1 THEN 'PAID' ELSE 'FREE' END,
       CAST(COALESCE(json_extract(data_json, '$.price'), 0) * 100 AS INTEGER),
       COALESCE(json_extract(data_json, '$.currency'), 'BDT'), json_extract(data_json, '$.payment_instructions'),
       status, sort_order, published_at, created_by, updated_by, created_at, updated_at
FROM website_content_items
WHERE collection_key = 'courses';
