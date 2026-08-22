PRAGMA foreign_keys = ON;

CREATE TRIGGER user_roles_prevent_repeated_system_bootstrap
BEFORE INSERT ON user_roles
WHEN NEW.role_id = 'role:SUPER_ADMIN'
  AND NEW.granted_by IS NULL
  AND EXISTS (
    SELECT 1
    FROM user_roles existing
    JOIN users account ON account.id = existing.user_id
    WHERE existing.role_id = 'role:SUPER_ADMIN'
      AND existing.revoked_at IS NULL
      AND (existing.expires_at IS NULL OR existing.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      AND account.status = 'EMAIL_VERIFIED'
      AND account.deleted_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'authorization bootstrap has already completed');
END;
