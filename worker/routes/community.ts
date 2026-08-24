import { Hono } from "hono";
import { z } from "zod";
import { createOpaqueToken, sha256 } from "../auth/crypto";
import { clientIp, enforceRateLimit } from "../auth/rate-limit";
import {
  csrfMiddleware,
  requireAuth,
  sessionMiddleware,
} from "../auth/session";
import { normalizeEmail, parseJson } from "../auth/validation";
import { createAuditStatement } from "../db/audit";
import {
  eventColumns,
  eventSchema,
  eventValues,
  eventView,
  legacyEventData,
  normalizeEventInput,
  selectEvent,
  validateEventMediaReferences,
  type EventInput,
} from "../domain/events";
import { success } from "../lib/api-envelope";
import { AppError } from "../lib/app-error";
import {
  requireAnyPermission,
  requirePermission,
} from "../middleware/authorization";
import { enforceTurnstile } from "../services/turnstile";
import {
  createEmailQueueRecord,
  insertEmailStatement,
  opportunityApplicationVerificationEmail,
  submissionReceiptEmail,
  submissionStatusEmail,
} from "../services/email";
import type { AppEnvironment } from "../types";

export const communityRoutes = new Hono<AppEnvironment>();

const id = z.string().trim().min(1).max(100);
const text = (minimum = 0, maximum = 5000) =>
  z.string().trim().min(minimum).max(maximum);
const optionalText = (maximum = 5000) => text(0, maximum).optional().nullable();
const url = z.string().trim().url().max(1000).optional().nullable();
const email = z.string().trim().email().max(254).optional().nullable();
const stringList = z.array(text(1, 300)).max(100).default([]);
const workflow = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const personSchema = z.object({
  slug: text(3, 160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  fullName: text(2, 150),
  profilePhotoUrl: optionalText(1000),
  shortBio: optionalText(500),
  biography: optionalText(10000),
  publicEmail: email,
  publicPhone: optionalText(32),
  series: optionalText(80),
  department: optionalText(160),
  university: optionalText(200),
  studentIdPrivate: optionalText(80),
  graduationYear: z.number().int().min(1950).max(2200).optional().nullable(),
  personType: z.enum([
    "EXECUTIVE",
    "ADVISORY_BOARD",
    "FACULTY_ADVISOR",
    "GENERAL_MEMBER",
    "VOLUNTEER",
    "ALUMNI",
    "MENTOR",
    "RESEARCHER",
    "COORDINATOR",
    "FORMER_EXECUTIVE",
  ]),
  position: text(2, 120),
  term: optionalText(100),
  committeeSession: optionalText(100),
  startsOn: optionalText(30),
  endsOn: optionalText(30),
  currentPosition: z.boolean().default(true),
  sortOrder: z.number().int().min(-100000).max(100000).default(0),
  featured: z.boolean().default(false),
  publicProfile: z.boolean().default(true),
  linkedinUrl: url,
  githubUrl: url,
  facebookUrl: url,
  websiteUrl: url,
  researchProfileUrl: url,
  workflowStatus: workflow,
});

const partnerSchema = z.object({
  slug: text(3, 160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  organizationName: text(2, 200),
  logoUrl: optionalText(1000),
  coverImageUrl: optionalText(1000),
  shortDescription: text(3, 500),
  fullDescription: text(3, 20000),
  category: text(2, 100),
  country: optionalText(100),
  city: optionalText(120),
  websiteUrl: url,
  contactEmail: email,
  contactPerson: optionalText(160),
  partnershipType: optionalText(160),
  startsOn: optionalText(30),
  endsOn: optionalText(30),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(-100000).max(100000).default(0),
  facebookUrl: url,
  linkedinUrl: url,
  instagramUrl: url,
  otherUrl: url,
  seoTitle: optionalText(200),
  metaDescription: optionalText(500),
  workflowStatus: workflow,
  sourceSubmissionId: optionalText(100),
});

const opportunitySchema = z.object({
  slug: text(3, 160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  title: text(3, 200),
  shortDescription: text(3, 500),
  fullDescription: text(3, 20000),
  category: text(2, 100),
  organization: text(2, 200),
  opportunityType: text(2, 100),
  featured: z.boolean().default(false),
  applicationOpensAt: z.string().datetime().optional().nullable(),
  applicationDeadline: z.string().datetime().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  eligibility: optionalText(5000),
  whoCanApply: optionalText(3000),
  academicLevel: optionalText(300),
  department: optionalText(300),
  series: optionalText(300),
  location: optionalText(300),
  ageRequirement: optionalText(300),
  otherEligibility: optionalText(3000),
  applicationMode: z.enum(["INTERNAL", "EXTERNAL"]),
  applicationUrl: url,
  contactEmail: email,
  contactPhone: optionalText(32),
  requiredDocuments: stringList,
  coverImageUrl: optionalText(1000),
  logoUrl: optionalText(1000),
  attachments: stringList,
  seoTitle: optionalText(200),
  metaDescription: optionalText(500),
  ogImageUrl: optionalText(1000),
  sortOrder: z.number().int().min(-100000).max(100000).default(0),
  workflowStatus: workflow,
});

type Kind = "events" | "people" | "partners" | "opportunities";
const kindSchema = z.enum(["events", "people", "partners", "opportunities"]);

const configs = {
  events: {
    table: "managed_events",
    collection: "events",
    permission: "event",
    schema: eventSchema,
    publicWhere: "",
    publicOrder:
      "CASE WHEN ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN 0 ELSE 1 END, featured DESC, CASE WHEN ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN starts_at END ASC, ends_at DESC",
  },
  people: {
    table: "people_profiles",
    collection: "team_members",
    permission: "people",
    schema: personSchema,
    publicWhere: "AND public_profile=1",
    publicOrder:
      "featured DESC, person_type ASC, sort_order ASC, full_name ASC",
  },
  partners: {
    table: "partner_profiles",
    collection: "partners",
    permission: "partner",
    schema: partnerSchema,
    publicWhere: "AND active=1",
    publicOrder:
      "featured DESC, category ASC, sort_order ASC, organization_name ASC",
  },
  opportunities: {
    table: "opportunities",
    collection: "opportunities",
    permission: "opportunity",
    schema: opportunitySchema,
    publicWhere: "",
    publicOrder: "featured DESC, application_deadline ASC, sort_order ASC",
  },
} as const;

function bool(value: boolean): number {
  return value ? 1 : 0;
}
function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}
function rowToApi(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, letter: string) =>
      letter.toUpperCase(),
    );
    if (key.endsWith("_json")) {
      const name = camel.slice(0, -4);
      try {
        result[name] = JSON.parse(String(value ?? "[]"));
      } catch {
        result[name] = [];
      }
    } else if (
      [
        "featured",
        "active",
        "public_profile",
        "current_position",
        "registration_required",
        "payment_required",
        "registration_capacity_override",
        "certificate_available",
        "certificate_require_registration",
        "certificate_require_payment",
        "certificate_require_attendance",
      ].includes(key)
    ) {
      result[camel] = Boolean(value);
    } else result[camel] = value;
  }
  return result;
}
function publishedAt(status: string, previous?: string | null): string | null {
  return status === "PUBLISHED" ? previous || new Date().toISOString() : null;
}
function adminNotificationStatement(
  db: D1Database,
  options: {
    type: string;
    title: string;
    message: string;
    actionUrl: string;
    entityType: string;
    entityId: string;
    dedupeKey: string;
  },
) {
  return db
    .prepare(
      `INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
     SELECT lower(hex(randomblob(16))),ur.user_id,?,?,?,?,?,?,?,?
     FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id
     WHERE p.permission_key='admin.access' AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     GROUP BY ur.user_id`,
    )
    .bind(
      options.type,
      options.title,
      options.message,
      options.actionUrl,
      options.entityType,
      options.entityId,
      "NORMAL",
      options.dedupeKey,
    );
}
function userNotificationStatement(
  db: D1Database,
  options: {
    userId: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string | null;
    entityType: string;
    entityId: string;
    dedupeKey: string;
  },
) {
  return db
    .prepare(
      "INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key) VALUES(?,?,?,?,?,?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      options.userId,
      options.type,
      options.title,
      options.message,
      options.actionUrl ?? null,
      options.entityType,
      options.entityId,
      "NORMAL",
      options.dedupeKey,
    );
}
function contentJson(
  kind: Kind,
  input: Record<string, any>,
): Record<string, unknown> {
  if (kind === "events") return legacyEventData(input as EventInput);
  if (kind === "people")
    return compact({
      name: input.fullName,
      slug: input.slug,
      image_url: input.profilePhotoUrl,
      bio: input.shortBio,
      biography: input.biography,
      email: input.publicEmail,
      phone: input.publicPhone,
      batch: input.series,
      department: input.department,
      university: input.university,
      category: input.personType,
      position: input.position,
      term: input.term,
      session: input.committeeSession,
      current_position: input.currentPosition,
      featured: input.featured,
      linkedin: input.linkedinUrl,
      github: input.githubUrl,
      facebook: input.facebookUrl,
      website: input.websiteUrl,
      research_profile: input.researchProfileUrl,
    });
  if (kind === "partners")
    return compact({
      title: input.organizationName,
      name: input.organizationName,
      slug: input.slug,
      logo_url: input.logoUrl,
      image_url: input.logoUrl,
      cover_image_url: input.coverImageUrl,
      description: input.shortDescription,
      full_description: input.fullDescription,
      category: input.category,
      country: input.country,
      city: input.city,
      website: input.websiteUrl,
      contact_email: input.contactEmail,
      contact_person: input.contactPerson,
      partnership_type: input.partnershipType,
      start_date: input.startsOn,
      end_date: input.endsOn,
      active: input.active,
      featured: input.featured,
      facebook: input.facebookUrl,
      linkedin: input.linkedinUrl,
      instagram: input.instagramUrl,
      other_url: input.otherUrl,
      seo_title: input.seoTitle,
      meta_description: input.metaDescription,
    });
  return compact({
    title: input.title,
    slug: input.slug,
    description: input.shortDescription,
    full_description: input.fullDescription,
    category: input.category,
    organization: input.organization,
    type: input.opportunityType,
    featured: input.featured,
    application_opens: input.applicationOpensAt,
    deadline: input.applicationDeadline,
    start_date: input.startsAt,
    end_date: input.endsAt,
    eligibility: input.eligibility,
    who_can_apply: input.whoCanApply,
    academic_level: input.academicLevel,
    department: input.department,
    series: input.series,
    location: input.location,
    age_requirement: input.ageRequirement,
    other_eligibility: input.otherEligibility,
    internal_application: input.applicationMode === "INTERNAL",
    application_url: input.applicationUrl,
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    required_documents: input.requiredDocuments,
    cover_image_url: input.coverImageUrl,
    logo_url: input.logoUrl,
    attachments: input.attachments,
    seo_title: input.seoTitle,
    meta_description: input.metaDescription,
    og_image: input.ogImageUrl,
  });
}

