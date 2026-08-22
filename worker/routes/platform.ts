import { Hono } from "hono";
import { z } from "zod";
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

const idSchema = z.string().uuid();
const statusQuery = z.string().trim().max(40).optional();
const urlValue = z
  .string()
  .trim()
  .url()
  .max(800)
  .or(
    z
      .string()
      .trim()
      .regex(/^\/api\/v1\/media\/files\//u)
      .max(800),
  );
const optionalUrl = urlValue.optional().or(z.literal(""));
const stringList = z
  .array(z.string().trim().min(1).max(120))
  .max(40)
  .default([]);
const workflowStatus = z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]);

const researcherSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2).max(160),
  role: z.string().trim().max(120).optional(),
  institution: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(254).optional(),
  photoUrl: optionalUrl,
});
const documentSchema = z.object({
  id: idSchema.optional(),
  type: z.enum([
    "COVER",
    "PDF",
    "PAPER",
    "DATASET",
    "PRESENTATION",
    "SUPPLEMENTARY",
  ]),
  title: z.string().trim().min(1).max(200),
  url: urlValue,
  objectKey: z.string().trim().max(512).optional(),
  contentType: z.string().trim().max(120).optional(),
  byteSize: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024)
    .optional(),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
});
const researchSchema = z.object({
  title: z.string().trim().min(3).max(240),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .max(260)
    .optional(),
  shortDescription: z.string().trim().max(1000).optional(),
  abstract: z.string().trim().max(30000).optional(),
  researchStatus: z.enum(["ONGOING", "COMPLETED", "PUBLISHED", "ARCHIVED"]),
  category: z.string().trim().max(120).optional(),
  researchArea: z.string().trim().max(160).optional(),
  keywords: stringList,
  publicationTitle: z.string().trim().max(240).optional(),
  journalConference: z.string().trim().max(240).optional(),
  publisher: z.string().trim().max(200).optional(),
  publicationDate: z.string().trim().max(40).optional(),
  doi: z.string().trim().max(200).optional(),
  isbnIssn: z.string().trim().max(100).optional(),
  volume: z.string().trim().max(60).optional(),
  issue: z.string().trim().max(60).optional(),
  pages: z.string().trim().max(60).optional(),
  citation: z.string().trim().max(2000).optional(),
  externalUrl: optionalUrl,
  coverUrl: optionalUrl,
  workflowStatus,
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
  researchers: z.array(researcherSchema).max(40).default([]),
  documents: z.array(documentSchema).max(30).default([]),
});

const courseSchema = z
  .object({
    title: z.string().trim().min(3).max(240),
    shortDescription: z.string().trim().max(1000).optional(),
    fullDescription: z.string().trim().max(30000).optional(),
    thumbnailUrl: optionalUrl,
    instructor: z.string().trim().max(160).optional(),
    instructorBio: z.string().trim().max(5000).optional(),
    category: z.string().trim().max(120).optional(),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
    duration: z.string().trim().max(100).optional(),
    language: z.string().trim().min(2).max(80).default("English"),
    tags: stringList,
    objectives: stringList,
    prerequisites: stringList,
    courseType: z.enum(["FREE", "PAID"]),
    price: z.number().min(0).max(1000000).default(0),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .default("BDT"),
    paymentInstructions: z.string().trim().max(3000).optional(),
    status: workflowStatus,
    featured: z.boolean().default(false),
    sortOrder: z.number().int().min(-10000).max(10000).default(0),
  })
  .superRefine((value, context) => {
    if (value.courseType === "PAID" && value.price <= 0)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paid courses require a positive price.",
        path: ["price"],
      });
    if (value.courseType === "FREE" && value.price !== 0)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Free courses cannot have a price.",
        path: ["price"],
      });
  });
const moduleSchema = z.object({
  courseId: idSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(3000).optional(),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});
const lessonSchema = z.object({
  courseId: idSchema,
  moduleId: idSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  durationMinutes: z.number().int().min(0).max(100000).optional(),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});
const lessonContentSchema = z
  .object({
    lessonId: idSchema,
    contentType: z.enum([
      "TEXT",
      "RICH_TEXT",
      "YOUTUBE",
      "VIDEO",
      "PDF",
      "DOC",
      "PPT",
      "IMAGE",
      "EXTERNAL",
      "DOWNLOAD",
    ]),
    title: z.string().trim().max(200).optional(),
    body: z.string().trim().max(60000).optional(),
    url: optionalUrl,
    objectKey: z.string().trim().max(512).optional(),
    metadataContentType: z.string().trim().max(120).optional(),
    byteSize: z
      .number()
      .int()
      .min(1)
      .max(5 * 1024 * 1024)
      .optional(),
    sortOrder: z.number().int().min(-10000).max(10000).default(0),
    status: z.enum(["DRAFT", "PUBLISHED"]),
  })
  .refine(
    (value) => Boolean(value.body || value.url || value.objectKey),
    "Lesson content requires text or a resource.",
  );

