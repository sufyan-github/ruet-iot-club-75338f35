import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, CheckCircle, Camera } from "lucide-react";

const departments = ["CSE", "EEE", "ECE", "ME", "CE", "IPE", "MTE", "URP", "Arch", "GCE", "BECM", "CFPE"];
const batches = ["2024-25", "2023-24", "2022-23", "2021-22", "2020-21", "2019-20", "2018-19"];
const sessions = ["2024-25", "2023-24", "2022-23", "2021-22", "2020-21", "2019-20", "2018-19"];
const experienceLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];
const timeCommitments = ["2-4 hours/week", "5-8 hours/week", "9-12 hours/week", "12+ hours/week"];

const JoinUs = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "", studentId: "", email: "", phone: "",
    department: "", batch: "", session: "",
    experienceLevel: "", areasOfInterest: "", previousProjects: "",
    motivation: "", timeCommitment: "",
    linkedin: "", github: "", facebookLink: "",
    paymentMethod: "", transactionId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload JPG, PNG, or WebP image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload PDF, DOC, or DOCX file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    setResumeFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first to submit your application.");
      return;
    }

    if (!avatarFile) {
      toast.error("Please upload your profile photo");
      return;
    }
    if (!form.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    const isCashPayment = form.paymentMethod === "Cash";
    if (!isCashPayment && !form.transactionId.trim()) {
      toast.error("Please enter your Transaction ID");
      return;
    }

    setSubmitting(true);
    try {
      let resumeUrl = null;
      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from("club-images").upload(path, avatarFile, { upsert: true });
        if (uploadError) {
          console.error("Avatar upload error:", uploadError);
          toast.error("Failed to upload photo: " + uploadError.message);
          setSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("club-images").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      // Upload resume if provided
      if (resumeFile) {
        const ext = resumeFile.name.split(".").pop();
        const path = `${user.id}/resume.${ext}`;
        const { error: uploadError } = await supabase.storage.from("resumes").upload(path, resumeFile, { upsert: true });
        if (uploadError) {
          console.error("Resume upload error:", uploadError);
          toast.error("Failed to upload resume: " + uploadError.message);
          setSubmitting(false);
          return;
        }
        resumeUrl = path;
      }

      // Update profile with application details
      const profileUpdate = {
        full_name: form.fullName,
        student_id: form.studentId,
        email: form.email,
        phone: form.phone,
        department: form.department,
        batch: form.batch,
        session: form.session || null,
        experience_level: form.experienceLevel,
        areas_of_interest: form.areasOfInterest,
        previous_projects: form.previousProjects || null,
        motivation: form.motivation,
        time_commitment: form.timeCommitment,
        linkedin: form.linkedin || null,
        github: form.github || null,
        facebook_link: form.facebookLink || null,
        ...(resumeUrl ? { resume_url: resumeUrl } : {}),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, ...profileUpdate }, { onConflict: "user_id" });

      if (profileError) {
        console.error("Profile update error:", profileError);
        toast.error("Failed to update profile: " + profileError.message);
        setSubmitting(false);
        return;
      }

      // Submit payment
      if (form.paymentMethod) {
        const { error: paymentError } = await supabase
          .from("membership_payments")
          .insert({
            user_id: user.id,
            payment_method: form.paymentMethod,
            transaction_id: isCashPayment ? "CASH-UNPAID" : form.transactionId,
            payment_status: isCashPayment ? "unpaid" : "pending",
          });

        if (paymentError) {
          console.error("Payment error:", paymentError);
          if (paymentError.message?.includes("duplicate")) {
            toast.info("Payment already recorded. Profile updated successfully!");
          } else {
            toast.error("Failed to submit payment: " + paymentError.message);
            setSubmitting(false);
            return;
          }
        }
      }

      setSuccess(true);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 chip-shape bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  if (success) {
    return (
      <Layout>
      <SEO title="Join RUET IoT Club — Membership Application" description="Apply for membership in RUET IoT Club and join an active community of IoT engineers, researchers, and innovators." path="/join" />
        <section className="py-20">
          <div className="container max-w-lg mx-auto text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6">
              <CheckCircle size={64} className="text-green-400 mx-auto" />
            </motion.div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">Application Submitted!</h2>
            <p className="text-muted-foreground mb-2">Thank you for applying to RUET IoT Club.</p>
            <p className="text-sm text-muted-foreground mb-6">We review applications weekly. Your payment will be verified and you'll receive a confirmation.</p>
            <Link to="/" className="px-6 py-2 chip-shape bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold text-sm shadow-[0_2px_12px_rgba(45,226,201,0.35)] hover:brightness-110 transition-all">
              Back to Home
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Membership Application" subtitle="Fill out all sections to complete your application. We review applications weekly." />

          {!user && (
            <div className="max-w-2xl mx-auto mb-8 p-4 chip-card border border-[#2de2c9]/30 text-center">
              <p className="text-sm text-muted-foreground">
                Please <Link to="/auth" className="text-primary hover:underline font-semibold">sign in or create an account</Link> first to submit your membership application.
              </p>
            </div>
          )}

          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">

            {/* Profile Photo */}
            <div className="relative p-6 chip-card border border-[#2de2c9]/25 space-y-4 overflow-hidden">
              <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-[#2de2c9] shadow-[0_0_6px_#2de2c9]" />
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Profile Photo</h3>
              <div className="flex items-center gap-6">
                <div
                  onClick={() => avatarRef.current?.click()}
                  className="relative w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center overflow-hidden group"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={28} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={20} className="text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium">Upload your photo *</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP. Max 2MB. This will appear on your member profile.</p>
                </div>
                <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>

            {/* Personal Information */}
            <div className="relative p-6 chip-card border border-[#2de2c9]/25 space-y-4 overflow-hidden">
              <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-[#2de2c9] shadow-[0_0_6px_#2de2c9]" />
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
                  <input name="fullName" placeholder="Your full name" required value={form.fullName} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Student ID *</label>
                  <input name="studentId" placeholder="e.g., 2021331001" required value={form.studentId} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email Address *</label>
                  <input name="email" type="email" placeholder="your.email@example.com" required value={form.email} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Phone Number *</label>
                  <input name="phone" placeholder="+880 1XXX-XXXXXX" required value={form.phone} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="relative p-6 chip-card border border-[#2de2c9]/25 space-y-4 overflow-hidden">
              <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-[#2de2c9] shadow-[0_0_6px_#2de2c9]" />
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Academic Information</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Department *</label>
                  <select name="department" required value={form.department} onChange={handleChange} className={inputClass}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Series *</label>
                  <select name="batch" required value={form.batch} onChange={handleChange} className={inputClass}>
                    <option value="">Select series</option>
                    {batches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Session *</label>
                  <select name="session" required value={form.session} onChange={handleChange} className={inputClass}>
                    <option value="">Select session</option>
                    {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Technical Background */}
            <div className="relative p-6 chip-card border border-[#2de2c9]/25 space-y-4 overflow-hidden">
              <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-[#2de2c9] shadow-[0_0_6px_#2de2c9]" />
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Technical Background</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Experience Level *</label>
                <select name="experienceLevel" required value={form.experienceLevel} onChange={handleChange} className={inputClass}>
                  <option value="">Select your experience level</option>
                  {experienceLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Areas of Interest *</label>
                <input name="areasOfInterest" placeholder="e.g., Smart Home, Agriculture IoT, Machine Learning" required value={form.areasOfInterest} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Previous Projects (Optional)</label>
                <textarea name="previousProjects" placeholder="Briefly describe any relevant projects you've worked on..." rows={3} value={form.previousProjects} onChange={handleChange} className={inputClass + " resize-none"} />
              </div>
            </div>

            {/* Motivation & Commitment */}
            <div className="relative p-6 chip-card border border-[#2de2c9]/25 space-y-4 overflow-hidden">
              <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-[#2de2c9] shadow-[0_0_6px_#2de2c9]" />
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Motivation & Commitment</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Why do you want to join? *</label>
                <textarea name="motivation" placeholder="Tell us what motivates you to join the IoT Club..." rows={4} required value={form.motivation} onChange={handleChange} className={inputClass + " resize-none"} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Time Commitment *</label>
                <select name="timeCommitment" required value={form.timeCommitment} onChange={handleChange} className={inputClass}>
                  <option value="">How much time can you dedicate per week?</option>
                  {timeCommitments.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Additional Information */}
            <div className="relative p-6 chip-card border border-[#2de2c9]/25 space-y-4 overflow-hidden">
              <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-[#2de2c9] shadow-[0_0_6px_#2de2c9]" />
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Additional Information</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">LinkedIn (Optional)</label>
                  <input name="linkedin" placeholder="linkedin.com/in/..." value={form.linkedin} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">GitHub (Optional)</label>
                  <input name="github" placeholder="github.com/..." value={form.github} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Facebook (Optional)</label>
                  <input name="facebookLink" placeholder="facebook.com/..." value={form.facebookLink} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Resume/CV (Optional)</label>
                <div onClick={() => fileRef.current?.click()}
                  className="w-full px-4 py-4 chip-shape bg-secondary border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center gap-3 text-sm">
                  <Upload size={20} className="text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {resumeFile ? resumeFile.name : "Choose File — PDF, DOC, DOCX (Max 5MB)"}
                  </span>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            {/* Payment */}
            <div className="relative p-6 chip-card border border-[#2de2c9]/25 space-y-4 overflow-hidden">
              <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-[#2de2c9] shadow-[0_0_6px_#2de2c9]" />
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Membership Fee (৳300)</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Payment Method *</label>
                <div className="flex flex-wrap gap-2">
                  {["bKash", "Nagad", "Rocket", "Cash"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: method, transactionId: method === "Cash" ? "" : form.transactionId })}
                      className={`px-4 py-2 chip-shape text-sm font-medium transition-all ${
                        form.paymentMethod === method
                          ? "bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold shadow-[0_2px_12px_rgba(45,226,201,0.4)]"
                          : "bg-[#071322]/80 text-muted-foreground border border-[#2de2c9]/25 hover:text-foreground"
                      }`}
                    >
                      {method === "Cash" ? "💵 Cash" : method}
                    </button>
                  ))}
                </div>
              </div>

              {(form.paymentMethod === "bKash" || form.paymentMethod === "Nagad" || form.paymentMethod === "Rocket") && (
                <div className="p-3 chip-shape bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                  <p>Send <strong className="text-foreground">৳300</strong> to:</p>
                  <p className="text-primary font-mono text-lg font-bold mt-1">+8801580352238</p>
                  <p className="mt-1 text-xs">({form.paymentMethod} Personal) — Use "Send Money" option and note the Transaction ID.</p>
                </div>
              )}
              {form.paymentMethod === "Cash" && (
                <div className="p-3 chip-shape bg-yellow-500/5 border border-yellow-500/20 text-sm text-muted-foreground">
                  <p className="font-semibold text-yellow-400">💵 Cash Payment</p>
                  <p className="text-xs mt-1">Pay <strong className="text-foreground">৳300</strong> directly to the club admin. An unpaid status will be recorded for tracking until payment is received.</p>
                </div>
              )}

              {form.paymentMethod && form.paymentMethod !== "Cash" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Transaction ID *</label>
                  <input name="transactionId" placeholder="Enter transaction ID" value={form.transactionId} onChange={handleChange} className={inputClass} />
                </div>
              )}
            </div>

            <button type="submit" disabled={submitting || !user}
              className="w-full py-4 chip-shape bg-gradient-to-r from-[#2de2c9] via-[#00d2ff] to-[#38bdf8] text-[#050b14] font-bold text-base shadow-[0_4px_24px_rgba(45,226,201,0.45)] hover:shadow-[0_4px_32px_rgba(45,226,201,0.7)] hover:brightness-110 transition-all disabled:opacity-50">
              {submitting ? "Submitting Application..." : "Submit Application"}
            </button>
            <p className="text-xs text-center text-muted-foreground">
              Your application will be reviewed by the admin team. We review applications weekly.
            </p>
          </motion.form>
        </div>
      </section>
    </Layout>
  );
};

export default JoinUs;
