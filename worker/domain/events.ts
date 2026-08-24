import { z } from "zod";
import {
  deriveEventStatus,
  deriveRegistrationStatus,
  isValidTimeZone,
  mediaReferenceFromUrl,
  type EventMediaReference,
} from "../../src/lib/eventModel";
import { AppError } from "../lib/app-error";
import { sanitizeBlogHtml } from "../lib/sanitize-blog-html";

const idSchema = z.string().uuid();
const mediaUrl = z
  .string()
  .trim()
  .max(800)
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("/api/v1/media/files/") ||
      /^https:\/\//u.test(value),
    "Use an HTTPS or Media Library URL.",
  );
const optionalUrl = mediaUrl
  .nullable()
  .optional()
  .transform((value) => value || "")
  .default("");
const optionalText = (maximum: number) =>
  z
    .preprocess((value) => value ?? "", z.string().trim().max(maximum))
    .default("");
const textList = z.array(z.string().trim().min(1).max(200)).max(60).default([]);
const idList = z.array(idSchema).max(60).default([]);
const mediaReferenceSchema = z.object({
  mediaId: z.string().trim().max(512).optional(),
  key: z.string().trim().max(512),
  url: mediaUrl,
  originalName: z.string().trim().max(255),
  contentType: z.string().trim().max(100).optional(),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024)
    .optional(),
  width: z.number().int().positive().max(50000).optional(),
  height: z.number().int().positive().max(50000).optional(),
  altText: z.string().trim().max(300).optional().default(""),
  createdAt: z.string().datetime({ offset: true }).optional(),
});

