import { Hono } from "hono";
import { z } from "zod";
import {
  csrfMiddleware,
  requireAuth,
  sessionMiddleware,
} from "../auth/session";
import { parseJson } from "../auth/validation";
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
} from "../domain/events";
import { success } from "../lib/api-envelope";
import { AppError } from "../lib/app-error";
import {
  requireAnyPermission,
  requirePermission,
} from "../middleware/authorization";
import type { AppEnvironment } from "../types";

const idSchema = z.string().uuid();

export const eventRoutes = new Hono<AppEnvironment>();

eventRoutes.get(
  "/admin/events",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const rows = await context.env.DB.prepare(
      `${selectEvent} WHERE e.workflow_status!='ARCHIVED' ORDER BY e.updated_at DESC LIMIT 500`,
    ).all<Record<string, unknown>>();
    return context.json(
      success(
        rows.results.map((row) => eventView(row)),
        context.get("requestId"),
      ),
    );
  },
);

eventRoutes.get(
  "/admin/events/:id",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const id = idSchema.parse(context.req.param("id"));
    const row = await context.env.DB.prepare(`${selectEvent} WHERE e.id=?`)
      .bind(id)
      .first<Record<string, unknown>>();
    if (!row)
      throw new AppError({
        code: "EVENT_NOT_FOUND",
        message: "The event was not found.",
        status: 404,
      });
    return context.json(success(eventView(row), context.get("requestId")));
  },
);

eventRoutes.put(
  "/admin/events/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["event.manage", "content.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const input = normalizeEventInput(await parseJson(context, eventSchema));
    await validateEventMediaReferences(
      context.env.DB,
      context.env.STORAGE,
      input,
    );

    const duplicate = await context.env.DB.prepare(
      "SELECT id FROM managed_events WHERE slug=? AND id!=?",
    )
      .bind(input.slug, id)
      .first("id");
    if (duplicate)
      throw new AppError({
        code: "EVENT_SLUG_EXISTS",
        message: "Another event already uses this slug.",
        status: 409,
      });

    const previous = await context.env.DB.prepare(
      "SELECT slug,workflow_status,published_at FROM managed_events WHERE id=?",
    )
      .bind(id)
      .first<{
        slug: string;
        workflow_status: string;
        published_at: string | null;
      }>();
    if (
      previous?.workflow_status === "PUBLISHED" &&
      previous.slug !== input.slug &&
      !input.confirmSlugChange
    )
      throw new AppError({
        code: "EVENT_SLUG_CONFIRMATION_REQUIRED",
        message:
          "Changing this published event slug changes its public URL. Confirm the URL change and save again.",
        status: 409,
      });

    const now = new Date().toISOString();
    const publishTime =
      input.workflowStatus === "PUBLISHED"
        ? previous?.published_at || now
        : null;
    const updateColumns = eventColumns.filter(
      (column) => !["id", "created_by", "created_at"].includes(column),
    );
    const action = !previous
      ? "EVENT_CREATED"
      : previous.workflow_status !== input.workflowStatus
        ? `EVENT_${input.workflowStatus === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED"}`
        : "EVENT_UPDATED";
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at,published_at,archived_at)
         VALUES(?,'events',?,?,?,?,?,?,?,?,NULL)
         ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,sort_order=excluded.sort_order,
         updated_by=excluded.updated_by,updated_at=excluded.updated_at,published_at=excluded.published_at,archived_at=NULL`,
      ).bind(
        id,
        JSON.stringify(legacyEventData(input)),
        input.workflowStatus,
        input.sortOrder,
        user.id,
        user.id,
        now,
        now,
        publishTime,
      ),
      context.env.DB.prepare(
        `INSERT INTO managed_events(${eventColumns.join(",")}) VALUES(${eventColumns.map(() => "?").join(",")})
         ON CONFLICT(id) DO UPDATE SET ${updateColumns.map((column) => `${column}=excluded.${column}`).join(",")}`,
      ).bind(...eventValues(input, id, user.id, now, publishTime)),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action,
        entityType: "EVENT",
        entityId: id,
        metadata: {
          slug: input.slug,
          workflowStatus: input.workflowStatus,
          eventStatus: input.eventStatus,
          registrationStatus: input.registrationStatus,
        },
      }),
    ];
    if (
      input.workflowStatus === "PUBLISHED" &&
      previous?.workflow_status !== "PUBLISHED"
    )
      statements.push(
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
         SELECT lower(hex(randomblob(16))),id,'EVENT_PUBLISHED',?,?,?,'EVENT',?,'NORMAL',? FROM users WHERE status='EMAIL_VERIFIED' AND deleted_at IS NULL`,
        ).bind(
          `New event: ${input.title}`,
          input.shortDescription,
          `/events/${input.slug}`,
          id,
          `event:published:${id}`,
        ),
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id,
          slug: input.slug,
          status: input.workflowStatus,
          eventStatus: input.eventStatus,
          registrationStatus: input.registrationStatus,
          action,
        },
        context.get("requestId"),
      ),
      previous ? 200 : 201,
    );
  },
);

eventRoutes.delete(
  "/admin/events/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["event.manage", "content.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const id = idSchema.parse(context.req.param("id"));
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      "UPDATE managed_events SET workflow_status='ARCHIVED',updated_by=?,updated_at=? WHERE id=? AND workflow_status!='ARCHIVED' RETURNING id",
    )
      .bind(user.id, now, id)
      .first("id");
    if (!result)
      throw new AppError({
        code: "EVENT_NOT_FOUND",
        message: "The event was not found.",
        status: 404,
      });
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE website_content_items SET status='ARCHIVED',archived_at=?,updated_by=?,updated_at=? WHERE id=?",
      ).bind(now, user.id, now, id),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "EVENT_ARCHIVED",
        entityType: "EVENT",
        entityId: id,
      }),
    ]);
    return context.json(
      success({ id, status: "ARCHIVED" }, context.get("requestId")),
    );
  },
);
