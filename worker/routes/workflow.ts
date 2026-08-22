import { Hono, type Context } from "hono";
import { csrfMiddleware, requireAuth, sessionMiddleware } from "../auth/session";
import { parseJson } from "../auth/validation";
import { createAuditStatement } from "../db/audit";
import {
  executeIdempotentCommand,
  getIdempotentReplay,
  requireIdempotencyKey,
  type IdempotentCommandResult,
} from "../db/idempotency";
import { success } from "../lib/api-envelope";
import { AppError } from "../lib/app-error";
import { requirePermission } from "../middleware/authorization";
import {
  membershipPaymentMethodSchema,
  readMembershipPaymentSettings,
} from "../services/membership-payment";
import type { AppEnvironment } from "../types";
import { paymentStatusSchema, paymentSubmissionSchema, workflowReasonSchema } from "../validators/workflow";

interface MembershipApplicationRow {
  id: string;
  user_id: string;
  status: string;
  batch: string;
  membership_type_id: string;
  payment_required: number;
  fee_minor: number | null;
  currency: string;
  term_months: number;
}

interface VolunteerApplicationRow {
  id: string;
  user_id: string;
  status: string;
  volunteer_program_id: string;
  term_months: number;
}

interface PaymentRequestRow {
  request_id: string;
  application_id: string;
  user_id: string;
  status: string;
  expected_amount_minor: number;
  currency: string;
  payment_methods_json: string;
  payment_number: string;
  payment_instructions: string;
}

interface PaymentRow {
  id: string;
  application_id: string | null;
  submitted_by: string;
  status: string;
}

type Domain = "membership" | "volunteer";

function routeId(context: Context<AppEnvironment>): string {
  const value = context.req.param("id");
  if (!value) throw new AppError({ code: "INVALID_ROUTE", message: "A record identifier is required.", status: 404 });
  return value;
}

function idempotentJson(context: Context<AppEnvironment>, result: IdempotentCommandResult): Response {
  context.header("Idempotency-Replayed", result.replayed ? "true" : "false");
  if (result.status === 201) return context.json(success(result.data, context.get("requestId")), 201);
  return context.json(success(result.data, context.get("requestId")), 200);
}

function workflowConflict(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (/UNIQUE constraint failed|not available for review|not eligible|workflow evidence is missing|verification decision is missing/iu.test(message)) {
    throw new AppError({
      code: "WORKFLOW_CONFLICT",
      message: "The workflow changed or another authorized action already won this decision.",
      status: 409,
    });
  }
  throw error;
}

async function membershipApplication(db: D1Database, applicationId: string): Promise<MembershipApplicationRow> {
  const row = await db.prepare(
    `SELECT ma.id, ma.user_id, ma.status, ma.batch, ma.membership_type_id,
            mt.payment_required, mt.fee_minor, mt.currency, mt.term_months
     FROM membership_applications ma
     JOIN membership_types mt ON mt.id = ma.membership_type_id
     WHERE ma.id = ?`,
  ).bind(applicationId).first<MembershipApplicationRow>();
  if (!row) throw new AppError({ code: "APPLICATION_NOT_FOUND", message: "Membership application not found.", status: 404 });
  return row;
}

async function volunteerApplication(db: D1Database, applicationId: string): Promise<VolunteerApplicationRow> {
  const row = await db.prepare(
    `SELECT va.id, va.user_id, va.status, va.volunteer_program_id, vp.term_months
     FROM volunteer_applications va
     JOIN volunteer_programs vp ON vp.id = va.volunteer_program_id
     WHERE va.id = ?`,
  ).bind(applicationId).first<VolunteerApplicationRow>();
  if (!row) throw new AppError({ code: "APPLICATION_NOT_FOUND", message: "Volunteer application not found.", status: 404 });
  return row;
}

