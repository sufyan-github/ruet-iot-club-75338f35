import { Hono, type Context } from "hono";
import {
  createOpaqueToken,
  sha256,
  timingSafeEqualStrings,
} from "../auth/crypto";
import { clientIp, enforceRateLimit } from "../auth/rate-limit";
import { requireAuth, sessionMiddleware } from "../auth/session";
import { normalizeEmail, parseJson } from "../auth/validation";
import { createAuditStatement } from "../db/audit";
import { success } from "../lib/api-envelope";
import { AppError } from "../lib/app-error";
import {
  authoritySubmissionEmail,
  createEmailQueueRecord,
  insertEmailStatement,
  submissionReceiptEmail,
  submissionStatusEmail,
  submissionVerificationEmail,
} from "../services/email";
import { enforceTurnstile } from "../services/turnstile";
import type { AppEnvironment } from "../types";
import {
  alumniSubmissionSchema,
  collaborationSubmissionSchema,
  adminSubmissionQuerySchema,
  adminSubmissionUpdateSchema,
  contactSubmissionSchema,
  projectSubmissionSchema,
  researchSubmissionSchema,
  submissionTrackingSchema,
  submissionVerificationSchema,
  type AlumniSubmission,
  type CollaborationSubmission,
  type ContactSubmission,
  type ProjectSubmission,
  type ResearchSubmission,
} from "../validators/submissions";

type SubmissionType =
  | "CONTACT"
  | "PROJECT"
  | "RESEARCH"
  | "COLLABORATION"
  | "ALUMNI";
type SubmissionStatus =
  | "EMAIL_VERIFICATION"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEEDS_INFORMATION"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "ONGOING"
  | "COMPLETED"
  | "HIDDEN"
  | "ARCHIVED";

function allowedAdminSubmissionTypes(
  permissions: string[],
  manage = false,
): SubmissionType[] {
  if (permissions.includes(manage ? "submissions.manage" : "submissions.read"))
    return ["CONTACT", "PROJECT", "RESEARCH", "COLLABORATION", "ALUMNI"];
  const allowed: SubmissionType[] = [];
  const has = (...keys: string[]) =>
    keys.some((key) => permissions.includes(key));
  if (
    has(
      ...(manage
        ? ["project.review", "project.manage"]
        : ["project.read", "project.review", "project.manage"]),
    )
  )
    allowed.push("PROJECT");
  if (
    has(
      ...(manage
        ? ["research.review", "research.approve", "research.manage"]
        : ["research.read", "research.review", "research.manage"]),
    )
  )
    allowed.push("RESEARCH");
  if (has(manage ? "people.manage" : "people.read")) allowed.push("ALUMNI");
  if (has(manage ? "partner.manage" : "partner.read"))
    allowed.push("COLLABORATION");
  if (has(manage ? "content.manage" : "content.read")) allowed.push("CONTACT");
  return allowed;
}

function assertSubmissionAdminAccess(
  context: Context<AppEnvironment>,
  type: SubmissionType,
  manage = false,
): void {
  const { user } = requireAuth(context);
  if (!allowedAdminSubmissionTypes(user.permissions, manage).includes(type)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this submission type.",
      status: 403,
    });
  }
}

interface SubmissionRow {
  id: string;
  reference_code: string;
  submission_type: SubmissionType;
  user_id: string | null;
  submitter_name: string;
  submitter_email: string;
  submitter_email_normalized: string;
  submitter_phone: string | null;
  institution: string | null;
  department: string | null;
  title: string;
  summary: string;
  payload_json: string;
  tracking_token_hash: string;
  status: SubmissionStatus;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assigned_reviewer_id: string | null;
  public_response: string | null;
  internal_notes: string | null;
  email_verified_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CanonicalSubmission {
  type: SubmissionType;
  submitter: {
    name: string;
    email: string;
    phone?: string | null;
    institution?: string | null;
    department?: string | null;
  };
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  turnstileToken: string;
}

const transitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  EMAIL_VERIFICATION: [],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  UNDER_REVIEW: [
    "NEEDS_INFORMATION",
    "REVISION_REQUESTED",
    "APPROVED",
    "REJECTED",
    "ARCHIVED",
  ],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  REVISION_REQUESTED: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  APPROVED: ["PUBLISHED", "ONGOING", "COMPLETED", "HIDDEN", "ARCHIVED"],
  REJECTED: ["UNDER_REVIEW", "ARCHIVED"],
  PUBLISHED: ["ONGOING", "COMPLETED", "HIDDEN", "ARCHIVED"],
  ONGOING: ["COMPLETED", "HIDDEN", "ARCHIVED"],
  COMPLETED: ["PUBLISHED", "HIDDEN", "ARCHIVED"],
  HIDDEN: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: [],
};

const attachmentMimeTypes: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf", "application/octet-stream"]),
  doc: new Set(["application/msword", "application/octet-stream"]),
  docx: new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ]),
  ppt: new Set(["application/vnd.ms-powerpoint", "application/octet-stream"]),
  pptx: new Set([
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/octet-stream",
  ]),
  zip: new Set([
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ]),
  jpg: new Set(["image/jpeg"]),
  jpeg: new Set(["image/jpeg"]),
  png: new Set(["image/png"]),
  webp: new Set(["image/webp"]),
};

