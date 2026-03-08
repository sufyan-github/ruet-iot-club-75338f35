import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ExternalLink, Tag, Clock, CheckCircle } from "lucide-react";

const Research = () => {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ongoing" | "published">("all");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("research_papers")
        .select("*")
        .order("created_at", { ascending: false });
      setPapers(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = filter === "all" ? papers : papers.filter((p) => p.status === filter);
  const areas = [...new Set(papers.map((p) => p.research_area).filter(Boolean))];

  return (
    <Layout>
      <section className="py-24">
        <div className="container max-w-5xl">
          <SectionHeading
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

          {/* Filters */}
          <div className="flex justify-center gap-2 mb-8">
            {(["all", "ongoing", "published"] as const).map((f) => (
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
            <p className="text-center text-muted-foreground">No research papers found.</p>
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
                      <h3 className="font-semibold text-foreground text-lg leading-tight mb-1">
                        {paper.title}
                      </h3>
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
        </div>
      </section>
    </Layout>
  );
};

export default Research;
