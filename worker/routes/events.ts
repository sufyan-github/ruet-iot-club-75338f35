import { Hono } from "hono";
import { z } from "zod";
import { csrfMiddleware, requireAuth, sessionMiddleware } from "../auth/session";
import { parseJson } from "../auth/validation";
import { createAuditStatement } from "../db/audit";
import { success } from "../lib/api-envelope";
import { AppError } from "../lib/app-error";
import { sanitizeBlogHtml } from "../lib/sanitize-blog-html";
import { requireAnyPermission, requirePermission } from "../middleware/authorization";
import type { AppEnvironment } from "../types";

const idSchema = z.string().uuid();
const mediaUrl = z.string().trim().max(800).refine(
  (value) => value === "" || value.startsWith("/api/v1/media/files/") || /^https:\/\//u.test(value),
  "Use an HTTPS or Media Library URL.",
);
const optionalUrl = mediaUrl.optional().default("");
const textList = z.array(z.string().trim().min(1).max(200)).max(60).default([]);
const idList = z.array(idSchema).max(60).default([]);

const eventSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(200),
  title: z.string().trim().min(3).max(200),
  shortDescription: z.string().trim().min(3).max(500),
  fullDescription: z.string().trim().min(3).max(20000),
  eventType: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(100),
  eventStatus: z.enum(["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED", "POSTPONED"]).default("SCHEDULED"),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  timezone: z.string().trim().min(3).max(100).default("Asia/Dhaka"),
  locationType: z.enum(["PHYSICAL", "ONLINE", "HYBRID"]),
  venue: z.string().trim().max(240).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  country: z.string().trim().max(120).default("Bangladesh"),
  latitude: z.number().min(-90).max(90).nullable().optional().default(null),
  longitude: z.number().min(-180).max(180).nullable().optional().default(null),
  onlineUrl: optionalUrl,
  onlinePlatform: z.string().trim().max(120).optional().default(""),
  meetingInstructions: z.string().trim().max(3000).optional().default(""),
  mapUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  thumbnailUrl: optionalUrl,
  gallery: z.array(mediaUrl).max(30).default([]),
  posterUrl: optionalUrl,
  videoUrl: optionalUrl,
  registrationRequired: z.boolean().default(true),
  registrationMode: z.enum(["INTERNAL", "EXTERNAL", "CLOSED"]).default("INTERNAL"),
  registrationUrl: optionalUrl,
  registrationDeadline: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  maxParticipants: z.number().int().min(0).max(1000000).default(0),
  registrationCapacityOverride: z.boolean().default(false),
  feeMinor: z.number().int().min(0).max(100000000).default(0),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("BDT"),
  paymentRequired: z.boolean().default(false),
  paymentMethods: z.array(z.enum(["BKASH", "CASH"])).min(1).max(2).default(["BKASH"]),
  bkashNumber: z.string().trim().regex(/^01\d{9}$/u).default("01580352238"),
  registrationStatus: z.enum(["UPCOMING", "OPEN", "CLOSED", "FULL"]).default("OPEN"),
  organizer: z.string().trim().min(2).max(200).default("RUET IoT Club"),
  organizerPersonId: idSchema.nullable().optional().default(null),
  coOrganizers: textList,
  coOrganizerIds: idList,
  partners: textList,
  partnerIds: idList,
  sponsors: textList,
  sponsorIds: idList,
  speakers: textList,
  speakerIds: idList,
  trainers: textList,
  trainerIds: idList,
  tags: textList,
  targetAudience: z.string().trim().max(3000).optional().default(""),
  eligibility: z.string().trim().max(10000).optional().default(""),
  certificateAvailable: z.boolean().default(false),
  certificateRequireRegistration: z.boolean().default(true),
  certificateRequirePayment: z.boolean().default(true),
  certificateRequireAttendance: z.boolean().default(true),
  certificateMinAttendancePercent: z.number().int().min(0).max(100).default(100),
  contactEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().default(""),
  seoTitle: z.string().trim().max(200).optional().default(""),
  metaDescription: z.string().trim().max(500).optional().default(""),
  ogImageUrl: optionalUrl,
  canonicalUrl: optionalUrl,
  workflowStatus: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
}).superRefine((event, context) => {
  if (new Date(event.endsAt) < new Date(event.startsAt)) context.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after start time." });
  if (["PHYSICAL", "HYBRID"].includes(event.locationType) && !event.venue && !event.address) context.addIssue({ code: "custom", path: ["venue"], message: "Physical and hybrid events require a venue or address." });
  if (["ONLINE", "HYBRID"].includes(event.locationType) && !event.onlineUrl) context.addIssue({ code: "custom", path: ["onlineUrl"], message: "Online and hybrid events require an online URL." });
  if (event.registrationRequired && event.registrationMode === "EXTERNAL" && !event.registrationUrl) context.addIssue({ code: "custom", path: ["registrationUrl"], message: "External registration requires a URL." });
  if (event.paymentRequired && event.feeMinor <= 0) context.addIssue({ code: "custom", path: ["feeMinor"], message: "Paid events require a positive fee." });
  if (!event.paymentRequired && event.feeMinor !== 0) context.addIssue({ code: "custom", path: ["feeMinor"], message: "Free events cannot have a fee." });
});

