import { Hono } from "hono";
import { z } from "zod";
import { csrfMiddleware, requireAuth, sessionMiddleware } from "../auth/session";
import { parseJson } from "../auth/validation";
import { createAuditStatement } from "../db/audit";
import { success } from "../lib/api-envelope";
import { AppError } from "../lib/app-error";
import { requireAnyPermission, requirePermission } from "../middleware/authorization";
import type { AppEnvironment } from "../types";

interface EnrollmentRow {
  id: string;
  submitted_by: string;
  data_json: string;
  created_at: string;
}

interface CertificateRequestRow {
  id: string;
  user_id: string;
  course_id: string;
  enrollment_id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  holder_name: string;
  email: string;
  course_data: string;
  enrollment_data: string;
  domain_type: "COURSE" | "EVENT";
  event_id: string | null;
  event_registration_id: string | null;
}

interface CertificateRow {
  id: string;
  certificate_number: string;
  request_id: string;
  user_id: string;
  course_id: string;
  enrollment_id: string;
  status: string;
  holder_name: string;
  course_title: string;
  completion_date: string;
  issued_at: string;
  certificate_url: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  domain_type: "COURSE" | "EVENT";
  event_id: string | null;
  event_registration_id: string | null;
}

const requestSchema = z.object({ courseId: z.string().uuid() });
const decisionSchema = z.object({ reason: z.string().trim().min(3).max(1000).optional() });
const listStatusSchema = z.enum(["ALL", "REQUESTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ISSUED"]);

function safeObject(value: string): Record<string, unknown> {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

function requestView(row: CertificateRequestRow) {
  const course = safeObject(row.course_data);
  const enrollment = safeObject(row.enrollment_data);
  const progress = enrollment.progress && typeof enrollment.progress === "object" && !Array.isArray(enrollment.progress)
    ? Object.values(enrollment.progress as Record<string, unknown>)
    : [];
  const completedLessons = progress.filter((item) => item === true).length;
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    enrollmentId: row.enrollment_id,
    student: row.holder_name,
    email: row.email,
    course: typeof course.title === "string" ? course.title : "Course",
    status: row.status,
    requestedAt: row.requested_at,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    completionDate: typeof enrollment.completion_date === "string" ? enrollment.completion_date : row.requested_at,
    completedLessons,
    progress: enrollment.completed === true ? 100 : 0,
    paymentStatus: typeof enrollment.payment_status === "string" ? enrollment.payment_status : "unknown",
    domainType: row.domain_type,
    eventId: row.event_id,
    eventRegistrationId: row.event_registration_id,
  };
}

function certificateView(row: CertificateRow) {
  return {
    id: row.id,
    certificateNumber: row.certificate_number,
    requestId: row.request_id,
    userId: row.user_id,
    courseId: row.course_id,
    enrollmentId: row.enrollment_id,
    status: row.status,
    student: row.holder_name,
    course: row.course_title,
    completionDate: row.completion_date,
    issuedAt: row.issued_at,
    certificateUrl: row.certificate_url,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
    issuingOrganization: "RUET IoT Club",
    domainType: row.domain_type,
    eventId: row.event_id,
    eventRegistrationId: row.event_registration_id,
  };
}

function publicCertificateView(row: CertificateRow) {
  return {
    id: row.id,
    certificateNumber: row.certificate_number,
    status: row.status,
    student: row.holder_name,
    course: row.course_title,
    completionDate: row.completion_date,
    issuedAt: row.issued_at,
    certificateUrl: row.certificate_url,
    issuingOrganization: "RUET IoT Club",
    domainType: row.domain_type,
  };
}

const requestSelect = `
  SELECT r.id, r.user_id, r.course_id, r.enrollment_id, r.status, r.requested_at,
         r.domain_type, r.event_id, r.event_registration_id,
         r.reviewed_at, r.rejection_reason, u.display_name AS holder_name,
         u.primary_email AS email, c.data_json AS course_data, e.data_json AS enrollment_data
  FROM certificate_requests r
  JOIN users u ON u.id = r.user_id
  JOIN website_content_items c ON c.id = r.course_id
  JOIN website_submissions e ON e.id = r.enrollment_id`;

export const certificateRoutes = new Hono<AppEnvironment>();

