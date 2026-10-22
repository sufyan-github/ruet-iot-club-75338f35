import { useEffect, useState } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { ExternalLink, Github, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const Projects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const categories = ["All", "Ongoing", "Completed", "Planned"];
  const [selectedProject, setSelectedProject] = useState<any>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      setProjects(data || []);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const filtered = filter === "All" ? projects : projects.filter((p) => p.status?.toLowerCase() === filter.toLowerCase());

  return (
    <Layout>
      <SEO title="IoT Projects | RUET IoT Club" description="Explore student-built Internet of Things, embedded systems, and AI projects developed by members of RUET IoT Club." path="/projects" />
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Projects" subtitle="Explore our innovations and ongoing research" />

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilter(cat)}
                className={`px-4 py-2 chip-shape text-sm font-medium transition-all ${
                  filter === cat
                    ? "bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold shadow-[0_2px_12px_rgba(45,226,201,0.4)]"
                    : "bg-[#071322]/80 text-muted-foreground border border-[#2de2c9]/25 hover:text-foreground hover:border-[#2de2c9]/60"
                }`}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Loading projects...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground">No projects found.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {filtered.map((project, i) => (
                <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 group overflow-hidden flex flex-col h-[380px]">
                  {/* Pin-1 Index Notch Socket */}
                  <span className="chip-pin-1 absolute top-2.5 left-2.5 z-20" />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                  <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />

                  <div className="h-40 bg-muted flex-shrink-0 relative overflow-hidden">
                    {project.image_url ? (
                      <img src={getOptimizedImageUrl(project.image_url, { width: 400, height: 200 })} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071322] via-transparent to-transparent opacity-80" />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      {project.category && (
                        <span className="text-[11px] font-mono px-2 py-0.5 chip-shape bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/30">
                          {project.category}
                        </span>
                      )}
                      <span className={`text-[11px] font-mono px-2 py-0.5 chip-shape ${
                        project.status === "completed" || project.status === "published"
                          ? "bg-green-500/15 text-green-400 border border-green-500/30"
                          : project.status === "ongoing"
                          ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      }`}>{project.status}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">{project.title}</h3>
                    {project.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>}
                    <div className="flex gap-3 mt-auto">
                      {project.github_link && (
                        <a href={project.github_link} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                          <Github size={12} /> Code
                        </a>
                      )}
                      <button onClick={() => setSelectedProject(project)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                        <ExternalLink size={12} /> Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-lg">
          {selectedProject && (
            <>
              {selectedProject.image_url && (
                <img src={getOptimizedImageUrl(selectedProject.image_url, { width: 600, height: 300 })} alt={selectedProject.title} className="w-full h-48 object-cover rounded-md mb-4" />
              )}
              <DialogHeader>
                <DialogTitle>{selectedProject.title}</DialogTitle>
                <div className="flex items-center gap-2 pt-2">
                  {selectedProject.category && <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">{selectedProject.category}</span>}
                  <span className={`text-xs font-mono px-2 py-1 rounded ${
                    selectedProject.status === "completed" || selectedProject.status === "published" ? "bg-green-500/10 text-green-400" :
                    selectedProject.status === "ongoing" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>{selectedProject.status}</span>
                </div>
                <DialogDescription className="pt-3 whitespace-pre-wrap">
                  {selectedProject.description || "No description available."}
                </DialogDescription>
              </DialogHeader>
              {selectedProject.github_link && (
                <a href={selectedProject.github_link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2">
                  <Github size={14} /> View on GitHub
                </a>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Projects;
