import { Hono, type Context } from "hono";
import { z } from "zod";
import { sha256, timingSafeEqualStrings } from "../auth/crypto";
import {
  csrfMiddleware,
  requireAuth,
  sessionMiddleware,
} from "../auth/session";
import { parseJson } from "../auth/validation";
import { createAuditStatement } from "../db/audit";
import { success } from "../lib/api-envelope";
import { AppError } from "../lib/app-error";
import {
  requireAnyPermission,
  requirePermission,
} from "../middleware/authorization";
import type { AppEnvironment } from "../types";

const publicCollections = [
  "activities",
  "activity_photos",
  "alumni",
  "announcements",
  "blog_posts",
  "courses",
  "events",
  "hero_slides",
  "lessons",
  "opportunities",
  "partners",
  "projects",
  "research_papers",
  "team_members",
  "certificates",
] as const;
const submissionTypes = [
  "blog_posts",
  "certificates",
  "contact_messages",
  "course_certificates",
  "course_registrations",
  "event_registrations",
] as const;
const collectionSchema = z.enum(publicCollections);
const submissionTypeSchema = z.enum(submissionTypes);
const jsonRecord = z
  .record(z.string(), z.unknown())
  .refine(
    (value) => JSON.stringify(value).length <= 32 * 1024,
    "The submitted data is too large.",
  );
const querySchema = z.object({
  table: z.string().trim().min(2).max(64),
  filters: z
    .array(
      z.object({
        field: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u),
        value: z.unknown(),
        operator: z.enum(["eq", "gte", "in"]).default("eq"),
      }),
    )
    .max(12)
    .default([]),
  order: z
    .object({
      field: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u),
      ascending: z.boolean(),
    })
    .optional(),
  limit: z.number().int().min(1).max(200).default(100),
  single: z.boolean().default(false),
  countOnly: z.boolean().default(false),
});
const mutationSchema = z.object({
  table: z.enum(["profiles", "course_registrations"]),
  values: jsonRecord,
  filters: z
    .array(
      z.object({
        field: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u),
        value: z.unknown(),
      }),
    )
    .max(4)
    .default([]),
});
const contentWriteSchema = z.object({
  data: jsonRecord,
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  sortOrder: z.number().int().min(-100000).max(100000).default(0),
});
const heroSlideDataSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    image_key: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .regex(/^website\/[a-zA-Z0-9/._-]+$/u)
      .optional(),
    image_url: z.string().trim().min(1).max(800).optional(),
    image_alt: z.string().trim().max(300).optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    if (Boolean(value.image_key) !== Boolean(value.image_url)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The Hero image reference is incomplete.",
        path: ["image_key"],
      });
    }
  });
const managedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const managedDocumentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "video/mp4",
]);
const managedMediaTypes = new Set([
  ...managedImageTypes,
  ...managedDocumentTypes,
]);

