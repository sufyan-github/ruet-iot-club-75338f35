import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createSessionMaterial } from "../auth/session";

interface Envelope<T> { success: boolean; data?: T; code?: string }
interface Identity { id: string; cookie: string; csrf: string }
interface SavedProject { id: string; slug: string; created: boolean; publicationStatus: string }
interface ProjectRecord {
  id: string;
  slug: string;
  title: string;
  projectStatus: string;
  publicationStatus: string;
  coverImage: { key: string; url: string } | null;
  gallery: Array<{ key: string; url: string }>;
}

const origin = "https://test.invalid";

async function createIdentity(email: string, role: "PROJECT_MANAGER" | "REVIEWER"): Promise<Identity> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users (id, primary_email, primary_email_normalized, display_name, status, email_verified_at)
     VALUES (?, ?, ?, ?, 'EMAIL_VERIFIED', ?)`,
  ).bind(id, email, email.toLowerCase(), `Test ${role}`, new Date().toISOString()).run();
  await env.DB.prepare(
    "INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason) VALUES (?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), id, `role:${role}`, id, "Project management integration test").run();
  const session = await createSessionMaterial();
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, csrf_token_hash, expires_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(session.id, id, session.tokenHash, session.csrfTokenHash, session.expiresAt).run();
  return { id, cookie: `__Host-ruet_session=${session.token}`, csrf: session.csrfToken };
}

async function request<T>(path: string, options: { method?: string; body?: unknown; identity?: Identity } = {}) {
  const headers = new Headers({ Accept: "application/json", Origin: origin });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.identity) { headers.set("Cookie", options.identity.cookie); headers.set("X-CSRF-Token", options.identity.csrf); }
  const response = await exports.default.fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? "GET", headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  return { response, body: await response.json<Envelope<T>>() };
}

async function uploadImage(identity: Identity, name: string) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], name, { type: "image/png" }));
  form.set("purpose", "project");
  const response = await exports.default.fetch(`${origin}/api/v1/media/upload`, {
    method: "POST",
    headers: { Accept: "application/json", Origin: origin, Cookie: identity.cookie, "X-CSRF-Token": identity.csrf },
    body: form,
  });
  const body = await response.json<Envelope<{ key: string; url: string; originalName: string; contentType: string; byteSize: number }>>();
  expect(response.status).toBe(201);
  return body.data!;
}

const projectInput = {
  title: "Smart Campus Air Quality Network",
  slug: "smart-campus-air-quality",
  shortDescription: "A distributed sensing network for measuring indoor air quality across campus buildings.",
  description: "Sensor nodes stream validated environmental readings to an operator dashboard.",
  projectStatus: "ONGOING",
  publicationStatus: "DRAFT",
  category: "Environmental IoT",
  projectLead: "Project Lead",
  teamMembers: ["Embedded Engineer", "Data Engineer"],
  startDate: "2026-01-15",
  expectedCompletionDate: "2026-12-15",
  coverImage: null,
  gallery: [],
  technologies: ["ESP32", "LoRaWAN"],
  tags: ["sensors", "campus"],
  objectives: ["Measure air quality"],
  features: ["Distributed sensing"],
  outcomes: "An operational pilot is being evaluated.",
  partners: ["RUET IoT Club"],
  projectUrl: "https://example.com/project",
  githubUrl: "https://github.com/example/project",
  demoUrl: "https://example.com/demo",
  sortOrder: 2,
  advanced: { reportingInterval: "5m" },
};

beforeAll(async () => {
  const migrations = (env as Env & { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS;
  await applyD1Migrations(env.DB, migrations);
});

describe.sequential("project portfolio management", () => {
  it("supports draft, publish, unique slugs, multi-image R2 references, filtering, unpublish, archive, RBAC, and audit", async () => {
    const manager = await createIdentity("project-manager@example.com", "PROJECT_MANAGER");
    const reviewer = await createIdentity("project-reviewer@example.com", "REVIEWER");
    const firstId = crypto.randomUUID();

    const draft = await request<SavedProject>(`/admin/projects/${firstId}`, { method: "PUT", identity: manager, body: projectInput });
    expect(draft.response.status).toBe(201);
    expect(draft.body.data).toMatchObject({ slug: "smart-campus-air-quality", created: true, publicationStatus: "DRAFT" });
    expect((await request<{ items: ProjectRecord[] }>("/projects")).body.data?.items).toHaveLength(0);

    const published = await request<SavedProject>(`/admin/projects/${firstId}`, {
      method: "PUT", identity: manager, body: { ...projectInput, publicationStatus: "PUBLISHED" },
    });
    expect(published.response.status).toBe(200);
    const publicList = await request<{ items: ProjectRecord[]; count: number }>("/projects");
    expect(publicList.body.data?.count).toBe(1);
    expect(publicList.body.data?.items[0]).toMatchObject({ id: firstId, coverImage: null, projectStatus: "ONGOING" });
    expect((await request<ProjectRecord>("/projects/smart-campus-air-quality")).body.data?.id).toBe(firstId);

    const firstImage = await uploadImage(manager, "air-quality-cover.png");
    const secondImage = await uploadImage(manager, "air-quality-gallery.png");
    const secondId = crypto.randomUUID();
    const second = await request<SavedProject>(`/admin/projects/${secondId}`, {
      method: "PUT", identity: manager,
      body: {
        ...projectInput,
        title: "Smart Campus Air Quality Network — Expansion",
        publicationStatus: "PUBLISHED",
        projectStatus: "COMPLETED",
        actualCompletionDate: "2026-08-15",
        coverImage: { ...firstImage, alt: "Air quality sensor node installed in a campus laboratory", width: 1200, height: 675 },
        gallery: [
          { ...firstImage, alt: "Air quality sensor node installed in a campus laboratory", width: 1200, height: 675 },
          { ...secondImage, alt: "Project dashboard showing sensor measurements", width: 1200, height: 675 },
        ],
      },
    });
    expect(second.response.status).toBe(201);
    expect(second.body.data?.slug).toBe("smart-campus-air-quality-2");
    const secondPublic = await request<ProjectRecord>("/projects/smart-campus-air-quality-2");
    expect(secondPublic.body.data?.gallery).toHaveLength(2);
    expect(secondPublic.body.data?.coverImage?.url).toBe(`/api/v1/media/files/${firstImage.key}`);

    const filtered = await request<{ items: ProjectRecord[]; stats: { total: number; completed: number; ongoing: number } }>(
      "/admin/projects?search=Expansion&projectStatus=COMPLETED&publicationStatus=PUBLISHED&sort=alphabetical",
      { identity: manager },
    );
    expect(filtered.response.status).toBe(200);
    expect(filtered.body.data?.items.map((project) => project.id)).toEqual([secondId]);
    expect(filtered.body.data?.stats).toMatchObject({ total: 2, completed: 1, ongoing: 1 });

    const reviewerList = await request("/admin/projects", { identity: reviewer });
    expect(reviewerList.response.status).toBe(200);
    const reviewerWrite = await request(`/admin/projects/${crypto.randomUUID()}`, { method: "PUT", identity: reviewer, body: projectInput });
    expect(reviewerWrite.response.status).toBe(403);
    expect(reviewerWrite.body.code).toBe("PERMISSION_DENIED");

    const unpublished = await request(`/admin/projects/${firstId}`, {
      method: "PUT", identity: manager, body: { ...projectInput, publicationStatus: "DRAFT", title: "Smart Campus Air Quality Network — Revised" },
    });
    expect(unpublished.response.status).toBe(200);
    expect((await request("/projects/smart-campus-air-quality")).response.status).toBe(404);

    const archived = await request(`/admin/projects/${secondId}/archive`, { method: "POST", identity: manager });
    expect(archived.response.status).toBe(200);
    expect((await request("/projects/smart-campus-air-quality-2")).response.status).toBe(404);
    expect(await env.STORAGE.head(firstImage.key)).not.toBeNull();
    expect(await env.STORAGE.head(secondImage.key)).not.toBeNull();

    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO website_content_items
       (id, collection_key, data_json, status, sort_order, created_by, updated_by, published_at)
       VALUES (?, 'projects', ?, 'PUBLISHED', 5, ?, ?, ?)`,
    ).bind("legacy-weather-project", JSON.stringify({ title: "Legacy Weather Station", description: "A legacy record without a stored slug." }), manager.id, manager.id, now).run();
    expect((await request<ProjectRecord>("/projects/legacy-weather-station")).body.data?.id).toBe("legacy-weather-project");
    const legacyCollision = await request<SavedProject>(`/admin/projects/${crypto.randomUUID()}`, {
      method: "PUT", identity: manager,
      body: { ...projectInput, title: "Legacy Weather Station Modernized", slug: "legacy-weather-station", publicationStatus: "DRAFT" },
    });
    expect(legacyCollision.body.data?.slug).toBe("legacy-weather-station-2");

    const actionRows = await env.DB.prepare(
      "SELECT action FROM audit_logs WHERE entity_type = 'PROJECT' ORDER BY created_at ASC",
    ).all<{ action: string }>();
    expect(actionRows.results.map((row) => row.action)).toEqual(expect.arrayContaining([
      "PROJECT_CREATED", "PROJECT_UPDATED", "PROJECT_PUBLISHED", "PROJECT_UNPUBLISHED", "PROJECT_ARCHIVED",
    ]));
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key = 'projects'").first<number>("count")).toBe(4);
  }, 60_000);
});
