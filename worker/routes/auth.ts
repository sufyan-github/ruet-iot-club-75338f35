import { Hono } from "hono";
import { AppError } from "../lib/app-error";
import { success } from "../lib/api-envelope";
import { clientIp, enforceRateLimit } from "../auth/rate-limit";
import {
  clearSessionCookie,
  createSessionMaterial,
  csrfMiddleware,
  currentCsrfToken,
  requireAuth,
  sessionMiddleware,
  setSessionCookie,
} from "../auth/session";
import { createOpaqueToken, hashPassword, sha256, verifyPassword } from "../auth/crypto";
import {
  deletionRequestSchema,
  changePasswordSchema,
  emailChangeSchema,
  emailOnlySchema,
  loginSchema,
  normalizeEmail,
  notificationPreferencesSchema,
  onboardingSchema,
  parseJson,
  registerSchema,
  resetPasswordSchema,
  tokenOnlySchema,
} from "../auth/validation";
import {
  accountDeletionEmail,
  createEmailQueueRecord,
  emailChangeEmail,
  insertEmailStatement,
  passwordResetEmail,
  verificationEmail,
} from "../services/email";
import { enforceTurnstile } from "../services/turnstile";
import type { AppEnvironment } from "../types";
import { createAuditStatement } from "../db/audit";
import { getAuthorizationForUser } from "../repositories/authorization-repository";

const VERIFY_TOKEN_HOURS = 24;
const RESET_TOKEN_HOURS = 1;
const GENERIC_EMAIL_MESSAGE = "If the account is eligible, an email will arrive shortly.";

interface AccountRow {
  id: string;
  primary_email: string;
  primary_email_normalized: string;
  display_name: string;
  status: string;
  onboarding_status: "PENDING" | "COMPLETED" | "DISMISSED";
  password_hash: string;
  failed_attempts: number;
  locked_until: string | null;
  must_change_password: number;
  is_fixed_super_admin: number;
}

interface TokenAccountRow {
  token_id: string;
  user_id: string;
  primary_email: string;
  display_name: string;
}

function expiresInHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function publicUser(row: { id: string; primary_email: string; display_name: string; onboarding_status: string; must_change_password: number; is_fixed_super_admin: number }) {
  return {
    id: row.id,
    email: row.primary_email,
    displayName: row.display_name,
    onboardingStatus: row.onboarding_status,
    mustChangePassword: row.must_change_password === 1,
    fixedSuperAdmin: row.is_fixed_super_admin === 1,
  };
}

function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/iu.test(error.message);
}

export const authRoutes = new Hono<AppEnvironment>();

authRoutes.get("/auth/config", (context) =>
  context.json(
    success({ turnstileSiteKey: context.env.TURNSTILE_SITE_KEY }, context.get("requestId")),
  ),
);

