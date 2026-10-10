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
      "community-admin@example.com",
      "community-admin@example.com",
      "Community Admin",
      new Date().toISOString(),
    ),
    env.DB.prepare(
      "INSERT INTO user_roles(id,user_id,role_id,grant_reason) VALUES(?,?,'role:SUPER_ADMIN','Community operations test')",
    ).bind(crypto.randomUUID(), id),
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
  admin = {
    id,
    cookie: `__Host-ruet_session=${session.token}`,
    csrf: session.csrfToken,
  };
});
describe("community operations", () => {
  it("publishes a normalized event to both administration and public APIs", async () => {
    const eventId = crypto.randomUUID();
    const starts = new Date(Date.now() + 86400000).toISOString();
    const ends = new Date(Date.now() + 90000000).toISOString();
    const saved = await api(`/admin/community/events/${eventId}`, {
      method: "PUT",
      auth: true,
      body: {
        slug: "community-test-event",
        title: "Community Test Event",
        shortDescription: "A complete event summary.",
        fullDescription: "A complete public event description.",
        eventType: "Workshop",
        category: "IoT",
        eventStatus: "SCHEDULED",
        featured: true,
        sortOrder: 1,
        startsAt: starts,
        endsAt: ends,
        timezone: "Asia/Dhaka",
        locationType: "PHYSICAL",
        venue: "RUET",
        address: "Kazla",
        city: "Rajshahi",
        country: "Bangladesh",
        onlineUrl: null,
        mapUrl: null,
        coverImageUrl: "https://images.example.invalid/event.webp",
        thumbnailUrl: null,
        gallery: [],
        posterUrl: null,
        videoUrl: null,
        registrationRequired: true,
        registrationMode: "INTERNAL",
        registrationUrl: null,
        registrationDeadline: starts,
        maxParticipants: 50,
        feeMinor: 0,
        currency: "BDT",
        paymentRequired: false,
        registrationStatus: "OPEN",
        organizer: "RUET IoT Club",
        coOrganizers: [],
        partners: [],
        sponsors: [],
        speakers: [],
        trainers: [],
        tags: ["IoT"],
        targetAudience: "Students",
        eligibility: "Open to RUET students.",
        contactEmail: "ruetiotclub@gmail.com",
        contactPhone: null,
        seoTitle: "Community Test Event",
        metaDescription: "Test event",
        ogImageUrl: null,
        canonicalUrl: null,
        workflowStatus: "PUBLISHED",
      },
    });
    expect(saved.response.status).toBe(200);
    const list = await api("/community/events");
    expect(list.response.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      slug: "community-test-event",
      featured: true,
    });
    const detail = await api("/community/events/community-test-event");
    expect(detail.body.data.title).toBe("Community Test Event");
    const compatibility = await env.DB.prepare(
      "SELECT status,json_extract(data_json,'$.slug') AS slug FROM website_content_items WHERE id=?",
    )
      .bind(eventId)
      .first<{ status: string; slug: string }>();
    expect(compatibility).toEqual({
      status: "PUBLISHED",
      slug: "community-test-event",
    });
  });
  it("records auditable finance transactions and computes verified totals", async () => {
    const created = await api("/admin/finance/transactions", {
      method: "POST",
      auth: true,
      body: {
        transactionDate: new Date().toISOString(),
        transactionType: "Donation",
        category: "Donation",
        direction: "INCOME",
        amountMinor: 250000,
        currency: "BDT",
        paymentMethod: "Bank",
        externalReference: "BANK-TEST-1",
        description: "Community laboratory donation",
        relatedModule: "DONATION",
        relatedEntityId: null,
        status: "PENDING",
        receiptObjectKey: null,
        notes: "Test receipt",
      },
    });
    expect(created.response.status).toBe(201);
    const transactionId = created.body.data.id;
    const decided = await api(
      `/admin/finance/transactions/${transactionId}/status`,
      {
        method: "PATCH",
        auth: true,
        body: {
          status: "VERIFIED",
          reason: "Bank statement matched the submitted evidence",
        },
      },
    );
    expect(decided.response.status).toBe(200);
    const summary = await api("/admin/finance/summary", { auth: true });
    expect(summary.body.data).toMatchObject({
      totalIncome: 250000,
      totalExpenses: 0,
      netBalance: 250000,
    });
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM finance_transaction_events WHERE transaction_id=?",
      )
        .bind(transactionId)
        .first<number>("count"),
    ).toBe(2);
  });
  it("serves the real notification inbox and marks every unread item", async () => {
    await env.DB.prepare(
      "INSERT INTO user_notifications(id,user_id,notification_type,title,message,priority) VALUES(?,?,?,?,?,'NORMAL')",
    )
      .bind(
        crypto.randomUUID(),
        admin.id,
        "TEST_EVENT",
        "Community notification",
        "Review the related operation",
      )
      .run();
    const inbox = await api("/notifications/inbox?page=1&pageSize=20", {
      auth: true,
    });
    expect(inbox.body.data.unreadCount).toBeGreaterThan(0);
    const marked = await api("/notifications/mark-all-read", {
      method: "POST",
      auth: true,
    });
    expect(marked.response.status).toBe(200);
    const after = await api("/notifications/inbox?page=1&pageSize=20", {
      auth: true,
    });
    expect(after.body.data.unreadCount).toBe(0);
  });
  it("aggregates application sources in one protected center", async () => {
    const result = await api("/admin/applications?limit=20&offset=0", {
      auth: true,
    });
    expect(result.response.status).toBe(200);
    expect(result.body.data).toMatchObject({
      items: expect.any(Array),
      total: expect.any(Number),
    });
  });
});
