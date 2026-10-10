import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { apiRequest } from "@/lib/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Confirming your email address...");
  const token = searchParams.get("token") ?? "";

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This verification link is incomplete.");
      return;
    }
    void apiRequest("/auth/verify-email", { method: "POST", body: { token } })
      .then(() => { setState("success"); setMessage("Your email is verified. You can now sign in."); })
      .catch((error) => { setState("error"); setMessage(error instanceof Error ? error.message : "Verification failed."); });
  }, [token]);

  return <Layout><section className="py-24"><div className="container max-w-lg"><div className="rounded-xl glass p-8 text-center" role="status"><h1 className="font-display text-2xl font-bold">Email verification</h1><p className="mt-4 text-muted-foreground">{message}</p>{state !== "loading" && <Link to="/auth" className="inline-block mt-6 text-primary hover:underline">Go to sign in</Link>}</div></div></section></Layout>;
}
