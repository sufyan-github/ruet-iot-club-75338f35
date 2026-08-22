import { Hono, type Context } from "hono";
import { z } from "zod";
import { csrfMiddleware, requireAuth, sessionMiddleware } from "../auth/session";
import { parseJson } from "../auth/validation";
import { createAuditStatement } from "../db/audit";
import {
  executeIdempotentCommand,
  getIdempotentReplay,
  requireIdempotencyKey,
  type IdempotentCommandResult,
} from "../db/idempotency";
import { AppError } from "../lib/app-error";
import { success } from "../lib/api-envelope";
import { requirePermission } from "../middleware/authorization";
import {
  currentMembership,
  currentVolunteer,
  membershipTypeByKey,
  openMembershipApplication,
  openVolunteerApplication,
  volunteerProgramByKey,
} from "../repositories/membership-repository";
import { readMembershipPaymentSettings } from "../services/membership-payment";
import type { AppEnvironment } from "../types";
import {
  cancellationSchema,
  closureRequestSchema,
  membershipApplicationSchema,
  membershipDraftSchema,
  volunteerApplicationSchema,
  volunteerDraftSchema,
} from "../validators/membership";

type MembershipDraft = z.infer<typeof membershipDraftSchema>;
type MembershipApplication = z.infer<typeof membershipApplicationSchema>;
type VolunteerDraft = z.infer<typeof volunteerDraftSchema>;
type VolunteerApplication = z.infer<typeof volunteerApplicationSchema>;

interface OwnedApplicationRow {
  id: string;
  status: string;
}

function idempotentJson(context: Context<AppEnvironment>, result: IdempotentCommandResult): Response {
  context.header("Idempotency-Replayed", result.replayed ? "true" : "false");
  if (result.status === 201) return context.json(success(result.data, context.get("requestId")), 201);
  if (result.status === 202) return context.json(success(result.data, context.get("requestId")), 202);
  return context.json(success(result.data, context.get("requestId")), 200);
}

function nullable(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function membershipValues(input: MembershipDraft | MembershipApplication, email: string): Array<string | number | null> {
  return [
    input.fullName ?? null,
    email,
    input.phone ?? null,
    input.studentId ?? null,
    input.department ?? null,
    input.batch ?? null,
    nullable(input.academicSession),
    input.gender ?? null,
    nullable(input.address),
    JSON.stringify(input.skills ?? []),
    JSON.stringify(input.interests ?? []),
    nullable(input.experience),
    nullable(input.motivation),
    input.portfolioUrl ?? null,
    input.githubUrl ?? null,
    input.linkedinUrl ?? null,
    input.timeCommitment ?? null,
    input.declarationAccepted ? 1 : 0,
  ];
}

function volunteerValues(input: VolunteerDraft | VolunteerApplication, email: string): Array<string | number | null> {
  return [
    input.fullName ?? null,
    email,
    input.phone ?? null,
    nullable(input.organization),
    nullable(input.department),
    nullable(input.batch),
    nullable(input.address),
    JSON.stringify(input.skills ?? []),
    JSON.stringify(input.interests ?? []),
    nullable(input.experience),
    nullable(input.motivation),
    input.portfolioUrl ?? null,
    input.githubUrl ?? null,
    input.linkedinUrl ?? null,
    input.timeCommitment ?? null,
    input.declarationAccepted ? 1 : 0,
  ];
}

function mapDomainDatabaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (/membership_payments_transaction_reference_idx|UNIQUE constraint failed: membership_payments\.payment_method, membership_payments\.transaction_reference/iu.test(message)) {
    throw new AppError({ code: "PAYMENT_REFERENCE_EXISTS", message: "This payment transaction ID has already been submitted.", status: 409 });
  }
  if (/membership_applications_one_open|volunteer_applications_one_open|UNIQUE constraint failed: (membership|volunteer)_applications\.user_id/iu.test(message)) {
    throw new AppError({ code: "OPEN_APPLICATION_EXISTS", message: "An open application already exists.", status: 409 });
  }
  if (/membership_renewals_one_open|volunteer_renewals_one_open|UNIQUE constraint failed: (membership|volunteer)_renewals\.(membership_id|volunteer_id)/iu.test(message)) {
    throw new AppError({ code: "OPEN_RENEWAL_EXISTS", message: "An open renewal request already exists.", status: 409 });
  }
  if (/membership_closure_one_open|volunteer_closure_one_open|UNIQUE constraint failed: (membership|volunteer)_closure_requests\.(membership_id|volunteer_id)/iu.test(message)) {
    throw new AppError({ code: "OPEN_CLOSURE_EXISTS", message: "An open closure request already exists.", status: 409 });
  }
  throw error;
}

export const membershipRoutes = new Hono<AppEnvironment>();

membershipRoutes.use("/membership/*", sessionMiddleware({ required: true }));
membershipRoutes.use("/volunteers/*", sessionMiddleware({ required: true }));
membershipRoutes.use("/admin/membership/*", sessionMiddleware({ required: true }));
membershipRoutes.use("/admin/volunteers/*", sessionMiddleware({ required: true }));