authRoutes.post("/auth/register", async (context) => {
  const input = await parseJson(context, registerSchema);
  const normalizedEmail = normalizeEmail(input.email);
  const ip = clientIp(context.req.raw);
  await enforceRateLimit({ db: context.env.DB, scope: "register", identifier: ip, limit: 5, windowSeconds: 3600 });
  await enforceTurnstile({ env: context.env, request: context.req.raw, token: input.turnstileToken, action: "register" });

  const userId = crypto.randomUUID();
  const token = createOpaqueToken();
  const passwordHash = await hashPassword(input.password);
  const tokenHash = await sha256(token);
  const emailRecord = await createEmailQueueRecord({
    secret: context.env.SESSION_SECRET,
    userId,
    template: "VERIFY_EMAIL",
    recipientEmail: normalizedEmail,
    payload: verificationEmail(context.env.FRONTEND_ORIGIN, input.displayName, token),
  });

  try {
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO users (id, primary_email, primary_email_normalized, display_name)
         VALUES (?, ?, ?, ?)`,
      ).bind(userId, input.email.trim(), normalizedEmail, input.displayName),
      context.env.DB.prepare(
        "INSERT INTO password_credentials (user_id, password_hash) VALUES (?, ?)",
      ).bind(userId, passwordHash),
      context.env.DB.prepare(
        `INSERT INTO email_verification_tokens (id, user_id, email_normalized, token_hash, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), userId, normalizedEmail, tokenHash, expiresInHours(VERIFY_TOKEN_HOURS)),
      context.env.DB.prepare("INSERT INTO notification_preferences (user_id) VALUES (?)").bind(userId),
      context.env.DB.prepare(
        "INSERT INTO user_profiles (user_id, data_json) VALUES (?, ?)",
      ).bind(userId, JSON.stringify({
        phone: input.phone ?? null,
        institution: input.institution,
        department: input.department,
        professional_status: input.professionalStatus,
        consent_recorded_at: new Date().toISOString(),
      })),
      insertEmailStatement(context.env.DB, emailRecord),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: userId,
        action: "ACCOUNT_REGISTERED",
        entityType: "USER",
        entityId: userId,
      }),
    ]);
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new AppError({ code: "ACCOUNT_EXISTS", message: "An account already exists for this email.", status: 409 });
    }
    throw error;
  }

  return context.json(
    success({ verificationRequired: true, message: "Account created. Verify your email before signing in." }, context.get("requestId")),
    201,
  );
});

authRoutes.post("/auth/resend-verification", async (context) => {
  const input = await parseJson(context, emailOnlySchema);
  const normalizedEmail = normalizeEmail(input.email);
  await enforceRateLimit({
    db: context.env.DB,
    scope: "resend-verification",
    identifier: `${clientIp(context.req.raw)}:${normalizedEmail}`,
    limit: 5,
    windowSeconds: 3600,
  });
  const account = await context.env.DB.prepare(
    `SELECT id, primary_email, display_name FROM users
     WHERE primary_email_normalized = ? AND status = 'PENDING_EMAIL_VERIFICATION'`,
  )
    .bind(normalizedEmail)
    .first<{ id: string; primary_email: string; display_name: string }>();

  if (account) {
    const token = createOpaqueToken();
    const emailRecord = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: account.id,
      template: "VERIFY_EMAIL",
      recipientEmail: account.primary_email,
      payload: verificationEmail(context.env.FRONTEND_ORIGIN, account.display_name, token),
    });
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE email_verification_tokens SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL",
      ).bind(new Date().toISOString(), account.id),
      context.env.DB.prepare(
        `INSERT INTO email_verification_tokens (id, user_id, email_normalized, token_hash, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), account.id, normalizedEmail, await sha256(token), expiresInHours(VERIFY_TOKEN_HOURS)),
      insertEmailStatement(context.env.DB, emailRecord),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: account.id,
        action: "EMAIL_VERIFICATION_RESENT",
        entityType: "USER",
        entityId: account.id,
      }),
    ]);
  }
  return context.json(success({ message: GENERIC_EMAIL_MESSAGE }, context.get("requestId")));
});

authRoutes.post("/auth/verify-email", async (context) => {
  const { token } = await parseJson(context, tokenOnlySchema);
  const row = await context.env.DB.prepare(
    `SELECT t.id AS token_id, t.user_id, u.primary_email, u.display_name
     FROM email_verification_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ? AND t.consumed_at IS NULL AND t.expires_at > ?
       AND u.status = 'PENDING_EMAIL_VERIFICATION'`,
  )
    .bind(await sha256(token), new Date().toISOString())
    .first<TokenAccountRow>();
  if (!row) {
    throw new AppError({ code: "INVALID_OR_EXPIRED_TOKEN", message: "This verification link is invalid or expired.", status: 400 });
  }
  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE users SET status = 'EMAIL_VERIFIED', email_verified_at = ?, updated_at = ?
       WHERE id = ? AND status = 'PENDING_EMAIL_VERIFICATION'`,
    ).bind(now, now, row.user_id),
    context.env.DB.prepare("UPDATE email_verification_tokens SET consumed_at = ? WHERE id = ?").bind(now, row.token_id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: row.user_id,
      action: "EMAIL_VERIFIED",
      entityType: "USER",
      entityId: row.user_id,
    }),
  ]);
  return context.json(success({ verified: true }, context.get("requestId")));
});

