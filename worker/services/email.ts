import { decryptJson, encryptJson } from "../auth/crypto";

export type EmailTemplate =
  | "VERIFY_EMAIL"
  | "RESET_PASSWORD"
  | "VERIFY_EMAIL_CHANGE"
  | "ACCOUNT_DELETION_REQUESTED"
  | "CONTACT_AUTHORITY"
  | "CONTACT_RECEIVED"
  | "SUBMISSION_VERIFY"
  | "SUBMISSION_AUTHORITY"
  | "SUBMISSION_RECEIVED"
  | "SUBMISSION_STATUS";

interface EmailPayload {
  subject: string;
  html: string;
  text: string;
}

export interface EmailQueueRecord {
  id: string;
  userId: string | null;
  template: EmailTemplate;
  recipientEmail: string;
  encryptedPayload: string;
  payloadIv: string;
}

interface OutboxRow {
  id: string;
  recipient_email: string;
  encrypted_payload: string;
  payload_iv: string;
  attempts: number;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function actionEmail(options: { title: string; greeting: string; explanation: string; actionUrl: string; action: string }): EmailPayload {
  const safeTitle = escapeHtml(options.title);
  const safeGreeting = escapeHtml(options.greeting);
  const safeExplanation = escapeHtml(options.explanation);
  const safeUrl = escapeHtml(options.actionUrl);
  const safeAction = escapeHtml(options.action);
  return {
    subject: options.title,
    html: `<main style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#14213d"><h1>${safeTitle}</h1><p>${safeGreeting}</p><p>${safeExplanation}</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px">${safeAction}</a></p><p style="font-size:13px;color:#64748b">If the button does not work, copy this link: ${safeUrl}</p><p style="font-size:13px;color:#64748b">If you did not request this, you can ignore this message.</p></main>`,
    text: `${options.title}\n\n${options.greeting}\n\n${options.explanation}\n\n${options.action}: ${options.actionUrl}\n\nIf you did not request this, you can ignore this message.`,
  };
}

export function verificationEmail(siteUrl: string, displayName: string, token: string): EmailPayload {
  return actionEmail({
    title: "Verify your RUET IoT Club account",
    greeting: `Hello ${displayName},`,
    explanation: "Confirm your email address before signing in. This link expires in 24 hours.",
    actionUrl: `${siteUrl}/verify-email?token=${encodeURIComponent(token)}`,
    action: "Verify email",
  });
}

export function passwordResetEmail(siteUrl: string, displayName: string, token: string): EmailPayload {
  return actionEmail({
    title: "Reset your RUET IoT Club password",
    greeting: `Hello ${displayName},`,
    explanation: "Use this secure link to choose a new password. This link expires in one hour.",
    actionUrl: `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`,
    action: "Reset password",
  });
}

export function emailChangeEmail(siteUrl: string, displayName: string, token: string): EmailPayload {
  return actionEmail({
    title: "Confirm your new email address",
    greeting: `Hello ${displayName},`,
    explanation: "Confirm this address to finish changing the email on your account. This link expires in one hour.",
    actionUrl: `${siteUrl}/verify-email-change?token=${encodeURIComponent(token)}`,
    action: "Confirm new email",
  });
}

export function accountDeletionEmail(displayName: string): EmailPayload {
  return {
    subject: "RUET IoT Club account deletion request received",
    html: `<main style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#14213d"><h1>Deletion request received</h1><p>Hello ${escapeHtml(displayName)},</p><p>Your account deletion request has been recorded for review. Your account has been signed out on every device.</p><p>If you did not make this request, contact the club administrators immediately.</p></main>`,
    text: `Deletion request received\n\nHello ${displayName},\n\nYour account deletion request has been recorded for review. Your account has been signed out on every device.\n\nIf you did not make this request, contact the club administrators immediately.`,
  };
}

export function submissionVerificationEmail(options: {
  siteUrl: string;
  submitterName: string;
  submissionType: string;
  referenceCode: string;
  token: string;
}): EmailPayload {
  return actionEmail({
    title: `Verify your ${options.submissionType.toLowerCase()} submission email`,
    greeting: `Hello ${options.submitterName},`,
    explanation: `Confirm your email to place submission ${options.referenceCode} into the RUET IoT Club review queue. This link expires in 24 hours.`,
    actionUrl: `${options.siteUrl}/verify-submission?token=${encodeURIComponent(options.token)}`,
    action: "Verify submission email",
  });
}

export function opportunityApplicationVerificationEmail(options: {
  siteUrl: string;
  applicantName: string;
  referenceCode: string;
  token: string;
}): EmailPayload {
  return actionEmail({
    title: "Verify your RUET IoT Club opportunity application",
    greeting: `Hello ${options.applicantName},`,
    explanation: `Confirm your email to place application ${options.referenceCode} into the review queue. This link expires when it is used.`,
    actionUrl: `${options.siteUrl}/verify-opportunity-application?token=${encodeURIComponent(options.token)}`,
    action: "Verify application",
  });
}

export function submissionReceiptEmail(options: {
  siteUrl: string;
  submitterName: string;
  submissionType: string;
  referenceCode: string;
  title: string;
  trackingToken: string;
  verificationRequired: boolean;
}): EmailPayload {
  const safeName = escapeHtml(options.submitterName);
  const safeType = escapeHtml(options.submissionType.toLowerCase());
  const safeReference = escapeHtml(options.referenceCode);
  const safeTitle = escapeHtml(options.title);
  const trackingUrl = `${options.siteUrl}/track-submission?reference=${encodeURIComponent(options.referenceCode)}&token=${encodeURIComponent(options.trackingToken)}`;
  const safeTrackingUrl = escapeHtml(trackingUrl);
  const nextStep = options.verificationRequired
    ? "Verify your email using the separate verification message before review begins."
    : "The submission is now in the review queue.";
  return {
    subject: `Your ${options.submissionType} submission has been received — RUET IoT Club`,
    html: `<main style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;color:#14213d"><h1>Submission received</h1><p>Hello ${safeName},</p><p>We received your ${safeType} submission.</p><dl><dt><strong>Reference</strong></dt><dd>${safeReference}</dd><dt><strong>Title</strong></dt><dd>${safeTitle}</dd></dl><p>${escapeHtml(nextStep)}</p><p><a href="${safeTrackingUrl}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px">Track submission</a></p><p style="font-size:13px;color:#64748b">Keep the reference and tracking link private.</p></main>`,
    text: `Submission received\n\nHello ${options.submitterName},\n\nReference: ${options.referenceCode}\nTitle: ${options.title}\n\n${nextStep}\n\nTrack submission: ${trackingUrl}\n\nKeep the reference and tracking link private.`,
  };
}

export function authoritySubmissionEmail(options: {
  siteUrl: string;
  submissionId: string;
  submissionType: string;
  referenceCode: string;
  submitterName: string;
  submitterEmail: string;
  title: string;
  summary: string;
  submittedAt: string;
}): EmailPayload {
  const adminUrl = `${options.siteUrl}/admin?submission=${encodeURIComponent(options.submissionId)}`;
  return {
    subject: `New ${options.submissionType} submission — ${options.title}`,
    html: `<main style="font-family:system-ui,sans-serif;max-width:640px;margin:auto;color:#14213d"><h1>New ${escapeHtml(options.submissionType.toLowerCase())} submission</h1><dl><dt><strong>Reference</strong></dt><dd>${escapeHtml(options.referenceCode)}</dd><dt><strong>Submitter</strong></dt><dd>${escapeHtml(options.submitterName)} (${escapeHtml(options.submitterEmail)})</dd><dt><strong>Title</strong></dt><dd>${escapeHtml(options.title)}</dd><dt><strong>Summary</strong></dt><dd>${escapeHtml(options.summary)}</dd><dt><strong>Submitted</strong></dt><dd>${escapeHtml(options.submittedAt)}</dd><dt><strong>Source</strong></dt><dd>RUET IoT Club website</dd></dl><p><a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px">Open in administration</a></p></main>`,
    text: `New ${options.submissionType} submission\n\nReference: ${options.referenceCode}\nSubmitter: ${options.submitterName} (${options.submitterEmail})\nTitle: ${options.title}\nSummary: ${options.summary}\nSubmitted: ${options.submittedAt}\nSource: RUET IoT Club website\n\nOpen: ${adminUrl}`,
  };
}

export function submissionStatusEmail(options: {
  siteUrl: string;
  submitterName: string;
  submissionType: string;
  referenceCode: string;
  status: string;
  publicResponse?: string | null;
}): EmailPayload {
  const explanation = options.publicResponse
    ? `Status: ${options.status}. Response: ${options.publicResponse}`
    : `The status is now ${options.status}.`;
  return actionEmail({
    title: `Update for submission ${options.referenceCode}`,
    greeting: `Hello ${options.submitterName},`,
    explanation,
    actionUrl: `${options.siteUrl}/track-submission?reference=${encodeURIComponent(options.referenceCode)}`,
    action: "View tracking page",
  });
}

export async function createEmailQueueRecord(options: {
  secret: string;
  userId: string | null;
  template: EmailTemplate;
  recipientEmail: string;
  payload: EmailPayload;
}): Promise<EmailQueueRecord> {
  const encrypted = await encryptJson(options.payload, options.secret);
  return {
    id: crypto.randomUUID(),
    userId: options.userId,
    template: options.template,
    recipientEmail: options.recipientEmail,
    encryptedPayload: encrypted.ciphertext,
    payloadIv: encrypted.iv,
  };
}

export function insertEmailStatement(db: D1Database, record: EmailQueueRecord): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO email_outbox
        (id, user_id, template, recipient_email, encrypted_payload, payload_iv)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.id,
      record.userId,
      record.template,
      record.recipientEmail,
      record.encryptedPayload,
      record.payloadIv,
    );
}