const paymentSchema = z.object({
  paymentMethod: z.string().trim().min(2).max(80),
  transactionReference: z.string().trim().min(3).max(160).optional(),
});
const eventRegistrationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  department: z.string().trim().max(120).optional(),
  paymentMethod: z.string().trim().min(2).max(80).optional(),
  transactionReference: z.string().trim().min(3).max(160).optional(),
  payerPhone: z.string().trim().regex(/^01\d{9}$/u).optional(),
});
const decisionSchema = z.object({
  action: z.enum([
    "APPROVE",
    "REJECT",
    "VERIFY_PAYMENT",
    "CANCEL",
    "PRESENT",
    "ABSENT",
  ]),
  reason: z.string().trim().min(3).max(1000).optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 240);
}
function parseList(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function optional(value?: string) {
  return value?.trim() || null;
}
export const platformRoutes = new Hono<AppEnvironment>();

platformRoutes.get("/research", async (context) => {
  const search = (context.req.query("search") || "").trim().toLowerCase();
  const status = statusQuery.parse(context.req.query("status"));
  const rows = await context.env.DB.prepare(
    `SELECT r.*,
    (SELECT json_group_array(json_object('id', a.researcher_id, 'name', p.name, 'role', COALESCE(a.author_role,p.role), 'institution', p.institution, 'photoUrl', p.photo_url)) FROM research_authors a JOIN researchers p ON p.id=a.researcher_id WHERE a.research_id=r.id ORDER BY a.author_order) AS authors_json,
    (SELECT json_group_array(json_object('id', d.id, 'type', d.document_type, 'title', d.title, 'url', d.url, 'contentType', d.content_type, 'byteSize', d.byte_size)) FROM research_documents d WHERE d.research_id=r.id ORDER BY d.sort_order) AS documents_json
    FROM research_works r WHERE r.workflow_status='PUBLISHED' ORDER BY r.featured DESC, r.sort_order, r.publish_date DESC`,
  ).all<Record<string, unknown>>();
  let items: Array<Record<string, unknown> & { researchers: unknown[] }> =
    rows.results.map((row) => ({
      ...row,
      keywords: parseList(String(row.keywords_json)),
      researchers: parseList(String(row.authors_json || "[]")),
      documents: parseList(String(row.documents_json || "[]")),
    }));
  if (status && status !== "ALL")
    items = items.filter(
      (item) => item["research_status"] === status.toUpperCase(),
    );
  if (search)
    items = items.filter((item) =>
      `${item["title"]} ${item["short_description"] || ""} ${item["abstract"] || ""} ${item["research_area"] || ""}`
        .toLowerCase()
        .includes(search),
    );
  const stats = {
    total: items.length,
    ongoing: items.filter((item) => item["research_status"] === "ONGOING")
      .length,
    completed: items.filter((item) => item["research_status"] === "COMPLETED")
      .length,
    published: items.filter((item) => item["research_status"] === "PUBLISHED")
      .length,
    researchers: new Set(
      items.flatMap((item) =>
        (item.researchers as Array<{ id?: string }>).map((author) => author.id),
      ),
    ).size,
  };
  return context.json(success({ items, stats }, context.get("requestId")));
});

platformRoutes.get("/research/:slug", async (context) => {
  const slug = z
    .string()
    .trim()
    .min(2)
    .max(260)
    .parse(context.req.param("slug"));
  const row = await context.env.DB.prepare(
    "SELECT * FROM research_works WHERE (slug=? OR id=?) AND workflow_status='PUBLISHED'",
  )
    .bind(slug, slug)
    .first<Record<string, unknown>>();
  if (!row)
    throw new AppError({
      code: "RESEARCH_NOT_FOUND",
      message: "The research work was not found.",
      status: 404,
    });
  const [authors, documents] = await Promise.all([
    context.env.DB.prepare(
      "SELECT p.id,p.name,COALESCE(a.author_role,p.role) AS role,p.institution,p.email,p.photo_url AS photoUrl FROM research_authors a JOIN researchers p ON p.id=a.researcher_id WHERE a.research_id=? ORDER BY a.author_order",
    )
      .bind(row.id)
      .all(),
    context.env.DB.prepare(
      "SELECT id,document_type AS type,title,url,content_type AS contentType,byte_size AS byteSize FROM research_documents WHERE research_id=? ORDER BY sort_order",
    )
      .bind(row.id)
      .all(),
  ]);
  return context.json(
    success(
      {
        ...row,
        keywords: parseList(String(row.keywords_json)),
        researchers: authors.results,
        documents: documents.results,
      },
      context.get("requestId"),
    ),
  );
});

platformRoutes.get(
  "/admin/research",
  sessionMiddleware({ required: true }),
  requirePermission("research.read"),
  async (context) => {
    const rows = await context.env.DB.prepare(
      "SELECT * FROM research_works WHERE workflow_status!='ARCHIVED' ORDER BY featured DESC,sort_order,updated_at DESC",
    ).all<Record<string, unknown>>();
    const proposals = await context.env.DB.prepare(
      `SELECT
    SUM(CASE WHEN status IN ('SUBMITTED','UNDER_REVIEW','REVISION_REQUESTED','NEEDS_INFORMATION') THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN status='APPROVED' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN status='REJECTED' THEN 1 ELSE 0 END) AS rejected
    FROM platform_submissions WHERE submission_type='RESEARCH'`,
    ).first<{
      pending: number | null;
      approved: number | null;
      rejected: number | null;
    }>();
    const items = [];
    for (const row of rows.results) {
      const [authors, docs] = await Promise.all([
        context.env.DB.prepare(
          "SELECT p.id,p.name,COALESCE(a.author_role,p.role) AS role,p.institution,p.email,p.photo_url AS photoUrl FROM research_authors a JOIN researchers p ON p.id=a.researcher_id WHERE a.research_id=? ORDER BY a.author_order",
        )
          .bind(row.id)
          .all(),
        context.env.DB.prepare(
          "SELECT id,document_type AS type,title,url,object_key AS objectKey,content_type AS contentType,byte_size AS byteSize,sort_order AS sortOrder FROM research_documents WHERE research_id=? ORDER BY sort_order",
        )
          .bind(row.id)
          .all(),
      ]);
      items.push({
        ...row,
        keywords: parseList(String(row.keywords_json)),
        researchers: authors.results,
        documents: docs.results,
      });
    }
    return context.json(
      success(
        {
          items,
          proposalStats: {
            pending: proposals?.pending ?? 0,
            approved: proposals?.approved ?? 0,
            rejected: proposals?.rejected ?? 0,
          },
        },
        context.get("requestId"),
      ),
    );
  },
);

platformRoutes.put(
  "/admin/research/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("research.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, researchSchema);
    const now = new Date().toISOString();
    if (
      input.workflowStatus === "PUBLISHED" &&
      !user.permissions.includes("content.publish")
    )
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "Publishing permission is required.",
        status: 403,
      });
    const slug = input.slug || slugify(input.title);
    const exists = await context.env.DB.prepare(
      "SELECT id FROM research_works WHERE id=?",
    )
      .bind(id)
      .first("id");
    const statements: D1PreparedStatement[] = [
      context.env.DB.prepare(
        `INSERT INTO research_works
    (id,title,slug,short_description,abstract,research_status,category,research_area,keywords_json,publication_title,journal_conference,publisher,publication_date,doi,isbn_issn,volume,issue,pages,citation,external_url,cover_url,workflow_status,featured,sort_order,publish_date,created_by,updated_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,slug=excluded.slug,short_description=excluded.short_description,abstract=excluded.abstract,research_status=excluded.research_status,category=excluded.category,research_area=excluded.research_area,keywords_json=excluded.keywords_json,publication_title=excluded.publication_title,journal_conference=excluded.journal_conference,publisher=excluded.publisher,publication_date=excluded.publication_date,doi=excluded.doi,isbn_issn=excluded.isbn_issn,volume=excluded.volume,issue=excluded.issue,pages=excluded.pages,citation=excluded.citation,external_url=excluded.external_url,cover_url=excluded.cover_url,workflow_status=excluded.workflow_status,featured=excluded.featured,sort_order=excluded.sort_order,publish_date=excluded.publish_date,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      ).bind(
        id,
        input.title,
        slug,
        optional(input.shortDescription),
        optional(input.abstract),
        input.researchStatus,
        optional(input.category),
        optional(input.researchArea),
        JSON.stringify(input.keywords),
        optional(input.publicationTitle),
        optional(input.journalConference),
        optional(input.publisher),
        optional(input.publicationDate),
        optional(input.doi),
        optional(input.isbnIssn),
        optional(input.volume),
        optional(input.issue),
        optional(input.pages),
        optional(input.citation),
        optional(input.externalUrl),
        optional(input.coverUrl),
        input.workflowStatus,
        input.featured ? 1 : 0,
        input.sortOrder,
        input.workflowStatus === "PUBLISHED" ? now : null,
        user.id,
        user.id,
        now,
        now,
      ),
    ];
    statements.push(
      context.env.DB.prepare(
        "DELETE FROM research_authors WHERE research_id=?",
      ).bind(id),
      context.env.DB.prepare(
        "DELETE FROM research_documents WHERE research_id=?",
      ).bind(id),
    );
    input.researchers.forEach((researcher, index) => {
      const researcherId = researcher.id || crypto.randomUUID();
      statements.push(
        context.env.DB.prepare(
          "INSERT INTO researchers (id,name,role,institution,email,photo_url,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,role=excluded.role,institution=excluded.institution,email=excluded.email,photo_url=excluded.photo_url,updated_at=excluded.updated_at",
        ).bind(
          researcherId,
          researcher.name,
          optional(researcher.role),
          optional(researcher.institution),
          optional(researcher.email),
          optional(researcher.photoUrl),
          now,
        ),
        context.env.DB.prepare(
          "INSERT INTO research_authors (research_id,researcher_id,author_order,author_role) VALUES (?,?,?,?)",
        ).bind(id, researcherId, index, optional(researcher.role)),
      );
    });
    input.documents.forEach((doc) =>
      statements.push(
        context.env.DB.prepare(
          "INSERT INTO research_documents (id,research_id,document_type,title,object_key,url,content_type,byte_size,sort_order) VALUES (?,?,?,?,?,?,?,?,?)",
        ).bind(
          doc.id || crypto.randomUUID(),
          id,
          doc.type,
          doc.title,
          optional(doc.objectKey),
          doc.url,
          optional(doc.contentType),
          doc.byteSize ?? null,
          doc.sortOrder,
        ),
      ),
    );
    statements.push(
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: exists
          ? "RESEARCH_UPDATED"
          : input.workflowStatus === "PUBLISHED"
            ? "RESEARCH_PUBLISHED"
            : "RESEARCH_CREATED",
        entityType: "RESEARCH_WORK",
        entityId: id,
        metadata: { workflowStatus: input.workflowStatus },
      }),
    );
    await context.env.DB.batch(statements);
    return context.json(
      success({ id, slug }, context.get("requestId")),
      exists ? 200 : 201,
    );
  },
);

platformRoutes.post(
  "/admin/research/:id/archive",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("research.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      "UPDATE research_works SET workflow_status='ARCHIVED',research_status='ARCHIVED',archived_at=?,updated_by=?,updated_at=? WHERE id=? AND workflow_status!='ARCHIVED' RETURNING id",
    )
      .bind(now, user.id, now, id)
      .first("id");
    if (!result)
      throw new AppError({
        code: "RESEARCH_NOT_FOUND",
        message: "Research work not found.",
        status: 404,
      });
    await createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "RESEARCH_ARCHIVED",
      entityType: "RESEARCH_WORK",
      entityId: id,
    }).run();
    return context.json(
      success({ id, status: "ARCHIVED" }, context.get("requestId")),
    );
  },
);

platformRoutes.get("/courses", async (context) => {
  const rows = await context.env.DB.prepare(
    "SELECT * FROM learning_courses WHERE status='PUBLISHED' ORDER BY featured DESC,sort_order,published_at DESC",
  ).all<Record<string, unknown>>();
  return context.json(
    success(
      rows.results.map((row) => ({
        ...row,
        price: Number(row.price_minor) / 100,
        tags: parseList(String(row.tags_json)),
        objectives: parseList(String(row.objectives_json)),
        prerequisites: parseList(String(row.prerequisites_json)),
      })),
      context.get("requestId"),
    ),
  );
});

async function courseDetail(
  db: D1Database,
  id: string,
  publishedOnly: boolean,
) {
  const course = await db
    .prepare(
      `SELECT * FROM learning_courses WHERE id=? ${publishedOnly ? "AND status='PUBLISHED'" : ""}`,
    )
    .bind(id)
    .first<Record<string, unknown>>();
  if (!course) return null;
  const modules = await db
    .prepare(
      `SELECT * FROM course_modules WHERE course_id=? AND archived_at IS NULL ${publishedOnly ? "AND status='PUBLISHED'" : ""} ORDER BY sort_order`,
    )
    .bind(id)
    .all<Record<string, unknown>>();
  const result = [];
  for (const module of modules.results) {
    const lessons = await db
      .prepare(
        `SELECT * FROM course_lessons WHERE module_id=? AND archived_at IS NULL ${publishedOnly ? "AND status='PUBLISHED'" : ""} ORDER BY sort_order`,
      )
      .bind(module.id)
      .all<Record<string, unknown>>();
    const lessonItems = [];
    for (const lesson of lessons.results) {
      const contents = await db
        .prepare(
          `SELECT * FROM lesson_contents WHERE lesson_id=? AND archived_at IS NULL ${publishedOnly ? "AND status='PUBLISHED'" : ""} ORDER BY sort_order`,
        )
        .bind(lesson.id)
        .all();
      lessonItems.push({ ...lesson, contents: contents.results });
    }
    result.push({ ...module, lessons: lessonItems });
  }
  return {
    ...course,
    price: Number(course.price_minor) / 100,
    tags: parseList(String(course.tags_json)),
    objectives: parseList(String(course.objectives_json)),
    prerequisites: parseList(String(course.prerequisites_json)),
    modules: result,
  };
}
platformRoutes.get("/courses/:id", async (context) => {
  const id = idSchema.parse(context.req.param("id"));
  const data = await courseDetail(context.env.DB, id, true);
  if (!data)
    throw new AppError({
      code: "COURSE_NOT_FOUND",
      message: "The course was not found.",
      status: 404,
    });
  return context.json(success(data, context.get("requestId")));
});
platformRoutes.get(
  "/admin/courses",
  sessionMiddleware({ required: true }),
  requirePermission("course.read"),
  async (context) => {
    const courses = await context.env.DB.prepare(
      "SELECT c.*,(SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id=c.id) AS enrollment_count,(SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id=c.id AND e.enrollment_status='COMPLETED') AS completed_count FROM learning_courses c WHERE c.status!='ARCHIVED' ORDER BY c.sort_order,c.updated_at DESC",
    ).all<Record<string, unknown>>();
    return context.json(
      success(
        courses.results.map((row) => ({
          ...row,
          price: Number(row.price_minor) / 100,
          tags: parseList(String(row.tags_json)),
          objectives: parseList(String(row.objectives_json)),
          prerequisites: parseList(String(row.prerequisites_json)),
        })),
        context.get("requestId"),
      ),
    );
  },
);
platformRoutes.get(
  "/admin/courses/:id",
  sessionMiddleware({ required: true }),
  requirePermission("course.read"),
  async (context) => {
    const data = await courseDetail(
      context.env.DB,
      idSchema.parse(context.req.param("id")),
      false,
    );
    if (!data)
      throw new AppError({
        code: "COURSE_NOT_FOUND",
        message: "Course not found.",
        status: 404,
      });
    return context.json(success(data, context.get("requestId")));
  },
);

platformRoutes.put(
  "/admin/courses/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, courseSchema);
    const now = new Date().toISOString();
    if (
      input.status === "PUBLISHED" &&
      !user.permissions.includes("content.publish")
    )
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "Publishing permission is required.",
        status: 403,
      });
    const exists = await context.env.DB.prepare(
      "SELECT id FROM learning_courses WHERE id=?",
    )
      .bind(id)
      .first("id");
    const data = {
      title: input.title,
      description: input.shortDescription,
      full_description: input.fullDescription,
      image_url: input.thumbnailUrl,
      instructor: input.instructor,
      instructor_bio: input.instructorBio,
      category: input.category,
      level: input.level.toLowerCase(),
      duration: input.duration,
      language: input.language,
      tags: input.tags,
      learning_objectives: input.objectives,
      prerequisites: input.prerequisites,
      is_paid: input.courseType === "PAID",
      price: input.price,
      currency: input.currency,
      payment_instructions: input.paymentInstructions,
      status: input.status.toLowerCase(),
    };
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO learning_courses(id,title,short_description,full_description,thumbnail_url,instructor,instructor_bio,category,level,duration,language,tags_json,objectives_json,prerequisites_json,course_type,price_minor,currency,payment_instructions,status,featured,sort_order,published_at,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,short_description=excluded.short_description,full_description=excluded.full_description,thumbnail_url=excluded.thumbnail_url,instructor=excluded.instructor,instructor_bio=excluded.instructor_bio,category=excluded.category,level=excluded.level,duration=excluded.duration,language=excluded.language,tags_json=excluded.tags_json,objectives_json=excluded.objectives_json,prerequisites_json=excluded.prerequisites_json,course_type=excluded.course_type,price_minor=excluded.price_minor,currency=excluded.currency,payment_instructions=excluded.payment_instructions,status=excluded.status,featured=excluded.featured,sort_order=excluded.sort_order,published_at=excluded.published_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      ).bind(
        id,
        input.title,
        optional(input.shortDescription),
        optional(input.fullDescription),
        optional(input.thumbnailUrl),
        optional(input.instructor),
        optional(input.instructorBio),
        optional(input.category),
        input.level,
        optional(input.duration),
        input.language,
        JSON.stringify(input.tags),
        JSON.stringify(input.objectives),
        JSON.stringify(input.prerequisites),
        input.courseType,
        Math.round(input.price * 100),
        input.currency,
        optional(input.paymentInstructions),
        input.status,
        input.featured ? 1 : 0,
        input.sortOrder,
        input.status === "PUBLISHED" ? now : null,
        user.id,
        user.id,
        now,
        now,
      ),
      context.env.DB.prepare(
        `INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at,published_at) VALUES(?,'courses',?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,sort_order=excluded.sort_order,updated_by=excluded.updated_by,updated_at=excluded.updated_at,published_at=excluded.published_at`,
      ).bind(
        id,
        JSON.stringify(data),
        input.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        input.sortOrder,
        user.id,
        user.id,
        now,
        now,
        input.status === "PUBLISHED" ? now : null,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: exists
          ? "COURSE_UPDATED"
          : input.status === "PUBLISHED"
            ? "COURSE_PUBLISHED"
            : "COURSE_CREATED",
        entityType: "COURSE",
        entityId: id,
      }),
    ]);
    return context.json(
      success({ id }, context.get("requestId")),
      exists ? 200 : 201,
    );
  },
);

platformRoutes.put(
  "/admin/course-modules/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, moduleSchema);
    const now = new Date().toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO course_modules(id,course_id,title,description,sort_order,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,sort_order=excluded.sort_order,status=excluded.status,updated_at=excluded.updated_at",
      ).bind(
        id,
        input.courseId,
        input.title,
        optional(input.description),
        input.sortOrder,
        input.status,
        now,
        now,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "COURSE_MODULE_SAVED",
        entityType: "COURSE_MODULE",
        entityId: id,
        metadata: { courseId: input.courseId },
      }),
    ]);
    return context.json(success({ id }, context.get("requestId")));
  },
);
platformRoutes.put(
  "/admin/course-lessons/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, lessonSchema);
    const now = new Date().toISOString();
    const moduleCourse = await context.env.DB.prepare(
      "SELECT course_id FROM course_modules WHERE id=?",
    )
      .bind(input.moduleId)
      .first<string>("course_id");
    if (moduleCourse !== input.courseId)
      throw new AppError({
        code: "INVALID_COURSE_MODULE",
        message: "The lesson module does not belong to this course.",
        status: 422,
      });
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO course_lessons(id,course_id,module_id,title,description,duration_minutes,sort_order,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET module_id=excluded.module_id,title=excluded.title,description=excluded.description,duration_minutes=excluded.duration_minutes,sort_order=excluded.sort_order,status=excluded.status,updated_at=excluded.updated_at",
      ).bind(
        id,
        input.courseId,
        input.moduleId,
        input.title,
        optional(input.description),
        input.durationMinutes ?? null,
        input.sortOrder,
        input.status,
        now,
        now,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "COURSE_LESSON_SAVED",
        entityType: "COURSE_LESSON",
        entityId: id,
        metadata: { courseId: input.courseId },
      }),
    ]);
    return context.json(success({ id }, context.get("requestId")));
  },
);
platformRoutes.put(
  "/admin/lesson-contents/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, lessonContentSchema);
    const now = new Date().toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO lesson_contents(id,lesson_id,content_type,title,body,url,object_key,content_type_metadata,byte_size,sort_order,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content_type=excluded.content_type,title=excluded.title,body=excluded.body,url=excluded.url,object_key=excluded.object_key,content_type_metadata=excluded.content_type_metadata,byte_size=excluded.byte_size,sort_order=excluded.sort_order,status=excluded.status,updated_at=excluded.updated_at",
      ).bind(
        id,
        input.lessonId,
        input.contentType,
        optional(input.title),
        optional(input.body),
        optional(input.url),
        optional(input.objectKey),
        optional(input.metadataContentType),
        input.byteSize ?? null,
        input.sortOrder,
        input.status,
        now,
        now,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "LESSON_CONTENT_SAVED",
        entityType: "LESSON_CONTENT",
        entityId: id,
      }),
    ]);
    return context.json(success({ id }, context.get("requestId")));
  },
);

platformRoutes.post(
  "/admin/course-content/:kind/:id/archive",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const kind = z
      .enum(["module", "lesson", "content"])
      .parse(context.req.param("kind"));
    const id = idSchema.parse(context.req.param("id"));
    const now = new Date().toISOString();
    const table =
      kind === "module"
        ? "course_modules"
        : kind === "lesson"
          ? "course_lessons"
          : "lesson_contents";
    await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE ${table} SET archived_at=?,updated_at=? WHERE id=? AND archived_at IS NULL`,
      ).bind(now, now, id),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `COURSE_${kind.toUpperCase()}_ARCHIVED`,
        entityType: `COURSE_${kind.toUpperCase()}`,
        entityId: id,
      }),
    ]);
    return context.json(
      success({ id, archived: true }, context.get("requestId")),
    );
  },
);

