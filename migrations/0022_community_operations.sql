PRAGMA foreign_keys = ON;

-- Normalized public-program records. website_content_items remains the compatibility
-- envelope used by older pages while these tables provide typed relationships and
-- validation for the professional administration workflows.
CREATE TABLE managed_events (
  id TEXT PRIMARY KEY REFERENCES website_content_items(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 200),
  short_description TEXT NOT NULL CHECK (length(short_description) BETWEEN 3 AND 500),
  full_description TEXT NOT NULL CHECK (length(full_description) BETWEEN 3 AND 20000),
  event_type TEXT NOT NULL CHECK (length(event_type) BETWEEN 2 AND 100),
  category TEXT NOT NULL CHECK (length(category) BETWEEN 2 AND 100),
  event_status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (event_status IN ('SCHEDULED','ONGOING','COMPLETED','CANCELLED','POSTPONED')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  location_type TEXT NOT NULL DEFAULT 'PHYSICAL' CHECK (location_type IN ('PHYSICAL','ONLINE','HYBRID')),
  venue TEXT,
  address TEXT,
  city TEXT,
  online_url TEXT,
  map_url TEXT,
  cover_image_url TEXT,
  thumbnail_url TEXT,
  gallery_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(gallery_json)),
  poster_url TEXT,
  video_url TEXT,
  registration_required INTEGER NOT NULL DEFAULT 1 CHECK (registration_required IN (0,1)),
  registration_mode TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (registration_mode IN ('INTERNAL','EXTERNAL','CLOSED')),
  registration_url TEXT,
  registration_deadline TEXT,
  max_participants INTEGER NOT NULL DEFAULT 0 CHECK (max_participants >= 0),
  fee_minor INTEGER NOT NULL DEFAULT 0 CHECK (fee_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK (length(currency) = 3),
  payment_required INTEGER NOT NULL DEFAULT 0 CHECK (payment_required IN (0,1)),
  registration_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (registration_status IN ('UPCOMING','OPEN','CLOSED','FULL')),
  organizer TEXT NOT NULL DEFAULT 'RUET IoT Club',
  co_organizers_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(co_organizers_json)),
  partners_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(partners_json)),
  sponsors_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(sponsors_json)),
  speakers_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(speakers_json)),
  trainers_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(trainers_json)),
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  target_audience TEXT,
  eligibility TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  seo_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  workflow_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (workflow_status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  published_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  updated_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (ends_at >= starts_at),
  CHECK (payment_required = 1 OR fee_minor = 0),
  CHECK ((location_type = 'ONLINE' AND online_url IS NOT NULL) OR location_type != 'ONLINE'),
  CHECK ((workflow_status = 'PUBLISHED' AND published_at IS NOT NULL) OR workflow_status != 'PUBLISHED')
) STRICT;

CREATE INDEX managed_events_public_idx ON managed_events(workflow_status, featured DESC, starts_at, ends_at);
CREATE INDEX managed_events_admin_idx ON managed_events(event_status, registration_status, updated_at DESC);