function hasValidImageSignature(
  bytes: Uint8Array,
  contentType: string,
): boolean {
  if (contentType === "image/jpeg")
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  if (contentType === "image/png")
    return (
      bytes.length >= 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (value, index) => bytes[index] === value,
      )
    );
  if (contentType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

function hasValidMediaSignature(
  bytes: Uint8Array,
  contentType: string,
): boolean {
  if (managedImageTypes.has(contentType))
    return hasValidImageSignature(bytes, contentType);
  if (contentType === "application/pdf")
    return (
      bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
    );
  if (
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
    ].includes(contentType)
  )
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (
    contentType === "application/msword" ||
    contentType === "application/vnd.ms-powerpoint"
  )
    return (
      bytes.length >= 8 &&
      [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every(
        (value, index) => bytes[index] === value,
      )
    );
  if (contentType === "video/mp4")
    return (
      bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp"
    );
  return contentType === "text/plain" || contentType === "text/csv";
}

interface ContentRow {
  id: string;
  data_json: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SubmissionRow {
  id: string;
  data_json: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function projectRow(row: ContentRow): Record<string, unknown> {
  const data = JSON.parse(row.data_json) as Record<string, unknown>;
  return {
    ...data,
    id: row.id,
    status: row.status.toLowerCase(),
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseCollection(value: string): z.infer<typeof collectionSchema> {
  const parsed = collectionSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError({
      code: "DATA_COLLECTION_NOT_AVAILABLE",
      message: "That data collection is unavailable.",
      status: 404,
    });
  }
  return parsed.data;
}

function requireAllowedOrigin(context: Context<AppEnvironment>): void {
  const origin = context.req.header("Origin");
  const siteUrl = new URL(context.env.SITE_URL);
  const frontendUrl = new URL(context.env.FRONTEND_ORIGIN);
  const allowedOrigins = new Set([siteUrl.origin, frontendUrl.origin]);
  if (siteUrl.protocol === "https:" && !siteUrl.hostname.startsWith("www.")) {
    allowedOrigins.add(`${siteUrl.protocol}//www.${siteUrl.host}`);
  }
  if (!origin || !allowedOrigins.has(origin)) {
    throw new AppError({
      code: "INVALID_ORIGIN",
      message: "The request origin is not allowed.",
      status: 403,
    });
  }
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
  });
}

function projectSubmission(row: SubmissionRow): Record<string, unknown> {
  return {
    ...(JSON.parse(row.data_json) as Record<string, unknown>),
    id: row.id,
    submission_status: row.status.toLowerCase(),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function applyQuery(
  items: Record<string, unknown>[],
  input: z.infer<typeof querySchema>,
): Record<string, unknown>[] {
  let filtered = items;
  for (const filter of input.filters) {
    filtered = filtered.filter((item) => {
      if (filter.operator === "gte")
        return compareValues(item[filter.field], filter.value) >= 0;
      if (filter.operator === "in")
        return (
          Array.isArray(filter.value) &&
          filter.value.includes(item[filter.field])
        );
      return item[filter.field] === filter.value;
    });
  }
  if (input.order) {
    const { field, ascending } = input.order;
    filtered.sort(
      (left, right) =>
        compareValues(left[field], right[field]) * (ascending ? 1 : -1),
    );
  }
  return filtered;
}

export const contentRoutes = new Hono<AppEnvironment>();

contentRoutes.post(
  "/data/query",
  sessionMiddleware({ required: false }),
  async (context) => {
    const input = await parseJson(context, querySchema);
    const user = context.get("authUser");

    if (input.table === "profiles") {
      if (!user)
        return context.json(
          success({ items: [], count: 0 }, context.get("requestId")),
        );
      const row = await context.env.DB.prepare(
        "SELECT data_json, updated_at FROM user_profiles WHERE user_id = ?",
      )
        .bind(user.id)
        .first<{ data_json: string; updated_at: string }>();
      const profile = {
        user_id: user.id,
        full_name: user.displayName,
        ...(row ? JSON.parse(row.data_json) : {}),
        updated_at: row?.updated_at,
      };
      return context.json(
        success({ items: [profile], count: 1 }, context.get("requestId")),
      );
    }

    const ownBlogQuery =
      input.table === "blog_posts" &&
      user &&
      input.filters.some(
        (filter) => filter.field === "author_id" && filter.value === user.id,
      );
    const submissionType = submissionTypeSchema.safeParse(input.table);
    if (
      submissionType.success &&
      (input.table !== "blog_posts" || ownBlogQuery)
    ) {
      const isPublicEventList =
        input.table === "event_registrations" &&
        !user &&
        input.filters.some(
          (filter) =>
            filter.field === "approval_status" && filter.value === "approved",
        );
      const isPublicCertificateLookup =
        (input.table === "certificates" ||
          input.table === "course_certificates") &&
        !user &&
        input.filters.some(
          (filter) =>
            filter.field === "certificate_number" || filter.field === "id",
        );
      if (!user && !isPublicEventList && !isPublicCertificateLookup) {
        throw new AppError({
          code: "AUTHENTICATION_REQUIRED",
          message: "Please sign in to continue.",
          status: 401,
        });
      }
      const result = await context.env.DB.prepare(
        `SELECT id, data_json, status, created_at, updated_at FROM website_submissions
       WHERE submission_type = ? AND status != 'ARCHIVED' ORDER BY created_at DESC LIMIT 200`,
      )
        .bind(submissionType.data)
        .all<SubmissionRow>();
      let items = result.results.map(projectSubmission);
      if (user && input.table !== "contact_messages") {
        const ownerField =
          input.table === "blog_posts" ? "author_id" : "user_id";
        items = items.filter((item) => item[ownerField] === user.id);
      }
      items = applyQuery(items, input);
      if (isPublicEventList) {
        items = items.map((item) => ({
          id: item.id,
          event_id: item.event_id,
          name: item.name,
          approval_status: "approved",
        }));
      }
      const count = items.length;
      items = items.slice(0, input.limit);
      return context.json(
        success(
          { items: input.countOnly ? [] : items, count },
          context.get("requestId"),
        ),
      );
    }

    if (input.table === "members" || input.table === "public_members") {
      const result = await context.env.DB.prepare(
        `SELECT u.id, u.display_name AS full_name, m.membership_number AS membership_id,
              m.status AS membership_status, m.start_date AS membership_started_at
       FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.status IN ('ACTIVE', 'EXPIRING_SOON')
       ORDER BY m.start_date DESC LIMIT ?`,
      )
        .bind(input.limit)
        .all<Record<string, unknown>>();
      return context.json(
        success(
          { items: result.results, count: result.results.length },
          context.get("requestId"),
        ),
      );
    }

    const collection = collectionSchema.safeParse(input.table);
    if (!collection.success) {
      throw new AppError({
        code: "DATA_COLLECTION_NOT_AVAILABLE",
        message: "That data collection is not publicly available.",
        status: 404,
      });
    }
    const result = await context.env.DB.prepare(
      `SELECT id, data_json, status, sort_order, created_at, updated_at
     FROM website_content_items
     WHERE collection_key = ? AND status = 'PUBLISHED'
     ORDER BY sort_order ASC, created_at DESC LIMIT 200`,
    )
      .bind(collection.data)
      .all<ContentRow>();
    let items = applyQuery(result.results.map(projectRow), input);
    const count = items.length;
    items = items.slice(0, input.limit);
    return context.json(
      success(
        { items: input.countOnly ? [] : items, count },
        context.get("requestId"),
      ),
    );
  },
);

contentRoutes.post(
  "/data/mutate",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, mutationSchema);
    const targetUser = input.filters.find(
      (filter) => filter.field === "user_id",
    )?.value;
    if (targetUser !== undefined && targetUser !== user.id) {
      throw new AppError({
        code: "PROFILE_SCOPE_VIOLATION",
        message: "You can only update your own profile.",
        status: 403,
      });
    }
    const now = new Date().toISOString();
    if (input.table === "course_registrations") {
      const result = await context.env.DB.prepare(
        `SELECT id, data_json, status, created_at, updated_at FROM website_submissions
       WHERE submission_type = 'course_registrations' AND submitted_by = ? AND status != 'ARCHIVED'`,
      )
        .bind(user.id)
        .all<SubmissionRow>();
      const matches = applyQuery(result.results.map(projectSubmission), {
        table: input.table,
        filters: input.filters.map((filter) => ({
          ...filter,
          operator: "eq" as const,
        })),
        limit: 200,
        single: false,
        countOnly: false,
      });
      if (matches.length === 0) {
        throw new AppError({
          code: "REGISTRATION_NOT_FOUND",
          message: "The course registration was not found.",
          status: 404,
        });
      }
      const statements: D1PreparedStatement[] = [];
      for (const match of matches) {
        const original = result.results.find((row) => row.id === match.id);
        const originalData = original
          ? (JSON.parse(original.data_json) as Record<string, unknown>)
          : {};
        const next: Record<string, unknown> = {
          ...originalData,
          ...input.values,
          user_id: user.id,
        };
        const courseId = originalData.course_id;
        const progress = next.progress;
        if (
          typeof courseId === "string" &&
          progress &&
          typeof progress === "object" &&
          !Array.isArray(progress)
        ) {
          const lessonRows = await context.env.DB.prepare(
            `SELECT id FROM website_content_items WHERE collection_key = 'lessons' AND status = 'PUBLISHED'
           AND json_extract(data_json, '$.course_id') = ?`,
          )
            .bind(courseId)
            .all<{ id: string }>();
          next.completed =
            lessonRows.results.length > 0 &&
            lessonRows.results.every(
              (lesson) =>
                (progress as Record<string, unknown>)[lesson.id] === true,
            );
          if (next.completed === true && originalData.completed !== true)
            next.completion_date = now;
          if (next.completed !== true) next.completion_date = null;
        } else {
          next.completed = false;
        }
        statements.push(
          context.env.DB.prepare(
            "UPDATE website_submissions SET data_json = ?, updated_at = ? WHERE id = ? AND submitted_by = ?",
          ).bind(JSON.stringify(next), now, match.id, user.id),
        );
      }
      await context.env.DB.batch(statements);
      return context.json(
        success(
          { updated: true, count: statements.length },
          context.get("requestId"),
        ),
      );
    }
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO user_profiles (user_id, data_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
      ).bind(user.id, JSON.stringify(input.values), now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "PROFILE_UPDATED",
        entityType: "USER_PROFILE",
        entityId: user.id,
      }),
    ]);
    return context.json(success({ updated: true }, context.get("requestId")));
  },
);