function allowedOrigin(context: Context<AppEnvironment>): void {
  const origin = context.req.header("Origin");
  const site = new URL(context.env.SITE_URL);
  const frontend = new URL(context.env.FRONTEND_ORIGIN);
  const allowed = new Set([site.origin, frontend.origin]);
  if (site.protocol === "https:" && !site.hostname.startsWith("www."))
    allowed.add(`${site.protocol}//www.${site.host}`);
  if (!origin || !allowed.has(origin)) {
    throw new AppError({
      code: "INVALID_ORIGIN",
      message: "The request origin is not allowed.",
      status: 403,
    });
  }
}

async function validateSessionCsrf(
  context: Context<AppEnvironment>,
): Promise<void> {
  const session = context.get("authSession");
  const token = context.req.header("X-CSRF-Token")?.trim();
  if (
    !session ||
    !token ||
    !(await timingSafeEqualStrings(await sha256(token), session.csrfTokenHash))
  ) {
    throw new AppError({
      code: "CSRF_VALIDATION_FAILED",
      message: "The request could not be validated.",
      status: 403,
    });
  }
}

function referenceCode(type: SubmissionType): string {
  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `RUIT-${type.slice(0, 4)}-${day}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function publicProjection(row: SubmissionRow) {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    type: row.submission_type,
    title: row.title,
    summary: row.summary,
    status: row.status,
    publicResponse: row.public_response,
    emailVerifiedAt: row.email_verified_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function adminProjection(row: SubmissionRow) {
  return {
    ...publicProjection(row),
    userId: row.user_id,
    submitter: {
      name: row.submitter_name,
      email: row.submitter_email,
      phone: row.submitter_phone,
      institution: row.institution,
      department: row.department,
    },
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    priority: row.priority,
    assignedReviewerId: row.assigned_reviewer_id,
    internalNotes: row.internal_notes,
  };
}

function notificationStatement(
  db: D1Database,
  options: {
    userId: string;
    type: string;
    title: string;
    message: string;
    actionUrl: string;
    entityId: string;
  },
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO user_notifications
      (id, user_id, notification_type, title, message, action_url, related_entity_type, related_entity_id)
     VALUES (?, ?, ?, ?, ?, ?, 'SUBMISSION', ?)`,
    )
    .bind(
      crypto.randomUUID(),
      options.userId,
      options.type,
      options.title,
      options.message,
      options.actionUrl,
      options.entityId,
    );
}

async function adminNotificationStatements(
  db: D1Database,
  submission: {
    id: string;
    type: SubmissionType;
    referenceCode: string;
    title: string;
  },
): Promise<D1PreparedStatement[]> {
  const admins = await db
    .prepare(
      `SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
     WHERE r.role_key IN ('SUPER_ADMIN', 'ADMIN') AND ur.revoked_at IS NULL
       AND (ur.expires_at IS NULL OR ur.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       AND u.status = 'EMAIL_VERIFIED' AND u.deleted_at IS NULL`,
    )
    .all<{ id: string }>();
  return admins.results.map((admin) =>
    notificationStatement(db, {
      userId: admin.id,
      type: "SUBMISSION_RECEIVED",
      title: `New ${submission.type.toLowerCase()} submission`,
      message: `${submission.referenceCode}: ${submission.title}`,
      actionUrl: `/admin?submission=${encodeURIComponent(submission.id)}`,
      entityId: submission.id,
    }),
  );
}

function authorityRecipients(env: Env, type: SubmissionType): string[] {
  const primary =
    type === "CONTACT"
      ? env.CONTACT_AUTHORITY_EMAIL
      : type === "PROJECT"
        ? env.PROJECT_EMAIL
        : type === "RESEARCH"
          ? env.RESEARCH_EMAIL
          : type === "COLLABORATION"
            ? env.COLLABORATION_EMAIL
            : env.SUPER_ADMIN_EMAIL;
  return [
    ...new Set(
      type === "CONTACT" ? [primary] : [primary, env.SUPER_ADMIN_EMAIL],
    ),
  ].filter(Boolean);
}

async function authorityEmailStatements(
  env: Env,
  submission: SubmissionRow,
): Promise<D1PreparedStatement[]> {
  const payload = authoritySubmissionEmail({
    siteUrl: env.SITE_URL,
    submissionId: submission.id,
    submissionType: submission.submission_type,
    referenceCode: submission.reference_code,
    submitterName: submission.submitter_name,
    submitterEmail: submission.submitter_email,
    title: submission.title,
    summary:
      submission.submission_type === "CONTACT"
        ? String(
            (JSON.parse(submission.payload_json) as Record<string, unknown>)
              .message ?? submission.summary,
          )
        : submission.summary,
    submittedAt: submission.submitted_at ?? submission.created_at,
  });
  return Promise.all(
    authorityRecipients(env, submission.submission_type).map(
      async (recipient) =>
        insertEmailStatement(
          env.DB,
          await createEmailQueueRecord({
            secret: env.SESSION_SECRET,
            userId: null,
            template:
              submission.submission_type === "CONTACT"
                ? "CONTACT_AUTHORITY"
                : "SUBMISSION_AUTHORITY",
            recipientEmail: recipient,
            payload,
          }),
        ),
    ),
  );
}

function canonicalContact(input: ContactSubmission): CanonicalSubmission {
  return {
    type: "CONTACT",
    submitter: input.submitter,
    title: input.subject,
    summary: input.message.slice(0, 2000),
    payload: {
      subject: input.subject,
      message: input.message,
      source: "contact-page",
    },
    turnstileToken: input.turnstileToken,
  };
}

function canonicalProject(input: ProjectSubmission): CanonicalSubmission {
  const {
    submitter,
    turnstileToken,
    website: _website,
    title,
    summary,
    ...payload
  } = input;
  return {
    type: "PROJECT",
    submitter,
    title,
    summary,
    payload,
    turnstileToken,
  };
}

