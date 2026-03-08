import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const departments = ["CSE", "EEE", "ECE", "ME", "CE", "IPE", "MTE", "URP", "Arch", "GCE", "BECM", "CFPE"];

const JoinUs = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "", studentId: "", department: "", session: "", email: "", phone: "",
    facebook: "", skills: "", motivation: "", paymentMethod: "", transactionId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in first to submit your application.");
      return;
    }

    setSubmitting(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          student_id: formData.studentId,
          department: formData.department,
          session: formData.session,
          phone: formData.phone,
          facebook_link: formData.facebook,
          skills: formData.skills,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Submit payment
      const { error: paymentError } = await supabase
        .from("membership_payments")
        .insert({
          user_id: user.id,
          payment_method: formData.paymentMethod,
          transaction_id: formData.transactionId,
        });

      if (paymentError) throw paymentError;

      toast.success("Application submitted! Our team will review your application.");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Join RUET IoT Club" subtitle="Become part of the IoT revolution. Membership fee: 300 BDT" />

          {!user && (
            <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl glass border-primary/20 text-center">
              <p className="text-sm text-muted-foreground">
                Please <Link to="/auth" className="text-primary hover:underline">sign in or create an account</Link> first to submit your membership application.
              </p>
            </div>
          )}

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto space-y-6"
          >
            <div className="p-6 rounded-xl glass space-y-4">
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input name="fullName" placeholder="Full Name *" required value={formData.fullName} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input name="studentId" placeholder="Student ID *" required value={formData.studentId} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <select name="department" required value={formData.department} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Department *</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input name="session" placeholder="Session (e.g., 2021-22) *" required value={formData.session} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input name="email" type="email" placeholder="Email *" required value={formData.email} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input name="phone" placeholder="Phone *" required value={formData.phone} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <input name="facebook" placeholder="Facebook Profile Link" value={formData.facebook} onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input name="skills" placeholder="Skills (e.g., Arduino, Python, PCB Design)" value={formData.skills} onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <textarea name="motivation" placeholder="Why do you want to join RUET IoT Club? *" required rows={4} value={formData.motivation} onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>

            <div className="p-6 rounded-xl glass space-y-4">
              <h3 className="font-display text-sm font-bold tracking-wider text-primary">Payment (300 BDT)</h3>
              <p className="text-xs text-muted-foreground">
                Send 300 BDT to our bKash/Nagad number: <span className="text-primary font-mono">01XXX-XXXXXX</span>
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <select name="paymentMethod" required value={formData.paymentMethod} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Payment Method *</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="manual">Manual Payment</option>
                </select>
                <input name="transactionId" placeholder="Transaction ID *" required value={formData.transactionId} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !user}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
            <p className="text-xs text-center text-muted-foreground">
              Your application will be reviewed by the admin team. You'll receive a confirmation email.
            </p>
          </motion.form>
        </div>
      </section>
    </Layout>
  );
};

export default JoinUs;
