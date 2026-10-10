import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileUp, Lightbulb, ShieldCheck } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import TurnstileWidget from "@/components/TurnstileWidget";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

const inputClass = "w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-sm text-foreground shadow-inner shadow-black/10 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/[0.15]";
const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

interface SubmissionResult {
  id: string;
  referenceCode: string;
  status: string;
  trackingToken: string;
  verificationRequired: boolean;
  message: string;
}

const ProjectSubmit = () => {
  const { user, csrfToken } = useAuth();
  const [siteKey, setSiteKey] = useState(import.meta.env.VITE_TURNSTILE_SITE_KEY || "");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [website, setWebsite] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [form, setForm] = useState({
    name: user?.displayName ?? "", email: user?.email ?? "", phone: "", institution: "", department: "",
    title: "", summary: "", category: "", proposedStatus: "PLANNED", proposedDuration: "",
    problemStatement: "", proposedSolution: "", objectives: "", expectedOutcomes: "",
    targetBeneficiaries: "", innovation: "", iot: "", hardware: "", sensors: "", microcontrollers: "",
    software: "", aiMl: "", communications: "", cloudPlatforms: "", teamType: "INDIVIDUAL",
    teamLeader: "", teamMembers: "", equipment: "", estimatedBudget: "", mentorship: "", laboratory: "",
    collaborationWanted: false, requiredExpertise: "", collaboratorCount: "", collaborationType: "",
  });

  useEffect(() => {
    if (user) setForm((current) => ({ ...current, name: user.displayName, email: user.email }));
  }, [user]);

  useEffect(() => {
    void apiRequest<{ turnstileSiteKey: string }>("/auth/config")
      .then((data) => setSiteKey(data.turnstileSiteKey))
      .catch(() => toast.error("The security check is temporarily unavailable."));
  }, []);

  const onTurnstile = useCallback((token: string) => setTurnstileToken(token), []);
  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!turnstileToken) { toast.error("Complete the security check first."); return; }
    setBusy(true);
    try {
      const created = await apiRequest<SubmissionResult>("/submissions/projects", {
        method: "POST",
        csrfToken: csrfToken ?? undefined,
        body: {
          submitter: { name: form.name, email: form.email, phone: form.phone || null, institution: form.institution || null, department: form.department || null },
          title: form.title, summary: form.summary, category: form.category,
          proposedStatus: form.proposedStatus, proposedDuration: form.proposedDuration || null,
          problemStatement: form.problemStatement, proposedSolution: form.proposedSolution,
          objectives: form.objectives, expectedOutcomes: form.expectedOutcomes,
          targetBeneficiaries: form.targetBeneficiaries || null, innovation: form.innovation || null,
          technologies: {
            iot: splitList(form.iot), hardware: splitList(form.hardware), sensors: splitList(form.sensors),
            microcontrollers: splitList(form.microcontrollers), software: splitList(form.software), aiMl: splitList(form.aiMl),
            communications: splitList(form.communications), cloudPlatforms: splitList(form.cloudPlatforms),
          },
          team: {
            type: form.teamType,
            leader: form.teamLeader || null,
            members: form.teamMembers.split("\n").map((name) => name.trim()).filter(Boolean).map((name) => ({ name, role: null })),
          },
          resources: { equipment: form.equipment || null, estimatedBudget: form.estimatedBudget || null, mentorship: form.mentorship || null, laboratory: form.laboratory || null },
          collaboration: {
            wanted: form.collaborationWanted,
            requiredExpertise: form.requiredExpertise || null,
            collaboratorCount: form.collaboratorCount ? Number(form.collaboratorCount) : null,
            type: form.collaborationType || null,
          },
          website,
          turnstileToken,
        },
      });
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        await apiRequest(`/submissions/${created.id}/attachments`, {
          method: "POST", body, csrfToken: csrfToken ?? undefined, submissionToken: created.trackingToken,
        });
      }
      setResult(created);
      toast.success("Project idea submitted successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The project proposal could not be submitted.");
    } finally { setBusy(false); }
  };

  if (result) {
    const trackingUrl = `/track-submission?reference=${encodeURIComponent(result.referenceCode)}&token=${encodeURIComponent(result.trackingToken)}`;
    return <Layout><SEO title="Project Proposal Received | RUET IoT Club" description="Project proposal confirmation." path="/projects/submit" /><section className="py-24"><div className="container max-w-2xl"><div role="status" className="rounded-2xl glass p-8 text-center"><ShieldCheck className="mx-auto text-primary" size={48} /><h1 className="mt-4 font-display text-3xl font-bold">Project idea received</h1><p className="mt-3 text-muted-foreground">{result.message}</p><div className="mt-6 rounded-lg border border-border bg-background/40 p-4"><span className="block text-xs uppercase tracking-wider text-muted-foreground">Submission reference</span><code className="mt-1 block text-lg text-primary">{result.referenceCode}</code></div>{result.verificationRequired && <p className="mt-4 text-sm text-amber-300">Check your email and verify the submission before review begins.</p>}<Link to={trackingUrl} className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">Track submission</Link></div></div></section></Layout>;
  }

  return <Layout><SEO title="Submit a Project Idea | RUET IoT Club" description="Submit an IoT, embedded systems, AI, or technology project proposal to RUET IoT Club." path="/projects/submit" /><section className="py-20"><div className="container max-w-4xl"><div className="mb-10 text-center"><Lightbulb className="mx-auto text-primary" size={42} /><h1 className="mt-4 font-display text-3xl font-bold text-gradient">Submit a Project Idea</h1><p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Students, researchers, innovators, and external collaborators are welcome. Guest submissions are verified by email and receive a private tracking link.</p></div><form onSubmit={submit} className="space-y-6">
    <FormSection title="Submitter"><div className="grid gap-4 md:grid-cols-2"><Field label="Name" required><input required minLength={2} maxLength={100} value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} /></Field><Field label="Email" required><input required type="email" maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} /></Field><Field label="Phone"><input type="tel" maxLength={32} value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} /></Field><Field label="Institution"><input maxLength={160} value={form.institution} onChange={(e) => update("institution", e.target.value)} className={inputClass} /></Field><Field label="Department"><input maxLength={160} value={form.department} onChange={(e) => update("department", e.target.value)} className={inputClass} /></Field></div></FormSection>
    <FormSection title="Basic information"><div className="grid gap-4 md:grid-cols-2"><Field label="Project title" required><input required minLength={3} maxLength={180} value={form.title} onChange={(e) => update("title", e.target.value)} className={inputClass} /></Field><Field label="Category" required><input required minLength={2} maxLength={100} value={form.category} onChange={(e) => update("category", e.target.value)} className={inputClass} /></Field><Field label="Proposed status"><select value={form.proposedStatus} onChange={(e) => update("proposedStatus", e.target.value)} className={inputClass}><option value="PLANNED">Planned</option><option value="PROTOTYPE">Prototype</option><option value="ONGOING">Ongoing</option></select></Field><Field label="Proposed duration"><input maxLength={100} placeholder="e.g. 4 months" value={form.proposedDuration} onChange={(e) => update("proposedDuration", e.target.value)} className={inputClass} /></Field></div><Field label="Short project summary" required><textarea required minLength={20} maxLength={1200} rows={4} value={form.summary} onChange={(e) => update("summary", e.target.value)} className={inputClass} /></Field></FormSection>
    <FormSection title="Project description"><div className="grid gap-4"><Field label="Problem statement" required><textarea required minLength={20} maxLength={5000} rows={5} value={form.problemStatement} onChange={(e) => update("problemStatement", e.target.value)} className={inputClass} /></Field><Field label="Proposed solution" required><textarea required minLength={20} maxLength={5000} rows={5} value={form.proposedSolution} onChange={(e) => update("proposedSolution", e.target.value)} className={inputClass} /></Field><Field label="Objectives" required><textarea required minLength={10} maxLength={5000} rows={4} value={form.objectives} onChange={(e) => update("objectives", e.target.value)} className={inputClass} /></Field><Field label="Expected outcomes" required><textarea required minLength={10} maxLength={5000} rows={4} value={form.expectedOutcomes} onChange={(e) => update("expectedOutcomes", e.target.value)} className={inputClass} /></Field><Field label="Target users / beneficiaries"><textarea maxLength={2000} rows={3} value={form.targetBeneficiaries} onChange={(e) => update("targetBeneficiaries", e.target.value)} className={inputClass} /></Field><Field label="Innovation / uniqueness"><textarea maxLength={3000} rows={3} value={form.innovation} onChange={(e) => update("innovation", e.target.value)} className={inputClass} /></Field></div></FormSection>
    <FormSection title="Technical information" hint="Use commas to separate multiple items."><div className="grid gap-4 md:grid-cols-2">{([['iot','IoT technologies'],['hardware','Hardware'],['sensors','Sensors'],['microcontrollers','Microcontrollers'],['software','Software'],['aiMl','AI/ML'],['communications','Communication technologies'],['cloudPlatforms','Cloud/platforms']] as const).map(([key,label]) => <Field key={key} label={label}><input maxLength={1000} value={form[key]} onChange={(e) => update(key, e.target.value)} className={inputClass} /></Field>)}</div></FormSection>
    <FormSection title="Team"><div className="grid gap-4 md:grid-cols-2"><Field label="Submission type"><select value={form.teamType} onChange={(e) => update("teamType", e.target.value)} className={inputClass}><option value="INDIVIDUAL">Individual</option><option value="TEAM">Team</option></select></Field><Field label="Team leader"><input maxLength={100} value={form.teamLeader} onChange={(e) => update("teamLeader", e.target.value)} className={inputClass} /></Field></div><Field label="Team members" hint="One name per line"><textarea rows={4} value={form.teamMembers} onChange={(e) => update("teamMembers", e.target.value)} className={inputClass} /></Field></FormSection>
    <FormSection title="Resources"><div className="grid gap-4 md:grid-cols-2"><Field label="Required equipment"><textarea maxLength={3000} rows={3} value={form.equipment} onChange={(e) => update("equipment", e.target.value)} className={inputClass} /></Field><Field label="Estimated budget"><input maxLength={120} value={form.estimatedBudget} onChange={(e) => update("estimatedBudget", e.target.value)} className={inputClass} /></Field><Field label="Required mentorship"><textarea maxLength={1000} rows={3} value={form.mentorship} onChange={(e) => update("mentorship", e.target.value)} className={inputClass} /></Field><Field label="Laboratory / resources"><textarea maxLength={1000} rows={3} value={form.laboratory} onChange={(e) => update("laboratory", e.target.value)} className={inputClass} /></Field></div></FormSection>
    <FormSection title="Collaboration"><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.collaborationWanted} onChange={(e) => update("collaborationWanted", e.target.checked)} />I am looking for collaborators.</label>{form.collaborationWanted && <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Required expertise"><textarea maxLength={2000} rows={3} value={form.requiredExpertise} onChange={(e) => update("requiredExpertise", e.target.value)} className={inputClass} /></Field><Field label="Number of collaborators"><input type="number" min={1} max={100} value={form.collaboratorCount} onChange={(e) => update("collaboratorCount", e.target.value)} className={inputClass} /></Field><Field label="Collaboration type"><input maxLength={160} value={form.collaborationType} onChange={(e) => update("collaborationType", e.target.value)} className={inputClass} /></Field></div>}</FormSection>
    <FormSection title="Attachments" hint="PDF, DOC, DOCX, PPT, PPTX, or ZIP. Maximum 10 MB per file."><label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm hover:border-primary/50"><FileUp className="text-primary" /><span>{files.length ? `${files.length} file(s) selected` : "Choose supporting files"}</span><input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.zip" className="sr-only" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} /></label></FormSection>
    <div className="absolute -left-[10000px]" aria-hidden="true"><label htmlFor="project-website">Website</label><input id="project-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
    <div className="rounded-xl glass p-6">{siteKey && <TurnstileWidget siteKey={siteKey} action="submission" onToken={onTurnstile} onError={() => toast.error("The security check could not load.")} />}<button disabled={busy || !siteKey || !turnstileToken} className="mt-4 w-full rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Submitting securely…" : "Submit Project Idea"}</button><p className="mt-3 text-center text-xs text-muted-foreground">The server validates the form, stores it in D1, protects attachments in R2, notifies administrators, and emails your tracking reference.</p></div>
  </form></div></section></Layout>;
};

function FormSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <section className="rounded-xl glass p-6"><h2 className="font-display text-lg font-semibold">{title}</h2>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}<div className="mt-4 space-y-4">{children}</div></section>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}{hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}<span className="mt-1 block">{children}</span></label>;
}

export default ProjectSubmit;
