import { z } from "zod";

export const timeCommitments = ["2-4 hours/week", "5-8 hours/week", "9-12 hours/week", "12+ hours/week"] as const;

const phone = z.string().trim().min(7, "Enter a valid phone number.").max(30).regex(/^\+?[0-9 ()-]+$/, "Enter a valid phone number.");
const list = z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one item.").max(20);
const optionalUrl = z.union([z.literal(""), z.string().trim().url("Enter a complete URL including https://").max(500)]).optional();
const paymentEvidence = z.object({
  paymentMethod: z.enum(["BKASH", "NAGAD"]),
  payerPhone: z.string().trim().regex(/^(?:\+?88)?01[3-9][0-9]{8}$/, "Enter the Bangladesh mobile number used for payment."),
  transactionReference: z.string().trim().min(6).max(64).regex(/^[A-Za-z0-9._-]+$/, "Enter a valid transaction ID."),
});

export const membershipClientSchema = z.object({
  membershipTypeKey: z.string().min(2),
  fullName: z.string().trim().min(2).max(100),
  phone,
  studentId: z.string().trim().min(3).max(50),
  department: z.string().trim().min(2).max(100),
  batch: z.string().trim().min(2).max(30),
  academicSession: z.string().trim().max(30).optional(),
  skills: list,
  interests: list,
  experience: z.string().trim().max(2000).optional(),
  motivation: z.string().trim().min(20, "Please provide at least 20 characters.").max(3000),
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  timeCommitment: z.enum(timeCommitments),
  declarationAccepted: z.literal(true, { errorMap: () => ({ message: "Accept the declaration before submitting." }) }),
  payment: paymentEvidence.optional(),
});

export const volunteerClientSchema = z.object({
  volunteerProgramKey: z.string().min(2),
  fullName: z.string().trim().min(2).max(100),
  phone,
  organization: z.string().trim().max(150).optional(),
  department: z.string().trim().max(100).optional(),
  batch: z.string().trim().max(30).optional(),
  skills: list,
  interests: list,
  experience: z.string().trim().max(2000).optional(),
  motivation: z.string().trim().min(20, "Please provide at least 20 characters.").max(3000),
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  timeCommitment: z.enum(timeCommitments),
  declarationAccepted: z.literal(true, { errorMap: () => ({ message: "Accept the declaration before submitting." }) }),
});

export function commaList(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function firstValidationMessage(result: z.SafeParseError<unknown>): string {
  return result.error.issues[0]?.message ?? "Please correct the application fields.";
}
