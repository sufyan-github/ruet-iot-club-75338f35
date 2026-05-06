import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Password reset email sent. Check your inbox.");
    }
  };

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl font-bold text-gradient">Forgot Password</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your email and we'll send you a reset link.
              </p>
            </div>
            {sent ? (
              <div className="p-6 rounded-xl glass text-center space-y-4">
                <p className="text-sm text-foreground">
                  If an account exists for <strong>{email}</strong>, a reset link has been sent.
                </p>
                <Link to="/auth" className="text-primary hover:underline text-sm">Back to Sign In</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 rounded-xl glass space-y-4">
                <input
                  type="email"
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
              <Link to="/auth" className="text-primary hover:underline">Sign In</Link>
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default ForgotPassword;