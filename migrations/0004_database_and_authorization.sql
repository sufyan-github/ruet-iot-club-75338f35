PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN deleted_by TEXT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN deletion_reason TEXT;

CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  permission_key TEXT NOT NULL UNIQUE CHECK (length(permission_key) BETWEEN 3 AND 100),
  category TEXT NOT NULL CHECK (length(category) BETWEEN 2 AND 50),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 3 AND 300),
  is_system INTEGER NOT NULL DEFAULT 1 CHECK (is_system IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX permissions_category_key_idx ON permissions(category, permission_key);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE CHECK (length(role_key) BETWEEN 2 AND 64),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 3 AND 500),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  created_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  deleted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  deletion_reason TEXT,
  CHECK (
    (deleted_at IS NULL AND deleted_by IS NULL AND deletion_reason IS NULL)
    OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND deletion_reason IS NOT NULL)
  )
) STRICT;

CREATE INDEX roles_active_key_idx ON roles(deleted_at, role_key);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE RESTRICT,
  granted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (role_id, permission_id)
) STRICT;

CREATE INDEX role_permissions_permission_idx ON role_permissions(permission_id, role_id);

CREATE TABLE user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  granted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  grant_reason TEXT NOT NULL CHECK (length(grant_reason) BETWEEN 3 AND 1000),
  granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT,
  revoked_at TEXT,
  revoked_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  revocation_reason TEXT,
  CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
    OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revocation_reason IS NOT NULL)
  )
) STRICT;

CREATE UNIQUE INDEX user_roles_one_active_assignment_idx
  ON user_roles(user_id, role_id) WHERE revoked_at IS NULL;
CREATE INDEX user_roles_user_active_idx ON user_roles(user_id, revoked_at, expires_at);
CREATE INDEX user_roles_role_active_idx ON user_roles(role_id, revoked_at, expires_at);