type EventInput = z.infer<typeof eventSchema>;
const boolColumns = new Set(["featured", "registration_required", "payment_required", "registration_capacity_override", "certificate_available", "certificate_require_registration", "certificate_require_payment", "certificate_require_attendance"]);

function camel(value: string) { return value.replace(/_([a-z])/gu, (_, letter: string) => letter.toUpperCase()); }
function eventView(row: Record<string, unknown>) {
  const item: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith("_json")) {
      try { item[camel(key.slice(0, -5))] = JSON.parse(String(value || "[]")); } catch { item[camel(key.slice(0, -5))] = []; }
    } else item[camel(key)] = boolColumns.has(key) ? Boolean(value) : value;
  }
  const now = Date.now(), starts = new Date(String(row.starts_at)).getTime(), ends = new Date(String(row.ends_at)).getTime();
  if (!["CANCELLED", "POSTPONED"].includes(String(row.event_status))) item.eventStatus = now > ends ? "COMPLETED" : now >= starts ? "ONGOING" : "SCHEDULED";
  const approved = Number(row.approved_count || 0), reserved = Number(row.reserved_count || 0), capacity = Number(row.max_participants || 0);
  const deadline = row.registration_deadline ? new Date(String(row.registration_deadline)).getTime() : null;
  const manual = String(row.registration_status);
  item.registrationStatus = manual === "CLOSED" || String(row.registration_mode) === "CLOSED" || (deadline !== null && now > deadline) || now > ends
    ? "CLOSED" : capacity > 0 && reserved >= capacity && Number(row.registration_capacity_override) !== 1
      ? "FULL" : starts > now && manual === "UPCOMING" ? "UPCOMING" : "OPEN";
  item.approvedCount = approved;
  item.reservedCount = reserved;
  item.remainingCapacity = capacity > 0 ? Math.max(0, capacity - reserved) : null;
  return item;
}
function nullable(value: string | undefined) { return value?.trim() || null; }
function legacyData(input: EventInput) {
  return {
    slug: input.slug, title: input.title, description: input.shortDescription, full_description: input.fullDescription,
    type: input.eventType, category: input.category, event_status: input.eventStatus.toLowerCase(), date: input.startsAt, end_date: input.endsAt,
    timezone: input.timezone, location_type: input.locationType.toLowerCase(), venue: input.venue, address: input.address, city: input.city,
    country: input.country, latitude: input.latitude, longitude: input.longitude, online_url: input.onlineUrl, online_platform: input.onlinePlatform,
    meeting_instructions: input.meetingInstructions, map_url: input.mapUrl, image_url: input.coverImageUrl, thumbnail_url: input.thumbnailUrl,
    gallery: input.gallery, poster_url: input.posterUrl, video_url: input.videoUrl, registration_required: input.registrationRequired,
    registration_mode: input.registrationMode.toLowerCase(), registration_url: input.registrationUrl, registration_deadline: input.registrationDeadline || null,
    max_participants: input.maxParticipants, registration_capacity_override: input.registrationCapacityOverride, is_paid: input.paymentRequired,
    registration_fee: input.feeMinor / 100, currency: input.currency, payment_required: input.paymentRequired, payment_methods: input.paymentMethods,
    payment_number: input.bkashNumber, bkash_number: input.bkashNumber, registration_status: input.registrationStatus.toLowerCase(),
    organizer: input.organizer, co_organizers: input.coOrganizers, partners: input.partners, sponsors: input.sponsors, speakers: input.speakers,
    trainers: input.trainers, tags: input.tags, target_audience: input.targetAudience, eligibility: input.eligibility,
    certificate_available: input.certificateAvailable, certificate_requirements: { registration: input.certificateRequireRegistration,
      payment: input.certificateRequirePayment, attendance: input.certificateRequireAttendance, min_attendance_percent: input.certificateMinAttendancePercent },
    contact_email: input.contactEmail, contact_phone: input.contactPhone, seo_title: input.seoTitle, meta_description: input.metaDescription,
    og_image: input.ogImageUrl, canonical_url: input.canonicalUrl, featured: input.featured,
  };
}