membershipRoutes.get("/membership/types", async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT type_key AS typeKey, name, description, term_months AS termMonths,
            payment_required AS paymentRequired, fee_minor AS feeMinor, currency
     FROM membership_types WHERE application_enabled = 1 AND deleted_at IS NULL ORDER BY name`,
  ).all();
  return context.json(success(results, context.get("requestId")));
});

membershipRoutes.get("/volunteers/programs", async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT program_key AS programKey, name, description, term_months AS termMonths
     FROM volunteer_programs WHERE application_enabled = 1 AND deleted_at IS NULL ORDER BY name`,
  ).all();
  return context.json(success(results, context.get("requestId")));
});

membershipRoutes.get("/membership/me", async (context) => {
  const { user } = requireAuth(context);
  const [applications, memberships, renewals, closures, paymentRequests, payments] = await Promise.all([
    context.env.DB.prepare(
      `SELECT ma.id AS applicationId, mt.type_key AS membershipTypeKey, mt.name AS membershipTypeName,
              ma.status, ma.full_name AS fullName, ma.email_snapshot AS email, ma.phone,
              ma.student_id AS studentId, ma.department, ma.batch, ma.academic_session AS academicSession,
              ma.gender, ma.address, ma.skills_json AS skillsJson, ma.interests_json AS interestsJson,
              ma.experience, ma.motivation, ma.portfolio_url AS portfolioUrl, ma.github_url AS githubUrl,
              ma.linkedin_url AS linkedinUrl, ma.time_commitment AS timeCommitment,
              ma.declaration_accepted AS declarationAccepted, ma.revision, ma.created_at AS createdAt,
              ma.updated_at AS updatedAt, ma.submitted_at AS submittedAt, ma.cancelled_at AS cancelledAt,
              ma.cancellation_reason AS cancellationReason, ma.decision_at AS decisionAt,
              ma.decision_reason AS decisionReason
       FROM membership_applications ma JOIN membership_types mt ON mt.id = ma.membership_type_id
       WHERE ma.user_id = ? ORDER BY ma.created_at DESC LIMIT 10`,
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT m.id AS membershipId, m.membership_number AS membershipNumber, mt.name AS membershipTypeName,
              m.batch, m.issue_date AS issueDate, m.start_date AS startDate, m.end_date AS endDate,
              m.status, m.certificate_eligible AS certificateEligible, m.closed_at AS closedAt,
              m.closure_reason AS closureReason
       FROM memberships m JOIN membership_types mt ON mt.id = m.membership_type_id
       WHERE m.user_id = ? ORDER BY m.created_at DESC`,
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT mr.id AS renewalId, mr.membership_id AS membershipId, mr.status,
              mr.requested_at AS requestedAt, mr.decision_at AS decisionAt, mr.decision_reason AS decisionReason
       FROM membership_renewals mr JOIN memberships m ON m.id = mr.membership_id
       WHERE m.user_id = ? ORDER BY mr.requested_at DESC`,
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT cr.id AS closureRequestId, cr.membership_id AS membershipId, cr.reason, cr.status,
              cr.requested_at AS requestedAt, cr.decision_at AS decisionAt, cr.decision_reason AS decisionReason
       FROM membership_closure_requests cr JOIN memberships m ON m.id = cr.membership_id
       WHERE m.user_id = ? ORDER BY cr.requested_at DESC`,
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT mpr.id AS paymentRequestId, mpr.application_id AS applicationId,
              mpr.expected_amount_minor AS expectedAmountMinor, mpr.currency,
              mpr.payment_methods_json AS paymentMethodsJson,
              mpr.payment_number AS paymentNumber,
              mpr.payment_instructions AS paymentInstructions,
              mpr.requested_at AS requestedAt, mpr.reason
       FROM membership_payment_requests mpr
       JOIN membership_applications ma ON ma.id = mpr.application_id
       WHERE ma.user_id = ? ORDER BY mpr.requested_at DESC`,
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT mp.id AS paymentId, mp.application_id AS applicationId,
              mp.expected_amount_minor AS expectedAmountMinor, mp.currency,
              mp.payment_method AS paymentMethod, mp.payer_phone AS payerPhone,
              mp.transaction_reference AS transactionReference,
              mp.status, mp.submitted_at AS submittedAt, mp.verified_at AS verifiedAt,
              mp.verification_reason AS verificationReason
       FROM membership_payments mp
       JOIN membership_applications ma ON ma.id = mp.application_id
       WHERE ma.user_id = ? ORDER BY mp.submitted_at DESC`,
    ).bind(user.id).all(),
  ]);
  return context.json(success({
    applications: applications.results,
    memberships: memberships.results,
    renewals: renewals.results,
    closures: closures.results,
    paymentRequests: paymentRequests.results,
    payments: payments.results,
  }, context.get("requestId")));
});

membershipRoutes.get("/volunteers/me", async (context) => {
  const { user } = requireAuth(context);
  const [applications, volunteers, renewals, closures] = await Promise.all([
    context.env.DB.prepare(
      `SELECT va.id AS applicationId, vp.program_key AS volunteerProgramKey, vp.name AS volunteerProgramName,
              va.status, va.full_name AS fullName, va.email_snapshot AS email, va.phone, va.organization,
              va.department, va.batch, va.address, va.skills_json AS skillsJson,
              va.interests_json AS interestsJson, va.experience, va.motivation,
              va.portfolio_url AS portfolioUrl, va.github_url AS githubUrl, va.linkedin_url AS linkedinUrl,
              va.time_commitment AS timeCommitment, va.declaration_accepted AS declarationAccepted,
              va.revision, va.created_at AS createdAt, va.updated_at AS updatedAt,
              va.submitted_at AS submittedAt, va.cancelled_at AS cancelledAt,
              va.cancellation_reason AS cancellationReason, va.decision_at AS decisionAt,
              va.decision_reason AS decisionReason
       FROM volunteer_applications va JOIN volunteer_programs vp ON vp.id = va.volunteer_program_id
       WHERE va.user_id = ? ORDER BY va.created_at DESC LIMIT 10`,
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT v.id AS volunteerId, v.volunteer_number AS volunteerNumber, vp.name AS volunteerProgramName,
              v.issue_year AS issueYear, v.issue_date AS issueDate, v.start_date AS startDate,
              v.end_date AS endDate, v.status, v.certificate_eligible AS certificateEligible,
              v.closed_at AS closedAt, v.closure_reason AS closureReason
       FROM volunteers v JOIN volunteer_programs vp ON vp.id = v.volunteer_program_id
       WHERE v.user_id = ? ORDER BY v.created_at DESC`,
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT vr.id AS renewalId, vr.volunteer_id AS volunteerId, vr.status,
              vr.requested_at AS requestedAt, vr.decision_at AS decisionAt, vr.decision_reason AS decisionReason
       FROM volunteer_renewals vr JOIN volunteers v ON v.id = vr.volunteer_id
       WHERE v.user_id = ? ORDER BY vr.requested_at DESC`,
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT cr.id AS closureRequestId, cr.volunteer_id AS volunteerId, cr.reason, cr.status,
              cr.requested_at AS requestedAt, cr.decision_at AS decisionAt, cr.decision_reason AS decisionReason
       FROM volunteer_closure_requests cr JOIN volunteers v ON v.id = cr.volunteer_id
       WHERE v.user_id = ? ORDER BY cr.requested_at DESC`,
    ).bind(user.id).all(),
  ]);
  return context.json(success({ applications: applications.results, volunteers: volunteers.results, renewals: renewals.results, closures: closures.results }, context.get("requestId")));
});