platformRoutes.post(
  "/learning/courses/:id/enroll",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const courseId = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, paymentSchema);
    const course = await context.env.DB.prepare(
      "SELECT * FROM learning_courses WHERE id=? AND status='PUBLISHED'",
    )
      .bind(courseId)
      .first<Record<string, unknown>>();
    if (!course)
      throw new AppError({
        code: "COURSE_NOT_FOUND",
        message: "The course is unavailable.",
        status: 404,
      });
    const existing = await context.env.DB.prepare(
      "SELECT id FROM course_enrollments WHERE course_id=? AND user_id=?",
    )
      .bind(courseId, user.id)
      .first("id");
    if (existing)
      throw new AppError({
        code: "ALREADY_ENROLLED",
        message: "You are already enrolled in this course.",
        status: 409,
      });
    const paid = course.course_type === "PAID";
    if (paid && !input.transactionReference && input.paymentMethod !== "Cash")
      throw new AppError({
        code: "TRANSACTION_ID_REQUIRED",
        message: "A transaction reference is required for paid enrollment.",
        status: 422,
      });
    const id = crypto.randomUUID(),
      legacyId = crypto.randomUUID(),
      now = new Date().toISOString();
    const legacy = {
      course_id: courseId,
      user_id: user.id,
      payment_method: paid ? input.paymentMethod : null,
      transaction_id: paid ? input.transactionReference : null,
      payment_status: paid ? "pending" : "confirmed",
      approval_status: paid ? "pending" : "approved",
      progress: {},
      completed: false,
    };
    const statements = [
      context.env.DB.prepare(
        "INSERT INTO website_submissions(id,submission_type,submitted_by,data_json,status,created_at,updated_at) VALUES(?,'course_registrations',?,?,'SUBMITTED',?,?)",
      ).bind(legacyId, user.id, JSON.stringify(legacy), now, now),
      context.env.DB.prepare(
        "INSERT INTO course_enrollments(id,legacy_submission_id,course_id,user_id,course_type,price_minor,currency,payment_status,enrollment_status,enrolled_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        legacyId,
        courseId,
        user.id,
        String(course.course_type),
        Number(course.price_minor),
        String(course.currency),
        paid ? "SUBMITTED" : "NOT_REQUIRED",
        paid ? "PENDING" : "ENROLLED",
        now,
        now,
        now,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "COURSE_ENROLLED",
        entityType: "COURSE_ENROLLMENT",
        entityId: id,
        metadata: { courseId, courseType: course.course_type },
      }),
    ];
    if (paid)
      statements.push(
        context.env.DB.prepare(
          "INSERT INTO learning_payments(id,domain_type,domain_id,user_id,expected_amount_minor,currency,payment_method,transaction_reference,status,submitted_at) VALUES(?,'COURSE',?,?,?,?,?,?, 'SUBMITTED',?)",
        ).bind(
          crypto.randomUUID(),
          id,
          user.id,
          Number(course.price_minor),
          String(course.currency),
          input.paymentMethod,
          input.transactionReference || null,
          now,
        ),
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id,
          status: paid ? "PENDING" : "ENROLLED",
          paymentStatus: paid ? "SUBMITTED" : "NOT_REQUIRED",
        },
        context.get("requestId"),
      ),
      201,
    );
  },
);

