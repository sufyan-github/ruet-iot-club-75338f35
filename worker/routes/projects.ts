import { Hono } from "hono";
import { z } from "zod";
import { csrfMiddleware, requireAuth, sessionMiddleware } from "../auth/session";
import { parseJson } from "../auth/validation";
import { createAuditStatement } from "../db/audit";
import { success } from "../lib/api-envelope";
import { AppError } from "../lib/app-error";
import { requirePermission } from "../middleware/authorization";
import type { AppEnvironment } from "../types";

const PROJECT_COLLECTION = "projects";
const managedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const projectStatusSchema = z.enum(["PLANNED", "ONGOING", "COMPLETED"]);
const publicationStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
const shortText = z.string().trim().max(200).default("");
const textList = z.array(z.string().trim().min(1).max(200)).max(50).default([]);
const optionalDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u).optional();
const optionalUrl = z.string().trim().url().max(1000).optional();
const mediaReferenceSchema = z.object({
  key: z.string().trim().min(1).max(512).regex(/^website\/[a-zA-Z0-9/._-]+$/u),
  url: z.string().trim().min(1).max(800),
  originalName: z.string().trim().min(1).max(255).optional(),
  alt: z.string().trim().max(300).optional(),
  contentType: z.string().trim().max(100).optional(),
  byteSize: z.number().int().positive().max(5 * 1024 * 1024).optional(),
  width: z.number().int().positive().max(50000).optional(),
  height: z.number().int().positive().max(50000).optional(),
}).strict();
const projectWriteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(220).optional(),
  shortDescription: z.string().trim().min(1).max(500),
  description: z.string().trim().max(10000).default(""),
  projectStatus: projectStatusSchema,
  publicationStatus: publicationStatusSchema.default("DRAFT"),
  category: z.string().trim().max(100).default(""),
  projectLead: shortText,
  teamMembers: textList,
  startDate: optionalDate,
  expectedCompletionDate: optionalDate,
  actualCompletionDate: optionalDate,
  coverImage: mediaReferenceSchema.nullable().default(null),
  gallery: z.array(mediaReferenceSchema).max(20).default([]),
  technologies: textList,
  tags: textList,
  objectives: textList,
  features: textList,
  outcomes: z.string().trim().max(10000).default(""),
  partners: textList,
  projectUrl: optionalUrl,
  githubUrl: optionalUrl,
  demoUrl: optionalUrl,
  sortOrder: z.number().int().min(-100000).max(100000).default(0),
  advanced: z.record(z.string(), z.unknown()).refine((value) => JSON.stringify(value).length <= 8 * 1024, "Advanced project data is too large.").default({}),
}).superRefine((value, context) => {
  if (value.actualCompletionDate && value.projectStatus !== "COMPLETED") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["actualCompletionDate"], message: "Actual completion date is only available for completed projects." });
  }
  if (value.startDate && value.expectedCompletionDate && value.expectedCompletionDate < value.startDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedCompletionDate"], message: "Expected completion cannot be before the start date." });
  }
});
const listQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  projectStatus: z.union([projectStatusSchema, z.literal("")]).default(""),
  publicationStatus: z.union([z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]), z.literal("")]).default(""),
  category: z.string().trim().max(100).default(""),
  lead: z.string().trim().max(200).default(""),
  sort: z.enum(["newest", "oldest", "updated", "alphabetical"]).default("updated"),
});

interface ProjectRow {
  id: string;
  data_json: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sort_order: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
}

interface MediaRow {
  object_key: string;
  original_name: string;
  content_type: string;
  byte_size: number;
}

function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 180) || "project";
}

async function uniqueSlug(db: D1Database, requested: string | undefined, title: string, projectId: string): Promise<string> {
  const base = slugify(requested || title);
  const rows = await db.prepare(
    "SELECT id, data_json FROM website_content_items WHERE collection_key = ? AND id != ?",
  ).bind(PROJECT_COLLECTION, projectId).all<{ id: string; data_json: string }>();
  const existingSlugs = new Set(rows.results.map((row) => {
    const data = JSON.parse(row.data_json) as Record<string, unknown>;
    return slugify(typeof data.slug === "string" ? data.slug : String(data.title ?? row.id));
  }));
  for (let suffix = 1; suffix <= 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!existingSlugs.has(candidate)) return candidate;
  }
  throw new AppError({ code: "PROJECT_SLUG_UNAVAILABLE", message: "A unique project URL could not be generated. Choose a different slug.", status: 409 });
}