export const eventSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Use a URL-safe lowercase slug.")
      .max(200),
    confirmSlugChange: z.boolean().optional().default(false),
    title: z.string().trim().min(3).max(200),
    shortDescription: z.string().trim().min(3).max(500),
    fullDescription: z.string().trim().min(3).max(20000),
    eventType: z.string().trim().min(2).max(100),
    category: z.string().trim().min(2).max(100),
    eventStatus: z
      .enum(["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED", "POSTPONED"])
      .optional(),
    eventStatusOverride: z
      .enum(["CANCELLED", "POSTPONED"])
      .nullable()
      .optional()
      .default(null),
    featured: z.boolean().default(false),
    sortOrder: z.number().int().min(-10000).max(10000).default(0),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    timezone: z.string().trim().min(3).max(100).default("Asia/Dhaka"),
    locationType: z.enum(["PHYSICAL", "ONLINE", "HYBRID"]),
    venue: optionalText(240),
    address: optionalText(500),
    city: optionalText(120),
    country: z.string().trim().max(120).default("Bangladesh"),
    latitude: z.number().min(-90).max(90).nullable().optional().default(null),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .nullable()
      .optional()
      .default(null),
    onlineUrl: optionalUrl,
    onlinePlatform: optionalText(120),
    meetingInstructions: optionalText(3000),
    mapUrl: optionalUrl,
    heroImage: mediaReferenceSchema.nullable().optional().default(null),
    galleryImages: z.array(mediaReferenceSchema).max(30).optional().default([]),
    ogImage: mediaReferenceSchema.nullable().optional().default(null),
    coverImageUrl: optionalUrl,
    thumbnailUrl: optionalUrl,
    gallery: z.array(mediaUrl).max(30).default([]),
    posterUrl: optionalUrl,
    videoUrl: optionalUrl,
    registrationRequired: z.boolean().default(true),
    registrationMode: z
      .enum(["INTERNAL", "EXTERNAL", "CLOSED"])
      .default("INTERNAL"),
    registrationUrl: optionalUrl,
    registrationOpensAt: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(z.literal("")),
    registrationDeadline: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(z.literal("")),
    maxParticipants: z.number().int().min(0).max(1000000).default(0),
    registrationCapacityOverride: z.boolean().default(false),
    feeMinor: z.number().int().min(0).max(100000000).default(0),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .default("BDT"),
    paymentRequired: z.boolean().default(false),
    paymentMethods: z
      .array(z.enum(["BKASH", "NAGAD", "CASH"]))
      .min(1)
      .max(3)
      .default(["BKASH", "NAGAD"]),
    bkashNumber: z
      .string()
      .trim()
      .regex(/^01\d{9}$/u)
      .default("01580352238"),
    registrationStatus: z
      .enum(["UPCOMING", "OPEN", "CLOSED", "FULL"])
      .optional(),
    registrationStatusOverride: z
      .enum(["UPCOMING", "OPEN", "CLOSED", "FULL"])
      .nullable()
      .optional()
      .default(null),
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
    targetAudience: optionalText(3000),
    eligibility: optionalText(10000),
    certificateAvailable: z.boolean().default(false),
    certificateRequireRegistration: z.boolean().default(true),
    certificateRequirePayment: z.boolean().default(true),
    certificateRequireAttendance: z.boolean().default(true),
    certificateMinAttendancePercent: z
      .number()
      .int()
      .min(0)
      .max(100)
      .default(100),
    contactEmail: z.preprocess(
      (value) => value ?? "",
      z.string().trim().email().max(254).or(z.literal("")),
    ),
    contactPhone: optionalText(40),
    seoTitle: optionalText(200),
    metaDescription: optionalText(500),
    ogImageUrl: optionalUrl,
    canonicalUrl: optionalUrl,
    workflowStatus: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  })
  .superRefine((event, context) => {
    const starts = new Date(event.startsAt).getTime();
    const ends = new Date(event.endsAt).getTime();
    if (ends <= starts)
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End time must be after start time.",
      });
    if (!isValidTimeZone(event.timezone))
      context.addIssue({
        code: "custom",
        path: ["timezone"],
        message: "Use a valid IANA timezone such as Asia/Dhaka.",
      });
    if (
      event.registrationOpensAt &&
      event.registrationDeadline &&
      new Date(event.registrationOpensAt) >=
        new Date(event.registrationDeadline)
    )
      context.addIssue({
        code: "custom",
        path: ["registrationDeadline"],
        message: "Registration must close after it opens.",
      });
    if (
      event.registrationDeadline &&
      new Date(event.registrationDeadline).getTime() > ends
    )
      context.addIssue({
        code: "custom",
        path: ["registrationDeadline"],
        message: "Registration must close before the event ends.",
      });
    if (!event.registrationRequired && event.paymentRequired)
      context.addIssue({
        code: "custom",
        path: ["paymentRequired"],
        message: "Payment cannot be required when registration is disabled.",
      });
    if (event.paymentRequired && event.feeMinor <= 0)
      context.addIssue({
        code: "custom",
        path: ["feeMinor"],
        message: "Paid events require a positive fee.",
      });
    if (!event.paymentRequired && event.feeMinor !== 0)
      context.addIssue({
        code: "custom",
        path: ["feeMinor"],
        message: "Free events cannot have a fee.",
      });
    if (event.workflowStatus !== "PUBLISHED") return;
    if (["PHYSICAL", "HYBRID"].includes(event.locationType)) {
      for (const [path, value, message] of [
        ["venue", event.venue, "Physical and hybrid events require a venue."],
        [
          "address",
          event.address,
          "Physical and hybrid events require an address.",
        ],
        ["city", event.city, "Physical and hybrid events require a city."],
        [
          "country",
          event.country,
          "Physical and hybrid events require a country.",
        ],
      ] as const)
        if (!value) context.addIssue({ code: "custom", path: [path], message });
    }
    if (["ONLINE", "HYBRID"].includes(event.locationType)) {
      if (!event.onlinePlatform)
        context.addIssue({
          code: "custom",
          path: ["onlinePlatform"],
          message: "Online and hybrid events require an online platform.",
        });
      if (!event.onlineUrl)
        context.addIssue({
          code: "custom",
          path: ["onlineUrl"],
          message: "Online and hybrid events require a meeting URL.",
        });
    }
    if (
      event.registrationRequired &&
      event.registrationMode === "EXTERNAL" &&
      !event.registrationUrl
    )
      context.addIssue({
        code: "custom",
        path: ["registrationUrl"],
        message: "External registration requires a URL.",
      });
    if (!event.heroImage && !event.coverImageUrl)
      context.addIssue({
        code: "custom",
        path: ["heroImage"],
        message: "Select a Hero image before publishing.",
      });
  });