platformRoutes.post(
  "/learning/enrollments/:id/progress/:lessonId",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const enrollmentId = idSchema.parse(context.req.param("id")),
      lessonId = idSchema.parse(context.req.param("lessonId"));
    const input = await parseJson(
      context,
      z.object({ completed: z.boolean() }),
    );
    const enrollment = await context.env.DB.prepare(
      "SELECT * FROM course_enrollments WHERE id=? AND user_id=?",
    )
      .bind(enrollmentId, user.id)
      .first<Record<string, unknown>>();
    if (!enrollment)
      throw new AppError({
        code: "ENROLLMENT_NOT_FOUND",
        message: "Enrollment not found.",
        status: 404,
      });
    if (
      !["ENROLLED", "IN_PROGRESS", "COMPLETED"].includes(
        String(enrollment.enrollment_status),
      ) ||
      (enrollment.course_type === "PAID" &&
        enrollment.payment_status !== "VERIFIED")
    )
      throw new AppError({
        code: "ENROLLMENT_INACTIVE",
        message: "The enrollment is not active.",
        status: 403,
      });
    const valid = await context.env.DB.prepare(
      "SELECT id FROM course_lessons WHERE id=? AND course_id=? AND status='PUBLISHED' AND archived_at IS NULL",
    )
      .bind(lessonId, enrollment.course_id)
      .first("id");
    if (!valid)
      throw new AppError({
        code: "LESSON_NOT_FOUND",
        message: "Lesson not found.",
        status: 404,
      });
    if (input.completed)
      await context.env.DB.prepare(
        "INSERT OR REPLACE INTO course_progress(enrollment_id,lesson_id,completed_at) VALUES(?,?,?)",
      )
        .bind(enrollmentId, lessonId, new Date().toISOString())
        .run();
    else
      await context.env.DB.prepare(
        "DELETE FROM course_progress WHERE enrollment_id=? AND lesson_id=?",
      )
        .bind(enrollmentId, lessonId)
        .run();
    const total =
      (await context.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM course_lessons WHERE course_id=? AND status='PUBLISHED' AND archived_at IS NULL",
      )
        .bind(enrollment.course_id)
        .first<number>("count")) ?? 0;
    const done =
      (await context.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM course_progress p JOIN course_lessons l ON l.id=p.lesson_id WHERE p.enrollment_id=? AND l.status='PUBLISHED' AND l.archived_at IS NULL",
      )
        .bind(enrollmentId)
        .first<number>("count")) ?? 0;
    const complete = total > 0 && done === total,
      now = new Date().toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE course_enrollments SET enrollment_status=?,last_activity_at=?,completed_at=?,updated_at=? WHERE id=?",
      ).bind(
        complete ? "COMPLETED" : done > 0 ? "IN_PROGRESS" : "ENROLLED",
        now,
        complete ? now : null,
        now,
        enrollmentId,
      ),
      context.env.DB.prepare(
        "UPDATE website_submissions SET data_json=json_set(data_json,'$.completed',?,'$.completion_date',?),updated_at=? WHERE id=?",
      ).bind(
        complete,
        complete ? now : null,
        now,
        enrollment.legacy_submission_id,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: complete ? "COURSE_COMPLETED" : "COURSE_PROGRESS_UPDATED",
        entityType: "COURSE_ENROLLMENT",
        entityId: enrollmentId,
        metadata: { completedLessons: done, totalLessons: total },
      }),
    ]);
    return context.json(
      success(
        {
          completedLessons: done,
          totalLessons: total,
          percentage: total ? Math.round((done / total) * 100) : 0,
          status: complete
            ? "COMPLETED"
            : done > 0
              ? "IN_PROGRESS"
              : "ENROLLED",
        },
        context.get("requestId"),
      ),
    );
  },
);