function rejectSelfDecision(actorId: string, applicantId: string): void {
  if (actorId === applicantId) {
    throw new AppError({
      code: "SELF_DECISION_FORBIDDEN",
      message: "An applicant cannot review, verify, approve, or reject their own record.",
      status: 409,
    });
  }
}

function identityAuditStatement(options: {
  db: D1Database;
  requestId: string;
  actorId: string;
  domain: Domain;
  recordId: string;
  applicationId: string;
}): D1PreparedStatement {
  const table = options.domain === "membership" ? "memberships" : "volunteers";
  const numberColumn = options.domain === "membership" ? "membership_number" : "volunteer_number";
  const action = options.domain === "membership" ? "MEMBERSHIP_ID_GENERATED" : "VOLUNTEER_ID_GENERATED";
  const entityType = options.domain === "membership" ? "MEMBERSHIP" : "VOLUNTEER";
  return options.db.prepare(
    `INSERT INTO audit_logs
      (id, actor_type, actor_id, action, entity_type, entity_id, reason, metadata_json, request_id)
     SELECT ?, 'USER', ?, ?, ?, ?, ?, json_object('identityNumber', ${numberColumn}, 'applicationId', ?), ?
     FROM ${table} WHERE id = ?`,
  ).bind(
    crypto.randomUUID(), options.actorId, action, entityType, options.recordId,
    "Server allocated an immutable identity from the transactional sequence.",
    options.applicationId, options.requestId, options.recordId,
  );
}

export const workflowRoutes = new Hono<AppEnvironment>();

workflowRoutes.use("/membership/applications/*", sessionMiddleware({ required: true }));
workflowRoutes.use("/admin/membership/*", sessionMiddleware({ required: true }));
workflowRoutes.use("/admin/volunteers/*", sessionMiddleware({ required: true }));

async function startReview(context: Context<AppEnvironment>, domain: Domain): Promise<Response> {
  const { user } = requireAuth(context);
  const input = await parseJson(context, workflowReasonSchema);
  const applicationId = routeId(context);
  const operation = `${domain}.application.start-review`;
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = { applicationId, ...input };
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson(context, replay);
  const application = domain === "membership"
    ? await membershipApplication(context.env.DB, applicationId)
    : await volunteerApplication(context.env.DB, applicationId);
  rejectSelfDecision(user.id, application.user_id);
  if (application.status !== "SUBMITTED") {
    throw new AppError({ code: "APPLICATION_NOT_REVIEWABLE", message: "Only a submitted application can enter review.", status: 409 });
  }
  const claimTable = domain === "membership" ? "membership_review_claims" : "volunteer_review_claims";
  const applicationTable = domain === "membership" ? "membership_applications" : "volunteer_applications";
  const action = domain === "membership" ? "MEMBERSHIP_REVIEW_STARTED" : "VOLUNTEER_REVIEW_STARTED";
  const entityType = domain === "membership" ? "MEMBERSHIP_APPLICATION" : "VOLUNTEER_APPLICATION";
  const now = new Date().toISOString();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData,
      responseData: { applicationId, status: "UNDER_REVIEW" }, responseStatus: 200,
      statements: [
        context.env.DB.prepare(`INSERT INTO ${claimTable} (application_id, reviewer_id, reason) VALUES (?, ?, ?)`)
          .bind(applicationId, user.id, input.reason),
        context.env.DB.prepare(
          `UPDATE ${applicationTable} SET status = 'UNDER_REVIEW', review_started_at = ?, reviewed_by = ?, updated_at = ?
           WHERE id = ? AND status = 'SUBMITTED'`,
        ).bind(now, user.id, now, applicationId),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"), actorId: user.id, action, entityType, entityId: applicationId,
          reason: input.reason, metadata: { previousStatus: "SUBMITTED", status: "UNDER_REVIEW" },
        }),
      ],
    });
    return idempotentJson(context, result);
  } catch (error) { return workflowConflict(error); }
}

