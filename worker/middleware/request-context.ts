import type { MiddlewareHandler } from "hono";
import type { AppEnvironment } from "../types";

export function requestContext(): MiddlewareHandler<AppEnvironment> {
  return async (context, next) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    context.set("requestId", requestId);
    context.set("authUser", null);
    context.set("authSession", null);
    await next();

    context.res.headers.set("X-Request-ID", requestId);
    console.log(
      JSON.stringify({
        message: "request.completed",
        requestId,
        method: context.req.method,
        path: new URL(context.req.url).pathname,
        status: context.res.status,
        durationMs: Date.now() - startedAt,
        cfRay: context.req.header("CF-Ray") ?? null,
      }),
    );
  };
}