certificateRoutes.post(
  "/learning/certificates/requests",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, requestSchema);
    const enrollment = await context.env.DB.prepare(
      `SELECT id, submitted_by, data_json, created_at FROM website_submissions
       WHERE submission_type = 'course_registrations' AND submitted_by = ?
         AND json_extract(data_json, '$.course_id') = ? AND status != 'ARCHIVED'
       ORDER BY created_at DESC LIMIT 1`,
    ).bind(user.id, input.courseId).first<EnrollmentRow>();
    if (!enrollment) throw new AppError({ code: "ENROLLMENT_NOT_FOUND", message: "An active course enrollment is required.", status: 404 });
    const data = safeObject(enrollment.data_json);
    if (data.completed !== true) throw new AppError({ code: "CERTIFICATE_NOT_ELIGIBLE", message: "Complete every published lesson before requesting a certificate.", status: 403 });
    if (data.payment_status !== "confirmed") throw new AppError({ code: "PAYMENT_NOT_VERIFIED", message: "Payment must be verified before requesting a certificate.", status: 403 });

    const existing = await context.env.DB.prepare(
      "SELECT id, status FROM certificate_requests WHERE user_id = ? AND course_id = ?",
    ).bind(user.id, input.courseId).first<{ id: string; status: string }>();
    if (existing) return context.json(success(existing, context.get("requestId")));

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO certificate_requests
          (id, user_id, course_id, enrollment_id, status, requested_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'REQUESTED', ?, ?, ?)`,
      ).bind(id, user.id, input.courseId, enrollment.id, now, now, now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"), actorId: user.id, action: "CERTIFICATE_REQUESTED",
        entityType: "CERTIFICATE_REQUEST", entityId: id, metadata: { courseId: input.courseId, enrollmentId: enrollment.id },
      }),
    ]);
    return context.json(success({ id, status: "REQUESTED" }, context.get("requestId")), 201);
  },
);

certificateRoutes.post(
  "/learning/events/:eventId/certificate-request",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const eventId = z.string().uuid().parse(context.req.param("eventId"));
    const row = await context.env.DB.prepare(
      `SELECT r.*,e.certificate_available,e.certificate_require_registration,e.certificate_require_payment,
       e.certificate_require_attendance,e.certificate_min_attendance_percent
       FROM event_registrations r JOIN managed_events e ON e.id=r.event_id
       WHERE r.event_id=? AND r.user_id=?`,
    ).bind(eventId, user.id).first<Record<string, unknown>>();
    if (!row) throw new AppError({ code: "EVENT_REGISTRATION_NOT_FOUND", message: "An event registration is required.", status: 404 });
    if (Number(row.certificate_available) !== 1) throw new AppError({ code: "CERTIFICATE_UNAVAILABLE", message: "Certificates are not enabled for this event.", status: 409 });
    const override = row.certificate_eligible_override;
    const eligible = override === 1 || (override !== 0
      && (Number(row.certificate_require_registration) !== 1 || row.registration_status === "APPROVED")
      && (Number(row.certificate_require_payment) !== 1 || row.event_type === "FREE" || row.payment_status === "VERIFIED")
      && (Number(row.certificate_require_attendance) !== 1 || row.attendance_status === "PRESENT"));
    if (!eligible) throw new AppError({ code: "CERTIFICATE_NOT_ELIGIBLE", message: "Registration, payment, or attendance requirements are not yet satisfied.", status: 403 });
    const existing = await context.env.DB.prepare("SELECT id,status FROM certificate_requests WHERE user_id=? AND course_id=?").bind(user.id, eventId).first<{ id: string; status: string }>();
    if (existing) return context.json(success(existing, context.get("requestId")));
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO certificate_requests(id,user_id,course_id,enrollment_id,status,requested_at,created_at,updated_at,domain_type,event_id,event_registration_id)
         VALUES(?,?,?,?,'REQUESTED',?,?,?,'EVENT',?,?)`,
      ).bind(id, user.id, eventId, row.legacy_submission_id, now, now, now, eventId, row.id),
      createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "EVENT_CERTIFICATE_REQUESTED", entityType: "CERTIFICATE_REQUEST", entityId: id, metadata: { eventId, eventRegistrationId: row.id } }),
    ]);
    return context.json(success({ id, status: "REQUESTED", domainType: "EVENT" }, context.get("requestId")), 201);
  },
);

certificateRoutes.get("/learning/certificates/me", sessionMiddleware({ required: true }), async (context) => {
  const { user } = requireAuth(context);
  const requests = await context.env.DB.prepare(`${requestSelect} WHERE r.user_id = ? ORDER BY r.requested_at DESC`)
    .bind(user.id).all<CertificateRequestRow>();
  const certificates = await context.env.DB.prepare(
    "SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC",
  ).bind(user.id).all<CertificateRow>();
  return context.json(success({ requests: requests.results.map(requestView), certificates: certificates.results.map(certificateView) }, context.get("requestId")));
});

certificateRoutes.get("/certificates/:identifier", async (context) => {
  const identifier = z.string().trim().min(3).max(100).parse(context.req.param("identifier"));
  const row = await context.env.DB.prepare(
    "SELECT * FROM certificates WHERE id = ? OR certificate_number = ? LIMIT 1",
  ).bind(identifier, identifier.toUpperCase()).first<CertificateRow>();
  if (!row) throw new AppError({ code: "CERTIFICATE_NOT_FOUND", message: "The certificate was not found.", status: 404 });
  return context.json(success(publicCertificateView(row), context.get("requestId")));
});

