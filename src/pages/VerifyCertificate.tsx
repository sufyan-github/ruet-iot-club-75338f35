import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Award, Search, CheckCircle, XCircle, Calendar, BookOpen, User } from "lucide-react";
import { Link } from "react-router-dom";

const VerifyCertificate = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setResult(null);
    setNotFound(false);

    const { data } = await supabase
      .from("certificates")
      .select("*, courses(title, instructor)")
      .eq("certificate_number", trimmed)
      .single();

    if (data) {
      const { data: holder } = await supabase.rpc("get_certificate_holder", { _user_id: data.user_id });
      setResult({ ...data, profile: (holder && holder[0]) || null });
    } else {
      setNotFound(true);
    }
    setSearching(false);
  };

  return (
    <Layout>
      <SEO title="Verify Certificate | RUET IoT Club" description="Verify the authenticity of certificates issued by RUET IoT Club for completed courses and events." path="/verify" />
      <section className="py-20">
        <div className="container max-w-2xl">
          <div className="text-center mb-10">
            <Award className="mx-auto text-primary mb-4" size={48} />
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Verify Certificate
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter a certificate number to verify its authenticity.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-8">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. CERT-2026-00001"
              maxLength={50}
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="px-5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Search size={16} />
              {searching ? "Searching..." : "Verify"}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div className="p-6 rounded-xl glass border border-green-500/20">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="text-green-500" size={20} />
                <span className="text-sm font-semibold text-green-500">Certificate Verified</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="text-foreground font-medium">{result.profile?.full_name || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Course:</span>
                  <span className="text-foreground font-medium">{result.courses?.title || "—"}</span>
                </div>
                {result.courses?.instructor && (
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Instructor:</span>
                    <span className="text-foreground font-medium">{result.courses.instructor}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Issued:</span>
                  <span className="text-foreground font-medium">
                    {new Date(result.issued_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Certificate #:</span>
                  <span className="text-foreground font-mono font-medium">{result.certificate_number}</span>
                </div>
              </div>
              <Link
                to={`/certificate/${result.id}`}
                className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                View Full Certificate
              </Link>
            </div>
          )}

          {notFound && (
            <div className="p-6 rounded-xl glass border border-destructive/20 text-center">
              <XCircle className="mx-auto text-destructive mb-2" size={28} />
              <p className="text-sm font-semibold text-destructive">Certificate Not Found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Please check the certificate number and try again.
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default VerifyCertificate;
