import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

interface Envelope<T> {
  success: boolean;
  data?: T;
  code?: string;
}

const origin = "https://test.invalid";

async function request<T>(path: string, options: {
  method?: string;
  body?: unknown;
  cookie?: string;
  csrf?: string;
  bootstrapSecret?: string;
} = {}) {
  const headers = new Headers({ Accept: "application/json", Origin: origin });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.cookie) headers.set("Cookie", options.cookie);
  if (options.csrf) headers.set("X-CSRF-Token", options.csrf);
  if (options.bootstrapSecret) headers.set("X-Bootstrap-Token", options.bootstrapSecret);
  const response = await exports.default.fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  return { response, body: await response.json<Envelope<T>>() };
}

beforeAll(async () => {
  const migrations = (env as Env & { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS;
  await applyD1Migrations(env.DB, migrations);
});

describe("fixed Cloudflare super administrators", () => {
  it("provisions both reserved accounts, requires password change, and protects their authority", async () => {
    const firstPassword = "temporary admin password alpha 2026";
    const secondPassword = "temporary admin password beta 2026";
    const payload = {
      accounts: [
        { email: "ruetiotclub@gmail.com", displayName: "RUET IoT Club", password: firstPassword },
        { email: "abusufyan.cse20@gmail.com", displayName: "Md Abu Sufyan", password: secondPassword },
      ],
      reason: "Provision the two fixed production super administrators",
    };

    const denied = await request("/internal/provision-fixed-super-admins", {
      method: "POST", body: payload, bootstrapSecret: "incorrect-bootstrap-secret-value",
    });
    expect(denied.response.status).toBe(403);

    const provisioned = await request<Array<{ email: string }>>("/internal/provision-fixed-super-admins", {
      method: "POST", body: payload, bootstrapSecret: env.BOOTSTRAP_ADMIN_SECRET,
    });
    expect(provisioned.response.status).toBe(201);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE is_fixed_super_admin = 1").first<number>("count")).toBe(2);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM password_credentials WHERE must_change_password = 1").first<number>("count")).toBe(2);

    const login = await request<{ user: { mustChangePassword: boolean }; csrfToken: string }>("/auth/login", {
      method: "POST", body: { email: "ruetiotclub@gmail.com", password: firstPassword },
    });
    expect(login.response.status).toBe(200);
    expect(login.body.data?.user.mustChangePassword).toBe(true);
    const cookie = login.response.headers.get("Set-Cookie")?.split(";")[0];

    const blocked = await request("/admin/rbac/roles", { cookie });
    expect(blocked.response.status).toBe(403);
    expect(blocked.body.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const changed = await request("/auth/change-password", {
      method: "POST",
      cookie,
      csrf: login.body.data!.csrfToken,
      body: { currentPassword: firstPassword, newPassword: "private replacement admin password 2026" },
    });
    expect(changed.response.status).toBe(200);
    expect((await request("/admin/rbac/roles", { cookie })).response.status).toBe(200);
    expect((await request("/auth/login", { method: "POST", body: { email: "ruetiotclub@gmail.com", password: firstPassword } })).response.status).toBe(401);

    const content = await request("/admin/projects/featured-sensor", {
      method: "PUT", cookie, csrf: login.body.data!.csrfToken,
      body: {
        title: "Cloudflare Sensor Network", shortDescription: "Stored in Cloudflare D1.", description: "Stored in D1",
        projectStatus: "ONGOING", publicationStatus: "PUBLISHED", category: "IoT", projectLead: "RUET IoT Club",
        teamMembers: [], coverImage: null, gallery: [], technologies: [], tags: [], objectives: [], features: [], outcomes: "",
        partners: [], sortOrder: 1, advanced: {},
      },
    });
    expect(content.response.status).toBe(201);
    const publicContent = await request<{ items: Array<{ title: string }> }>("/data/query", {
      method: "POST", body: { table: "projects", filters: [], limit: 10, single: false, countOnly: false },
    });
    expect(publicContent.body.data?.items[0]?.title).toBe("Cloudflare Sensor Network");

    const rejectedMedia = new FormData();
    rejectedMedia.set("file", new File([new TextEncoder().encode("not-an-image")], "fake.png", { type: "image/png" }));
    rejectedMedia.set("purpose", "hero");
    const rejectedUploadResponse = await exports.default.fetch(`${origin}/api/v1/media/upload`, {
      method: "POST",
      headers: { Accept: "application/json", Origin: origin, Cookie: cookie!, "X-CSRF-Token": login.body.data!.csrfToken },
      body: rejectedMedia,
    });
    expect(rejectedUploadResponse.status).toBe(422);

    const mediaForm = new FormData();
    mediaForm.set("file", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], "hero-lab.png", { type: "image/png" }));
    mediaForm.set("purpose", "hero");
    const uploadResponse = await exports.default.fetch(`${origin}/api/v1/media/upload`, {
      method: "POST",
      headers: { Accept: "application/json", Origin: origin, Cookie: cookie!, "X-CSRF-Token": login.body.data!.csrfToken },
      body: mediaForm,
    });
    const uploaded = await uploadResponse.json<Envelope<{ key: string; url: string; originalName: string }>>();
    expect(uploadResponse.status).toBe(201);
    expect(uploaded.data?.url).toBe(`/api/v1/media/files/${uploaded.data?.key}`);

    const heroId = "managed-hero-slide";
    const heroData = {
      title: "Connected innovation at RUET",
      description: "A content-managed Hero Slide backed by D1 and R2.",
      image_key: uploaded.data!.key,
      image_url: uploaded.data!.url,
      image_alt: "Students collaborating in the RUET IoT laboratory",
    };
    const draft = await request(`/admin/content/hero_slides/${heroId}`, {
      method: "PUT", cookie, csrf: login.body.data!.csrfToken,
      body: { data: heroData, status: "DRAFT", sortOrder: 2 },
    });
    expect(draft.response.status).toBe(200);
    const editedDraft = await request<Array<{ id: string; image_key: string }>>("/admin/content/hero_slides", { cookie });
    expect(editedDraft.body.data?.find((item) => item.id === heroId)?.image_key).toBe(uploaded.data!.key);

    const missingImagePublish = await request("/admin/content/hero_slides/no-image", {
      method: "PUT", cookie, csrf: login.body.data!.csrfToken,
      body: { data: { title: "Missing image" }, status: "PUBLISHED", sortOrder: 3 },
    });
    expect(missingImagePublish.response.status).toBe(422);
    expect(missingImagePublish.body.code).toBe("HERO_IMAGE_REQUIRED");

    const publishedHero = await request(`/admin/content/hero_slides/${heroId}`, {
      method: "PUT", cookie, csrf: login.body.data!.csrfToken,
      body: { data: { ...heroData, title: "Connected innovation at RUET — published" }, status: "PUBLISHED", sortOrder: 2 },
    });
    expect(publishedHero.response.status).toBe(200);
    const publicHeroes = await request<{ items: Array<{ id: string; image_key: string; image_url: string }> }>("/data/query", {
      method: "POST", body: { table: "hero_slides", filters: [], limit: 10, single: false, countOnly: false },
    });
    expect(publicHeroes.body.data?.items.find((item) => item.id === heroId)).toMatchObject({
      image_key: uploaded.data!.key,
      image_url: uploaded.data!.url,
    });

    const secondHeroId = "managed-hero-slide-two";
    const secondPublishedHero = await request(`/admin/content/hero_slides/${secondHeroId}`, {
      method: "PUT", cookie, csrf: login.body.data!.csrfToken,
      body: { data: { ...heroData, title: "A second managed Hero image" }, status: "PUBLISHED", sortOrder: 3 },
    });
    expect(secondPublishedHero.response.status).toBe(200);
    const multiplePublicHeroes = await request<{ items: Array<{ id: string }> }>("/data/query", {
      method: "POST", body: { table: "hero_slides", filters: [], limit: 10, single: false, countOnly: false },
    });
    expect(multiplePublicHeroes.body.data?.items.map((item) => item.id)).toEqual(expect.arrayContaining([heroId, secondHeroId]));

    const removedAssociation = await request(`/admin/content/hero_slides/${heroId}`, {
      method: "PUT", cookie, csrf: login.body.data!.csrfToken,
      body: { data: { title: "Connected innovation at RUET", description: heroData.description }, status: "DRAFT", sortOrder: 2 },
    });
    expect(removedAssociation.response.status).toBe(200);
    expect(await env.STORAGE.get(uploaded.data!.key)).not.toBeNull();
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM website_content_items WHERE id = ?").bind(heroId).first<number>("count")).toBe(1);

    const fixed = await env.DB.prepare(
      `SELECT u.id, ur.id AS assignment_id FROM users u JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.primary_email_normalized = 'ruetiotclub@gmail.com' AND ur.role_id = 'role:SUPER_ADMIN'`,
    ).first<{ id: string; assignment_id: string }>();
    await expect(env.DB.prepare("UPDATE users SET status = 'SUSPENDED' WHERE id = ?").bind(fixed!.id).run())
      .rejects.toThrow(/fixed super administrator account is immutable/iu);
    await expect(env.DB.prepare("UPDATE users SET primary_email = 'changed@example.com' WHERE id = ?").bind(fixed!.id).run())
      .rejects.toThrow(/fixed super administrator account is immutable/iu);
    await expect(env.DB.prepare("UPDATE user_roles SET revoked_at = ? WHERE id = ?").bind(new Date().toISOString(), fixed!.assignment_id).run())
      .rejects.toThrow(/fixed super administrator role cannot be revoked/iu);
  }, 60_000);
});
