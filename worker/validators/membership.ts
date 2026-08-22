import { z } from "zod";
import { paymentSubmissionSchema } from "./workflow";

const typeKey = z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,63}$/u);
const shortText = z.string().trim().min(2).max(100);
const phone = z.string().trim().min(7).max(30).regex(/^\+?[0-9 ()-]+$/u, "Enter a valid phone number.");
const list = z
  .array(z.string().trim().min(1).max(60))
  .max(20)
  .transform((items) => [...new Set(items)]);
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((value) => value.startsWith("https://") || value.startsWith("http://"), "Use an HTTP or HTTPS URL.")
  .optional();
const timeCommitment = z.enum(["2-4 hours/week", "5-8 hours/week", "9-12 hours/week", "12+ hours/week"]);

const membershipFields = {
  membershipTypeKey: typeKey,
  fullName: shortText,
  phone,
  studentId: z.string().trim().min(3).max(50),
  department: shortText,
  batch: z.string().trim().min(2).max(30),
  academicSession: z.string().trim().min(2).max(30).optional(),
  gender: z.enum(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).optional(),
  address: z.string().trim().max(500).optional(),
  skills: list,
  interests: list,
  experience: z.string().trim().max(2000).optional(),
  motivation: z.string().trim().min(20).max(3000),
  portfolioUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  timeCommitment,
  declarationAccepted: z.literal(true),
};

const volunteerFields = {
  volunteerProgramKey: typeKey,
  fullName: shortText,
  phone,
  organization: z.string().trim().max(150).optional(),
  department: z.string().trim().max(100).optional(),
  batch: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
  skills: list,
  interests: list,
  experience: z.string().trim().max(2000).optional(),
  motivation: z.string().trim().min(20).max(3000),
  portfolioUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  timeCommitment,
  declarationAccepted: z.literal(true),
};

export const membershipDraftSchema = z.object({
  membershipTypeKey: membershipFields.membershipTypeKey,
  fullName: membershipFields.fullName.optional(),
  phone: membershipFields.phone.optional(),
  studentId: membershipFields.studentId.optional(),
  department: membershipFields.department.optional(),
  batch: membershipFields.batch.optional(),
  academicSession: membershipFields.academicSession,
  gender: membershipFields.gender,
  address: membershipFields.address,
  skills: membershipFields.skills.optional(),
  interests: membershipFields.interests.optional(),
  experience: membershipFields.experience,
  motivation: z.string().trim().max(3000).optional(),
  portfolioUrl: membershipFields.portfolioUrl,
  githubUrl: membershipFields.githubUrl,
  linkedinUrl: membershipFields.linkedinUrl,
  timeCommitment: membershipFields.timeCommitment.optional(),
  declarationAccepted: z.boolean().optional(),
}).strict();

export const membershipApplicationSchema = z.object({
  ...membershipFields,
  payment: paymentSubmissionSchema.optional(),
}).strict();

export const volunteerDraftSchema = z.object({
  volunteerProgramKey: volunteerFields.volunteerProgramKey,
  fullName: volunteerFields.fullName.optional(),
  phone: volunteerFields.phone.optional(),
  organization: volunteerFields.organization,
  department: volunteerFields.department,
  batch: volunteerFields.batch,
  address: volunteerFields.address,
  skills: volunteerFields.skills.optional(),
  interests: volunteerFields.interests.optional(),
  experience: volunteerFields.experience,
  motivation: z.string().trim().max(3000).optional(),
  portfolioUrl: volunteerFields.portfolioUrl,
  githubUrl: volunteerFields.githubUrl,
  linkedinUrl: volunteerFields.linkedinUrl,
  timeCommitment: volunteerFields.timeCommitment.optional(),
  declarationAccepted: z.boolean().optional(),
}).strict();

export const volunteerApplicationSchema = z.object(volunteerFields).strict();
export const cancellationSchema = z.object({ reason: z.string().trim().min(10).max(1000) }).strict();
export const closureRequestSchema = z.object({ reason: z.string().trim().min(10).max(1000) }).strict();
