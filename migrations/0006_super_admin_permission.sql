PRAGMA foreign_keys = ON;

INSERT INTO permissions (id, permission_key, category, description)
VALUES (
  'permission:rbac.super_admin.manage',
  'rbac.super_admin.manage',
  'system',
  'Grant, revoke, suspend, or archive accounts holding super administrator authority.'
);

INSERT INTO role_permissions (role_id, permission_id)
VALUES ('role:SUPER_ADMIN', 'permission:rbac.super_admin.manage');
