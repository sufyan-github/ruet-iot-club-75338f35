import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Lock, Mail, ArrowRight, Sparkles } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const routeByRole = async (userId: string, showToast = true) => {
    try {
      const [adminRes, modRes, roleRows] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

      const roles = (roleRows.data || []).map((r: any) => r.role);
      const isAdminUser = !!adminRes.data || roles.includes("admin");
      const isModUser = !!modRes.data || roles.includes("moderator");

      if (isAdminUser) {
        if (showToast) toast.success("Welcome back, Administrator!");
        navigate("/admin", { replace: true });
        return;
      }

      if (isModUser) {
        if (showToast) toast.success("Welcome back, Moderator!");
        navigate("/moderator", { replace: true });
        return;
      }

      if (showToast) toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
    } catch {
      navigate("/dashboard", { replace: true });
    }
  };

  // If already logged in, automatically redirect role-wise
  useEffect(() => {
    if (!authLoading && user) {
      routeByRole(user.id, false);
    }
  }, [user, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (currentUser) {
          await routeByRole(currentUser.id, true);
        } else {
          toast.success("Logged in successfully!");
          navigate("/dashboard");
        }
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Check your email for verification.");
      }
    }
    setLoading(false);
  };

  return (
    <Layout>
      <section className="py-20 min-h-[85vh] flex items-center">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            {/* ─── Header Info ─── */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-3 bg-secondary border border-border text-primary">
                <Sparkles size={13} className="text-primary" />
                <span>RUET IoT Club Portal</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-gradient">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {isLogin
                  ? "Sign in to access your RUET IoT Club account and dashboard"
                  : "Join the RUET IoT Club community"}
              </p>
            </div>

            {/* ─── Main Form ─── */}
            <form onSubmit={handleSubmit} className="p-6 rounded-xl glass space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      placeholder="e.g. Nayem Islam"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold transition-all glow-border disabled:opacity-50 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(45,226,201,0.25)]"
              >
                {loading ? (
                  "Authenticating..."
                ) : isLogin ? (
                  <>
                    Sign In <ArrowRight size={15} />
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {isLogin && (
              <p className="text-center text-sm mt-4">
                <Link to="/forgot-password" className="text-primary hover:underline">
                  Forgot password?
                </Link>
              </p>
            )}

            <p className="text-center text-sm text-muted-foreground mt-4">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-semibold"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Auth;