function canonicalResearch(input: ResearchSubmission): CanonicalSubmission {
  const {
    submitter,
    turnstileToken,
    website: _website,
    title,
    abstract,
    ...payload
  } = input;
  return {
    type: "RESEARCH",
    submitter,
    title,
    summary: abstract.slice(0, 2000),
    payload: { abstract, ...payload },
    turnstileToken,
  };
}

function canonicalAlumni(input: AlumniSubmission): CanonicalSubmission {
  const {
    submitter,
    turnstileToken,
    website: _honeypot,
    batch,
    graduationYear,
    professional,
    clubJourney,
    ...payload
  } = input;
  return {
    type: "ALUMNI",
    submitter,
    title: `${submitter.name} — Alumni application`,
    summary:
      `${submitter.department ?? "RUET"}, batch ${batch}, graduation ${graduationYear}. ${clubJourney.majorContributions}`.slice(
        0,
        2000,
      ),
    payload: { batch, graduationYear, professional, clubJourney, ...payload },
    turnstileToken,
  };
}

function canonicalCollaboration(
  input: CollaborationSubmission,
): CanonicalSubmission {
  const {
    submitter,
    turnstileToken,
    website: _honeypot,
    proposalTitle,
    description,
    ...payload
  } = input;
  return {
    type: "COLLABORATION",
    submitter,
    title: proposalTitle,
    summary: description.slice(0, 2000),
    payload: { description, ...payload },
    turnstileToken,
  };
}