export async function dispatchPendingEmails(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_rate_limits WHERE expires_at < ?").bind(Date.now()),
    env.DB.prepare("DELETE FROM command_idempotency WHERE expires_at < ?").bind(new Date().toISOString()),
    env.DB.prepare(
      `UPDATE email_outbox SET status = 'FAILED', last_error = 'Delivery lease expired',
         next_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE status = 'SENDING' AND updated_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 minutes')`,
    ),
  ]);
  const { results } = await env.DB.prepare(
    `SELECT id, recipient_email, encrypted_payload, payload_iv, attempts
     FROM email_outbox
     WHERE status IN ('PENDING', 'FAILED') AND next_attempt_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     ORDER BY created_at ASC
     LIMIT 10`,
  ).all<OutboxRow>();

  for (const row of results) {
    const claim = await env.DB.prepare(
      `UPDATE email_outbox SET status = 'SENDING', attempts = attempts + 1,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND status IN ('PENDING', 'FAILED')`,
    )
      .bind(row.id)
      .run();
    if (claim.meta.changes !== 1) continue;

    try {
      const payload = await decryptJson<EmailPayload>(row.encrypted_payload, row.payload_iv, env.SESSION_SECRET);
      const result = await env.EMAIL.send({
        to: row.recipient_email,
        from: { email: env.EMAIL_FROM, name: "RUET IoT Club" },
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      await env.DB.prepare(
        `UPDATE email_outbox
         SET status = 'SENT', provider_message_id = ?, sent_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), last_error = NULL
         WHERE id = ?`,
      )
        .bind(result.messageId, row.id)
        .run();
    } catch (error) {
      const attempt = row.attempts + 1;
      const retryMinutes = Math.min(2 ** attempt, 24 * 60);
      const nextAttemptAt = new Date(Date.now() + retryMinutes * 60_000).toISOString();
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown email delivery error";
      await env.DB.prepare(
        `UPDATE email_outbox SET status = 'FAILED', next_attempt_at = ?, last_error = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      )
        .bind(nextAttemptAt, message, row.id)
        .run();
      console.error(JSON.stringify({ message: "email.delivery_failed", outboxId: row.id, attempt, error: message }));
    }
  }
}
