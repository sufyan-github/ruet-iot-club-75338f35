export interface OverviewData {
  metrics: Record<string, number>;
  attention: Array<{ key: string; label: string; count: number; section: string }>;
  analytics: Record<string, Array<{ month: string; status: string; count: number }>>;
  recentActivity: Array<{ id: string; action: string; entityType: string; entityId: string | null; reason: string | null; requestId: string; createdAt: string; actorName: string }>;
  system: { users: number; activeSessions: number; failedEmails: number } | null;
}

export interface AdminSubmission {
  id: string; source?: string; referenceCode: string; type: string; title: string; summary: string; status: string; priority?: string;
  submitter: { name: string; email: string; phone: string | null; institution: string | null; department: string | null };
  payload: Record<string, unknown>; publicResponse: string | null; internalNotes: string | null;
  assignedReviewerId: string | null; createdAt: string; updatedAt: string;
  events?: Array<Record<string, unknown>>;
  attachments?: Array<{ id: string; originalName: string; contentType: string; byteSize: number; createdAt: string }>;
}

export interface DomainApplication {
  applicationId: string; status: string; fullName: string; email: string; phone: string;
  studentId?: string; organization?: string; department?: string; batch?: string;
  membershipTypeName?: string; volunteerProgramName?: string; paymentRequired?: number;
  feeMinor?: number | null; currency?: string; latestPaymentStatus?: string | null; submittedAt: string | null;
}

export interface PaymentEvidence {
  paymentId: string; applicationId: string; applicantName: string; applicantEmail: string;
  expectedAmountMinor: number; currency: string; paymentMethod: string; payerPhone: string; transactionReference: string;
  status: string; submittedAt: string;
}

export interface WebsiteContentItem extends Record<string, unknown> { id: string; status: string; sort_order: number; created_at?: string; updated_at?: string; }
export interface UserRecord { id: string; email: string; displayName: string; status: string; createdAt: string; archivedAt: string | null; }
export interface Role { id: string; key: string; name: string; description: string; system: boolean; archivedAt: string | null; permissions: string[]; }
export interface Permission { id: string; key: string; category: string; description: string; }
export interface Assignment { id: string; primary_email: string; display_name: string; role_key: string; role_name: string; grant_reason: string; granted_at: string; expires_at: string | null; revoked_at: string | null; }
export interface AuditEvent { id: string; actor_type: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; reason: string | null; request_id: string; created_at: string; }
export interface EmailLog { id: string; template: string; recipientEmail: string; status: string; attempts: number; nextAttemptAt: string; lastError: string | null; providerMessageId: string | null; sentAt: string | null; createdAt: string; }
export interface UserNotification { id: string; type: string; title: string; message: string; actionUrl: string | null; readAt: string | null; createdAt: string; }
export interface MediaObject { objectKey: string; originalName: string; contentType: string; byteSize: number; createdAt: string; uploadedBy: string; }
