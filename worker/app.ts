import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { ZodError } from "zod";
import { AppError } from "./lib/app-error";
import { failure, success } from "./lib/api-envelope";
import { requestContext } from "./middleware/request-context";
import { noStoreApiResponses, securityHeaders } from "./middleware/security";
import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { membershipRoutes } from "./routes/membership";
import { workflowRoutes } from "./routes/workflow";
import { contentRoutes } from "./routes/content";
import { submissionRoutes } from "./routes/submissions";
import { settingsRoutes } from "./routes/settings";
import { projectRoutes } from "./routes/projects";
import { certificateRoutes } from "./routes/certificates";
import { platformRoutes } from "./routes/platform";
import { communityRoutes } from "./routes/community";
import { sitemapRoutes } from "./routes/sitemap";
import { blogRoutes } from "./routes/blogs";
import { eventRoutes } from "./routes/events";
import type { AppEnvironment } from "./types";

export const app = new Hono<AppEnvironment>();

app.use("*", requestContext());
app.use("*", securityHeaders());
app.use("*", async (context, next) => {
  const url = new URL(context.req.url);
  const canonical = new URL(context.env.SITE_URL);
  if (
    context.env.ENVIRONMENT === "production" &&
    url.hostname === `www.${canonical.hostname}`
  ) {
    url.protocol = canonical.protocol;
    url.hostname = canonical.hostname;
    url.port = canonical.port;
    return context.redirect(url.toString(), 308);
  }
  await next();
});
app.use("/api/*", noStoreApiResponses());
app.use(
  "/api/v1/auth/*",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: () => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413,
      });
    },
  }),
);
app.use(
  "/api/v1/account/*",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: () => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413,
      });
    },
  }),
);
app.use(
  "/api/v1/admin/*",
  bodyLimit({
    maxSize: 256 * 1024,
    onError: () => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413,
      });
    },
  }),
);
app.use(
  "/api/v1/internal/*",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: () => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413,
      });
    },
  }),
);
app.use(
  "/api/v1/data/*",
  bodyLimit({
    maxSize: 64 * 1024,
    onError: () => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413,
      });
    },
  }),
);
app.use(
  "/api/v1/media/upload",
  bodyLimit({
    maxSize: 6 * 1024 * 1024,
    onError: () => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The media file is too large.",
        status: 413,
      });
    },
  }),
);
app.use(
  "/api/v1/submissions/*",
  bodyLimit({
    maxSize: 11 * 1024 * 1024,
    onError: () => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The submission payload is too large.",
        status: 413,
      });
    },
  }),
);
app.use(
  "/api/v1/membership/*",
  bodyLimit({
    maxSize: 32 * 1024,
    onError: () => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413,
      });
    },
  }),
);
app.use(
  "/api/v1/volunteers/*",
  bodyLimit({
    maxSize: 32 * 1024,
    onError: () => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413,
      });
    },
  }),
);

app.get("/api/v1", (context) =>
  context.json(
    success(
      {
        service: "RUET IoT Club API",
        version: "v1",
        documentation: "/docs/architecture",
      },
      context.get("requestId"),
    ),
  ),
);

app.route("/api/v1", healthRoutes);
app.route("/api/v1", authRoutes);
app.route("/api/v1", adminRoutes);
app.route("/api/v1", membershipRoutes);
app.route("/api/v1", workflowRoutes);
app.route("/api/v1", contentRoutes);
app.route("/api/v1", submissionRoutes);
app.route("/api/v1", settingsRoutes);
app.route("/api/v1", projectRoutes);
app.route("/api/v1", certificateRoutes);
app.route("/api/v1", platformRoutes);
app.route("/api/v1", communityRoutes);
app.route("/api/v1", blogRoutes);
app.route("/api/v1", eventRoutes);
app.route("/", sitemapRoutes);

app.all("/api/*", (context) =>
  context.json(
    failure(
      "ROUTE_NOT_FOUND",
      "The requested API route does not exist.",
      context.get("requestId"),
    ),
    404,
  ),
);

app.get("*", (context) => context.env.ASSETS.fetch(context.req.raw));
app.on("HEAD", "*", (context) => context.env.ASSETS.fetch(context.req.raw));

app.notFound((context) =>
  context.json(
    failure(
      "NOT_FOUND",
      "The requested resource does not exist.",
      context.get("requestId"),
    ),
    404,
  ),
);

app.onError((error, context) => {
  const requestId = context.get("requestId") || crypto.randomUUID();

  if (error instanceof AppError) {
    return context.json(
      failure(error.code, error.message, requestId, error.details),
      error.status,
    );
  }

  if (error instanceof ZodError) {
    const flattened = error.flatten();
    const details = Object.fromEntries(
      Object.entries(flattened.fieldErrors).filter(
        (entry): entry is [string, string[]] => Array.isArray(entry[1]),
      ),
    );
    if (flattened.formErrors.length > 0) details._root = flattened.formErrors;
    return context.json(
      failure(
        "VALIDATION_ERROR",
        "The request could not be validated.",
        requestId,
        details,
      ),
      422,
    );
  }

  console.error(
    JSON.stringify({
      message: "request.failed",
      requestId,
      path: new URL(context.req.url).pathname,
      error: error instanceof Error ? error.message : "Unknown error",
    }),
  );

  return context.json(
    failure("INTERNAL_ERROR", "An unexpected error occurred.", requestId),
    500,
  );
});
