import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy, Save, Send, ShieldCheck, Smartphone, Users } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import {
  commaList,
  firstValidationMessage,
  membershipClientSchema,
  timeCommitments,
  volunteerClientSchema,
} from "@/lib/membership";
import { toast } from "sonner";

interface MembershipType {
  typeKey: string;
  name: string;
  description: string;
  termMonths: number;
  paymentRequired: number;
  feeMinor: number | null;
  currency: string;
}

interface VolunteerProgram {
  programKey: string;
  name: string;
  description: string;
  termMonths: number;
}

interface MembershipPaymentSettings {
  phone: string;
  paymentNumber: string;
  paymentMethods: Array<"BKASH" | "NAGAD">;
  paymentInstructions: string;
}

interface ApplicationSummary {
  applicationId: string;
  status: string;
  fullName?: string | null;
  phone?: string | null;
  studentId?: string | null;
  department?: string | null;
  batch?: string | null;
  academicSession?: string | null;
  organization?: string | null;
  skillsJson?: string;
  interestsJson?: string;
  experience?: string | null;
  motivation?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  timeCommitment?: string | null;
  declarationAccepted?: number;
  membershipTypeKey?: string;
  volunteerProgramKey?: string;
}

const departments = ["CSE", "EEE", "ECE", "ME", "CE", "IPE", "MTE", "URP", "Arch", "GCE", "BECM", "CFPE"];
const inputClass = "w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-sm text-foreground shadow-inner shadow-black/10 transition placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/[0.15]";

const emptyMembership = {
  membershipTypeKey: "CLUB_MEMBER",
  fullName: "",
  phone: "",
  studentId: "",
  department: "",
  batch: "",
  academicSession: "",
  skills: "",
  interests: "",
  experience: "",
  motivation: "",
  githubUrl: "",
  linkedinUrl: "",
  portfolioUrl: "",
  timeCommitment: "",
  declarationAccepted: false,
  paymentMethod: "BKASH" as "BKASH" | "NAGAD",
  payerPhone: "",
  transactionReference: "",
};

const emptyVolunteer = {
  volunteerProgramKey: "COMMUNITY_VOLUNTEER",
  fullName: "",
  phone: "",
  organization: "",
  department: "",
  batch: "",
  skills: "",
  interests: "",
  experience: "",
  motivation: "",
  githubUrl: "",
  linkedinUrl: "",
  portfolioUrl: "",
  timeCommitment: "",
  declarationAccepted: false,
};

function parseStoredList(value?: string): string {
  if (!value) return "";
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").join(", ") : "";
  } catch {
    return "";
  }
}

