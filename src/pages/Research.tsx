import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { cloudflareData } from "@/integrations/cloudflare/client";
import { FileText, ExternalLink, Tag, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "@/lib/api";

const Research = () => {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ongoing" | "completed" | "published">("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await apiRequest<{items:any[]}>("/research");
        setPapers(result.items.map((item)=>({...item,status:String(item.research_status).toLowerCase(),authors:(item.researchers||[]).map((author:any)=>author.name).join(", "),tags:item.keywords||[],pdf_url:(item.documents||[]).find((doc:any)=>doc.type==="PDF"||doc.type==="PAPER")?.url,doi_link:item.external_url||item.doi,slug:item.slug})));
      } catch {
        const { data } = await cloudflareData.from("research_papers").select("*").order("created_at", { ascending: false });
        setPapers(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = filter === "all" ? papers : papers.filter((p) => p.status === filter);
  const areas = [...new Set(papers.map((p) => p.research_area).filter(Boolean))];

  return (
    <Layout>
      <SEO title="Research Publications | RUET IoT Club" description="Published and ongoing research papers in IoT, embedded systems, and AI by members of RUET IoT Club." path="/research" />
      <section className="py-24">
        <div className="container max-w-5xl">
          <SectionHeading
            level={1}
            title="Research & Publications"
            subtitle="Exploring innovation through ongoing research and published papers"
          />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
            <div className="p-4 rounded-xl glass text-center">
              <p className="text-2xl font-display font-bold text-foreground">{papers.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Papers</p>
            </div>
            <div className="p-4 rounded-xl glass text-center">
              <p className="text-2xl font-display font-bold text-primary">
                {papers.filter((p) => p.status === "published").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Published</p>
            </div>
            <div className="p-4 rounded-xl glass text-center">
              <p className="text-2xl font-display font-bold text-yellow-400">
                {papers.filter((p) => p.status === "ongoing").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Ongoing</p>
            </div>
          </div>

          <section className="mb-10"><h2 className="text-center font-display text-xl font-semibold">Research Areas</h2><div className="mt-4 flex flex-wrap justify-center gap-2">{areas.length > 0 ? areas.map((area) => <span key={String(area)} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">{String(area)}</span>) : <p className="max-w-xl text-center text-sm text-muted-foreground">Research areas will be listed as reviewed publications and ongoing work are added.</p>}</div></section>

          {/* Filters */}
          <div className="flex justify-center gap-2 mb-8">
            {(["all", "ongoing", "completed", "published"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/30 p-8 text-center"><h2 className="font-semibold">No research published yet</h2><p className="mt-2 text-sm text-muted-foreground">Published work will appear here after administrator review.</p></div>
          ) : (
            <div className="space-y-4">
              {filtered.map((paper, i) => (
                <motion.div
                  key={paper.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="p-6 rounded-xl glass hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded ${
                            paper.status === "published"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {paper.status === "published" ? (
                            <CheckCircle size={10} />
                          ) : (
                            <Clock size={10} />
                          )}
                          {paper.status}
                        </span>
                        {paper.research_area && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {paper.research_area}
                          </span>
                        )}
                      </div>
                      <Link to={`/research/${paper.slug||paper.id}`} className="font-semibold text-foreground text-lg leading-tight mb-1 hover:text-primary">{paper.title}</Link>
                      <p className="text-sm text-muted-foreground mb-2">
                        by {paper.authors}
                      </p>
                      {paper.abstract && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                          {paper.abstract}
                        </p>
                      )}
                      {paper.tags && paper.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {paper.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground"
                            >
                              <Tag size={10} /> {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {paper.pdf_url && (
                        <a
                          href={paper.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="View PDF"
                        >
                          <FileText size={18} />
                        </a>
                      )}
                      {paper.doi_link && (
                        <a
                          href={paper.doi_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="DOI Link"
                        >
                          <ExternalLink size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <div className="mt-14 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5 p-8 text-center"><h2 className="font-display text-2xl font-bold">Propose Research With Us</h2><p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Students, researchers, faculty, and external collaborators can submit an IoT, embedded systems, AI, or interdisciplinary research proposal for review.</p><Link to="/research/submit" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">Submit Research Proposal</Link></div>
        </div>
      </section>
    </Layout>
  );
};

export default Research;