certificateRoutes.get(
  "/admin/certificates",
  sessionMiddleware({ required: true }),
  requirePermission("certificate.read"),
  async (context) => {
    const status = listStatusSchema.catch("ALL").parse((context.req.query("status") || "ALL").toUpperCase());
    const search = (context.req.query("search") || "").trim().toLowerCase();
    const rows = await context.env.DB.prepare(`${requestSelect} ${status === "ALL" ? "" : "WHERE r.status = ?"} ORDER BY r.requested_at DESC LIMIT 500`)
      .bind(...(status === "ALL" ? [] : [status])).all<CertificateRequestRow>();
    let items = rows.results.map(requestView);
    if (search) items = items.filter((item) => `${item.student} ${item.email} ${item.course} ${item.id}`.toLowerCase().includes(search));
    const issued = await context.env.DB.prepare("SELECT * FROM certificates ORDER BY issued_at DESC LIMIT 500").all<CertificateRow>();
    return context.json(success({ requests: items, certificates: issued.results.map(certificateView) }, context.get("requestId")));
  },
);

certificateRoutes.post(
  "/admin/certificates/:requestId/approve",
  sessionMiddleware({ required: true }), csrfMiddleware(), requirePermission("certificate.issue"),
  async (context) => {
    const { user } = requireAuth(context);
    const requestId = z.string().uuid().parse(context.req.param("requestId"));
    const request = await context.env.DB.prepare(`${requestSelect} WHERE r.id = ?`).bind(requestId).first<CertificateRequestRow>();
    if (!request) throw new AppError({ code: "CERTIFICATE_REQUEST_NOT_FOUND", message: "The certificate request was not found.", status: 404 });
    if (request.status === "ISSUED") {
      const current = await context.env.DB.prepare("SELECT * FROM certificates WHERE request_id = ?").bind(requestId).first<CertificateRow>();
      return context.json(success(current ? certificateView(current) : { status: "ISSUED" }, context.get("requestId")));
    }
    if (!["REQUESTED", "UNDER_REVIEW", "APPROVED"].includes(request.status)) {
      throw new AppError({ code: "INVALID_CERTIFICATE_STATE", message: "Only active certificate requests can be approved.", status: 409 });
    }
    const enrollment = safeObject(request.enrollment_data);
    if (request.domain_type === "EVENT") {
      const eventRegistration = await context.env.DB.prepare(
        `SELECT r.*,e.certificate_available,e.certificate_require_registration,e.certificate_require_payment,e.certificate_require_attendance
         FROM event_registrations r JOIN managed_events e ON e.id=r.event_id WHERE r.id=? AND r.event_id=?`,
      ).bind(request.event_registration_id, request.event_id).first<Record<string, unknown>>();
      const override = eventRegistration?.certificate_eligible_override;
      const eligible = eventRegistration && Number(eventRegistration.certificate_available) === 1 && (override === 1 || (override !== 0
        && (Number(eventRegistration.certificate_require_registration) !== 1 || eventRegistration.registration_status === "APPROVED")
        && (Number(eventRegistration.certificate_require_payment) !== 1 || eventRegistration.event_type === "FREE" || eventRegistration.payment_status === "VERIFIED")
        && (Number(eventRegistration.certificate_require_attendance) !== 1 || eventRegistration.attendance_status === "PRESENT")));
      if (!eligible) throw new AppError({ code: "CERTIFICATE_NOT_ELIGIBLE", message: "The event registration is no longer eligible for certificate issuance.", status: 409 });
    } else if (enrollment.completed !== true || enrollment.payment_status !== "confirmed") {
      throw new AppError({ code: "CERTIFICATE_NOT_ELIGIBLE", message: "The enrollment is no longer eligible for certificate issuance.", status: 409 });
    }
    const course = safeObject(request.course_data);
    const year = new Date().getUTCFullYear();
    await context.env.DB.prepare("INSERT INTO certificate_sequences (year, next_value) VALUES (?, 1) ON CONFLICT(year) DO NOTHING").bind(year).run();
    const sequence = await context.env.DB.prepare(
      "UPDATE certificate_sequences SET next_value = next_value + 1 WHERE year = ? RETURNING next_value - 1 AS value",
    ).bind(year).first<number>("value");
    if (!sequence) throw new AppError({ code: "CERTIFICATE_SEQUENCE_FAILED", message: "A certificate number could not be allocated.", status: 500 });
    const certificateId = crypto.randomUUID();
    const number = `RIOT-${year}-${String(sequence).padStart(6, "0")}`;
    const now = new Date().toISOString();
    const completionDate = typeof enrollment.completion_date === "string" ? enrollment.completion_date : now;
    const courseTitle = typeof course.title === "string" ? course.title : request.domain_type === "EVENT" ? "RUET IoT Club Event" : "RUET IoT Club Course";
    const certificateUrl = `/certificate/${certificateId}`;
    const legacyData = { user_id: request.user_id, course_id: request.course_id, certificate_number: number, issued_at: now, completion_date: completionDate, status: "issued" };
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO certificates
          (id, certificate_number, request_id, user_id, course_id, enrollment_id, holder_name, course_title,
           completion_date, issued_at, issued_by, certificate_url, domain_type, event_id, event_registration_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(certificateId, number, request.id, request.user_id, request.course_id, request.enrollment_id, request.holder_name, courseTitle, completionDate, now, user.id, certificateUrl, request.domain_type, request.event_id, request.event_registration_id),
      context.env.DB.prepare(
        "UPDATE certificate_requests SET status = 'ISSUED', reviewed_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?",
      ).bind(now, user.id, now, request.id),
      context.env.DB.prepare(
        "INSERT INTO website_submissions (id, submission_type, submitted_by, data_json, status, created_at, updated_at) VALUES (?, 'certificates', ?, ?, 'APPROVED', ?, ?)",
      ).bind(certificateId, request.user_id, JSON.stringify(legacyData), now, now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"), actorId: user.id, action: "CERTIFICATE_APPROVED_AND_ISSUED",
        entityType: "CERTIFICATE", entityId: certificateId, metadata: { requestId: request.id, certificateNumber: number },
      }),
    ]);
    return context.json(success(certificateView({
      id: certificateId, certificate_number: number, request_id: request.id, user_id: request.user_id,
      course_id: request.course_id, enrollment_id: request.enrollment_id, status: "ISSUED",
      holder_name: request.holder_name, course_title: courseTitle, completion_date: completionDate,
      issued_at: now, certificate_url: certificateUrl, revoked_at: null, revocation_reason: null,
      domain_type: request.domain_type, event_id: request.event_id, event_registration_id: request.event_registration_id,
    }), context.get("requestId")), 201);
  },
);

