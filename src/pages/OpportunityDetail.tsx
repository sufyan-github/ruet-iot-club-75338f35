import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import TurnstileWidget from "@/components/TurnstileWidget";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { opportunityState, type Opportunity } from "@/lib/opportunities";
const input =
  "w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm outline-none focus:border-primary/50";
export default function OpportunityDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteKey, setSiteKey] = useState(
    import.meta.env.VITE_TURNSTILE_SITE_KEY || "",
  );
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    referenceCode: string;
    trackingToken: string;
    verificationRequired: boolean;
  } | null>(null);
  const [form, setForm] = useState({
    applicantName: user?.displayName || "",
    applicantEmail: user?.email || "",
    applicantPhone: "",
    organization: "",
    coverNote: "",
    website: "",
  });
  useEffect(() => {
    if (slug)
      void apiRequest<Opportunity>(
        `/community/opportunities/${encodeURIComponent(slug)}`,
      )
        .then(setItem)
        .catch(() => setItem(null))
        .finally(() => setLoading(false));
    void apiRequest<{ turnstileSiteKey: string }>("/auth/config").then((data) =>
      setSiteKey(data.turnstileSiteKey),
    );
  }, [slug]);
  useEffect(() => {
    if (user)
      setForm((value) => ({
        ...value,
        applicantName: user.displayName,
        applicantEmail: user.email,
      }));
  }, [user]);
  const turnstile = useCallback((value: string) => setToken(value), []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item || !token) return;
    setBusy(true);
    try {
      const data = await apiRequest<{
        referenceCode: string;
        trackingToken: string;
        verificationRequired: boolean;
      }>(`/opportunities/${item.id}/apply`, {
        method: "POST",
        body: { ...form, answers: {}, turnstileToken: token },
      });
      setResult(data);
      toast.success("Application received.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit application.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <Layout>
        <div className="container py-28 text-center text-muted-foreground">
          Loading opportunity…
        </div>
      </Layout>
    );
  if (!item)
    return (
      <Layout>
        <div className="container py-28 text-center">
          <h1 className="text-3xl font-bold">Opportunity unavailable</h1>
          <Link to="/opportunities" className="mt-5 inline-block text-primary">
            Return to Opportunities
          </Link>
        </div>
      </Layout>
    );
  const state = opportunityState(item);
  return (
    <Layout>
      <SEO
        title={item.seoTitle || `${item.title} | RUET IoT Club`}
        description={item.metaDescription || item.shortDescription}
        path={`/opportunities/${item.slug}`}
        image={item.ogImageUrl || item.coverImageUrl || undefined}
      />
      <article>
        {item.coverImageUrl && (
          <img
            src={item.coverImageUrl}
            alt=""
            className="h-72 w-full object-cover opacity-70 md:h-96"
          />
        )}
        <div className="container grid max-w-6xl gap-10 py-16 lg:grid-cols-[1fr_24rem]">
          <main>
            <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                {item.opportunityType}
              </span>
              <span className="rounded-full bg-secondary px-3 py-1">
                {state}
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-bold md:text-5xl">
              {item.title}
            </h1>
            <p className="mt-3 text-lg text-primary">{item.organization}</p>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {item.shortDescription}
            </p>
            <section className="mt-10">
              <h2 className="text-2xl font-semibold">Opportunity details</h2>
              <p className="mt-4 whitespace-pre-wrap leading-8 text-muted-foreground">
                {item.fullDescription}
              </p>
            </section>
            {item.eligibility && (
              <section className="mt-10">
                <h2 className="text-xl font-semibold">Eligibility</h2>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">
                  {item.eligibility}
                </p>
              </section>
            )}
            {item.requiredDocuments.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl font-semibold">Required documents</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                  {item.requiredDocuments.map((document) => (
                    <li key={document}>{document}</li>
                  ))}
                </ul>
              </section>
            )}
          </main>
          <aside>
            <div className="sticky top-28 rounded-2xl border border-primary/20 bg-card/70 p-6">
              <h2 className="font-semibold">Application information</h2>
              <div className="mt-5 space-y-4 text-sm text-muted-foreground">
                {item.applicationDeadline && (
                  <p className="flex gap-2">
                    <CalendarClock size={17} className="text-primary" />
                    Deadline:{" "}
                    {new Date(item.applicationDeadline).toLocaleString()}
                  </p>
                )}
                {item.location && (
                  <p className="flex gap-2">
                    <MapPin size={17} className="text-primary" />
                    {item.location}
                  </p>
                )}
              </div>
              {state === "CLOSED" ? (
                <p className="mt-5 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
                  This opportunity is closed.
                </p>
              ) : item.applicationMode === "EXTERNAL" && item.applicationUrl ? (
                <a
                  href={item.applicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
                >
                  Apply externally
                  <ExternalLink size={16} />
                </a>
              ) : result ? (
                <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-4">
                  <p className="font-semibold text-emerald-300">
                    Application received
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {result.verificationRequired
                      ? "Check your email to verify this submission before review."
                      : "Your application is now in the review queue."}
                  </p>
                  <code className="mt-3 block text-xs text-primary">
                    {result.referenceCode}
                  </code>
                  <Link
                    to={`/track-submission?reference=${encodeURIComponent(result.referenceCode)}&token=${encodeURIComponent(result.trackingToken)}`}
                    className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
                  >
                    Track this application
                  </Link>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-5 space-y-3">
                  {(
                    [
                      ["applicantName", "Full name", "text"],
                      ["applicantEmail", "Email", "email"],
                      ["applicantPhone", "Phone", "tel"],
                      ["organization", "Organization", "text"],
                    ] as const
                  ).map(([key, label, type]) => (
                    <label key={key} className="block text-xs font-medium">
                      {label}
                      {["applicantName", "applicantEmail"].includes(key) &&
                        " *"}
                      <input
                        required={["applicantName", "applicantEmail"].includes(
                          key,
                        )}
                        type={type}
                        value={form[key]}
                        onChange={(event) =>
                          setForm({ ...form, [key]: event.target.value })
                        }
                        className={`${input} mt-1`}
                      />
                    </label>
                  ))}
                  <label className="block text-xs font-medium">
                    Cover note *
                    <textarea
                      required
                      minLength={20}
                      rows={5}
                      value={form.coverNote}
                      onChange={(event) =>
                        setForm({ ...form, coverNote: event.target.value })
                      }
                      className={`${input} mt-1 resize-y`}
                    />
                  </label>
                  <div className="absolute -left-[10000px]">
                    <input
                      value={form.website}
                      onChange={(event) =>
                        setForm({ ...form, website: event.target.value })
                      }
                    />
                  </div>
                  {siteKey && (
                    <TurnstileWidget
                      siteKey={siteKey}
                      action="submission"
                      onToken={turnstile}
                    />
                  )}
                  <button
                    disabled={busy || !token}
                    className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {busy ? "Submitting…" : "Submit application"}
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>
      </article>
    </Layout>
  );
}
