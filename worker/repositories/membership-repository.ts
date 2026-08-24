import { AppError } from "../lib/app-error";

export interface ApplicationLifecycleRow {
  id: string;
  status: string;
  revision: number;
}

export interface DomainRecordRow {
  id: string;
  status: string;
}

export interface MembershipTypeRow {
  id: string;
  type_key: string;
  name: string;
  description: string;
  term_months: number;
  payment_required: number;
  fee_minor: number | null;
  currency: string;
}

export interface VolunteerProgramRow {
  id: string;
  program_key: string;
  name: string;
  description: string;
  term_months: number;
}

export async function membershipTypeByKey(db: D1Database, key: string): Promise<MembershipTypeRow> {
  const row = await db
    .prepare(
      `SELECT id, type_key, name, description, term_months, payment_required, fee_minor, currency
       FROM membership_types
       WHERE type_key = ? AND application_enabled = 1 AND deleted_at IS NULL`,
    )
    .bind(key)
    .first<MembershipTypeRow>();
  if (!row) {
    throw new AppError({
      code: "MEMBERSHIP_TYPE_UNAVAILABLE",
      message: "The selected membership type is not accepting applications.",
      status: 422,
    });
  }
  return row;
}

export async function volunteerProgramByKey(db: D1Database, key: string): Promise<VolunteerProgramRow> {
  const row = await db
    .prepare(
      `SELECT id, program_key, name, description, term_months
       FROM volunteer_programs
       WHERE program_key = ? AND application_enabled = 1 AND deleted_at IS NULL`,
    )
    .bind(key)
    .first<VolunteerProgramRow>();
  if (!row) {
    throw new AppError({
      code: "VOLUNTEER_PROGRAM_UNAVAILABLE",
      message: "The selected volunteer program is not accepting applications.",
      status: 422,
    });
  }
  return row;
}

export function openMembershipApplication(db: D1Database, userId: string): Promise<ApplicationLifecycleRow | null> {
  return db
    .prepare(
      `SELECT id, status, revision FROM membership_applications
       WHERE user_id = ?
         AND status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION')
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(userId)
    .first<ApplicationLifecycleRow>();
}

export function openVolunteerApplication(db: D1Database, userId: string): Promise<ApplicationLifecycleRow | null> {
  return db
    .prepare(
      `SELECT id, status, revision FROM volunteer_applications
       WHERE user_id = ? AND status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW')
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(userId)
    .first<ApplicationLifecycleRow>();
}

export function currentMembership(db: D1Database, userId: string): Promise<DomainRecordRow | null> {
  return db
    .prepare("SELECT id, status FROM memberships WHERE user_id = ? AND status != 'CLOSED' ORDER BY created_at DESC LIMIT 1")
    .bind(userId)
    .first<DomainRecordRow>();
}

export function currentVolunteer(db: D1Database, userId: string): Promise<DomainRecordRow | null> {
  return db
    .prepare("SELECT id, status FROM volunteers WHERE user_id = ? AND status != 'CLOSED' ORDER BY created_at DESC LIMIT 1")
    .bind(userId)
    .first<DomainRecordRow>();
}