function upsertStatement(
  db: D1Database,
  kind: Kind,
  recordId: string,
  input: Record<string, any>,
  userId: string,
  now: string,
  existingPublishedAt: string | null,
) {
  if (kind === "events") {
    const updateColumns = eventColumns.filter(
      (column) => !["id", "created_by", "created_at"].includes(column),
    );
    return db
      .prepare(
        `INSERT INTO managed_events(${eventColumns.join(",")}) VALUES(${eventColumns.map(() => "?").join(",")})
       ON CONFLICT(id) DO UPDATE SET ${updateColumns.map((column) => `${column}=excluded.${column}`).join(",")}`,
      )
      .bind(
        ...eventValues(
          input as EventInput,
          recordId,
          userId,
          now,
          publishedAt(input.workflowStatus, existingPublishedAt),
        ),
      );
  }
  if (kind === "people")
    return db
      .prepare(
        `INSERT INTO people_profiles(id,slug,full_name,profile_photo_url,short_bio,biography,public_email,public_phone,series,department,university,student_id_private,graduation_year,person_type,position,term,committee_session,starts_on,ends_on,current_position,sort_order,featured,public_profile,linkedin_url,github_url,facebook_url,website_url,research_profile_url,workflow_status,published_at,created_by,updated_by,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,full_name=excluded.full_name,profile_photo_url=excluded.profile_photo_url,short_bio=excluded.short_bio,biography=excluded.biography,public_email=excluded.public_email,public_phone=excluded.public_phone,series=excluded.series,department=excluded.department,university=excluded.university,student_id_private=excluded.student_id_private,graduation_year=excluded.graduation_year,person_type=excluded.person_type,position=excluded.position,term=excluded.term,committee_session=excluded.committee_session,starts_on=excluded.starts_on,ends_on=excluded.ends_on,current_position=excluded.current_position,sort_order=excluded.sort_order,featured=excluded.featured,public_profile=excluded.public_profile,linkedin_url=excluded.linkedin_url,github_url=excluded.github_url,facebook_url=excluded.facebook_url,website_url=excluded.website_url,research_profile_url=excluded.research_profile_url,workflow_status=excluded.workflow_status,published_at=excluded.published_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      )
      .bind(
        recordId,
        input.slug,
        input.fullName,
        input.profilePhotoUrl,
        input.shortBio,
        input.biography,
        input.publicEmail,
        input.publicPhone,
        input.series,
        input.department,
        input.university,
        input.studentIdPrivate,
        input.graduationYear,
        input.personType,
        input.position,
        input.term,
        input.committeeSession,
        input.startsOn,
        input.endsOn,
        bool(input.currentPosition),
        input.sortOrder,
        bool(input.featured),
        bool(input.publicProfile),
        input.linkedinUrl,
        input.githubUrl,
        input.facebookUrl,
        input.websiteUrl,
        input.researchProfileUrl,
        input.workflowStatus,
        publishedAt(input.workflowStatus, existingPublishedAt),
        userId,
        userId,
        now,
        now,
      );
  if (kind === "partners")
    return db
      .prepare(
        `INSERT INTO partner_profiles(id,source_submission_id,slug,organization_name,logo_url,cover_image_url,short_description,full_description,category,country,city,website_url,contact_email,contact_person,partnership_type,starts_on,ends_on,active,featured,sort_order,facebook_url,linkedin_url,instagram_url,other_url,seo_title,meta_description,workflow_status,published_at,created_by,updated_by,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET source_submission_id=COALESCE(excluded.source_submission_id,source_submission_id),slug=excluded.slug,organization_name=excluded.organization_name,logo_url=excluded.logo_url,cover_image_url=excluded.cover_image_url,short_description=excluded.short_description,full_description=excluded.full_description,category=excluded.category,country=excluded.country,city=excluded.city,website_url=excluded.website_url,contact_email=excluded.contact_email,contact_person=excluded.contact_person,partnership_type=excluded.partnership_type,starts_on=excluded.starts_on,ends_on=excluded.ends_on,active=excluded.active,featured=excluded.featured,sort_order=excluded.sort_order,facebook_url=excluded.facebook_url,linkedin_url=excluded.linkedin_url,instagram_url=excluded.instagram_url,other_url=excluded.other_url,seo_title=excluded.seo_title,meta_description=excluded.meta_description,workflow_status=excluded.workflow_status,published_at=excluded.published_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      )
      .bind(
        recordId,
        input.sourceSubmissionId,
        input.slug,
        input.organizationName,
        input.logoUrl,
        input.coverImageUrl,
        input.shortDescription,
        input.fullDescription,
        input.category,
        input.country,
        input.city,
        input.websiteUrl,
        input.contactEmail,
        input.contactPerson,
        input.partnershipType,
        input.startsOn,
        input.endsOn,
        bool(input.active),
        bool(input.featured),
        input.sortOrder,
        input.facebookUrl,
        input.linkedinUrl,
        input.instagramUrl,
        input.otherUrl,
        input.seoTitle,
        input.metaDescription,
        input.workflowStatus,
        publishedAt(input.workflowStatus, existingPublishedAt),
        userId,
        userId,
        now,
        now,
      );
  return db
    .prepare(
      `INSERT INTO opportunities(id,slug,title,short_description,full_description,category,organization,opportunity_type,featured,application_opens_at,application_deadline,starts_at,ends_at,eligibility,who_can_apply,academic_level,department,series,location,age_requirement,other_eligibility,application_mode,application_url,contact_email,contact_phone,required_documents_json,cover_image_url,logo_url,attachments_json,seo_title,meta_description,og_image_url,sort_order,workflow_status,published_at,created_by,updated_by,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,title=excluded.title,short_description=excluded.short_description,full_description=excluded.full_description,category=excluded.category,organization=excluded.organization,opportunity_type=excluded.opportunity_type,featured=excluded.featured,application_opens_at=excluded.application_opens_at,application_deadline=excluded.application_deadline,starts_at=excluded.starts_at,ends_at=excluded.ends_at,eligibility=excluded.eligibility,who_can_apply=excluded.who_can_apply,academic_level=excluded.academic_level,department=excluded.department,series=excluded.series,location=excluded.location,age_requirement=excluded.age_requirement,other_eligibility=excluded.other_eligibility,application_mode=excluded.application_mode,application_url=excluded.application_url,contact_email=excluded.contact_email,contact_phone=excluded.contact_phone,required_documents_json=excluded.required_documents_json,cover_image_url=excluded.cover_image_url,logo_url=excluded.logo_url,attachments_json=excluded.attachments_json,seo_title=excluded.seo_title,meta_description=excluded.meta_description,og_image_url=excluded.og_image_url,sort_order=excluded.sort_order,workflow_status=excluded.workflow_status,published_at=excluded.published_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
    )
    .bind(
      recordId,
      input.slug,
      input.title,
      input.shortDescription,
      input.fullDescription,
      input.category,
      input.organization,
      input.opportunityType,
      bool(input.featured),
      input.applicationOpensAt,
      input.applicationDeadline,
      input.startsAt,
      input.endsAt,
      input.eligibility,
      input.whoCanApply,
      input.academicLevel,
      input.department,
      input.series,
      input.location,
      input.ageRequirement,
      input.otherEligibility,
      input.applicationMode,
      input.applicationUrl,
      input.contactEmail,
      input.contactPhone,
      JSON.stringify(input.requiredDocuments),
      input.coverImageUrl,
      input.logoUrl,
      JSON.stringify(input.attachments),
      input.seoTitle,
      input.metaDescription,
      input.ogImageUrl,
      input.sortOrder,
      input.workflowStatus,
      publishedAt(input.workflowStatus, existingPublishedAt),
      userId,
      userId,
      now,
      now,
    );
}

communityRoutes.get("/community/:kind", async (context) => {
  const kind = kindSchema.parse(context.req.param("kind")) as Kind;
  const config = configs[kind];
  if (kind === "events") {
    const result = await context.env.DB.prepare(
      `${selectEvent} WHERE e.workflow_status='PUBLISHED' ORDER BY CASE WHEN e.ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN 0 ELSE 1 END,e.featured DESC,CASE WHEN e.ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN e.starts_at END ASC,e.ends_at DESC LIMIT 500`,
    ).all<Record<string, unknown>>();
    return context.json(
      success(
        result.results.map((row) => eventView(row)),
        context.get("requestId"),
      ),
    );
  }
  const columns =
    kind === "people"
      ? "id,slug,full_name,profile_photo_url,short_bio,biography,public_email,public_phone,series,department,university,graduation_year,person_type,position,term,committee_session,starts_on,ends_on,current_position,sort_order,featured,linkedin_url,github_url,facebook_url,website_url,research_profile_url,workflow_status,published_at,created_at,updated_at"
      : "*";
  const result = await context.env.DB.prepare(
    `SELECT ${columns} FROM ${config.table} WHERE workflow_status='PUBLISHED' ${config.publicWhere} ORDER BY ${config.publicOrder} LIMIT 500`,
  ).all<Record<string, unknown>>();
  return context.json(
    success(result.results.map(rowToApi), context.get("requestId")),
  );
});

communityRoutes.get("/community/:kind/:slug", async (context) => {
  const kind = kindSchema.parse(context.req.param("kind")) as Kind;
  const config = configs[kind];
  const slug = text(3, 160).parse(context.req.param("slug"));
  if (kind === "events") {
    const row = await context.env.DB.prepare(
      `${selectEvent} WHERE e.slug=? AND e.workflow_status='PUBLISHED'`,
    )
      .bind(slug)
      .first<Record<string, unknown>>();
    if (!row)
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested page is unavailable.",
        status: 404,
      });
    return context.json(success(eventView(row), context.get("requestId")));
  }
  const columns =
    kind === "people"
      ? "id,slug,full_name,profile_photo_url,short_bio,biography,public_email,public_phone,series,department,university,graduation_year,person_type,position,term,committee_session,starts_on,ends_on,current_position,sort_order,featured,linkedin_url,github_url,facebook_url,website_url,research_profile_url,workflow_status,published_at,created_at,updated_at"
      : "*";
  const row = await context.env.DB.prepare(
    `SELECT ${columns} FROM ${config.table} WHERE slug=? AND workflow_status='PUBLISHED' ${config.publicWhere}`,
  )
    .bind(slug)
    .first<Record<string, unknown>>();
  if (!row)
    throw new AppError({
      code: "NOT_FOUND",
      message: "The requested page is unavailable.",
      status: 404,
    });
  return context.json(success(rowToApi(row), context.get("requestId")));
});

communityRoutes.get(
  "/admin/community/:kind",
  sessionMiddleware({ required: true }),
  async (context, next) => {
    const kind = kindSchema.parse(context.req.param("kind")) as Kind;
    return requirePermission(`${configs[kind].permission}.read`)(context, next);
  },
  async (context) => {
    const kind = kindSchema.parse(context.req.param("kind")) as Kind;
    if (kind === "events") {
      const result = await context.env.DB.prepare(
        `${selectEvent} WHERE e.workflow_status!='ARCHIVED' ORDER BY e.updated_at DESC LIMIT 500`,
      ).all<Record<string, unknown>>();
      return context.json(
        success(
          result.results.map((row) => eventView(row)),
          context.get("requestId"),
        ),
      );
    }
    const result = await context.env.DB.prepare(
      `SELECT * FROM ${configs[kind].table} WHERE workflow_status!='ARCHIVED' ORDER BY updated_at DESC LIMIT 500`,
    ).all<Record<string, unknown>>();
    return context.json(
      success(result.results.map(rowToApi), context.get("requestId")),
    );
  },
);

communityRoutes.put(
  "/admin/community/:kind/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context, next) => {
    const kind = kindSchema.parse(context.req.param("kind")) as Kind;
    return requireAnyPermission([
      `${configs[kind].permission}.manage`,
      "content.manage",
    ])(context, next);
  },
  async (context) => {
    const { user } = requireAuth(context);
    const kind = kindSchema.parse(context.req.param("kind")) as Kind;
    const config = configs[kind];
    const recordId = id.parse(context.req.param("id"));
    const parsed = await parseJson(context, config.schema);
    const input =
      kind === "events"
        ? normalizeEventInput(parsed as never)
        : (parsed as Record<string, any>);
    if (kind === "events") {
      await validateEventMediaReferences(
        context.env.DB,
        context.env.STORAGE,
        input as never,
      );
      const duplicate = await context.env.DB.prepare(
        "SELECT id FROM managed_events WHERE slug=? AND id!=?",
      )
        .bind(input.slug, recordId)
        .first("id");
      if (duplicate)
        throw new AppError({
          code: "EVENT_SLUG_EXISTS",
          message: "Another event already uses this slug.",
          status: 409,
        });
    }
    if (
      input.workflowStatus === "PUBLISHED" &&
      !user.permissions.some((permission) =>
        ["content.publish", `${config.permission}.manage`].includes(permission),
      )
    )
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to publish this record.",
        status: 403,
      });
    const existing = await context.env.DB.prepare(
      `SELECT published_at FROM ${config.table} WHERE id=?`,
    )
      .bind(recordId)
      .first<{ published_at: string | null }>();
    const now = new Date().toISOString();
    const publishTime = publishedAt(
      input.workflowStatus,
      existing?.published_at,
    );
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at,published_at,archived_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,NULL)
         ON CONFLICT(id) DO UPDATE SET collection_key=excluded.collection_key,data_json=excluded.data_json,status=excluded.status,sort_order=excluded.sort_order,updated_by=excluded.updated_by,updated_at=excluded.updated_at,published_at=excluded.published_at,archived_at=NULL`,
      ).bind(
        recordId,
        config.collection,
        JSON.stringify(contentJson(kind, input)),
        input.workflowStatus,
        input.sortOrder ?? 0,
        user.id,
        user.id,
        now,
        now,
        publishTime,
      ),
      upsertStatement(
        context.env.DB,
        kind,
        recordId,
        input,
        user.id,
        now,
        existing?.published_at ?? null,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `${kind.toUpperCase()}_SAVED`,
        entityType: kind.toUpperCase(),
        entityId: recordId,
        metadata: { status: input.workflowStatus },
      }),
    ];
    if (
      input.workflowStatus === "PUBLISHED" &&
      !existing?.published_at &&
      (kind === "events" || kind === "opportunities")
    )
      statements.push(
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
         SELECT lower(hex(randomblob(16))),id,?,?,?,?,?,?,?,? FROM users WHERE status='EMAIL_VERIFIED' AND deleted_at IS NULL`,
        ).bind(
          kind === "events" ? "EVENT_PUBLISHED" : "OPPORTUNITY_PUBLISHED",
          kind === "events"
            ? `New event: ${input.title}`
            : `New opportunity: ${input.title}`,
          kind === "events" ? input.shortDescription : input.shortDescription,
          kind === "events"
            ? `/events/${input.slug}`
            : `/opportunities/${input.slug}`,
          kind.toUpperCase(),
          recordId,
          "NORMAL",
          `${kind}:published:${recordId}`,
        ),
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        { id: recordId, status: input.workflowStatus },
        context.get("requestId"),
      ),
    );
  },
);

communityRoutes.delete(
  "/admin/community/:kind/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context, next) => {
    const kind = kindSchema.parse(context.req.param("kind")) as Kind;
    return requireAnyPermission([
      `${configs[kind].permission}.manage`,
      "content.manage",
    ])(context, next);
  },
  async (context) => {
    const { user } = requireAuth(context);
    const kind = kindSchema.parse(context.req.param("kind")) as Kind;
    const recordId = id.parse(context.req.param("id"));
    const now = new Date().toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE ${configs[kind].table} SET workflow_status='ARCHIVED',updated_by=?,updated_at=? WHERE id=?`,
      ).bind(user.id, now, recordId),
      context.env.DB.prepare(
        "UPDATE website_content_items SET status='ARCHIVED',archived_at=?,updated_by=?,updated_at=? WHERE id=?",
      ).bind(now, user.id, now, recordId),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `${kind.toUpperCase()}_ARCHIVED`,
        entityType: kind.toUpperCase(),
        entityId: recordId,
      }),
    ]);
    return context.json(
      success({ id: recordId, status: "ARCHIVED" }, context.get("requestId")),
    );
  },
);