contentRoutes.post(
  "/data/submissions/:type",
  sessionMiddleware({ required: false }),
  async (context) => {
    requireAllowedOrigin(context);
    const type = submissionTypeSchema.safeParse(context.req.param("type"));
    if (!type.success)
      throw new AppError({
        code: "SUBMISSION_TYPE_NOT_AVAILABLE",
        message: "That submission type is unavailable.",
        status: 404,
      });
    const payload = await parseJson(
      context,
      z.object({ rows: z.array(jsonRecord).min(1).max(10) }),
    );
    const user = context.get("authUser");
    if (type.data !== "contact_messages" && !user) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Please sign in to continue.",
        status: 401,
      });
    }
    if (user) {
      const session = context.get("authSession");
      const token = context.req.header("X-CSRF-Token")?.trim();
      if (
        !session ||
        !token ||
        !(await timingSafeEqualStrings(
          await sha256(token),
          session.csrfTokenHash,
        ))
      ) {
        throw new AppError({
          code: "CSRF_VALIDATION_FAILED",
          message: "The request could not be validated.",
          status: 403,
        });
      }
    }
    const canonicalRows = payload.rows.map((row) => {
      const id = crypto.randomUUID();
      const ownerField = type.data === "blog_posts" ? "author_id" : "user_id";
      const data: Record<string, unknown> =
        type.data === "contact_messages"
          ? { ...row }
          : { ...row, [ownerField]: user!.id };
      if (type.data === "certificates" || type.data === "course_certificates") {
        data.issued_at = data.issued_at ?? new Date().toISOString();
      }
      return { id, data };
    });
    if (type.data === "certificates" || type.data === "course_certificates") {
      throw new AppError({
        code: "CERTIFICATE_APPROVAL_REQUIRED",
        message:
          "Certificates are issued only after a learner request and administrator approval.",
        status: 403,
      });
    }
    if (user) {
      for (const row of canonicalRows) {
        if (type.data === "blog_posts") row.data.published = false;
        if (
          type.data === "course_registrations" ||
          type.data === "event_registrations"
        ) {
          const resourceType =
            type.data === "course_registrations" ? "courses" : "events";
          const resourceField =
            type.data === "course_registrations" ? "course_id" : "event_id";
          const resourceId = row.data[resourceField];
          if (typeof resourceId !== "string") {
            throw new AppError({
              code: "INVALID_REGISTRATION",
              message: "The registration target is invalid.",
              status: 422,
            });
          }
          const resource = await context.env.DB.prepare(
            `SELECT data_json FROM website_content_items
           WHERE id = ? AND collection_key = ? AND status = 'PUBLISHED'`,
          )
            .bind(resourceId, resourceType)
            .first<string>("data_json");
          if (!resource) {
            throw new AppError({
              code: "REGISTRATION_TARGET_NOT_FOUND",
              message: "The registration target was not found.",
              status: 404,
            });
          }
          const resourceData = JSON.parse(resource) as Record<string, unknown>;
          const isPaid = resourceData.is_paid === true;
          const paymentMethod = row.data.payment_method;
          if (!isPaid) {
            row.data.payment_method = null;
            row.data.transaction_id = null;
            row.data.payment_status = "confirmed";
          } else if (paymentMethod === "Cash") {
            row.data.transaction_id = null;
            row.data.payment_status = "unpaid";
          } else {
            if (
              typeof row.data.transaction_id !== "string" ||
              row.data.transaction_id.trim().length < 3
            ) {
              throw new AppError({
                code: "TRANSACTION_ID_REQUIRED",
                message: "A transaction ID is required.",
                status: 422,
              });
            }
            row.data.payment_status = "pending";
          }
          row.data.approval_status = "pending";
        }
      }
    }
    if (
      user &&
      [
        "course_registrations",
        "event_registrations",
        "certificates",
        "course_certificates",
      ].includes(type.data)
    ) {
      for (const row of canonicalRows) {
        const domainKey =
          type.data === "event_registrations" ? "event_id" : "course_id";
        const domainValue = row.data[domainKey];
        if (typeof domainValue === "string") {
          const duplicate = await context.env.DB.prepare(
            `SELECT id FROM website_submissions WHERE submission_type = ? AND submitted_by = ?
           AND json_extract(data_json, ?) = ? AND status != 'ARCHIVED' LIMIT 1`,
          )
            .bind(type.data, user.id, `$.${domainKey}`, domainValue)
            .first("id");
          if (duplicate) {
            throw new AppError({
              code: "ALREADY_REGISTERED",
              message: "An active record already exists.",
              status: 409,
            });
          }
        }
      }
    }
    const statements = canonicalRows.map((row) =>
      context.env.DB.prepare(
        `INSERT INTO website_submissions (id, submission_type, submitted_by, data_json)
     VALUES (?, ?, ?, ?)`,
      ).bind(row.id, type.data, user?.id ?? null, JSON.stringify(row.data)),
    );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          submitted: true,
          count: statements.length,
          items: canonicalRows.map((row) => ({
            ...row.data,
            id: row.id,
            created_at: new Date().toISOString(),
          })),
        },
        context.get("requestId"),
      ),
      201,
    );
  },
);

