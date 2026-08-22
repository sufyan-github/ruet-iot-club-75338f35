import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createSessionMaterial } from "../auth/session";

interface Envelope<T> {
  success: boolean;
  data?: T;
  code?: string;
}

interface Identity {
  id: string;
  email: string;
  cookie: string;
  csrf: string;
}

const origin = "https://test.invalid";

async function createIdentity(email: string, displayName: string, role?: string): Promise<Identity> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users
      (id, primary_email, primary_email_normalized, display_name, status, email_verified_at)
     VALUES (?, ?, ?, ?, 'EMAIL_VERIFIED', ?)`,
  ).bind(id, email, email.toLowerCase(), displayName, new Date().toISOString()).run();
  if (role) {
    await env.DB.prepare(
      `INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), id, `role:${role}`, id, "Phase 5 workflow integration test authority").run();
  }
  const session = await createSessionMaterial();
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, csrf_token_hash, expires_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(session.id, id, session.tokenHash, session.csrfTokenHash, session.expiresAt).run();
  return { id, email, cookie: `__Host-ruet_session=${session.token}`, csrf: session.csrfToken };
}

async function request<T>(path: string, options: {
  method?: string;
  body?: unknown;
  identity?: Identity;
  idempotencyKey?: string;
} = {}) {
  const headers = new Headers({ Accept: "application/json", Origin: origin });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.identity) {
    headers.set("Cookie", options.identity.cookie);
    headers.set("X-CSRF-Token", options.identity.csrf);
  }
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
  const response = await exports.default.fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  return { response, body: await response.json<Envelope<T>>() };
}

const memberInput = {
  membershipTypeKey: "CLUB_MEMBER",
  fullName: "Phase Five Member",
  phone: "+880 1712-345678",
  studentId: "2022331001",
  department: "CSE",
  batch: "22",
  academicSession: "2021-22",
  skills: ["Embedded systems"],
  interests: ["IoT platforms"],
  experience: "Built connected sensor prototypes.",
  motivation: "I want to build reliable IoT systems and contribute to club programs throughout the year.",
  timeCommitment: "5-8 hours/week" as const,
  declarationAccepted: true as const,
  payment: {
    paymentMethod: "BKASH" as const,
    payerPhone: "+880 1712-345678",
    transactionReference: "TXN-PHASE5-0001",
  },
};

const { payment: _paidEvidence, ...freeMemberInput } = memberInput;

const volunteerInput = {
  volunteerProgramKey: "COMMUNITY_VOLUNTEER",
  fullName: "Phase Five Volunteer",
  phone: "+880 1812-345678",
  organization: "Community Lab",
  skills: ["Workshop operations"],
  interests: ["STEM outreach"],
  motivation: "I want to help deliver practical workshops and support community participants consistently.",
  timeCommitment: "2-4 hours/week" as const,
  declarationAccepted: true as const,
};