certificateRoutes.post(
  "/admin/certificates/:requestId/reject",
  sessionMiddleware({ required: true }), csrfMiddleware(), requirePermission("certificate.issue"),
  async (context) => {
    const { user } = requireAuth(context);
    const requestId = z.string().uuid().parse(context.req.param("requestId"));
    const input = await parseJson(context, decisionSchema.extend({ reason: z.string().trim().min(3).max(1000) }));
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      `UPDATE certificate_requests SET status = 'REJECTED', rejection_reason = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
       WHERE id = ? AND status IN ('REQUESTED', 'UNDER_REVIEW') RETURNING id`,
    ).bind(input.reason, now, user.id, now, requestId).first("id");
    if (!result) throw new AppError({ code: "INVALID_CERTIFICATE_STATE", message: "The request cannot be rejected in its current state.", status: 409 });
    await createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "CERTIFICATE_REJECTED", entityType: "CERTIFICATE_REQUEST", entityId: requestId, reason: input.reason }).run();
    return context.json(success({ id: requestId, status: "REJECTED" }, context.get("requestId")));
  },
);

certificateRoutes.post(
  "/admin/certificates/:certificateId/revoke",
  sessionMiddleware({ required: true }), csrfMiddleware(), requireAnyPermission(["certificate.revoke", "certificate.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const certificateId = z.string().uuid().parse(context.req.param("certificateId"));
    const input = await parseJson(context, decisionSchema.extend({ reason: z.string().trim().min(3).max(1000) }));
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      `UPDATE certificates SET status = 'REVOKED', revoked_at = ?, revoked_by = ?, revocation_reason = ?
       WHERE id = ? AND status = 'ISSUED' RETURNING certificate_number`,
    ).bind(now, user.id, input.reason, certificateId).first<string>("certificate_number");
    if (!result) throw new AppError({ code: "INVALID_CERTIFICATE_STATE", message: "Only an issued certificate can be revoked.", status: 409 });
    await context.env.DB.batch([
      context.env.DB.prepare("UPDATE website_submissions SET data_json = json_set(data_json, '$.status', 'revoked', '$.revoked_at', ?, '$.revocation_reason', ?), updated_at = ? WHERE id = ?").bind(now, input.reason, now, certificateId),
      createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "CERTIFICATE_REVOKED", entityType: "CERTIFICATE", entityId: certificateId, reason: input.reason, metadata: { certificateNumber: result } }),
    ]);
    return context.json(success({ id: certificateId, status: "REVOKED" }, context.get("requestId")));
  },
);