workflowRoutes.post(
  "/admin/membership/applications/:id/start-review",
  requirePermission("membership.review"), csrfMiddleware(),
  (context) => startReview(context, "membership"),
);
workflowRoutes.post(
  "/admin/volunteers/applications/:id/start-review",
  requirePermission("volunteer.review"), csrfMiddleware(),
  (context) => startReview(context, "volunteer"),
);

workflowRoutes.post(
  "/admin/membership/applications/:id/request-payment",
  requirePermission("membership.review"), csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, workflowReasonSchema);
    const applicationId = routeId(context);
    const operation = "membership.application.request-payment";
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { applicationId, ...input };
    const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
    if (replay) return idempotentJson(context, replay);
    const application = await membershipApplication(context.env.DB, applicationId);
    rejectSelfDecision(user.id, application.user_id);
    if (application.status !== "UNDER_REVIEW") {
      throw new AppError({ code: "PAYMENT_REQUEST_NOT_ELIGIBLE", message: "The application must be under review.", status: 409 });
    }
    if (application.payment_required !== 1 || application.fee_minor === null) {
      throw new AppError({ code: "PAYMENT_NOT_CONFIGURED", message: "This membership type has no configured payment requirement.", status: 409 });
    }
    const paymentSettings = await readMembershipPaymentSettings(context.env.DB);
    const paymentRequestId = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData,
        responseData: {
          applicationId, paymentRequestId, status: "PAYMENT_PENDING",
          expectedAmountMinor: application.fee_minor, currency: application.currency,
          paymentMethods: paymentSettings.paymentMethods,
          paymentNumber: paymentSettings.paymentNumber,
          paymentInstructions: paymentSettings.paymentInstructions,
        }, responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO membership_payment_requests
              (id, application_id, expected_amount_minor, currency, payment_methods_json,
               payment_number, payment_instructions, requested_by, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(
            paymentRequestId, applicationId, application.fee_minor, application.currency,
            JSON.stringify(paymentSettings.paymentMethods), paymentSettings.paymentNumber,
            paymentSettings.paymentInstructions, user.id, input.reason,
          ),
          context.env.DB.prepare(
            "UPDATE membership_applications SET status = 'PAYMENT_PENDING', updated_at = ? WHERE id = ? AND status = 'UNDER_REVIEW'",
          ).bind(now, applicationId),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"), actorId: user.id, action: "MEMBERSHIP_PAYMENT_REQUESTED",
            entityType: "MEMBERSHIP_PAYMENT_REQUEST", entityId: paymentRequestId, reason: input.reason,
            metadata: {
              applicationId,
              expectedAmountMinor: application.fee_minor,
              currency: application.currency,
              paymentMethods: paymentSettings.paymentMethods,
              paymentNumber: paymentSettings.paymentNumber,
            },
          }),
        ],
      });
      return idempotentJson(context, result);
    } catch (error) { return workflowConflict(error); }
  },
);