contentRoutes.post(
  "/data/rpc",
  sessionMiddleware({ required: false }),
  async (context) => {
    const input = await parseJson(
      context,
      z.object({
        name: z.string().min(2).max(64),
        args: z.record(z.string(), z.unknown()).default({}),
      }),
    );
    if (input.name === "get_approved_member_count") {
      const count = await context.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM memberships WHERE status IN ('ACTIVE', 'EXPIRING_SOON')",
      ).first<number>("count");
      return context.json(success(count ?? 0, context.get("requestId")));
    }
    if (input.name === "get_public_members") {
      const result = await context.env.DB.prepare(
        `SELECT u.id, u.display_name AS full_name, m.membership_number AS membership_id, m.status AS membership_status
       FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.status IN ('ACTIVE', 'EXPIRING_SOON')
       ORDER BY m.start_date DESC LIMIT 100`,
      ).all<Record<string, unknown>>();
      return context.json(success(result.results, context.get("requestId")));
    }
    if (input.name === "generate_certificate_number") {
      throw new AppError({
        code: "CERTIFICATE_APPROVAL_REQUIRED",
        message:
          "Certificate numbers are allocated only during administrator-approved issuance.",
        status: 403,
      });
    }
    if (input.name === "get_certificate_holder") {
      const userId = input.args._user_id;
      if (typeof userId !== "string")
        return context.json(success([], context.get("requestId")));
      const row = await context.env.DB.prepare(
        `SELECT u.display_name, p.data_json FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ? AND u.status = 'EMAIL_VERIFIED'`,
      )
        .bind(userId)
        .first<{ display_name: string; data_json: string | null }>();
      if (!row) return context.json(success([], context.get("requestId")));
      const profile = row.data_json
        ? (JSON.parse(row.data_json) as Record<string, unknown>)
        : {};
      return context.json(
        success(
          [
            {
              full_name: row.display_name,
              department: profile.department ?? null,
            },
          ],
          context.get("requestId"),
        ),
      );
    }
    throw new AppError({
      code: "DATA_FUNCTION_NOT_AVAILABLE",
      message: "That data function is unavailable.",
      status: 404,
    });
  },
);

