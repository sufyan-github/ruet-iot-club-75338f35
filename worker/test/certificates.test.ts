import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await applyD1Migrations(env.DB, (env as Env & { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS);
});

describe("certificate approval records", () => {
  it("exposes only the verification-safe issued certificate projection", async () => {
    const now = "2026-08-22T12:00:00.000Z";
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, primary_email, primary_email_normalized, display_name, status) VALUES ('learner', 'learner@example.com', 'learner@example.com', 'Mst. Tabassum Hafsa', 'EMAIL_VERIFIED')"),
      env.DB.prepare("INSERT INTO users (id, primary_email, primary_email_normalized, display_name, status) VALUES ('issuer', 'issuer@example.com', 'issuer@example.com', 'Certificate Manager', 'EMAIL_VERIFIED')"),
      env.DB.prepare("INSERT INTO website_content_items (id, collection_key, data_json, status, published_at) VALUES ('11111111-1111-4111-8111-111111111111', 'courses', '{\"title\":\"Practical Internet of Things\"}', 'PUBLISHED', ?)").bind(now),
      env.DB.prepare("INSERT INTO website_submissions (id, submission_type, submitted_by, data_json) VALUES ('22222222-2222-4222-8222-222222222222', 'course_registrations', 'learner', '{\"course_id\":\"11111111-1111-4111-8111-111111111111\",\"completed\":true,\"payment_status\":\"confirmed\"}')"),
      env.DB.prepare("INSERT INTO certificate_requests (id, user_id, course_id, enrollment_id, status) VALUES ('33333333-3333-4333-8333-333333333333', 'learner', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'ISSUED')"),
      env.DB.prepare("INSERT INTO certificates (id, certificate_number, request_id, user_id, course_id, enrollment_id, holder_name, course_title, completion_date, issued_at, issued_by, certificate_url) VALUES ('44444444-4444-4444-8444-444444444444', 'RIOT-2026-000001', '33333333-3333-4333-8333-333333333333', 'learner', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Mst. Tabassum Hafsa', 'Practical Internet of Things', ?, ?, 'issuer', '/certificate/44444444-4444-4444-8444-444444444444')").bind(now, now),
    ]);

    const response = await exports.default.fetch("https://test.invalid/api/v1/certificates/RIOT-2026-000001");
    const body = await response.json<any>();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ certificateNumber: "RIOT-2026-000001", student: "Mst. Tabassum Hafsa", course: "Practical Internet of Things", issuingOrganization: "RUET IoT Club", status: "ISSUED" });
    expect(body.data).not.toHaveProperty("email");
    expect(body.data).not.toHaveProperty("userId");
    expect(body.data).not.toHaveProperty("enrollmentId");
  });

  it("keeps issued certificate identity immutable", async () => {
    await expect(env.DB.prepare("UPDATE certificates SET certificate_number = 'RIOT-2026-999999' WHERE id = '44444444-4444-4444-8444-444444444444'").run()).rejects.toThrow(/immutable/u);
  });
});