membershipRoutes.put("/membership/draft", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, membershipDraftSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "membership.application.draft", actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson(context, replay);
  const [type, open, membership] = await Promise.all([
    membershipTypeByKey(context.env.DB, input.membershipTypeKey),
    openMembershipApplication(context.env.DB, user.id),
    currentMembership(context.env.DB, user.id),
  ]);
  if (membership) throw new AppError({ code: "MEMBERSHIP_EXISTS", message: "A current membership already exists.", status: 409 });
  if (open && open.status !== "DRAFT") throw new AppError({ code: "APPLICATION_ALREADY_SUBMITTED", message: "The open application can no longer be edited.", status: 409 });
  const applicationId = open?.id ?? crypto.randomUUID();
  const revision = (open?.revision ?? 0) + 1;
  const now = new Date().toISOString();
  const values = membershipValues(input, user.email);
  const statement = open
    ? context.env.DB.prepare(
        `UPDATE membership_applications SET membership_type_id = ?, full_name = ?, email_snapshot = ?,
          phone = ?, student_id = ?, department = ?, batch = ?, academic_session = ?, gender = ?, address = ?,
          skills_json = ?, interests_json = ?, experience = ?, motivation = ?, portfolio_url = ?, github_url = ?,
          linkedin_url = ?, time_commitment = ?, declaration_accepted = ?, revision = revision + 1, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'DRAFT'`,
      ).bind(type.id, ...values, now, applicationId, user.id)
    : context.env.DB.prepare(
        `INSERT INTO membership_applications
          (id, user_id, membership_type_id, status, full_name, email_snapshot, phone, student_id, department,
           batch, academic_session, gender, address, skills_json, interests_json, experience, motivation,
           portfolio_url, github_url, linkedin_url, time_commitment, declaration_accepted, updated_at)
         VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(applicationId, user.id, type.id, ...values, now);
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "membership.application.draft",
      actorKey: user.id,
      idempotencyKey,
      requestData: input,
      responseData: { applicationId, status: "DRAFT", revision },
      responseStatus: open ? 200 : 201,
      statements: [
        statement,
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"), actorId: user.id, action: "MEMBERSHIP_APPLICATION_DRAFT_SAVED",
          entityType: "MEMBERSHIP_APPLICATION", entityId: applicationId,
          reason: "Applicant saved a membership application draft.", metadata: { revision, membershipTypeKey: type.type_key },
        }),
      ],
    });
    return idempotentJson(context, result);
  } catch (error) { return mapDomainDatabaseError(error); }
});

membershipRoutes.post("/membership/apply", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, membershipApplicationSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "membership.application.submit", actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson(context, replay);
  const [type, open, membership] = await Promise.all([
    membershipTypeByKey(context.env.DB, input.membershipTypeKey),
    openMembershipApplication(context.env.DB, user.id),
    currentMembership(context.env.DB, user.id),
  ]);
  if (membership) throw new AppError({ code: "MEMBERSHIP_EXISTS", message: "A current membership already exists.", status: 409 });
  if (open && open.status !== "DRAFT") throw new AppError({ code: "APPLICATION_ALREADY_SUBMITTED", message: "An application is already being processed.", status: 409 });
  if (type.payment_required === 1 && (type.fee_minor === null || type.fee_minor <= 0)) {
    throw new AppError({ code: "PAYMENT_CONFIGURATION_INVALID", message: "The membership fee requires administrator attention.", status: 503 });
  }
  if (type.payment_required === 1 && !input.payment) {
    throw new AppError({ code: "PAYMENT_EVIDENCE_REQUIRED", message: "Submit bKash or Nagad payment evidence with this membership application.", status: 422 });
  }
  if (type.payment_required === 0 && input.payment) {
    throw new AppError({ code: "PAYMENT_NOT_REQUIRED", message: "The selected membership type does not require payment.", status: 422 });
  }
  const paymentSettings = type.payment_required === 1
    ? await readMembershipPaymentSettings(context.env.DB)
    : null;
  if (input.payment && paymentSettings && !paymentSettings.paymentMethods.includes(input.payment.paymentMethod)) {
    throw new AppError({ code: "PAYMENT_METHOD_NOT_AVAILABLE", message: "Use an enabled payment method shown on the application form.", status: 409 });
  }
  const applicationId = open?.id ?? crypto.randomUUID();
  const paymentRequestId = input.payment ? crypto.randomUUID() : null;
  const paymentId = input.payment ? crypto.randomUUID() : null;
  const now = new Date().toISOString();
  const values = membershipValues(input, user.email);
  const statement = open
    ? context.env.DB.prepare(
        `UPDATE membership_applications SET membership_type_id = ?, status = 'SUBMITTED', full_name = ?,
          email_snapshot = ?, phone = ?, student_id = ?, department = ?, batch = ?, academic_session = ?,
          gender = ?, address = ?, skills_json = ?, interests_json = ?, experience = ?, motivation = ?,
          portfolio_url = ?, github_url = ?, linkedin_url = ?, time_commitment = ?, declaration_accepted = ?,
          revision = revision + 1, submitted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'DRAFT'`,
      ).bind(type.id, ...values, now, now, applicationId, user.id)
    : context.env.DB.prepare(
        `INSERT INTO membership_applications
          (id, user_id, membership_type_id, status, full_name, email_snapshot, phone, student_id, department,
           batch, academic_session, gender, address, skills_json, interests_json, experience, motivation,
           portfolio_url, github_url, linkedin_url, time_commitment, declaration_accepted, submitted_at, updated_at)
         VALUES (?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(applicationId, user.id, type.id, ...values, now, now);
  const statements: D1PreparedStatement[] = [
    statement,
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"), actorId: user.id, action: "MEMBERSHIP_APPLICATION_SUBMITTED",
      entityType: "MEMBERSHIP_APPLICATION", entityId: applicationId,
      reason: "Applicant submitted the membership declaration.", metadata: { membershipTypeKey: type.type_key, batch: input.batch },
    }),
  ];
  if (input.payment && paymentSettings && paymentRequestId && paymentId && type.fee_minor !== null) {
    statements.push(
      context.env.DB.prepare(
        `INSERT INTO membership_payment_requests
          (id, application_id, expected_amount_minor, currency, payment_methods_json,
           payment_number, payment_instructions, requested_by, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        paymentRequestId, applicationId, type.fee_minor, type.currency,
        JSON.stringify(paymentSettings.paymentMethods), paymentSettings.paymentNumber,
        paymentSettings.paymentInstructions, user.id,
        "Payment evidence was submitted with the membership application.",
      ),
      context.env.DB.prepare(
        `INSERT INTO membership_payments
          (id, application_id, payment_request_id, expected_amount_minor, currency,
           payment_method, payer_phone, transaction_reference, submitted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        paymentId, applicationId, paymentRequestId, type.fee_minor, type.currency,
        input.payment.paymentMethod, input.payment.payerPhone,
        input.payment.transactionReference, user.id,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"), actorId: user.id, action: "MEMBERSHIP_PAYMENT_REQUEST_CREATED_AT_SUBMISSION",
        entityType: "MEMBERSHIP_PAYMENT_REQUEST", entityId: paymentRequestId,
        reason: "The server snapshotted the configured membership fee and payment destination during application submission.",
        metadata: { applicationId, expectedAmountMinor: type.fee_minor, currency: type.currency, paymentNumber: paymentSettings.paymentNumber },
      }),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"), actorId: user.id, action: "MEMBERSHIP_PAYMENT_SUBMITTED",
        entityType: "MEMBERSHIP_PAYMENT", entityId: paymentId,
        reason: "Applicant submitted payment evidence with the membership application for independent finance verification.",
        metadata: { applicationId, paymentMethod: input.payment.paymentMethod },
      }),
    );
  }
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation: "membership.application.submit", actorKey: user.id, idempotencyKey,
      requestData: input,
      responseData: { applicationId, paymentId, status: "SUBMITTED", paymentStatus: paymentId ? "SUBMITTED" : null, submitted: true },
      responseStatus: 201,
      statements,
    });
    return idempotentJson(context, result);
  } catch (error) { return mapDomainDatabaseError(error); }
});

