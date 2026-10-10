import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createObjectKey, R2ObjectStore } from "../storage/r2-object-store";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  code?: string;
  details?: Record<string, string[]>;
  meta: { requestId: string };
}

describe("Cloudflare Worker foundation", () => {
  it("serves a structured health response with security headers", async () => {
    const response = await exports.default.fetch(
      "https://test.invalid/api/v1/health",
    );
    const body =
      await response.json<
        ApiEnvelope<{ status: string; environment: string }>
      >();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ status: "ok", environment: "test" });
    expect(body.meta.requestId).toBe(response.headers.get("X-Request-ID"));
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "frame-src https://challenges.cloudflare.com https://www.google.com https://maps.google.com",
    );
  });

  it("checks the local D1 binding for readiness", async () => {
    const response = await exports.default.fetch(
      "https://test.invalid/api/v1/ready",
    );
    const body = await response.json<ApiEnvelope<{ status: string }>>();

    expect(response.status).toBe(200);
    expect(body.data?.status).toBe("ready");
  });

  it("returns a non-leaking structured error for an unknown API route", async () => {
    const response = await exports.default.fetch(
      "https://test.invalid/api/v1/does-not-exist",
    );
    const body = await response.json<ApiEnvelope<never>>();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.code).toBe("ROUTE_NOT_FOUND");
    expect(body.meta.requestId).toBeTruthy();
  });

  it.each([
    "/api/v1/community/not-a-community-kind",
    "/api/v1/opportunity-applications/track",
    "/api/v1/courses/not-a-uuid",
  ])(
    "returns a structured validation response for malformed route input: %s",
    async (path) => {
      const response = await exports.default.fetch(
        `https://test.invalid${path}`,
      );
      const body = await response.json<ApiEnvelope<never>>();

      expect(response.status).toBe(422);
      expect(body.success).toBe(false);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.details).toBeTruthy();
      expect(body.meta.requestId).toBeTruthy();
    },
  );

  it("stores private objects under randomized R2 keys", async () => {
    const key = createObjectKey({
      visibility: "private",
      purpose: "applications",
      originalFilename: "Student Resume.PDF",
      now: new Date("2026-08-20T00:00:00.000Z"),
    });
    const store = new R2ObjectStore(env.STORAGE);

    await store.put({
      key,
      body: new TextEncoder().encode("test document"),
      contentType: "application/pdf",
    });

    const stored = await store.get(key);
    expect(key).toMatch(/^private\/applications\/2026\/08\/[0-9a-f-]+\.pdf$/);
    expect(key).not.toContain("student-resume");
    expect(await stored?.text()).toBe("test document");
  });
});
