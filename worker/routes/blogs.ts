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
import { sanitizeBlogHtml } from "../lib/sanitize-blog-html";
import { requirePermission } from "../middleware/authorization";
import type { AppEnvironment } from "../types";

export const blogRoutes = new Hono<AppEnvironment>();

const BLOG_COLLECTION = "blog_posts";
const blogId = z.string().trim().min(1).max(100);
const slug = z
  .string()
  .trim()
  .min(3)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const optionalImage = z
  .union([
    z.string().trim().url().max(1000),
    z
      .string()
      .trim()
      .regex(/^\/api\/v1\/media\/files\/[A-Za-z0-9_./-]+$/u)
      .max(1000),
    z.literal(""),
  ])
  .optional()
  .nullable();

const blogSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title before saving.").max(240),
    slug,
    excerpt: z.string().trim().max(600).default(""),
    featuredImageUrl: optionalImage,
    featuredImageAlt: z.string().trim().max(300).optional().nullable(),
    contentHtml: z.string().trim().max(200_000).default(""),
    authorName: z.string().trim().max(160).default(""),
    category: z.string().trim().max(100).default(""),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    publicationDate: z.string().datetime().optional().nullable(),
    status: z.enum(["DRAFT", "PUBLISHED"]),
    seoTitle: z.string().trim().max(70).optional().nullable(),
    seoDescription: z.string().trim().max(180).optional().nullable(),
    seoKeywords: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    socialImageUrl: optionalImage,
  })
  .strict();

type BlogInput = z.infer<typeof blogSchema>;

const managedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function meaningfulText(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/&(?:nbsp|#160|#xA0);/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function publishErrors(input: BlogInput, contentHtml: string) {
  const details: Record<string, string[]> = {};
  if (!input.excerpt.trim())
    details.excerpt = ["Excerpt is required before publishing."];
  if (!meaningfulText(contentHtml))
    details.contentHtml = ["Article content is required before publishing."];
  if (!input.featuredImageUrl)
    details.featuredImageUrl = [
      "Hero image is required before publishing.",
    ];
  if (!input.authorName.trim())
    details.authorName = ["Author is required before publishing."];
  if (!input.category.trim())
    details.category = ["Category is required before publishing."];
  if (!input.publicationDate)
    details.publicationDate = [
      "Publication date is required before publishing.",
    ];
  return details;
}

function throwValidation(details: Record<string, string[]>) {
  if (Object.keys(details).length === 0) return;
  throw new AppError({
    code: "VALIDATION_ERROR",
    message: "Some blog fields need attention.",
    status: 422,
    details,
  });
}

function managedMediaKey(value: string | null | undefined) {
  if (!value) return null;
  try {
    const pathname = new URL(value, "https://ruetiotclub.org").pathname;
    const prefix = "/api/v1/media/files/";
    if (!pathname.startsWith(prefix)) return null;
    return decodeURIComponent(pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

async function verifiedHeroImage(
  env: Env,
  value: string | null | undefined,
) {
  if (!value) return null;
  const key = managedMediaKey(value);
  if (!key) return value;
  const [media, object] = await Promise.all([
    env.DB.prepare(
      "SELECT content_type,byte_size FROM website_media_objects WHERE object_key=? AND archived_at IS NULL",
    )
      .bind(key)
      .first<{ content_type: string; byte_size: number }>(),
    env.STORAGE.head(key),
  ]);
  if (
    !media ||
    !object ||
    !managedImageTypes.has(media.content_type) ||
    media.byte_size > 5 * 1024 * 1024
  )
    throwValidation({
      featuredImageUrl: [
        "The selected hero image is unavailable. Choose an existing JPG, PNG, or WebP image up to 5 MB.",
      ],
    });
  return `/api/v1/media/files/${key}`;
}

type BlogRow = {
  id: string;
  data_json: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  view_count: number | null;
};

function cleanHtml(value: string) {
  return sanitizeBlogHtml(value);
}

function apiBlog(row: BlogRow) {
  const data = JSON.parse(row.data_json) as Record<string, unknown>;
  const legacyContent = typeof data.content === "string" ? data.content : "";
  const contentHtml = cleanHtml(
    typeof data.contentHtml === "string" ? data.contentHtml : legacyContent,
  );
  return {
    id: row.id,
    title: String(data.title ?? "Untitled"),
    slug: String(data.slug ?? row.id),
    excerpt: String(
      data.excerpt ??
        legacyContent
          .replace(/<[^>]+>/gu, " ")
          .replace(/\s+/gu, " ")
          .trim()
          .slice(0, 280),
    ),
    featuredImageUrl: data.featuredImageUrl ?? data.cover_image ?? null,
    featuredImageAlt: data.featuredImageAlt ?? data.title ?? "",
    contentHtml,
    authorName: String(data.authorName ?? data.author_name ?? "RUET IoT Club"),
    authorId: data.authorId ?? data.author_id ?? null,
    category: String(data.category ?? "General"),
    tags: Array.isArray(data.tags) ? data.tags : [],
    publicationDate:
      data.publicationDate ??
      (row.status === "PUBLISHED" ? row.published_at ?? row.created_at : null),
    status: row.status,
    seoTitle: data.seoTitle ?? null,
    seoDescription: data.seoDescription ?? null,
    seoKeywords: Array.isArray(data.seoKeywords) ? data.seoKeywords : [],
    socialImageUrl: data.socialImageUrl ?? null,
    views: Number(row.view_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function rowSelect() {
  return `SELECT i.id,i.data_json,i.status,i.sort_order,i.created_at,i.updated_at,i.published_at,i.archived_at,COALESCE(m.view_count,0) AS view_count
    FROM website_content_items i LEFT JOIN blog_post_metrics m ON m.blog_id=i.id`;
}

async function ensureUniqueSlug(
  db: D1Database,
  value: string,
  exceptId: string,
) {
  const duplicate = await db
    .prepare(
      "SELECT id FROM website_content_items WHERE collection_key=? AND status!='ARCHIVED' AND json_extract(data_json,'$.slug')=? AND id!=?",
    )
    .bind(BLOG_COLLECTION, value, exceptId)
    .first("id");
  if (duplicate)
    throw new AppError({
      code: "BLOG_SLUG_EXISTS",
      message: "This slug is already used by another blog.",
      status: 409,
      details: { slug: ["This slug is already in use."] },
    });
}

blogRoutes.get("/blogs", async (context) => {
  const query = z
    .object({
      q: z.string().trim().max(160).default(""),
      category: z.string().trim().max(100).default(""),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(12),
    })
    .parse(context.req.query());
  const clauses = [
    "i.collection_key=?",
    "i.status='PUBLISHED'",
    "COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at)<=?",
  ];
  const values: unknown[] = [BLOG_COLLECTION, new Date().toISOString()];
  if (query.category) {
    clauses.push("json_extract(i.data_json,'$.category')=?");
    values.push(query.category);
  }
  if (query.q) {
    clauses.push(
      "(json_extract(i.data_json,'$.title') LIKE ? OR json_extract(i.data_json,'$.excerpt') LIKE ? OR json_extract(i.data_json,'$.tags') LIKE ?)",
    );
    values.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
  }
  const where = clauses.join(" AND ");
  const [rows, count, categories] = await Promise.all([
    context.env.DB.prepare(
      `${rowSelect()} WHERE ${where} ORDER BY COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at) DESC LIMIT ? OFFSET ?`,
    )
      .bind(...values, query.pageSize, (query.page - 1) * query.pageSize)
      .all<BlogRow>(),
    context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM website_content_items i WHERE ${where}`,
    )
      .bind(...values)
      .first<{ count: number }>(),
    context.env.DB.prepare(
      "SELECT DISTINCT json_extract(data_json,'$.category') AS category FROM website_content_items WHERE collection_key=? AND status='PUBLISHED' AND json_extract(data_json,'$.category') IS NOT NULL ORDER BY category",
    )
      .bind(BLOG_COLLECTION)
      .all<{ category: string }>(),
  ]);
  return context.json(
    success(
      {
        items: rows.results.map(apiBlog),
        total: Number(count?.count ?? 0),
        page: query.page,
        pageSize: query.pageSize,
        categories: categories.results.map((row) => row.category),
      },
      context.get("requestId"),
    ),
  );
});

blogRoutes.get("/blogs/:slug", async (context) => {
  const identifier = blogId.parse(context.req.param("slug"));
  const now = new Date().toISOString();
  const row = await context.env.DB.prepare(
    `${rowSelect()} WHERE i.collection_key=? AND i.status='PUBLISHED' AND (i.id=? OR json_extract(i.data_json,'$.slug')=?) AND COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at)<=?`,
  )
    .bind(BLOG_COLLECTION, identifier, identifier, now)
    .first<BlogRow>();
  if (!row)
    throw new AppError({
      code: "BLOG_NOT_FOUND",
      message: "This blog post is unavailable.",
      status: 404,
    });
  await context.env.DB.prepare(
    "INSERT INTO blog_post_metrics(blog_id,view_count,last_viewed_at,updated_at) VALUES(?,1,?,?) ON CONFLICT(blog_id) DO UPDATE SET view_count=view_count+1,last_viewed_at=excluded.last_viewed_at,updated_at=excluded.updated_at",
  )
    .bind(row.id, now, now)
    .run();
  const blog = apiBlog({ ...row, view_count: Number(row.view_count ?? 0) + 1 });
  const relatedRows = await context.env.DB.prepare(
    `${rowSelect()} WHERE i.collection_key=? AND i.status='PUBLISHED' AND i.id!=? AND COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at)<=? ORDER BY CASE WHEN json_extract(i.data_json,'$.category')=? THEN 0 ELSE 1 END,COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at) DESC LIMIT 3`,
  )
    .bind(BLOG_COLLECTION, row.id, now, blog.category)
    .all<BlogRow>();
  return context.json(
    success(
      { ...blog, related: relatedRows.results.map(apiBlog) },
      context.get("requestId"),
    ),
  );
});

blogRoutes.get(
  "/admin/blogs",
  sessionMiddleware({ required: true }),
  requirePermission("content.read"),
  async (context) => {
    const query = z
      .object({
        q: z.string().trim().max(160).default(""),
        category: z.string().trim().max(100).default(""),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        sort: z
          .enum(["updatedAt", "publicationDate", "title", "views"])
          .default("updatedAt"),
        direction: z.enum(["asc", "desc"]).default("desc"),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(context.req.query());
    const clauses = ["i.collection_key=?"];
    const values: unknown[] = [BLOG_COLLECTION];
    if (query.status) {
      clauses.push("i.status=?");
      values.push(query.status);
    } else clauses.push("i.status!='ARCHIVED'");
    if (query.category) {
      clauses.push("json_extract(i.data_json,'$.category')=?");
      values.push(query.category);
    }
    if (query.from) {
      clauses.push(
        "COALESCE(json_extract(i.data_json,'$.publicationDate'),i.created_at)>=?",
      );
      values.push(query.from);
    }
    if (query.to) {
      clauses.push(
        "COALESCE(json_extract(i.data_json,'$.publicationDate'),i.created_at)<=?",
      );
      values.push(query.to);
    }
    if (query.q) {
      clauses.push(
        "(json_extract(i.data_json,'$.title') LIKE ? OR json_extract(i.data_json,'$.excerpt') LIKE ? OR json_extract(i.data_json,'$.authorName') LIKE ?)",
      );
      values.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
    }
    const sortColumns = {
      updatedAt: "i.updated_at",
      publicationDate:
        "COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at)",
      title: "json_extract(i.data_json,'$.title')",
      views: "COALESCE(m.view_count,0)",
    };
    const where = clauses.join(" AND ");
    const [rows, count] = await Promise.all([
      context.env.DB.prepare(
        `${rowSelect()} WHERE ${where} ORDER BY ${sortColumns[query.sort]} ${query.direction.toUpperCase()} LIMIT ? OFFSET ?`,
      )
        .bind(...values, query.pageSize, (query.page - 1) * query.pageSize)
        .all<BlogRow>(),
      context.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM website_content_items i WHERE ${where}`,
      )
        .bind(...values)
        .first<{ count: number }>(),
    ]);
    return context.json(
      success(
        {
          items: rows.results.map(apiBlog),
          total: Number(count?.count ?? 0),
          page: query.page,
          pageSize: query.pageSize,
        },
        context.get("requestId"),
      ),
    );
  },
);

blogRoutes.get(
  "/admin/blogs/stats",
  sessionMiddleware({ required: true }),
  requirePermission("content.read"),
  async (context) => {
    const row = await context.env.DB.prepare(
      "SELECT COUNT(*) AS total,SUM(CASE WHEN status='PUBLISHED' THEN 1 ELSE 0 END) AS published,SUM(CASE WHEN status='DRAFT' THEN 1 ELSE 0 END) AS drafts FROM website_content_items WHERE collection_key=? AND status!='ARCHIVED'",
    )
      .bind(BLOG_COLLECTION)
      .first<{
        total: number;
        published: number | null;
        drafts: number | null;
      }>();
    const recent = await context.env.DB.prepare(
      `${rowSelect()} WHERE i.collection_key=? AND i.status!='ARCHIVED' ORDER BY i.updated_at DESC LIMIT 5`,
    )
      .bind(BLOG_COLLECTION)
      .all<BlogRow>();
    return context.json(
      success(
        {
          total: Number(row?.total ?? 0),
          published: Number(row?.published ?? 0),
          drafts: Number(row?.drafts ?? 0),
          recent: recent.results.map(apiBlog),
        },
        context.get("requestId"),
      ),
    );
  },
);

blogRoutes.get(
  "/admin/blogs/:id",
  sessionMiddleware({ required: true }),
  requirePermission("content.read"),
  async (context) => {
    const id = blogId.parse(context.req.param("id"));
    const row = await context.env.DB.prepare(
      `${rowSelect()} WHERE i.id=? AND i.collection_key=?`,
    )
      .bind(id, BLOG_COLLECTION)
      .first<BlogRow>();
    if (!row)
      throw new AppError({
        code: "BLOG_NOT_FOUND",
        message: "Blog post not found.",
        status: 404,
      });
    return context.json(success(apiBlog(row), context.get("requestId")));
  },
);

blogRoutes.put(
  "/admin/blogs/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("content.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = blogId.parse(context.req.param("id"));
    const input = await parseJson(context, blogSchema);
    if (
      input.status === "PUBLISHED" &&
      !user.permissions.includes("content.publish")
    )
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to publish blogs.",
        status: 403,
      });
    await ensureUniqueSlug(context.env.DB, input.slug, id);
    const existing = await context.env.DB.prepare(
      "SELECT status,published_at,created_at FROM website_content_items WHERE id=? AND collection_key=?",
    )
      .bind(id, BLOG_COLLECTION)
      .first<{
        status: string;
        published_at: string | null;
        created_at: string;
      }>();
    const now = new Date().toISOString();
    const contentHtml = cleanHtml(input.contentHtml);
    if (input.status === "PUBLISHED")
      throwValidation(publishErrors(input, contentHtml));
    const featuredImageUrl =
      input.status === "PUBLISHED"
        ? await verifiedHeroImage(context.env, input.featuredImageUrl)
        : input.featuredImageUrl;
    const publicationDate = input.publicationDate;
    const data = {
      ...input,
      publicationDate,
      contentHtml,
      featuredImageUrl,
      authorId: user.id,
      published: input.status === "PUBLISHED",
      cover_image: featuredImageUrl || null,
      author_name: input.authorName,
    };
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at,published_at,archived_at) VALUES(?,?,?,?,0,?,?,?,?,?,NULL)
      ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,updated_by=excluded.updated_by,updated_at=excluded.updated_at,published_at=excluded.published_at,archived_at=NULL`,
      ).bind(
        id,
        BLOG_COLLECTION,
        JSON.stringify(data),
        input.status,
        user.id,
        user.id,
        existing?.created_at ?? now,
        now,
        input.status === "PUBLISHED"
          ? (existing?.published_at ?? publicationDate)
          : null,
      ),
      context.env.DB.prepare(
        "INSERT OR IGNORE INTO blog_post_metrics(blog_id) VALUES(?)",
      ).bind(id),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: existing ? "BLOG_UPDATED" : "BLOG_CREATED",
        entityType: "BLOG",
        entityId: id,
        metadata: {
          slug: input.slug,
          fromStatus: existing?.status ?? null,
          toStatus: input.status,
        },
      }),
    ]);
    return context.json(
      success(
        { id, slug: input.slug, status: input.status },
        context.get("requestId"),
      ),
      existing ? 200 : 201,
    );
  },
);

blogRoutes.patch(
  "/admin/blogs/:id/status",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("content.publish"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = blogId.parse(context.req.param("id"));
    const input = await parseJson(
      context,
      z
        .object({
          status: z.enum(["DRAFT", "PUBLISHED"]),
          reason: z.string().trim().min(3).max(1000),
        })
        .strict(),
    );
    const row = await context.env.DB.prepare(
      `${rowSelect()} WHERE i.id=? AND i.collection_key=? AND i.status!='ARCHIVED'`,
    )
      .bind(id, BLOG_COLLECTION)
      .first<BlogRow>();
    if (!row)
      throw new AppError({
        code: "BLOG_NOT_FOUND",
        message: "Blog post not found.",
        status: 404,
      });
    const data = JSON.parse(row.data_json) as Record<string, unknown>;
    const now = new Date().toISOString();
    if (input.status === "PUBLISHED") {
      const current = apiBlog(row);
      const parsed = blogSchema.safeParse({
        title: current.title,
        slug: current.slug,
        excerpt: current.excerpt,
        featuredImageUrl: current.featuredImageUrl,
        featuredImageAlt: current.featuredImageAlt,
        contentHtml: current.contentHtml,
        authorName: current.authorName,
        category: current.category,
        tags: current.tags,
        publicationDate: current.publicationDate,
        status: "PUBLISHED",
        seoTitle: current.seoTitle,
        seoDescription: current.seoDescription,
        seoKeywords: current.seoKeywords,
        socialImageUrl: current.socialImageUrl,
      });
      if (!parsed.success) {
        const details: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".") || "body";
          details[key] = [...(details[key] ?? []), issue.message];
        }
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Some blog fields need attention.",
          status: 422,
          details,
        });
      }
      const contentHtml = cleanHtml(parsed.data.contentHtml);
      throwValidation(publishErrors(parsed.data, contentHtml));
      await ensureUniqueSlug(context.env.DB, parsed.data.slug, id);
      const featuredImageUrl = await verifiedHeroImage(
        context.env,
        parsed.data.featuredImageUrl,
      );
      Object.assign(data, parsed.data, {
        contentHtml,
        featuredImageUrl,
        cover_image: featuredImageUrl,
      });
    }
    data.published = input.status === "PUBLISHED";
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE website_content_items SET data_json=?,status=?,published_at=?,updated_by=?,updated_at=? WHERE id=? AND status=?",
      ).bind(
        JSON.stringify(data),
        input.status,
        input.status === "PUBLISHED"
          ? (row.published_at ?? String(data.publicationDate))
          : null,
        user.id,
        now,
        id,
        row.status,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action:
          input.status === "PUBLISHED" ? "BLOG_PUBLISHED" : "BLOG_UNPUBLISHED",
        entityType: "BLOG",
        entityId: id,
        reason: input.reason,
        metadata: { fromStatus: row.status, toStatus: input.status },
      }),
    ]);
    return context.json(
      success({ id, status: input.status }, context.get("requestId")),
    );
  },
);

blogRoutes.delete(
  "/admin/blogs/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("content.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id = blogId.parse(context.req.param("id"));
    const input = await parseJson(
      context,
      z.object({ reason: z.string().trim().min(3).max(1000) }).strict(),
    );
    const now = new Date().toISOString();
    const result = await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE website_content_items SET status='ARCHIVED',archived_at=?,updated_by=?,updated_at=? WHERE id=? AND collection_key=? AND status!='ARCHIVED'",
      ).bind(now, user.id, now, id, BLOG_COLLECTION),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "BLOG_ARCHIVED",
        entityType: "BLOG",
        entityId: id,
        reason: input.reason,
      }),
    ]);
    if ((result[0]?.meta.changes ?? 0) !== 1)
      throw new AppError({
        code: "BLOG_NOT_FOUND",
        message: "Blog post not found.",
        status: 404,
      });
    return context.json(
      success({ id, status: "ARCHIVED" }, context.get("requestId")),
    );
  },
);
