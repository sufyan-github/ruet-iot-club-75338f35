import { Hono } from "hono";
import { failure, success } from "../lib/api-envelope";
import type { AppEnvironment } from "../types";

export const healthRoutes = new Hono<AppEnvironment>();

healthRoutes.get("/health", (context) =>
  context.json(
    success(
      {
        service: "ruet-iot-club-platform",
        status: "ok",
        environment: context.env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
      },
      context.get("requestId"),
    ),
  ),
);

healthRoutes.get("/ready", async (context) => {
  try {
    const database = await context.env.DB.prepare("SELECT 1 AS ready").first<{ ready: number }>();

    if (database?.ready !== 1) {
      throw new Error("D1 readiness query returned an unexpected result");
    }

    return context.json(
      success(
        {
          status: "ready",
          checks: { database: "ok", objectStorageBinding: "configured" },
          timestamp: new Date().toISOString(),
        },
        context.get("requestId"),
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "readiness.failed",
        requestId: context.get("requestId"),
        error: error instanceof Error ? error.message : "Unknown readiness error",
      }),
    );

    return context.json(
      failure(
        "SERVICE_NOT_READY",
        "The service is temporarily unable to accept traffic.",
        context.get("requestId"),
      ),
      503,
    );
  }
});