const columns = [
  "id", "slug", "title", "short_description", "full_description", "event_type", "category", "event_status", "featured", "sort_order", "starts_at", "ends_at",
  "timezone", "location_type", "venue", "address", "city", "country", "latitude", "longitude", "online_url", "online_platform", "meeting_instructions", "map_url",
  "cover_image_url", "thumbnail_url", "gallery_json", "poster_url", "video_url", "registration_required", "registration_mode", "registration_url", "registration_deadline",
  "max_participants", "registration_capacity_override", "fee_minor", "currency", "payment_required", "payment_methods_json", "bkash_number", "registration_status",
  "organizer", "organizer_person_id", "co_organizers_json", "co_organizer_ids_json", "partners_json", "partner_ids_json", "sponsors_json", "sponsor_ids_json",
  "speakers_json", "speaker_ids_json", "trainers_json", "trainer_ids_json", "tags_json", "target_audience", "eligibility", "certificate_available",
  "certificate_require_registration", "certificate_require_payment", "certificate_require_attendance", "certificate_min_attendance_percent", "contact_email", "contact_phone",
  "seo_title", "meta_description", "og_image_url", "canonical_url", "workflow_status", "published_at", "created_by", "updated_by", "created_at", "updated_at",
] as const;
function values(input: EventInput, id: string, userId: string, now: string, publishedAt: string | null) {
  return [
    id, input.slug, input.title, input.shortDescription, sanitizeBlogHtml(input.fullDescription), input.eventType, input.category, input.eventStatus, Number(input.featured), input.sortOrder,
    input.startsAt, input.endsAt, input.timezone, input.locationType, nullable(input.venue), nullable(input.address), nullable(input.city), input.country, input.latitude,
    input.longitude, nullable(input.onlineUrl), nullable(input.onlinePlatform), nullable(input.meetingInstructions), nullable(input.mapUrl), nullable(input.coverImageUrl),
    nullable(input.thumbnailUrl), JSON.stringify(input.gallery), nullable(input.posterUrl), nullable(input.videoUrl), Number(input.registrationRequired), input.registrationMode,
    nullable(input.registrationUrl), nullable(input.registrationDeadline), input.maxParticipants, Number(input.registrationCapacityOverride), input.feeMinor, input.currency,
    Number(input.paymentRequired), JSON.stringify(input.paymentMethods), input.bkashNumber, input.registrationStatus, input.organizer, input.organizerPersonId,
    JSON.stringify(input.coOrganizers), JSON.stringify(input.coOrganizerIds), JSON.stringify(input.partners), JSON.stringify(input.partnerIds), JSON.stringify(input.sponsors),
    JSON.stringify(input.sponsorIds), JSON.stringify(input.speakers), JSON.stringify(input.speakerIds), JSON.stringify(input.trainers), JSON.stringify(input.trainerIds), JSON.stringify(input.tags),
    nullable(input.targetAudience), nullable(input.eligibility), Number(input.certificateAvailable), Number(input.certificateRequireRegistration), Number(input.certificateRequirePayment),
    Number(input.certificateRequireAttendance), input.certificateMinAttendancePercent, nullable(input.contactEmail), nullable(input.contactPhone), nullable(input.seoTitle),
    nullable(input.metaDescription), nullable(input.ogImageUrl), nullable(input.canonicalUrl), input.workflowStatus, publishedAt, userId, userId, now, now,
  ];
}
const selectEvent = `SELECT e.*,
  (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id=e.id AND r.registration_status='APPROVED') AS approved_count,
  (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id=e.id AND r.registration_status IN ('PENDING','APPROVED')) AS reserved_count FROM managed_events e`;

