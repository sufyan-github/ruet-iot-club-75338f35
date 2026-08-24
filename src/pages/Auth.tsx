import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import TurnstileWidget from "@/components/TurnstileWidget";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

const inputClass = "w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-sm text-foreground shadow-inner shadow-black/10 transition placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/[0.15]";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(() => searchParams.get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("Rajshahi University of Engineering & Technology");
  const [department, setDepartment] = useState("");
  const [professionalStatus, setProfessionalStatus] = useState<"STUDENT" | "FACULTY" | "RESEARCHER" | "PROFESSIONAL" | "OTHER">("STUDENT");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(import.meta.env.VITE_TURNSTILE_SITE_KEY || "");
  const [verificationPending, setVerificationPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    void apiRequest<{ turnstileSiteKey: string }>("/auth/config")
      .then((result) => setTurnstileSiteKey(result.turnstileSiteKey))
      .catch(() => undefined);
  }, []);

  const handleTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileError = useCallback(() => toast.error("The security check could not load. Please refresh."), []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isLogin && !turnstileToken) {
      toast.error("Complete the security check first.");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!isLogin && !consent) {
      toast.error("Consent is required to create an account.");
      return;
    }
    setLoading(true);
    const { error, mustChangePassword } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, displayName, turnstileToken, {
        phone: phone.trim() || null,
        institution,
        department,
        professionalStatus,
        consent: true,
      });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (isLogin) {
      toast.success("Signed in successfully.");
      navigate(mustChangePassword ? "/account/security" : "/dashboard");
    } else {
      setVerificationPending(true);
      toast.success("Account created. Check your email to verify it.");
    }
  };

  const resendVerification = async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ message: string }>("/auth/resend-verification", {
        method: "POST",
        body: { email },
      });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend the email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl font-bold text-gradient">{isLogin ? "Welcome Back" : "Create Account"}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                {isLogin ? "Sign in to your RUET IoT Club community account" : "Create a community account. Club membership is a separate application."}
              </p>
            </div>

            {verificationPending ? (
              <div className="p-6 rounded-xl glass space-y-4 text-center" role="status">
                <h2 className="font-semibold">Verify your email</h2>
                <p className="text-sm text-muted-foreground">We queued a verification link for {email}. You cannot sign in until it is confirmed.</p>
                <button type="button" onClick={resendVerification} disabled={loading} className="text-primary hover:underline text-sm disabled:opacity-50">
                  Resend verification email
                </button>
                <div className="flex justify-center gap-4 text-sm">
                  <button type="button" onClick={() => setVerificationPending(false)} className="text-primary hover:underline">Change email</button>
                  <button type="button" onClick={() => { setVerificationPending(false); setIsLogin(true); }} className="text-primary hover:underline">Back to login</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 rounded-xl glass space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label htmlFor="display-name" className="text-sm font-medium">Full name</label>
                      <input id="display-name" autoComplete="name" required minLength={2} maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="auth-phone" className="text-sm font-medium">Phone <span className="text-muted-foreground">(optional)</span></label>
                      <input id="auth-phone" type="tel" autoComplete="tel" minLength={6} maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="auth-institution" className="text-sm font-medium">Institution</label>
                      <input id="auth-institution" required minLength={2} maxLength={160} value={institution} onChange={(event) => setInstitution(event.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="auth-department" className="text-sm font-medium">Department</label>
                      <input id="auth-department" required minLength={2} maxLength={160} value={department} onChange={(event) => setDepartment(event.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="auth-status" className="text-sm font-medium">Student / professional status</label>
                      <select id="auth-status" value={professionalStatus} onChange={(event) => setProfessionalStatus(event.target.value as typeof professionalStatus)} className={inputClass}>
                        <option value="STUDENT">Student</option><option value="FACULTY">Faculty</option><option value="RESEARCHER">Researcher</option><option value="PROFESSIONAL">Professional</option><option value="OTHER">Other</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="auth-email" className="text-sm font-medium">Email</label>
                  <input id="auth-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
                </div>
                {!isLogin && <div>
                  <label htmlFor="auth-confirm-password" className="text-sm font-medium">Confirm password</label>
                  <input id="auth-confirm-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
                </div>}
                {!isLogin && <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
                  <span>I consent to RUET IoT Club processing this account information for community services and communication.</span>
                </label>}
                <div>
                  <label htmlFor="auth-password" className="text-sm font-medium">Password</label>
                  <input id="auth-password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
                  {!isLogin && <p className="mt-1 text-xs text-muted-foreground">Use at least 12 characters. Long passphrases are welcome.</p>}
                </div>
                {!isLogin && turnstileSiteKey && (
                  <TurnstileWidget siteKey={turnstileSiteKey} action="register" onToken={handleTurnstileToken} onError={handleTurnstileError} />
                )}
                <button type="submit" disabled={loading || (!isLogin && (!turnstileToken || !turnstileSiteKey))} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors glow-border disabled:opacity-50">
                  {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </button>
              </form>
            )}

            {isLogin && <p className="text-center text-sm mt-4"><Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link></p>}
            <p className="text-center text-sm text-muted-foreground mt-4">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setVerificationPending(false); setTurnstileToken(""); }} className="text-primary hover:underline">
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