platformRoutes.get(
  "/learning/dashboard",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const rows = await context.env.DB.prepare(
      "SELECT e.*,c.title,c.thumbnail_url,c.instructor,(SELECT COUNT(*) FROM course_lessons l WHERE l.course_id=e.course_id AND l.status='PUBLISHED' AND l.archived_at IS NULL) AS total_lessons,(SELECT COUNT(*) FROM course_progress p JOIN course_lessons l ON l.id=p.lesson_id WHERE p.enrollment_id=e.id AND l.archived_at IS NULL) AS completed_lessons,(SELECT json_group_array(p.lesson_id) FROM course_progress p JOIN course_lessons l ON l.id=p.lesson_id WHERE p.enrollment_id=e.id AND l.archived_at IS NULL) AS completed_lesson_ids_json FROM course_enrollments e JOIN learning_courses c ON c.id=e.course_id WHERE e.user_id=? ORDER BY e.enrolled_at DESC",
    )
      .bind(user.id)
      .all<Record<string, unknown>>();
    const courses = rows.results.map((row) => ({
      ...row,
      completed_lesson_ids: parseList(
        String(row.completed_lesson_ids_json || "[]"),
      ),
      progress: Number(row.total_lessons)
        ? Math.round(
            (Number(row.completed_lessons) / Number(row.total_lessons)) * 100,
          )
        : 0,
    }));
    const events = await context.env.DB.prepare(
      `SELECT r.*,e.title,e.slug,e.starts_at,e.ends_at,e.location_type,e.venue,e.online_platform,e.online_url,e.meeting_instructions,
       e.certificate_available,e.certificate_require_registration,e.certificate_require_payment,e.certificate_require_attendance,
       (SELECT status FROM certificate_requests c WHERE c.domain_type='EVENT' AND c.event_registration_id=r.id) AS certificate_status,
       CASE WHEN e.certificate_available=1 AND COALESCE(r.certificate_eligible_override,
         CASE WHEN (e.certificate_require_registration=0 OR r.registration_status='APPROVED')
          AND (e.certificate_require_payment=0 OR r.event_type='FREE' OR r.payment_status='VERIFIED')
          AND (e.certificate_require_attendance=0 OR r.attendance_status='PRESENT') THEN 1 ELSE 0 END)=1 THEN 1 ELSE 0 END AS certificate_eligible
       FROM event_registrations r JOIN managed_events e ON e.id=r.event_id WHERE r.user_id=? ORDER BY r.registered_at DESC`,
    )
      .bind(user.id)
      .all();
    const certificates = await context.env.DB.prepare(
      "SELECT id,certificate_number,status,course_title,issued_at,certificate_url FROM certificates WHERE user_id=? ORDER BY issued_at DESC",
    )
      .bind(user.id)
      .all();
    return context.json(
      success(
        { courses, events: events.results, certificates: certificates.results },
        context.get("requestId"),
      ),
    );
  },
);