CREATE TABLE people_profiles (
  id TEXT PRIMARY KEY REFERENCES website_content_items(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL CHECK (length(full_name) BETWEEN 2 AND 150),
  profile_photo_url TEXT,
  short_bio TEXT,
  biography TEXT,
  public_email TEXT,
  public_phone TEXT,
  series TEXT,
  department TEXT,
  university TEXT,
  student_id_private TEXT,
  graduation_year INTEGER,
  person_type TEXT NOT NULL CHECK (person_type IN ('EXECUTIVE','ADVISORY_BOARD','FACULTY_ADVISOR','GENERAL_MEMBER','VOLUNTEER','ALUMNI','MENTOR','RESEARCHER','COORDINATOR','FORMER_EXECUTIVE')),
  position TEXT NOT NULL CHECK (length(position) BETWEEN 2 AND 120),
  term TEXT,
  committee_session TEXT,
  starts_on TEXT,
  ends_on TEXT,
  current_position INTEGER NOT NULL DEFAULT 1 CHECK (current_position IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  public_profile INTEGER NOT NULL DEFAULT 1 CHECK (public_profile IN (0,1)),
  linkedin_url TEXT,
  github_url TEXT,
  facebook_url TEXT,
  website_url TEXT,
  research_profile_url TEXT,
  workflow_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (workflow_status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  published_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  updated_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX people_profiles_public_idx ON people_profiles(workflow_status, public_profile, person_type, sort_order, full_name);

CREATE TABLE partner_profiles (
  id TEXT PRIMARY KEY REFERENCES website_content_items(id) ON DELETE RESTRICT,
  source_submission_id TEXT REFERENCES platform_submissions(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL CHECK (length(organization_name) BETWEEN 2 AND 200),
  logo_url TEXT,
  cover_image_url TEXT,
  short_description TEXT NOT NULL CHECK (length(short_description) BETWEEN 3 AND 500),
  full_description TEXT NOT NULL CHECK (length(full_description) BETWEEN 3 AND 20000),
  category TEXT NOT NULL CHECK (length(category) BETWEEN 2 AND 100),
  country TEXT,
  city TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_person TEXT,
  partnership_type TEXT,
  starts_on TEXT,
  ends_on TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  facebook_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  other_url TEXT,
  seo_title TEXT,
  meta_description TEXT,
  workflow_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (workflow_status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  published_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  updated_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX partner_profiles_public_idx ON partner_profiles(workflow_status, active, featured DESC, category, sort_order);

CREATE TABLE opportunities (
  id TEXT PRIMARY KEY REFERENCES website_content_items(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 200),
  short_description TEXT NOT NULL CHECK (length(short_description) BETWEEN 3 AND 500),
  full_description TEXT NOT NULL CHECK (length(full_description) BETWEEN 3 AND 20000),
  category TEXT NOT NULL CHECK (length(category) BETWEEN 2 AND 100),
  organization TEXT NOT NULL CHECK (length(organization) BETWEEN 2 AND 200),
  opportunity_type TEXT NOT NULL CHECK (length(opportunity_type) BETWEEN 2 AND 100),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  application_opens_at TEXT,
  application_deadline TEXT,
  starts_at TEXT,
  ends_at TEXT,
  eligibility TEXT,
  who_can_apply TEXT,
  academic_level TEXT,
  department TEXT,
  series TEXT,
  location TEXT,
  age_requirement TEXT,
  other_eligibility TEXT,
  application_mode TEXT NOT NULL DEFAULT 'EXTERNAL' CHECK (application_mode IN ('INTERNAL','EXTERNAL')),
  application_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  required_documents_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(required_documents_json)),
  cover_image_url TEXT,
  logo_url TEXT,
  attachments_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(attachments_json)),
  seo_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  workflow_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (workflow_status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  published_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  updated_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX opportunities_public_idx ON opportunities(workflow_status, featured DESC, application_deadline, sort_order);

CREATE TABLE opportunity_applications (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE RESTRICT,
  user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_email_normalized TEXT NOT NULL,
  applicant_phone TEXT,
  organization TEXT,
  cover_note TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json)),
  tracking_token_hash TEXT NOT NULL UNIQUE,
  verification_token_hash TEXT,
  verification_expires_at TEXT,
  email_verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'EMAIL_VERIFICATION' CHECK (status IN ('EMAIL_VERIFICATION','SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','APPROVED','REJECTED','COMPLETED','ARCHIVED')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  assigned_reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  internal_notes TEXT,
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX opportunity_applications_queue_idx ON opportunity_applications(status, priority, submitted_at DESC);

CREATE TABLE opportunity_application_events (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES opportunity_applications(id) ON DELETE RESTRICT,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX opportunity_application_events_idx ON opportunity_application_events(application_id, created_at);

CREATE TABLE finance_transactions (
  id TEXT PRIMARY KEY,
  transaction_code TEXT NOT NULL UNIQUE,
  transaction_date TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  category TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('INCOME','EXPENSE')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK (length(currency) = 3),
  payment_method TEXT,
  external_reference TEXT,
  description TEXT NOT NULL,
  related_module TEXT NOT NULL CHECK (related_module IN ('EVENT','RESEARCH','COURSE','PROJECT','MEMBERSHIP','OPPORTUNITY','PARTNERSHIP','DONATION','OTHER')),
  related_entity_id TEXT,
  submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUBMITTED','VERIFIED','REJECTED','CANCELLED')),
  receipt_object_key TEXT,
  notes TEXT,
  decision_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX finance_transactions_reporting_idx ON finance_transactions(status, direction, transaction_date DESC);
CREATE INDEX finance_transactions_relation_idx ON finance_transactions(related_module, related_entity_id, transaction_date DESC);

CREATE TABLE finance_transaction_events (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES finance_transactions(id) ON DELETE RESTRICT,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX finance_transaction_events_idx ON finance_transaction_events(transaction_id, created_at);

ALTER TABLE platform_submissions ADD COLUMN priority TEXT NOT NULL DEFAULT 'NORMAL'
  CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT'));
ALTER TABLE user_notifications ADD COLUMN priority TEXT NOT NULL DEFAULT 'NORMAL'
  CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT'));
ALTER TABLE user_notifications ADD COLUMN dedupe_key TEXT;
CREATE UNIQUE INDEX user_notifications_dedupe_idx ON user_notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Preserve content already authored through the compatibility CMS. New writes use
-- the typed APIs below, but old records become immediately available there.
INSERT OR IGNORE INTO managed_events(
  id,slug,title,short_description,full_description,event_type,category,event_status,
  featured,sort_order,starts_at,ends_at,timezone,location_type,venue,city,
  cover_image_url,registration_required,max_participants,fee_minor,currency,
  payment_required,registration_status,organizer,workflow_status,published_at,
  created_by,updated_by,created_at,updated_at
)
SELECT id,
  lower(replace(trim(COALESCE(json_extract(data_json,'$.title'),'event')),' ','-')) || '-' || substr(id,1,8),
  COALESCE(json_extract(data_json,'$.title'),'Untitled event'),
  substr(COALESCE(json_extract(data_json,'$.description'),'Details will be announced.'),1,500),
  COALESCE(json_extract(data_json,'$.description'),'Details will be announced.'),
  COALESCE(json_extract(data_json,'$.type'),'Event'),
  COALESCE(json_extract(data_json,'$.category'),json_extract(data_json,'$.type'),'General'),
  CASE WHEN datetime(COALESCE(json_extract(data_json,'$.date'),created_at)) < datetime('now') THEN 'COMPLETED' ELSE 'SCHEDULED' END,
  COALESCE(json_extract(data_json,'$.featured'),0), sort_order,
  COALESCE(json_extract(data_json,'$.date'),created_at),
  COALESCE(json_extract(data_json,'$.end_date'),json_extract(data_json,'$.date'),created_at),
  'Asia/Dhaka','PHYSICAL',json_extract(data_json,'$.venue'),json_extract(data_json,'$.city'),
  json_extract(data_json,'$.image_url'),1,COALESCE(json_extract(data_json,'$.max_participants'),0),
  CAST(COALESCE(json_extract(data_json,'$.registration_fee'),0) * 100 AS INTEGER),
  COALESCE(json_extract(data_json,'$.currency'),'BDT'),
  COALESCE(json_extract(data_json,'$.is_paid'),0),'OPEN','RUET IoT Club',
  status,published_at,created_by,updated_by,created_at,updated_at
FROM website_content_items WHERE collection_key='events' AND status!='ARCHIVED';

INSERT OR IGNORE INTO people_profiles(
  id,slug,full_name,profile_photo_url,short_bio,biography,public_email,public_phone,
  series,department,university,person_type,position,term,committee_session,
  sort_order,featured,public_profile,linkedin_url,github_url,facebook_url,website_url,
  research_profile_url,workflow_status,published_at,created_by,updated_by,created_at,updated_at
)
SELECT id,
  lower(replace(trim(COALESCE(json_extract(data_json,'$.name'),'person')),' ','-')) || '-' || substr(id,1,8),
  COALESCE(json_extract(data_json,'$.name'),'Unnamed person'),
  json_extract(data_json,'$.image_url'),json_extract(data_json,'$.bio'),json_extract(data_json,'$.biography'),
  json_extract(data_json,'$.email'),json_extract(data_json,'$.phone'),json_extract(data_json,'$.batch'),
  json_extract(data_json,'$.department'),COALESCE(json_extract(data_json,'$.university'),'RUET'),
  CASE
    WHEN lower(COALESCE(json_extract(data_json,'$.category'),'')) LIKE '%advisor%' THEN 'ADVISORY_BOARD'
    WHEN lower(COALESCE(json_extract(data_json,'$.category'),'')) LIKE '%executive%' THEN 'EXECUTIVE'
    WHEN lower(COALESCE(json_extract(data_json,'$.category'),'')) LIKE '%mentor%' THEN 'MENTOR'
    ELSE 'GENERAL_MEMBER'
  END,
  COALESCE(json_extract(data_json,'$.position'),'Member'),json_extract(data_json,'$.term'),
  json_extract(data_json,'$.session'),sort_order,COALESCE(json_extract(data_json,'$.featured'),0),1,
  json_extract(data_json,'$.linkedin'),json_extract(data_json,'$.github'),json_extract(data_json,'$.facebook'),
  json_extract(data_json,'$.website'),json_extract(data_json,'$.research_profile'),
  status,published_at,created_by,updated_by,created_at,updated_at
FROM website_content_items WHERE collection_key='team_members' AND status!='ARCHIVED';

INSERT OR IGNORE INTO partner_profiles(
  id,slug,organization_name,logo_url,cover_image_url,short_description,full_description,
  category,country,city,website_url,contact_email,contact_person,partnership_type,
  starts_on,ends_on,active,featured,sort_order,facebook_url,linkedin_url,instagram_url,
  other_url,seo_title,meta_description,workflow_status,published_at,created_by,updated_by,created_at,updated_at
)
SELECT id,
  lower(replace(trim(COALESCE(json_extract(data_json,'$.title'),json_extract(data_json,'$.name'),'partner')),' ','-')) || '-' || substr(id,1,8),
  COALESCE(json_extract(data_json,'$.title'),json_extract(data_json,'$.name'),'Unnamed partner'),
  COALESCE(json_extract(data_json,'$.logo_url'),json_extract(data_json,'$.image_url')),
  json_extract(data_json,'$.cover_image_url'),
  substr(COALESCE(json_extract(data_json,'$.description'),'Partner of RUET IoT Club.'),1,500),
  COALESCE(json_extract(data_json,'$.full_description'),json_extract(data_json,'$.description'),'Partner of RUET IoT Club.'),
  COALESCE(json_extract(data_json,'$.category'),'Other'),json_extract(data_json,'$.country'),
  json_extract(data_json,'$.city'),json_extract(data_json,'$.website'),json_extract(data_json,'$.contact_email'),
  json_extract(data_json,'$.contact_person'),json_extract(data_json,'$.partnership_type'),
  json_extract(data_json,'$.start_date'),json_extract(data_json,'$.end_date'),
  COALESCE(json_extract(data_json,'$.active'),1),COALESCE(json_extract(data_json,'$.featured'),0),sort_order,
  json_extract(data_json,'$.facebook'),json_extract(data_json,'$.linkedin'),json_extract(data_json,'$.instagram'),
  json_extract(data_json,'$.other_url'),json_extract(data_json,'$.seo_title'),json_extract(data_json,'$.meta_description'),
  status,published_at,created_by,updated_by,created_at,updated_at
FROM website_content_items WHERE collection_key='partners' AND status!='ARCHIVED';

INSERT OR IGNORE INTO opportunities(
  id,slug,title,short_description,full_description,category,organization,opportunity_type,
  featured,application_opens_at,application_deadline,starts_at,ends_at,eligibility,
  who_can_apply,academic_level,department,series,location,age_requirement,other_eligibility,
  application_mode,application_url,contact_email,contact_phone,required_documents_json,
  cover_image_url,logo_url,attachments_json,seo_title,meta_description,og_image_url,
  sort_order,workflow_status,published_at,created_by,updated_by,created_at,updated_at
)
SELECT id,
  lower(replace(trim(COALESCE(json_extract(data_json,'$.title'),'opportunity')),' ','-')) || '-' || substr(id,1,8),
  COALESCE(json_extract(data_json,'$.title'),'Untitled opportunity'),
  substr(COALESCE(json_extract(data_json,'$.description'),'Opportunity details.'),1,500),
  COALESCE(json_extract(data_json,'$.full_description'),json_extract(data_json,'$.description'),'Opportunity details.'),
  COALESCE(json_extract(data_json,'$.category'),'Other'),COALESCE(json_extract(data_json,'$.organization'),'RUET IoT Club'),
  COALESCE(json_extract(data_json,'$.type'),'Other'),COALESCE(json_extract(data_json,'$.featured'),0),
  json_extract(data_json,'$.application_opens'),json_extract(data_json,'$.deadline'),
  json_extract(data_json,'$.start_date'),json_extract(data_json,'$.end_date'),
  json_extract(data_json,'$.eligibility'),json_extract(data_json,'$.who_can_apply'),
  json_extract(data_json,'$.academic_level'),json_extract(data_json,'$.department'),
  json_extract(data_json,'$.series'),json_extract(data_json,'$.location'),
  json_extract(data_json,'$.age_requirement'),json_extract(data_json,'$.other_eligibility'),
  CASE WHEN json_extract(data_json,'$.internal_application')=1 THEN 'INTERNAL' ELSE 'EXTERNAL' END,
  json_extract(data_json,'$.application_url'),json_extract(data_json,'$.contact_email'),
  json_extract(data_json,'$.contact_phone'),COALESCE(json_extract(data_json,'$.required_documents'),'[]'),
  json_extract(data_json,'$.cover_image_url'),json_extract(data_json,'$.logo_url'),
  COALESCE(json_extract(data_json,'$.attachments'),'[]'),json_extract(data_json,'$.seo_title'),
  json_extract(data_json,'$.meta_description'),json_extract(data_json,'$.og_image'),
  sort_order,status,published_at,created_by,updated_by,created_at,updated_at
FROM website_content_items WHERE collection_key='opportunities' AND status!='ARCHIVED';

INSERT OR IGNORE INTO finance_transactions(
  id,transaction_code,transaction_date,transaction_type,category,direction,amount_minor,currency,
  payment_method,external_reference,description,related_module,related_entity_id,submitted_by,
  verified_by,verified_at,status,receipt_object_key,decision_reason,created_at,updated_at
)
SELECT 'membership-payment:'||id,'MPAY-'||upper(substr(replace(id,'-',''),1,12)),submitted_at,
  CASE WHEN renewal_id IS NULL THEN 'Membership Registration Fee' ELSE 'Membership Renewal Fee' END,
  CASE WHEN renewal_id IS NULL THEN 'Membership Registration Fee' ELSE 'Membership Renewal Fee' END,
  'INCOME',expected_amount_minor,currency,payment_method,transaction_reference,'Membership payment',
  'MEMBERSHIP',COALESCE(application_id,renewal_id),submitted_by,verified_by,verified_at,status,NULL,
  verification_reason,submitted_at,COALESCE(verified_at,submitted_at)
FROM membership_payments;

INSERT OR IGNORE INTO finance_transactions(
  id,transaction_code,transaction_date,transaction_type,category,direction,amount_minor,currency,
  payment_method,external_reference,description,related_module,related_entity_id,submitted_by,
  verified_by,verified_at,status,receipt_object_key,decision_reason,created_at,updated_at
)
SELECT 'learning-payment:'||id,'LPAY-'||upper(substr(replace(id,'-',''),1,12)),submitted_at,
  CASE WHEN domain_type='EVENT' THEN 'Event Registration Fee' ELSE 'Course Registration Fee' END,
  CASE WHEN domain_type='EVENT' THEN 'Event Registration Fee' ELSE 'Course Registration Fee' END,
  'INCOME',expected_amount_minor,currency,payment_method,transaction_reference,'Learning program payment',
  domain_type,domain_id,user_id,verified_by,verified_at,
  CASE WHEN status='REFUNDED' THEN 'CANCELLED' ELSE status END,evidence_object_key,decision_reason,
  submitted_at,COALESCE(verified_at,submitted_at)
FROM learning_payments;

CREATE TRIGGER membership_payments_finance_insert AFTER INSERT ON membership_payments BEGIN
  INSERT OR IGNORE INTO finance_transactions(
    id,transaction_code,transaction_date,transaction_type,category,direction,amount_minor,currency,
    payment_method,external_reference,description,related_module,related_entity_id,submitted_by,
    verified_by,verified_at,status,decision_reason,created_at,updated_at
  ) VALUES(
    'membership-payment:'||NEW.id,'MPAY-'||upper(substr(replace(NEW.id,'-',''),1,12)),NEW.submitted_at,
    CASE WHEN NEW.renewal_id IS NULL THEN 'Membership Registration Fee' ELSE 'Membership Renewal Fee' END,
    CASE WHEN NEW.renewal_id IS NULL THEN 'Membership Registration Fee' ELSE 'Membership Renewal Fee' END,
    'INCOME',NEW.expected_amount_minor,NEW.currency,NEW.payment_method,NEW.transaction_reference,
    'Membership payment','MEMBERSHIP',COALESCE(NEW.application_id,NEW.renewal_id),NEW.submitted_by,
    NEW.verified_by,NEW.verified_at,NEW.status,NEW.verification_reason,NEW.submitted_at,COALESCE(NEW.verified_at,NEW.submitted_at)
  );
END;

CREATE TRIGGER membership_payments_finance_update AFTER UPDATE OF status,verified_by,verified_at,verification_reason ON membership_payments BEGIN
  UPDATE finance_transactions SET status=NEW.status,verified_by=NEW.verified_by,verified_at=NEW.verified_at,
    decision_reason=NEW.verification_reason,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id='membership-payment:'||NEW.id;
END;

CREATE TRIGGER learning_payments_finance_insert AFTER INSERT ON learning_payments BEGIN
  INSERT OR IGNORE INTO finance_transactions(
    id,transaction_code,transaction_date,transaction_type,category,direction,amount_minor,currency,
    payment_method,external_reference,description,related_module,related_entity_id,submitted_by,
    verified_by,verified_at,status,receipt_object_key,decision_reason,created_at,updated_at
  ) VALUES(
    'learning-payment:'||NEW.id,'LPAY-'||upper(substr(replace(NEW.id,'-',''),1,12)),NEW.submitted_at,
    CASE WHEN NEW.domain_type='EVENT' THEN 'Event Registration Fee' ELSE 'Course Registration Fee' END,
    CASE WHEN NEW.domain_type='EVENT' THEN 'Event Registration Fee' ELSE 'Course Registration Fee' END,
    'INCOME',NEW.expected_amount_minor,NEW.currency,NEW.payment_method,NEW.transaction_reference,
    'Learning program payment',NEW.domain_type,NEW.domain_id,NEW.user_id,NEW.verified_by,NEW.verified_at,
    CASE WHEN NEW.status='REFUNDED' THEN 'CANCELLED' ELSE NEW.status END,NEW.evidence_object_key,
    NEW.decision_reason,NEW.submitted_at,COALESCE(NEW.verified_at,NEW.submitted_at)
  );
END;

CREATE TRIGGER learning_payments_finance_update AFTER UPDATE OF status,verified_by,verified_at,decision_reason ON learning_payments BEGIN
  UPDATE finance_transactions SET status=CASE WHEN NEW.status='REFUNDED' THEN 'CANCELLED' ELSE NEW.status END,
    verified_by=NEW.verified_by,verified_at=NEW.verified_at,decision_reason=NEW.decision_reason,
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id='learning-payment:'||NEW.id;
END;

CREATE TRIGGER managed_events_prevent_delete BEFORE DELETE ON managed_events BEGIN SELECT RAISE(ABORT, 'events require archival'); END;
CREATE TRIGGER people_profiles_prevent_delete BEFORE DELETE ON people_profiles BEGIN SELECT RAISE(ABORT, 'people profiles require archival'); END;
CREATE TRIGGER partner_profiles_prevent_delete BEFORE DELETE ON partner_profiles BEGIN SELECT RAISE(ABORT, 'partners require archival'); END;
CREATE TRIGGER opportunities_prevent_delete BEFORE DELETE ON opportunities BEGIN SELECT RAISE(ABORT, 'opportunities require archival'); END;
CREATE TRIGGER opportunity_applications_prevent_delete BEFORE DELETE ON opportunity_applications BEGIN SELECT RAISE(ABORT, 'applications require archival'); END;
CREATE TRIGGER opportunity_application_events_immutable_update BEFORE UPDATE ON opportunity_application_events BEGIN SELECT RAISE(ABORT, 'application history is immutable'); END;
CREATE TRIGGER opportunity_application_events_immutable_delete BEFORE DELETE ON opportunity_application_events BEGIN SELECT RAISE(ABORT, 'application history is immutable'); END;
CREATE TRIGGER finance_transactions_prevent_delete BEFORE DELETE ON finance_transactions BEGIN SELECT RAISE(ABORT, 'financial records cannot be deleted'); END;
CREATE TRIGGER finance_transaction_events_immutable_update BEFORE UPDATE ON finance_transaction_events BEGIN SELECT RAISE(ABORT, 'financial history is immutable'); END;
CREATE TRIGGER finance_transaction_events_immutable_delete BEFORE DELETE ON finance_transaction_events BEGIN SELECT RAISE(ABORT, 'financial history is immutable'); END;

INSERT OR IGNORE INTO roles(id,role_key,name,description,is_system) VALUES
  ('role:PEOPLE_MANAGER','PEOPLE_MANAGER','People Manager','Manage public people, committee, advisor, mentor, and alumni profiles.',1),
  ('role:PARTNER_MANAGER','PARTNER_MANAGER','Partner Manager','Review partnership applications and manage published partners.',1),
  ('role:OPPORTUNITY_MANAGER','OPPORTUNITY_MANAGER','Opportunity Manager','Manage opportunities and review opportunity applications.',1);

INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role:PEOPLE_MANAGER',id FROM permissions WHERE permission_key='admin.access' OR category='people';
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role:PARTNER_MANAGER',id FROM permissions WHERE permission_key='admin.access' OR category='partner' OR permission_key IN ('submissions.read','submissions.manage');
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role:OPPORTUNITY_MANAGER',id FROM permissions WHERE permission_key='admin.access' OR category='opportunity';

INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role:CONTENT_MANAGER',id FROM permissions
WHERE permission_key IN ('event.read','event.manage','project.read','project.manage','course.read','course.manage','people.read','partner.read','opportunity.read');

INSERT INTO platform_settings(setting_key,value_json,is_public,description)
VALUES('platform.community_operations.version','"1.0.0"',1,'Normalized events, people, partners, opportunities, applications, notifications, and finance schema version');