async function createSubmission(
  context: Context<AppEnvironment>,
  input: CanonicalSubmission,
) {
  allowedOrigin(context);
  await enforceTurnstile({
    env: context.env,
    request: context.req.raw,
    token: input.turnstileToken,
    action: "submission",
  });
  const user = context.get("authUser");
  if (user) await validateSessionCsrf(context);
  const email = user?.email ?? input.submitter.email;
  await enforceRateLimit({
    db: context.env.DB,
    scope: `submission:${input.type.toLowerCase()}`,
    identifier: `${clientIp(context.req.raw)}:${normalizeEmail(email)}`,
    limit: input.type === "CONTACT" ? 5 : 3,
    windowSeconds: 3600,
  });

  const id = crypto.randomUUID();
  const reference = referenceCode(input.type);
  const trackingToken = createOpaqueToken();
  const verificationToken =
    user || input.type === "CONTACT" ? null : createOpaqueToken();
  const now = new Date().toISOString();
  const status: SubmissionStatus = verificationToken
    ? "EMAIL_VERIFICATION"
    : "SUBMITTED";
  const submitterName = user?.displayName ?? input.submitter.name;
  const normalized = normalizeEmail(email);
  const row: SubmissionRow = {
    id,
    reference_code: reference,
    submission_type: input.type,
    user_id: user?.id ?? null,
    submitter_name: submitterName,
    submitter_email: email,
    submitter_email_normalized: normalized,
    submitter_phone: input.submitter.phone ?? null,
    institution: input.submitter.institution ?? null,
    department: input.submitter.department ?? null,
    title: input.title,
    summary: input.summary,
    payload_json: JSON.stringify(input.payload),
    tracking_token_hash: await sha256(trackingToken),
    status,
    priority: "NORMAL",
    assigned_reviewer_id: null,
    public_response: null,
    internal_notes: null,
    email_verified_at: user || input.type === "CONTACT" ? now : null,
    submitted_at: status === "SUBMITTED" ? now : null,
    created_at: now,
    updated_at: now,
  };

  const receipt = await createEmailQueueRecord({
    secret: context.env.SESSION_SECRET,
    userId: user?.id ?? null,
    template:
      input.type === "CONTACT" ? "CONTACT_RECEIVED" : "SUBMISSION_RECEIVED",
    recipientEmail: email,
    payload: submissionReceiptEmail({
      siteUrl: context.env.SITE_URL,
      submitterName,
      submissionType: input.type,
      referenceCode: reference,
      title: input.title,
      trackingToken,
      verificationRequired: Boolean(verificationToken),
    }),
  });

  const statements: D1PreparedStatement[] = [
    context.env.DB.prepare(
      `INSERT INTO platform_submissions
        (id, reference_code, submission_type, user_id, submitter_name, submitter_email,
         submitter_email_normalized, submitter_phone, institution, department, title, summary,
         payload_json, tracking_token_hash, status, email_verified_at, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      reference,
      input.type,
      user?.id ?? null,
      submitterName,
      email,
      normalized,
      input.submitter.phone ?? null,
      input.submitter.institution ?? null,
      input.submitter.department ?? null,
      input.title,
      input.summary,
      row.payload_json,
      row.tracking_token_hash,
      status,
      row.email_verified_at,
      row.submitted_at,
    ),
    context.env.DB.prepare(
      `INSERT INTO submission_events
        (id, submission_id, actor_user_id, actor_type, event_type, to_status, public_message, request_id)
       VALUES (?, ?, ?, ?, 'SUBMISSION_CREATED', ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      id,
      user?.id ?? null,
      user ? "USER" : "GUEST",
      status,
      verificationToken
        ? "Email verification is required before review."
        : "Submission received for review.",
      context.get("requestId"),
    ),
    insertEmailStatement(context.env.DB, receipt),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user?.id,
      action: "PUBLIC_SUBMISSION_CREATED",
      entityType: "SUBMISSION",
      entityId: id,
      metadata: { type: input.type, referenceCode: reference, guest: !user },
    }),
  ];

  if (verificationToken) {
    const verificationEmail = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: null,
      template: "SUBMISSION_VERIFY",
      recipientEmail: email,
      payload: submissionVerificationEmail({
        siteUrl: context.env.SITE_URL,
        submitterName,
        submissionType: input.type,
        referenceCode: reference,
        token: verificationToken,
      }),
    });
    statements.push(
      context.env.DB.prepare(
        `INSERT INTO submission_verification_tokens (id, submission_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        id,
        await sha256(verificationToken),
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ),
      insertEmailStatement(context.env.DB, verificationEmail),
    );
  } else {
    statements.push(...(await authorityEmailStatements(context.env, row)));
    statements.push(
      ...(await adminNotificationStatements(context.env.DB, {
        id,
        type: input.type,
        referenceCode: reference,
        title: input.title,
      })),
    );
  }
  if (user) {
    statements.push(
      notificationStatement(context.env.DB, {
        userId: user.id,
        type: "SUBMISSION_RECEIVED",
        title: `${input.type.toLowerCase()} submission received`,
        message: `${reference}: ${input.title}`,
        actionUrl: "/dashboard",
        entityId: id,
      }),
    );
  }

  await context.env.DB.batch(statements);
  return {
    id,
    referenceCode: reference,
    status,
    trackingToken,
    verificationRequired: Boolean(verificationToken),
    message: verificationToken
      ? "Submission saved. Verify your email before review begins."
      : "Submission received successfully.",
  };
}

async function submissionAccess(
  context: Context<AppEnvironment>,
  submission: SubmissionRow,
): Promise<"OWNER" | "ADMIN" | "GUEST"> {
  const user = context.get("authUser");
  if (user?.id === submission.user_id) return "OWNER";
  if (
    user &&
    !user.mustChangePassword &&
    allowedAdminSubmissionTypes(user.permissions).includes(
      submission.submission_type,
    )
  )
    return "ADMIN";
  const token =
    context.req.header("X-Submission-Token") ??
    context.req.query("token") ??
    "";
  if (
    token &&
    (await timingSafeEqualStrings(
      await sha256(token),
      submission.tracking_token_hash,
    ))
  )
    return "GUEST";
  throw new AppError({
    code: "SUBMISSION_ACCESS_DENIED",
    message: "The submission reference or access token is invalid.",
    status: 403,
  });
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validMagic(extension: string, bytes: Uint8Array): boolean {
  const pdf =
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;
  const zip =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    [0x03, 0x05, 0x07].includes(bytes[2]!);
  const ole =
    bytes.length >= 8 &&
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every(
      (value, index) => bytes[index] === value,
    );
  const jpg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const png =
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  const webp =
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (extension === "pdf") return pdf;
  if (["jpg", "jpeg"].includes(extension)) return jpg;
  if (extension === "png") return png;
  if (extension === "webp") return webp;
  if (["docx", "pptx", "zip"].includes(extension)) return zip;
  return ["doc", "ppt"].includes(extension) && ole;
}

export const submissionRoutes = new Hono<AppEnvironment>();

submissionRoutes.post(
  "/submissions/contact",
  sessionMiddleware({ required: false }),
  async (context) => {
    const result = await createSubmission(
      context,
      canonicalContact(await parseJson(context, contactSubmissionSchema)),
    );
    return context.json(success(result, context.get("requestId")), 201);
  },
);

submissionRoutes.post(
  "/submissions/projects",
  sessionMiddleware({ required: false }),
  async (context) => {
    const result = await createSubmission(
      context,
      canonicalProject(await parseJson(context, projectSubmissionSchema)),
    );
    return context.json(success(result, context.get("requestId")), 201);
  },
);

submissionRoutes.post(
  "/submissions/research",
  sessionMiddleware({ required: false }),
  async (context) => {
    const result = await createSubmission(
      context,
      canonicalResearch(await parseJson(context, researchSubmissionSchema)),
    );
    return context.json(success(result, context.get("requestId")), 201);
  },
);

submissionRoutes.post(
  "/submissions/alumni",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const existing = await context.env.DB.prepare(
      `SELECT id FROM platform_submissions WHERE user_id = ? AND submission_type = 'ALUMNI'
     AND status NOT IN ('REJECTED', 'ARCHIVED') LIMIT 1`,
    )
      .bind(user.id)
      .first("id");
    if (existing)
      throw new AppError({
        code: "ALUMNI_APPLICATION_EXISTS",
        message: "This account already has an active alumni application.",
        status: 409,
      });
    const result = await createSubmission(
      context,
      canonicalAlumni(await parseJson(context, alumniSubmissionSchema)),
    );
    return context.json(success(result, context.get("requestId")), 201);
  },
);

submissionRoutes.post(
  "/submissions/collaboration",
  sessionMiddleware({ required: false }),
  async (context) => {
    const result = await createSubmission(
      context,
      canonicalCollaboration(
        await parseJson(context, collaborationSubmissionSchema),
      ),
    );
    return context.json(success(result, context.get("requestId")), 201);
  },
);

submissionRoutes.post("/submissions/verify", async (context) => {
  const input = await parseJson(context, submissionVerificationSchema);
  await enforceRateLimit({
    db: context.env.DB,
    scope: "submission-verification",
    identifier: clientIp(context.req.raw),
    limit: 10,
    windowSeconds: 3600,
  });
  const tokenHash = await sha256(input.token);
  const row = await context.env.DB.prepare(
    `SELECT s.* FROM submission_verification_tokens t JOIN platform_submissions s ON s.id = t.submission_id
     WHERE t.token_hash = ? AND t.consumed_at IS NULL AND t.expires_at > ? AND s.status = 'EMAIL_VERIFICATION'`,
  )
    .bind(tokenHash, new Date().toISOString())
    .first<SubmissionRow>();
  if (!row)
    throw new AppError({
      code: "INVALID_OR_EXPIRED_TOKEN",
      message: "This submission verification link is invalid or expired.",
      status: 400,
    });
  const now = new Date().toISOString();
  const updated = {
    ...row,
    status: "SUBMITTED" as const,
    email_verified_at: now,
    submitted_at: now,
  };
  const statements: D1PreparedStatement[] = [
    context.env.DB.prepare(
      `UPDATE platform_submissions SET status = 'SUBMITTED', email_verified_at = ?, submitted_at = ?,
         last_status_at = ?, updated_at = ? WHERE id = ? AND status = 'EMAIL_VERIFICATION'`,
    ).bind(now, now, now, now, row.id),
    context.env.DB.prepare(
      "UPDATE submission_verification_tokens SET consumed_at = ? WHERE token_hash = ?",
    ).bind(now, tokenHash),
    context.env.DB.prepare(
      `INSERT INTO submission_events
        (id, submission_id, actor_type, event_type, from_status, to_status, public_message, request_id)
       VALUES (?, ?, 'GUEST', 'EMAIL_VERIFIED', 'EMAIL_VERIFICATION', 'SUBMITTED', 'Email verified; submission entered the review queue.', ?)`,
    ).bind(crypto.randomUUID(), row.id, context.get("requestId")),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      action: "SUBMISSION_EMAIL_VERIFIED",
      entityType: "SUBMISSION",
      entityId: row.id,
      metadata: {
        type: row.submission_type,
        referenceCode: row.reference_code,
      },
    }),
    ...(await authorityEmailStatements(context.env, updated)),
    ...(await adminNotificationStatements(context.env.DB, {
      id: row.id,
      type: row.submission_type,
      referenceCode: row.reference_code,
      title: row.title,
    })),
  ];
  await context.env.DB.batch(statements);
  return context.json(
    success(
      {
        verified: true,
        referenceCode: row.reference_code,
        status: "SUBMITTED",
      },
      context.get("requestId"),
    ),
  );
});

submissionRoutes.get("/submissions/track", async (context) => {
  const parsed = submissionTrackingSchema.safeParse({
    reference: context.req.query("reference"),
    token: context.req.query("token"),
  });
  if (!parsed.success)
    throw new AppError({
      code: "INVALID_TRACKING_REQUEST",
      message: "Enter a valid reference and tracking token.",
      status: 422,
    });
  await enforceRateLimit({
    db: context.env.DB,
    scope: "submission-tracking",
    identifier: `${clientIp(context.req.raw)}:${parsed.data.reference}`,
    limit: 20,
    windowSeconds: 3600,
  });
  const row = await context.env.DB.prepare(
    "SELECT * FROM platform_submissions WHERE reference_code = ? AND tracking_token_hash = ?",
  )
    .bind(parsed.data.reference, await sha256(parsed.data.token))
    .first<SubmissionRow>();
  if (!row)
    throw new AppError({
      code: "SUBMISSION_NOT_FOUND",
      message: "The submission reference or tracking token is invalid.",
      status: 404,
    });
  const [events, attachments] = await Promise.all([
    context.env.DB.prepare(
      `SELECT event_type AS eventType, from_status AS fromStatus, to_status AS toStatus,
              public_message AS publicMessage, created_at AS createdAt
       FROM submission_events WHERE submission_id = ? ORDER BY created_at ASC`,
    )
      .bind(row.id)
      .all<Record<string, unknown>>(),
    context.env.DB.prepare(
      `SELECT id, original_name AS originalName, content_type AS contentType, byte_size AS byteSize, created_at AS createdAt
       FROM submission_attachments WHERE submission_id = ? AND archived_at IS NULL ORDER BY created_at ASC`,
    )
      .bind(row.id)
      .all<Record<string, unknown>>(),
  ]);
  return context.json(
    success(
      {
        ...publicProjection(row),
        events: events.results,
        attachments: attachments.results,
      },
      context.get("requestId"),
    ),
  );
});

submissionRoutes.get(
  "/submissions/mine",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const result = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE user_id = ? AND status != 'ARCHIVED' ORDER BY updated_at DESC LIMIT 100",
    )
      .bind(user.id)
      .all<SubmissionRow>();
    return context.json(
      success(result.results.map(publicProjection), context.get("requestId")),
    );
  },
);

submissionRoutes.get("/alumni", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT id, submitter_name, submitter_email, department, payload_json, updated_at
     FROM platform_submissions
     WHERE submission_type = 'ALUMNI' AND status = 'PUBLISHED' AND archived_at IS NULL
     ORDER BY updated_at DESC LIMIT 200`,
  ).all<{
    id: string;
    submitter_name: string;
    submitter_email: string;
    department: string | null;
    payload_json: string;
    updated_at: string;
  }>();
  return context.json(
    success(
      result.results.flatMap((row) => {
        const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
        if (payload.publicDisplayConsent !== true) return [];
        const professional = (payload.professional ?? {}) as Record<
          string,
          unknown
        >;
        return [
          {
            id: row.id,
            name: row.submitter_name,
            department: row.department,
            batch: payload.batch ?? null,
            graduationYear: payload.graduationYear ?? null,
            formerClubPosition: payload.formerClubPosition ?? null,
            organization: professional.organization ?? null,
            designation: professional.designation ?? null,
            country: professional.country ?? null,
            linkedin: payload.linkedin ?? null,
            github: payload.github ?? null,
            portfolio: payload.portfolio ?? null,
            photoUrl: `/api/v1/alumni/${encodeURIComponent(row.id)}/photo`,
          },
        ];
      }),
      context.get("requestId"),
    ),
  );
});