authRoutes.post("/auth/login", async (context) => {
  const input = await parseJson(context, loginSchema);
  const normalizedEmail = normalizeEmail(input.email);
  const ip = clientIp(context.req.raw);
  await enforceRateLimit({
    db: context.env.DB,
    scope: "login",
    identifier: `${ip}:${normalizedEmail}`,
    limit: 10,
    windowSeconds: 900,
  });
  const account = await context.env.DB.prepare(
    `SELECT u.id, u.primary_email, u.primary_email_normalized, u.display_name, u.status, u.onboarding_status,
            p.password_hash, p.failed_attempts, p.locked_until, p.must_change_password,
            u.is_fixed_super_admin
     FROM users u JOIN password_credentials p ON p.user_id = u.id
     WHERE u.primary_email_normalized = ?`,
  )
    .bind(normalizedEmail)
    .first<AccountRow>();

  if (!account) {
    await hashPassword(input.password);
    throw new AppError({ code: "INVALID_CREDENTIALS", message: "The email or password is incorrect.", status: 401 });
  }

  const validPassword = await verifyPassword(input.password, account.password_hash);
  if (account.locked_until && account.locked_until > new Date().toISOString()) {
    throw new AppError({ code: "ACCOUNT_TEMPORARILY_LOCKED", message: "This account is temporarily locked. Try again later.", status: 429 });
  }
  if (!validPassword) {
    const failures = account.failed_attempts + 1;
    const lockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await context.env.DB.prepare(
      "UPDATE password_credentials SET failed_attempts = ?, locked_until = ? WHERE user_id = ?",
    )
      .bind(failures >= 5 ? 0 : failures, lockedUntil, account.id)
      .run();
    throw new AppError({ code: "INVALID_CREDENTIALS", message: "The email or password is incorrect.", status: 401 });
  }

  if (account.status === "PENDING_EMAIL_VERIFICATION") {
    throw new AppError({ code: "EMAIL_NOT_VERIFIED", message: "Verify your email before signing in.", status: 403 });
  }
  if (account.status !== "EMAIL_VERIFIED") {
    throw new AppError({ code: "ACCOUNT_UNAVAILABLE", message: "This account is not available for sign-in.", status: 403 });
  }

  const session = await createSessionMaterial(context.env.SESSION_SECRET);
  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO sessions
        (id, user_id, token_hash, csrf_token_hash, user_agent_hash, ip_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      session.id,
      account.id,
      session.tokenHash,
      session.csrfTokenHash,
      await sha256(context.req.header("User-Agent") ?? "unknown"),
      await sha256(ip),
      session.expiresAt,
    ),
    context.env.DB.prepare(
      "UPDATE password_credentials SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?",
    ).bind(account.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: account.id,
      action: "SESSION_CREATED",
      entityType: "SESSION",
      entityId: session.id,
    }),
  ]);
  setSessionCookie(context, session.token);
  const authorization = await getAuthorizationForUser(context.env.DB, account.id);
  return context.json(
    success(
      {
        user: { ...publicUser(account), roles: authorization.roles, permissions: authorization.permissions },
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt,
      },
      context.get("requestId"),
    ),
  );
});

