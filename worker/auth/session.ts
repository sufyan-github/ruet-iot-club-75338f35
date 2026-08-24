import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { AppError } from "../lib/app-error";
import type { AppEnvironment, AuthenticatedSession, AuthenticatedUser } from "../types";
import { createOpaqueToken, deriveCsrfToken, sha256, timingSafeEqualStrings } from "./crypto";
import { getAuthorizationForUser } from "../repositories/authorization-repository";

const SESSION_DAYS = 30;

interface SessionRow {
  session_id: string;
  user_id: string;
  csrf_token_hash: string;
  expires_at: string;
  primary_email: string;
  display_name: string;
  status: AuthenticatedUser["status"];
  onboarding_status: AuthenticatedUser["onboardingStatus"];
  must_change_password: number | null;
  is_fixed_super_admin: number;
}

function cookieName(environment: string): string {
  return environment === "development" ? "ruet_session" : "__Host-ruet_session";
}

function cookieOptions(environment: string) {
  return {
    path: "/",
    httpOnly: true,
    secure: environment !== "development",
    sameSite: "Lax" as const,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export interface NewSession {
  id: string;
  token: string;
  tokenHash: string;
  csrfToken: string;
  csrfTokenHash: string;
  expiresAt: string;
}

export async function createSessionMaterial(secret?: string): Promise<NewSession> {
  const id = crypto.randomUUID();
  const token = createOpaqueToken();
  const csrfToken = secret ? await deriveCsrfToken(secret, id) : createOpaqueToken();
  return {
    id,
    token,
    tokenHash: await sha256(token),
    csrfToken,
    csrfTokenHash: await sha256(csrfToken),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function setSessionCookie(context: Context<AppEnvironment>, token: string): void {
  setCookie(context, cookieName(context.env.ENVIRONMENT), token, cookieOptions(context.env.ENVIRONMENT));
}

export function clearSessionCookie(context: Context<AppEnvironment>): void {
  deleteCookie(context, cookieName(context.env.ENVIRONMENT), {
    path: "/",
    secure: context.env.ENVIRONMENT !== "development",
  });
}

async function resolveSession(context: Context<AppEnvironment>): Promise<SessionRow | null> {
  const token = getCookie(context, cookieName(context.env.ENVIRONMENT));
  if (!token) return null;
  const tokenHash = await sha256(token);
  return context.env.DB.prepare(
    `SELECT s.id AS session_id, s.user_id, s.csrf_token_hash, s.expires_at,
            u.primary_email, u.display_name, u.status, u.onboarding_status,
            p.must_change_password, u.is_fixed_super_admin
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN password_credentials p ON p.user_id = u.id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
       AND u.status = 'EMAIL_VERIFIED'`,
  )
    .bind(tokenHash, new Date().toISOString())
    .first<SessionRow>();
}

export function sessionMiddleware(options: { required: boolean }): MiddlewareHandler<AppEnvironment> {
  return async (context, next) => {
    const row = await resolveSession(context);
    if (!row) {
      context.set("authUser", null);
      context.set("authSession", null);
      if (options.required) {
        clearSessionCookie(context);
        throw new AppError({ code: "AUTHENTICATION_REQUIRED", message: "Please sign in to continue.", status: 401 });
      }
      return next();
    }

    const authorization = await getAuthorizationForUser(context.env.DB, row.user_id);
    const user: AuthenticatedUser = {
      id: row.user_id,
      email: row.primary_email,
      displayName: row.display_name,
      status: row.status,
      onboardingStatus: row.onboarding_status,
      mustChangePassword: row.must_change_password === 1,
      fixedSuperAdmin: row.is_fixed_super_admin === 1,
      roles: authorization.roles,
      permissions: authorization.permissions,
    };
    const session: AuthenticatedSession = {
      id: row.session_id,
      userId: row.user_id,
      csrfTokenHash: row.csrf_token_hash,
      expiresAt: row.expires_at,
    };
    context.set("authUser", user);
    context.set("authSession", session);
    context.executionCtx.waitUntil(
      context.env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?")
        .bind(new Date().toISOString(), row.session_id)
        .run(),
    );
    return next();
  };
}

export function csrfMiddleware(): MiddlewareHandler<AppEnvironment> {
  return async (context, next) => {
    const origin = context.req.header("Origin");
    const siteUrl = new URL(context.env.SITE_URL);
    const frontendUrl = new URL(context.env.FRONTEND_ORIGIN);
    const allowedOrigins = new Set([siteUrl.origin, frontendUrl.origin]);
    if (siteUrl.protocol === "https:" && !siteUrl.hostname.startsWith("www.")) {
      allowedOrigins.add(`${siteUrl.protocol}//www.${siteUrl.host}`);
    }
    if (!origin || !allowedOrigins.has(origin)) {
      throw new AppError({ code: "INVALID_ORIGIN", message: "The request origin is not allowed.", status: 403 });
    }

    const session = context.get("authSession");
    const token = context.req.header("X-CSRF-Token")?.trim();
    if (!session || !token) {
      throw new AppError({ code: "CSRF_VALIDATION_FAILED", message: "The request could not be validated.", status: 403 });
    }
    const storedTokenMatches = await timingSafeEqualStrings(await sha256(token), session.csrfTokenHash);
    const stableTokenMatches = await timingSafeEqualStrings(
      token,
      await deriveCsrfToken(context.env.SESSION_SECRET, session.id),
    );
    if (!storedTokenMatches && !stableTokenMatches) {
      throw new AppError({ code: "CSRF_VALIDATION_FAILED", message: "The request could not be validated.", status: 403 });
    }
    return next();
  };
}

export function requireAuth(context: Context<AppEnvironment>): {
  user: AuthenticatedUser;
  session: AuthenticatedSession;
} {
  const user = context.get("authUser");
  const session = context.get("authSession");
  if (!user || !session) {
    throw new AppError({ code: "AUTHENTICATION_REQUIRED", message: "Please sign in to continue.", status: 401 });
  }
  return { user, session };
}

export async function currentCsrfToken(context: Context<AppEnvironment>): Promise<string> {
  const { session } = requireAuth(context);
  return deriveCsrfToken(context.env.SESSION_SECRET, session.id);
}