submissionRoutes.get("/alumni/:id/photo", async (context) => {
  const attachment = await context.env.DB.prepare(
    `SELECT a.object_key, a.content_type FROM submission_attachments a
     JOIN platform_submissions s ON s.id = a.submission_id
     WHERE s.id = ? AND s.submission_type = 'ALUMNI' AND s.status = 'PUBLISHED'
       AND a.extension IN ('jpg', 'jpeg', 'png', 'webp') AND a.archived_at IS NULL
     ORDER BY a.created_at ASC LIMIT 1`,
  )
    .bind(context.req.param("id"))
    .first<{ object_key: string; content_type: string }>();
  if (!attachment)
    throw new AppError({
      code: "ALUMNI_PHOTO_NOT_FOUND",
      message: "No public alumni photo is available.",
      status: 404,
    });
  const object = await context.env.STORAGE.get(attachment.object_key);
  if (!object)
    throw new AppError({
      code: "ALUMNI_PHOTO_NOT_FOUND",
      message: "No public alumni photo is available.",
      status: 404,
    });
  return new Response(object.body, {
    headers: {
      "Content-Type": attachment.content_type,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

submissionRoutes.post(
  "/submissions/:id/attachments",
  sessionMiddleware({ required: false }),
  async (context) => {
    allowedOrigin(context);
    const submission = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE id = ?",
    )
      .bind(context.req.param("id"))
      .first<SubmissionRow>();
    if (!submission)
      throw new AppError({
        code: "SUBMISSION_NOT_FOUND",
        message: "The submission was not found.",
        status: 404,
      });
    const access = await submissionAccess(context, submission);
    if (context.get("authUser")) await validateSessionCsrf(context);
    if (
      !["PROJECT", "RESEARCH", "COLLABORATION", "ALUMNI"].includes(
        submission.submission_type,
      ) ||
      ![
        "EMAIL_VERIFICATION",
        "SUBMITTED",
        "NEEDS_INFORMATION",
        "REVISION_REQUESTED",
      ].includes(submission.status)
    ) {
      throw new AppError({
        code: "ATTACHMENT_UPLOAD_CLOSED",
        message: "Attachments cannot be added at this stage.",
        status: 409,
      });
    }
    const form = await context.req.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > 10 * 1024 * 1024
    ) {
      throw new AppError({
        code: "INVALID_ATTACHMENT",
        message: "Upload a supported file up to 10 MB.",
        status: 422,
      });
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (
      !attachmentMimeTypes[extension]?.has(
        file.type || "application/octet-stream",
      )
    ) {
      throw new AppError({
        code: "INVALID_ATTACHMENT_TYPE",
        message:
          "Allowed formats: PDF, DOC, DOCX, PPT, PPTX, ZIP, JPG, PNG, and WebP.",
        status: 422,
      });
    }
    const buffer = await file.arrayBuffer();
    if (!validMagic(extension, new Uint8Array(buffer).slice(0, 16))) {
      throw new AppError({
        code: "INVALID_ATTACHMENT_CONTENT",
        message: "The file content does not match its extension.",
        status: 422,
      });
    }
    const attachmentId = crypto.randomUUID();
    const safeName =
      file.name.replace(/[^a-zA-Z0-9._-]+/gu, "-").slice(-120) ||
      `document.${extension}`;
    const key = `submissions/${submission.submission_type.toLowerCase()}/${submission.id}/${attachmentId}-${safeName}`;
    await context.env.STORAGE.put(key, buffer, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: {
        submissionId: submission.id,
        uploadedBy: context.get("authUser")?.id ?? access,
      },
    });
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO submission_attachments
        (id, submission_id, object_key, original_name, extension, content_type, byte_size, sha256_hex, uploaded_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        attachmentId,
        submission.id,
        key,
        file.name,
        extension,
        file.type || "application/octet-stream",
        file.size,
        await sha256Hex(buffer),
        context.get("authUser")?.id ?? null,
      ),
      context.env.DB.prepare(
        `INSERT INTO submission_events
        (id, submission_id, actor_user_id, actor_type, event_type, public_message, request_id)
       VALUES (?, ?, ?, ?, 'ATTACHMENT_ADDED', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        submission.id,
        context.get("authUser")?.id ?? null,
        access === "ADMIN" ? "ADMIN" : access === "OWNER" ? "USER" : "GUEST",
        `Attachment added: ${file.name}`,
        context.get("requestId"),
      ),
    ]);
    return context.json(
      success(
        { id: attachmentId, originalName: file.name, byteSize: file.size },
        context.get("requestId"),
      ),
      201,
    );
  },
);

submissionRoutes.get(
  "/submissions/:id/attachments/:attachmentId",
  sessionMiddleware({ required: false }),
  async (context) => {
    const submission = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE id = ?",
    )
      .bind(context.req.param("id"))
      .first<SubmissionRow>();
    if (!submission)
      throw new AppError({
        code: "SUBMISSION_NOT_FOUND",
        message: "The submission was not found.",
        status: 404,
      });
    await submissionAccess(context, submission);
    const attachment = await context.env.DB.prepare(
      `SELECT object_key, original_name, content_type FROM submission_attachments
     WHERE id = ? AND submission_id = ? AND archived_at IS NULL`,
    )
      .bind(context.req.param("attachmentId"), submission.id)
      .first<{
        object_key: string;
        original_name: string;
        content_type: string;
      }>();
    if (!attachment)
      throw new AppError({
        code: "ATTACHMENT_NOT_FOUND",
        message: "The attachment was not found.",
        status: 404,
      });
    const object = await context.env.STORAGE.get(attachment.object_key);
    if (!object)
      throw new AppError({
        code: "ATTACHMENT_NOT_FOUND",
        message: "The attachment was not found.",
        status: 404,
      });
    const headers = new Headers({
      "Content-Type": attachment.content_type,
      "Content-Disposition": `attachment; filename="${attachment.original_name.replaceAll('"', "")}"`,
      "X-Content-Type-Options": "nosniff",
    });
    return new Response(object.body, { headers });
  },
);

submissionRoutes.get(
  "/admin/submissions",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const allowedTypes = allowedAdminSubmissionTypes(user.permissions);
    if (allowedTypes.length === 0)
      throw new AppError({
        code: "FORBIDDEN",
        message: "You do not have permission to view submissions.",
        status: 403,
      });
    const parsed = adminSubmissionQuerySchema.safeParse({
      type: context.req.query("type") || undefined,
      status: context.req.query("status") || undefined,
      search: context.req.query("search") ?? "",
      limit: context.req.query("limit") ?? undefined,
      offset: context.req.query("offset") ?? undefined,
    });
    if (!parsed.success)
      throw new AppError({
        code: "INVALID_QUERY",
        message: "The submission filter is invalid.",
        status: 422,
      });
    const where: string[] = [];
    const bindings: unknown[] = [];
    if (parsed.data.type) {
      if (!allowedTypes.includes(parsed.data.type))
        throw new AppError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this submission type.",
          status: 403,
        });
      where.push("submission_type = ?");
      bindings.push(parsed.data.type);
    } else if (allowedTypes.length < 5) {
      where.push(
        `submission_type IN (${allowedTypes.map(() => "?").join(",")})`,
      );
      bindings.push(...allowedTypes);
    }
    if (parsed.data.status) {
      where.push("status = ?");
      bindings.push(parsed.data.status);
    }
    if (parsed.data.search) {
      where.push(
        "(reference_code LIKE ? OR title LIKE ? OR submitter_email_normalized LIKE ?)",
      );
      const search = `%${parsed.data.search.toLowerCase()}%`;
      bindings.push(search, search, search);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [result, total] = await Promise.all([
      context.env.DB.prepare(
        `SELECT * FROM platform_submissions ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
        .bind(...bindings, parsed.data.limit, parsed.data.offset)
        .all<SubmissionRow>(),
      context.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM platform_submissions ${clause}`,
      )
        .bind(...bindings)
        .first<number>("count"),
    ]);
    return context.json(
      success(
        { items: result.results.map(adminProjection), total: total ?? 0 },
        context.get("requestId"),
      ),
    );
  },
);

