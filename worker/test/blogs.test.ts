import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createSessionMaterial } from "../auth/session";

interface Envelope<T> {
  success: boolean;
  data?: T;
  code?: string;
  details?: Record<string, string[]>;
}
interface Identity {
  id: string;
  cookie: string;
  csrf: string;
}
const origin = "https://test.invalid";
let admin: Identity;
const heroKey = "website/2026-08-22/blog-test.png";
const heroUrl = `/api/v1/media/files/${heroKey}`;

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; identity?: Identity } = {},
) {
  const headers = new Headers({ Accept: "application/json", Origin: origin });
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  if (options.identity) {
    headers.set("Cookie", options.identity.cookie);
    headers.set("X-CSRF-Token", options.identity.csrf);
  }
  const response = await exports.default.fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  return { response, body: await response.json<Envelope<T>>() };
}

const input = {
  title: "Building a Secure ESP32 Sensor Network",
  slug: "secure-esp32-sensor-network",
  excerpt:
    "A practical guide to protecting data from distributed ESP32 sensor nodes.",
  featuredImageUrl: null,
  featuredImageAlt: null,
  contentHtml:
    "<h2>Threat model</h2><p>Validate every message before it reaches the application.</p><script>alert('xss')</script><img src='https://example.com/a.png' onerror='alert(1)'>",
  authorName: "RUET IoT Club",
  category: "IoT",
  tags: ["ESP32", "security"],
  publicationDate: null,
  status: "DRAFT",
  seoTitle: "Secure ESP32 Sensor Networks",
  seoDescription:
    "Design and operate a secure ESP32 sensor network with practical validation controls.",
  seoKeywords: ["ESP32", "IoT security"],
  socialImageUrl: null,
};

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
      "blog-admin@example.com",
      "blog-admin@example.com",
      "Blog Admin",
      new Date().toISOString(),
    ),
    env.DB.prepare(
      "INSERT INTO user_roles(id,user_id,role_id,grant_reason) VALUES(?,?,'role:SUPER_ADMIN','Blog integration test')",
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
  await env.STORAGE.put(heroKey, new Uint8Array([137, 80, 78, 71]), {
    httpMetadata: { contentType: "image/png" },
  });
  await env.DB.prepare(
    "INSERT INTO website_media_objects(object_key,original_name,content_type,byte_size,uploaded_by) VALUES(?,?,?,?,?)",
  )
    .bind(heroKey, "blog-test.png", "image/png", 4, id)
    .run();
});

describe.sequential("blog management", () => {
  it("protects administration endpoints", async () => {
    const result = await request("/admin/blogs");
    expect(result.response.status).toBe(401);
  });

  it("saves a draft with only a title and slug", async () => {
    const result = await request<{ id: string; status: string }>(
      `/admin/blogs/${crypto.randomUUID()}`,
      {
        method: "PUT",
        identity: admin,
        body: {
          ...input,
          title: "My New Blog",
          slug: "my-new-blog",
          excerpt: "",
          featuredImageUrl: null,
          contentHtml: "<p><br></p>",
          authorName: "",
          category: "",
          tags: [],
          publicationDate: null,
          seoTitle: null,
          seoDescription: null,
          seoKeywords: [],
        },
      },
    );
    expect(result.response.status).toBe(201);
    expect(result.body.data?.status).toBe("DRAFT");
  });

  it("returns exact field errors for an incomplete publish", async () => {
    const result = await request(`/admin/blogs/${crypto.randomUUID()}`, {
      method: "PUT",
      identity: admin,
      body: {
        ...input,
        title: "Incomplete Blog",
        slug: "incomplete-blog",
        excerpt: "",
        featuredImageUrl: null,
        contentHtml: "<p><br></p>",
        authorName: "",
        category: "",
        publicationDate: null,
        status: "PUBLISHED",
      },
    });
    expect(result.response.status).toBe(422);
    expect(result.body.details).toMatchObject({
      excerpt: ["Excerpt is required before publishing."],
      contentHtml: ["Article content is required before publishing."],
      featuredImageUrl: ["Hero image is required before publishing."],
      publicationDate: ["Publication date is required before publishing."],
    });
  });

  it("keeps drafts private, sanitizes content, publishes, counts views, and prevents duplicate slugs", async () => {
    const id = crypto.randomUUID();
    const completeInput = {
      ...input,
      featuredImageUrl: `https://ruetiotclub.org${heroUrl}`,
      publicationDate: "2026-08-22T06:10:00.000Z",
      seoTitle: "IoT",
      seoDescription: "Leading the future via IoT",
    };
    const draft = await request<{ id: string; status: string }>(
      `/admin/blogs/${id}`,
      { method: "PUT", identity: admin, body: completeInput },
    );
    expect(draft.response.status).toBe(201);
    expect(draft.body.data?.status).toBe("DRAFT");
    const publicDrafts = await request<{ items: unknown[] }>("/blogs");
    expect(publicDrafts.body.data?.items).toHaveLength(0);

    const saved = await request<{ contentHtml: string }>(`/admin/blogs/${id}`, {
      identity: admin,
    });
    expect(saved.body.data?.contentHtml).not.toContain("<script");
    expect(saved.body.data?.contentHtml).not.toContain("onerror");

    const sameSlug = await request(`/admin/blogs/${id}`, {
      method: "PUT",
      identity: admin,
      body: completeInput,
    });
    expect(sameSlug.response.status).toBe(200);

    const published = await request(`/admin/blogs/${id}/status`, {
      method: "PATCH",
      identity: admin,
      body: {
        status: "PUBLISHED",
        reason: "Article completed and reviewed for public release",
      },
    });
    expect(published.response.status).toBe(200);
    const list = await request<{ items: Array<{ slug: string }> }>(
      "/blogs?q=ESP32&category=IoT",
    );
    expect(list.body.data?.items[0]?.slug).toBe(input.slug);

    const detail = await request<{ views: number; contentHtml: string }>(
      `/blogs/${input.slug}`,
    );
    expect(detail.response.status).toBe(200);
    expect(detail.body.data?.views).toBe(1);
    expect(detail.body.data?.contentHtml).not.toContain("alert(");

    const duplicate = await request(`/admin/blogs/${crypto.randomUUID()}`, {
      method: "PUT",
      identity: admin,
      body: { ...input, title: "A second secure sensor article" },
    });
    expect(duplicate.response.status).toBe(409);
    expect(duplicate.body.code).toBe("BLOG_SLUG_EXISTS");
    expect(duplicate.body.details?.slug).toEqual([
      "This slug is already in use.",
    ]);
  });

  it("allows removing a hero image in a draft but blocks later publishing", async () => {
    const id = crypto.randomUUID();
    const draft = await request(`/admin/blogs/${id}`, {
      method: "PUT",
      identity: admin,
      body: {
        ...input,
        slug: "hero-removed-draft",
        featuredImageUrl: null,
        publicationDate: "2026-08-22T06:10:00.000Z",
      },
    });
    expect(draft.response.status).toBe(201);
    const publish = await request(`/admin/blogs/${id}/status`, {
      method: "PATCH",
      identity: admin,
      body: {
        status: "PUBLISHED",
        reason: "Testing complete publication validation",
      },
    });
    expect(publish.response.status).toBe(422);
    expect(publish.body.details?.featuredImageUrl).toEqual([
      "Hero image is required before publishing.",
    ]);
  });
});
