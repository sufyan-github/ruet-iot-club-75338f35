import type { MiddlewareHandler } from "hono";
import type { AppEnvironment } from "../types";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-src https://challenges.cloudflare.com https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

export function securityHeaders(): MiddlewareHandler<AppEnvironment> {
  return async (context, next) => {
    await next();

    const headers = new Headers(context.res.headers);
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set(
      "Permissions-Policy",
      "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    );
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");

    if (context.env.ENVIRONMENT === "production") {
      headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );
    }

    context.res = new Response(context.res.body, {
      status: context.res.status,
      statusText: context.res.statusText,
      headers,
    });
  };
}

export function noStoreApiResponses(): MiddlewareHandler<AppEnvironment> {
  return async (context, next) => {
    await next();
    context.res.headers.set("Cache-Control", "no-store");
  };
}