submissionRoutes.get(
  "/admin/submissions/:id",
  sessionMiddleware({ required: true }),
  async (context) => {
    const row = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE id = ?",
    )
      .bind(context.req.param("id"))
      .first<SubmissionRow>();
    if (!row)
      throw new AppError({
        code: "SUBMISSION_NOT_FOUND",
        message: "The submission was not found.",
        status: 404,
      });
    assertSubmissionAdminAccess(context, row.submission_type);
    const [events, attachments] = await Promise.all([
      context.env.DB.prepare(
        "SELECT * FROM submission_events WHERE submission_id = ? ORDER BY created_at ASC",
      )
        .bind(row.id)
        .all(),
      context.env.DB.prepare(
        `SELECT id, original_name AS originalName, content_type AS contentType, byte_size AS byteSize, created_at AS createdAt
         FROM submission_attachments WHERE submission_id = ? AND archived_at IS NULL`,
      )
        .bind(row.id)
        .all(),
    ]);
    return context.json(
      success(
        {
          ...adminProjection(row),
          events: events.results,
          attachments: attachments.results,
        },
        context.get("requestId"),
      ),
    );
  },
);

submissionRoutes.patch(
  "/admin/submissions/:id",
  sessionMiddleware({ required: true }),
  async (context) => {
    allowedOrigin(context);
    await validateSessionCsrf(context);
    const { user } = requireAuth(context);
    const input = await parseJson(context, adminSubmissionUpdateSchema);
    const row = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE id = ?",
    )
      .bind(context.req.param("id"))
      .first<SubmissionRow>();
    if (!row)
      throw new AppError({
        code: "SUBMISSION_NOT_FOUND",
        message: "The submission was not found.",
        status: 404,
      });
    assertSubmissionAdminAccess(context, row.submission_type, true);
    if (!transitions[row.status].includes(input.status)) {
      throw new AppError({
        code: "INVALID_SUBMISSION_TRANSITION",
        message: `A ${row.status} submission cannot move to ${input.status}.`,
        status: 409,
      });
    }
    if (input.assignedReviewerId) {
      const reviewer = await context.env.DB.prepare(
        "SELECT id FROM users WHERE id = ? AND status = 'EMAIL_VERIFIED' AND deleted_at IS NULL",
      )
        .bind(input.assignedReviewerId)
        .first("id");
      if (!reviewer)
        throw new AppError({
          code: "REVIEWER_NOT_FOUND",
          message: "The selected reviewer is unavailable.",
          status: 422,
        });
    }
    const now = new Date().toISOString();
    const publicResponse =
      input.publicResponse === undefined
        ? row.public_response
        : input.publicResponse;
    const internalNotes = input.internalNote
      ? [row.internal_notes, `[${now}] ${user.email}: ${input.internalNote}`]
          .filter(Boolean)
          .join("\n")
      : row.internal_notes;
    const statusEmail = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: row.user_id,
      template: "SUBMISSION_STATUS",
      recipientEmail: row.submitter_email,
      payload: submissionStatusEmail({
        siteUrl: context.env.SITE_URL,
        submitterName: row.submitter_name,
        submissionType: row.submission_type,
        referenceCode: row.reference_code,
        status: input.status,
        publicResponse,
      }),
    });
    const statements: D1PreparedStatement[] = [
      context.env.DB.prepare(
        `UPDATE platform_submissions SET status = ?, public_response = ?, internal_notes = ?, priority = ?,
           assigned_reviewer_id = ?, last_status_at = ?, updated_at = ?, archived_at = ? WHERE id = ? AND status = ?`,
      ).bind(
        input.status,
        publicResponse,
        internalNotes,
        input.priority ?? row.priority,
        input.assignedReviewerId === undefined
          ? row.assigned_reviewer_id
          : input.assignedReviewerId,
        now,
        now,
        input.status === "ARCHIVED" ? now : null,
        row.id,
        row.status,
      ),
      context.env.DB.prepare(
        `INSERT INTO submission_events
          (id, submission_id, actor_user_id, actor_type, event_type, from_status, to_status,
           public_message, internal_note, request_id)
         VALUES (?, ?, ?, 'ADMIN', 'STATUS_CHANGED', ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        row.id,
        user.id,
        row.status,
        input.status,
        publicResponse,
        input.internalNote ?? null,
        context.get("requestId"),
      ),
      insertEmailStatement(context.env.DB, statusEmail),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "SUBMISSION_STATUS_CHANGED",
        entityType: "SUBMISSION",
        entityId: row.id,
        reason: input.reason,
        metadata: {
          fromStatus: row.status,
          toStatus: input.status,
          type: row.submission_type,
          priority: input.priority ?? row.priority,
        },
      }),
    ];
    if (row.submission_type === "RESEARCH" && input.status === "APPROVED") {
      const researcherId = row.id;
      const slug = `${row.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/gu, "-")
        .replace(/^-|-$/gu, "")
        .slice(0, 210)}-${row.reference_code.toLowerCase()}`;
      statements.push(
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO research_works
            (id,title,slug,short_description,abstract,research_status,keywords_json,workflow_status,created_by,updated_by,created_at,updated_at)
           VALUES (?,?,?,?,?,'ONGOING','[]','DRAFT',?,?,?,?)`,
        ).bind(
          row.id,
          row.title,
          slug,
          row.summary,
          row.summary,
          user.id,
          user.id,
          now,
          now,
        ),
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO researchers (id,user_id,name,role,institution,email,created_at,updated_at)
           VALUES (?,?,?,'Lead Researcher',?,?,?,?)`,
        ).bind(
          researcherId,
          row.user_id,
          row.submitter_name,
          row.institution,
          row.submitter_email,
          now,
          now,
        ),
        context.env.DB.prepare(
          "INSERT OR IGNORE INTO research_authors (research_id,researcher_id,author_order,author_role) VALUES (?,?,0,'Lead Researcher')",
        ).bind(row.id, researcherId),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "RESEARCH_PROPOSAL_CONVERTED",
          entityType: "RESEARCH",
          entityId: row.id,
          metadata: {
            referenceCode: row.reference_code,
            workflowStatus: "DRAFT",
          },
        }),
      );
    }
    if (row.user_id) {
      statements.push(
        notificationStatement(context.env.DB, {
          userId: row.user_id,
          type: "SUBMISSION_STATUS",
          title: `Submission ${row.reference_code} updated`,
          message: `Status changed from ${row.status} to ${input.status}.`,
          actionUrl: "/dashboard",
          entityId: row.id,
        }),
      );
    }
    if (input.assignedReviewerId && input.assignedReviewerId !== row.assigned_reviewer_id) {
      statements.push(
        notificationStatement(context.env.DB, {
          userId: input.assignedReviewerId,
          type: "SUBMISSION_ASSIGNED",
          title: `Application ${row.reference_code} assigned to you`,
          message: `${row.submission_type} application: ${row.title}`,
          actionUrl: "/admin?section=applications",
          entityId: row.id,
        }),
      );
    }
    await context.env.DB.batch(statements);
    return context.json(
      success({ id: row.id, status: input.status }, context.get("requestId")),
    );
  },
);

submissionRoutes.get(
  "/notifications",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const result = await context.env.DB.prepare(
      `SELECT id, notification_type AS type, title, message, action_url AS actionUrl,
            read_at AS readAt, created_at AS createdAt
     FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    )
      .bind(user.id)
      .all<Record<string, unknown>>();
    return context.json(success(result.results, context.get("requestId")));
  },
);

submissionRoutes.post(
  "/notifications/:id/read",
  sessionMiddleware({ required: true }),
  async (context) => {
    allowedOrigin(context);
    await validateSessionCsrf(context);
    const { user } = requireAuth(context);
    await context.env.DB.prepare(
      "UPDATE user_notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?",
    )
      .bind(new Date().toISOString(), context.req.param("id"), user.id)
      .run();
    return context.json(success({ read: true }, context.get("requestId")));
  },
);
