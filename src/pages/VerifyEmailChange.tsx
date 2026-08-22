import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { apiRequest } from "@/lib/api";

export default function VerifyEmailChange() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Confirming your new email address...");
  const [complete, setComplete] = useState(false);
  const token = searchParams.get("token") ?? "";
  useEffect(() => {
    if (!token) { setMessage("This email-change link is incomplete."); setComplete(true); return; }
    void apiRequest("/auth/change-email/verify", { method: "POST", body: { token } })
      .then(() => setMessage("Your email was changed. For security, sign in again on every device."))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Email change failed."))
      .finally(() => setComplete(true));
  }, [token]);
  return <Layout><section className="py-24"><div className="container max-w-lg"><div className="rounded-xl glass p-8 text-center" role="status"><h1 className="font-display text-2xl font-bold">Email change</h1><p className="mt-4 text-muted-foreground">{message}</p>{complete && <Link to="/auth" className="inline-block mt-6 text-primary hover:underline">Go to sign in</Link>}</div></div></section></Layout>;
}