membershipRoutes.put("/volunteers/draft", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, volunteerDraftSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "volunteer.application.draft", actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson(context, replay);
  const [program, open, volunteer] = await Promise.all([
    volunteerProgramByKey(context.env.DB, input.volunteerProgramKey),
    openVolunteerApplication(context.env.DB, user.id),
    currentVolunteer(context.env.DB, user.id),
  ]);
  if (volunteer) throw new AppError({ code: "VOLUNTEER_RECORD_EXISTS", message: "A current volunteer record already exists.", status: 409 });
  if (open && open.status !== "DRAFT") throw new AppError({ code: "APPLICATION_ALREADY_SUBMITTED", message: "The open application can no longer be edited.", status: 409 });
  const applicationId = open?.id ?? crypto.randomUUID();
  const revision = (open?.revision ?? 0) + 1;
  const now = new Date().toISOString();
  const values = volunteerValues(input, user.email);
  const statement = open
    ? context.env.DB.prepare(
        `UPDATE volunteer_applications SET volunteer_program_id = ?, full_name = ?, email_snapshot = ?, phone = ?,
          organization = ?, department = ?, batch = ?, address = ?, skills_json = ?, interests_json = ?,
          experience = ?, motivation = ?, portfolio_url = ?, github_url = ?, linkedin_url = ?,
          time_commitment = ?, declaration_accepted = ?, revision = revision + 1, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'DRAFT'`,
      ).bind(program.id, ...values, now, applicationId, user.id)
    : context.env.DB.prepare(
        `INSERT INTO volunteer_applications
          (id, user_id, volunteer_program_id, status, full_name, email_snapshot, phone, organization,
           department, batch, address, skills_json, interests_json, experience, motivation, portfolio_url,
           github_url, linkedin_url, time_commitment, declaration_accepted, updated_at)
         VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(applicationId, user.id, program.id, ...values, now);
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation: "volunteer.application.draft", actorKey: user.id, idempotencyKey,
      requestData: input, responseData: { applicationId, status: "DRAFT", revision }, responseStatus: open ? 200 : 201,
      statements: [
        statement,
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"), actorId: user.id, action: "VOLUNTEER_APPLICATION_DRAFT_SAVED",
          entityType: "VOLUNTEER_APPLICATION", entityId: applicationId,
          reason: "Applicant saved a volunteer application draft.", metadata: { revision, volunteerProgramKey: program.program_key },
        }),
      ],
    });
    return idempotentJson(context, result);
  } catch (error) { return mapDomainDatabaseError(error); }
});

membershipRoutes.post("/volunteers/apply", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, volunteerApplicationSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "volunteer.application.submit", actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson(context, replay);
  const [program, open, volunteer] = await Promise.all([
    volunteerProgramByKey(context.env.DB, input.volunteerProgramKey),
    openVolunteerApplication(context.env.DB, user.id),
    currentVolunteer(context.env.DB, user.id),
  ]);
  if (volunteer) throw new AppError({ code: "VOLUNTEER_RECORD_EXISTS", message: "A current volunteer record already exists.", status: 409 });
  if (open && open.status !== "DRAFT") throw new AppError({ code: "APPLICATION_ALREADY_SUBMITTED", message: "An application is already being processed.", status: 409 });
  const applicationId = open?.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const values = volunteerValues(input, user.email);
  const statement = open
    ? context.env.DB.prepare(
        `UPDATE volunteer_applications SET volunteer_program_id = ?, status = 'SUBMITTED', full_name = ?,
          email_snapshot = ?, phone = ?, organization = ?, department = ?, batch = ?, address = ?, skills_json = ?,
          interests_json = ?, experience = ?, motivation = ?, portfolio_url = ?, github_url = ?, linkedin_url = ?,
          time_commitment = ?, declaration_accepted = ?, revision = revision + 1, submitted_at = ?, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'DRAFT'`,
      ).bind(program.id, ...values, now, now, applicationId, user.id)
    : context.env.DB.prepare(
        `INSERT INTO volunteer_applications
          (id, user_id, volunteer_program_id, status, full_name, email_snapshot, phone, organization,
           department, batch, address, skills_json, interests_json, experience, motivation, portfolio_url,
           github_url, linkedin_url, time_commitment, declaration_accepted, submitted_at, updated_at)
         VALUES (?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(applicationId, user.id, program.id, ...values, now, now);
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation: "volunteer.application.submit", actorKey: user.id, idempotencyKey,
      requestData: input, responseData: { applicationId, status: "SUBMITTED", submitted: true }, responseStatus: 201,
      statements: [
        statement,
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"), actorId: user.id, action: "VOLUNTEER_APPLICATION_SUBMITTED",
          entityType: "VOLUNTEER_APPLICATION", entityId: applicationId,
          reason: "Applicant submitted the volunteer declaration.", metadata: { volunteerProgramKey: program.program_key },
        }),
      ],
    });
    return idempotentJson(context, result);
  } catch (error) { return mapDomainDatabaseError(error); }
});

