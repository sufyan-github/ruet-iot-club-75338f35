import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { apiRequest } from "@/lib/api";

const VerifySubmission = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your submission email…");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setMessage("The verification link is incomplete."); return; }
    void apiRequest<{ verified: boolean; referenceCode: string }>("/submissions/verify", { method: "POST", body: { token } })
      .then((result) => { setReference(result.referenceCode); setState("success"); setMessage("Email verified. Your submission is now in the review queue."); })
      .catch((error) => { setState("error"); setMessage(error instanceof Error ? error.message : "The verification link could not be accepted."); });
  }, [token]);

  return <Layout><SEO title="Verify Submission | RUET IoT Club" description="Verify a guest submission email." path="/verify-submission" /><section className="py-24"><div className="container max-w-xl"><div className="rounded-2xl glass p-8 text-center" role="status">{state === "loading" ? <Loader2 className="mx-auto animate-spin text-primary" size={42} /> : state === "success" ? <CheckCircle2 className="mx-auto text-emerald-400" size={48} /> : <XCircle className="mx-auto text-destructive" size={48} />}<h1 className="mt-4 font-display text-2xl font-bold">{state === "success" ? "Submission verified" : state === "error" ? "Verification unavailable" : "Verifying submission"}</h1><p className="mt-3 text-muted-foreground">{message}</p>{reference && <code className="mt-4 block text-primary">{reference}</code>}<div className="mt-6 flex justify-center gap-3"><Link to="/" className="rounded-lg border border-border px-4 py-2 text-sm">Home</Link><Link to="/track-submission" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Track a submission</Link></div></div></div></section></Layout>;
};

export default VerifySubmission;