export type EventInput = z.infer<typeof eventSchema>;

const boolColumns = new Set([
  "featured",
  "registration_required",
  "payment_required",
  "registration_capacity_override",
  "certificate_available",
  "certificate_require_registration",
  "certificate_require_payment",
  "certificate_require_attendance",
]);
const camel = (value: string) =>
  value.replace(/_([a-z])/gu, (_, letter: string) => letter.toUpperCase());
const nullable = (value: string | undefined) => value?.trim() || null;

function mediaFromRow(
  row: Record<string, unknown>,
  prefix: "hero" | "og",
  fallbackUrl: string | null,
  fallbackAlt: string,
): EventMediaReference | null {
  const key = String(row[`${prefix}_media_key`] || "");
  if (!key) return mediaReferenceFromUrl(fallbackUrl, fallbackAlt);
  return {
    mediaId: key,
    key,
    url: `/api/v1/media/files/${key}`,
    originalName: String(
      row[`${prefix}_media_original_name`] ||
        key.split("/").pop() ||
        "Selected media",
    ),
    contentType: String(row[`${prefix}_media_content_type`] || ""),
    byteSize: Number(row[`${prefix}_media_byte_size`] || 0) || undefined,
    width: Number(row[`${prefix}_media_width`] || 0) || undefined,
    height: Number(row[`${prefix}_media_height`] || 0) || undefined,
    altText: String(row[`${prefix}_image_alt`] || fallbackAlt || ""),
    createdAt: row[`${prefix}_media_created_at`]
      ? String(row[`${prefix}_media_created_at`])
      : undefined,
  };
}

export function eventView(
  row: Record<string, unknown>,
  now = Date.now(),
): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith("_json")) {
      try {
        item[camel(key.slice(0, -5))] = JSON.parse(String(value || "[]"));
      } catch {
        item[camel(key.slice(0, -5))] = [];
      }
    } else item[camel(key)] = boolColumns.has(key) ? Boolean(value) : value;
  }
  const eventStatus = deriveEventStatus(
    {
      startsAt: String(row.starts_at),
      endsAt: String(row.ends_at),
      eventStatus: String(row.event_status) as EventInput["eventStatus"],
      eventStatusOverride: (row.event_status_override ||
        null) as EventInput["eventStatusOverride"],
    },
    now,
  );
  const approved = Number(row.approved_count || 0);
  const reserved = Number(row.reserved_count || 0);
  const capacity = Number(row.max_participants || 0);
  const registrationStatus = deriveRegistrationStatus(
    {
      startsAt: String(row.starts_at),
      endsAt: String(row.ends_at),
      eventStatus,
      eventStatusOverride: (row.event_status_override ||
        null) as EventInput["eventStatusOverride"],
      registrationRequired: Boolean(row.registration_required),
      registrationMode: String(row.registration_mode) as
        | "INTERNAL"
        | "EXTERNAL"
        | "CLOSED",
      registrationOpensAt: row.registration_opens_at
        ? String(row.registration_opens_at)
        : null,
      registrationDeadline: row.registration_deadline
        ? String(row.registration_deadline)
        : null,
      registrationStatusOverride: (row.registration_status_override ||
        null) as EventInput["registrationStatusOverride"],
      maxParticipants: capacity,
      reservedCount: reserved,
      registrationCapacityOverride: Boolean(row.registration_capacity_override),
    },
    now,
  );
  const heroImage = mediaFromRow(
    row,
    "hero",
    row.cover_image_url ? String(row.cover_image_url) : null,
    String(row.hero_image_alt || row.title || ""),
  );
  const ogImage = mediaFromRow(
    row,
    "og",
    row.og_image_url ? String(row.og_image_url) : null,
    String(row.og_image_alt || row.title || ""),
  );
  let galleryImages: EventMediaReference[] = [];
  try {
    galleryImages = JSON.parse(String(row.gallery_media_json || "[]"));
  } catch {
    galleryImages = [];
  }
  if (!galleryImages.length) {
    const gallery = Array.isArray(item.gallery) ? item.gallery : [];
    galleryImages = gallery
      .map((url, index) =>
        mediaReferenceFromUrl(
          String(url),
          `${String(row.title || "Event")} gallery image ${index + 1}`,
        ),
      )
      .filter(Boolean) as EventMediaReference[];
  }
  item.eventStatus = eventStatus;
  item.registrationStatus = registrationStatus;
  item.heroImage = heroImage;
  item.coverImageUrl = heroImage?.url || row.cover_image_url || null;
  item.galleryImages = galleryImages;
  item.gallery = galleryImages.map((image) => image.url);
  item.ogImage = ogImage;
  item.ogImageUrl = ogImage?.url || heroImage?.url || row.og_image_url || null;
  item.effectiveOgImageUrl = item.ogImageUrl;
  item.approvedCount = approved;
  item.reservedCount = reserved;
  item.remainingCapacity =
    capacity > 0 ? Math.max(0, capacity - reserved) : null;
  return item;
}