async function cancelApplication(context: Context<AppEnvironment>, domain: "membership" | "volunteer"): Promise<Response> {
  const { user } = requireAuth(context);
  const input = await parseJson(context, cancellationSchema);
  const applicationId = context.req.param("applicationId") ?? "";
  if (!applicationId) throw new AppError({ code: "APPLICATION_NOT_FOUND", message: "The application was not found.", status: 404 });
  const operation = `${domain}.application.cancel`;
  const requestData = { applicationId, ...input };
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson(context, replay);
  const table = domain === "membership" ? "membership_applications" : "volunteer_applications";
  const application = await context.env.DB.prepare(
    `SELECT id, status FROM ${table} WHERE id = ? AND user_id = ?`,
  ).bind(applicationId, user.id).first<OwnedApplicationRow>();
  if (!application) throw new AppError({ code: "APPLICATION_NOT_FOUND", message: "The application was not found.", status: 404 });
  if (!(["DRAFT", "SUBMITTED"] as string[]).includes(application.status)) {
    throw new AppError({ code: "APPLICATION_CANNOT_BE_CANCELLED", message: "The application can no longer be cancelled by the applicant.", status: 409 });
  }
  const now = new Date().toISOString();
  const entityType = domain === "membership" ? "MEMBERSHIP_APPLICATION" : "VOLUNTEER_APPLICATION";
  const action = domain === "membership" ? "MEMBERSHIP_APPLICATION_CANCELLED" : "VOLUNTEER_APPLICATION_CANCELLED";
  const result = await executeIdempotentCommand({
    db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData,
    responseData: { applicationId, status: "CANCELLED", cancelled: true }, responseStatus: 200,
    statements: [
      context.env.DB.prepare(
        `UPDATE ${table} SET status = 'CANCELLED', cancelled_at = ?, cancellation_reason = ?, updated_at = ?
         WHERE id = ? AND user_id = ? AND status IN ('DRAFT', 'SUBMITTED')`,
      ).bind(now, input.reason, now, applicationId, user.id),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"), actorId: user.id, action, entityType, entityId: applicationId,
        reason: input.reason, metadata: { previousStatus: application.status },
      }),
    ],
  });
  return idempotentJson(context, result);
}