function storedProject(row: ProjectRow): Record<string, unknown> {
  const data = JSON.parse(row.data_json) as Record<string, unknown>;
  const legacyStatus = typeof data.project_status === "string" ? data.project_status : typeof data.status === "string" ? data.status : "PLANNED";
  return {
    id: row.id,
    title: String(data.title ?? "Untitled project"),
    slug: String(data.slug ?? slugify(String(data.title ?? row.id))),
    shortDescription: String(data.short_description ?? data.shortDescription ?? data.description ?? ""),
    description: String(data.description ?? ""),
    projectStatus: projectStatusSchema.catch("PLANNED").parse(String(legacyStatus).toUpperCase()),
    publicationStatus: row.status,
    category: String(data.category ?? ""),
    projectLead: String(data.project_lead ?? data.projectLead ?? ""),
    teamMembers: Array.isArray(data.team_members) ? data.team_members : [],
    startDate: data.start_date ?? null,
    expectedCompletionDate: data.expected_completion_date ?? null,
    actualCompletionDate: data.actual_completion_date ?? null,
    coverImage: data.cover_image ?? (data.image_key ? { key: data.image_key, url: data.image_url, alt: data.image_alt } : null),
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    technologies: Array.isArray(data.technologies) ? data.technologies : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    objectives: Array.isArray(data.objectives) ? data.objectives : [],
    features: Array.isArray(data.features) ? data.features : [],
    outcomes: String(data.outcomes ?? ""),
    partners: Array.isArray(data.partners) ? data.partners : [],
    projectUrl: data.project_url ?? null,
    githubUrl: data.github_url ?? data.github_link ?? null,
    demoUrl: data.demo_url ?? data.demo_link ?? null,
    sortOrder: row.sort_order,
    advanced: data.advanced && typeof data.advanced === "object" && !Array.isArray(data.advanced) ? data.advanced : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
  };
}

async function canonicalImages(env: Env, input: z.infer<typeof projectWriteSchema>): Promise<{ cover: Record<string, unknown> | null; gallery: Array<Record<string, unknown>> }> {
  const byKey = new Map<string, z.infer<typeof mediaReferenceSchema>>();
  for (const image of [...input.gallery, ...(input.coverImage ? [input.coverImage] : [])]) byKey.set(image.key, image);
  if (byKey.size === 0) return { cover: null, gallery: [] };
  const keys = [...byKey.keys()];
  const placeholders = keys.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `SELECT object_key, original_name, content_type, byte_size FROM website_media_objects
     WHERE archived_at IS NULL AND object_key IN (${placeholders})`,
  ).bind(...keys).all<MediaRow>();
  const rows = new Map(result.results.map((row) => [row.object_key, row]));
  const objectHeads = await Promise.all(keys.map((key) => env.STORAGE.head(key)));
  const canonical = new Map<string, Record<string, unknown>>();
  keys.forEach((key, index) => {
    const row = rows.get(key);
    const supplied = byKey.get(key)!;
    if (!row || !managedImageTypes.has(row.content_type) || !objectHeads[index]) {
      throw new AppError({ code: "PROJECT_MEDIA_NOT_FOUND", message: "One of the selected project images is no longer available. Remove it or choose another image.", status: 422 });
    }
    const expectedUrl = `/api/v1/media/files/${key}`;
    if (supplied.url !== expectedUrl) {
      throw new AppError({ code: "INVALID_PROJECT_MEDIA", message: "One of the selected project image references is invalid.", status: 422 });
    }
    canonical.set(key, {
      key,
      url: expectedUrl,
      originalName: row.original_name,
      contentType: row.content_type,
      byteSize: row.byte_size,
      ...(supplied.alt ? { alt: supplied.alt } : {}),
      ...(supplied.width ? { width: supplied.width } : {}),
      ...(supplied.height ? { height: supplied.height } : {}),
    });
  });
  const galleryKeys = [...new Set(input.gallery.map((image) => image.key))];
  if (input.coverImage && !galleryKeys.includes(input.coverImage.key)) galleryKeys.unshift(input.coverImage.key);
  return {
    cover: input.coverImage ? canonical.get(input.coverImage.key) ?? null : null,
    gallery: galleryKeys.map((key) => canonical.get(key)!).filter(Boolean),
  };
}

function canonicalData(input: z.infer<typeof projectWriteSchema>, slug: string, images: Awaited<ReturnType<typeof canonicalImages>>): Record<string, unknown> {
  return {
    ...input.advanced,
    title: input.title,
    slug,
    short_description: input.shortDescription,
    description: input.description,
    project_status: input.projectStatus,
    category: input.category,
    project_lead: input.projectLead,
    team_members: input.teamMembers,
    start_date: input.startDate ?? null,
    expected_completion_date: input.expectedCompletionDate ?? null,
    actual_completion_date: input.actualCompletionDate ?? null,
    cover_image: images.cover,
    gallery: images.gallery,
    technologies: input.technologies,
    tags: input.tags,
    objectives: input.objectives,
    features: input.features,
    outcomes: input.outcomes,
    partners: input.partners,
    project_url: input.projectUrl ?? null,
    github_url: input.githubUrl ?? null,
    demo_url: input.demoUrl ?? null,
    advanced: input.advanced,
  };
}