const opportunityApplicationSchema = z.object({
  applicantName: text(2, 150),
  applicantEmail: z.string().trim().email().max(254),
  applicantPhone: optionalText(32),
  organization: optionalText(200),
  coverNote: text(20, 10000),
  answers: z.record(z.string(), z.unknown()).default({}),
  website: z.string().max(0).optional().default(""),
  turnstileToken: text(1, 2048),
});

communityRoutes.post(
  "/opportunities/:id/apply",
  sessionMiddleware({ required: false }),
  async (context) => {
    const opportunityId = id.parse(context.req.param("id"));
    const input = await parseJson(context, opportunityApplicationSchema);
    await enforceRateLimit({
      db: context.env.DB,
      scope: "opportunity-application",
      identifier: `${clientIp(context.req.raw)}:${normalizeEmail(input.applicantEmail)}`,
      limit: 5,
      windowSeconds: 60 * 60,
    });
    await enforceTurnstile({
      env: context.env,
      request: context.req.raw,
      token: input.turnstileToken,
      action: "submission",
    });
    const opportunity = await context.env.DB.prepare(
      "SELECT id,title,application_mode,application_deadline FROM opportunities WHERE id=? AND workflow_status='PUBLISHED'",
    )
      .bind(opportunityId)
      .first<{
        id: string;
        title: string;
        application_mode: string;
        application_deadline: string | null;
      }>();
    if (!opportunity || opportunity.application_mode !== "INTERNAL")
      throw new AppError({
        code: "APPLICATION_UNAVAILABLE",
        message:
          "This opportunity does not accept applications on this website.",
        status: 409,
      });
    if (
      opportunity.application_deadline &&
      new Date(opportunity.application_deadline) < new Date()
    )
      throw new AppError({
        code: "APPLICATION_CLOSED",
        message: "The application deadline has passed.",
        status: 409,
      });
    const auth = context.get("authUser");
    const trackingToken = createOpaqueToken();
    const verifyToken = auth ? null : createOpaqueToken();
    const applicationId = crypto.randomUUID();
    const now = new Date().toISOString();
    const verificationExpiresAt = verifyToken
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;
    const reference = `RIOT-${new Date().getUTCFullYear()}-${applicationId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const status = auth ? "SUBMITTED" : "EMAIL_VERIFICATION";
    const verificationEmail = verifyToken
      ? await createEmailQueueRecord({
          secret: context.env.SESSION_SECRET,
          userId: null,
          template: "SUBMISSION_VERIFY",
          recipientEmail: input.applicantEmail,
          payload: opportunityApplicationVerificationEmail({
            siteUrl: context.env.SITE_URL,
            applicantName: input.applicantName,
            referenceCode: reference,
            token: verifyToken,
          }),
        })
      : null;
    const receiptEmail = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: auth?.id ?? null,
      template: "SUBMISSION_RECEIVED",
      recipientEmail: input.applicantEmail,
      payload: submissionReceiptEmail({
        siteUrl: context.env.SITE_URL,
        submitterName: input.applicantName,
        submissionType: "OPPORTUNITY",
        referenceCode: reference,
        title: opportunity.title,
        trackingToken,
        verificationRequired: !auth,
      }),
    });
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO opportunity_applications(id,reference_code,opportunity_id,user_id,applicant_name,applicant_email,applicant_email_normalized,applicant_phone,organization,cover_note,payload_json,tracking_token_hash,verification_token_hash,verification_expires_at,email_verified_at,status,submitted_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).bind(
        applicationId,
        reference,
        opportunityId,
        auth?.id ?? null,
        input.applicantName,
        input.applicantEmail,
        normalizeEmail(input.applicantEmail),
        input.applicantPhone,
        input.organization,
        input.coverNote,
        JSON.stringify(input.answers),
        await sha256(trackingToken),
        verifyToken ? await sha256(verifyToken) : null,
        verificationExpiresAt,
        auth ? now : null,
        status,
        now,
        now,
      ),
      context.env.DB.prepare(
        "INSERT INTO opportunity_application_events(id,application_id,actor_user_id,event_type,to_status,note,request_id) VALUES(?,?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        applicationId,
        auth?.id ?? null,
        "APPLICATION_CREATED",
        status,
        "Application received",
        context.get("requestId"),
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: auth?.id,
        actorType: auth ? "USER" : "SYSTEM",
        action: "OPPORTUNITY_APPLICATION_CREATED",
        entityType: "OPPORTUNITY_APPLICATION",
        entityId: applicationId,
      }),
      adminNotificationStatement(context.env.DB, {
        type: "OPPORTUNITY_APPLICATION",
        title: "New opportunity application",
        message: `${input.applicantName} applied for ${opportunity.title}.`,
        actionUrl: "/admin?section=applications",
        entityType: "OPPORTUNITY_APPLICATION",
        entityId: applicationId,
        dedupeKey: `opportunity-application:${applicationId}:created`,
      }),
    ];
    if (verificationEmail)
      statements.push(insertEmailStatement(context.env.DB, verificationEmail));
    statements.push(insertEmailStatement(context.env.DB, receiptEmail));
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id: applicationId,
          referenceCode: reference,
          trackingToken,
          verificationRequired: !auth,
        },
        context.get("requestId"),
      ),
      201,
    );
  },
);

communityRoutes.post("/opportunity-applications/verify", async (context) => {
  const input = await parseJson(context, z.object({ token: text(32, 512) }));
  await enforceRateLimit({
    db: context.env.DB,
    scope: "opportunity-application-verify",
    identifier: clientIp(context.req.raw),
    limit: 20,
    windowSeconds: 60 * 60,
  });
  const hash = await sha256(input.token);
  const application = await context.env.DB.prepare(
    "SELECT id,status,verification_expires_at FROM opportunity_applications WHERE verification_token_hash=?",
  )
    .bind(hash)
    .first<{
      id: string;
      status: string;
      verification_expires_at: string | null;
    }>();
  if (!application || application.status !== "EMAIL_VERIFICATION")
    throw new AppError({
      code: "INVALID_VERIFICATION_TOKEN",
      message: "This verification link is invalid or already used.",
      status: 400,
    });
  if (
    !application.verification_expires_at ||
    new Date(application.verification_expires_at) < new Date()
  )
    throw new AppError({
      code: "VERIFICATION_TOKEN_EXPIRED",
      message:
        "This verification link has expired. Submit the application again.",
      status: 410,
    });
  const now = new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE opportunity_applications SET status='SUBMITTED',email_verified_at=?,verification_token_hash=NULL,verification_expires_at=NULL,updated_at=? WHERE id=?",
    ).bind(now, now, application.id),
    context.env.DB.prepare(
      "INSERT INTO opportunity_application_events(id,application_id,event_type,from_status,to_status,note,request_id) VALUES(?,?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      application.id,
      "EMAIL_VERIFIED",
      "EMAIL_VERIFICATION",
      "SUBMITTED",
      "Applicant email verified",
      context.get("requestId"),
    ),
    adminNotificationStatement(context.env.DB, {
      type: "OPPORTUNITY_APPLICATION",
      title: "Opportunity application verified",
      message: "A guest opportunity application is ready for review.",
      actionUrl: "/admin?section=applications",
      entityType: "OPPORTUNITY_APPLICATION",
      entityId: application.id,
      dedupeKey: `opportunity-application:${application.id}:verified`,
    }),
  ]);
  return context.json(success({ verified: true }, context.get("requestId")));
});

communityRoutes.get("/opportunity-applications/track", async (context) => {
  const input = z
    .object({ reference: text(3, 100), token: text(32, 512) })
    .parse(context.req.query());
  await enforceRateLimit({
    db: context.env.DB,
    scope: "opportunity-application-track",
    identifier: clientIp(context.req.raw),
    limit: 60,
    windowSeconds: 60 * 60,
  });
  const tokenHash = await sha256(input.token);
  const application = await context.env.DB.prepare(
    `SELECT a.id,a.reference_code,a.status,a.cover_note,a.submitted_at,a.updated_at,o.title
     FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id
     WHERE a.reference_code=? AND a.tracking_token_hash=?`,
  )
    .bind(input.reference, tokenHash)
    .first<{
      id: string;
      reference_code: string;
      status: string;
      cover_note: string;
      submitted_at: string;
      updated_at: string;
      title: string;
    }>();
  if (!application)
    throw new AppError({
      code: "TRACKING_NOT_FOUND",
      message: "The reference or tracking token is incorrect.",
      status: 404,
    });
  const events = await context.env.DB.prepare(
    "SELECT event_type,from_status,to_status,note,created_at FROM opportunity_application_events WHERE application_id=? ORDER BY created_at ASC",
  )
    .bind(application.id)
    .all<Record<string, unknown>>();
  return context.json(
    success(
      {
        id: application.id,
        referenceCode: application.reference_code,
        type: "OPPORTUNITY",
        title: application.title,
        summary: application.cover_note,
        status: application.status,
        publicResponse: null,
        createdAt: application.submitted_at,
        updatedAt: application.updated_at,
        events: events.results.map((event) => ({
          eventType: event.event_type,
          fromStatus: event.from_status,
          toStatus: event.to_status,
          publicMessage: event.note,
          createdAt: event.created_at,
        })),
        attachments: [],
      },
      context.get("requestId"),
    ),
  );
});

communityRoutes.get(
  "/admin/opportunity-applications",
  sessionMiddleware({ required: true }),
  requireAnyPermission(["opportunity.read", "submissions.read"]),
  async (context) => {
    const result = await context.env.DB.prepare(
      `SELECT a.*,o.title AS opportunity_title,u.display_name AS reviewer_name
       FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id
       LEFT JOIN users u ON u.id=a.assigned_reviewer_id
       ORDER BY a.submitted_at DESC LIMIT 500`,
    ).all<Record<string, unknown>>();
    return context.json(
      success(result.results.map(rowToApi), context.get("requestId")),
    );
  },
);

communityRoutes.get(
  "/admin/opportunity-applications/:id",
  sessionMiddleware({ required: true }),
  requireAnyPermission(["opportunity.read", "submissions.read"]),
  async (context) => {
    const applicationId = id.parse(context.req.param("id"));
    const row = await context.env.DB.prepare(
      `SELECT a.*,o.title AS opportunity_title FROM opportunity_applications a
       JOIN opportunities o ON o.id=a.opportunity_id WHERE a.id=?`,
    )
      .bind(applicationId)
      .first<Record<string, unknown>>();
    if (!row)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Opportunity application not found.",
        status: 404,
      });
    const events = await context.env.DB.prepare(
      "SELECT event_type,from_status,to_status,note,created_at,actor_user_id FROM opportunity_application_events WHERE application_id=? ORDER BY created_at ASC",
    )
      .bind(applicationId)
      .all<Record<string, unknown>>();
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(String(row.payload_json || "{}"));
    } catch {
      /* Invalid legacy JSON is shown as an empty object. */
    }
    return context.json(
      success(
        {
          id: row.id,
          source: "OPPORTUNITY",
          referenceCode: row.reference_code,
          type: "OPPORTUNITY",
          title: row.opportunity_title,
          summary: row.cover_note,
          status: row.status,
          priority: row.priority,
          assignedReviewerId: row.assigned_reviewer_id,
          submitter: {
            name: row.applicant_name,
            email: row.applicant_email,
            phone: row.applicant_phone,
            institution: row.organization,
            department: null,
          },
          payload,
          publicResponse: null,
          internalNotes: row.internal_notes,
          createdAt: row.submitted_at,
          updatedAt: row.updated_at,
          attachments: [],
          events: events.results.map((event) => ({
            eventType: event.event_type,
            fromStatus: event.from_status,
            toStatus: event.to_status,
            note: event.note,
            createdAt: event.created_at,
            actorUserId: event.actor_user_id,
          })),
        },
        context.get("requestId"),
      ),
    );
  },
);

communityRoutes.get(
  "/admin/application-reviewers",
  sessionMiddleware({ required: true }),
  requireAnyPermission([
    "submissions.read",
    "membership.read",
    "volunteer.read",
    "event.read",
    "course.read",
    "opportunity.read",
  ]),
  async (context) => {
    const result = await context.env.DB.prepare(
      "SELECT id,display_name AS displayName,primary_email AS email FROM users WHERE status='EMAIL_VERIFIED' AND deleted_at IS NULL ORDER BY display_name COLLATE NOCASE LIMIT 250",
    ).all<Record<string, unknown>>();
    return context.json(success(result.results, context.get("requestId")));
  },
);

const opportunityTransitions: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  UNDER_REVIEW: ["NEEDS_INFORMATION", "APPROVED", "REJECTED", "ARCHIVED"],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  APPROVED: ["COMPLETED", "ARCHIVED"],
  REJECTED: ["UNDER_REVIEW", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
};

communityRoutes.patch(
  "/admin/opportunity-applications/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["opportunity.manage", "submissions.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const applicationId = id.parse(context.req.param("id"));
    const input = await parseJson(
      context,
      z.object({
        status: z.enum([
          "UNDER_REVIEW",
          "NEEDS_INFORMATION",
          "APPROVED",
          "REJECTED",
          "COMPLETED",
          "ARCHIVED",
        ]),
        reason: text(3, 2000),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
        assignedReviewerId: id.optional().nullable(),
      }),
    );
    const row = await context.env.DB.prepare(
      "SELECT id,user_id,applicant_name,applicant_email,reference_code,status,priority,assigned_reviewer_id,internal_notes FROM opportunity_applications WHERE id=?",
    )
      .bind(applicationId)
      .first<{
        id: string;
        user_id: string | null;
        applicant_name: string;
        applicant_email: string;
        reference_code: string;
        status: string;
        priority: string;
        assigned_reviewer_id: string | null;
        internal_notes: string | null;
      }>();
    if (!row)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Opportunity application not found.",
        status: 404,
      });
    if (!(opportunityTransitions[row.status] ?? []).includes(input.status))
      throw new AppError({
        code: "INVALID_APPLICATION_TRANSITION",
        message: `A ${row.status} application cannot move to ${input.status}.`,
        status: 409,
      });
    if (input.assignedReviewerId) {
      const reviewer = await context.env.DB.prepare(
        "SELECT id FROM users WHERE id=? AND status='EMAIL_VERIFIED' AND deleted_at IS NULL",
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
    const notes = [
      row.internal_notes,
      `[${now}] ${user.email}: ${input.reason}`,
    ]
      .filter(Boolean)
      .join("\n");
    const statusEmail = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: row.user_id,
      template: "SUBMISSION_STATUS",
      recipientEmail: row.applicant_email,
      payload: submissionStatusEmail({
        siteUrl: context.env.SITE_URL,
        submitterName: row.applicant_name,
        submissionType: "opportunity",
        referenceCode: row.reference_code,
        status: input.status,
        publicResponse: input.reason,
      }),
    });
    const statements: D1PreparedStatement[] = [
      context.env.DB.prepare(
        "UPDATE opportunity_applications SET status=?,priority=?,assigned_reviewer_id=?,internal_notes=?,updated_at=? WHERE id=? AND status=?",
      ).bind(
        input.status,
        input.priority ?? row.priority,
        input.assignedReviewerId === undefined
          ? row.assigned_reviewer_id
          : input.assignedReviewerId,
        notes,
        now,
        row.id,
        row.status,
      ),
      context.env.DB.prepare(
        "INSERT INTO opportunity_application_events(id,application_id,actor_user_id,event_type,from_status,to_status,note,request_id) VALUES(?,?,?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        row.id,
        user.id,
        "STATUS_CHANGED",
        row.status,
        input.status,
        input.reason,
        context.get("requestId"),
      ),
      insertEmailStatement(context.env.DB, statusEmail),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "OPPORTUNITY_APPLICATION_STATUS_CHANGED",
        entityType: "OPPORTUNITY_APPLICATION",
        entityId: row.id,
        reason: input.reason,
        metadata: {
          from: row.status,
          to: input.status,
          priority: input.priority ?? row.priority,
        },
      }),
    ];
    if (row.user_id)
      statements.push(
        userNotificationStatement(context.env.DB, {
          userId: row.user_id,
          type: "OPPORTUNITY_APPLICATION_STATUS",
          title: `Opportunity application ${input.status.toLowerCase().replaceAll("_", " ")}`,
          message: input.reason,
          actionUrl: `/track-submission?reference=${encodeURIComponent(row.reference_code)}`,
          entityType: "OPPORTUNITY_APPLICATION",
          entityId: row.id,
          dedupeKey: `opportunity-application:${row.id}:${input.status}`,
        }),
      );
    if (
      input.assignedReviewerId &&
      input.assignedReviewerId !== row.assigned_reviewer_id
    )
      statements.push(
        userNotificationStatement(context.env.DB, {
          userId: input.assignedReviewerId,
          type: "APPLICATION_ASSIGNED",
          title: `Application ${row.reference_code} assigned to you`,
          message: "An opportunity application is ready for your review.",
          actionUrl: "/admin?section=applications",
          entityType: "OPPORTUNITY_APPLICATION",
          entityId: row.id,
          dedupeKey: `opportunity-application:${row.id}:assigned:${input.assignedReviewerId}`,
        }),
      );
    await context.env.DB.batch(statements);
    return context.json(
      success({ id: row.id, status: input.status }, context.get("requestId")),
    );
  },
);

const financeSchema = z.object({
  transactionDate: z.string().datetime(),
  transactionType: text(2, 100),
  category: text(2, 100),
  direction: z.enum(["INCOME", "EXPENSE"]),
  amountMinor: z.number().int().min(0).max(1000000000),
  currency: text(3, 3).transform((value) => value.toUpperCase()),
  paymentMethod: optionalText(100),
  externalReference: optionalText(200),
  description: text(3, 5000),
  relatedModule: z.enum([
    "EVENT",
    "RESEARCH",
    "COURSE",
    "PROJECT",
    "MEMBERSHIP",
    "OPPORTUNITY",
    "PARTNERSHIP",
    "DONATION",
    "OTHER",
  ]),
  relatedEntityId: optionalText(100),
  status: z
    .enum(["PENDING", "SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED"])
    .default("PENDING"),
  receiptObjectKey: optionalText(512),
  notes: optionalText(10000),
});

communityRoutes.get(
  "/admin/finance/transactions",
  sessionMiddleware({ required: true }),
  requirePermission("finance.read"),
  async (context) => {
    const query = z
      .object({
        status: z.string().optional(),
        direction: z.string().optional(),
        category: z.string().optional(),
        module: z.string().optional(),
        q: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(context.req.query());
    const clauses: string[] = [];
    const values: unknown[] = [];
    for (const [column, value] of [
      ["status", query.status],
      ["direction", query.direction],
      ["category", query.category],
      ["related_module", query.module],
    ] as const)
      if (value) {
        clauses.push(`${column}=?`);
        values.push(value);
      }
    if (query.from) {
      clauses.push("transaction_date>=?");
      values.push(query.from);
    }
    if (query.to) {
      clauses.push("transaction_date<=?");
      values.push(query.to);
    }
    if (query.q) {
      clauses.push(
        "(transaction_code LIKE ? OR external_reference LIKE ? OR description LIKE ?)",
      );
      values.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
    }
    const result = await context.env.DB.prepare(
      `SELECT * FROM finance_transactions ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY transaction_date DESC LIMIT 1000`,
    )
      .bind(...values)
      .all<Record<string, unknown>>();
    return context.json(
      success(result.results.map(rowToApi), context.get("requestId")),
    );
  },
);

communityRoutes.get(
  "/admin/finance/summary",
  sessionMiddleware({ required: true }),
  requirePermission("finance.read"),
  async (context) => {
    const row = await context.env.DB.prepare(
      `SELECT
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='INCOME' THEN amount_minor END),0) AS total_income,
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='EXPENSE' THEN amount_minor END),0) AS total_expenses,
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='INCOME' THEN amount_minor WHEN status='VERIFIED' AND direction='EXPENSE' THEN -amount_minor END),0) AS net_balance,
       COALESCE(SUM(CASE WHEN status IN ('PENDING','SUBMITTED') THEN 1 ELSE 0 END),0) AS pending_verification,
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND transaction_date>=datetime('now','start of month') AND direction='INCOME' THEN amount_minor WHEN status='VERIFIED' AND transaction_date>=datetime('now','start of month') AND direction='EXPENSE' THEN -amount_minor END),0) AS this_month,
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND transaction_date>=datetime('now','start of year') AND direction='INCOME' THEN amount_minor WHEN status='VERIFIED' AND transaction_date>=datetime('now','start of year') AND direction='EXPENSE' THEN -amount_minor END),0) AS this_year
       FROM finance_transactions`,
    ).first<Record<string, unknown>>();
    return context.json(success(rowToApi(row ?? {}), context.get("requestId")));
  },
);

communityRoutes.post(
  "/admin/finance/transactions",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("finance.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, financeSchema);
    if (
      input.status === "VERIFIED" &&
      !user.permissions.includes("finance.verify")
    )
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "Payment verification requires the finance.verify permission.",
        status: 403,
      });
    const transactionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const code = `FIN-${new Date().getUTCFullYear()}-${transactionId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO finance_transactions(id,transaction_code,transaction_date,transaction_type,category,direction,amount_minor,currency,payment_method,external_reference,description,related_module,related_entity_id,submitted_by,verified_by,verified_at,status,receipt_object_key,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).bind(
        transactionId,
        code,
        input.transactionDate,
        input.transactionType,
        input.category,
        input.direction,
        input.amountMinor,
        input.currency,
        input.paymentMethod,
        input.externalReference,
        input.description,
        input.relatedModule,
        input.relatedEntityId,
        user.id,
        input.status === "VERIFIED" ? user.id : null,
        input.status === "VERIFIED" ? now : null,
        input.status,
        input.receiptObjectKey,
        input.notes,
        now,
        now,
      ),
      context.env.DB.prepare(
        "INSERT INTO finance_transaction_events(id,transaction_id,actor_user_id,event_type,to_status,note,request_id) VALUES(?,?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        transactionId,
        user.id,
        "TRANSACTION_CREATED",
        input.status,
        input.notes,
        context.get("requestId"),
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "FINANCE_TRANSACTION_CREATED",
        entityType: "FINANCE_TRANSACTION",
        entityId: transactionId,
        metadata: {
          amountMinor: input.amountMinor,
          currency: input.currency,
          direction: input.direction,
          status: input.status,
        },
      }),
    ];
    if (input.status === "SUBMITTED")
      statements.push(
        adminNotificationStatement(context.env.DB, {
          type: "PAYMENT_REVIEW",
          title: "Payment requires verification",
          message: `${code} is waiting for finance review.`,
          actionUrl: "/admin?section=finance",
          entityType: "FINANCE_TRANSACTION",
          entityId: transactionId,
          dedupeKey: `finance:${transactionId}:submitted`,
        }),
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        { id: transactionId, transactionCode: code },
        context.get("requestId"),
      ),
      201,
    );
  },
);