contentRoutes.get(
  "/admin/content/:collection",
  sessionMiddleware({ required: true }),
  requireAnyPermission(["content.read", "event.read"]),
  async (context) => {
    const { user } = requireAuth(context);
    const collection = parseCollection(context.req.param("collection"));
    if (
      !user.permissions.includes("content.read") &&
      !(collection === "events" && user.permissions.includes("event.read"))
    ) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to view this content collection.",
        status: 403,
      });
    }
    if (collection === "projects")
      throw new AppError({
        code: "PROJECT_MANAGEMENT_REQUIRED",
        message:
          "Use the dedicated Project Management module for project records.",
        status: 409,
      });
    const result = await context.env.DB.prepare(
      `SELECT id, data_json, status, sort_order, created_at, updated_at
       FROM website_content_items WHERE collection_key = ? AND status != 'ARCHIVED'
       ORDER BY sort_order ASC, created_at DESC LIMIT 200`,
    )
      .bind(collection)
      .all<ContentRow>();
    return context.json(
      success(result.results.map(projectRow), context.get("requestId")),
    );
  },
);

contentRoutes.put(
  "/admin/content/:collection/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["content.manage", "event.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const collection = parseCollection(context.req.param("collection"));
    if (
      !user.permissions.includes("content.manage") &&
      !(collection === "events" && user.permissions.includes("event.manage"))
    ) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message:
          "You do not have permission to manage this content collection.",
        status: 403,
      });
    }
    if (collection === "projects")
      throw new AppError({
        code: "PROJECT_MANAGEMENT_REQUIRED",
        message:
          "Use the dedicated Project Management module for project records.",
        status: 409,
      });
    const id = z.string().trim().min(1).max(100).parse(context.req.param("id"));
    const input = await parseJson(context, contentWriteSchema);
    if (
      input.status === "PUBLISHED" &&
      !user.permissions.includes("content.publish")
    ) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to publish website content.",
        status: 403,
      });
    }
    let contentData = input.data;
    if (collection === "hero_slides") {
      const parsed = heroSlideDataSchema.safeParse(input.data);
      if (!parsed.success) {
        throw new AppError({
          code: "INVALID_HERO_SLIDE",
          message:
            "Review the Hero Slide title and image details, then try again.",
          status: 422,
        });
      }
      if (input.status === "PUBLISHED" && !parsed.data.image_key) {
        throw new AppError({
          code: "HERO_IMAGE_REQUIRED",
          message: "Select a valid R2 Hero image before publishing.",
          status: 422,
        });
      }
      const canonical: Record<string, unknown> = { ...parsed.data };
      for (const key of [
        "image_key",
        "image_url",
        "image_name",
        "image_alt",
        "image_content_type",
        "image_byte_size",
      ])
        delete canonical[key];
      if (parsed.data.image_key) {
        const expectedUrl = `/api/v1/media/files/${parsed.data.image_key}`;
        if (parsed.data.image_url !== expectedUrl) {
          throw new AppError({
            code: "INVALID_MEDIA_REFERENCE",
            message: "The selected Hero image reference is invalid.",
            status: 422,
          });
        }
        const media = await context.env.DB.prepare(
          `SELECT original_name AS originalName, content_type AS contentType, byte_size AS byteSize
           FROM website_media_objects WHERE object_key = ? AND archived_at IS NULL`,
        )
          .bind(parsed.data.image_key)
          .first<{
            originalName: string;
            contentType: string;
            byteSize: number;
          }>();
        if (
          !media ||
          !managedImageTypes.has(media.contentType) ||
          !(await context.env.STORAGE.head(parsed.data.image_key))
        ) {
          throw new AppError({
            code: "MEDIA_NOT_FOUND",
            message:
              "The selected Hero image is no longer available. Choose another image.",
            status: 422,
          });
        }
        canonical.image_key = parsed.data.image_key;
        canonical.image_url = expectedUrl;
        canonical.image_name = media.originalName;
        canonical.image_content_type = media.contentType;
        canonical.image_byte_size = media.byteSize;
        if (parsed.data.image_alt) canonical.image_alt = parsed.data.image_alt;
      }
      contentData = canonical;
    }
    const now = new Date().toISOString();
    const publishedAt = input.status === "PUBLISHED" ? now : null;
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO website_content_items
          (id, collection_key, data_json, status, sort_order, created_by, updated_by, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, status = excluded.status,
           sort_order = excluded.sort_order, updated_by = excluded.updated_by, updated_at = ?,
           published_at = excluded.published_at, archived_at = NULL`,
      ).bind(
        id,
        collection,
        JSON.stringify(contentData),
        input.status,
        input.sortOrder,
        user.id,
        user.id,
        publishedAt,
        now,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "WEBSITE_CONTENT_SAVED",
        entityType: "WEBSITE_CONTENT",
        entityId: id,
        metadata: { collection, status: input.status },
      }),
    ]);
    return context.json(
      success(
        { id, collection, status: input.status },
        context.get("requestId"),
      ),
    );
  },
);

contentRoutes.delete(
  "/admin/content/:collection/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["content.manage", "event.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const collection = parseCollection(context.req.param("collection"));
    if (
      !user.permissions.includes("content.manage") &&
      !(collection === "events" && user.permissions.includes("event.manage"))
    ) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message:
          "You do not have permission to manage this content collection.",
        status: 403,
      });
    }
    if (collection === "projects")
      throw new AppError({
        code: "PROJECT_MANAGEMENT_REQUIRED",
        message:
          "Use the dedicated Project Management module for project records.",
        status: 409,
      });
    const id = z.string().trim().min(1).max(100).parse(context.req.param("id"));
    const now = new Date().toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE website_content_items SET status = 'ARCHIVED', archived_at = ?, updated_at = ?, updated_by = ?
         WHERE id = ? AND collection_key = ? AND status != 'ARCHIVED'`,
      ).bind(now, now, user.id, id, collection),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "WEBSITE_CONTENT_ARCHIVED",
        entityType: "WEBSITE_CONTENT",
        entityId: id,
        metadata: { collection },
      }),
    ]);
    return context.json(success({ archived: true }, context.get("requestId")));
  },
);

