import { z } from "zod";

export const workflowReasonSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
}).strict();

const payerPhoneSchema = z.string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .transform((value) => value.startsWith("+88") ? value.slice(3) : value.startsWith("88") ? value.slice(2) : value)
  .pipe(z.string().regex(/^01[3-9]\d{8}$/u, "Enter the Bangladesh mobile number used to make the payment."));

export const paymentSubmissionSchema = z.object({
  paymentMethod: z.preprocess(
    (value) => typeof value === "string" ? value.trim().toUpperCase() : value,
    z.enum(["BKASH", "NAGAD"]),
  ),
  payerPhone: payerPhoneSchema,
  transactionReference: z.string().trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$/u, "Enter a valid 6–64 character transaction ID.")
    .transform((value) => value.toUpperCase()),
}).strict();

export const paymentStatusSchema = z.enum(["SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED"]);