communityRoutes.patch(
  "/admin/finance/transactions/:id/status",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("finance.verify"),
  async (context) => {
    const { user } = requireAuth(context);
    const transactionId = id.parse(context.req.param("id"));
    const input = await parseJson(
      context,
      z.object({
        status: z.enum(["VERIFIED", "REJECTED", "CANCELLED"]),
        reason: text(3, 2000),
      }),
    );
    const current = await context.env.DB.prepare(
      "SELECT status FROM finance_transactions WHERE id=?",
    )
      .bind(transactionId)
      .first<{ status: string }>();
    if (!current)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Transaction not found.",
        status: 404,
      });
    if (
      transactionId.startsWith("membership-payment:") ||
      transactionId.startsWith("learning-payment:")
    )
      throw new AppError({
        code: "SOURCE_WORKFLOW_REQUIRED",
        message:
          "Review this payment in its membership or learning workflow so every linked record remains synchronized.",
        status: 409,
      });
    if (["VERIFIED", "REJECTED", "CANCELLED"].includes(current.status))
      throw new AppError({
        code: "FINAL_STATE",
        message: "This transaction already has a final decision.",
        status: 409,
      });
    const now = new Date().toISOString();
    const statements = [
      context.env.DB.prepare(
        "UPDATE finance_transactions SET status=?,verified_by=?,verified_at=?,decision_reason=?,updated_at=? WHERE id=?",
      ).bind(input.status, user.id, now, input.reason, now, transactionId),
      context.env.DB.prepare(
        "INSERT INTO finance_transaction_events(id,transaction_id,actor_user_id,event_type,from_status,to_status,note,request_id) VALUES(?,?,?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        transactionId,
        user.id,
        "STATUS_CHANGED",
        current.status,
        input.status,
        input.reason,
        context.get("requestId"),
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "FINANCE_TRANSACTION_STATUS_CHANGED",
        entityType: "FINANCE_TRANSACTION",
        entityId: transactionId,
        reason: input.reason,
        metadata: { from: current.status, to: input.status },
      }),
    ];
    const owner = await context.env.DB.prepare(
      "SELECT submitted_by FROM finance_transactions WHERE id=?",
    )
      .bind(transactionId)
      .first<{ submitted_by: string | null }>();
    if (owner?.submitted_by)
      statements.push(
        userNotificationStatement(context.env.DB, {
          userId: owner.submitted_by,
          type: `PAYMENT_${input.status}`,
          title: `Payment ${input.status.toLowerCase()}`,
          message: input.reason,
          actionUrl: "/dashboard",
          entityType: "FINANCE_TRANSACTION",
          entityId: transactionId,
          dedupeKey: `finance:${transactionId}:${input.status}`,
        }),
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        { id: transactionId, status: input.status },
        context.get("requestId"),
      ),
    );
  },
);