contentRoutes.post(
  "/media/upload",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission([
    "content.manage",
    "project.manage",
    "research.manage",
    "course.manage",
    "event.manage",
  ]),
  async (context) => {
    const { user } = requireAuth(context);
    const form = await context.req.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > 5 * 1024 * 1024 ||
      !managedMediaTypes.has(file.type)
    ) {
      throw new AppError({
        code: "INVALID_MEDIA",
        message:
          "Upload an approved image, PDF, Office document, text/CSV, ZIP, or MP4 file up to 5 MB.",
        status: 422,
      });
    }
    const buffer = await file.arrayBuffer();
    if (!hasValidMediaSignature(new Uint8Array(buffer), file.type)) {
      throw new AppError({
        code: "INVALID_MEDIA",
        message:
          "The uploaded file signature does not match its declared media type.",
        status: 422,
      });
    }
    const safeName =
      file.name.replace(/[^a-zA-Z0-9._-]+/gu, "-").slice(-100) || "image";
    const key = `website/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
    await context.env.STORAGE.put(key, buffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { uploadedBy: user.id, originalName: file.name },
    });
    await context.env.DB.prepare(
      `INSERT INTO website_media_objects (object_key, original_name, content_type, byte_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(key, file.name, file.type, file.size, user.id)
      .run();
    return context.json(
      success(
        {
          key,
          url: `/api/v1/media/files/${key}`,
          originalName: file.name,
          contentType: file.type,
          byteSize: file.size,
        },
        context.get("requestId"),
      ),
      201,
    );
  },
);

