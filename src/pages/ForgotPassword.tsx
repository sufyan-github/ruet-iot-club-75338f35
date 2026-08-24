import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setSent(true);
      toast.success(
        "If the account is eligible, a reset email will arrive shortly.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not request a password reset.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Reset Password | RUET IoT Club"
        description="Request a secure RUET IoT Club account password reset link."
        path="/forgot-password"
      />
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl font-bold text-gradient">
                Forgot Password
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your email and we'll send you a reset link.
              </p>
            </div>
            {sent ? (
              <div className="p-6 rounded-xl glass text-center space-y-4">
                <p className="text-sm text-foreground">
                  If an account exists for <strong>{email}</strong>, a reset
                  link has been sent.
                </p>
                <Link
                  to="/auth"
                  className="text-primary hover:underline text-sm"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="p-6 rounded-xl glass space-y-4"
              >
                <input
                  type="email"
                  aria-label="Account email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
            <p className="text-center text-sm text-muted-foreground mt-4">
              Remember your password?{" "}
              <Link to="/auth" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default ForgotPassword;
