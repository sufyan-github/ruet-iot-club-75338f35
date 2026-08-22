import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return toast.error("This reset link is missing its security token.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await apiRequest("/auth/reset-password", { method: "POST", body: { token, password } });
      toast.success("Password updated. Sign in with your new password.");
      navigate("/auth");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset the password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="py-20"><div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
          <div className="text-center mb-8"><h1 className="font-display text-2xl font-bold text-gradient">Reset Password</h1><p className="text-sm text-muted-foreground mt-2">Set a new password for your account. Every existing session will be signed out.</p></div>
          {token ? (
            <form onSubmit={handleSubmit} className="p-6 rounded-xl glass space-y-4">
              <label htmlFor="new-password" className="text-sm font-medium">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={(event) => setConfirm(event.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">{loading ? "Updating..." : "Update Password"}</button>
            </form>
          ) : (
            <div className="p-6 rounded-xl glass text-center"><p className="text-sm">This link is incomplete.</p><Link to="/forgot-password" className="text-primary hover:underline text-sm">Request a new reset link</Link></div>
          )}
        </motion.div>
      </div></section>
    </Layout>
  );
};

export default ResetPassword;
