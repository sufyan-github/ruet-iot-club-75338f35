import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createSessionMaterial } from "../auth/session";

const origin = "https://test.invalid";
let admin: { id: string; cookie: string; csrf: string };

async function api(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
) {
  const headers = new Headers({ Accept: "application/json", Origin: origin });
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  if (options.auth) {
    headers.set("Cookie", admin.cookie);
    headers.set("X-CSRF-Token", admin.csrf);
  }
  const response = await exports.default.fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  return { response, body: await response.json<any>() };
}

const media = (key: string, altText: string) => ({
  mediaId: key,
  key,
  url: `/api/v1/media/files/${key}`,
  originalName: key.split("/").pop(),
  contentType: "image/png",
  byteSize: 68,
  width: 1,
  height: 1,
  altText,
});

function eventBody(overrides: Record<string, unknown> = {}) {
  const startsAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const endsAt = new Date(
    Date.now() + 2 * 86_400_000 + 7_200_000,
  ).toISOString();
  return {
    slug: `event-${crypto.randomUUID()}`,
    title: "Production IoT Workshop",
    shortDescription: "Build and deploy a complete connected device.",
    fullDescription: "<p>A complete event description for participants.</p>",
    eventType: "Workshop",
    category: "IoT",
    eventStatusOverride: null,
    featured: true,
    sortOrder: 4,
    startsAt,
    endsAt,
    timezone: "Asia/Dhaka",
    locationType: "HYBRID",
    venue: "RUET EEE Seminar Room",
    address: "Rajshahi University of Engineering & Technology",
    city: "Rajshahi",
    country: "Bangladesh",
    onlinePlatform: "Google Meet",
    onlineUrl: "https://meet.google.com/example",
    meetingInstructions:
      "The joining link is available to approved participants.",
    heroImage: media("events/test-hero.png", "Students building an IoT device"),
    galleryImages: [
      media("events/test-gallery-1.png", "IoT workshop lab"),
      media("events/test-gallery-2.png", "Workshop participants"),
    ],
    ogImage: media("events/test-og.png", "IoT workshop social preview"),
    videoUrl: "https://video.example.invalid/workshop",
    registrationRequired: true,
    registrationMode: "INTERNAL",
    registrationOpensAt: new Date(Date.now() - 3_600_000).toISOString(),
    registrationDeadline: new Date(Date.now() + 86_400_000).toISOString(),
    maxParticipants: 80,
    registrationCapacityOverride: false,
    registrationStatusOverride: null,
    paymentRequired: true,
    feeMinor: 50000,
    currency: "BDT",
    paymentMethods: ["BKASH", "NAGAD"],
    bkashNumber: "01580352238",
    organizer: "RUET IoT Club",
    coOrganizers: ["IEEE RUET Student Branch"],
    partners: ["RUET EEE Department"],
    sponsors: ["Example Sponsor"],
    speakers: ["Example Speaker"],
    trainers: ["Example Trainer"],
    tags: ["IoT", "Embedded systems"],
    targetAudience: "RUET students interested in hardware and software.",
    eligibility: "Current students may apply.",
    contactEmail: "ruetiotclub@gmail.com",
    contactPhone: "+8801580352238",
    certificateAvailable: true,
    certificateRequireRegistration: true,
    certificateRequirePayment: true,
    certificateRequireAttendance: true,
    certificateMinAttendancePercent: 80,
    seoTitle: "Production IoT Workshop | RUET IoT Club",
    metaDescription: "Join the production IoT workshop at RUET.",
    canonicalUrl: "https://ruetiotclub.org/events/production-iot-workshop",
    workflowStatus: "PUBLISHED",
    ...overrides,
  };
}

beforeAll(async () => {
  await applyD1Migrations(
    env.DB,
    (env as Env & { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS,
  );
  const id = crypto.randomUUID();
  const session = await createSessionMaterial();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users(id,primary_email,primary_email_normalized,display_name,status,email_verified_at) VALUES(?,?,?,?, 'EMAIL_VERIFIED',?)",
    ).bind(
      id,
      "event-admin@example.com",
      "event-admin@example.com",
      "Event Admin",
      new Date().toISOString(),
    ),
    env.DB.prepare(
      "INSERT INTO user_roles(id,user_id,role_id,grant_reason) VALUES(?,?,'role:SUPER_ADMIN','Event system test')",
    ).bind(crypto.randomUUID(), id),
    ...[
      "events/test-hero.png",
      "events/test-gallery-1.png",
      "events/test-gallery-2.png",
      "events/test-og.png",
    ].map((key) =>
      env.DB.prepare(
        "INSERT INTO website_media_objects(object_key,original_name,content_type,byte_size,uploaded_by,width,height,alt_text) VALUES(?,?,?,?,?,?,?,?)",
      ).bind(
        key,
        key.split("/").pop(),
        "image/png",
        68,
        id,
        1,
        1,
        "Test image",
      ),
    ),
    env.DB.prepare(
      "INSERT INTO sessions(id,user_id,token_hash,csrf_token_hash,expires_at) VALUES(?,?,?,?,?)",
    ).bind(
      session.id,
      id,
      session.tokenHash,
      session.csrfTokenHash,
      session.expiresAt,
    ),
  ]);
  const png = Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
    0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 11, 73, 68, 65, 84, 8,
    215, 99, 248, 207, 192, 0, 0, 3, 1, 1, 0, 24, 221, 141, 176, 0, 0, 0, 0, 73,
    69, 78, 68, 174, 66, 96, 130,
  ]);
  for (const key of [
    "events/test-hero.png",
    "events/test-gallery-1.png",
    "events/test-gallery-2.png",
    "events/test-og.png",
  ])
    await env.STORAGE.put(key, png, {
      httpMetadata: { contentType: "image/png" },
    });
  admin = {
    id,
    cookie: `__Host-ruet_session=${session.token}`,
    csrf: session.csrfToken,
  };
});

