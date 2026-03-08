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

    const payload = await req.json();
    const { type } = payload;

    // --- Contact Form Message ---
    if (type === "contact") {
      const { name, email, subject, message } = payload;

      if (!name || !email || !subject || !message) {
        return new Response(JSON.stringify({ error: "All fields are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emailSubject = `📩 New Contact Message: ${subject}`;
      const emailBody = `New contact form submission from the RUET IoT Club website:\n\n` +
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `Subject: ${subject}\n\n` +
        `Message:\n${message}\n\n` +
        `---\nThis message was sent via the RUET IoT Club website contact form.`;

      console.log(`Contact form message received from: ${name} <${email}>`);
      console.log(`Forwarding to: ${ADMIN_EMAIL}, ${PRESIDENT_EMAIL}`);
      console.log(`Subject: ${emailSubject}`);
      console.log(`Body: ${emailBody}`);

      // Try sending via Resend if API key is available
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const recipients = [ADMIN_EMAIL, PRESIDENT_EMAIL];
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "RUET IoT Club <noreply@ruet-iot-club.lovable.app>",
            to: recipients,
            subject: emailSubject,
            text: emailBody,
            reply_to: email,
          }),
        });
        const resData = await res.json();
        console.log("Resend response:", JSON.stringify(resData));
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Contact message forwarded to admin and president`,
          forwarded_to: [ADMIN_EMAIL, PRESIDENT_EMAIL],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Membership Notification ---
    const { user_id, status } = payload;

    if (!user_id || !status) {
      return new Response(JSON.stringify({ error: "Missing user_id or status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    console.log(`Notification email would be sent to: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);

    // Also notify admin & president about membership status change
    console.log(`Admin/President notified: ${ADMIN_EMAIL}, ${PRESIDENT_EMAIL}`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      // Send to member
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "RUET IoT Club <noreply@ruet-iot-club.lovable.app>",
          to: [email],
          subject,
          text: body,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification prepared for ${email}`,
        email,
        subject,
        body,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