workflowRoutes.post("/membership/applications/:id/payment", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, paymentSubmissionSchema);
  const applicationId = routeId(context);
  const operation = "membership.payment.submit";
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = { applicationId, ...input };
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson(context, replay);
  const request = await context.env.DB.prepare(
    `SELECT mpr.id AS request_id, mpr.application_id, ma.user_id, ma.status,
            mpr.expected_amount_minor, mpr.currency, mpr.payment_methods_json,
            mpr.payment_number, mpr.payment_instructions
     FROM membership_payment_requests mpr
     JOIN membership_applications ma ON ma.id = mpr.application_id
     WHERE mpr.application_id = ?`,
  ).bind(applicationId).first<PaymentRequestRow>();
  if (!request || request.user_id !== user.id) {
    throw new AppError({ code: "PAYMENT_REQUEST_NOT_FOUND", message: "Payment request not found.", status: 404 });
  }
  if (!["SUBMITTED", "UNDER_REVIEW", "PAYMENT_PENDING"].includes(request.status)) {
    throw new AppError({ code: "PAYMENT_NOT_ACCEPTED", message: "The application is not accepting payment evidence.", status: 409 });
  }
  let paymentMethodsJson: unknown;
  try {
    paymentMethodsJson = JSON.parse(request.payment_methods_json);
  } catch {
    throw new AppError({
      code: "PAYMENT_REQUEST_CONFIGURATION_INVALID",
      message: "This payment request requires administrator attention.",
      status: 503,
    });
  }
  const allowedMethods = membershipPaymentMethodSchema.array().min(1).max(2).safeParse(paymentMethodsJson);
  if (!allowedMethods.success) {
    throw new AppError({
      code: "PAYMENT_REQUEST_CONFIGURATION_INVALID",
      message: "This payment request requires administrator attention.",
      status: 503,
    });
  }
  if (!allowedMethods.data.includes(input.paymentMethod)) {
    throw new AppError({
      code: "PAYMENT_METHOD_NOT_AVAILABLE",
      message: "Use one of the payment methods included in the official payment request.",
      status: 409,
    });
  }
  const paymentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const nextApplicationStatus = request.status === "PAYMENT_PENDING" ? "PAYMENT_VERIFICATION" : request.status;
  const statements: D1PreparedStatement[] = [
    context.env.DB.prepare(
      `INSERT INTO membership_payments
        (id, application_id, payment_request_id, expected_amount_minor, currency, payment_method,
         payer_phone, transaction_reference, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      paymentId, applicationId, request.request_id, request.expected_amount_minor, request.currency,
      input.paymentMethod, input.payerPhone, input.transactionReference, user.id,
    ),
  ];
  if (request.status === "PAYMENT_PENDING") {
    statements.push(
      context.env.DB.prepare(
        "UPDATE membership_applications SET status = 'PAYMENT_VERIFICATION', updated_at = ? WHERE id = ? AND status = 'PAYMENT_PENDING'",
      ).bind(now, applicationId),
    );
  }
  statements.push(
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"), actorId: user.id, action: "MEMBERSHIP_PAYMENT_SUBMITTED",
      entityType: "MEMBERSHIP_PAYMENT", entityId: paymentId,
      reason: "Applicant submitted payment evidence for independent finance verification.",
      metadata: { applicationId, paymentMethod: input.paymentMethod },
    }),
  );
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData,
      responseData: { applicationId, paymentId, status: nextApplicationStatus }, responseStatus: 201,
      statements,
    });
    return idempotentJson(context, result);
  } catch (error) { return workflowConflict(error); }
});

workflowRoutes.get("/admin/membership/payments", requirePermission("finance.read"), async (context) => {
  const parsed = paymentStatusSchema.safeParse(context.req.query("status")?.trim() || "SUBMITTED");
  if (!parsed.success) throw new AppError({ code: "INVALID_STATUS", message: "The payment status filter is invalid.", status: 422 });
  const { results } = await context.env.DB.prepare(
    `SELECT mp.id AS paymentId, mp.application_id AS applicationId, ma.full_name AS applicantName,
            ma.email_snapshot AS applicantEmail, mp.expected_amount_minor AS expectedAmountMinor,
            mp.currency, mp.payment_method AS paymentMethod, mp.payer_phone AS payerPhone,
            mp.transaction_reference AS transactionReference,
            mp.status, mp.submitted_at AS submittedAt, mp.verified_at AS verifiedAt,
            mp.verification_reason AS verificationReason
     FROM membership_payments mp
     JOIN membership_applications ma ON ma.id = mp.application_id
     WHERE mp.status = ? ORDER BY mp.submitted_at ASC LIMIT 100`,
  ).bind(parsed.data).all();
  return context.json(success(results, context.get("requestId")));
});

async function decidePayment(context: Context<AppEnvironment>, decision: "VERIFIED" | "REJECTED"): Promise<Response> {
  const { user } = requireAuth(context);
  const input = await parseJson(context, workflowReasonSchema);
  const paymentId = routeId(context);
  const operation = `membership.payment.${decision.toLowerCase()}`;
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = { paymentId, ...input };
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson(context, replay);
  const payment = await context.env.DB.prepare(
    "SELECT id, application_id, submitted_by, status FROM membership_payments WHERE id = ?",
  ).bind(paymentId).first<PaymentRow>();
  if (!payment) throw new AppError({ code: "PAYMENT_NOT_FOUND", message: "Payment not found.", status: 404 });
  rejectSelfDecision(user.id, payment.submitted_by);
  if (payment.status !== "SUBMITTED" || !payment.application_id) {
    throw new AppError({ code: "PAYMENT_NOT_VERIFIABLE", message: "Only a submitted application payment can be decided.", status: 409 });
  }
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    context.env.DB.prepare(
      `INSERT INTO payment_verification_decisions (payment_id, decision, decided_by, reason)
       VALUES (?, ?, ?, ?)`,
    ).bind(paymentId, decision, user.id, input.reason),
    context.env.DB.prepare(
      `UPDATE membership_payments
       SET status = ?, verified_by = ?, verified_at = ?, verification_reason = ?
       WHERE id = ? AND status = 'SUBMITTED'`,
    ).bind(decision, user.id, now, input.reason, paymentId),
  ];
  if (decision === "REJECTED") {
    statements.push(
      context.env.DB.prepare(
        `UPDATE membership_applications SET status = 'PAYMENT_PENDING', updated_at = ?
         WHERE id = ? AND status = 'PAYMENT_VERIFICATION'`,
      ).bind(now, payment.application_id),
    );
  }
  statements.push(createAuditStatement(context.env.DB, {
    requestId: context.get("requestId"), actorId: user.id,
    action: decision === "VERIFIED" ? "MEMBERSHIP_PAYMENT_VERIFIED" : "MEMBERSHIP_PAYMENT_REJECTED",
    entityType: "MEMBERSHIP_PAYMENT", entityId: paymentId, reason: input.reason,
    metadata: { applicationId: payment.application_id, decision },
  }));
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData,
      responseData: { paymentId, applicationId: payment.application_id, status: decision }, responseStatus: 200,
      statements,
    });
    return idempotentJson(context, result);
  } catch (error) { return workflowConflict(error); }
}

workflowRoutes.post(
  "/admin/membership/payments/:id/verify",
  requirePermission("finance.verify"), csrfMiddleware(),
  (context) => decidePayment(context, "VERIFIED"),
);
workflowRoutes.post(
  "/admin/membership/payments/:id/reject",
  requirePermission("finance.verify"), csrfMiddleware(),
  (context) => decidePayment(context, "REJECTED"),
);

async function rejectApplication(context: Context<AppEnvironment>, domain: Domain): Promise<Response> {
  const { user } = requireAuth(context);
  const input = await parseJson(context, workflowReasonSchema);
  const applicationId = routeId(context);
  const operation = `${domain}.application.reject`;
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = { applicationId, ...input };
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson(context, replay);
  const application = domain === "membership"
    ? await membershipApplication(context.env.DB, applicationId)
    : await volunteerApplication(context.env.DB, applicationId);
  rejectSelfDecision(user.id, application.user_id);
  const eligible = domain === "membership"
    ? ["UNDER_REVIEW", "PAYMENT_PENDING", "PAYMENT_VERIFICATION"]
    : ["UNDER_REVIEW"];
  if (!eligible.includes(application.status)) {
    throw new AppError({ code: "APPLICATION_NOT_DECIDABLE", message: "The application is not eligible for rejection.", status: 409 });
  }
  const decisions = domain === "membership" ? "membership_application_decisions" : "volunteer_application_decisions";
  const applications = domain === "membership" ? "membership_applications" : "volunteer_applications";
  const action = domain === "membership" ? "MEMBERSHIP_APPLICATION_REJECTED" : "VOLUNTEER_APPLICATION_REJECTED";
  const entityType = domain === "membership" ? "MEMBERSHIP_APPLICATION" : "VOLUNTEER_APPLICATION";
  const now = new Date().toISOString();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData,
      responseData: { applicationId, status: "REJECTED" }, responseStatus: 200,
      statements: [
        context.env.DB.prepare(
          `INSERT INTO ${decisions} (application_id, decision, decided_by, reason) VALUES (?, 'REJECTED', ?, ?)`,
        ).bind(applicationId, user.id, input.reason),
        context.env.DB.prepare(
          `UPDATE ${applications}
           SET status = 'REJECTED', reviewed_by = ?, decision_at = ?, decision_reason = ?, updated_at = ?
           WHERE id = ?`,
        ).bind(user.id, now, input.reason, now, applicationId),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"), actorId: user.id, action, entityType, entityId: applicationId,
          reason: input.reason, metadata: { previousStatus: application.status, decision: "REJECTED" },
        }),
      ],
    });
    return idempotentJson(context, result);
  } catch (error) { return workflowConflict(error); }
}

workflowRoutes.post(
  "/admin/membership/applications/:id/reject",
  requirePermission("membership.reject"), csrfMiddleware(),
  (context) => rejectApplication(context, "membership"),
);
workflowRoutes.post(
  "/admin/volunteers/applications/:id/reject",
  requirePermission("volunteer.reject"), csrfMiddleware(),
  (context) => rejectApplication(context, "volunteer"),
);

workflowRoutes.post(
  "/admin/membership/applications/:id/approve",
  requirePermission("membership.approve"), csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, workflowReasonSchema);
    const applicationId = routeId(context);
    const operation = "membership.application.approve";
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { applicationId, ...input };
    const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
    if (replay) return idempotentJson(context, replay);
    const application = await membershipApplication(context.env.DB, applicationId);
    rejectSelfDecision(user.id, application.user_id);
    const eligibleStatuses = application.payment_required === 0
      ? ["UNDER_REVIEW"]
      : ["UNDER_REVIEW", "PAYMENT_VERIFICATION"];
    if (!eligibleStatuses.includes(application.status)) {
      throw new AppError({ code: "APPLICATION_NOT_APPROVABLE", message: "The application has not completed its required review and payment checks.", status: 409 });
    }
    const membershipId = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData,
        responseData: { applicationId, membershipId, status: "APPROVED" }, responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO membership_application_decisions (application_id, decision, decided_by, reason)
             VALUES (?, 'APPROVED', ?, ?)`,
          ).bind(applicationId, user.id, input.reason),
          context.env.DB.prepare(
            `INSERT INTO membership_sequence_counters (batch, next_value)
             VALUES (?, 1) ON CONFLICT(batch) DO NOTHING`,
          ).bind(application.batch),
          context.env.DB.prepare(
            `INSERT INTO memberships
              (id, application_id, user_id, membership_type_id, membership_number, batch,
               issue_date, start_date, end_date, status)
             SELECT ?, ma.id, ma.user_id, ma.membership_type_id,
                    'RUET-IOT-' || ma.batch || '-' || printf('%03d', msc.next_value), ma.batch,
                    date('now'), date('now'), date('now', '+' || mt.term_months || ' months'), 'ACTIVE'
             FROM membership_applications ma
             JOIN membership_types mt ON mt.id = ma.membership_type_id
             JOIN membership_sequence_counters msc ON msc.batch = ma.batch
             WHERE ma.id = ?`,
          ).bind(membershipId, applicationId),
          context.env.DB.prepare(
            `UPDATE membership_sequence_counters SET next_value = next_value + 1,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE batch = ?`,
          ).bind(application.batch),
          context.env.DB.prepare(
            `UPDATE membership_applications
             SET status = 'APPROVED', reviewed_by = ?, decision_at = ?, decision_reason = ?, updated_at = ?
             WHERE id = ?`,
          ).bind(user.id, now, input.reason, now, applicationId),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"), actorId: user.id, action: "MEMBERSHIP_APPLICATION_APPROVED",
            entityType: "MEMBERSHIP_APPLICATION", entityId: applicationId, reason: input.reason,
            metadata: { previousStatus: application.status, membershipId },
          }),
          identityAuditStatement({
            db: context.env.DB, requestId: context.get("requestId"), actorId: user.id,
            domain: "membership", recordId: membershipId, applicationId,
          }),
        ],
      });
      return idempotentJson(context, result);
    } catch (error) { return workflowConflict(error); }
  },
);