contentRoutes.get(
  "/admin/media",
  sessionMiddleware({ required: true }),
  requireAnyPermission([
    "content.read",
    "project.read",
    "research.read",
    "course.read",
    "event.read",
  ]),
  async (context) => {
    const search = (context.req.query("search") ?? "").trim().slice(0, 100);
    const offset = Math.max(Number(context.req.query("offset") ?? 0) || 0, 0);
    const pattern = `%${search.replace(/[%_]/g, "")}%`;
    const [items, total] = await Promise.all([
      context.env.DB.prepare(
        `SELECT m.object_key AS objectKey, m.original_name AS originalName, m.content_type AS contentType,
                m.byte_size AS byteSize, m.created_at AS createdAt, u.display_name AS uploadedBy
         FROM website_media_objects m JOIN users u ON u.id = m.uploaded_by
         WHERE m.archived_at IS NULL AND m.original_name LIKE ?
         ORDER BY m.created_at DESC LIMIT 24 OFFSET ?`,
      )
        .bind(pattern, offset)
        .all(),
      context.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM website_media_objects WHERE archived_at IS NULL AND original_name LIKE ?",
      )
        .bind(pattern)
        .first<number>("count"),
    ]);
    return context.json(
      success(
        { items: items.results, total: total ?? 0 },
        context.get("requestId"),
      ),
    );
  },
);

