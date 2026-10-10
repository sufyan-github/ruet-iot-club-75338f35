import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ShieldCheck } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface TrackingResult {
  id: string; referenceCode: string; type: string; title: string; summary: string; status: string;
  publicResponse: string | null; createdAt: string; updatedAt: string;
  events: Array<{ eventType: string; fromStatus: string | null; toStatus: string | null; publicMessage: string | null; createdAt: string }>;
  attachments: Array<{ id: string; originalName: string; contentType: string; byteSize: number; createdAt: string }>;
}

const TrackSubmission = () => {
  const [params, setParams] = useSearchParams();
  const [reference, setReference] = useState(params.get("reference") ?? "");
  const [token, setToken] = useState(params.get("token") ?? "");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const initialTrackStarted = useRef(false);

  const track = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!reference || !token) return;
    setBusy(true);
    try {
      let data: TrackingResult;
      try {
        data = await apiRequest<TrackingResult>(`/submissions/track?reference=${encodeURIComponent(reference)}&token=${encodeURIComponent(token)}`);
      } catch {
        data = await apiRequest<TrackingResult>(`/opportunity-applications/track?reference=${encodeURIComponent(reference)}&token=${encodeURIComponent(token)}`);
      }
      setResult(data);
      setParams({ reference, token }, { replace: true });
    } catch (error) { setResult(null); toast.error(error instanceof Error ? error.message : "The submission could not be found."); }
    finally { setBusy(false); }
  }, [reference, setParams, token]);

  useEffect(() => { if (!initialTrackStarted.current && reference && token) { initialTrackStarted.current = true; void track(); } }, [reference, token, track]);

  return <Layout><SEO title="Track Submission | RUET IoT Club" description="Securely track a RUET IoT Club project, research, collaboration, alumni, or contact submission." path="/track-submission" /><section className="py-20"><div className="container max-w-3xl"><div className="text-center"><ShieldCheck className="mx-auto text-primary" size={42} /><h1 className="mt-4 font-display text-3xl font-bold text-gradient">Track Submission</h1><p className="mt-2 text-muted-foreground">Use the private reference and tracking token sent to your email.</p></div><form onSubmit={track} className="mt-8 grid gap-3 rounded-xl glass p-6 md:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-medium">Reference<input required value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-sm" /></label><label className="text-sm font-medium">Tracking token<input required type="password" value={token} onChange={(e) => setToken(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-sm" /></label><button disabled={busy} className="self-end rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"><Search className="mr-2 inline" size={16} />{busy ? "Checking…" : "Track"}</button></form>{result && <article className="mt-6 rounded-xl glass p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs uppercase tracking-wider text-muted-foreground">{result.type}</span><h2 className="mt-1 text-xl font-semibold">{result.title}</h2><code className="text-xs text-primary">{result.referenceCode}</code></div><span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{result.status.replace(/_/g, " ")}</span></div><p className="mt-4 text-sm text-muted-foreground">{result.summary}</p>{result.publicResponse && <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4"><strong className="text-sm">Response from RUET IoT Club</strong><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{result.publicResponse}</p></div>}<h3 className="mt-6 font-semibold">Timeline</h3><ol className="mt-3 space-y-3 border-l border-border pl-5">{result.events.map((item, index) => <li key={`${item.createdAt}-${index}`}><span className="text-sm font-medium">{item.toStatus?.replace(/_/g, " ") ?? item.eventType.replace(/_/g, " ")}</span>{item.publicMessage && <p className="text-sm text-muted-foreground">{item.publicMessage}</p>}<time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time></li>)}</ol>{result.attachments.length > 0 && <><h3 className="mt-6 font-semibold">Attachments</h3><div className="mt-3 space-y-2">{result.attachments.map((file) => <a key={file.id} href={`/api/v1/submissions/${result.id}/attachments/${file.id}?token=${encodeURIComponent(token)}`} className="block rounded-lg border border-border p-3 text-sm hover:border-primary/40">{file.originalName} <span className="text-muted-foreground">({Math.ceil(file.byteSize / 1024)} KB)</span></a>)}</div></>}</article>}</div></section></Layout>;
};

export default TrackSubmission;
