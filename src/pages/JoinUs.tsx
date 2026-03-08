import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, CheckCircle } from "lucide-react";

const departments = ["CSE", "EEE", "ECE", "ME", "CE", "IPE", "MTE", "URP", "Arch", "GCE", "BECM", "CFPE"];
const batches = ["2024-25", "2023-24", "2022-23", "2021-22", "2020-21", "2019-20", "2018-19"];
const experienceLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];
const timeCommitments = ["2-4 hours/week", "5-8 hours/week", "9-12 hours/week", "12+ hours/week"];

const JoinUs = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    fullName: "", studentId: "", email: "", phone: "",
    department: "", batch: "",
    experienceLevel: "", areasOfInterest: "", previousProjects: "",
    motivation: "", timeCommitment: "",
    linkedin: "", github: "",
    paymentMethod: "", transactionId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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

    setSubmitting(true);
    try {
      let resumeUrl = null;

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
      const profilePayload: Record<string, any> = {
        full_name: form.fullName,
        student_id: form.studentId,
        email: form.email,
        phone: form.phone,
        department: form.department,
        batch: form.batch,
        experience_level: form.experienceLevel,
        areas_of_interest: form.areasOfInterest,
        previous_projects: form.previousProjects || null,
        motivation: form.motivation,
        time_commitment: form.timeCommitment,
        linkedin: form.linkedin || null,
        github: form.github || null,
      };
      if (resumeUrl) {
        profilePayload.resume_url = resumeUrl;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("user_id", user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        toast.error("Failed to update profile: " + profileError.message);
        setSubmitting(false);
        return;
      }

      // Submit payment
      if (form.paymentMethod && form.transactionId) {
        const { error: paymentError } = await supabase
          .from("membership_payments")
          .insert({
            user_id: user.id,
            payment_method: form.paymentMethod,
            transaction_id: form.transactionId,
          });

        if (paymentError) {
          console.error("Payment error:", paymentError);
          // If duplicate, still consider success since profile was updated
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

  const inputClass = "w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  if (success) {
    return (
      <Layout>
        <section className="py-20">
          <div className="container max-w-lg mx-auto text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6">
              <CheckCircle size={64} className="text-green-400 mx-auto" />
            </motion.div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">Application Submitted!</h2>
            <p className="text-muted-foreground mb-2">Thank you for applying to RUET IoT Club.</p>
            <p className="text-sm text-muted-foreground mb-6">We review applications weekly. Your payment will be verified and you'll receive a confirmation.</p>
            <Link to="/" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
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
            <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl glass border-primary/20 text-center">
              <p className="text-sm text-muted-foreground">
                Please <Link to="/auth" className="text-primary hover:underline font-semibold">sign in or create an account</Link> first to submit your membership application.
              </p>
            </div>
          )}

          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">

            {/* Personal Information */}
            <div className="p-6 rounded-xl glass space-y-4">
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
            <div className="p-6 rounded-xl glass space-y-4">
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Academic Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Department *</label>
                  <select name="department" required value={form.department} onChange={handleChange} className={inputClass}>
                    <option value="">Select your department</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Batch *</label>
                  <select name="batch" required value={form.batch} onChange={handleChange} className={inputClass}>
                    <option value="">Select your batch</option>
                    {batches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Technical Background */}
            <div className="p-6 rounded-xl glass space-y-4">
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
            <div className="p-6 rounded-xl glass space-y-4">
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Motivation & Commitment</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Why do you want to join? *</label>
                <textarea name="motivation" placeholder="Tell us what motivates you to join the IoT Club and what you hope to achieve..." rows={4} required value={form.motivation} onChange={handleChange} className={inputClass + " resize-none"} />
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
            <div className="p-6 rounded-xl glass space-y-4">
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Additional Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">LinkedIn Profile (Optional)</label>
                  <input name="linkedin" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedin} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">GitHub Profile (Optional)</label>
                  <input name="github" placeholder="https://github.com/yourusername" value={form.github} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Resume/CV (Optional)</label>
                <div onClick={() => fileRef.current?.click()}
                  className="w-full px-4 py-4 rounded-lg bg-secondary border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center gap-3 text-sm">
                  <Upload size={20} className="text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {resumeFile ? resumeFile.name : "Choose File — PDF, DOC, DOCX (Max 5MB)"}
                  </span>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            {/* Payment */}
            <div className="p-6 rounded-xl glass space-y-4">
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Membership Fee (৳300)</h3>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                <p>Send <strong className="text-foreground">৳300</strong> to our bKash/Nagad number: <span className="text-primary font-mono">01XXX-XXXXXX</span></p>
                <p className="mt-1 text-xs">Use "Send Money" option and note the Transaction ID.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Payment Method *</label>
                  <select name="paymentMethod" required value={form.paymentMethod} onChange={handleChange} className={inputClass}>
                    <option value="">Select payment method</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                    <option value="manual">Manual Payment</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Transaction ID *</label>
                  <input name="transactionId" placeholder="Enter transaction ID" required value={form.transactionId} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitting || !user}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border disabled:opacity-50">
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
