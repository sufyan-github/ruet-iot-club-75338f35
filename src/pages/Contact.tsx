import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          type: "contact",
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
        },
      });
      if (error) throw error;
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      toast.error("Failed to send message. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Contact Us" subtitle="Get in touch with RUET IoT Club" />

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-xl glass">
                <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">Get in Touch</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-primary shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Address</p>
                      <p className="text-sm text-muted-foreground">Rajshahi University of Engineering & Technology, Rajshahi-6204, Bangladesh</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="text-primary shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">iotclub@ruet.ac.bd</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="text-primary shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Phone</p>
                      <p className="text-sm text-muted-foreground">+880 1580-352238</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl glass">
                <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">Membership & Payment</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Phone className="text-primary shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Payment & Membership Contact</p>
                      <p className="text-sm text-muted-foreground">+880 1580-352238</p>
                      <p className="text-xs text-muted-foreground mt-1">Contact this number for membership payment queries, bKash/Nagad transactions, and any membership-related inquiries.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden glass h-48">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3634.6!2d88.6!3d24.37!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDIyJzEyLjAiTiA4OMKwMzYnMDAuMCJF!5e0!3m2!1sen!2sbd!4v1"
                  width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                  title="RUET Location"
                />
              </div>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmit}
              className="p-6 rounded-xl glass space-y-4"
            >
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-2">Send a Message</h3>
              <input name="name" placeholder="Your Name *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input name="email" type="email" placeholder="Your Email *" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input name="subject" placeholder="Subject *" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <textarea name="message" placeholder="Your Message *" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border disabled:opacity-50">
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </motion.form>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