workflowRoutes.post(
  "/admin/volunteers/applications/:id/approve",
  requirePermission("volunteer.approve"), csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, workflowReasonSchema);
    const applicationId = routeId(context);
    const operation = "volunteer.application.approve";
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { applicationId, ...input };
    const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
    if (replay) return idempotentJson(context, replay);
    const application = await volunteerApplication(context.env.DB, applicationId);
    rejectSelfDecision(user.id, application.user_id);
    if (application.status !== "UNDER_REVIEW") {
      throw new AppError({ code: "APPLICATION_NOT_APPROVABLE", message: "The volunteer application must complete review first.", status: 409 });
    }
    const volunteerId = crypto.randomUUID();
    const now = new Date().toISOString();
    const issueYear = Number(new Date().getUTCFullYear());
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData,
        responseData: { applicationId, volunteerId, status: "APPROVED" }, responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO volunteer_application_decisions (application_id, decision, decided_by, reason)
             VALUES (?, 'APPROVED', ?, ?)`,
          ).bind(applicationId, user.id, input.reason),
          context.env.DB.prepare(
            `INSERT INTO volunteer_sequence_counters (issue_year, next_value)
             VALUES (?, 1) ON CONFLICT(issue_year) DO NOTHING`,
          ).bind(issueYear),
          context.env.DB.prepare(
            `INSERT INTO volunteers
              (id, application_id, user_id, volunteer_program_id, volunteer_number, issue_year,
               issue_date, start_date, end_date, status)
             SELECT ?, va.id, va.user_id, va.volunteer_program_id,
                    'RUET-IOT-CV-' || substr(CAST(vsc.issue_year AS TEXT), 3, 2) || '-' || printf('%03d', vsc.next_value),
                    vsc.issue_year, date('now'), date('now'), date('now', '+' || vp.term_months || ' months'), 'ACTIVE'
             FROM volunteer_applications va
             JOIN volunteer_programs vp ON vp.id = va.volunteer_program_id
             JOIN volunteer_sequence_counters vsc ON vsc.issue_year = ?
             WHERE va.id = ?`,
          ).bind(volunteerId, issueYear, applicationId),
          context.env.DB.prepare(
            `UPDATE volunteer_sequence_counters SET next_value = next_value + 1,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE issue_year = ?`,
          ).bind(issueYear),
          context.env.DB.prepare(
            `UPDATE volunteer_applications
             SET status = 'APPROVED', reviewed_by = ?, decision_at = ?, decision_reason = ?, updated_at = ?
             WHERE id = ?`,
          ).bind(user.id, now, input.reason, now, applicationId),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"), actorId: user.id, action: "VOLUNTEER_APPLICATION_APPROVED",
            entityType: "VOLUNTEER_APPLICATION", entityId: applicationId, reason: input.reason,
            metadata: { previousStatus: application.status, volunteerId },
          }),
          identityAuditStatement({
            db: context.env.DB, requestId: context.get("requestId"), actorId: user.id,
            domain: "volunteer", recordId: volunteerId, applicationId,
          }),
        ],
      });
      return idempotentJson(context, result);
    } catch (error) { return workflowConflict(error); }
  },
);