export function normalizeEventInput(input: EventInput): EventInput {
  const rawHeroImage =
    input.heroImage ?? mediaReferenceFromUrl(input.coverImageUrl, input.title);
  const rawGalleryImages = input.galleryImages.length
    ? input.galleryImages
    : (input.gallery
        .map((url, index) =>
          mediaReferenceFromUrl(
            url,
            `${input.title} gallery image ${index + 1}`,
          ),
        )
        .filter(Boolean) as EventMediaReference[]);
  const rawOgImage =
    input.ogImage ?? mediaReferenceFromUrl(input.ogImageUrl, input.title);
  const heroImage = rawHeroImage
    ? { ...rawHeroImage, altText: rawHeroImage.altText || "" }
    : null;
  const galleryImages = rawGalleryImages.map((image) => ({
    ...image,
    altText: image.altText || "",
  }));
  const ogImage = rawOgImage
    ? { ...rawOgImage, altText: rawOgImage.altText || "" }
    : null;
  const eventStatus = deriveEventStatus({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    eventStatusOverride: input.eventStatusOverride,
  });
  const registrationStatus = deriveRegistrationStatus({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    eventStatus,
    eventStatusOverride: input.eventStatusOverride,
    registrationRequired: input.registrationRequired,
    registrationMode: input.registrationMode,
    registrationOpensAt: input.registrationOpensAt || null,
    registrationDeadline: input.registrationDeadline || null,
    registrationStatusOverride: input.registrationStatusOverride,
    maxParticipants: input.maxParticipants,
    reservedCount: 0,
    registrationCapacityOverride: input.registrationCapacityOverride,
  });
  return {
    ...input,
    eventStatus,
    registrationStatus,
    heroImage,
    coverImageUrl: heroImage?.url || input.coverImageUrl,
    galleryImages,
    gallery: galleryImages.map((image) => image.url),
    ogImage,
    ogImageUrl: ogImage?.url || input.ogImageUrl,
    feeMinor: input.paymentRequired ? input.feeMinor : 0,
    paymentMethods: input.paymentRequired
      ? input.paymentMethods
      : ["BKASH", "NAGAD"],
    registrationMode: input.registrationRequired
      ? input.registrationMode
      : "CLOSED",
  };
}

export async function validateEventMediaReferences(
  db: D1Database,
  storage: R2Bucket,
  input: EventInput,
): Promise<void> {
  const references = [
    input.heroImage,
    ...input.galleryImages,
    input.ogImage,
  ].filter(Boolean) as EventMediaReference[];
  const seen = new Set<string>();
  for (const reference of references) {
    if (!reference.key || seen.has(reference.key)) continue;
    seen.add(reference.key);
    if (reference.url !== `/api/v1/media/files/${reference.key}`)
      throw new AppError({
        code: "INVALID_MEDIA_REFERENCE",
        message:
          "A selected event image has an invalid Media Library reference.",
        status: 422,
      });
    const media = await db
      .prepare(
        "SELECT content_type FROM website_media_objects WHERE object_key=? AND archived_at IS NULL",
      )
      .bind(reference.key)
      .first<{ content_type: string }>();
    if (
      !media?.content_type.startsWith("image/") ||
      !(await storage.head(reference.key))
    )
      throw new AppError({
        code: "MEDIA_NOT_FOUND",
        message:
          "A selected event image is no longer available. Choose another image.",
        status: 422,
      });
  }
}