membershipRoutes.post("/membership/applications/:applicationId/cancel", csrfMiddleware(), (context) => cancelApplication(context, "membership"));
membershipRoutes.post("/volunteers/applications/:applicationId/cancel", csrfMiddleware(), (context) => cancelApplication(context, "volunteer"));

membershipRoutes.post("/membership/renew", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = {};
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "membership.renewal.request", actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson(context, replay);
  const membership = await currentMembership(context.env.DB, user.id);
  if (!membership) throw new AppError({ code: "MEMBERSHIP_NOT_FOUND", message: "No current membership is available for renewal.", status: 409 });
  if (!["EXPIRING_SOON", "EXPIRED"].includes(membership.status)) throw new AppError({ code: "MEMBERSHIP_NOT_RENEWABLE", message: "Renewal becomes available when the membership is expiring soon or expired.", status: 409 });
  const renewalId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation: "membership.renewal.request", actorKey: user.id, idempotencyKey, requestData,
      responseData: { renewalId, membershipId: membership.id, status: "REQUESTED" }, responseStatus: 201,
      statements: [
        context.env.DB.prepare("INSERT INTO membership_renewals (id, membership_id, requested_by, previous_membership_status) VALUES (?, ?, ?, ?)").bind(renewalId, membership.id, user.id, membership.status),
        context.env.DB.prepare("UPDATE memberships SET status = 'RENEWAL_PENDING', updated_at = ? WHERE id = ?").bind(now, membership.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"), actorId: user.id, action: "MEMBERSHIP_RENEWAL_REQUESTED",
          entityType: "MEMBERSHIP_RENEWAL", entityId: renewalId, reason: "Member requested renewal.", metadata: { membershipId: membership.id },
        }),
      ],
    });
    return idempotentJson(context, result);
  } catch (error) { return mapDomainDatabaseError(error); }
});