CREATE TABLE command_idempotency (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL CHECK (length(operation) BETWEEN 3 AND 100),
  actor_key TEXT NOT NULL CHECK (length(actor_key) BETWEEN 3 AND 100),
  key_hash TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (state IN ('IN_PROGRESS', 'COMPLETED')),
  response_status INTEGER CHECK (response_status IS NULL OR response_status BETWEEN 200 AND 599),
  response_body_json TEXT CHECK (response_body_json IS NULL OR json_valid(response_body_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  expires_at TEXT NOT NULL,
  UNIQUE(operation, actor_key, key_hash),
  CHECK (
    (state = 'IN_PROGRESS' AND response_status IS NULL AND response_body_json IS NULL AND completed_at IS NULL)
    OR (state = 'COMPLETED' AND response_status IS NOT NULL AND response_body_json IS NOT NULL AND completed_at IS NOT NULL)
  )
) STRICT;

CREATE INDEX command_idempotency_expiry_idx ON command_idempotency(expires_at);

INSERT INTO permissions (id, permission_key, category, description) VALUES
  ('permission:admin.access', 'admin.access', 'system', 'Access the protected administration workspace.'),
  ('permission:users.read', 'users.read', 'system', 'Read user account records.'),
  ('permission:users.manage', 'users.manage', 'system', 'Suspend and restore user accounts.'),
  ('permission:users.archive', 'users.archive', 'system', 'Archive user accounts with a reason.'),
  ('permission:rbac.read', 'rbac.read', 'system', 'Read roles, permissions, and assignments.'),
  ('permission:rbac.roles.manage', 'rbac.roles.manage', 'system', 'Create, configure, and archive custom roles.'),
  ('permission:rbac.assignments.manage', 'rbac.assignments.manage', 'system', 'Grant and revoke role assignments.'),
  ('permission:audit.read', 'audit.read', 'system', 'Read immutable audit events.'),
  ('permission:settings.read', 'settings.read', 'system', 'Read private platform settings.'),
  ('permission:settings.manage', 'settings.manage', 'system', 'Manage private platform settings.'),
  ('permission:notifications.manage', 'notifications.manage', 'system', 'Manage system notifications.'),
  ('permission:membership.read', 'membership.read', 'membership', 'Read membership records.'),
  ('permission:membership.review', 'membership.review', 'membership', 'Review membership applications.'),
  ('permission:membership.approve', 'membership.approve', 'membership', 'Approve eligible membership applications.'),
  ('permission:membership.reject', 'membership.reject', 'membership', 'Reject membership applications with a reason.'),
  ('permission:membership.manage', 'membership.manage', 'membership', 'Manage membership configuration and lifecycle.'),
  ('permission:volunteer.read', 'volunteer.read', 'volunteer', 'Read volunteer records.'),
  ('permission:volunteer.review', 'volunteer.review', 'volunteer', 'Review volunteer applications.'),
  ('permission:volunteer.approve', 'volunteer.approve', 'volunteer', 'Approve eligible volunteer applications.'),
  ('permission:volunteer.reject', 'volunteer.reject', 'volunteer', 'Reject volunteer applications with a reason.'),
  ('permission:volunteer.manage', 'volunteer.manage', 'volunteer', 'Manage volunteer configuration and lifecycle.'),
  ('permission:project.read', 'project.read', 'project', 'Read internal project records.'),
  ('permission:project.review', 'project.review', 'project', 'Review project submissions.'),
  ('permission:project.manage', 'project.manage', 'project', 'Manage project records and publication.'),
  ('permission:research.read', 'research.read', 'research', 'Read internal research records.'),
  ('permission:research.review', 'research.review', 'research', 'Review research proposals.'),
  ('permission:research.approve', 'research.approve', 'research', 'Approve research proposals.'),
  ('permission:research.manage', 'research.manage', 'research', 'Manage research records and publication.'),
  ('permission:event.read', 'event.read', 'event', 'Read internal event records.'),
  ('permission:event.manage', 'event.manage', 'event', 'Manage events, registrations, and attendance.'),
  ('permission:course.read', 'course.read', 'course', 'Read internal course records.'),
  ('permission:course.manage', 'course.manage', 'course', 'Manage courses, enrollment, and completion.'),
  ('permission:content.read', 'content.read', 'content', 'Read unpublished content.'),
  ('permission:content.manage', 'content.manage', 'content', 'Manage content drafts and media.'),
  ('permission:content.publish', 'content.publish', 'content', 'Publish or unpublish content.'),
  ('permission:finance.read', 'finance.read', 'finance', 'Read payment and finance records.'),
  ('permission:finance.verify', 'finance.verify', 'finance', 'Verify submitted payments.'),
  ('permission:finance.manage', 'finance.manage', 'finance', 'Manage financial configuration and reports.'),
  ('permission:certificate.read', 'certificate.read', 'certificate', 'Read certificate records.'),
  ('permission:certificate.issue', 'certificate.issue', 'certificate', 'Issue eligible certificates.'),
  ('permission:certificate.revoke', 'certificate.revoke', 'certificate', 'Revoke certificates with a reason.'),
  ('permission:certificate.manage', 'certificate.manage', 'certificate', 'Manage certificate templates and policies.'),
  ('permission:people.read', 'people.read', 'people', 'Read internal people directory records.'),
  ('permission:people.manage', 'people.manage', 'people', 'Manage people, executive, advisor, mentor, and alumni records.'),
  ('permission:partner.read', 'partner.read', 'partner', 'Read internal partner and collaboration records.'),
  ('permission:partner.manage', 'partner.manage', 'partner', 'Manage partners and collaboration requests.'),
  ('permission:opportunity.read', 'opportunity.read', 'opportunity', 'Read internal opportunity records.'),
  ('permission:opportunity.manage', 'opportunity.manage', 'opportunity', 'Manage opportunity records and publication.');

INSERT INTO roles (id, role_key, name, description, is_system) VALUES
  ('role:SUPER_ADMIN', 'SUPER_ADMIN', 'Super Administrator', 'Full platform authority. At least one active verified account must retain this role.', 1),
  ('role:ADMIN', 'ADMIN', 'Administrator', 'Broad operational administration without control of system role definitions.', 1),
  ('role:EXECUTIVE', 'EXECUTIVE', 'Executive', 'Executive oversight across club programs and content.', 1),
  ('role:MEMBERSHIP_MANAGER', 'MEMBERSHIP_MANAGER', 'Membership Manager', 'Membership and volunteer application operations.', 1),
  ('role:PROJECT_MANAGER', 'PROJECT_MANAGER', 'Project Manager', 'Project submission, review, and portfolio operations.', 1),
  ('role:RESEARCH_MANAGER', 'RESEARCH_MANAGER', 'Research Manager', 'Research proposal, review, and publication operations.', 1),
  ('role:EVENT_MANAGER', 'EVENT_MANAGER', 'Event Manager', 'Event, registration, and attendance operations.', 1),
  ('role:CONTENT_MANAGER', 'CONTENT_MANAGER', 'Content Manager', 'Blog, announcement, gallery, hero, and page operations.', 1),
  ('role:FINANCE_MANAGER', 'FINANCE_MANAGER', 'Finance Manager', 'Payment verification and financial reporting operations.', 1),
  ('role:CERTIFICATE_MANAGER', 'CERTIFICATE_MANAGER', 'Certificate Manager', 'Certificate template, issuance, and revocation operations.', 1),
  ('role:REVIEWER', 'REVIEWER', 'Reviewer', 'Assigned project and research review operations.', 1),
  ('role:MENTOR', 'MENTOR', 'Mentor', 'Mentor workspace access and people-directory visibility.', 1);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:SUPER_ADMIN', id FROM permissions;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:ADMIN', id FROM permissions
WHERE permission_key NOT IN ('rbac.roles.manage', 'settings.manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:EXECUTIVE', id FROM permissions
WHERE permission_key IN (
  'admin.access', 'users.read', 'audit.read', 'membership.read', 'volunteer.read',
  'project.read', 'project.manage', 'research.read', 'research.manage', 'event.read', 'event.manage',
  'course.read', 'content.read', 'content.manage', 'content.publish', 'finance.read',
  'certificate.read', 'people.read', 'people.manage', 'partner.read', 'opportunity.read'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:MEMBERSHIP_MANAGER', id FROM permissions
WHERE permission_key = 'admin.access' OR category IN ('membership', 'volunteer');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:PROJECT_MANAGER', id FROM permissions
WHERE permission_key = 'admin.access' OR category = 'project';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:RESEARCH_MANAGER', id FROM permissions
WHERE permission_key = 'admin.access' OR category = 'research';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:EVENT_MANAGER', id FROM permissions
WHERE permission_key = 'admin.access' OR category = 'event';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:CONTENT_MANAGER', id FROM permissions
WHERE permission_key = 'admin.access' OR category = 'content';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:FINANCE_MANAGER', id FROM permissions
WHERE permission_key = 'admin.access' OR category = 'finance';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:CERTIFICATE_MANAGER', id FROM permissions
WHERE permission_key = 'admin.access' OR category = 'certificate';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:REVIEWER', id FROM permissions
WHERE permission_key IN ('admin.access', 'project.read', 'project.review', 'research.read', 'research.review');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role:MENTOR', id FROM permissions
WHERE permission_key IN ('admin.access', 'people.read');

CREATE TRIGGER permissions_prevent_update
BEFORE UPDATE ON permissions
BEGIN
  SELECT RAISE(ABORT, 'system permissions are immutable');
END;

CREATE TRIGGER permissions_prevent_delete
BEFORE DELETE ON permissions
BEGIN
  SELECT RAISE(ABORT, 'permissions cannot be hard deleted');
END;

CREATE TRIGGER roles_prevent_system_mutation
BEFORE UPDATE OF role_key, deleted_at ON roles
WHEN OLD.is_system = 1 AND (NEW.role_key != OLD.role_key OR NEW.deleted_at IS NOT OLD.deleted_at)
BEGIN
  SELECT RAISE(ABORT, 'system roles are immutable');
END;

CREATE TRIGGER roles_prevent_delete
BEFORE DELETE ON roles
BEGIN
  SELECT RAISE(ABORT, 'roles require soft deletion');
END;

CREATE TRIGGER role_permissions_prevent_super_admin_reduction
BEFORE DELETE ON role_permissions
WHEN OLD.role_id = 'role:SUPER_ADMIN'
BEGIN
  SELECT RAISE(ABORT, 'super administrator permissions cannot be removed');
END;

CREATE TRIGGER user_roles_prevent_delete
BEFORE DELETE ON user_roles
BEGIN
  SELECT RAISE(ABORT, 'role assignments require revocation');
END;

CREATE TRIGGER users_prevent_delete
BEFORE DELETE ON users
BEGIN
  SELECT RAISE(ABORT, 'users require soft deletion');
END;

CREATE TRIGGER user_roles_prevent_last_super_admin_revoke
BEFORE UPDATE OF revoked_at, expires_at ON user_roles
WHEN OLD.role_id = 'role:SUPER_ADMIN'
  AND OLD.revoked_at IS NULL
  AND (OLD.expires_at IS NULL OR OLD.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  AND (
    NEW.revoked_at IS NOT NULL
    OR (NEW.expires_at IS NOT NULL AND NEW.expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
  AND (
    SELECT COUNT(*)
    FROM user_roles other
    JOIN users account ON account.id = other.user_id
    WHERE other.role_id = 'role:SUPER_ADMIN'
      AND other.id != OLD.id
      AND other.revoked_at IS NULL
      AND (other.expires_at IS NULL OR other.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      AND account.status = 'EMAIL_VERIFIED'
      AND account.deleted_at IS NULL
  ) = 0
BEGIN
  SELECT RAISE(ABORT, 'cannot revoke the last active super administrator');
END;

CREATE TRIGGER users_prevent_last_super_admin_disable
BEFORE UPDATE OF status, deleted_at ON users
WHEN OLD.status = 'EMAIL_VERIFIED'
  AND OLD.deleted_at IS NULL
  AND (NEW.status != 'EMAIL_VERIFIED' OR NEW.deleted_at IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM user_roles own
    WHERE own.user_id = OLD.id
      AND own.role_id = 'role:SUPER_ADMIN'
      AND own.revoked_at IS NULL
      AND (own.expires_at IS NULL OR own.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
  AND (
    SELECT COUNT(DISTINCT other.user_id)
    FROM user_roles other
    JOIN users account ON account.id = other.user_id
    WHERE other.role_id = 'role:SUPER_ADMIN'
      AND other.user_id != OLD.id
      AND other.revoked_at IS NULL
      AND (other.expires_at IS NULL OR other.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      AND account.status = 'EMAIL_VERIFIED'
      AND account.deleted_at IS NULL
  ) = 0
BEGIN
  SELECT RAISE(ABORT, 'cannot disable the last active super administrator');
END;

INSERT INTO platform_settings (setting_key, value_json, is_public, description)
VALUES ('platform.authorization.version', '"0.3.0"', 1, 'Database authorization and RBAC schema version');