authRoutes.post("/auth/forgot-password", async (context) => {
  const input = await parseJson(context, emailOnlySchema);
  const normalizedEmail = normalizeEmail(input.email);
  await enforceRateLimit({
    db: context.env.DB,
    scope: "forgot-password",
    identifier: `${clientIp(context.req.raw)}:${normalizedEmail}`,
    limit: 5,
    windowSeconds: 3600,
  });
  const account = await context.env.DB.prepare(
    `SELECT id, primary_email, display_name FROM users
     WHERE primary_email_normalized = ? AND status = 'EMAIL_VERIFIED'`,
  )
    .bind(normalizedEmail)
    .first<{ id: string; primary_email: string; display_name: string }>();
  if (account) {
    const token = createOpaqueToken();
    const emailRecord = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: account.id,
      template: "RESET_PASSWORD",
      recipientEmail: account.primary_email,
      payload: passwordResetEmail(context.env.FRONTEND_ORIGIN, account.display_name, token),
    });
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE password_reset_tokens SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL",
      ).bind(new Date().toISOString(), account.id),
      context.env.DB.prepare(
        "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), account.id, await sha256(token), expiresInHours(RESET_TOKEN_HOURS)),
      insertEmailStatement(context.env.DB, emailRecord),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: account.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "USER",
        entityId: account.id,
      }),
    ]);
  }
  return context.json(success({ message: GENERIC_EMAIL_MESSAGE }, context.get("requestId")));
});

authRoutes.post("/auth/reset-password", async (context) => {
  const input = await parseJson(context, resetPasswordSchema);
  const row = await context.env.DB.prepare(
    `SELECT t.id AS token_id, t.user_id, u.primary_email, u.display_name
     FROM password_reset_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ? AND t.consumed_at IS NULL AND t.expires_at > ? AND u.status = 'EMAIL_VERIFIED'`,
  )
    .bind(await sha256(input.token), new Date().toISOString())
    .first<TokenAccountRow>();
  if (!row) {
    throw new AppError({ code: "INVALID_OR_EXPIRED_TOKEN", message: "This reset link is invalid or expired.", status: 400 });
  }
  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE password_credentials SET password_hash = ?, password_changed_at = ?, failed_attempts = 0, locked_until = NULL, must_change_password = 0 WHERE user_id = ?",
    ).bind(await hashPassword(input.password), now, row.user_id),
    context.env.DB.prepare("UPDATE password_reset_tokens SET consumed_at = ? WHERE id = ?").bind(now, row.token_id),
    context.env.DB.prepare(
      "UPDATE sessions SET revoked_at = ?, revocation_reason = 'PASSWORD_RESET' WHERE user_id = ? AND revoked_at IS NULL",
    ).bind(now, row.user_id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: row.user_id,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: row.user_id,
    }),
  ]);
  return context.json(success({ reset: true, signInRequired: true }, context.get("requestId")));
});

