import { z } from "zod";
import { AppError } from "../lib/app-error";

export const membershipPaymentMethodSchema = z.enum(["BKASH", "NAGAD"]);

export const membershipPaymentSettingsSchema = z.object({
  phone: z.string().trim().min(3).max(50),
  paymentNumber: z.string().trim().regex(/^01[3-9]\d{8}$/u, "Use a valid Bangladesh mobile wallet number."),
  paymentMethods: z.array(membershipPaymentMethodSchema).min(1).max(2)
    .refine((methods) => new Set(methods).size === methods.length, "Payment methods must be unique."),
  paymentInstructions: z.string().trim().min(20).max(1000),
}).strict();

export type MembershipPaymentSettings = z.infer<typeof membershipPaymentSettingsSchema>;

export async function readMembershipPaymentSettings(db: D1Database): Promise<MembershipPaymentSettings> {
  const raw = await db.prepare(
    "SELECT value_json FROM platform_settings WHERE setting_key = 'website.membership'",
  ).first<string>("value_json");
  if (!raw) {
    throw new AppError({
      code: "PAYMENT_CONFIGURATION_MISSING",
      message: "Membership payment configuration is unavailable.",
      status: 503,
    });
  }
  try {
    return membershipPaymentSettingsSchema.parse(JSON.parse(raw));
  } catch {
    throw new AppError({
      code: "PAYMENT_CONFIGURATION_INVALID",
      message: "Membership payment configuration requires administrator attention.",
      status: 503,
    });
  }
}
