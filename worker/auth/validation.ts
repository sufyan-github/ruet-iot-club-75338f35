import type { Context } from "hono";
import { z } from "zod";
import { AppError } from "../lib/app-error";
import type { AppEnvironment } from "../types";

const email = z.string().trim().email().max(254);
const password = z.string().min(12).max(128);
const token = z.string().trim().min(32).max(512);

export const registerSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(32).optional().nullable(),
  institution: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(160),
  professionalStatus: z.enum(["STUDENT", "FACULTY", "RESEARCHER", "PROFESSIONAL", "OTHER"]),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required to create an account." }) }),
  turnstileToken: z.string().trim().min(1).max(2048),
}).strict();

export const loginSchema = z.object({ email, password });
export const emailOnlySchema = z.object({ email });
export const tokenOnlySchema = z.object({ token });
export const resetPasswordSchema = z.object({ token, password });
export const changePasswordSchema = z.object({
  currentPassword: password,
  newPassword: password,
}).refine((value) => value.currentPassword !== value.newPassword, {
  message: "The new password must be different from the current password.",
  path: ["newPassword"],
});
export const emailChangeSchema = z.object({ email, password });
export const deletionRequestSchema = z.object({ reason: z.string().trim().max(1000).optional() });
export const onboardingSchema = z.object({ status: z.enum(["COMPLETED", "DISMISSED"]) });
export const notificationPreferencesSchema = z
  .object({
    accountEmail: z.boolean().optional(),
    eventEmail: z.boolean().optional(),
    announcementEmail: z.boolean().optional(),
  })
  .refine((value) => value.accountEmail !== false, "Essential account email cannot be disabled.")
  .refine((value) => Object.values(value).some((item) => item !== undefined), "At least one preference is required.");

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function parseJson<TSchema extends z.ZodTypeAny>(
  context: Context<AppEnvironment>,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  let payload: unknown;
  try {
    payload = await context.req.json();
  } catch {
    throw new AppError({ code: "INVALID_JSON", message: "The request body must be valid JSON.", status: 400 });
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    const details: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "body";
      details[key] = [...(details[key] ?? []), issue.message];
    }
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      status: 422,
      details,
    });
  }
  return result.data;
}