authRoutes.post("/auth/change-password", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user, session } = requireAuth(context);
  const input = await parseJson(context, changePasswordSchema);
  const credential = await context.env.DB.prepare(
    "SELECT password_hash FROM password_credentials WHERE user_id = ?",
  ).bind(user.id).first<{ password_hash: string }>();
  if (!credential || !(await verifyPassword(input.currentPassword, credential.password_hash))) {
    throw new AppError({ code: "INVALID_CREDENTIALS", message: "The current password is incorrect.", status: 401 });
  }
  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE password_credentials
       SET password_hash = ?, password_changed_at = ?, failed_attempts = 0,
           locked_until = NULL, must_change_password = 0
       WHERE user_id = ?`,
    ).bind(await hashPassword(input.newPassword), now, user.id),
    context.env.DB.prepare(
      `UPDATE sessions SET revoked_at = ?, revocation_reason = 'PASSWORD_CHANGED'
       WHERE user_id = ? AND id != ? AND revoked_at IS NULL`,
    ).bind(now, user.id, session.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "PASSWORD_CHANGED",
      entityType: "USER",
      entityId: user.id,
      metadata: { otherSessionsRevoked: true },
    }),
  ]);
  return context.json(success({ changed: true, mustChangePassword: false }, context.get("requestId")));
});

authRoutes.get("/auth/session", sessionMiddleware({ required: false }), async (context) => {
  const user = context.get("authUser");
  if (!user) return context.json(success({ authenticated: false }, context.get("requestId")));
  const csrfToken = await currentCsrfToken(context);
  return context.json(success({ authenticated: true, user, csrfToken }, context.get("requestId")));
});

authRoutes.post("/auth/logout", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user, session } = requireAuth(context);
  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE sessions SET revoked_at = ?, revocation_reason = 'USER_LOGOUT' WHERE id = ? AND revoked_at IS NULL",
    ).bind(now, session.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "SESSION_REVOKED",
      entityType: "SESSION",
      entityId: session.id,
    }),
  ]);
  clearSessionCookie(context);
  return context.json(success({ loggedOut: true }, context.get("requestId")));
});

authRoutes.post("/auth/logout-all", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE sessions SET revoked_at = ?, revocation_reason = 'USER_LOGOUT_ALL' WHERE user_id = ? AND revoked_at IS NULL",
    ).bind(now, user.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "ALL_SESSIONS_REVOKED",
      entityType: "USER",
      entityId: user.id,
    }),
  ]);
  clearSessionCookie(context);
  return context.json(success({ loggedOut: true, allSessions: true }, context.get("requestId")));
});

authRoutes.post("/auth/change-email/request", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  if (user.fixedSuperAdmin) {
    throw new AppError({ code: "FIXED_ADMIN_EMAIL", message: "This fixed super administrator email cannot be changed.", status: 409 });
  }
  const input = await parseJson(context, emailChangeSchema);
  const normalizedEmail = normalizeEmail(input.email);
  const credential = await context.env.DB.prepare("SELECT password_hash FROM password_credentials WHERE user_id = ?")
    .bind(user.id)
    .first<{ password_hash: string }>();
  if (!credential || !(await verifyPassword(input.password, credential.password_hash))) {
    throw new AppError({ code: "INVALID_CREDENTIALS", message: "The password is incorrect.", status: 401 });
  }
  const existing = await context.env.DB.prepare("SELECT id FROM users WHERE primary_email_normalized = ?")
    .bind(normalizedEmail)
    .first();
  if (existing) {
    throw new AppError({ code: "EMAIL_UNAVAILABLE", message: "That email address cannot be used.", status: 409 });
  }
  const token = createOpaqueToken();
  const emailRecord = await createEmailQueueRecord({
    secret: context.env.SESSION_SECRET,
    userId: user.id,
    template: "VERIFY_EMAIL_CHANGE",
    recipientEmail: input.email.trim(),
    payload: emailChangeEmail(context.env.FRONTEND_ORIGIN, user.displayName, token),
  });
  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE email_change_requests SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL",
    ).bind(now, user.id),
    context.env.DB.prepare(
      `INSERT INTO email_change_requests
        (id, user_id, new_email, new_email_normalized, token_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), user.id, input.email.trim(), normalizedEmail, await sha256(token), expiresInHours(1)),
    insertEmailStatement(context.env.DB, emailRecord),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "EMAIL_CHANGE_REQUESTED",
      entityType: "USER",
      entityId: user.id,
    }),
  ]);
  return context.json(success({ verificationRequired: true }, context.get("requestId")));
});

authRoutes.post("/auth/change-email/verify", async (context) => {
  const { token } = await parseJson(context, tokenOnlySchema);
  const row = await context.env.DB.prepare(
    `SELECT id, user_id, new_email, new_email_normalized
     FROM email_change_requests
     WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > ?`,
  )
    .bind(await sha256(token), new Date().toISOString())
    .first<{ id: string; user_id: string; new_email: string; new_email_normalized: string }>();
  if (!row) {
    throw new AppError({ code: "INVALID_OR_EXPIRED_TOKEN", message: "This email-change link is invalid or expired.", status: 400 });
  }
  const now = new Date().toISOString();
  try {
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE users SET primary_email = ?, primary_email_normalized = ?, updated_at = ? WHERE id = ?",
      ).bind(row.new_email, row.new_email_normalized, now, row.user_id),
      context.env.DB.prepare("UPDATE email_change_requests SET consumed_at = ? WHERE id = ?").bind(now, row.id),
      context.env.DB.prepare(
        "UPDATE sessions SET revoked_at = ?, revocation_reason = 'EMAIL_CHANGED' WHERE user_id = ? AND revoked_at IS NULL",
      ).bind(now, row.user_id),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: row.user_id,
        action: "EMAIL_CHANGED",
        entityType: "USER",
        entityId: row.user_id,
      }),
    ]);
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new AppError({ code: "EMAIL_UNAVAILABLE", message: "That email address cannot be used.", status: 409 });
    }
    throw error;
  }
  clearSessionCookie(context);
  return context.json(success({ changed: true, signInRequired: true }, context.get("requestId")));
});

