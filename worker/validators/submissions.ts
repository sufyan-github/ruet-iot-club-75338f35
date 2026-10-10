import { z } from "zod";

const boundedText = (minimum: number, maximum: number) => z.string().trim().min(minimum).max(maximum);
const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().nullable();
const email = z.string().trim().email().max(254);
const stringList = z.array(z.string().trim().min(1).max(120)).max(30).default([]);

const submitterSchema = z.object({
  name: boundedText(2, 100),
  email,
  phone: optionalText(32),
  institution: optionalText(160),
  department: optionalText(160),
});

const protectedPublicFields = {
  turnstileToken: z.string().trim().min(1).max(2048),
  website: z.string().max(0).optional().default(""),
};

export const contactSubmissionSchema = z.object({
  ...protectedPublicFields,
  submitter: submitterSchema.pick({ name: true, email: true }),
  subject: boundedText(3, 160),
  message: boundedText(10, 5000),
}).strict();

export const projectSubmissionSchema = z.object({
  ...protectedPublicFields,
  submitter: submitterSchema,
  title: boundedText(3, 180),
  summary: boundedText(20, 1200),
  category: boundedText(2, 100),
  proposedStatus: z.enum(["PLANNED", "PROTOTYPE", "ONGOING"]).default("PLANNED"),
  proposedDuration: optionalText(100),
  problemStatement: boundedText(20, 5000),
  proposedSolution: boundedText(20, 5000),
  objectives: boundedText(10, 5000),
  expectedOutcomes: boundedText(10, 5000),
  targetBeneficiaries: optionalText(2000),
  innovation: optionalText(3000),
  technologies: z.object({
    iot: stringList,
    hardware: stringList,
    sensors: stringList,
    microcontrollers: stringList,
    software: stringList,
    aiMl: stringList,
    communications: stringList,
    cloudPlatforms: stringList,
  }).default({}),
  team: z.object({
    type: z.enum(["INDIVIDUAL", "TEAM"]),
    leader: optionalText(100),
    members: z.array(z.object({ name: boundedText(2, 100), email: email.optional(), role: optionalText(100) })).max(20).default([]),
  }),
  resources: z.object({
    equipment: optionalText(3000),
    estimatedBudget: optionalText(120),
    mentorship: optionalText(1000),
    laboratory: optionalText(1000),
  }).default({}),
  collaboration: z.object({
    wanted: z.boolean(),
    requiredExpertise: optionalText(2000),
    collaboratorCount: z.number().int().min(1).max(100).optional().nullable(),
    type: optionalText(160),
  }),
}).strict();

export const researchSubmissionSchema = z.object({
  ...protectedPublicFields,
  submitter: submitterSchema,
  title: boundedText(3, 180),
  abstract: boundedText(50, 5000),
  researchArea: boundedText(2, 160),
  keywords: z.array(boundedText(2, 80)).min(1).max(20),
  problemStatement: boundedText(20, 5000),
  objectives: boundedText(10, 5000),
  researchQuestions: optionalText(5000),
  methodology: boundedText(20, 8000),
  expectedContribution: boundedText(10, 5000),
  expectedOutcome: boundedText(10, 5000),
  technical: z.object({
    datasets: optionalText(3000),
    hardware: optionalText(3000),
    software: optionalText(3000),
    iotComponents: optionalText(3000),
    aiMlComponents: optionalText(3000),
    experimentalSetup: optionalText(5000),
  }).default({}),
  team: z.object({
    principalInvestigator: boundedText(2, 100),
    members: z.array(z.object({ name: boundedText(2, 100), affiliation: optionalText(160) })).max(30).default([]),
    supervisor: optionalText(160),
  }),
  funding: z.object({
    estimatedBudget: optionalText(120),
    required: z.boolean(),
    source: optionalText(200),
    resources: optionalText(3000),
  }),
}).strict();

export const submissionVerificationSchema = z.object({
  token: z.string().trim().min(32).max(512),
}).strict();

export const alumniSubmissionSchema = z.object({
  ...protectedPublicFields,
  submitter: submitterSchema,
  studentId: optionalText(80),
  batch: boundedText(1, 40),
  graduationYear: z.number().int().min(1964).max(2100),
  formerClubPosition: optionalText(160),
  executiveYear: optionalText(40),
  membershipYear: optionalText(40),
  linkedin: optionalText(500),
  github: optionalText(500),
  portfolio: optionalText(500),
  professional: z.object({ organization: optionalText(200), designation: optionalText(160), industry: optionalText(160), country: optionalText(100), city: optionalText(100), website: optionalText(500) }),
  clubJourney: z.object({ yearJoined: optionalText(40), role: optionalText(160), majorContributions: boundedText(20, 5000), memorableActivities: optionalText(5000) }),
  publicDisplayConsent: z.literal(true),
}).strict();

export const collaborationSubmissionSchema = z.object({
  ...protectedPublicFields,
  submitter: submitterSchema,
  organization: boundedText(2, 200),
  organizationType: optionalText(120),
  country: optionalText(100),
  city: optionalText(100),
  organizationWebsite: optionalText(500),
  logoUrl: optionalText(500),
  collaborationType: z.enum(["RESEARCH", "PROJECT", "INDUSTRY", "ACADEMIC", "WORKSHOP_TRAINING", "SPONSORSHIP", "TECHNOLOGY_PARTNERSHIP", "COMMUNITY_INITIATIVE", "MENTORSHIP", "OTHER"]),
  proposalTitle: boundedText(3, 180),
  description: boundedText(30, 8000),
  requesterContribution: boundedText(10, 5000),
  clubContribution: boundedText(10, 5000),
  partnershipInterest: optionalText(2000),
  additionalMessage: optionalText(5000),
  timeline: boundedText(2, 500),
}).strict();

export const submissionTrackingSchema = z.object({
  reference: z.string().trim().min(12).max(40),
  token: z.string().trim().min(32).max(512),
}).strict();

export const adminSubmissionQuerySchema = z.object({
  type: z.enum(["CONTACT", "PROJECT", "RESEARCH", "COLLABORATION", "ALUMNI"]).optional(),
  status: z.enum([
    "EMAIL_VERIFICATION", "SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION",
    "REVISION_REQUESTED", "APPROVED", "REJECTED", "PUBLISHED", "ONGOING",
    "COMPLETED", "HIDDEN", "ARCHIVED",
  ]).optional(),
  search: z.string().trim().max(160).default(""),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});

export const adminSubmissionUpdateSchema = z.object({
  status: z.enum([
    "UNDER_REVIEW", "NEEDS_INFORMATION", "REVISION_REQUESTED", "APPROVED", "REJECTED",
    "PUBLISHED", "ONGOING", "COMPLETED", "HIDDEN", "ARCHIVED",
  ]),
  publicResponse: optionalText(5000),
  internalNote: optionalText(5000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedReviewerId: z.string().uuid().optional().nullable(),
  reason: boundedText(3, 1000),
}).strict();

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
export type ProjectSubmission = z.infer<typeof projectSubmissionSchema>;
export type ResearchSubmission = z.infer<typeof researchSubmissionSchema>;
export type AlumniSubmission = z.infer<typeof alumniSubmissionSchema>;
export type CollaborationSubmission = z.infer<typeof collaborationSubmissionSchema>;
