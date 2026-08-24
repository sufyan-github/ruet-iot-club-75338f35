import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { Mail, MapPin, Phone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import TurnstileWidget from "@/components/TurnstileWidget";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";

const Contact = () => {
  const [settings, setSettings] = useState({
    contact: {
      generalEmail: "ruetiotclub@gmail.com",
      phone: "+880 1580-352238",
    },
    membership: {
      phone: "+880 1580-352238",
      paymentNumber: "01580352238",
      paymentMethods: ["BKASH", "NAGAD"] as Array<"BKASH" | "NAGAD">,
      paymentInstructions:
        "Submit payment evidence together with the membership application.",
    },
    location: {
      address:
        "Rajshahi University of Engineering & Technology, Kazla, Rajshahi-6204, Bangladesh",
      mapEmbedUrl:
        "https://www.google.com/maps?q=Rajshahi%20University%20of%20Engineering%20%26%20Technology%2C%20Kazla%2C%20Rajshahi%206204%2C%20Bangladesh&output=embed",
      mapOpenUrl:
        "https://www.google.com/maps/search/?api=1&query=Rajshahi%20University%20of%20Engineering%20%26%20Technology%2C%20Kazla%2C%20Rajshahi%206204%2C%20Bangladesh",
    },
  });
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(
    import.meta.env.VITE_TURNSTILE_SITE_KEY || "",
  );
  const [referenceCode, setReferenceCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { csrfToken } = useAuth();

  useEffect(() => {
    void apiRequest<typeof settings>("/settings/public")
      .then(setSettings)
      .catch(() => undefined);
    void apiRequest<{ turnstileSiteKey: string }>("/auth/config")
      .then((result) => setTurnstileSiteKey(result.turnstileSiteKey))
      .catch(() =>
        toast.error("The security check is temporarily unavailable."),
      );
  }, []);

  const handleTurnstileToken = useCallback(
    (token: string) => setTurnstileToken(token),
    [],
  );
  const handleTurnstileError = useCallback(
    () => toast.error("The security check could not load. Please refresh."),
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      toast.error("Complete the security check first.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<{ referenceCode: string }>(
        "/submissions/contact",
        {
          method: "POST",
          csrfToken: csrfToken ?? undefined,
          body: {
            submitter: { name: form.name, email: form.email },
            subject: form.subject,
            message: form.message,
            website,
            turnstileToken,
          },
        },
      );
      setReferenceCode(result.referenceCode);
      toast.success("Your message has been securely received.");
      setForm({ name: "", email: "", subject: "", message: "" });
      setWebsite("");
      setTurnstileToken("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send the message. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Contact RUET IoT Club"
        description="Get in touch with RUET IoT Club via email, phone, or our contact form. Based at RUET, Rajshahi, Bangladesh."
        path="/contact"
      />
      <section className="py-20">
        <div className="container">
          <SectionHeading
            level={1}
            title="Contact Us"
            subtitle="Get in touch with RUET IoT Club"
          />

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-xl glass">
                <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">
                  Get in Touch
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin
                      className="text-primary shrink-0 mt-0.5"
                      size={18}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Address
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {settings.location.address}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="text-primary shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Email
                      </p>
                      <a
                        href={`mailto:${settings.contact.generalEmail}`}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        {settings.contact.generalEmail}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="text-primary shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Phone
                      </p>
                      <a
                        href={`tel:${settings.contact.phone.replace(/\s/g, "")}`}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        {settings.contact.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl glass">
                <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">
                  Membership & Payment
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Phone className="text-primary shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Payment & Membership Contact
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {settings.membership.phone}
                      </p>
                      <p className="mt-2 font-mono text-base font-semibold text-foreground">
                        {settings.membership.paymentNumber}
                      </p>
                      <p className="text-xs font-medium text-primary">
                        {settings.membership.paymentMethods.map((method) => method === "BKASH" ? "bKash" : "Nagad").join(" · ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {settings.membership.paymentInstructions}
                      </p>
                      <p className="mt-2 text-xs font-medium text-amber-200">
                        Pay only through the membership application form and always keep the transaction ID.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <GoogleMapEmbed
                address={settings.location.address}
                embedUrl={settings.location.mapEmbedUrl}
                openUrl={settings.location.mapOpenUrl}
                heightClassName="h-48"
              />
            </motion.div>

            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmit}
              className="p-6 rounded-xl glass space-y-4"
            >
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-2">
                Send a Message
              </h3>
              {referenceCode && (
                <div
                  role="status"
                  className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm"
                >
                  <strong>Message received.</strong>
                  <span className="mt-1 block text-muted-foreground">
                    Reference: <code>{referenceCode}</code>. A confirmation
                    email has been queued.
                  </span>
                </div>
              )}
              <div>
                <label htmlFor="contact-name" className="text-sm font-medium">
                  Your name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm font-medium">
                  Your email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-subject"
                  className="text-sm font-medium"
                >
                  Subject
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  required
                  minLength={3}
                  maxLength={160}
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-message"
                  className="text-sm font-medium"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={7}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
              </div>
              <div className="absolute -left-[10000px]" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>
              {turnstileSiteKey && (
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  action="submission"
                  onToken={handleTurnstileToken}
                  onError={handleTurnstileError}
                />
              )}
              <button
                type="submit"
                disabled={submitting || !turnstileSiteKey || !turnstileToken}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border disabled:opacity-50"
              >
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