platformRoutes.get(
  "/admin/enrollments",
  sessionMiddleware({ required: true }),
  requirePermission("course.read"),
  async (context) => {
    const rows = await context.env.DB.prepare(
      "SELECT e.*,u.display_name AS student,u.primary_email AS email,c.title,(SELECT COUNT(*) FROM course_lessons l WHERE l.course_id=e.course_id AND l.status='PUBLISHED' AND l.archived_at IS NULL) AS total_lessons,(SELECT COUNT(*) FROM course_progress p JOIN course_lessons l ON l.id=p.lesson_id WHERE p.enrollment_id=e.id AND l.archived_at IS NULL) AS completed_lessons,(SELECT status FROM certificate_requests r WHERE r.enrollment_id=e.legacy_submission_id) AS certificate_status FROM course_enrollments e JOIN users u ON u.id=e.user_id JOIN learning_courses c ON c.id=e.course_id ORDER BY e.enrolled_at DESC LIMIT 1000",
    ).all<Record<string, unknown>>();
    return context.json(
      success(
        rows.results.map((row) => ({
          ...row,
          price: Number(row.price_minor) / 100,
          progress: Number(row.total_lessons)
            ? Math.round(
                (Number(row.completed_lessons) / Number(row.total_lessons)) *
                  100,
              )
            : 0,
        })),
        context.get("requestId"),
      ),
    );
  },
);
platformRoutes.post(
  "/admin/enrollments/:id/decision",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["course.manage", "finance.verify"]),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, decisionSchema);
    const enrollment = await context.env.DB.prepare(
      "SELECT * FROM course_enrollments WHERE id=?",
    )
      .bind(id)
      .first<Record<string, unknown>>();
    if (!enrollment)
      throw new AppError({
        code: "ENROLLMENT_NOT_FOUND",
        message: "Enrollment not found.",
        status: 404,
      });
    const now = new Date().toISOString();
    let enrollmentStatus = String(enrollment.enrollment_status),
      paymentStatus = String(enrollment.payment_status);
    if (input.action === "VERIFY_PAYMENT") {
      if (!user.permissions.includes("finance.verify"))
        throw new AppError({
          code: "PERMISSION_DENIED",
          message: "Payment verification permission is required.",
          status: 403,
        });
      paymentStatus = "VERIFIED";
      enrollmentStatus = "ENROLLED";
    } else if (input.action === "APPROVE") enrollmentStatus = "ENROLLED";
    else if (input.action === "REJECT") {
      enrollmentStatus = "CANCELLED";
      paymentStatus =
        paymentStatus === "SUBMITTED" ? "REJECTED" : paymentStatus;
    } else if (input.action === "CANCEL") enrollmentStatus = "CANCELLED";
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE course_enrollments SET enrollment_status=?,payment_status=?,cancelled_at=?,updated_at=? WHERE id=?",
      ).bind(
        enrollmentStatus,
        paymentStatus,
        enrollmentStatus === "CANCELLED" ? now : null,
        now,
        id,
      ),
      context.env.DB.prepare(
        "UPDATE website_submissions SET data_json=json_set(data_json,'$.payment_status',?,'$.approval_status',?),updated_at=? WHERE id=?",
      ).bind(
        paymentStatus === "VERIFIED"
          ? "confirmed"
          : paymentStatus.toLowerCase(),
        enrollmentStatus === "ENROLLED"
          ? "approved"
          : enrollmentStatus.toLowerCase(),
        now,
        enrollment.legacy_submission_id,
      ),
      context.env.DB.prepare(
        "UPDATE learning_payments SET status=?,verified_at=?,verified_by=?,decision_reason=? WHERE domain_type='COURSE' AND domain_id=?",
      ).bind(
        paymentStatus,
        paymentStatus === "VERIFIED" ? now : null,
        paymentStatus === "VERIFIED" ? user.id : null,
        optional(input.reason),
        id,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `ENROLLMENT_${input.action}`,
        entityType: "COURSE_ENROLLMENT",
        entityId: id,
        reason: input.reason,
      }),
    ]);
    return context.json(
      success(
        { id, enrollmentStatus, paymentStatus },
        context.get("requestId"),
      ),
    );
  },
);

