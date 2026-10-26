import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Lock, User, Mail, Check, AlertCircle, Sparkles, ArrowRight } from "lucide-react";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("ECE");
  const [studentId, setStudentId] = useState("");
  const [session, setSession] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg("No invitation token found in the URL. Please check your invitation email.");
      setChecking(false);
      return;
    }

    const checkToken = async () => {
      try {
        // Query from announcements table (zero-migration storage)
        const { data: annRow, error: annError } = await supabase
          .from("announcements")
          .select("*")
          .eq("title", `STAFF_INVITATION:${token}`)
          .maybeSingle();

        let parsedInvite: any = null;

        if (annRow && annRow.message) {
          try {
            parsedInvite = { id: annRow.id, ...JSON.parse(annRow.message) };
          } catch {
            parsedInvite = null;
          }
        }

        // Fallback: check staff_invitations table if it was created
        if (!parsedInvite) {
          const { data: legacyData } = await supabase
            .from("staff_invitations" as any)
            .select("*")
            .eq("token", token)
            .maybeSingle();
          if (legacyData) parsedInvite = legacyData;
        }

        if (!parsedInvite) {
          setErrorMsg("Invalid or expired invitation token. Please request a new invite from the club administrator.");
        } else if (parsedInvite.status === "accepted") {
          setErrorMsg("This invitation has already been accepted. You can log in directly to your staff workspace.");
        } else if (new Date(parsedInvite.expires_at) < new Date()) {
          setErrorMsg("This invitation has expired (valid for 7 days). Please ask the administrator to re-invite you.");
        } else {
          setInvitation(parsedInvite);
        }
      } catch (err: any) {
        setErrorMsg("Failed to verify invitation. Please check your connection.");
      }
      setChecking(false);
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Sign up Auth User
      let userId = "";
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) {
        // If user already exists, sign in instead
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });

        if (signInError) {
          toast.error("Authentication error: " + signInError.message);
          setSubmitting(false);
          return;
        }
        userId = signInData.user.id;
      } else if (signUpData?.user) {
        userId = signUpData.user.id;
      }

      if (!userId) {
        // Fallback get session user
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || "";
      }

      if (!userId) {
        toast.error("Failed to establish user account. Please try again.");
        setSubmitting(false);
        return;
      }

      // 2. Accept invitation in announcements table
      try {
        const updatedInvite = {
          ...invitation,
          status: "accepted",
          user_id: userId,
          claimed_name: fullName,
          accepted_at: new Date().toISOString(),
        };

        if (invitation.id) {
          await supabase
            .from("announcements")
            .update({ message: JSON.stringify(updatedInvite) })
            .eq("id", invitation.id);
        } else {
          await supabase
            .from("announcements")
            .update({ message: JSON.stringify(updatedInvite) })
            .eq("title", `STAFF_INVITATION:${token}`);
        }
      } catch { /* silent fallback */ }

      // 3. Try to assign role via SECURITY DEFINER RPC first (bypasses RLS)
      try {
        await (supabase.rpc as any)("accept_staff_invitation", {
          _token: token,
          _user_id: userId,
        });
      } catch (rpcErr) {
        console.warn("accept_staff_invitation RPC notice:", rpcErr);
      }

      try {
        await supabase.from("user_roles").upsert({
          user_id: userId,
          role: invitation.role as any,
        });
      } catch { /* will auto-sync when admin opens dashboard */ }

      // 4. Upsert Profile with full details
      await supabase.from("profiles").upsert({
        user_id: userId,
        full_name: fullName,
        email: invitation.email,
        department,
        student_id: studentId || null,
        session: session || null,
        phone: phone || null,
        skills: skills || null,
        status: "approved",
      } as any);

      // 5. Log the audit activity with actor details inside JSON
      try {
        await supabase.from("admin_activity_log").insert({
          admin_id: userId,
          action: "moderator_onboarded",
          entity_type: "staff_invitations",
          entity_id: token,
          details: {
            user_name: fullName,
            user_email: invitation.email,
            user_role: invitation.role,
            role: invitation.role,
            department,
            student_id: studentId,
          },
        });
      } catch { /* silent */ }

      toast.success(`Welcome aboard, ${fullName}! Your ${invitation.role} account is now active.`);

      // Route to destination
      if (invitation.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/moderator");
      }
    } catch (err: any) {
      toast.error("Onboarding failed: " + (err.message || "Unknown error"));
    }
    setSubmitting(false);
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Layout>
      <section className="py-20 min-h-[85vh] flex items-center">
        <div className="container max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {checking ? (
              <div className="p-8 rounded-xl glass text-center space-y-3">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Verifying staff invitation token...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-8 rounded-xl glass border border-destructive/40 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
                  <AlertCircle size={24} />
                </div>
                <h2 className="font-display text-lg font-bold text-foreground">Invitation Unavailable</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{errorMsg}</p>
                <div className="pt-2 flex justify-center gap-2">
                  <Link
                    to="/auth"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                  >
                    Go to Sign In
                  </Link>
                  <Link
                    to="/"
                    className="px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 rounded-2xl glass border border-primary/30 shadow-[0_0_30px_rgba(45,226,201,0.15)] space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/35 shadow-[0_0_12px_rgba(45,226,201,0.2)]">
                    <Shield size={13} />
                    <span>RUET IoT Club Staff Onboarding</span>
                  </div>
                  <h1 className="font-display text-2xl font-bold text-gradient">
                    Activate Your {invitation.role === "admin" ? "Administrator" : "Moderator"} Account
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Complete your profile and choose your password to access the operational workspace.
                  </p>
                </div>

                {/* Email Banner */}
                <div className="p-3 rounded-lg bg-secondary/70 border border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Invited Email:</span>
                  <span className="font-mono font-bold text-primary flex items-center gap-1">
                    <Mail size={13} /> {invitation.email}
                  </span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-medium text-muted-foreground mb-1">
                      Full Name *
                    </label>
                    <input
                      required
                      placeholder="e.g. S. M. Nayem"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Department *
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className={inputClass}
                      >
                        <option value="ECE">ECE</option>
                        <option value="CSE">CSE</option>
                        <option value="EEE">EEE</option>
                        <option value="ETE">ETE</option>
                        <option value="ME">ME</option>
                        <option value="Civil">Civil</option>
                        <option value="IPE">IPE</option>
                        <option value="MTE">MTE</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Student ID / Roll
                      </label>
                      <input
                        placeholder="e.g. 2103001"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Series / Session
                      </label>
                      <input
                        placeholder="e.g. '21 / 2021-2022"
                        value={session}
                        onChange={(e) => setSession(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Phone Number
                      </label>
                      <input
                        placeholder="01XXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-muted-foreground mb-1">
                      Key Skills & Domains
                    </label>
                    <input
                      placeholder="e.g. Embedded C, ESP32, Robotics, Web, IoT Hardware"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-[#2de2c9] to-[#3b9bff] text-black font-semibold text-sm hover:opacity-95 transition-all shadow-[0_0_16px_rgba(45,226,201,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? "Activating Account..." : "Complete Setup & Launch Dashboard"}
                    <ArrowRight size={15} />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default AcceptInvite;
