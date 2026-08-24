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

interface ApplicationResponse {
  applicationId: string;
  status: string;
  revision?: number;
  paymentId?: string | null;
  paymentStatus?: string | null;
}

const origin = "https://test.invalid";

async function createIdentity(email: string, displayName: string): Promise<Identity> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users
      (id, primary_email, primary_email_normalized, display_name, status, email_verified_at)
     VALUES (?, ?, ?, ?, 'EMAIL_VERIFIED', ?)`,
  ).bind(id, email, email.toLowerCase(), displayName, new Date().toISOString()).run();
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

const membershipInput = {
  membershipTypeKey: "CLUB_MEMBER",
  fullName: "Phase Four Applicant",
  phone: "+880 1712-345678",
  studentId: "2021331001",
  department: "CSE",
  batch: "21",
  academicSession: "2020-21",
  skills: ["Embedded systems", "TypeScript"],
  interests: ["IoT", "Automation"],
  experience: "Built sensor and microcontroller projects.",
  motivation: "I want to contribute to practical IoT projects and learn with the club community.",
  githubUrl: "https://github.com/example",
  timeCommitment: "5-8 hours/week" as const,
  declarationAccepted: true as const,
  payment: {
    paymentMethod: "BKASH" as const,
    payerPhone: "+880 1712-345678",
    transactionReference: "TXN-PHASE4-APPLICATION-0001",
  },
};

const volunteerInput = {
  volunteerProgramKey: "COMMUNITY_VOLUNTEER",
  fullName: "Community Volunteer Applicant",
  phone: "+880 1812-345678",
  organization: "Local Robotics Community",
  skills: ["Event support", "Documentation"],
  interests: ["STEM outreach", "IoT workshops"],
  motivation: "I want to support community workshops and help participants learn practical technology skills.",
  timeCommitment: "2-4 hours/week" as const,
  declarationAccepted: true as const,
};

beforeAll(async () => {
  const migrations = (env as Env & { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS;
  await applyD1Migrations(env.DB, migrations);
});

describe.sequential("Phase 4 membership and volunteer system", () => {
  it("saves and submits an idempotent membership application without trusting client authority", async () => {
    const applicant = await createIdentity("phase4-member@example.com", "Phase Four Member");

    const unauthenticated = await request("/membership/me");
    expect(unauthenticated.response.status).toBe(401);

    const draftKey = "membership-draft-phase4-0001";
    const draftInput = {
      membershipTypeKey: "CLUB_MEMBER",
      fullName: membershipInput.fullName,
      phone: membershipInput.phone,
      skills: ["Embedded systems"],
      declarationAccepted: false,
    };
    const draft = await request<ApplicationResponse>("/membership/draft", {
      method: "PUT", identity: applicant, idempotencyKey: draftKey, body: draftInput,
    });
    expect(draft.response.status).toBe(201);
    expect(draft.body.data?.status).toBe("DRAFT");

    const draftReplay = await request<ApplicationResponse>("/membership/draft", {
      method: "PUT", identity: applicant, idempotencyKey: draftKey, body: draftInput,
    });
    expect(draftReplay.body.data?.applicationId).toBe(draft.body.data?.applicationId);
    expect(draftReplay.response.headers.get("Idempotency-Replayed")).toBe("true");

    const forgedIdentity = await request("/membership/apply", {
      method: "POST", identity: applicant, idempotencyKey: "membership-forged-id-attempt",
      body: { ...membershipInput, membershipNumber: "RUET-IOT-21-999" },
    });
    expect(forgedIdentity.response.status).toBe(422);
    expect(forgedIdentity.body.code).toBe("VALIDATION_ERROR");

    const { payment: _payment, ...withoutPayment } = membershipInput;
    const missingPayment = await request("/membership/apply", {
      method: "POST", identity: applicant, idempotencyKey: "membership-missing-payment-attempt", body: withoutPayment,
    });
    expect(missingPayment.response.status).toBe(422);
    expect(missingPayment.body.code).toBe("PAYMENT_EVIDENCE_REQUIRED");
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM membership_payments WHERE submitted_by = ?")
      .bind(applicant.id).first<number>("count")).toBe(0);

    const submitted = await request<ApplicationResponse>("/membership/apply", {
      method: "POST", identity: applicant, idempotencyKey: "membership-submit-phase4-0001", body: membershipInput,
    });
    expect(submitted.response.status).toBe(201);
    expect(submitted.body.data?.applicationId).toBe(draft.body.data?.applicationId);
    expect(submitted.body.data?.status).toBe("SUBMITTED");
    expect(submitted.body.data?.paymentStatus).toBe("SUBMITTED");
    expect(submitted.body.data?.paymentId).toBeTruthy();
    expect(await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM membership_payment_requests mpr
       JOIN membership_payments mp ON mp.payment_request_id = mpr.id
       WHERE mpr.application_id = ? AND mp.application_id = ?`,
    ).bind(submitted.body.data!.applicationId, submitted.body.data!.applicationId).first<number>("count")).toBe(1);
    const submissionReplay = await request<ApplicationResponse>("/membership/apply", {
      method: "POST", identity: applicant, idempotencyKey: "membership-submit-phase4-0001", body: membershipInput,
    });
    expect(submissionReplay.response.headers.get("Idempotency-Replayed")).toBe("true");
    expect(submissionReplay.body.data?.paymentId).toBe(submitted.body.data?.paymentId);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM membership_payments WHERE application_id = ?")
      .bind(submitted.body.data!.applicationId).first<number>("count")).toBe(1);

    const editAfterSubmit = await request("/membership/draft", {
      method: "PUT", identity: applicant, idempotencyKey: "membership-edit-after-submit", body: draftInput,
    });
    expect(editAfterSubmit.response.status).toBe(409);
    expect(editAfterSubmit.body.code).toBe("APPLICATION_ALREADY_SUBMITTED");

    const selfApprove = await request(`/membership/applications/${submitted.body.data!.applicationId}/approve`, {
      method: "POST", identity: applicant, idempotencyKey: "membership-self-approve",
      body: { reason: "Attempt self approval" },
    });
    expect(selfApprove.response.status).toBe(404);

    await expect(
      env.DB.prepare("UPDATE membership_applications SET status = 'APPROVED' WHERE id = ?")
        .bind(submitted.body.data!.applicationId).run(),
    ).rejects.toThrow(/invalid membership application transition|workflow evidence is missing/iu);
    await expect(
      env.DB.prepare("UPDATE membership_applications SET student_id = 'FORGED' WHERE id = ?")
        .bind(submitted.body.data!.applicationId).run(),
    ).rejects.toThrow(/submitted membership application content is immutable/iu);

    const membershipCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM memberships WHERE user_id = ?")
      .bind(applicant.id).first<number>("count");
    expect(membershipCount).toBe(0);
    const draftAuditCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'MEMBERSHIP_APPLICATION_DRAFT_SAVED' AND entity_id = ?",
    ).bind(draft.body.data!.applicationId).first<number>("count");
    expect(draftAuditCount).toBe(1);
  });

  it("keeps volunteer applications separate and protects administrative queues", async () => {
    const applicant = await createIdentity("phase4-volunteer@example.com", "Phase Four Volunteer");
    const volunteerDraft = await request<ApplicationResponse>("/volunteers/draft", {
      method: "PUT", identity: applicant, idempotencyKey: "volunteer-draft-phase4-0001",
      body: { volunteerProgramKey: "COMMUNITY_VOLUNTEER", fullName: volunteerInput.fullName, skills: ["Event support"] },
    });
    expect(volunteerDraft.response.status).toBe(201);
    const submitted = await request<ApplicationResponse>("/volunteers/apply", {
      method: "POST", identity: applicant, idempotencyKey: "volunteer-submit-phase4-0001", body: volunteerInput,
    });
    expect(submitted.response.status).toBe(201);
    expect(submitted.body.data?.status).toBe("SUBMITTED");

    const deniedQueue = await request("/admin/volunteers/applications", { identity: applicant });
    expect(deniedQueue.response.status).toBe(403);
    expect(deniedQueue.body.code).toBe("PERMISSION_DENIED");

    const manager = await createIdentity("phase4-manager@example.com", "Phase Four Manager");
    await env.DB.prepare(
      `INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason)
       VALUES (?, ?, 'role:MEMBERSHIP_MANAGER', ?, ?)`,
    ).bind(crypto.randomUUID(), manager.id, manager.id, "Phase 4 review queue test authority").run();

    const [membershipQueue, volunteerQueue] = await Promise.all([
      request<Array<{ applicationId: string }>>("/admin/membership/applications", { identity: manager }),
      request<Array<{ applicationId: string }>>("/admin/volunteers/applications", { identity: manager }),
    ]);
    expect(membershipQueue.response.status).toBe(200);
    expect(volunteerQueue.response.status).toBe(200);
    expect(membershipQueue.body.data?.length).toBe(1);
    expect(volunteerQueue.body.data?.[0]?.applicationId).toBe(submitted.body.data?.applicationId);

    const workspace = await request<{ applications: Array<{ volunteerProgramKey: string }>; volunteers: unknown[] }>("/volunteers/me", { identity: applicant });
    expect(workspace.body.data?.applications[0]?.volunteerProgramKey).toBe("COMMUNITY_VOLUNTEER");
    expect(workspace.body.data?.volunteers).toHaveLength(0);

    const cancellationApplicant = await createIdentity("phase4-cancel@example.com", "Cancellation Applicant");
    const cancellable = await request<ApplicationResponse>("/volunteers/apply", {
      method: "POST", identity: cancellationApplicant, idempotencyKey: "volunteer-cancel-submit-phase4", body: volunteerInput,
    });
    const cancelKey = "volunteer-cancel-command-phase4";
    const cancelInput = { reason: "My availability changed before the review started." };
    const cancelled = await request<ApplicationResponse>(`/volunteers/applications/${cancellable.body.data!.applicationId}/cancel`, {
      method: "POST", identity: cancellationApplicant, idempotencyKey: cancelKey, body: cancelInput,
    });
    expect(cancelled.response.status).toBe(200);
    const cancelReplay = await request<ApplicationResponse>(`/volunteers/applications/${cancellable.body.data!.applicationId}/cancel`, {
      method: "POST", identity: cancellationApplicant, idempotencyKey: cancelKey, body: cancelInput,
    });
    expect(cancelReplay.response.headers.get("Idempotency-Replayed")).toBe("true");
  });

  it("supports replay-safe renewal and closure requests for historical domain records", async () => {
    const member = await createIdentity("phase4-renewal@example.com", "Renewal Member");
    const membershipApplicationId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO membership_applications
        (id, user_id, membership_type_id, status, full_name, email_snapshot, phone, student_id, department,
         batch, skills_json, interests_json, motivation, time_commitment, declaration_accepted, submitted_at)
       VALUES (?, ?, 'membership-type:CLUB_MEMBER', 'APPROVED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ).bind(
      membershipApplicationId, member.id, "Renewal Member", member.email, "+8801711111111", "2020331001", "CSE", "20",
      '["IoT"]', '["Sensors"]', "Approved historical membership fixture for renewal testing.", "2-4 hours/week", "2025-08-21T00:00:00.000Z",
    ).run();
    await env.DB.prepare(
      `INSERT INTO memberships
        (id, application_id, user_id, membership_type_id, membership_number, batch, issue_date, start_date, end_date, status)
       VALUES (?, ?, ?, 'membership-type:CLUB_MEMBER', 'RUET-IOT-20-001', '20', '2025-08-21', '2025-08-21', '2026-08-21', 'EXPIRING_SOON')`,
    ).bind(membershipId, membershipApplicationId, member.id).run();

    const renewalKey = "membership-renewal-phase4-0001";
    const renewal = await request<{ renewalId: string }>("/membership/renew", {
      method: "POST", identity: member, idempotencyKey: renewalKey,
    });
    expect(renewal.response.status).toBe(201);
    const renewalReplay = await request<{ renewalId: string }>("/membership/renew", {
      method: "POST", identity: member, idempotencyKey: renewalKey,
    });
    expect(renewalReplay.body.data?.renewalId).toBe(renewal.body.data?.renewalId);
    expect(renewalReplay.response.headers.get("Idempotency-Replayed")).toBe("true");
    expect(await env.DB.prepare("SELECT status FROM memberships WHERE id = ?").bind(membershipId).first<string>("status"))
      .toBe("RENEWAL_PENDING");

    const volunteer = await createIdentity("phase4-closure@example.com", "Closure Volunteer");
    const volunteerApplicationId = crypto.randomUUID();
    const volunteerId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO volunteer_applications
        (id, user_id, volunteer_program_id, status, full_name, email_snapshot, phone, skills_json,
         interests_json, motivation, time_commitment, declaration_accepted, submitted_at)
       VALUES (?, ?, 'volunteer-program:COMMUNITY_VOLUNTEER', 'APPROVED', ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ).bind(
      volunteerApplicationId, volunteer.id, "Closure Volunteer", volunteer.email, "+8801811111111",
      '["Outreach"]', '["Workshops"]', "Approved historical volunteer fixture for closure testing.", "2-4 hours/week", "2025-08-21T00:00:00.000Z",
    ).run();
    await env.DB.prepare(
      `INSERT INTO volunteers
        (id, application_id, user_id, volunteer_program_id, volunteer_number, issue_year, issue_date, start_date, end_date, status)
       VALUES (?, ?, ?, 'volunteer-program:COMMUNITY_VOLUNTEER', 'RUET-IOT-CV-25-001', 2025, '2025-08-21', '2025-08-21', '2026-08-21', 'ACTIVE')`,
    ).bind(volunteerId, volunteerApplicationId, volunteer.id).run();

    const closureKey = "volunteer-closure-phase4-0001";
    const closureInput = { reason: "I can no longer meet the volunteer time commitment." };
    const closure = await request<{ closureRequestId: string }>("/volunteers/closure-request", {
      method: "POST", identity: volunteer, idempotencyKey: closureKey, body: closureInput,
    });
    expect(closure.response.status).toBe(201);
    const closureReplay = await request<{ closureRequestId: string }>("/volunteers/closure-request", {
      method: "POST", identity: volunteer, idempotencyKey: closureKey, body: closureInput,
    });
    expect(closureReplay.body.data?.closureRequestId).toBe(closure.body.data?.closureRequestId);
    expect(closureReplay.response.headers.get("Idempotency-Replayed")).toBe("true");
    expect(await env.DB.prepare("SELECT status FROM volunteers WHERE id = ?").bind(volunteerId).first<string>("status"))
      .toBe("CLOSURE_REQUESTED");

    await expect(env.DB.prepare("UPDATE memberships SET membership_number = 'RUET-IOT-20-999' WHERE id = ?").bind(membershipId).run())
      .rejects.toThrow(/membership identity fields are immutable/iu);
    await expect(env.DB.prepare("UPDATE volunteers SET volunteer_number = 'RUET-IOT-CV-25-999' WHERE id = ?").bind(volunteerId).run())
      .rejects.toThrow(/volunteer identity fields are immutable/iu);
    await expect(env.DB.prepare("DELETE FROM volunteer_applications WHERE id = ?").bind(volunteerApplicationId).run())
      .rejects.toThrow(/cannot be hard deleted/iu);
  });
});
