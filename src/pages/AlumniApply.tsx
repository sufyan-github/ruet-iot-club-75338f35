import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import TurnstileWidget from "@/components/TurnstileWidget";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

const inputClass = "w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-sm text-foreground shadow-inner shadow-black/10 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/[0.15]";
const blank = { phone: "", institution: "Rajshahi University of Engineering & Technology", department: "", studentId: "", batch: "", graduationYear: "", formerClubPosition: "", executiveYear: "", membershipYear: "", linkedin: "", github: "", portfolio: "", organization: "", designation: "", industry: "", country: "Bangladesh", city: "", professionalWebsite: "", yearJoined: "", role: "", majorContributions: "", memorableActivities: "" };

export default function AlumniApply() {
  const { user, loading, csrfToken } = useAuth();
  const [form, setForm] = useState(blank);
  const [photo, setPhoto] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [siteKey, setSiteKey] = useState(import.meta.env.VITE_TURNSTILE_SITE_KEY || "");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const update = (field: keyof typeof blank, value: string) => setForm((current) => ({ ...current, [field]: value }));
  useEffect(() => { void apiRequest<{ turnstileSiteKey: string }>("/auth/config").then((data) => setSiteKey(data.turnstileSiteKey)).catch(() => toast.error("The security check is unavailable.")); }, []);
  const onTurnstile = useCallback((token: string) => setTurnstileToken(token), []);

  if (loading) return <Layout><section className="py-24"><div className="container">Loading account…</div></section></Layout>;
  if (!user) return <Layout><SEO title="Alumni Application | RUET IoT Club" description="Apply to join the verified RUET IoT Club alumni network." path="/alumni/apply" /><section className="py-24"><div className="container max-w-xl rounded-xl glass p-8 text-center"><h1 className="text-3xl font-bold">Sign in before applying</h1><p className="mt-3 text-muted-foreground">Alumni applications are connected to an email-verified account so that identity and review history stay trustworthy.</p><Link to="/auth?mode=signup" className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">Create account or sign in</Link></div></section></Layout>;
  if (reference) return <Layout><section className="py-24"><div role="status" className="container max-w-xl rounded-xl glass p-8 text-center"><h1 className="text-3xl font-bold">Application received</h1><p className="mt-3 text-muted-foreground">Your profile remains private until an administrator verifies and publishes it.</p><code className="mt-5 block text-primary">{reference}</code><Link to="/dashboard" className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">View dashboard</Link></div></section></Layout>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!csrfToken || !turnstileToken || !consent) return;
    setBusy(true);
    try {
      const created = await apiRequest<{ id: string; referenceCode: string; trackingToken: string }>("/submissions/alumni", { method: "POST", csrfToken, body: {
        submitter: { name: user.displayName, email: user.email, phone: form.phone || null, institution: form.institution || null, department: form.department || null },
        studentId: form.studentId || null, batch: form.batch, graduationYear: Number(form.graduationYear), formerClubPosition: form.formerClubPosition || null, executiveYear: form.executiveYear || null, membershipYear: form.membershipYear || null,
        linkedin: form.linkedin || null, github: form.github || null, portfolio: form.portfolio || null,
        professional: { organization: form.organization || null, designation: form.designation || null, industry: form.industry || null, country: form.country || null, city: form.city || null, website: form.professionalWebsite || null },
        clubJourney: { yearJoined: form.yearJoined || null, role: form.role || null, majorContributions: form.majorContributions, memorableActivities: form.memorableActivities || null },
        publicDisplayConsent: true, website: "", turnstileToken,
      } });
      if (photo) { const body = new FormData(); body.set("file", photo); await apiRequest(`/submissions/${created.id}/attachments`, { method: "POST", body, csrfToken, submissionToken: created.trackingToken }); }
      setReference(created.referenceCode); toast.success("Alumni application submitted for verification.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "The alumni application could not be submitted."); }
    finally { setBusy(false); }
  };

  return <Layout><SEO title="Apply as Alumni | RUET IoT Club" description="Submit a verified RUET IoT Club alumni profile." path="/alumni/apply" /><section className="py-20"><div className="container max-w-4xl"><h1 className="text-center font-display text-3xl font-bold text-gradient">Apply as Alumni</h1><p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">Your account email is verified. Complete the profile below; nothing is published until an administrator approves it.</p><form onSubmit={submit} className="mt-10 space-y-6">
    <Section title="Personal"><Grid><Field label="Full name"><input value={user.displayName} disabled className={inputClass} /></Field><Field label="Email"><input value={user.email} disabled className={inputClass} /></Field><Field label="Phone"><input type="tel" maxLength={32} value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} /></Field><Field label="Profile photo"><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className={inputClass} /></Field>{([['linkedin','LinkedIn'],['github','GitHub'],['portfolio','Portfolio']] as const).map(([key,label]) => <Field key={key} label={label}><input type="url" maxLength={500} value={form[key]} onChange={(e) => update(key,e.target.value)} className={inputClass} /></Field>)}</Grid></Section>
    <Section title="RUET information"><Grid>{([['studentId','Student ID'],['department','Department'],['batch','Batch'],['graduationYear','Graduation year'],['formerClubPosition','Former club position'],['executiveYear','Executive year'],['membershipYear','Membership year']] as const).map(([key,label]) => <Field key={key} label={label} required={key === 'batch' || key === 'graduationYear'}><input required={key === 'batch' || key === 'graduationYear'} type={key === 'graduationYear' ? 'number' : 'text'} min={key === 'graduationYear' ? 1964 : undefined} max={key === 'graduationYear' ? 2100 : undefined} maxLength={160} value={form[key]} onChange={(e) => update(key,e.target.value)} className={inputClass} /></Field>)}</Grid></Section>
    <Section title="Professional"><Grid>{([['organization','Current organization'],['designation','Current designation'],['industry','Industry'],['country','Country'],['city','City'],['professionalWebsite','Professional website']] as const).map(([key,label]) => <Field key={key} label={label}><input type={key === 'professionalWebsite' ? 'url' : 'text'} maxLength={500} value={form[key]} onChange={(e) => update(key,e.target.value)} className={inputClass} /></Field>)}</Grid></Section>
    <Section title="Club journey"><Grid><Field label="Year joined"><input maxLength={40} value={form.yearJoined} onChange={(e) => update("yearJoined",e.target.value)} className={inputClass} /></Field><Field label="Role in club"><input maxLength={160} value={form.role} onChange={(e) => update("role",e.target.value)} className={inputClass} /></Field></Grid><Field label="Major contributions" required><textarea required minLength={20} maxLength={5000} rows={5} value={form.majorContributions} onChange={(e) => update("majorContributions",e.target.value)} className={inputClass} /></Field><Field label="Memorable activities"><textarea maxLength={5000} rows={4} value={form.memorableActivities} onChange={(e) => update("memorableActivities",e.target.value)} className={inputClass} /></Field></Section>
    <section className="rounded-xl glass p-6"><label className="flex items-start gap-3 text-sm"><input required type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" /><span>I consent to RUET IoT Club displaying my approved alumni information on the public Alumni Network.</span></label><div className="mt-5">{siteKey && <TurnstileWidget siteKey={siteKey} action="submission" onToken={onTurnstile} onError={() => toast.error("The security check could not load.")} />}</div><button disabled={busy || !siteKey || !turnstileToken || !consent} className="mt-5 w-full rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Submitting securely…" : "Submit Alumni Application"}</button></section>
  </form></div></section></Layout>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl glass p-6"><h2 className="font-display text-lg font-semibold">{title}</h2><div className="mt-4 space-y-4">{children}</div></section>; }
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 md:grid-cols-2">{children}</div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}<span className="mt-1 block">{children}</span></label>; }