export const eventRoutes = new Hono<AppEnvironment>();
eventRoutes.get("/admin/events", sessionMiddleware({ required: true }), requirePermission("event.read"), async (context) => {
  const rows = await context.env.DB.prepare(`${selectEvent} WHERE e.workflow_status!='ARCHIVED' ORDER BY e.updated_at DESC LIMIT 500`).all<Record<string, unknown>>();
  return context.json(success(rows.results.map(eventView), context.get("requestId")));
});
eventRoutes.get("/admin/events/:id", sessionMiddleware({ required: true }), requirePermission("event.read"), async (context) => {
  const id = idSchema.parse(context.req.param("id"));
  const row = await context.env.DB.prepare(`${selectEvent} WHERE e.id=?`).bind(id).first<Record<string, unknown>>();
  if (!row) throw new AppError({ code: "EVENT_NOT_FOUND", message: "The event was not found.", status: 404 });
  return context.json(success(eventView(row), context.get("requestId")));
});
eventRoutes.put("/admin/events/:id", sessionMiddleware({ required: true }), csrfMiddleware(), requireAnyPermission(["event.manage", "content.manage"]), async (context) => {
  const { user } = requireAuth(context), id = idSchema.parse(context.req.param("id"));
  const input = await parseJson(context, eventSchema);
  const duplicate = await context.env.DB.prepare("SELECT id FROM managed_events WHERE slug=? AND id!=?").bind(input.slug, id).first("id");
  if (duplicate) throw new AppError({ code: "EVENT_SLUG_EXISTS", message: "Another event already uses this slug.", status: 409 });
  const previous = await context.env.DB.prepare("SELECT workflow_status,published_at FROM managed_events WHERE id=?").bind(id).first<{ workflow_status: string; published_at: string | null }>();
  const now = new Date().toISOString(), publishTime = input.workflowStatus === "PUBLISHED" ? previous?.published_at || now : null;
  const updateColumns = columns.filter((column) => !["id", "created_by", "created_at"].includes(column));
  const sanitizedInput = { ...input, fullDescription: sanitizeBlogHtml(input.fullDescription) };
  const action = !previous ? "EVENT_CREATED" : previous.workflow_status !== input.workflowStatus ? `EVENT_${input.workflowStatus === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED"}` : "EVENT_UPDATED";
  const statements = [
    context.env.DB.prepare(`INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at,published_at,archived_at)
      VALUES(?,'events',?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,sort_order=excluded.sort_order,
      updated_by=excluded.updated_by,updated_at=excluded.updated_at,published_at=excluded.published_at,archived_at=NULL`)
      .bind(id, JSON.stringify(legacyData(sanitizedInput)), input.workflowStatus, input.sortOrder, user.id, user.id, now, now, publishTime),
    context.env.DB.prepare(`INSERT INTO managed_events(${columns.join(",")}) VALUES(${columns.map(() => "?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${updateColumns.map((column) => `${column}=excluded.${column}`).join(",")}`)
      .bind(...values(sanitizedInput, id, user.id, now, publishTime)),
    createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action, entityType: "EVENT", entityId: id, metadata: { slug: input.slug, workflowStatus: input.workflowStatus } }),
  ];
  if (input.workflowStatus === "PUBLISHED" && previous?.workflow_status !== "PUBLISHED") statements.push(context.env.DB.prepare(
    `INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
     SELECT lower(hex(randomblob(16))),id,'EVENT_PUBLISHED',?,?,?,'EVENT',?,'NORMAL',? FROM users WHERE status='EMAIL_VERIFIED' AND deleted_at IS NULL`,
  ).bind(`New event: ${input.title}`, input.shortDescription, `/events/${input.slug}`, id, `event:published:${id}`));
  await context.env.DB.batch(statements);
  return context.json(success({ id, status: input.workflowStatus, action }, context.get("requestId")), previous ? 200 : 201);
});
eventRoutes.delete("/admin/events/:id", sessionMiddleware({ required: true }), csrfMiddleware(), requireAnyPermission(["event.manage", "content.manage"]), async (context) => {
  const { user } = requireAuth(context), id = idSchema.parse(context.req.param("id")), now = new Date().toISOString();
  const result = await context.env.DB.prepare("UPDATE managed_events SET workflow_status='ARCHIVED',updated_by=?,updated_at=? WHERE id=? AND workflow_status!='ARCHIVED' RETURNING id").bind(user.id, now, id).first("id");
  if (!result) throw new AppError({ code: "EVENT_NOT_FOUND", message: "The event was not found.", status: 404 });
  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE website_content_items SET status='ARCHIVED',archived_at=?,updated_by=?,updated_at=? WHERE id=?").bind(now, user.id, now, id),
    createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "EVENT_ARCHIVED", entityType: "EVENT", entityId: id }),
  ]);
  return context.json(success({ id, status: "ARCHIVED" }, context.get("requestId")));
});
