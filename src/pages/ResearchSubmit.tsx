import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileUp, FlaskConical, ShieldCheck } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import TurnstileWidget from "@/components/TurnstileWidget";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

const inputClass = "w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-sm text-foreground shadow-inner shadow-black/10 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/[0.15]";

interface SubmissionResult {
  id: string; referenceCode: string; status: string; trackingToken: string; verificationRequired: boolean; message: string;
}

const ResearchSubmit = () => {
  const { user, csrfToken } = useAuth();
  const [siteKey, setSiteKey] = useState(import.meta.env.VITE_TURNSTILE_SITE_KEY || "");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [website, setWebsite] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [form, setForm] = useState({
    name: user?.displayName ?? "", email: user?.email ?? "", phone: "", institution: "", department: "",
    title: "", abstract: "", researchArea: "", keywords: "", problemStatement: "", objectives: "",
    researchQuestions: "", methodology: "", expectedContribution: "", expectedOutcome: "",
    datasets: "", hardware: "", software: "", iotComponents: "", aiMlComponents: "", experimentalSetup: "",
    principalInvestigator: user?.displayName ?? "", teamMembers: "", supervisor: "",
    estimatedBudget: "", fundingRequired: false, fundingSource: "", resources: "",
  });

  useEffect(() => {
    if (user) setForm((current) => ({ ...current, name: user.displayName, email: user.email, principalInvestigator: current.principalInvestigator || user.displayName }));
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
      const created = await apiRequest<SubmissionResult>("/submissions/research", {
        method: "POST", csrfToken: csrfToken ?? undefined,
        body: {
          submitter: { name: form.name, email: form.email, phone: form.phone || null, institution: form.institution || null, department: form.department || null },
          title: form.title, abstract: form.abstract, researchArea: form.researchArea,
          keywords: form.keywords.split(",").map((item) => item.trim()).filter(Boolean),
          problemStatement: form.problemStatement, objectives: form.objectives,
          researchQuestions: form.researchQuestions || null, methodology: form.methodology,
          expectedContribution: form.expectedContribution, expectedOutcome: form.expectedOutcome,
          technical: {
            datasets: form.datasets || null, hardware: form.hardware || null, software: form.software || null,
            iotComponents: form.iotComponents || null, aiMlComponents: form.aiMlComponents || null,
            experimentalSetup: form.experimentalSetup || null,
          },
          team: {
            principalInvestigator: form.principalInvestigator,
            members: form.teamMembers.split("\n").map((name) => name.trim()).filter(Boolean).map((name) => ({ name, affiliation: null })),
            supervisor: form.supervisor || null,
          },
          funding: { estimatedBudget: form.estimatedBudget || null, required: form.fundingRequired, source: form.fundingSource || null, resources: form.resources || null },
          website, turnstileToken,
        },
      });
      for (const file of files) {
        const body = new FormData(); body.set("file", file);
        await apiRequest(`/submissions/${created.id}/attachments`, { method: "POST", body, csrfToken: csrfToken ?? undefined, submissionToken: created.trackingToken });
      }
      setResult(created); toast.success("Research proposal submitted successfully."); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "The research proposal could not be submitted."); }
    finally { setBusy(false); }
  };

  if (result) {
    const trackingUrl = `/track-submission?reference=${encodeURIComponent(result.referenceCode)}&token=${encodeURIComponent(result.trackingToken)}`;
    return <Layout><SEO title="Research Proposal Received | RUET IoT Club" description="Research proposal confirmation." path="/research/submit" /><section className="py-24"><div className="container max-w-2xl"><div role="status" className="rounded-2xl glass p-8 text-center"><ShieldCheck className="mx-auto text-primary" size={48} /><h1 className="mt-4 font-display text-3xl font-bold">Research proposal received</h1><p className="mt-3 text-muted-foreground">{result.message}</p><div className="mt-6 rounded-lg border border-border bg-background/40 p-4"><span className="block text-xs uppercase tracking-wider text-muted-foreground">Submission reference</span><code className="mt-1 block text-lg text-primary">{result.referenceCode}</code></div>{result.verificationRequired && <p className="mt-4 text-sm text-amber-300">Verify your email before the proposal enters review.</p>}<Link to={trackingUrl} className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">Track submission</Link></div></div></section></Layout>;
  }

  return <Layout><SEO title="Submit Research Proposal | RUET IoT Club" description="Submit an IoT, embedded systems, AI, or interdisciplinary research proposal to RUET IoT Club." path="/research/submit" /><section className="py-20"><div className="container max-w-4xl"><div className="mb-10 text-center"><FlaskConical className="mx-auto text-primary" size={42} /><h1 className="mt-4 font-display text-3xl font-bold text-gradient">Submit Research Proposal</h1><p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Researchers, faculty, students, and external collaborators may submit. Guest proposals use secure email verification and private tracking.</p></div><form onSubmit={submit} className="space-y-6">
    <Section title="Submitter"><Grid><Field label="Name" required><input required minLength={2} maxLength={100} value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} /></Field><Field label="Email" required><input required type="email" maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} /></Field><Field label="Phone"><input type="tel" maxLength={32} value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} /></Field><Field label="Institution"><input maxLength={160} value={form.institution} onChange={(e) => update("institution", e.target.value)} className={inputClass} /></Field><Field label="Department"><input maxLength={160} value={form.department} onChange={(e) => update("department", e.target.value)} className={inputClass} /></Field></Grid></Section>
    <Section title="Research information"><Grid><Field label="Research title" required><input required minLength={3} maxLength={180} value={form.title} onChange={(e) => update("title", e.target.value)} className={inputClass} /></Field><Field label="Research area" required><input required minLength={2} maxLength={160} value={form.researchArea} onChange={(e) => update("researchArea", e.target.value)} className={inputClass} /></Field></Grid><Field label="Keywords" hint="Comma separated" required><input required value={form.keywords} onChange={(e) => update("keywords", e.target.value)} className={inputClass} /></Field><Field label="Abstract" required><textarea required minLength={50} maxLength={5000} rows={6} value={form.abstract} onChange={(e) => update("abstract", e.target.value)} className={inputClass} /></Field><Field label="Problem statement" required><textarea required minLength={20} maxLength={5000} rows={5} value={form.problemStatement} onChange={(e) => update("problemStatement", e.target.value)} className={inputClass} /></Field><Field label="Research objectives" required><textarea required minLength={10} maxLength={5000} rows={4} value={form.objectives} onChange={(e) => update("objectives", e.target.value)} className={inputClass} /></Field><Field label="Research questions"><textarea maxLength={5000} rows={4} value={form.researchQuestions} onChange={(e) => update("researchQuestions", e.target.value)} className={inputClass} /></Field><Field label="Proposed methodology" required><textarea required minLength={20} maxLength={8000} rows={6} value={form.methodology} onChange={(e) => update("methodology", e.target.value)} className={inputClass} /></Field><Field label="Expected contribution" required><textarea required minLength={10} maxLength={5000} rows={4} value={form.expectedContribution} onChange={(e) => update("expectedContribution", e.target.value)} className={inputClass} /></Field><Field label="Expected outcome" required><textarea required minLength={10} maxLength={5000} rows={4} value={form.expectedOutcome} onChange={(e) => update("expectedOutcome", e.target.value)} className={inputClass} /></Field></Section>
    <Section title="Technical requirements"><Grid>{([['datasets','Dataset requirements'],['hardware','Hardware requirements'],['software','Software / tools'],['iotComponents','IoT components'],['aiMlComponents','AI/ML components'],['experimentalSetup','Experimental setup']] as const).map(([key,label]) => <Field key={key} label={label}><textarea maxLength={key === 'experimentalSetup' ? 5000 : 3000} rows={3} value={form[key]} onChange={(e) => update(key, e.target.value)} className={inputClass} /></Field>)}</Grid></Section>
    <Section title="Research team"><Grid><Field label="Principal investigator / team leader" required><input required minLength={2} maxLength={100} value={form.principalInvestigator} onChange={(e) => update("principalInvestigator", e.target.value)} className={inputClass} /></Field><Field label="Supervisor / advisor"><input maxLength={160} value={form.supervisor} onChange={(e) => update("supervisor", e.target.value)} className={inputClass} /></Field></Grid><Field label="Team members" hint="One name per line"><textarea rows={4} value={form.teamMembers} onChange={(e) => update("teamMembers", e.target.value)} className={inputClass} /></Field></Section>
    <Section title="Funding and resources"><Grid><Field label="Estimated budget"><input maxLength={120} value={form.estimatedBudget} onChange={(e) => update("estimatedBudget", e.target.value)} className={inputClass} /></Field><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.fundingRequired} onChange={(e) => update("fundingRequired", e.target.checked)} />Funding is required</label><Field label="Funding source"><input maxLength={200} value={form.fundingSource} onChange={(e) => update("fundingSource", e.target.value)} className={inputClass} /></Field><Field label="Resource requirements"><textarea maxLength={3000} rows={3} value={form.resources} onChange={(e) => update("resources", e.target.value)} className={inputClass} /></Field></Grid></Section>
    <Section title="Attachments" hint="Proposal PDF and supporting PDF, DOC, DOCX, PPT, PPTX, or ZIP files; maximum 10 MB each."><label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm hover:border-primary/50"><FileUp className="text-primary" /><span>{files.length ? `${files.length} file(s) selected` : "Choose supporting files"}</span><input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.zip" className="sr-only" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} /></label></Section>
    <div className="absolute -left-[10000px]" aria-hidden="true"><label htmlFor="research-website">Website</label><input id="research-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
    <div className="rounded-xl glass p-6">{siteKey && <TurnstileWidget siteKey={siteKey} action="submission" onToken={onTurnstile} onError={() => toast.error("The security check could not load.")} />}<button disabled={busy || !siteKey || !turnstileToken} className="mt-4 w-full rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Submitting securely…" : "Submit Research Proposal"}</button><p className="mt-3 text-center text-xs text-muted-foreground">Your proposal is validated by the Worker, stored in D1, attachments are stored privately in R2, and review notifications are queued by email.</p></div>
  </form></div></section></Layout>;
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) { return <section className="rounded-xl glass p-6"><h2 className="font-display text-lg font-semibold">{title}</h2>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}<div className="mt-4 space-y-4">{children}</div></section>; }
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 md:grid-cols-2">{children}</div>; }
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}{hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}<span className="mt-1 block">{children}</span></label>; }

export default ResearchSubmit;
