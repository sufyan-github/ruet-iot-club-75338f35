import { Hono, type Context } from "hono";
import { z } from "zod";
import { requireAuth, sessionMiddleware } from "../auth/session";
import { sha256, timingSafeEqualStrings } from "../auth/crypto";
import { parseJson } from "../auth/validation";
import { createAuditStatement } from "../db/audit";
import { success } from "../lib/api-envelope";
import { AppError } from "../lib/app-error";
import { requirePermission } from "../middleware/authorization";
import { membershipPaymentSettingsSchema } from "../services/membership-payment";
import type { AppEnvironment } from "../types";

const googleMapsUrl = z
  .string()
  .url()
  .max(1000)
  .refine((value) => {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "google.com" ||
      hostname === "www.google.com" ||
      hostname === "maps.google.com"
    );
  }, "Use a valid Google Maps URL.");

const publicSettingsSchema = z
  .object({
    contact: z.object({
      generalEmail: z.string().trim().email().max(254),
      phone: z.string().trim().min(3).max(50),
    }),
    membership: membershipPaymentSettingsSchema,
    location: z.object({
      address: z.string().trim().min(10).max(500),
      mapEmbedUrl: googleMapsUrl.refine((value) => {
        const parsed = new URL(value);
        return (
          parsed.pathname.startsWith("/maps") &&
          (parsed.searchParams.get("output") === "embed" ||
            parsed.pathname.includes("/embed"))
        );
      }, "Use a Google Maps embed URL."),
      mapOpenUrl: googleMapsUrl,
    }),
  })
  .strict();

const keys = {
  contact: "website.contact",
  membership: "website.membership",
  location: "website.location",
} as const;

async function verifyCsrf(context: Context<AppEnvironment>) {
  const session = context.get("authSession");
  const csrf = context.req.header("X-CSRF-Token")?.trim();
  if (
    !session ||
    !csrf ||
    !(await timingSafeEqualStrings(await sha256(csrf), session.csrfTokenHash))
  )
    throw new AppError({
      code: "CSRF_VALIDATION_FAILED",
      message: "The request could not be validated.",
      status: 403,
    });
}

async function readSettings(db: D1Database) {
  const result = await db
    .prepare(
      "SELECT setting_key, value_json FROM platform_settings WHERE setting_key IN (?, ?, ?)",
    )
    .bind(keys.contact, keys.membership, keys.location)
    .all<{ setting_key: string; value_json: string }>();
  const records = Object.fromEntries(
    result.results.map((row) => [row.setting_key, JSON.parse(row.value_json)]),
  );
  return publicSettingsSchema.parse({
    contact: records[keys.contact],
    membership: records[keys.membership],
    location: records[keys.location],
  });
}

export const settingsRoutes = new Hono<AppEnvironment>();

settingsRoutes.get("/settings/public", async (context) =>
  context.json(
    success(await readSettings(context.env.DB), context.get("requestId")),
  ),
);
settingsRoutes.get(
  "/admin/settings/website",
  sessionMiddleware({ required: true }),
  requirePermission("settings.read"),
  async (context) =>
    context.json(
      success(await readSettings(context.env.DB), context.get("requestId")),
    ),
);
settingsRoutes.put(
  "/admin/settings/website",
  sessionMiddleware({ required: true }),
  requirePermission("settings.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const origin = context.req.header("Origin");
    const site = new URL(context.env.SITE_URL);
    const allowedOrigins = new Set([
      site.origin,
      new URL(context.env.FRONTEND_ORIGIN).origin,
    ]);
    if (site.protocol === "https:" && !site.hostname.startsWith("www."))
      allowedOrigins.add(`${site.protocol}//www.${site.host}`);
    if (!origin || !allowedOrigins.has(origin))
      throw new AppError({
        code: "INVALID_ORIGIN",
        message: "The request origin is not allowed.",
        status: 403,
      });
    await verifyCsrf(context);
    const input = await parseJson(context, publicSettingsSchema);
    const statements = (Object.keys(keys) as Array<keyof typeof keys>).map(
      (name) =>
        context.env.DB.prepare(
          "UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE setting_key = ?",
        ).bind(
          JSON.stringify(input[name]),
          new Date().toISOString(),
          keys[name],
        ),
    );
    statements.push(
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "PUBLIC_WEBSITE_SETTINGS_UPDATED",
        entityType: "PLATFORM_SETTINGS",
        reason: "Updated public contact, membership, and location settings.",
      }),
    );
    await context.env.DB.batch(statements);
    return context.json(success(input, context.get("requestId")));
  },
);

settingsRoutes.get(
  "/admin/email-outbox",
  sessionMiddleware({ required: true }),
  requirePermission("audit.read"),
  async (context) => {
    const status = context.req.query("status")?.toUpperCase();
    if (status && !["PENDING", "SENDING", "SENT", "FAILED"].includes(status))
      throw new AppError({
        code: "INVALID_EMAIL_STATUS",
        message: "The email status filter is invalid.",
        status: 422,
      });
    const result = await context.env.DB.prepare(
      `SELECT id, template, recipient_email AS recipientEmail, status, attempts,
            next_attempt_at AS nextAttemptAt, last_error AS lastError,
            provider_message_id AS providerMessageId, sent_at AS sentAt, created_at AS createdAt
     FROM email_outbox WHERE (? IS NULL OR status = ?) ORDER BY created_at DESC LIMIT 100`,
    )
      .bind(status ?? null, status ?? null)
      .all();
    return context.json(success(result.results, context.get("requestId")));
  },
);

settingsRoutes.post(
  "/admin/email-outbox/:id/retry",
  sessionMiddleware({ required: true }),
  requirePermission("settings.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    await verifyCsrf(context);
    const result = await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE email_outbox SET status = 'PENDING', next_attempt_at = ?, last_error = NULL, updated_at = ? WHERE id = ? AND status = 'FAILED'",
      ).bind(
        new Date().toISOString(),
        new Date().toISOString(),
        context.req.param("id"),
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "EMAIL_DELIVERY_RETRY_QUEUED",
        entityType: "EMAIL_OUTBOX",
        entityId: context.req.param("id"),
        reason: "Administrator requested a delivery retry.",
      }),
    ]);
    if ((result[0]?.meta.changes ?? 0) !== 1)
      throw new AppError({
        code: "EMAIL_NOT_RETRYABLE",
        message: "Only failed email deliveries can be retried.",
        status: 409,
      });
    return context.json(success({ queued: true }, context.get("requestId")));
  },
);