communityRoutes.get(
  "/notifications/inbox",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const query = z
      .object({
        q: z.string().optional(),
        type: z.string().optional(),
        unread: z.enum(["true", "false"]).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(context.req.query());
    const clauses = ["user_id=?"];
    const values: unknown[] = [user.id];
    if (query.q) {
      clauses.push("(title LIKE ? OR message LIKE ?)");
      values.push(`%${query.q}%`, `%${query.q}%`);
    }
    if (query.type) {
      clauses.push("notification_type=?");
      values.push(query.type);
    }
    if (query.unread === "true") clauses.push("read_at IS NULL");
    if (query.unread === "false") clauses.push("read_at IS NOT NULL");
    const where = clauses.join(" AND ");
    const [rows, count, unread] = await Promise.all([
      context.env.DB.prepare(
        `SELECT id,notification_type AS type,title,message,action_url AS actionUrl,related_entity_type AS entityType,related_entity_id AS entityId,priority,read_at AS readAt,created_at AS createdAt FROM user_notifications WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
        .bind(...values, query.pageSize, (query.page - 1) * query.pageSize)
        .all<Record<string, unknown>>(),
      context.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM user_notifications WHERE ${where}`,
      )
        .bind(...values)
        .first<{ count: number }>(),
      context.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM user_notifications WHERE user_id=? AND read_at IS NULL",
      )
        .bind(user.id)
        .first<{ count: number }>(),
    ]);
    return context.json(
      success(
        {
          items: rows.results,
          total: Number(count?.count ?? 0),
          unreadCount: Number(unread?.count ?? 0),
          page: query.page,
          pageSize: query.pageSize,
        },
        context.get("requestId"),
      ),
    );
  },
);

