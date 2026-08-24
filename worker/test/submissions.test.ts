import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptJson } from "../auth/crypto";

interface Envelope<T> { success: boolean; data?: T; code?: string; }
const origin = "https://test.invalid";

async function request<T>(path: string, options: { method?: string; body?: unknown; cookie?: string; csrf?: string; bootstrap?: string } = {}) {
  const headers = new Headers({ Accept: "application/json", Origin: origin });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.cookie) headers.set("Cookie", options.cookie);
  if (options.csrf) headers.set("X-CSRF-Token", options.csrf);
  if (options.bootstrap) headers.set("X-Bootstrap-Token", options.bootstrap);
  const response = await exports.default.fetch(`${origin}/api/v1${path}`, { method: options.method ?? "GET", headers, ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) });
  return { response, body: await response.json<Envelope<T>>() };
}

async function verificationToken(): Promise<string> {
  const row = await env.DB.prepare("SELECT encrypted_payload, payload_iv FROM email_outbox WHERE template = 'SUBMISSION_VERIFY' ORDER BY created_at DESC LIMIT 1").first<{ encrypted_payload: string; payload_iv: string }>();
  const payload = await decryptJson<{ text: string }>(row!.encrypted_payload, row!.payload_iv, env.SESSION_SECRET);
  const match = payload.text.match(/[?&]token=([^\s]+)/u);
  expect(match?.[1]).toBeTruthy();
  return decodeURIComponent(match![1]);
}

async function emailToken(template: string, userId: string): Promise<string> {
  const row = await env.DB.prepare("SELECT encrypted_payload, payload_iv FROM email_outbox WHERE template = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1").bind(template, userId).first<{ encrypted_payload: string; payload_iv: string }>();
  const payload = await decryptJson<{ text: string }>(row!.encrypted_payload, row!.payload_iv, env.SESSION_SECRET);
  const match = payload.text.match(/[?&]token=([^\s]+)/u);
  return decodeURIComponent(match![1]);
}

