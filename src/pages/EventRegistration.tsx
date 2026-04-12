import { useState } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar, MapPin, Users, CreditCard, CheckCircle } from "lucide-react";

const EventRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const event = location.state?.event;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    payment_method: "",
    transaction_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!event) {
    return (
      <Layout>
        <section className="py-20">
          <div className="container text-center">
            <p className="text-muted-foreground">Event not found. Please go back to events page.</p>
            <button onClick={() => navigate("/events")} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Back to Events
            </button>
          </div>
        </section>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to register for events");
      navigate("/auth");
      return;
    }

    if (event.is_paid && (!form.payment_method || !form.transaction_id)) {
      toast.error("Please complete payment details");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("event_registrations").insert({
      event_id: event.id,
      user_id: user.id,
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      department: form.department || null,
      payment_method: event.is_paid ? form.payment_method : null,
      transaction_id: event.is_paid ? form.transaction_id : null,
      payment_status: event.is_paid ? "pending" : "confirmed",
    });

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("You have already registered for this event");
      } else {
        toast.error("Registration failed: " + error.message);
      }
      return;
    }

    setSuccess(true);
    toast.success("Registration successful!");
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
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">Registration Successful!</h2>
            <p className="text-muted-foreground mb-2">You have been registered for <strong className="text-foreground">{event.title}</strong>.</p>
            {event.is_paid && (
              <p className="text-sm text-yellow-400 mb-4">Your payment is pending verification by the admin.</p>
            )}
            <button onClick={() => navigate("/events")}
              className="mt-6 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
              Back to Events
            </button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-20">
        <div className="container max-w-2xl mx-auto">
          <SectionHeading title="Event Registration" subtitle={event.title} />

          {/* Event Info Card */}
          <div className="p-6 rounded-xl glass mb-8">
            {event.image_url && (
              <img src={getOptimizedImageUrl(event.image_url, { width: 600, height: 250 })} alt={event.title} className="w-full h-48 object-cover rounded-lg mb-4" />
            )}
            <h3 className="font-semibold text-lg text-foreground mb-2">{event.title}</h3>
            {event.description && <p className="text-sm text-muted-foreground mb-3">{event.description}</p>}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar size={12} className="text-primary" /> {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              {event.venue && <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> {event.venue}</span>}
              {event.max_participants && <span className="flex items-center gap-1"><Users size={12} className="text-primary" /> {event.max_participants} spots</span>}
            </div>
            <div className="mt-3">
              {event.is_paid ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  <CreditCard size={14} /> Registration Fee: ৳{event.registration_fee}
                </span>
              ) : (
                <span className="text-sm font-semibold text-green-400">Free Registration</span>
              )}
            </div>
          </div>

          {/* Registration Form */}
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} className="p-6 rounded-xl glass space-y-4">
            <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-2">Your Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input placeholder="Full Name *" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              <input placeholder="Email *" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              <input placeholder="Phone Number" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              <input placeholder="Department" value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputClass} />
            </div>

            {/* Payment section for paid events */}
            {event.is_paid && (
              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard size={16} className="text-primary" /> Payment Details
                </h4>
                <p className="text-xs text-muted-foreground">
                  Please send <strong className="text-foreground">৳{event.registration_fee}</strong> using one of the methods below, then enter the transaction ID.
                </p>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Payment Method *</label>
                  <div className="flex flex-wrap gap-2">
                    {(event.payment_methods || []).map((method: string) => (
                      <button key={method} type="button" onClick={() => setForm({ ...form, payment_method: method })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          form.payment_method === method
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}>
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {form.payment_method && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {(form.payment_method === "bKash" || form.payment_method === "Nagad" || form.payment_method === "Rocket") && (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground mb-3">
                        <p>Send ৳{event.registration_fee} to <strong className="text-foreground">
                          {event.payment_number || "+8801580352238"} ({form.payment_method} Personal)
                        </strong></p>
                        <p className="mt-1 text-xs">Use "Send Money" option and note the Transaction ID.</p>
                      </div>
                    )}
                    {form.payment_method === "Online Banking" && event.bank_account && (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground mb-3">
                        <p>Transfer ৳{event.registration_fee} to Card/Account: <strong className="text-foreground">{event.bank_account}</strong></p>
                        <p className="mt-1 text-xs">Note the Transaction/Reference ID after transfer.</p>
                      </div>
                    )}
                    <input placeholder="Transaction ID *" required value={form.transaction_id}
                      onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} className={inputClass} />
                  </motion.div>
                )}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 glow-border">
              {submitting ? "Submitting..." : event.is_paid ? `Register & Pay ৳${event.registration_fee}` : "Register Now"}
            </button>
          </motion.form>
        </div>
      </section>
    </Layout>
  );
};

export default EventRegistration;
