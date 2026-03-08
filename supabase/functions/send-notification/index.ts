import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, status, type } = await req.json();

    if (!user_id || !status) {
      return new Response(JSON.stringify({ error: "Missing user_id or status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email from auth
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

    if (type === "membership") {
      if (status === "approved") {
        subject = "🎉 RUET IoT Club - Membership Approved!";
        body = `Dear ${fullName},\n\nCongratulations! Your membership application to the RUET IoT Club has been approved.\n\nYou are now an official member of our community. Log in to your dashboard to explore projects, events, and connect with fellow members.\n\nWelcome aboard!\n\nBest regards,\nRUET IoT Club Team`;
      } else if (status === "rejected") {
        subject = "RUET IoT Club - Membership Application Update";
        body = `Dear ${fullName},\n\nThank you for your interest in the RUET IoT Club.\n\nAfter reviewing your application, we regret to inform you that your membership application was not approved at this time. You are welcome to reapply in the future.\n\nIf you have questions, please contact us.\n\nBest regards,\nRUET IoT Club Team`;
      }
    }

    // Store the notification in a simple log (we send via the response for now)
    // In production, integrate with an email service like Resend
    console.log(`Notification email would be sent to: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);

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