export function legacyEventData(input: EventInput) {
  return {
    slug: input.slug,
    title: input.title,
    description: input.shortDescription,
    full_description: input.fullDescription,
    type: input.eventType,
    category: input.category,
    event_status: input.eventStatus?.toLowerCase(),
    date: input.startsAt,
    end_date: input.endsAt,
    timezone: input.timezone,
    location_type: input.locationType.toLowerCase(),
    venue: input.venue,
    address: input.address,
    city: input.city,
    country: input.country,
    latitude: input.latitude,
    longitude: input.longitude,
    online_url: input.onlineUrl,
    online_platform: input.onlinePlatform,
    meeting_instructions: input.meetingInstructions,
    map_url: input.mapUrl,
    image_url: input.coverImageUrl,
    hero_image_alt: input.heroImage?.altText,
    thumbnail_url: input.thumbnailUrl,
    gallery: input.gallery,
    gallery_images: input.galleryImages,
    poster_url: input.posterUrl,
    video_url: input.videoUrl,
    registration_required: input.registrationRequired,
    registration_mode: input.registrationMode.toLowerCase(),
    registration_url: input.registrationUrl,
    registration_opens_at: input.registrationOpensAt || null,
    registration_deadline: input.registrationDeadline || null,
    max_participants: input.maxParticipants,
    registration_capacity_override: input.registrationCapacityOverride,
    is_paid: input.paymentRequired,
    registration_fee: input.feeMinor / 100,
    currency: input.currency,
    payment_required: input.paymentRequired,
    payment_methods: input.paymentMethods,
    payment_number: input.bkashNumber,
    bkash_number: input.bkashNumber,
    registration_status: input.registrationStatus?.toLowerCase(),
    organizer: input.organizer,
    co_organizers: input.coOrganizers,
    partners: input.partners,
    sponsors: input.sponsors,
    speakers: input.speakers,
    trainers: input.trainers,
    tags: input.tags,
    target_audience: input.targetAudience,
    eligibility: input.eligibility,
    certificate_available: input.certificateAvailable,
    certificate_requirements: {
      registration: input.certificateRequireRegistration,
      payment: input.certificateRequirePayment,
      attendance: input.certificateRequireAttendance,
      min_attendance_percent: input.certificateMinAttendancePercent,
    },
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    seo_title: input.seoTitle,
    meta_description: input.metaDescription,
    og_image: input.ogImageUrl || input.coverImageUrl,
    canonical_url: input.canonicalUrl,
    featured: input.featured,
  };
}

export const eventColumns = [
  "id",
  "slug",
  "title",
  "short_description",
  "full_description",
  "event_type",
  "category",
  "event_status",
  "event_status_override",
  "featured",
  "sort_order",
  "starts_at",
  "ends_at",
  "timezone",
  "location_type",
  "venue",
  "address",
  "city",
  "country",
  "latitude",
  "longitude",
  "online_url",
  "online_platform",
  "meeting_instructions",
  "map_url",
  "cover_image_url",
  "hero_media_key",
  "hero_image_alt",
  "thumbnail_url",
  "gallery_json",
  "gallery_media_json",
  "poster_url",
  "video_url",
  "registration_required",
  "registration_mode",
  "registration_url",
  "registration_opens_at",
  "registration_deadline",
  "max_participants",
  "registration_capacity_override",
  "fee_minor",
  "currency",
  "payment_required",
  "payment_methods_json",
  "bkash_number",
  "registration_status",
  "registration_status_override",
  "organizer",
  "organizer_person_id",
  "co_organizers_json",
  "co_organizer_ids_json",
  "partners_json",
  "partner_ids_json",
  "sponsors_json",
  "sponsor_ids_json",
  "speakers_json",
  "speaker_ids_json",
  "trainers_json",
  "trainer_ids_json",
  "tags_json",
  "target_audience",
  "eligibility",
  "certificate_available",
  "certificate_require_registration",
  "certificate_require_payment",
  "certificate_require_attendance",
  "certificate_min_attendance_percent",
  "contact_email",
  "contact_phone",
  "seo_title",
  "meta_description",
  "og_image_url",
  "og_media_key",
  "og_image_alt",
  "canonical_url",
  "workflow_status",
  "published_at",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
] as const;