beforeAll(async () => { await applyD1Migrations(env.DB, (env as Env & { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS); });

describe("professional submission workflows", () => {
  it("stores contact messages and queues authority and submitter emails", async () => {
    const created = await request<{ referenceCode: string; status: string }>("/submissions/contact", { method: "POST", body: { submitter: { name: "Contact Visitor", email: "visitor@example.com" }, subject: "Industry workshop enquiry", message: "Please send details about arranging an industry workshop at RUET.", website: "", turnstileToken: "test-turnstile-pass" } });
    expect(created.response.status).toBe(201);
    expect(created.body.data?.status).toBe("SUBMITTED");
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM contact_messages").first<number>("count")).toBe(1);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM email_outbox WHERE template IN ('CONTACT_AUTHORITY', 'CONTACT_RECEIVED')").first<number>("count")).toBe(2);
  });

  it("holds guest projects for email verification, then admits them to review", async () => {
    const created = await request<{ id: string; referenceCode: string; trackingToken: string; status: string }>("/submissions/projects", { method: "POST", body: {
      submitter: { name: "Project Visitor", email: "project@example.com", phone: null, institution: "RUET", department: "CSE" },
      title: "Flood monitoring sensor network", summary: "A low-cost LoRa sensor network for reliable regional flood monitoring and early warning.", category: "IoT", proposedStatus: "PLANNED", proposedDuration: "6 months",
      problemStatement: "Existing water-level monitoring lacks dense, reliable and continuously connected local sensing.", proposedSolution: "Deploy solar-powered LoRa sensing nodes and a resilient dashboard for authorities.", objectives: "Build, field-test, and document a reliable prototype network.", expectedOutcomes: "A tested prototype, open documentation, and field evaluation report.", targetBeneficiaries: "Local communities", innovation: "Offline-first alert delivery",
      technologies: { iot: ["LoRaWAN"], hardware: ["ESP32"], sensors: ["Ultrasonic"], microcontrollers: ["ESP32"], software: ["TypeScript"], aiMl: [], communications: ["LoRa"], cloudPlatforms: ["Cloudflare"] },
      team: { type: "INDIVIDUAL", leader: "Project Visitor", members: [] }, resources: { equipment: null, estimatedBudget: null, mentorship: null, laboratory: null }, collaboration: { wanted: true, requiredExpertise: "Embedded systems", collaboratorCount: 2, type: "Research" }, website: "", turnstileToken: "test-turnstile-pass",
    } });
    expect(created.response.status).toBe(201);
    expect(created.body.data?.status).toBe("EMAIL_VERIFICATION");
    const verified = await request<{ status: string }>("/submissions/verify", { method: "POST", body: { token: await verificationToken() } });
    expect(verified.response.status).toBe(200);
    expect(verified.body.data?.status).toBe("SUBMITTED");
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM email_outbox WHERE template = 'SUBMISSION_AUTHORITY'").first<number>("count")).toBe(2);
    expect(await env.DB.prepare("SELECT status FROM project_submissions WHERE id = ?").bind(created.body.data!.id).first<string>("status")).toBe("SUBMITTED");
  });

  it("keeps alumni private until a super administrator verifies and publishes the profile", async () => {
    const email = "alumni@example.com"; const password = "secure alumni passphrase 2026";
    expect((await request("/auth/register", { method: "POST", body: { email, password, displayName: "Verified Alumna", institution: "RUET", department: "CSE", professionalStatus: "PROFESSIONAL", consent: true, turnstileToken: "test-turnstile-pass" } })).response.status).toBe(201);
    const userId = await env.DB.prepare("SELECT id FROM users WHERE primary_email_normalized = ?").bind(email).first<string>("id");
    expect((await request("/auth/verify-email", { method: "POST", body: { token: await emailToken("VERIFY_EMAIL", userId!) } })).response.status).toBe(200);
    const login = await request<{ csrfToken: string }>("/auth/login", { method: "POST", body: { email, password } });
    const cookie = login.response.headers.get("Set-Cookie")!.split(";")[0];
    const created = await request<{ id: string }>("/submissions/alumni", { method: "POST", cookie, csrf: login.body.data!.csrfToken, body: { submitter: { name: "Verified Alumna", email, phone: null, institution: "RUET", department: "CSE" }, studentId: "123", batch: "20", graduationYear: 2025, formerClubPosition: "Research Lead", executiveYear: "2024", membershipYear: "2022", linkedin: null, github: null, portfolio: null, professional: { organization: "Example Labs", designation: "Engineer", industry: "Technology", country: "Bangladesh", city: "Rajshahi", website: null }, clubJourney: { yearJoined: "2021", role: "Researcher", majorContributions: "Led documented sensor-network research and mentored junior members.", memorableActivities: null }, publicDisplayConsent: true, website: "", turnstileToken: "test-turnstile-pass" } });
    expect(created.response.status).toBe(201);
    expect((await request<unknown[]>("/alumni")).body.data).toHaveLength(0);

    const temporary = "temporary super admin password 2026";
    expect((await request("/internal/provision-fixed-super-admins", { method: "POST", bootstrap: env.BOOTSTRAP_ADMIN_SECRET, body: { accounts: [{ email: "ruetiotclub@gmail.com", displayName: "RUET IoT Club", password: temporary }, { email: "abusufyan.cse20@gmail.com", displayName: "Md Abu Sufyan", password: "second temporary super password 2026" }], reason: "Test alumni moderation" } })).response.status).toBe(201);
    const adminLogin = await request<{ csrfToken: string }>("/auth/login", { method: "POST", body: { email: "ruetiotclub@gmail.com", password: temporary } });
    const adminCookie = adminLogin.response.headers.get("Set-Cookie")!.split(";")[0]; const adminCsrf = adminLogin.body.data!.csrfToken;
    expect((await request("/auth/change-password", { method: "POST", cookie: adminCookie, csrf: adminCsrf, body: { currentPassword: temporary, newPassword: "private super admin password 2026" } })).response.status).toBe(200);
    for (const [status, reason] of [["UNDER_REVIEW", "Identity review started"], ["APPROVED", "RUET history verified"], ["PUBLISHED", "Consent confirmed and profile approved"]] as const) {
      const updated = await request(`/admin/submissions/${created.body.data!.id}`, { method: "PATCH", cookie: adminCookie, csrf: adminCsrf, body: { status, publicResponse: `Profile ${status.toLowerCase()}.`, reason } });
      expect(updated.response.status).toBe(200);
    }
    const publicAlumni = await request<Array<{ name: string }>>("/alumni");
    expect(publicAlumni.body.data?.[0]?.name).toBe("Verified Alumna");
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM submission_events WHERE submission_id = ?").bind(created.body.data!.id).first<number>("count")).toBe(4);
  }, 60_000);
});