function allProjectRows(db: D1Database): Promise<D1Result<ProjectRow>> {
  return db.prepare(
    `SELECT id, data_json, status, sort_order, created_at, updated_at, published_at, archived_at
     FROM website_content_items WHERE collection_key = ?`,
  ).bind(PROJECT_COLLECTION).all<ProjectRow>();
}

export const projectRoutes = new Hono<AppEnvironment>();

projectRoutes.get("/projects", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT id, data_json, status, sort_order, created_at, updated_at, published_at, archived_at
     FROM website_content_items WHERE collection_key = ? AND status = 'PUBLISHED'
     ORDER BY sort_order ASC, published_at DESC`,
  ).bind(PROJECT_COLLECTION).all<ProjectRow>();
  return context.json(success({ items: result.results.map(storedProject), count: result.results.length }, context.get("requestId")));
});

projectRoutes.get("/projects/:slug", async (context) => {
  const slug = slugify(context.req.param("slug"));
  const result = await context.env.DB.prepare(
    `SELECT id, data_json, status, sort_order, created_at, updated_at, published_at, archived_at
     FROM website_content_items WHERE collection_key = ? AND status = 'PUBLISHED'`,
  ).bind(PROJECT_COLLECTION).all<ProjectRow>();
  const project = result.results.map(storedProject).find((item) => item.slug === slug);
  if (!project) throw new AppError({ code: "PROJECT_NOT_FOUND", message: "The project was not found.", status: 404 });
  return context.json(success(project, context.get("requestId")));
});

projectRoutes.get("/admin/projects", sessionMiddleware({ required: true }), requirePermission("project.read"), async (context) => {
  const parsed = listQuerySchema.safeParse({
    search: context.req.query("search") ?? "",
    projectStatus: context.req.query("projectStatus") ?? "",
    publicationStatus: context.req.query("publicationStatus") ?? "",
    category: context.req.query("category") ?? "",
    lead: context.req.query("lead") ?? "",
    sort: context.req.query("sort") ?? "updated",
  });
  if (!parsed.success) throw new AppError({ code: "INVALID_PROJECT_FILTER", message: "One or more project filters are invalid.", status: 422 });
  const result = await allProjectRows(context.env.DB);
  const all = result.results.map(storedProject) as Array<Record<string, unknown>>;
  const query = parsed.data.search.toLowerCase();
  const items = all.filter((project) => {
    const searchable = [project.title, project.shortDescription, project.description, project.category, project.projectLead, ...(project.tags as unknown[] ?? [])].join(" ").toLowerCase();
    return (!query || searchable.includes(query))
      && (!parsed.data.projectStatus || project.projectStatus === parsed.data.projectStatus)
      && (!parsed.data.publicationStatus || project.publicationStatus === parsed.data.publicationStatus)
      && (!parsed.data.category || project.category === parsed.data.category)
      && (!parsed.data.lead || project.projectLead === parsed.data.lead);
  });
  items.sort((left, right) => {
    if (parsed.data.sort === "alphabetical") return String(left.title).localeCompare(String(right.title));
    if (parsed.data.sort === "oldest") return String(left.createdAt).localeCompare(String(right.createdAt));
    if (parsed.data.sort === "newest") return String(right.createdAt).localeCompare(String(left.createdAt));
    return String(right.updatedAt).localeCompare(String(left.updatedAt));
  });
  const stats = {
    total: all.length,
    ongoing: all.filter((project) => project.projectStatus === "ONGOING").length,
    completed: all.filter((project) => project.projectStatus === "COMPLETED").length,
    planned: all.filter((project) => project.projectStatus === "PLANNED").length,
    drafts: all.filter((project) => project.publicationStatus === "DRAFT").length,
  };
  const categories = [...new Set(all.map((project) => String(project.category)).filter(Boolean))].sort();
  const leads = [...new Set(all.map((project) => String(project.projectLead)).filter(Boolean))].sort();
  return context.json(success({ items, stats, facets: { categories, leads } }, context.get("requestId")));
});

projectRoutes.get("/admin/projects/options", sessionMiddleware({ required: true }), requirePermission("project.read"), async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT id, collection_key, data_json FROM website_content_items
     WHERE collection_key IN ('team_members', 'partners') AND status != 'ARCHIVED'
     ORDER BY sort_order ASC, created_at DESC LIMIT 500`,
  ).all<{ id: string; collection_key: string; data_json: string }>();
  const values = result.results.map((row) => {
    const data = JSON.parse(row.data_json) as Record<string, unknown>;
    return { id: row.id, type: row.collection_key, name: String(data.name ?? data.title ?? data.full_name ?? "Unnamed") };
  });
  return context.json(success({ people: values.filter((value) => value.type === "team_members"), partners: values.filter((value) => value.type === "partners") }, context.get("requestId")));
});