membershipRoutes.post("/volunteers/renew", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = {};
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "volunteer.renewal.request", actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson(context, replay);
  const volunteer = await currentVolunteer(context.env.DB, user.id);
  if (!volunteer) throw new AppError({ code: "VOLUNTEER_NOT_FOUND", message: "No current volunteer record is available for renewal.", status: 409 });
  if (!["EXPIRING_SOON", "EXPIRED"].includes(volunteer.status)) throw new AppError({ code: "VOLUNTEER_NOT_RENEWABLE", message: "Renewal becomes available when the volunteer term is expiring soon or expired.", status: 409 });
  const renewalId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation: "volunteer.renewal.request", actorKey: user.id, idempotencyKey, requestData,
      responseData: { renewalId, volunteerId: volunteer.id, status: "REQUESTED" }, responseStatus: 201,
      statements: [
        context.env.DB.prepare("INSERT INTO volunteer_renewals (id, volunteer_id, requested_by, previous_volunteer_status) VALUES (?, ?, ?, ?)").bind(renewalId, volunteer.id, user.id, volunteer.status),
        context.env.DB.prepare("UPDATE volunteers SET status = 'RENEWAL_PENDING', updated_at = ? WHERE id = ?").bind(now, volunteer.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"), actorId: user.id, action: "VOLUNTEER_RENEWAL_REQUESTED",
          entityType: "VOLUNTEER_RENEWAL", entityId: renewalId, reason: "Volunteer requested renewal.", metadata: { volunteerId: volunteer.id },
        }),
      ],
    });
    return idempotentJson(context, result);
  } catch (error) { return mapDomainDatabaseError(error); }
});

async function requestClosure(context: Context<AppEnvironment>, domain: "membership" | "volunteer"): Promise<Response> {
  const { user } = requireAuth(context);
  const input = await parseJson(context, closureRequestSchema);
  const operation = `${domain}.closure.request`;
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson(context, replay);
  const record = domain === "membership" ? await currentMembership(context.env.DB, user.id) : await currentVolunteer(context.env.DB, user.id);
  if (!record) throw new AppError({ code: "DOMAIN_RECORD_NOT_FOUND", message: "No current record is available for closure.", status: 409 });
  if (["CLOSURE_REQUESTED", "RENEWAL_PENDING"].includes(record.status)) throw new AppError({ code: "DOMAIN_STATE_CONFLICT", message: "The record already has an open lifecycle request.", status: 409 });
  const closureRequestId = crypto.randomUUID();
  const now = new Date().toISOString();
  const table = domain === "membership" ? "membership_closure_requests" : "volunteer_closure_requests";
  const foreignKey = domain === "membership" ? "membership_id" : "volunteer_id";
  const recordTable = domain === "membership" ? "memberships" : "volunteers";
  const action = domain === "membership" ? "MEMBERSHIP_CLOSURE_REQUESTED" : "VOLUNTEER_CLOSURE_REQUESTED";
  const entityType = domain === "membership" ? "MEMBERSHIP_CLOSURE_REQUEST" : "VOLUNTEER_CLOSURE_REQUEST";
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData: input,
      responseData: { closureRequestId, recordId: record.id, status: "REQUESTED" }, responseStatus: 201,
      statements: [
        context.env.DB.prepare(`INSERT INTO ${table} (id, ${foreignKey}, requested_by, reason, ${domain === "membership" ? "previous_membership_status" : "previous_volunteer_status"}) VALUES (?, ?, ?, ?, ?)`)
          .bind(closureRequestId, record.id, user.id, input.reason, record.status),
        context.env.DB.prepare(`UPDATE ${recordTable} SET status = 'CLOSURE_REQUESTED', updated_at = ? WHERE id = ?`)
          .bind(now, record.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"), actorId: user.id, action, entityType, entityId: closureRequestId,
          reason: input.reason, metadata: { recordId: record.id },
        }),
      ],
    });
    return idempotentJson(context, result);
  } catch (error) { return mapDomainDatabaseError(error); }
}

membershipRoutes.post("/membership/closure-request", csrfMiddleware(), (context) => requestClosure(context, "membership"));
membershipRoutes.post("/volunteers/closure-request", csrfMiddleware(), (context) => requestClosure(context, "volunteer"));