export function eventValues(
  input: EventInput,
  id: string,
  userId: string,
  now: string,
  publishedAt: string | null,
) {
  return [
    id,
    input.slug,
    input.title,
    input.shortDescription,
    sanitizeBlogHtml(input.fullDescription),
    input.eventType,
    input.category,
    input.eventStatus,
    input.eventStatusOverride,
    Number(input.featured),
    input.sortOrder,
    input.startsAt,
    input.endsAt,
    input.timezone,
    input.locationType,
    nullable(input.venue),
    nullable(input.address),
    nullable(input.city),
    input.country,
    input.latitude,
    input.longitude,
    nullable(input.onlineUrl),
    nullable(input.onlinePlatform),
    nullable(input.meetingInstructions),
    nullable(input.mapUrl),
    nullable(input.coverImageUrl),
    nullable(input.heroImage?.key),
    nullable(input.heroImage?.altText),
    nullable(input.thumbnailUrl),
    JSON.stringify(input.gallery),
    JSON.stringify(input.galleryImages),
    nullable(input.posterUrl),
    nullable(input.videoUrl),
    Number(input.registrationRequired),
    input.registrationMode,
    nullable(input.registrationUrl),
    nullable(input.registrationOpensAt),
    nullable(input.registrationDeadline),
    input.maxParticipants,
    Number(input.registrationCapacityOverride),
    input.feeMinor,
    input.currency,
    Number(input.paymentRequired),
    JSON.stringify(input.paymentMethods),
    input.bkashNumber,
    input.registrationStatus,
    input.registrationStatusOverride,
    input.organizer,
    input.organizerPersonId,
    JSON.stringify(input.coOrganizers),
    JSON.stringify(input.coOrganizerIds),
    JSON.stringify(input.partners),
    JSON.stringify(input.partnerIds),
    JSON.stringify(input.sponsors),
    JSON.stringify(input.sponsorIds),
    JSON.stringify(input.speakers),
    JSON.stringify(input.speakerIds),
    JSON.stringify(input.trainers),
    JSON.stringify(input.trainerIds),
    JSON.stringify(input.tags),
    nullable(input.targetAudience),
    nullable(input.eligibility),
    Number(input.certificateAvailable),
    Number(input.certificateRequireRegistration),
    Number(input.certificateRequirePayment),
    Number(input.certificateRequireAttendance),
    input.certificateMinAttendancePercent,
    nullable(input.contactEmail),
    nullable(input.contactPhone),
    nullable(input.seoTitle),
    nullable(input.metaDescription),
    nullable(input.ogImageUrl),
    nullable(input.ogImage?.key),
    nullable(input.ogImage?.altText),
    nullable(input.canonicalUrl),
    input.workflowStatus,
    publishedAt,
    userId,
    userId,
    now,
    now,
  ];
}

export const selectEvent = `SELECT e.*,
  hm.original_name AS hero_media_original_name,hm.content_type AS hero_media_content_type,hm.byte_size AS hero_media_byte_size,hm.width AS hero_media_width,hm.height AS hero_media_height,hm.created_at AS hero_media_created_at,
  om.original_name AS og_media_original_name,om.content_type AS og_media_content_type,om.byte_size AS og_media_byte_size,om.width AS og_media_width,om.height AS og_media_height,om.created_at AS og_media_created_at,
  (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id=e.id AND r.registration_status='APPROVED') AS approved_count,
  (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id=e.id AND r.registration_status IN ('PENDING','APPROVED')) AS reserved_count
  FROM managed_events e LEFT JOIN website_media_objects hm ON hm.object_key=e.hero_media_key LEFT JOIN website_media_objects om ON om.object_key=e.og_media_key`;