authRoutes.post("/auth/onboarding", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, onboardingSchema);
  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE users SET onboarding_status = ?, updated_at = ? WHERE id = ?")
      .bind(input.status, new Date().toISOString(), user.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: input.status === "COMPLETED" ? "ONBOARDING_COMPLETED" : "ONBOARDING_DISMISSED",
      entityType: "USER",
      entityId: user.id,
    }),
  ]);
  return context.json(success({ onboardingStatus: input.status }, context.get("requestId")));
});

authRoutes.get("/account/notification-preferences", sessionMiddleware({ required: true }), async (context) => {
  const { user } = requireAuth(context);
  const row = await context.env.DB.prepare(
    "SELECT account_email, event_email, announcement_email FROM notification_preferences WHERE user_id = ?",
  )
    .bind(user.id)
    .first<{ account_email: number; event_email: number; announcement_email: number }>();
  return context.json(
    success(
      {
        accountEmail: row?.account_email === 1,
        eventEmail: row?.event_email === 1,
        announcementEmail: row?.announcement_email === 1,
      },
      context.get("requestId"),
    ),
  );
});

authRoutes.patch(
  "/account/notification-preferences",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, notificationPreferencesSchema);
    await context.env.DB.prepare(
      `UPDATE notification_preferences
       SET account_email = COALESCE(?, account_email), event_email = COALESCE(?, event_email),
           announcement_email = COALESCE(?, announcement_email), updated_at = ?
       WHERE user_id = ?`,
    )
      .bind(
        input.accountEmail === undefined ? null : Number(input.accountEmail),
        input.eventEmail === undefined ? null : Number(input.eventEmail),
        input.announcementEmail === undefined ? null : Number(input.announcementEmail),
        new Date().toISOString(),
        user.id,
      )
      .run();
    return context.json(success({ updated: true }, context.get("requestId")));
  },
);

authRoutes.post(
  "/account/deletion-request",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    if (user.fixedSuperAdmin) {
      throw new AppError({ code: "FIXED_ADMIN_ACCOUNT", message: "A fixed super administrator account cannot be deleted.", status: 409 });
    }
    const input = await parseJson(context, deletionRequestSchema);
    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();
    const emailRecord = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: user.id,
      template: "ACCOUNT_DELETION_REQUESTED",
      recipientEmail: user.email,
      payload: accountDeletionEmail(user.displayName),
    });
    try {
      await context.env.DB.batch([
        context.env.DB.prepare(
          "INSERT INTO account_deletion_requests (id, user_id, reason) VALUES (?, ?, ?)",
        ).bind(requestId, user.id, input.reason ?? null),
        context.env.DB.prepare(
          "UPDATE users SET status = 'DELETION_REQUESTED', updated_at = ? WHERE id = ?",
        ).bind(now, user.id),
        context.env.DB.prepare(
          "UPDATE sessions SET revoked_at = ?, revocation_reason = 'DELETION_REQUESTED' WHERE user_id = ? AND revoked_at IS NULL",
        ).bind(now, user.id),
        insertEmailStatement(context.env.DB, emailRecord),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "ACCOUNT_DELETION_REQUESTED",
          entityType: "ACCOUNT_DELETION_REQUEST",
          entityId: requestId,
        }),
      ]);
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
    }
    clearSessionCookie(context);
    return context.json(success({ requested: true, signedOut: true }, context.get("requestId")), 202);
  },
);