describe("canonical event management", () => {
  it("round-trips canonical R2 media, gallery order, SEO, schedule, payment, and certificate fields", async () => {
    const id = crypto.randomUUID();
    const input = eventBody({ slug: "event-round-trip" });
    const saved = await api(`/admin/events/${id}`, {
      method: "PUT",
      auth: true,
      body: input,
    });
    expect(saved.response.status).toBe(201);

    const fetched = await api(`/admin/events/${id}`, { auth: true });
    expect(fetched.response.status).toBe(200);
    expect(fetched.body.data).toMatchObject({
      id,
      slug: "event-round-trip",
      eventStatus: "SCHEDULED",
      registrationStatus: "OPEN",
      timezone: "Asia/Dhaka",
      locationType: "HYBRID",
      paymentMethods: ["BKASH", "NAGAD"],
      certificateMinAttendancePercent: 80,
      seoTitle: "Production IoT Workshop | RUET IoT Club",
      heroImage: {
        key: "events/test-hero.png",
        width: 1,
        height: 1,
        altText: "Students building an IoT device",
      },
      ogImage: {
        key: "events/test-og.png",
        altText: "IoT workshop social preview",
      },
    });
    expect(
      fetched.body.data.galleryImages.map((item: { key: string }) => item.key),
    ).toEqual(["events/test-gallery-1.png", "events/test-gallery-2.png"]);

    const publicEvent = await api("/community/events/event-round-trip");
    expect(publicEvent.response.status).toBe(200);
    expect(publicEvent.body.data.heroImage.key).toBe("events/test-hero.png");
    expect(publicEvent.body.data.effectiveOgImageUrl).toBe(
      "/api/v1/media/files/events/test-og.png",
    );
  });

  it("rejects duplicate slugs and requires confirmation before changing a published URL", async () => {
    const firstId = crypto.randomUUID();
    expect(
      (
        await api(`/admin/events/${firstId}`, {
          method: "PUT",
          auth: true,
          body: eventBody({ slug: "unique-event" }),
        })
      ).response.status,
    ).toBe(201);
    expect(
      (
        await api(`/admin/events/${crypto.randomUUID()}`, {
          method: "PUT",
          auth: true,
          body: eventBody({ slug: "unique-event" }),
        })
      ).response.status,
    ).toBe(409);
    expect(
      (
        await api(`/admin/events/${firstId}`, {
          method: "PUT",
          auth: true,
          body: eventBody({ slug: "renamed-event" }),
        })
      ).response.status,
    ).toBe(409);
    expect(
      (
        await api(`/admin/events/${firstId}`, {
          method: "PUT",
          auth: true,
          body: eventBody({ slug: "renamed-event", confirmSlugChange: true }),
        })
      ).response.status,
    ).toBe(200);
  });

  it("allows incomplete conditional data in drafts but enforces it when publishing", async () => {
    const draft = eventBody({
      slug: "incomplete-draft",
      workflowStatus: "DRAFT",
      locationType: "PHYSICAL",
      venue: "",
      address: "",
      city: "",
      heroImage: null,
      galleryImages: [],
      ogImage: null,
      paymentRequired: false,
      feeMinor: 0,
    });
    expect(
      (
        await api(`/admin/events/${crypto.randomUUID()}`, {
          method: "PUT",
          auth: true,
          body: draft,
        })
      ).response.status,
    ).toBe(201);

    const invalidPublished = [
      eventBody({ slug: "missing-physical", venue: "", address: "", city: "" }),
      eventBody({
        slug: "missing-online",
        locationType: "ONLINE",
        onlinePlatform: "",
        onlineUrl: "",
      }),
      eventBody({
        slug: "missing-external",
        registrationMode: "EXTERNAL",
        registrationUrl: "",
      }),
      eventBody({ slug: "missing-hero", heroImage: null, coverImageUrl: "" }),
      eventBody({ slug: "invalid-paid", paymentRequired: true, feeMinor: 0 }),
    ];
    for (const input of invalidPublished) {
      const result = await api(`/admin/events/${crypto.randomUUID()}`, {
        method: "PUT",
        auth: true,
        body: input,
      });
      expect(result.response.status).toBe(422);
    }
  });

  it("rejects stale or forged R2 media references", async () => {
    const result = await api(`/admin/events/${crypto.randomUUID()}`, {
      method: "PUT",
      auth: true,
      body: eventBody({
        slug: "missing-media",
        heroImage: media("events/not-present.png", "Missing image"),
      }),
    });
    expect(result.response.status).toBe(422);
    expect(result.body.code).toBe("MEDIA_NOT_FOUND");
  });
});
