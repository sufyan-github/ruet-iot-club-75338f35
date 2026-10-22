import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { Linkedin } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Alumni = () => {
  const [alumni, setAlumni] = useState<Tables<"alumni">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("alumni")
      .select("*")
      .order("batch", { ascending: false })
      .then(({ data }) => {
        setAlumni(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <Layout>
      <SEO title="Alumni Network | RUET IoT Club" description="Meet the alumni of RUET IoT Club building careers in IoT, embedded systems, and technology across the world." path="/alumni" />
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Alumni Network" subtitle="Our graduated members making an impact" />

          {loading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : alumni.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <p>No alumni records yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {alumni.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="relative p-5 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 text-center transition-all duration-300 group overflow-hidden select-none"
                >
                  {/* Pin-1 Index Notch Socket */}
                  <span className="chip-pin-1 absolute top-2.5 left-2.5 z-20" />
                  <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                  <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />

                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-3 flex items-center justify-center">
                    <span className="font-display text-lg font-bold text-primary">
                      {a.name.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{a.name}</h3>
                  {a.batch && <p className="text-xs font-mono text-primary mt-1">Series {a.batch}</p>}
                  {a.department && <p className="text-xs text-muted-foreground mt-1">{a.department}</p>}
                  {a.company && <p className="text-xs text-muted-foreground mt-1">{a.company}</p>}
                  {a.linkedin && (
                    <a href={a.linkedin} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-2">
                      <Linkedin size={12} /> LinkedIn
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Alumni;
