import { AppError } from "../lib/app-error";
import { sha256 } from "./crypto";

export async function enforceRateLimit(options: {
  db: D1Database;
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<void> {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const windowStartedAt = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStartedAt + windowMs * 2;
  const keyHash = await sha256(`${options.scope}:${options.identifier}`);

  const row = await options.db
    .prepare(
      `INSERT INTO auth_rate_limits (scope, key_hash, window_started_at, hit_count, expires_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(scope, key_hash, window_started_at)
       DO UPDATE SET hit_count = hit_count + 1
       RETURNING hit_count`,
    )
    .bind(options.scope, keyHash, windowStartedAt, expiresAt)
    .first<{ hit_count: number }>();

  if ((row?.hit_count ?? 1) > options.limit) {
    throw new AppError({
      code: "RATE_LIMITED",
      message: "Too many attempts. Please wait before trying again.",
      status: 429,
    });
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}