communityRoutes.post(
  "/notifications/mark-all-read",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      "UPDATE user_notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",
    )
      .bind(now, user.id)
      .run();
    return context.json(
      success({ updated: result.meta.changes }, context.get("requestId")),
    );
  },
);

communityRoutes.get(
  "/admin/applications",
  sessionMiddleware({ required: true }),
  requireAnyPermission([
    "submissions.read",
    "membership.read",
    "volunteer.read",
    "event.read",
    "course.read",
    "opportunity.read",
  ]),
  async (context) => {
    const query = z
      .object({
        type: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(context.req.query());
    const results = await Promise.all([
      context.env.DB.prepare(
        "SELECT 'PLATFORM' AS source,id,reference_code,submission_type AS type,title,summary,status,submitter_name AS applicant_name,submitter_email AS applicant_email,submitter_phone AS applicant_phone,institution,department,payload_json,priority,assigned_reviewer_id,created_at,updated_at FROM platform_submissions",
      ).all<Record<string, unknown>>(),
      context.env.DB.prepare(
        "SELECT 'MEMBERSHIP' AS source,a.id,'MEM-'||upper(substr(replace(a.id,'-',''),1,10)) AS reference_code,'MEMBERSHIP' AS type,COALESCE(t.name,'Membership application') AS title,COALESCE(a.motivation,'Membership application') AS summary,a.status,COALESCE(a.full_name,u.display_name) AS applicant_name,COALESCE(a.email_snapshot,u.primary_email) AS applicant_email,a.phone AS applicant_phone,NULL AS institution,a.department,json_object('studentId',a.student_id,'batch',a.batch,'academicSession',a.academic_session,'skills',json(a.skills_json),'interests',json(a.interests_json),'experience',a.experience,'motivation',a.motivation) AS payload_json,'NORMAL' AS priority,a.reviewed_by AS assigned_reviewer_id,a.created_at,a.updated_at FROM membership_applications a JOIN users u ON u.id=a.user_id LEFT JOIN membership_types t ON t.id=a.membership_type_id WHERE a.status!='DRAFT'",
      ).all<Record<string, unknown>>(),
      context.env.DB.prepare(
        "SELECT 'VOLUNTEER' AS source,a.id,'VOL-'||upper(substr(replace(a.id,'-',''),1,10)) AS reference_code,'VOLUNTEER' AS type,COALESCE(p.name,'Volunteer application') AS title,COALESCE(a.motivation,'Volunteer application') AS summary,a.status,COALESCE(a.full_name,u.display_name) AS applicant_name,COALESCE(a.email_snapshot,u.primary_email) AS applicant_email,a.phone AS applicant_phone,a.organization AS institution,a.department,json_object('batch',a.batch,'skills',json(a.skills_json),'interests',json(a.interests_json),'experience',a.experience,'motivation',a.motivation) AS payload_json,'NORMAL' AS priority,a.reviewed_by AS assigned_reviewer_id,a.created_at,a.updated_at FROM volunteer_applications a JOIN users u ON u.id=a.user_id LEFT JOIN volunteer_programs p ON p.id=a.volunteer_program_id WHERE a.status!='DRAFT'",
      ).all<Record<string, unknown>>(),
      context.env.DB.prepare(
        "SELECT 'OPPORTUNITY' AS source,a.id,a.reference_code,'OPPORTUNITY' AS type,o.title,a.cover_note AS summary,a.status,a.applicant_name,a.applicant_email,a.applicant_phone,a.organization AS institution,NULL AS department,a.payload_json,a.priority,a.assigned_reviewer_id,a.submitted_at AS created_at,a.updated_at FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id",
      ).all<Record<string, unknown>>(),
      context.env.DB.prepare(
        "SELECT 'EVENT' AS source,r.id,'EVT-'||upper(substr(replace(r.id,'-',''),1,10)) AS reference_code,'EVENT_REGISTRATION' AS type,json_extract(e.data_json,'$.title') AS title,'Event registration' AS summary,r.registration_status AS status,r.participant_name AS applicant_name,r.email AS applicant_email,r.phone AS applicant_phone,NULL AS institution,NULL AS department,json_object('eventId',r.event_id,'paymentStatus',r.payment_status,'attendanceStatus',r.attendance_status,'feeMinor',r.fee_minor,'currency',r.currency) AS payload_json,'NORMAL' AS priority,r.reviewed_by AS assigned_reviewer_id,r.registered_at AS created_at,COALESCE(r.reviewed_at,r.registered_at) AS updated_at FROM event_registrations r JOIN website_content_items e ON e.id=r.event_id",
      ).all<Record<string, unknown>>(),
      context.env.DB.prepare(
        "SELECT 'COURSE' AS source,r.id,'CRS-'||upper(substr(replace(r.id,'-',''),1,10)) AS reference_code,'COURSE_REGISTRATION' AS type,c.title,'Course enrollment' AS summary,r.enrollment_status AS status,u.display_name AS applicant_name,u.primary_email AS applicant_email,NULL AS applicant_phone,NULL AS institution,NULL AS department,json_object('courseId',r.course_id,'paymentStatus',r.payment_status,'completedLessons',(SELECT COUNT(*) FROM course_progress p WHERE p.enrollment_id=r.id),'priceMinor',r.price_minor,'currency',r.currency) AS payload_json,'NORMAL' AS priority,NULL AS assigned_reviewer_id,r.enrolled_at AS created_at,r.updated_at FROM course_enrollments r JOIN learning_courses c ON c.id=r.course_id JOIN users u ON u.id=r.user_id",
      ).all<Record<string, unknown>>(),
    ]);
    const normalized = results
      .flatMap((result) => result.results)
      .filter((row) => {
        if (query.type && row.type !== query.type) return false;
        if (query.status && row.status !== query.status) return false;
        if (
          query.search &&
          !String(
            `${row.reference_code} ${row.title} ${row.applicant_name} ${row.applicant_email}`,
          )
            .toLowerCase()
            .includes(query.search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((left, right) =>
        String(right.created_at).localeCompare(String(left.created_at)),
      );
    const items = normalized
      .slice(query.offset, query.offset + query.limit)
      .map((row) => {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(String(row.payload_json || "{}"));
        } catch {
          /* Invalid legacy JSON becomes an empty detail object. */
        }
        return {
          id: row.id,
          source: row.source,
          referenceCode: row.reference_code,
          type: row.type,
          title: row.title,
          summary: row.summary,
          status: row.status,
          priority: row.priority,
          assignedReviewerId: row.assigned_reviewer_id,
          submitter: {
            name: row.applicant_name,
            email: row.applicant_email,
            phone: row.applicant_phone,
            institution: row.institution,
            department: row.department,
          },
          payload,
          publicResponse: null,
          internalNotes: null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    return context.json(
      success({ items, total: normalized.length }, context.get("requestId")),
    );
  },
);

communityRoutes.post(
  "/admin/partnership-applications/:id/convert",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("partner.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const submissionId = id.parse(context.req.param("id"));
    const submission = await context.env.DB.prepare(
      "SELECT id,title,summary,payload_json,status FROM platform_submissions WHERE id=? AND submission_type='COLLABORATION'",
    )
      .bind(submissionId)
      .first<{
        id: string;
        title: string;
        summary: string;
        payload_json: string;
        status: string;
      }>();
    if (!submission)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Partnership application not found.",
        status: 404,
      });
    if (!["APPROVED", "PUBLISHED"].includes(submission.status))
      throw new AppError({
        code: "APPROVAL_REQUIRED",
        message: "Approve the partnership application before conversion.",
        status: 409,
      });
    const existing = await context.env.DB.prepare(
      "SELECT id FROM partner_profiles WHERE source_submission_id=?",
    )
      .bind(submissionId)
      .first<{ id: string }>();
    if (existing)
      return context.json(
        success(
          { id: existing.id, alreadyConverted: true },
          context.get("requestId"),
        ),
      );
    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(submission.payload_json);
    } catch {
      /* Fall back to canonical submission fields. */
    }
    const organization = String(
      payload.organization || submission.title || "Partner",
    ).trim();
    const recordId = crypto.randomUUID();
    const now = new Date().toISOString();
    const slug = `${organization
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 130)}-${recordId.slice(0, 8)}`;
    const data = {
      title: organization,
      name: organization,
      slug,
      description: submission.summary,
      full_description: String(payload.description || submission.summary),
      category: String(payload.collaborationType || "Other"),
      country: String(payload.country || "Bangladesh"),
      city: payload.city || null,
      website: payload.organizationWebsite || null,
      contact_email: payload.submitter?.email || null,
      contact_person: payload.submitter?.name || null,
      partnership_type: payload.collaborationType || null,
      active: true,
      featured: false,
    };
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at) VALUES(?,'partners',?,'DRAFT',0,?,?,?,?)",
      ).bind(recordId, JSON.stringify(data), user.id, user.id, now, now),
      context.env.DB.prepare(
        `INSERT INTO partner_profiles(id,source_submission_id,slug,organization_name,short_description,full_description,category,country,city,website_url,contact_email,contact_person,partnership_type,active,featured,sort_order,workflow_status,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,0,'DRAFT',?,?,?,?)`,
      ).bind(
        recordId,
        submissionId,
        slug,
        organization,
        submission.summary,
        String(payload.description || submission.summary),
        String(payload.collaborationType || "Other"),
        String(payload.country || "Bangladesh"),
        payload.city || null,
        payload.organizationWebsite || null,
        payload.submitter?.email || null,
        payload.submitter?.name || null,
        payload.collaborationType || null,
        user.id,
        user.id,
        now,
        now,
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "PARTNERSHIP_APPLICATION_CONVERTED",
        entityType: "PARTNER",
        entityId: recordId,
        metadata: { submissionId },
      }),
    ]);
    return context.json(
      success({ id: recordId, status: "DRAFT" }, context.get("requestId")),
      201,
    );
  },
);
