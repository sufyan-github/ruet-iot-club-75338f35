PRAGMA foreign_keys = ON;

DROP TRIGGER roles_prevent_system_mutation;

CREATE TRIGGER roles_prevent_system_mutation
BEFORE UPDATE ON roles
WHEN OLD.is_system = 1
BEGIN
  SELECT RAISE(ABORT, 'system roles are immutable');
END;

CREATE TRIGGER role_permissions_prevent_super_admin_delegation
BEFORE INSERT ON role_permissions
WHEN NEW.permission_id = 'permission:rbac.super_admin.manage'
  AND NEW.role_id != 'role:SUPER_ADMIN'
BEGIN
  SELECT RAISE(ABORT, 'super administrator authority cannot be delegated to another role');
END;

UPDATE platform_settings
SET value_json = '"0.3.1"', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE setting_key = 'platform.authorization.version';