projectRoutes.get("/admin/projects/:id", sessionMiddleware({ required: true }), requirePermission("project.read"), async (context) => {
  const id = z.string().trim().min(1).max(100).parse(context.req.param("id"));
  const row = await context.env.DB.prepare(
    `SELECT id, data_json, status, sort_order, created_at, updated_at, published_at, archived_at
     FROM website_content_items WHERE id = ? AND collection_key = ? LIMIT 1`,
  ).bind(id, PROJECT_COLLECTION).first<ProjectRow>();
  if (!row) throw new AppError({ code: "PROJECT_NOT_FOUND", message: "The project was not found.", status: 404 });
  return context.json(success(storedProject(row), context.get("requestId")));
});

projectRoutes.put(
  "/admin/projects/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("project.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = z.string().trim().min(1).max(100).parse(context.req.param("id"));
    const input = await parseJson(context, projectWriteSchema);
    const existing = await context.env.DB.prepare(
      "SELECT status FROM website_content_items WHERE id = ? AND collection_key = ?",
    ).bind(id, PROJECT_COLLECTION).first<{ status: string }>();
    if (existing?.status === "ARCHIVED") throw new AppError({ code: "PROJECT_ARCHIVED", message: "Archived projects cannot be edited.", status: 409 });
    const slug = await uniqueSlug(context.env.DB, input.slug, input.title, id);
    const images = await canonicalImages(context.env, input);
    const data = canonicalData(input, slug, images);
    const now = new Date().toISOString();
    const created = !existing;
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO website_content_items
          (id, collection_key, data_json, status, sort_order, created_by, updated_by, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, status = excluded.status,
           sort_order = excluded.sort_order, updated_by = excluded.updated_by, updated_at = ?,
           published_at = excluded.published_at, archived_at = NULL`,
      ).bind(id, PROJECT_COLLECTION, JSON.stringify(data), input.publicationStatus, input.sortOrder, user.id, user.id, input.publicationStatus === "PUBLISHED" ? now : null, now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"), actorId: user.id, action: created ? "PROJECT_CREATED" : "PROJECT_UPDATED",
        entityType: "PROJECT", entityId: id, metadata: { slug, projectStatus: input.projectStatus, publicationStatus: input.publicationStatus },
      }),
    ];
    if (input.publicationStatus === "PUBLISHED" && existing?.status !== "PUBLISHED") {
      statements.push(createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "PROJECT_PUBLISHED", entityType: "PROJECT", entityId: id, metadata: { slug } }));
    } else if (input.publicationStatus === "DRAFT" && existing?.status === "PUBLISHED") {
      statements.push(createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "PROJECT_UNPUBLISHED", entityType: "PROJECT", entityId: id, metadata: { slug } }));
    }
    try {
      await context.env.DB.batch(statements);
    } catch (error) {
      if (error instanceof Error && /website_projects_slug_unique_idx|unique constraint/iu.test(error.message)) {
        throw new AppError({ code: "PROJECT_SLUG_CONFLICT", message: "That project URL was just assigned to another project. Save again to generate the next available slug.", status: 409 });
      }
      throw error;
    }
    return context.json(success({ id, slug, created, publicationStatus: input.publicationStatus }, context.get("requestId")), created ? 201 : 200);
  },
);

projectRoutes.post(
  "/admin/projects/:id/archive",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("project.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = z.string().trim().min(1).max(100).parse(context.req.param("id"));
    const existing = await context.env.DB.prepare(
      "SELECT id FROM website_content_items WHERE id = ? AND collection_key = ? AND status != 'ARCHIVED' LIMIT 1",
    ).bind(id, PROJECT_COLLECTION).first<{ id: string }>();
    if (!existing) throw new AppError({ code: "PROJECT_NOT_FOUND", message: "The project was not found or is already archived.", status: 404 });
    const now = new Date().toISOString();
    const result = await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE website_content_items SET status = 'ARCHIVED', archived_at = ?, published_at = NULL,
         updated_at = ?, updated_by = ? WHERE id = ? AND collection_key = ? AND status != 'ARCHIVED'`,
      ).bind(now, now, user.id, id, PROJECT_COLLECTION),
      createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "PROJECT_ARCHIVED", entityType: "PROJECT", entityId: id }),
    ]);
    if ((result[0]?.meta.changes ?? 0) !== 1) throw new AppError({ code: "PROJECT_UPDATE_CONFLICT", message: "The project changed while it was being archived. Please refresh and try again.", status: 409 });
    return context.json(success({ id, archived: true }, context.get("requestId")));
  },
);
