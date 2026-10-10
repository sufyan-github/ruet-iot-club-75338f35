import { z } from "zod";

const reason = z.string().trim().min(3).max(1000);
const permissionKey = z.string().trim().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/u).max(100);
const roleKey = z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,63}$/u);

export const bootstrapAdminSchema = z.object({
  email: z.string().trim().email().max(254),
  reason,
});

const fixedAdminEmail = z.enum(["ruetiotclub@gmail.com", "abusufyan.cse20@gmail.com"]);

export const provisionFixedSuperAdminsSchema = z.object({
  accounts: z.array(z.object({
    email: fixedAdminEmail,
    displayName: z.string().trim().min(2).max(100),
    password: z.string().min(12).max(128),
  })).length(2).superRefine((accounts, context) => {
    const emails = new Set(accounts.map((account) => account.email));
    if (emails.size !== 2) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Both fixed administrator emails are required." });
    }
  }),
  reason,
});

export const createRoleSchema = z.object({
  key: roleKey,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(500),
  permissionKeys: z.array(permissionKey).min(1).max(100).transform((values) => [...new Set(values)]),
  reason,
});

export const updateRolePermissionsSchema = z.object({
  permissionKeys: z.array(permissionKey).min(1).max(100).transform((values) => [...new Set(values)]),
  reason,
});

export const archiveRoleSchema = z.object({ reason });

export const grantRoleSchema = z.object({
  userEmail: z.string().trim().email().max(254),
  roleKey,
  reason,
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

export const revokeRoleSchema = z.object({ reason });

export const updateUserStatusSchema = z.object({
  status: z.enum(["EMAIL_VERIFIED", "SUSPENDED"]),
  reason,
});

export const archiveUserSchema = z.object({
  confirmationEmail: z.string().trim().email().max(254),
  reason,
});