membershipRoutes.get("/admin/membership/applications", requirePermission("membership.read"), async (context) => {
  const status = context.req.query("status")?.trim() || "SUBMITTED";
  if (!(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PAYMENT_PENDING", "PAYMENT_VERIFICATION", "APPROVED", "REJECTED", "CANCELLED"] as string[]).includes(status)) {
    throw new AppError({ code: "INVALID_STATUS", message: "The application status filter is invalid.", status: 422 });
  }
  const { results } = await context.env.DB.prepare(
    `SELECT ma.id AS applicationId, ma.status, ma.full_name AS fullName, ma.email_snapshot AS email,
            ma.phone, ma.student_id AS studentId, ma.department, ma.batch, mt.name AS membershipTypeName,
            mt.payment_required AS paymentRequired, mt.fee_minor AS feeMinor, mt.currency,
            (SELECT mp.status FROM membership_payments mp WHERE mp.application_id = ma.id
             ORDER BY mp.submitted_at DESC LIMIT 1) AS latestPaymentStatus,
            ma.submitted_at AS submittedAt, ma.created_at AS createdAt
     FROM membership_applications ma JOIN membership_types mt ON mt.id = ma.membership_type_id
     WHERE ma.status = ? ORDER BY COALESCE(ma.submitted_at, ma.created_at) ASC LIMIT 100`,
  ).bind(status).all();
  return context.json(success(results, context.get("requestId")));
});

membershipRoutes.get("/admin/membership/members", requirePermission("membership.read"), async (context) => {
  const search = (context.req.query("search") ?? "").trim().slice(0, 100).replace(/[%_]/g, "");
  const status = (context.req.query("status") ?? "").trim().toUpperCase();
  const offset = Math.max(Number(context.req.query("offset") ?? 0) || 0, 0);
  const pattern = `%${search}%`;
  const [items, total] = await Promise.all([
    context.env.DB.prepare(
      `SELECT m.id, m.membership_number AS membershipNumber, m.status, m.start_date AS startDate,
              m.end_date AS endDate, m.created_at AS joinedAt, u.display_name AS name,
              u.primary_email AS email, ma.student_id AS studentId, ma.department, ma.batch,
              mt.name AS membershipType
       FROM memberships m JOIN users u ON u.id = m.user_id
       JOIN membership_applications ma ON ma.id = m.application_id
       JOIN membership_types mt ON mt.id = m.membership_type_id
       WHERE (? = '' OR m.status = ?) AND (u.display_name LIKE ? OR u.primary_email_normalized LIKE ? OR COALESCE(ma.student_id, '') LIKE ?)
       ORDER BY m.created_at DESC LIMIT 20 OFFSET ?`,
    ).bind(status, status, pattern, pattern.toLowerCase(), pattern, offset).all(),
    context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM memberships m JOIN users u ON u.id = m.user_id
       JOIN membership_applications ma ON ma.id = m.application_id
       WHERE (? = '' OR m.status = ?) AND (u.display_name LIKE ? OR u.primary_email_normalized LIKE ? OR COALESCE(ma.student_id, '') LIKE ?)`,
    ).bind(status, status, pattern, pattern.toLowerCase(), pattern).first<number>("count"),
  ]);
  return context.json(success({ items: items.results, total: total ?? 0 }, context.get("requestId")));
});

membershipRoutes.get("/admin/volunteers/applications", requirePermission("volunteer.read"), async (context) => {
  const status = context.req.query("status")?.trim() || "SUBMITTED";
  if (!(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] as string[]).includes(status)) {
    throw new AppError({ code: "INVALID_STATUS", message: "The application status filter is invalid.", status: 422 });
  }
  const { results } = await context.env.DB.prepare(
    `SELECT va.id AS applicationId, va.status, va.full_name AS fullName, va.email_snapshot AS email,
            va.phone, va.organization, va.department, va.batch, vp.name AS volunteerProgramName,
            va.submitted_at AS submittedAt, va.created_at AS createdAt
     FROM volunteer_applications va JOIN volunteer_programs vp ON vp.id = va.volunteer_program_id
     WHERE va.status = ? ORDER BY COALESCE(va.submitted_at, va.created_at) ASC LIMIT 100`,
  ).bind(status).all();
  return context.json(success(results, context.get("requestId")));
});

membershipRoutes.get("/admin/volunteers/people", requirePermission("volunteer.read"), async (context) => {
  const search = (context.req.query("search") ?? "").trim().slice(0, 100).replace(/[%_]/g, "");
  const status = (context.req.query("status") ?? "").trim().toUpperCase();
  const offset = Math.max(Number(context.req.query("offset") ?? 0) || 0, 0);
  const pattern = `%${search}%`;
  const [items, total] = await Promise.all([
    context.env.DB.prepare(
      `SELECT v.id, v.volunteer_number AS volunteerNumber, v.status, v.start_date AS startDate,
              v.end_date AS endDate, v.created_at AS joinedAt, u.display_name AS name,
              u.primary_email AS email, va.organization, va.department, va.batch, vp.name AS programName
       FROM volunteers v JOIN users u ON u.id = v.user_id
       JOIN volunteer_applications va ON va.id = v.application_id
       JOIN volunteer_programs vp ON vp.id = v.volunteer_program_id
       WHERE (? = '' OR v.status = ?) AND (u.display_name LIKE ? OR u.primary_email_normalized LIKE ? OR COALESCE(va.organization, '') LIKE ?)
       ORDER BY v.created_at DESC LIMIT 20 OFFSET ?`,
    ).bind(status, status, pattern, pattern.toLowerCase(), pattern, offset).all(),
    context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM volunteers v JOIN users u ON u.id = v.user_id
       JOIN volunteer_applications va ON va.id = v.application_id
       WHERE (? = '' OR v.status = ?) AND (u.display_name LIKE ? OR u.primary_email_normalized LIKE ? OR COALESCE(va.organization, '') LIKE ?)`,
    ).bind(status, status, pattern, pattern.toLowerCase(), pattern).first<number>("count"),
  ]);
  return context.json(success({ items: items.results, total: total ?? 0 }, context.get("requestId")));
});