beforeAll(async () => {
  const migrations = (env as Env & { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS;
  await applyD1Migrations(env.DB, migrations);
});

describe.sequential("Phase 5 payment and approval workflows", () => {
  it("runs a server-owned paid membership approval and allocates one immutable identity", async () => {
    const applicant = await createIdentity("phase5-applicant@example.com", "Phase Five Applicant");
    const manager = await createIdentity("phase5-manager@example.com", "Phase Five Manager", "MEMBERSHIP_MANAGER");
    const finance = await createIdentity("phase5-finance@example.com", "Phase Five Finance", "FINANCE_MANAGER");

    const submitted = await request<{ applicationId: string; paymentId: string }>("/membership/apply", {
      method: "POST", identity: applicant, idempotencyKey: "phase5-member-submit-0001", body: memberInput,
    });
    expect(submitted.response.status).toBe(201);
    const applicationId = submitted.body.data!.applicationId;
    const paymentId = submitted.body.data!.paymentId;
    expect(await env.DB.prepare(
      `SELECT mpr.expected_amount_minor, mpr.currency, mpr.payment_methods_json,
              mpr.payment_number, mp.payment_method, mp.payer_phone, mp.transaction_reference
       FROM membership_payment_requests mpr
       JOIN membership_payments mp ON mp.payment_request_id = mpr.id
       WHERE mpr.application_id = ?`,
    ).bind(applicationId).first()).toEqual({
      expected_amount_minor: 30000,
      currency: "BDT",
      payment_methods_json: '["BKASH","NAGAD"]',
      payment_number: "01580352238",
      payment_method: "BKASH",
      payer_phone: "01712345678",
      transaction_reference: "TXN-PHASE5-0001",
    });

    await env.DB.prepare(
      `INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason)
       VALUES (?, ?, 'role:MEMBERSHIP_MANAGER', ?, ?)`,
    ).bind(crypto.randomUUID(), applicant.id, applicant.id, "Prove a privileged applicant still cannot self-review").run();

    const selfReview = await request(`/admin/membership/applications/${applicationId}/start-review`, {
      method: "POST", identity: applicant, idempotencyKey: "phase5-self-review-0001",
      body: { reason: "Applicant attempts to review their own application." },
    });
    expect(selfReview.response.status).toBe(409);
    expect(selfReview.body.code).toBe("SELF_DECISION_FORBIDDEN");

    const review = await request(`/admin/membership/applications/${applicationId}/start-review`, {
      method: "POST", identity: manager, idempotencyKey: "phase5-review-member-0001",
      body: { reason: "Membership manager accepted this complete application for review." },
    });
    expect(review.response.status).toBe(200);

    const forgedPayment = await request(`/membership/applications/${applicationId}/payment`, {
      method: "POST", identity: applicant, idempotencyKey: "phase5-forged-payment-0001",
      body: { paymentMethod: "bKash", payerPhone: "01712345678", transactionReference: "TXN-FORGED", expectedAmountMinor: 1, status: "VERIFIED" },
    });
    expect(forgedPayment.response.status).toBe(422);
    expect(forgedPayment.body.code).toBe("VALIDATION_ERROR");

    const unsupportedMethod = await request("/membership/applications/" + applicationId + "/payment", {
      method: "POST", identity: applicant, idempotencyKey: "phase5-unsupported-payment-0001",
      body: { paymentMethod: "Rocket", payerPhone: "01712345678", transactionReference: "TXN-ROCKET-0001" },
    });
    expect(unsupportedMethod.response.status).toBe(422);
    expect(unsupportedMethod.body.code).toBe("VALIDATION_ERROR");

    expect(await env.DB.prepare(
      "SELECT payment_method, payer_phone, transaction_reference FROM membership_payments WHERE id = ?",
    ).bind(paymentId).first()).toEqual({
      payment_method: "BKASH",
      payer_phone: "01712345678",
      transaction_reference: "TXN-PHASE5-0001",
    });

    const managerCannotVerify = await request(`/admin/membership/payments/${paymentId}/verify`, {
      method: "POST", identity: manager, idempotencyKey: "phase5-manager-verify-0001",
      body: { reason: "Membership manager attempts a finance-only verification." },
    });
    expect(managerCannotVerify.response.status).toBe(403);

    const verified = await request(`/admin/membership/payments/${paymentId}/verify`, {
      method: "POST", identity: finance, idempotencyKey: "phase5-finance-verify-0001",
      body: { reason: "Finance matched the transaction reference and configured amount." },
    });
    expect(verified.response.status).toBe(200);

    const approvalKey = "phase5-member-approve-0001";
    const approved = await request<{ membershipId: string }>(`/admin/membership/applications/${applicationId}/approve`, {
      method: "POST", identity: manager, idempotencyKey: approvalKey,
      body: { reason: "Review and independent payment verification are complete." },
    });
    expect(approved.response.status).toBe(201);
    const replay = await request<{ membershipId: string }>(`/admin/membership/applications/${applicationId}/approve`, {
      method: "POST", identity: manager, idempotencyKey: approvalKey,
      body: { reason: "Review and independent payment verification are complete." },
    });
    expect(replay.response.headers.get("Idempotency-Replayed")).toBe("true");
    expect(replay.body.data?.membershipId).toBe(approved.body.data?.membershipId);

    const issued = await env.DB.prepare(
      "SELECT membership_number, status FROM memberships WHERE application_id = ?",
    ).bind(applicationId).first<{ membership_number: string; status: string }>();
    expect(issued).toEqual({ membership_number: "RUET-IOT-22-001", status: "ACTIVE" });
    expect(await env.DB.prepare("SELECT next_value FROM membership_sequence_counters WHERE batch = '22'").first<number>("next_value")).toBe(2);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM memberships WHERE application_id = ?").bind(applicationId).first<number>("count")).toBe(1);

    await expect(
      env.DB.prepare("UPDATE memberships SET membership_number = 'RUET-IOT-22-999' WHERE application_id = ?").bind(applicationId).run(),
    ).rejects.toThrow(/identity fields are immutable/iu);
    await expect(
      env.DB.prepare("DELETE FROM payment_verification_decisions WHERE payment_id = ?").bind(paymentId).run(),
    ).rejects.toThrow(/cannot be hard deleted/iu);

    const actions = await env.DB.prepare(
      `SELECT action FROM audit_logs WHERE entity_id IN (?, ?, ?) ORDER BY created_at`,
    ).bind(applicationId, paymentId, approved.body.data!.membershipId).all<{ action: string }>();
    expect(actions.results.map((row) => row.action)).toEqual(expect.arrayContaining([
      "MEMBERSHIP_REVIEW_STARTED", "MEMBERSHIP_PAYMENT_VERIFIED",
      "MEMBERSHIP_APPLICATION_APPROVED", "MEMBERSHIP_ID_GENERATED",
    ]));
  });

  it("keeps a reviewed application open after payment rejection and accepts corrected evidence", async () => {
    const applicant = await createIdentity("phase5-retry@example.com", "Payment Retry Applicant");
    const manager = await createIdentity("phase5-retry-manager@example.com", "Payment Retry Manager", "MEMBERSHIP_MANAGER");
    const finance = await createIdentity("phase5-retry-finance@example.com", "Payment Retry Finance", "FINANCE_MANAGER");
    const submitted = await request<{ applicationId: string; paymentId: string }>("/membership/apply", {
      method: "POST", identity: applicant, idempotencyKey: "phase5-retry-submit-0001",
      body: {
        ...memberInput,
        fullName: "Payment Retry Applicant",
        studentId: "2022331002",
        payment: { paymentMethod: "NAGAD", payerPhone: "01812345678", transactionReference: "TXN-REJECT-0001" },
      },
    });
    const applicationId = submitted.body.data!.applicationId;
    const firstPaymentId = submitted.body.data!.paymentId;
    await request(`/admin/membership/applications/${applicationId}/start-review`, {
      method: "POST", identity: manager, idempotencyKey: "phase5-retry-review-0001",
      body: { reason: "Application is complete and ready for payment processing." },
    });
    await request(`/admin/membership/payments/${firstPaymentId}/reject`, {
      method: "POST", identity: finance, idempotencyKey: "phase5-retry-reject-0001",
      body: { reason: "The submitted reference could not be matched to the club account." },
    });
    expect(await env.DB.prepare("SELECT status FROM membership_applications WHERE id = ?").bind(applicationId).first<string>("status"))
      .toBe("UNDER_REVIEW");
    const second = await request<{ paymentId: string }>(`/membership/applications/${applicationId}/payment`, {
      method: "POST", identity: applicant, idempotencyKey: "phase5-retry-payment-0002",
      body: { paymentMethod: "Nagad", payerPhone: "01812345678", transactionReference: "TXN-RETRY-0002" },
    });
    expect(second.response.status).toBe(201);
    expect(second.body.data?.paymentId).not.toBe(firstPaymentId);
  });

  it("allows one review claimant and allocates volunteer identities from a separate yearly counter", async () => {
    const applicant = await createIdentity("phase5-volunteer@example.com", "Phase Five Volunteer");
    const managerOne = await createIdentity("phase5-vol-manager-1@example.com", "Volunteer Manager One", "MEMBERSHIP_MANAGER");
    const managerTwo = await createIdentity("phase5-vol-manager-2@example.com", "Volunteer Manager Two", "MEMBERSHIP_MANAGER");
    const submitted = await request<{ applicationId: string }>("/volunteers/apply", {
      method: "POST", identity: applicant, idempotencyKey: "phase5-volunteer-submit-0001", body: volunteerInput,
    });
    const applicationId = submitted.body.data!.applicationId;
    const contenders = await Promise.all([
      request(`/admin/volunteers/applications/${applicationId}/start-review`, {
        method: "POST", identity: managerOne, idempotencyKey: "phase5-vol-review-claim-0001",
        body: { reason: "First manager attempts to claim the submitted volunteer review." },
      }),
      request(`/admin/volunteers/applications/${applicationId}/start-review`, {
        method: "POST", identity: managerTwo, idempotencyKey: "phase5-vol-review-claim-0002",
        body: { reason: "Second manager attempts to claim the same volunteer review." },
      }),
    ]);
    expect(contenders.map(({ response }) => response.status).sort()).toEqual([200, 409]);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM volunteer_review_claims WHERE application_id = ?").bind(applicationId).first<number>("count"))
      .toBe(1);

    const approved = await request<{ volunteerId: string }>(`/admin/volunteers/applications/${applicationId}/approve`, {
      method: "POST", identity: managerOne, idempotencyKey: "phase5-vol-approve-0001",
      body: { reason: "Volunteer application review is complete and the candidate is accepted." },
    });
    expect(approved.response.status).toBe(201);
    const volunteerNumber = await env.DB.prepare(
      "SELECT volunteer_number FROM volunteers WHERE id = ?",
    ).bind(approved.body.data!.volunteerId).first<string>("volunteer_number");
    expect(volunteerNumber).toMatch(/^RUET-IOT-CV-\d{2}-001$/u);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM memberships WHERE user_id = ?").bind(applicant.id).first<number>("count")).toBe(0);
  });

  it("serializes concurrent approvals into unique consecutive batch identities", async () => {
    await env.DB.prepare(
      `INSERT INTO membership_types
        (id, type_key, name, description, term_months, payment_required, fee_minor, currency)
       VALUES ('membership-type:PHASE5_FREE', 'PHASE5_FREE', 'Phase 5 Free',
               'Test-only free membership type for approval contention.', 12, 0, 0, 'BDT')`,
    ).run();
    const firstApplicant = await createIdentity("phase5-sequence-1@example.com", "Sequence Applicant One");
    const secondApplicant = await createIdentity("phase5-sequence-2@example.com", "Sequence Applicant Two");
    const manager = await createIdentity("phase5-sequence-manager@example.com", "Sequence Manager", "MEMBERSHIP_MANAGER");
    const first = await request<{ applicationId: string }>("/membership/apply", {
      method: "POST", identity: firstApplicant, idempotencyKey: "phase5-sequence-submit-0001",
      body: { ...freeMemberInput, membershipTypeKey: "PHASE5_FREE", fullName: "Sequence Applicant One", studentId: "2023331001", batch: "23" },
    });
    const second = await request<{ applicationId: string }>("/membership/apply", {
      method: "POST", identity: secondApplicant, idempotencyKey: "phase5-sequence-submit-0002",
      body: { ...freeMemberInput, membershipTypeKey: "PHASE5_FREE", fullName: "Sequence Applicant Two", studentId: "2023331002", batch: "23" },
    });
    for (const [applicationId, key] of [
      [first.body.data!.applicationId, "phase5-sequence-review-0001"],
      [second.body.data!.applicationId, "phase5-sequence-review-0002"],
    ]) {
      const review = await request(`/admin/membership/applications/${applicationId}/start-review`, {
        method: "POST", identity: manager, idempotencyKey: key,
        body: { reason: "The free test application is complete and ready for approval." },
      });
      expect(review.response.status).toBe(200);
    }
    const approvals = await Promise.all([
      request(`/admin/membership/applications/${first.body.data!.applicationId}/approve`, {
        method: "POST", identity: manager, idempotencyKey: "phase5-sequence-approve-0001",
        body: { reason: "The first application completed all required free-type checks." },
      }),
      request(`/admin/membership/applications/${second.body.data!.applicationId}/approve`, {
        method: "POST", identity: manager, idempotencyKey: "phase5-sequence-approve-0002",
        body: { reason: "The second application completed all required free-type checks." },
      }),
    ]);
    expect(approvals.map(({ response }) => response.status)).toEqual([201, 201]);
    const identities = await env.DB.prepare(
      "SELECT membership_number FROM memberships WHERE batch = '23' ORDER BY membership_number",
    ).all<{ membership_number: string }>();
    expect(identities.results.map((row) => row.membership_number)).toEqual([
      "RUET-IOT-23-001", "RUET-IOT-23-002",
    ]);
    expect(await env.DB.prepare("SELECT next_value FROM membership_sequence_counters WHERE batch = '23'").first<number>("next_value"))
      .toBe(3);
  });
});
