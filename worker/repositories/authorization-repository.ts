export interface AuthorizationSnapshot {
  roles: string[];
  permissions: string[];
}

interface AuthorizationRow {
  role_key: string;
  permission_key: string;
}

export async function getAuthorizationForUser(db: D1Database, userId: string): Promise<AuthorizationSnapshot> {
  const { results } = await db
    .prepare(
      `SELECT r.role_key, p.permission_key
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ? AND ur.revoked_at IS NULL
         AND (ur.expires_at IS NULL OR ur.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ORDER BY r.role_key, p.permission_key`,
    )
    .bind(userId)
    .all<AuthorizationRow>();

  return {
    roles: [...new Set(results.map((row) => row.role_key))],
    permissions: [...new Set(results.map((row) => row.permission_key))],
  };
}

export async function userHasPermission(db: D1Database, userId: string, permission: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS allowed
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ? AND p.permission_key = ? AND ur.revoked_at IS NULL
         AND (ur.expires_at IS NULL OR ur.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       LIMIT 1`,
    )
    .bind(userId, permission)
    .first<{ allowed: number }>();
  return row?.allowed === 1;
}
