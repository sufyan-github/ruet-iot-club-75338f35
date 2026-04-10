import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "ruetiotclub@gmail.com";
const PRESIDENT_EMAIL = "abusufyan.cse20@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const payload = await req.json();
    const { type } = payload;

    // --- Helper: send email via Resend ---
    const sendEmail = async (to: string[], subject: string, text: string, replyTo?: string) => {
      if (!resendApiKey) {
        console.log(`Email would be sent to: ${to.join(", ")}\nSubject: ${subject}\nBody: ${text}`);
        return;
      }
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: "RUET IoT Club <onboarding@resend.dev>",
          to,
          subject,
          text,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });
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
      await sendEmail([ADMIN_EMAIL, PRESIDENT_EMAIL], emailSubject, emailBody, email);
      return new Response(JSON.stringify({ success: true, message: "Contact message forwarded" }), {
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
      // Send in batches of 49 (Resend limit)
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
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