contentRoutes.delete(
  "/admin/media/*",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("content.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const key = decodeURIComponent(
      context.req.path.replace("/api/v1/admin/media/", ""),
    );
    const referenced = await context.env.DB.prepare(
      `SELECT id FROM website_content_items WHERE status != 'ARCHIVED' AND data_json LIKE ?
       UNION ALL SELECT id FROM research_documents WHERE object_key = ?
       UNION ALL SELECT id FROM lesson_contents WHERE object_key = ? AND archived_at IS NULL
       LIMIT 1`,
    )
      .bind(`%${key.replace(/[%_]/g, "")}%`, key, key)
      .first("id");
    if (referenced)
      throw new AppError({
        code: "MEDIA_IN_USE",
        message:
          "This media is still referenced by published or draft content and cannot be archived.",
        status: 409,
      });
    const now = new Date().toISOString();
    const result = await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE website_media_objects SET archived_at = ? WHERE object_key = ? AND archived_at IS NULL",
      ).bind(now, key),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "WEBSITE_MEDIA_ARCHIVED",
        entityType: "WEBSITE_MEDIA",
        entityId: key,
        reason: "Administrator archived an unused media object.",
      }),
    ]);
    if ((result[0]?.meta.changes ?? 0) !== 1)
      throw new AppError({
        code: "MEDIA_NOT_FOUND",
        message: "The media object was not found.",
        status: 404,
      });
    return context.json(success({ archived: true }, context.get("requestId")));
  },
);

contentRoutes.get("/media/files/*", async (context) => {
  const key = context.req.path.replace("/api/v1/media/files/", "");
  const metadata = await context.env.DB.prepare(
    "SELECT archived_at FROM website_media_objects WHERE object_key = ?",
  )
    .bind(key)
    .first<{ archived_at: string | null }>();
  if (!metadata || metadata.archived_at)
    throw new AppError({
      code: "MEDIA_NOT_FOUND",
      message: "The media object was not found.",
      status: 404,
    });
  const object = await context.env.STORAGE.get(key);
  if (!object)
    throw new AppError({
      code: "MEDIA_NOT_FOUND",
      message: "The media object was not found.",
      status: 404,
    });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
});
