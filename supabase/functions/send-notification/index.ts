import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "ruetiotclub@gmail.com";
const PRESIDENT_EMAIL = "abusufyan.cse20@gmail.com";

// Helper: Beautiful branded HTML email wrapper
const createBrandedEmailHtml = ({
  title,
  subtitle,
  bodyContent,
  ctaText,
  ctaUrl,
  footerNote,
}: {
  title: string;
  subtitle?: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #050b14; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #0a1626; border: 1px solid rgba(45, 226, 201, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, rgba(45, 226, 201, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%); border-bottom: 1px solid rgba(45, 226, 201, 0.2); text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background-color: rgba(45, 226, 201, 0.15); border: 1px solid rgba(45, 226, 201, 0.35); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #2de2c9; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">
                RUET IoT Club
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                ${title}
              </h1>
              ${subtitle ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">${subtitle}</p>` : ""}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
              ${bodyContent}

              ${ctaText && ctaUrl ? `
              <div style="margin: 28px 0; text-align: center;">
                <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #2de2c9; color: #050b14; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 10px; box-shadow: 0 4px 20px rgba(45, 226, 201, 0.4);">
                  ${ctaText} &rarr;
                </a>
              </div>
              <div style="padding: 12px; background-color: rgba(2, 6, 23, 0.5); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 8px; font-size: 11px; color: #64748b; word-break: break-all;">
                Direct link: <a href="${ctaUrl}" style="color: #2de2c9; text-decoration: underline;">${ctaUrl}</a>
              </div>
              ` : ""}

              ${footerNote ? `<p style="margin: 24px 0 0 0; font-size: 12px; color: #64748b; border-top: 1px solid rgba(148, 163, 184, 0.1); padding-top: 16px;">${footerNote}</p>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(2, 6, 23, 0.7); border-top: 1px solid rgba(148, 163, 184, 0.1); text-align: center; font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #94a3b8;">RUET IoT Club Executive Team</p>
              <p style="margin: 0; font-size: 11px;">Rajshahi University of Engineering & Technology, Rajshahi-6204, Bangladesh</p>
              <p style="margin: 6px 0 0 0; font-size: 11px;">
                Email: <a href="mailto:ruetiotclub@gmail.com" style="color: #2de2c9; text-decoration: none;">ruetiotclub@gmail.com</a> | Phone: +880 1580-352238
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderFrom = Deno.env.get("RESEND_FROM_EMAIL") || Deno.env.get("SENDER_EMAIL") || "RUET IoT Club <onboarding@resend.dev>";

    const payload = await req.json();
    const { type } = payload;

    // --- Helper: send email via Resend ---
    const sendEmail = async (
      to: string[],
      subject: string,
      text: string,
      replyTo?: string,
      html?: string
    ) => {
      if (!resendApiKey) {
        console.warn(`[send-notification] RESEND_API_KEY is not set. Email not sent to: ${to.join(", ")}\nSubject: ${subject}`);
        return { sent: false, reason: "NO_RESEND_KEY" };
      }
      try {
        const emailPayload: any = {
          from: senderFrom,
          to,
          subject,
          text,
        };
        if (html) emailPayload.html = html;
        if (replyTo) emailPayload.reply_to = replyTo;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify(emailPayload),
        });
        const resData = await res.json();
        if (!res.ok) {
          console.error("[send-notification] Resend API Error:", resData);
          return { sent: false, error: resData };
        }
        return { sent: true, data: resData };
      } catch (err: any) {
        console.error("[send-notification] Network/Fetch Error:", err);
        return { sent: false, error: err.message };
      }
    };

    // --- Helper: Get all approved member emails ---
    const getApprovedMemberEmails = async (): Promise<string[]> => {
      const { data } = await supabase.from("profiles").select("email").eq("status", "approved").not("email", "is", null);
      return (data || []).map((p: any) => p.email).filter(Boolean);
    };

    // --- Contact Form Message ---
    if (type === "contact") {
      const { name, email, subject, message } = payload;
      if (!name || !email || !subject || !message) {
        return new Response(JSON.stringify({ error: "All fields are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const emailSubject = `📩 New Contact Message: ${subject}`;
      const emailBody = `New contact form submission from the RUET IoT Club website:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\n---\nThis message was sent via the RUET IoT Club website contact form.`;
      const emailHtml = createBrandedEmailHtml({
        title: "New Contact Message",
        subtitle: `From ${name} (${email})`,
        bodyContent: `
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="background-color: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border-left: 3px solid #2de2c9; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">Click reply to respond directly to ${email}.</p>
        `,
      });
      await sendEmail([ADMIN_EMAIL, PRESIDENT_EMAIL], emailSubject, emailBody, email, emailHtml);
      return new Response(JSON.stringify({ success: true, message: "Contact message forwarded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Contact Reply from Admin ---
    if (type === "contact_reply") {
      const { to_email, to_name, original_subject, reply_message } = payload;
      if (!to_email || !reply_message) {
        return new Response(JSON.stringify({ error: "Missing reply fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const emailSubject = `Re: ${original_subject || "Your message"} — RUET IoT Club`;
      const emailBody = `Dear ${to_name || "User"},\n\nThank you for contacting the RUET IoT Club. Here is our reply to your message:\n\n${reply_message}\n\n---\nBest regards,\nRUET IoT Club Team\nEmail: ruetiotclub@gmail.com\nPhone: +880 1580-352238`;
      const emailHtml = createBrandedEmailHtml({
        title: `Re: ${original_subject || "Your message"}`,
        subtitle: `Message response from RUET IoT Club`,
        bodyContent: `
          <p>Dear ${to_name || "User"},</p>
          <p>Thank you for reaching out to us. Here is our reply:</p>
          <div style="background-color: rgba(45, 226, 201, 0.08); padding: 18px; border-radius: 8px; border-left: 3px solid #2de2c9; margin: 16px 0; color: #ffffff;">
            <p style="margin: 0; white-space: pre-wrap;">${reply_message}</p>
          </div>
          <p>If you have any further questions, feel free to reply to this email.</p>
        `,
      });
      await sendEmail([to_email], emailSubject, emailBody, undefined, emailHtml);
      // CC admin
      await sendEmail([ADMIN_EMAIL], `[Reply Sent] Re: ${original_subject}`, `Reply sent to ${to_name} (${to_email}):\n\n${reply_message}`);
      return new Response(JSON.stringify({ success: true, message: `Reply sent to ${to_email}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- New Event Notification ---
    if (type === "new_event") {
      const { title, date, venue } = payload;
      const memberEmails = await getApprovedMemberEmails();
      if (memberEmails.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No members to notify" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const formattedDate = new Date(date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const subject = `🎉 New Event: ${title}`;
      const body = `Dear RUET IoT Club Member,\n\nWe're excited to announce a new event!\n\n📌 Event: ${title}\n📅 Date: ${formattedDate}\n📍 Venue: ${venue || "TBA"}\n\nVisit the RUET IoT Club website to register and learn more.\n\nBest regards,\nRUET IoT Club Team`;
      for (let i = 0; i < memberEmails.length; i += 49) {
        const batch = memberEmails.slice(i, i + 49);
        await sendEmail(batch, subject, body);
      }
      return new Response(JSON.stringify({ success: true, message: `Notified ${memberEmails.length} members about new event` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- New Course Notification ---
    if (type === "new_course") {
      const { title, instructor, duration } = payload;
      const memberEmails = await getApprovedMemberEmails();
      if (memberEmails.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No members to notify" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const subject = `📚 New Course: ${title}`;
      const body = `Dear RUET IoT Club Member,\n\nA new course has been added!\n\n📖 Course: ${title}\n👨‍🏫 Instructor: ${instructor || "TBA"}\n⏱️ Duration: ${duration || "TBA"}\n\nVisit the RUET IoT Club website to enroll.\n\nBest regards,\nRUET IoT Club Team`;
      for (let i = 0; i < memberEmails.length; i += 49) {
        const batch = memberEmails.slice(i, i + 49);
        await sendEmail(batch, subject, body);
      }
      return new Response(JSON.stringify({ success: true, message: `Notified ${memberEmails.length} members about new course` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- New Announcement Notification ---
    if (type === "new_announcement") {
      const { title, message } = payload;
      const memberEmails = await getApprovedMemberEmails();
      if (memberEmails.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No members to notify" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const subject = `📢 Announcement: ${title}`;
      const body = `Dear RUET IoT Club Member,\n\n${title}\n\n${message || ""}\n\nVisit the RUET IoT Club website for more details.\n\nBest regards,\nRUET IoT Club Team`;
      for (let i = 0; i < memberEmails.length; i += 49) {
        const batch = memberEmails.slice(i, i + 49);
        await sendEmail(batch, subject, body);
      }
      return new Response(JSON.stringify({ success: true, message: `Notified ${memberEmails.length} members about announcement` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- USER MODERATOR REQUEST (Member/User requests Moderator role) ---
    if (type === "moderator_request") {
      const { name, email, department, student_id, phone, skills, reason } = payload;
      if (!name || !email) {
        return new Response(JSON.stringify({ error: "Name and email are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const subject = `🛡️ Moderator Access Request: ${name} (${email})`;
      const text = `A member has submitted an official request for Moderator Access to RUET IoT Club:\n\n` +
        `• Full Name: ${name}\n` +
        `• Email: ${email}\n` +
        `• Department: ${department || "N/A"}\n` +
        `• Student ID / Roll: ${student_id || "N/A"}\n` +
        `• Phone: ${phone || "N/A"}\n` +
        `• Key Skills: ${skills || "N/A"}\n\n` +
        `• Reason / Statement of Purpose:\n${reason || "N/A"}\n\n` +
        `To review and grant privileges, open the Admin Dashboard under 'Staff & Roles'.`;

      const html = createBrandedEmailHtml({
        title: "🛡️ New Moderator Access Request",
        subtitle: `Submitted by ${name}`,
        bodyContent: `
          <p>An official application for <strong>Club Moderator Access</strong> has been submitted on the RUET IoT Club portal:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #94a3b8;">Applicant Name:</td><td style="padding: 8px 0; font-weight: 600; color: #ffffff;">${name}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #94a3b8;">Email Address:</td><td style="padding: 8px 0; color: #2de2c9; font-family: monospace;">${email}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #94a3b8;">Department:</td><td style="padding: 8px 0; color: #ffffff;">${department || "—"}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #94a3b8;">Student ID / Roll:</td><td style="padding: 8px 0; color: #ffffff;">${student_id || "—"}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #94a3b8;">Phone:</td><td style="padding: 8px 0; color: #ffffff;">${phone || "—"}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #94a3b8;">Key Skills:</td><td style="padding: 8px 0; color: #ffffff;">${skills || "—"}</td></tr>
          </table>
          <p style="font-weight: 600; margin-top: 16px; margin-bottom: 6px; color: #ffffff;">Statement / Motivation:</p>
          <div style="background-color: rgba(255, 255, 255, 0.05); padding: 14px; border-radius: 8px; border-left: 3px solid #2de2c9; font-size: 13px; color: #cbd5e1; white-space: pre-wrap;">${reason || "No statement provided"}</div>
        `,
        ctaText: "Open Admin Dashboard & Review",
        ctaUrl: `${supabaseUrl.replace(".supabase.co", "")}/admin?tab=roles`,
        footerNote: "You can review and approve this application directly in Admin Dashboard -> Staff & Roles.",
      });

      const sendResult = await sendEmail([ADMIN_EMAIL, PRESIDENT_EMAIL], subject, text, email, html);

      return new Response(JSON.stringify({
        success: true,
        emailSent: sendResult.sent,
        details: sendResult,
        message: sendResult.sent ? "Moderator access request dispatched to club executives." : "Request saved, email notification skipped or queued.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- MODERATOR REQUEST APPROVED NOTIFICATION ---
    if (type === "moderator_request_approved") {
      const { to_email, to_name, role = "moderator" } = payload;
      if (!to_email) {
        return new Response(JSON.stringify({ error: "Missing to_email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const roleTitle = role === "admin" ? "Club Administrator" : "Club Moderator";
      const subject = `🎉 RUET IoT Club - Your ${roleTitle} Role is Approved!`;
      const text = `Dear ${to_name || "Colleague"},\n\nCongratulations! Your request to become an official ${roleTitle} for the RUET IoT Club has been approved by the club executive team.\n\nYou can now log in at https://ruetiotclub.org/auth?portal=staff to access the ${roleTitle} Operational Workspace.\n\nBest regards,\nRUET IoT Club Executive Team`;
      const html = createBrandedEmailHtml({
        title: `Welcome to the Team, ${roleTitle}!`,
        subtitle: "Your operational privileges have been activated",
        bodyContent: `
          <p>Dear ${to_name || "Colleague"},</p>
          <p>Congratulations! Your request to join the RUET IoT Club operations team as an official <strong>${roleTitle}</strong> has been approved.</p>
          <p>As a ${roleTitle}, you can now manage club events, participant registrations, innovation projects, blogs, notices, and club gallery.</p>
        `,
        ctaText: "Launch Staff Workspace",
        ctaUrl: "https://ruetiotclub.org/auth?portal=staff",
        footerNote: "Use your registered email and password to sign in via the Staff Portal.",
      });
      const sendResult = await sendEmail([to_email], subject, text, undefined, html);
      return new Response(JSON.stringify({ success: true, emailSent: sendResult.sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Staff / Moderator Invitation Notification ---
    if (type === "staff_invitation") {
      const { to_email, role = "moderator", invited_by_name = "Club Admin", invite_url } = payload;
      if (!to_email || !invite_url) {
        return new Response(JSON.stringify({ error: "Missing to_email or invite_url" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const roleTitle = role === "admin" ? "Club Administrator" : "Club Moderator";
      const subject = `🚀 Invitation to join RUET IoT Club as ${roleTitle}`;
      const text = `Dear Colleague,\n\nYou have been invited by ${invited_by_name} to join the RUET IoT Club team as an official ${roleTitle}!\n\nAs a ${roleTitle}, you will have access to our operational workspace to manage club events, participant registrations, innovation projects, blogs, notices, and club media.\n\nPlease click the secure link below to set up your account credentials and complete your onboarding profile:\n\n👉 Complete Onboarding: ${invite_url}\n\nNote: This invitation link is valid for 7 days.\n\n---\nBest regards,\nRUET IoT Club Executive Team\nRajshahi University of Engineering & Technology\nEmail: ruetiotclub@gmail.com`;

      const html = createBrandedEmailHtml({
        title: `You're Invited: ${roleTitle}`,
        subtitle: `Invited by ${invited_by_name}`,
        bodyContent: `
          <p>Dear Colleague,</p>
          <p>You have been officially invited to join the executive operations team of the <strong>RUET IoT Club</strong> as a <strong>${roleTitle}</strong>!</p>
          <p>In this role, you will have access to the staff workspace to:</p>
          <ul style="color: #94a3b8; font-size: 13px; line-height: 1.8;">
            <li>Publish and coordinate IoT workshops, seminars, and events</li>
            <li>Manage attendee lists and confirm participation</li>
            <li>Showcase club innovation projects & research papers</li>
            <li>Publish blogs, notices, and activity photo galleries</li>
          </ul>
          <p style="margin-top: 20px;">Please click below to finalize your account profile and access credentials:</p>
        `,
        ctaText: "Complete Onboarding Setup",
        ctaUrl: invite_url,
        footerNote: "This invitation link is personalized, encrypted, and valid for 7 days. If you did not expect this, please disregard.",
      });

      // 1. Send via Resend directly to invitee
      const sendResult = await sendEmail([to_email], subject, text, undefined, html);

      // 2. Also send backup copy to Admin & President so link is never lost even under Resend testing restriction
      const adminCopyResult = await sendEmail(
        [ADMIN_EMAIL, PRESIDENT_EMAIL],
        `[Staff Invite Dispatched] ${roleTitle} invite sent to ${to_email}`,
        `An official invitation has been created for ${to_email} as ${roleTitle}.\n\nDirect Onboarding Link:\n${invite_url}\n\nIf the recipient cannot find the email, you can share the link above directly via WhatsApp or Email.`,
        undefined
      );

      // 3. Fallback: Try Supabase native Auth invite
      let authInviteSent = false;
      try {
        const { error: authErr } = await supabase.auth.admin.inviteUserByEmail(to_email, {
          redirectTo: invite_url,
          data: { role, invited_by_name, invite_url },
        });
        if (!authErr) authInviteSent = true;
      } catch (authException) {
        console.warn("[send-notification] Supabase auth.admin.inviteUserByEmail notice:", authException);
      }

      return new Response(JSON.stringify({
        success: true,
        emailSent: sendResult.sent || authInviteSent,
        details: {
          resend: sendResult,
          adminCopy: adminCopyResult,
          supabaseAuthInvite: authInviteSent,
        },
        message: (sendResult.sent || authInviteSent)
          ? `Staff invitation dispatched to ${to_email}`
          : `Invitation created. Resend domain restriction may limit third-party delivery without verified domain; invite link is recorded and admin copy sent.`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Membership Notification ---
    const { user_id, status } = payload;
    if (!user_id || !status) {
      return new Response(JSON.stringify({ error: "Missing user_id or status" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = userData.user.email;
    const fullName = userData.user.user_metadata?.full_name || "Member";

    let subject = "";
    let body = "";

    if (status === "approved") {
      subject = "🎉 RUET IoT Club - Membership Approved!";
      body = `Dear ${fullName},\n\nCongratulations! Your membership application to the RUET IoT Club has been approved.\n\nYou are now an official member of our community. Log in to your dashboard to explore projects, events, and connect with fellow members.\n\nWelcome aboard!\n\nBest regards,\nRUET IoT Club Team`;
    } else if (status === "rejected") {
      subject = "RUET IoT Club - Membership Application Update";
      body = `Dear ${fullName},\n\nThank you for your interest in the RUET IoT Club.\n\nAfter reviewing your application, we regret to inform you that your membership application was not approved at this time. You are welcome to reapply in the future.\n\nIf you have questions, please contact us.\n\nBest regards,\nRUET IoT Club Team`;
    }

    await sendEmail([email], subject, body);

    return new Response(
      JSON.stringify({ success: true, message: `Notification sent to ${email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
