import { z } from "zod";
import { clientIp } from "../auth/rate-limit";
import { AppError } from "../lib/app-error";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

const turnstileResponseSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
  cdata: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

export interface TurnstileVerification {
  success: boolean;
  hostname?: string;
  action?: string;
  errorCodes: string[];
}

export async function verifyTurnstile(options: {
  secret: string;
  token: string;
  remoteIp?: string;
  expectedAction?: string;
  expectedHostnames?: string[];
}): Promise<TurnstileVerification> {
  const token = options.token.trim();

  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { success: false, errorCodes: ["invalid-input-response"] };
  }

  const body = new URLSearchParams({ secret: options.secret, response: token });
  if (options.remoteIp) {
    body.set("remoteip", options.remoteIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new AppError({
      code: "BOT_PROTECTION_UNAVAILABLE",
      message: "Bot protection could not be verified. Please try again.",
      status: 502,
    });
  }

  const parsed = turnstileResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AppError({
      code: "BOT_PROTECTION_INVALID_RESPONSE",
      message: "Bot protection returned an invalid response.",
      status: 502,
    });
  }

  const actionMatches =
    !options.expectedAction || parsed.data.action === options.expectedAction;
  const hostnameMatches =
    !options.expectedHostnames?.length ||
    (Boolean(parsed.data.hostname) &&
      options.expectedHostnames.includes(parsed.data.hostname!));
  return {
    success: parsed.data.success && actionMatches && hostnameMatches,
    ...(parsed.data.hostname ? { hostname: parsed.data.hostname } : {}),
    ...(parsed.data.action ? { action: parsed.data.action } : {}),
    errorCodes: !actionMatches
      ? ["action-mismatch"]
      : !hostnameMatches
        ? ["hostname-mismatch"]
        : (parsed.data["error-codes"] ?? []),
  };
}

export async function enforceTurnstile(options: {
  env: Env;
  request: Request;
  token: string;
  action: string;
}): Promise<void> {
  const testEnv = options.env as Env & { TURNSTILE_TEST_BYPASS_TOKEN?: string };
  if (
    String(options.env.ENVIRONMENT) === "test" &&
    testEnv.TURNSTILE_TEST_BYPASS_TOKEN === options.token
  )
    return;
  const expectedHostnames = Array.from(
    new Set(
      [options.env.SITE_URL, options.env.FRONTEND_ORIGIN]
        .map((value) => new URL(value).hostname)
        .filter(Boolean),
    ),
  );
  const verification = await verifyTurnstile({
    secret: options.env.TURNSTILE_SECRET,
    token: options.token,
    remoteIp: clientIp(options.request),
    expectedAction:
      options.env.TURNSTILE_SITE_KEY === "1x00000000000000000000AA"
        ? undefined
        : options.action,
    expectedHostnames:
      options.env.TURNSTILE_SITE_KEY === "1x00000000000000000000AA"
        ? undefined
        : expectedHostnames,
  });
  if (!verification.success) {
    throw new AppError({
      code: "BOT_CHECK_FAILED",
      message: "Please complete the security check again.",
      status: 403,
    });
  }
}