export default function JoinUs() {
  const { user, loading, csrfToken } = useAuth();
  const [mode, setMode] = useState<"membership" | "volunteer">("membership");
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<MembershipPaymentSettings | null>(null);
  const [volunteerPrograms, setVolunteerPrograms] = useState<VolunteerProgram[]>([]);
  const [membershipApplication, setMembershipApplication] = useState<ApplicationSummary | null>(null);
  const [volunteerApplication, setVolunteerApplication] = useState<ApplicationSummary | null>(null);
  const [membershipForm, setMembershipForm] = useState({ ...emptyMembership });
  const [volunteerForm, setVolunteerForm] = useState({ ...emptyVolunteer });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<"membership" | "volunteer" | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      apiRequest<MembershipType[]>("/membership/types"),
      apiRequest<VolunteerProgram[]>("/volunteers/programs"),
      apiRequest<{ applications: ApplicationSummary[] }>("/membership/me"),
      apiRequest<{ applications: ApplicationSummary[] }>("/volunteers/me"),
      apiRequest<{ membership: MembershipPaymentSettings }>("/settings/public"),
    ]).then(([types, programs, membershipWorkspace, volunteerWorkspace, settings]) => {
      setMembershipTypes(types);
      setVolunteerPrograms(programs);
      setPaymentSettings(settings.membership);
      const memberApplication = membershipWorkspace.applications.find((item) => ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PAYMENT_PENDING", "PAYMENT_VERIFICATION"].includes(item.status)) ?? null;
      const communityApplication = volunteerWorkspace.applications.find((item) => ["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(item.status)) ?? null;
      setMembershipApplication(memberApplication);
      setVolunteerApplication(communityApplication);
      setMembershipForm((current) => ({
        ...current,
        fullName: memberApplication?.fullName ?? (current.fullName || user.displayName),
        phone: memberApplication?.phone ?? current.phone,
        studentId: memberApplication?.studentId ?? current.studentId,
        department: memberApplication?.department ?? current.department,
        batch: memberApplication?.batch ?? current.batch,
        academicSession: memberApplication?.academicSession ?? current.academicSession,
        skills: parseStoredList(memberApplication?.skillsJson) || current.skills,
        interests: parseStoredList(memberApplication?.interestsJson) || current.interests,
        experience: memberApplication?.experience ?? current.experience,
        motivation: memberApplication?.motivation ?? current.motivation,
        githubUrl: memberApplication?.githubUrl ?? current.githubUrl,
        linkedinUrl: memberApplication?.linkedinUrl ?? current.linkedinUrl,
        portfolioUrl: memberApplication?.portfolioUrl ?? current.portfolioUrl,
        timeCommitment: memberApplication?.timeCommitment ?? current.timeCommitment,
        declarationAccepted: memberApplication?.declarationAccepted === 1 || current.declarationAccepted,
        membershipTypeKey: memberApplication?.membershipTypeKey ?? types[0]?.typeKey ?? current.membershipTypeKey,
        paymentMethod: settings.membership.paymentMethods.includes(current.paymentMethod)
          ? current.paymentMethod
          : (settings.membership.paymentMethods[0] ?? "BKASH"),
      }));
      setVolunteerForm((current) => ({
        ...current,
        fullName: communityApplication?.fullName ?? (current.fullName || user.displayName),
        phone: communityApplication?.phone ?? current.phone,
        organization: communityApplication?.organization ?? current.organization,
        department: communityApplication?.department ?? current.department,
        batch: communityApplication?.batch ?? current.batch,
        skills: parseStoredList(communityApplication?.skillsJson) || current.skills,
        interests: parseStoredList(communityApplication?.interestsJson) || current.interests,
        experience: communityApplication?.experience ?? current.experience,
        motivation: communityApplication?.motivation ?? current.motivation,
        githubUrl: communityApplication?.githubUrl ?? current.githubUrl,
        linkedinUrl: communityApplication?.linkedinUrl ?? current.linkedinUrl,
        portfolioUrl: communityApplication?.portfolioUrl ?? current.portfolioUrl,
        timeCommitment: communityApplication?.timeCommitment ?? current.timeCommitment,
        declarationAccepted: communityApplication?.declarationAccepted === 1 || current.declarationAccepted,
        volunteerProgramKey: communityApplication?.volunteerProgramKey ?? programs[0]?.programKey ?? current.volunteerProgramKey,
      }));
    }).catch((error) => toast.error(error instanceof Error ? error.message : "Could not load application data."));
  }, [refresh, user]);

  const activeApplication = mode === "membership" ? membershipApplication : volunteerApplication;
  const locked = activeApplication !== null && activeApplication.status !== "DRAFT";
  const selectedType = useMemo(
    () => membershipTypes.find((item) => item.typeKey === membershipForm.membershipTypeKey),
    [membershipForm.membershipTypeKey, membershipTypes],
  );

  const membershipPayload = (includePayment = true) => ({
    membershipTypeKey: membershipForm.membershipTypeKey,
    fullName: membershipForm.fullName,
    phone: membershipForm.phone,
    studentId: membershipForm.studentId,
    department: membershipForm.department,
    batch: membershipForm.batch,
    ...(membershipForm.academicSession ? { academicSession: membershipForm.academicSession } : {}),
    skills: commaList(membershipForm.skills),
    interests: commaList(membershipForm.interests),
    ...(membershipForm.experience ? { experience: membershipForm.experience } : {}),
    motivation: membershipForm.motivation,
    ...(membershipForm.githubUrl ? { githubUrl: membershipForm.githubUrl } : {}),
    ...(membershipForm.linkedinUrl ? { linkedinUrl: membershipForm.linkedinUrl } : {}),
    ...(membershipForm.portfolioUrl ? { portfolioUrl: membershipForm.portfolioUrl } : {}),
    timeCommitment: membershipForm.timeCommitment,
    declarationAccepted: membershipForm.declarationAccepted,
    ...(includePayment && selectedType?.paymentRequired === 1 ? {
      payment: {
        paymentMethod: membershipForm.paymentMethod,
        payerPhone: membershipForm.payerPhone,
        transactionReference: membershipForm.transactionReference,
      },
    } : {}),
  });

  const volunteerPayload = () => ({
    volunteerProgramKey: volunteerForm.volunteerProgramKey,
    fullName: volunteerForm.fullName,
    phone: volunteerForm.phone,
    ...(volunteerForm.organization ? { organization: volunteerForm.organization } : {}),
    ...(volunteerForm.department ? { department: volunteerForm.department } : {}),
    ...(volunteerForm.batch ? { batch: volunteerForm.batch } : {}),
    skills: commaList(volunteerForm.skills),
    interests: commaList(volunteerForm.interests),
    ...(volunteerForm.experience ? { experience: volunteerForm.experience } : {}),
    motivation: volunteerForm.motivation,
    ...(volunteerForm.githubUrl ? { githubUrl: volunteerForm.githubUrl } : {}),
    ...(volunteerForm.linkedinUrl ? { linkedinUrl: volunteerForm.linkedinUrl } : {}),
    ...(volunteerForm.portfolioUrl ? { portfolioUrl: volunteerForm.portfolioUrl } : {}),
    timeCommitment: volunteerForm.timeCommitment,
    declarationAccepted: volunteerForm.declarationAccepted,
  });

  const saveDraft = async () => {
    if (!csrfToken) return;
    setBusy(true);
    try {
      if (mode === "membership") {
        const full = membershipPayload(false);
        const draft = Object.fromEntries(Object.entries(full).filter(([, value]) => value !== "" && (!Array.isArray(value) || value.length > 0)));
        await apiRequest("/membership/draft", { method: "PUT", csrfToken, idempotencyKey: crypto.randomUUID(), body: draft });
      } else {
        const full = volunteerPayload();
        const draft = Object.fromEntries(Object.entries(full).filter(([, value]) => value !== "" && (!Array.isArray(value) || value.length > 0)));
        await apiRequest("/volunteers/draft", { method: "PUT", csrfToken, idempotencyKey: crypto.randomUUID(), body: draft });
      }
      toast.success("Draft saved securely.");
      setRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the draft.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!csrfToken) return;
    if (mode === "membership" && selectedType?.paymentRequired === 1 && !paymentSettings) {
      toast.error("Payment settings are temporarily unavailable. Please refresh before submitting.");
      return;
    }
    if (mode === "membership" && selectedType?.paymentRequired === 1 && paymentSettings
      && !paymentSettings.paymentMethods.includes(membershipForm.paymentMethod)) {
      toast.error("Choose an enabled payment method.");
      return;
    }
    const payload = mode === "membership" ? membershipPayload() : volunteerPayload();
    const validation = mode === "membership" ? membershipClientSchema.safeParse(payload) : volunteerClientSchema.safeParse(payload);
    if (validation.success === false) {
      toast.error(firstValidationMessage(validation));
      return;
    }
    setBusy(true);
    try {
      await apiRequest(mode === "membership" ? "/membership/apply" : "/volunteers/apply", {
        method: "POST", csrfToken, idempotencyKey: crypto.randomUUID(), body: validation.data,
      });
      setSubmitted(mode);
      toast.success(mode === "membership" && selectedType?.paymentRequired === 1
        ? "Membership application and payment evidence submitted."
        : `${mode === "membership" ? "Membership" : "Volunteer"} application submitted.`);
      setRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the application.");
    } finally {
      setBusy(false);
    }
  };

  const copyPaymentNumber = async () => {
    if (!paymentSettings) return;
    try {
      await navigator.clipboard.writeText(paymentSettings.paymentNumber);
      toast.success("Payment number copied.");
    } catch {
      toast.error("Could not copy the number. Select and copy it manually.");
    }
  };

  const cancelApplication = async () => {
    if (!activeApplication || !csrfToken) return;
    const reason = window.prompt("Why are you cancelling this application?");
    if (!reason) return;
    setBusy(true);
    try {
      await apiRequest(`/${mode === "membership" ? "membership" : "volunteers"}/applications/${activeApplication.applicationId}/cancel`, {
        method: "POST", csrfToken, idempotencyKey: crypto.randomUUID(), body: { reason },
      });
      toast.success("Application cancelled. Its history has been preserved.");
      setRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel the application.");
    } finally { setBusy(false); }
  };

  if (loading) return <Layout><section className="py-24"><div className="container">Loading account...</div></section></Layout>;

  if (!user) {
    return <Layout><SEO title="Join RUET IoT Club" description="Apply for club membership or the community volunteer program." path="/join" /><section className="py-24"><div className="container max-w-xl rounded-xl glass p-8 text-center"><Users className="mx-auto text-primary" size={42} /><h1 className="mt-4 text-2xl font-bold">Sign in before applying</h1><p className="mt-3 text-muted-foreground">A verified account protects your application history and status.</p><Link to="/auth" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Sign in or create an account</Link></div></section></Layout>;
  }

  if (submitted) {
    return <Layout><section className="py-24"><div className="container max-w-xl rounded-xl glass p-8 text-center"><CheckCircle2 className="mx-auto text-green-400" size={56} /><h1 className="mt-4 text-2xl font-bold">Application received</h1><p className="mt-3 text-muted-foreground">Your {submitted} application is now read-only and available in your membership workspace.{submitted === "membership" && selectedType?.paymentRequired === 1 ? " Your payment evidence was submitted for independent finance verification." : ""} An authorized reviewer—not the browser—controls later workflow decisions.</p><Link to="/dashboard/membership" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Open membership workspace</Link></div></section></Layout>;
  }

  return (
    <Layout>
      <SEO title="Join RUET IoT Club" description="Apply securely for RUET IoT Club membership or community volunteering." path="/join" />
      <section className="py-20">
        <div className="container">
          <SectionHeading level={1} title="Join the RUET IoT community" subtitle="Choose a path, save a private draft, and submit when your information is complete." />
          <div className="mx-auto mb-8 grid max-w-2xl grid-cols-2 rounded-xl border border-border bg-secondary/50 p-1">
            <button type="button" onClick={() => setMode("membership")} className={`rounded-lg px-4 py-3 text-sm font-semibold ${mode === "membership" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Club membership</button>
            <button type="button" onClick={() => setMode("volunteer")} className={`rounded-lg px-4 py-3 text-sm font-semibold ${mode === "volunteer" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Community volunteer</button>
          </div>

          {activeApplication && <div className="mx-auto mb-6 max-w-2xl rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Current application: {activeApplication.status.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">Reference {activeApplication.applicationId}</p></div>{["DRAFT", "SUBMITTED"].includes(activeApplication.status) && <button type="button" disabled={busy} onClick={() => void cancelApplication()} className="text-sm text-destructive hover:underline">Cancel application</button>}</div></div>}

          {locked ? (
            <div className="mx-auto max-w-2xl rounded-xl glass p-8 text-center"><ShieldCheck className="mx-auto text-primary" size={44} /><h2 className="mt-4 text-xl font-bold">Application is locked for review</h2><p className="mt-2 text-muted-foreground">The application and its payment evidence were submitted together. Finance verification, approval, and identity issuance remain separate authorized decisions.</p><Link to="/dashboard/membership" className="mt-5 inline-block text-primary hover:underline">View complete history</Link></div>
          ) : (
            <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
              <section className="rounded-xl glass p-6 space-y-4">
                <h2 className="font-display text-sm font-bold tracking-wider text-primary">Application path</h2>
                {mode === "membership" ? <select className={inputClass} value={membershipForm.membershipTypeKey} onChange={(event) => setMembershipForm({ ...membershipForm, membershipTypeKey: event.target.value })}>{membershipTypes.map((item) => <option key={item.typeKey} value={item.typeKey}>{item.name} · {item.termMonths} months</option>)}</select> : <select className={inputClass} value={volunteerForm.volunteerProgramKey} onChange={(event) => setVolunteerForm({ ...volunteerForm, volunteerProgramKey: event.target.value })}>{volunteerPrograms.map((item) => <option key={item.programKey} value={item.programKey}>{item.name} · {item.termMonths} months</option>)}</select>}
                <p className="text-xs text-muted-foreground">{mode === "membership" ? selectedType?.description : volunteerPrograms.find((item) => item.programKey === volunteerForm.volunteerProgramKey)?.description}</p>
                {mode === "membership" && selectedType?.paymentRequired === 1 && <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">Payment evidence is submitted securely with this application and verified separately by an authorized finance reviewer.</p>}
              </section>

              {mode === "membership" && selectedType?.paymentRequired === 1 && (
                <section className="rounded-xl glass p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Smartphone className="mt-0.5 shrink-0 text-primary" size={20} />
                    <div>
                      <h2 className="font-display text-sm font-bold tracking-wider text-primary">Membership payment</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Send the exact server-configured fee, then submit the transaction evidence with this application.</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/50 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount and receiver</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold">{selectedType.feeMinor == null ? "Fee unavailable" : new Intl.NumberFormat("en-BD", { style: "currency", currency: selectedType.currency }).format(selectedType.feeMinor / 100)}</p>
                        <p className="font-mono text-xl font-bold tracking-wide">{paymentSettings?.paymentNumber ?? "Loading…"}</p>
                      </div>
                      <button type="button" disabled={!paymentSettings} onClick={() => void copyPaymentNumber()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"><Copy size={15} /> Copy</button>
                    </div>
                  </div>
                  <fieldset>
                    <legend className="text-sm font-medium">Payment method</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(paymentSettings?.paymentMethods ?? []).map((method) => <button key={method} type="button" aria-pressed={membershipForm.paymentMethod === method} onClick={() => setMembershipForm({ ...membershipForm, paymentMethod: method })} className={`rounded-lg border px-4 py-3 text-sm font-semibold ${membershipForm.paymentMethod === method ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/60 text-muted-foreground"}`}>{method === "BKASH" ? "bKash" : "Nagad"}</button>)}
                    </div>
                  </fieldset>
                  <label className="block text-sm font-medium">Sender mobile number<input required inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" pattern="(?:\+?88)?01[3-9][0-9]{8}" value={membershipForm.payerPhone} onChange={(event) => setMembershipForm({ ...membershipForm, payerPhone: event.target.value })} className={`${inputClass} mt-2`} /></label>
                  <label className="block text-sm font-medium">Transaction ID<input required minLength={6} maxLength={64} autoCapitalize="characters" placeholder="Enter the bKash or Nagad transaction ID" value={membershipForm.transactionReference} onChange={(event) => setMembershipForm({ ...membershipForm, transactionReference: event.target.value })} className={`${inputClass} mt-2`} /></label>
                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">{paymentSettings?.paymentInstructions} Never share your PIN or OTP. Submission does not automatically verify or approve payment.</p>
                </section>
              )}

              <section className="rounded-xl glass p-6 space-y-4">
                <h2 className="font-display text-sm font-bold tracking-wider text-primary">Personal information</h2>
                <div className="grid gap-4 md:grid-cols-2"><input className={inputClass} required placeholder="Full name" value={mode === "membership" ? membershipForm.fullName : volunteerForm.fullName} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, fullName: event.target.value }) : setVolunteerForm({ ...volunteerForm, fullName: event.target.value })} /><input className={inputClass} required placeholder="Phone number" value={mode === "membership" ? membershipForm.phone : volunteerForm.phone} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, phone: event.target.value }) : setVolunteerForm({ ...volunteerForm, phone: event.target.value })} /></div>
                <input className={inputClass} value={user.email} disabled aria-label="Verified account email" />
                {mode === "membership" ? <div className="grid gap-4 md:grid-cols-2"><input className={inputClass} required placeholder="Student ID" value={membershipForm.studentId} onChange={(event) => setMembershipForm({ ...membershipForm, studentId: event.target.value })} /><select className={inputClass} required value={membershipForm.department} onChange={(event) => setMembershipForm({ ...membershipForm, department: event.target.value })}><option value="">Department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select><input className={inputClass} required placeholder="Batch (for example 21)" value={membershipForm.batch} onChange={(event) => setMembershipForm({ ...membershipForm, batch: event.target.value })} /><input className={inputClass} placeholder="Academic session (optional)" value={membershipForm.academicSession} onChange={(event) => setMembershipForm({ ...membershipForm, academicSession: event.target.value })} /></div> : <div className="grid gap-4 md:grid-cols-2"><input className={inputClass} placeholder="Organization (optional)" value={volunteerForm.organization} onChange={(event) => setVolunteerForm({ ...volunteerForm, organization: event.target.value })} /><input className={inputClass} placeholder="Department (optional)" value={volunteerForm.department} onChange={(event) => setVolunteerForm({ ...volunteerForm, department: event.target.value })} /><input className={inputClass} placeholder="Batch (optional)" value={volunteerForm.batch} onChange={(event) => setVolunteerForm({ ...volunteerForm, batch: event.target.value })} /></div>}
              </section>

              <section className="rounded-xl glass p-6 space-y-4">
                <h2 className="font-display text-sm font-bold tracking-wider text-primary">Skills and motivation</h2>
                <input className={inputClass} required placeholder="Skills, separated by commas" value={mode === "membership" ? membershipForm.skills : volunteerForm.skills} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, skills: event.target.value }) : setVolunteerForm({ ...volunteerForm, skills: event.target.value })} />
                <input className={inputClass} required placeholder="Interests, separated by commas" value={mode === "membership" ? membershipForm.interests : volunteerForm.interests} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, interests: event.target.value }) : setVolunteerForm({ ...volunteerForm, interests: event.target.value })} />
                <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Relevant experience (optional)" value={mode === "membership" ? membershipForm.experience : volunteerForm.experience} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, experience: event.target.value }) : setVolunteerForm({ ...volunteerForm, experience: event.target.value })} />
                <textarea className={`${inputClass} resize-none`} rows={4} required placeholder="Why do you want to join?" value={mode === "membership" ? membershipForm.motivation : volunteerForm.motivation} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, motivation: event.target.value }) : setVolunteerForm({ ...volunteerForm, motivation: event.target.value })} />
                <select className={inputClass} required value={mode === "membership" ? membershipForm.timeCommitment : volunteerForm.timeCommitment} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, timeCommitment: event.target.value }) : setVolunteerForm({ ...volunteerForm, timeCommitment: event.target.value })}><option value="">Weekly time commitment</option>{timeCommitments.map((item) => <option key={item}>{item}</option>)}</select>
              </section>

              <section className="rounded-xl glass p-6 space-y-4">
                <h2 className="font-display text-sm font-bold tracking-wider text-primary">Professional links</h2>
                <input className={inputClass} type="url" placeholder="GitHub URL (optional)" value={mode === "membership" ? membershipForm.githubUrl : volunteerForm.githubUrl} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, githubUrl: event.target.value }) : setVolunteerForm({ ...volunteerForm, githubUrl: event.target.value })} />
                <input className={inputClass} type="url" placeholder="LinkedIn URL (optional)" value={mode === "membership" ? membershipForm.linkedinUrl : volunteerForm.linkedinUrl} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, linkedinUrl: event.target.value }) : setVolunteerForm({ ...volunteerForm, linkedinUrl: event.target.value })} />
                <input className={inputClass} type="url" placeholder="Portfolio URL (optional)" value={mode === "membership" ? membershipForm.portfolioUrl : volunteerForm.portfolioUrl} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, portfolioUrl: event.target.value }) : setVolunteerForm({ ...volunteerForm, portfolioUrl: event.target.value })} />
                <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm"><input type="checkbox" className="mt-1" checked={mode === "membership" ? membershipForm.declarationAccepted : volunteerForm.declarationAccepted} onChange={(event) => mode === "membership" ? setMembershipForm({ ...membershipForm, declarationAccepted: event.target.checked }) : setVolunteerForm({ ...volunteerForm, declarationAccepted: event.target.checked })} /><span>I confirm that this information is accurate and consent to its use for application review and program administration.</span></label>
              </section>

              <div className="grid gap-3 sm:grid-cols-2"><button type="button" disabled={busy} onClick={() => void saveDraft()} className="flex items-center justify-center gap-2 rounded-lg border border-primary px-5 py-3 font-semibold text-primary disabled:opacity-50"><Save size={18} /> Save private draft</button><button disabled={busy || (mode === "membership" && selectedType?.paymentRequired === 1 && !paymentSettings)} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"><Send size={18} /> {mode === "membership" && selectedType?.paymentRequired === 1 ? "Submit application & payment" : "Submit application"}</button></div>
            </motion.form>
          )}
        </div>
      </section>
    </Layout>
  );
}
