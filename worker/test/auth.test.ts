import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptJson } from "../auth/crypto";

interface Envelope<T> {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
}

interface OutboxPayload {
  subject: string;
  html: string;
  text: string;
}

const origin = "https://test.invalid";

async function request<T>(path: string, options: { method?: string; body?: unknown; cookie?: string; csrf?: string } = {}) {
  const headers = new Headers({ Accept: "application/json", Origin: origin });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.cookie) headers.set("Cookie", options.cookie);
  if (options.csrf) headers.set("X-CSRF-Token", options.csrf);
  const response = await exports.default.fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  return { response, body: await response.json<Envelope<T>>() };
}

async function latestEmailToken(userId: string, template: string): Promise<string> {
  const row = await env.DB.prepare(
    `SELECT encrypted_payload, payload_iv FROM email_outbox
     WHERE user_id = ? AND template = ? ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(userId, template)
    .first<{ encrypted_payload: string; payload_iv: string }>();
  expect(row).toBeTruthy();
  const payload = await decryptJson<OutboxPayload>(row!.encrypted_payload, row!.payload_iv, env.SESSION_SECRET);
  const match = payload.text.match(/[?&]token=([^\s]+)/u);
  expect(match?.[1]).toBeTruthy();
  return decodeURIComponent(match![1]);
}

beforeAll(async () => {
  const migrations = (env as Env & { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS;
  await applyD1Migrations(env.DB, migrations);
});

describe("Phase 2 authentication and accounts", () => {
  it("requires email verification, creates a secure session, and enforces CSRF", async () => {
    const email = "phase2-user@example.com";
    const password = "a long and secure passphrase 2026";
    const registration = await request<{ verificationRequired: boolean }>("/auth/register", {
      method: "POST",
      body: { email, password, displayName: "Phase Two User", institution: "RUET", department: "CSE", professionalStatus: "STUDENT", consent: true, turnstileToken: "test-turnstile-pass" },
    });
    expect(registration.response.status).toBe(201);
    expect(registration.body.data?.verificationRequired).toBe(true);

    const account = await env.DB.prepare(
      `SELECT u.id, u.status, p.password_hash FROM users u
       JOIN password_credentials p ON p.user_id = u.id WHERE u.primary_email_normalized = ?`,
    )
      .bind(email)
      .first<{ id: string; status: string; password_hash: string }>();
    expect(account?.status).toBe("PENDING_EMAIL_VERIFICATION");
    expect(account?.password_hash).toMatch(/^pbkdf2_sha256\$100000\$/u);
    expect(account?.password_hash).not.toContain(password);

    const blockedLogin = await request("/auth/login", { method: "POST", body: { email, password } });
    expect(blockedLogin.response.status).toBe(403);
    expect(blockedLogin.body.code).toBe("EMAIL_NOT_VERIFIED");

    const token = await latestEmailToken(account!.id, "VERIFY_EMAIL");
    const verified = await request<{ verified: boolean }>("/auth/verify-email", { method: "POST", body: { token } });
    expect(verified.response.status).toBe(200);
    expect(verified.body.data?.verified).toBe(true);
    const replay = await request("/auth/verify-email", { method: "POST", body: { token } });
    expect(replay.response.status).toBe(400);

    const login = await request<{ csrfToken: string }>("/auth/login", { method: "POST", body: { email, password } });
    expect(login.response.status).toBe(200);
    const cookie = login.response.headers.get("Set-Cookie")?.split(";")[0];
    expect(cookie).toMatch(/^__Host-ruet_session=/u);
    expect(login.response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(login.response.headers.get("Set-Cookie")).toContain("Secure");
    expect(login.response.headers.get("Set-Cookie")).toContain("SameSite=Lax");

    const secondLogin = await request<{ csrfToken: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    const secondCookie = secondLogin.response.headers.get("Set-Cookie")?.split(";")[0];
    expect(secondCookie).not.toBe(cookie);

    const firstTabSession = await request<{ authenticated: boolean; csrfToken: string }>("/auth/session", { cookie });
    const secondTabSession = await request<{ authenticated: boolean; csrfToken: string }>("/auth/session", { cookie });
    expect(firstTabSession.body.data?.authenticated).toBe(true);
    expect(secondTabSession.body.data?.csrfToken).toBe(firstTabSession.body.data?.csrfToken);
    expect(firstTabSession.body.data?.csrfToken).toBe(login.body.data?.csrfToken);

    const noCsrf = await request("/auth/logout", { method: "POST", cookie });
    expect(noCsrf.response.status).toBe(403);
    const logout = await request("/auth/logout", {
      method: "POST",
      cookie,
      csrf: login.body.data!.csrfToken,
    });
    expect(logout.response.status).toBe(200);
    const revokedSession = await request<{ authenticated: boolean }>("/auth/session", { cookie });
    expect(revokedSession.body.data?.authenticated).toBe(false);
    const independentSession = await request<{ authenticated: boolean; csrfToken: string }>("/auth/session", {
      cookie: secondCookie,
    });
    expect(independentSession.body.data?.authenticated).toBe(true);
    await request("/auth/logout-all", {
      method: "POST",
      cookie: secondCookie,
      csrf: independentSession.body.data!.csrfToken,
    });
    const revokedSecondSession = await request<{ authenticated: boolean }>("/auth/session", { cookie: secondCookie });
    expect(revokedSecondSession.body.data?.authenticated).toBe(false);
  }, 30_000);

  it("uses non-enumerating recovery and revokes sessions after password reset", async () => {
    const email = "reset-user@example.com";
    const oldPassword = "another secure passphrase 2026";
    const newPassword = "a replacement secure passphrase 2026";
    await request("/auth/register", {
      method: "POST",
      body: { email, password: oldPassword, displayName: "Reset User", institution: "RUET", department: "CSE", professionalStatus: "STUDENT", consent: true, turnstileToken: "test-turnstile-pass" },
    });
    const account = await env.DB.prepare("SELECT id FROM users WHERE primary_email_normalized = ?")
      .bind(email)
      .first<{ id: string }>();
    await request("/auth/verify-email", {
      method: "POST",
      body: { token: await latestEmailToken(account!.id, "VERIFY_EMAIL") },
    });
    const login = await request<{ csrfToken: string }>("/auth/login", {
      method: "POST",
      body: { email, password: oldPassword },
    });
    const cookie = login.response.headers.get("Set-Cookie")?.split(";")[0];

    const missing = await request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email: "missing@example.com" },
    });
    const existing = await request<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email } });
    expect(missing.body.data?.message).toBe(existing.body.data?.message);

    const resetToken = await latestEmailToken(account!.id, "RESET_PASSWORD");
    const reset = await request<{ reset: boolean }>("/auth/reset-password", {
      method: "POST",
      body: { token: resetToken, password: newPassword },
    });
    expect(reset.body.data?.reset).toBe(true);
    const oldSession = await request<{ authenticated: boolean }>("/auth/session", { cookie });
    expect(oldSession.body.data?.authenticated).toBe(false);
    expect((await request("/auth/login", { method: "POST", body: { email, password: oldPassword } })).response.status).toBe(401);
    expect((await request("/auth/login", { method: "POST", body: { email, password: newPassword } })).response.status).toBe(200);
  }, 30_000);

  it("updates account preferences and records a deletion request without hard deletion", async () => {
    const email = "deletion-user@example.com";
    const password = "deletion test secure passphrase";
    await request("/auth/register", {
      method: "POST",
      body: { email, password, displayName: "Deletion User", institution: "RUET", department: "CSE", professionalStatus: "STUDENT", consent: true, turnstileToken: "test-turnstile-pass" },
    });
    const account = await env.DB.prepare("SELECT id FROM users WHERE primary_email_normalized = ?")
      .bind(email)
      .first<{ id: string }>();
    await request("/auth/verify-email", {
      method: "POST",
      body: { token: await latestEmailToken(account!.id, "VERIFY_EMAIL") },
    });
    const login = await request<{ csrfToken: string }>("/auth/login", { method: "POST", body: { email, password } });
    const cookie = login.response.headers.get("Set-Cookie")?.split(";")[0];
    const csrf = login.body.data!.csrfToken;
    const preferences = await request("/account/notification-preferences", {
      method: "PATCH",
      cookie,
      csrf,
      body: { eventEmail: false },
    });
    expect(preferences.response.status).toBe(200);
    const deletion = await request<{ requested: boolean }>("/account/deletion-request", {
      method: "POST",
      cookie,
      csrf,
      body: { reason: "Testing the reviewable workflow" },
    });
    expect(deletion.response.status).toBe(202);
    expect(deletion.body.data?.requested).toBe(true);
    const state = await env.DB.prepare("SELECT status, deleted_at FROM users WHERE id = ?")
      .bind(account!.id)
      .first<{ status: string; deleted_at: string | null }>();
    expect(state).toEqual({ status: "DELETION_REQUESTED", deleted_at: null });
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM account_deletion_requests WHERE user_id = ?").bind(account!.id).first("count")).toBe(1);
  }, 30_000);
});
