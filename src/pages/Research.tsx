import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
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
      <SEO title="Research Publications | RUET IoT Club" description="Published and ongoing research papers in IoT, embedded systems, and AI by members of RUET IoT Club." path="/research" />
      <section className="py-24">
        <div className="container max-w-5xl">
          <SectionHeading
            title="Research & Publications"
            subtitle="Exploring innovation through ongoing research and published papers"
          />

          {/* Stats - Modular Chip Cards */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
            <div className="relative p-4 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 text-center overflow-hidden">
              <span className="absolute top-2 left-2 w-1 h-1 rounded-full bg-[#2de2c9]" />
              <p className="text-2xl font-display font-bold text-foreground">{papers.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Papers</p>
            </div>
            <div className="relative p-4 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 text-center overflow-hidden">
              <span className="absolute top-2 left-2 w-1 h-1 rounded-full bg-[#2de2c9]" />
              <p className="text-2xl font-display font-bold text-primary">
                {papers.filter((p) => p.status === "published").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Published</p>
            </div>
            <div className="relative p-4 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 text-center overflow-hidden">
              <span className="absolute top-2 left-2 w-1 h-1 rounded-full bg-[#2de2c9]" />
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
                className={`px-4 py-2 chip-shape text-sm font-medium transition-all capitalize ${
                  filter === f
                    ? "bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold shadow-[0_2px_12px_rgba(45,226,201,0.4)]"
                    : "bg-[#071322]/80 text-muted-foreground border border-[#2de2c9]/25 hover:text-foreground hover:border-[#2de2c9]/60"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 chip-shape bg-secondary/30 border border-border/20 animate-pulse" />
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
                  className="relative p-6 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 transition-all duration-300 overflow-hidden"
                >
                  {/* Pin-1 Index Notch Socket */}
                  <span className="chip-pin-1 absolute top-2.5 left-2.5 z-20" />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                  <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 chip-shape ${
                            paper.status === "published"
                              ? "bg-green-500/15 text-green-400 border border-green-500/30"
                              : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
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