platformRoutes.get(
  "/admin/event-registrations",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const eventId = context.req.query("eventId");
    const rows = await context.env.DB.prepare(
      `SELECT r.*,e.title AS event_title,p.id AS payment_id,p.payment_method,p.transaction_reference,p.payer_phone AS payment_payer_phone,p.status AS provider_payment_status,
       (SELECT status FROM certificate_requests c WHERE c.domain_type='EVENT' AND c.event_registration_id=r.id) AS certificate_status
       FROM event_registrations r JOIN managed_events e ON e.id=r.event_id
       LEFT JOIN learning_payments p ON p.domain_type='EVENT' AND p.domain_id=r.id
       WHERE (? IS NULL OR r.event_id=?) ORDER BY r.registered_at DESC LIMIT 1000`,
    ).bind(eventId || null, eventId || null).all();
    return context.json(success(rows.results, context.get("requestId")));
  },
);
platformRoutes.get(
  "/admin/event-registrations.csv",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const eventId = idSchema.parse(context.req.query("eventId"));
    const rows = await context.env.DB.prepare(
      `SELECT r.participant_name,r.email,r.phone,r.registration_status,r.payment_status,r.attendance_status,r.registered_at,
       p.payment_method,p.transaction_reference,p.payer_phone FROM event_registrations r
       LEFT JOIN learning_payments p ON p.domain_type='EVENT' AND p.domain_id=r.id WHERE r.event_id=? ORDER BY r.registered_at`,
    ).bind(eventId).all<Record<string, unknown>>();
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/gu, '""')}"`;
    const keys = ["participant_name","email","phone","registration_status","payment_status","attendance_status","registered_at","payment_method","transaction_reference","payer_phone"];
    const csv = [keys.join(","), ...rows.results.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\r\n");
    return new Response(`\ufeff${csv}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="event-${eventId}-participants.csv"` } });
  },
);
platformRoutes.post(
  "/learning/events/:id/register",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const eventId = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, eventRegistrationSchema);
    const event = await context.env.DB.prepare(
      "SELECT * FROM managed_events WHERE id=? AND workflow_status='PUBLISHED'",
    ).bind(eventId).first<Record<string, unknown>>();
    if (!event)
      throw new AppError({
        code: "EVENT_NOT_FOUND",
        message: "The event is unavailable.",
        status: 404,
      });
    if (Number(event.registration_required) !== 1 || event.registration_mode !== "INTERNAL")
      throw new AppError({ code: "INTERNAL_REGISTRATION_UNAVAILABLE", message: "This event does not accept internal registrations.", status: 409 });
    const nowTime = Date.now();
    if (event.registration_status === "CLOSED" || (event.registration_deadline && new Date(String(event.registration_deadline)).getTime() < nowTime) || new Date(String(event.ends_at)).getTime() < nowTime)
      throw new AppError({ code: "REGISTRATION_CLOSED", message: "Registration is closed for this event.", status: 409 });
    const paid = Number(event.payment_required) === 1;
    const fee = Number(event.fee_minor || 0);
    if (
      paid &&
      (!input.paymentMethod || !input.transactionReference || !input.payerPhone)
    )
      throw new AppError({
        code: "PAYMENT_REFERENCE_REQUIRED",
        message: "Paid event registration requires the bKash transaction ID and payer number.",
        status: 422,
      });
    const duplicate = await context.env.DB.prepare(
      "SELECT id FROM event_registrations WHERE event_id=? AND user_id=?",
    )
      .bind(eventId, user.id)
      .first("id");
    if (duplicate)
      throw new AppError({
        code: "ALREADY_REGISTERED",
        message: "You are already registered for this event.",
        status: 409,
      });
    if (paid) {
      const duplicatePayment = await context.env.DB.prepare(
        "SELECT id FROM learning_payments WHERE payment_method=? AND transaction_reference=?",
      ).bind(input.paymentMethod, input.transactionReference).first("id");
      if (duplicatePayment) throw new AppError({ code: "DUPLICATE_TRANSACTION", message: "This transaction ID has already been submitted.", status: 409 });
    }
    const capacity = Math.max(0, Number(event.max_participants || 0));
    if (capacity > 0 && Number(event.registration_capacity_override) !== 1) {
      const reserved =
        (await context.env.DB.prepare(
          "SELECT COUNT(*) AS count FROM event_registrations WHERE event_id=? AND registration_status IN ('PENDING','APPROVED')",
        )
          .bind(eventId)
          .first<number>("count")) ?? 0;
      if (reserved >= capacity)
        throw new AppError({
          code: "EVENT_FULL",
          message: "Registration is closed because this event is full.",
          status: 409,
        });
    }
    const id = crypto.randomUUID(),
      legacyId = crypto.randomUUID(),
      now = new Date().toISOString();
    const legacy = {
      event_id: eventId,
      user_id: user.id,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      department: input.department || null,
      payment_method: paid ? input.paymentMethod : null,
      transaction_id: paid ? input.transactionReference : null,
      payment_status: paid ? "pending" : "confirmed",
      approval_status: paid ? "pending" : "approved",
    };
    const statements = [
      context.env.DB.prepare(
        "INSERT INTO website_submissions(id,submission_type,submitted_by,data_json,status,created_at,updated_at) VALUES(?,'event_registrations',?,?,'SUBMITTED',?,?)",
      ).bind(legacyId, user.id, JSON.stringify(legacy), now, now),
      context.env.DB.prepare(
        "INSERT INTO event_registrations(id,legacy_submission_id,event_id,user_id,participant_name,email,phone,event_type,fee_minor,currency,payment_status,registration_status,payer_phone,registered_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        legacyId,
        eventId,
        user.id,
        input.name,
        input.email,
        optional(input.phone),
        paid ? "PAID" : "FREE",
        paid ? fee : 0,
        String(event.currency || "BDT"),
        paid ? "SUBMITTED" : "NOT_REQUIRED",
        paid ? "PENDING" : "APPROVED",
        paid ? input.payerPhone : null,
        now,
        now,
      ),
      context.env.DB.prepare(
        "INSERT INTO event_registration_events(id,registration_id,event_id,actor_user_id,event_type,to_registration_status,to_payment_status,to_attendance_status,note,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(crypto.randomUUID(), id, eventId, user.id, "REGISTERED", paid ? "PENDING" : "APPROVED", paid ? "SUBMITTED" : "NOT_REQUIRED", "NOT_MARKED", "Participant submitted registration.", context.get("requestId"), now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "EVENT_REGISTERED",
        entityType: "EVENT_REGISTRATION",
        entityId: id,
        metadata: { eventId, eventType: paid ? "PAID" : "FREE" },
      }),
    ];
    if (paid) {
      const paymentId = crypto.randomUUID();
      statements.push(
        context.env.DB.prepare(
          "INSERT INTO learning_payments(id,domain_type,domain_id,user_id,expected_amount_minor,currency,payment_method,transaction_reference,payer_phone,status,submitted_at,updated_at) VALUES(?,'EVENT',?,?,?,?,?,?,?,'SUBMITTED',?,?)",
        ).bind(paymentId, id, user.id, fee, String(event.currency || "BDT"), input.paymentMethod, input.transactionReference, input.payerPhone, now, now),
        context.env.DB.prepare(
          "INSERT INTO learning_payment_events(id,payment_id,registration_id,actor_user_id,event_type,to_status,transaction_reference,note,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
        ).bind(crypto.randomUUID(), paymentId, id, user.id, "SUBMITTED", "SUBMITTED", input.transactionReference, "Participant submitted bKash payment details.", context.get("requestId"), now),
      );
    }
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id,
          registeredAt: now,
          paymentStatus: paid ? "SUBMITTED" : "NOT_REQUIRED",
          registrationStatus: paid ? "PENDING" : "APPROVED",
        },
        context.get("requestId"),
      ),
      201,
    );
  },
);
platformRoutes.post(
  "/admin/event-registrations/:id/decision",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["event.manage", "finance.verify"]),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, decisionSchema);
    const row = await context.env.DB.prepare(
      "SELECT * FROM event_registrations WHERE id=?",
    )
      .bind(id)
      .first<Record<string, unknown>>();
    if (!row)
      throw new AppError({
        code: "EVENT_REGISTRATION_NOT_FOUND",
        message: "Registration not found.",
        status: 404,
      });
    let registration = String(row.registration_status),
      payment = String(row.payment_status),
      attendance = String(row.attendance_status);
    if (input.action === "VERIFY_PAYMENT") {
      if (!user.permissions.includes("finance.verify"))
        throw new AppError({
          code: "PERMISSION_DENIED",
          message: "Payment verification permission is required.",
          status: 403,
        });
      payment = "VERIFIED";
      registration = "APPROVED";
    } else if (input.action === "APPROVE") registration = "APPROVED";
    else if (input.action === "REJECT") {
      registration = "REJECTED";
      if (["PENDING", "SUBMITTED"].includes(payment)) payment = "REJECTED";
    }
    else if (input.action === "CANCEL") registration = "CANCELLED";
    else if (input.action === "PRESENT") attendance = "PRESENT";
    else if (input.action === "ABSENT") attendance = "ABSENT";
    const now = new Date().toISOString();
    const paymentRow = await context.env.DB.prepare("SELECT id,status,transaction_reference FROM learning_payments WHERE domain_type='EVENT' AND domain_id=?").bind(id).first<Record<string, unknown>>();
    const statements = [
      context.env.DB.prepare(
        "UPDATE event_registrations SET registration_status=?,payment_status=?,attendance_status=?,attendance_marked_at=?,attendance_marked_by=?,reviewed_at=?,reviewed_by=?,updated_at=? WHERE id=?",
      ).bind(registration, payment, attendance, ["PRESENT","ABSENT"].includes(attendance) ? now : row.attendance_marked_at, ["PRESENT","ABSENT"].includes(attendance) ? user.id : row.attendance_marked_by, now, user.id, now, id),
      context.env.DB.prepare(
        "INSERT INTO event_registration_events(id,registration_id,event_id,actor_user_id,event_type,from_registration_status,to_registration_status,from_payment_status,to_payment_status,from_attendance_status,to_attendance_status,note,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(crypto.randomUUID(), id, row.event_id, user.id, input.action, row.registration_status, registration, row.payment_status, payment, row.attendance_status, attendance, input.reason || null, context.get("requestId"), now),
      context.env.DB.prepare(
        `INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
         VALUES(?,?,?, ?,?,'/dashboard','EVENT_REGISTRATION',?,'NORMAL',?)`,
      ).bind(crypto.randomUUID(), row.user_id, `EVENT_${input.action}`, "Event registration updated", `Your registration is now ${registration.toLowerCase()}, payment ${payment.toLowerCase()}, and attendance ${attendance.toLowerCase().replace(/_/gu," ")}.`, id, `event-registration:${id}:${input.action}:${now}`),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `EVENT_REGISTRATION_${input.action}`,
        entityType: "EVENT_REGISTRATION",
        entityId: id,
        reason: input.reason,
      }),
    ];
    if (paymentRow && payment !== row.payment_status) statements.push(
      context.env.DB.prepare("UPDATE learning_payments SET status=?,verified_at=?,verified_by=?,decision_reason=?,updated_at=? WHERE id=?")
        .bind(payment, payment === "VERIFIED" ? now : null, payment === "VERIFIED" ? user.id : null, input.reason || null, now, paymentRow.id),
      context.env.DB.prepare("INSERT INTO learning_payment_events(id,payment_id,registration_id,actor_user_id,event_type,from_status,to_status,transaction_reference,note,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), paymentRow.id, id, user.id, input.action, paymentRow.status, payment, paymentRow.transaction_reference, input.reason || null, context.get("requestId"), now),
    );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id,
          registrationStatus: registration,
          paymentStatus: payment,
          attendanceStatus: attendance,
        },
        context.get("requestId"),
      ),
    );
  },
);
platformRoutes.get(
  "/admin/event-registrations/:id/history",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const id = idSchema.parse(context.req.param("id"));
    const [registration, payment] = await Promise.all([
      context.env.DB.prepare("SELECT h.*,u.display_name AS actor FROM event_registration_events h LEFT JOIN users u ON u.id=h.actor_user_id WHERE h.registration_id=? ORDER BY h.created_at DESC").bind(id).all(),
      context.env.DB.prepare("SELECT h.*,u.display_name AS actor FROM learning_payment_events h LEFT JOIN users u ON u.id=h.actor_user_id WHERE h.registration_id=? ORDER BY h.created_at DESC").bind(id).all(),
    ]);
    return context.json(success({ registration: registration.results, payment: payment.results }, context.get("requestId")));
  },
);
