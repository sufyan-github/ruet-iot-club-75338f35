import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
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
      const items = data || [];
      setProjects(items);
      const cats = ["All", ...Array.from(new Set(items.map((p) => p.category).filter(Boolean) as string[]))];
      setCategories(cats);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const filtered = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Projects" subtitle="Explore our innovations and ongoing research" />

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
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
                  className="rounded-xl glass hover:border-primary/30 transition-colors group overflow-hidden flex flex-col h-[360px]">
                  <div className="h-40 bg-muted flex-shrink-0">
                    {project.image_url ? (
                      <img src={project.image_url} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      {project.category && <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">{project.category}</span>}
                      <span className={`text-xs font-mono px-2 py-1 rounded ${
                        project.status === "completed" || project.status === "published" ? "bg-green-500/10 text-green-400" :
                        project.status === "ongoing" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-blue-500/10 text-blue-400"
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
                <img src={selectedProject.image_url} alt={selectedProject.title} className="w-full h-48 object-cover rounded-md mb-4" />
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
