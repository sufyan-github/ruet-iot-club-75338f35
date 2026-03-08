import { useEffect, useState } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { Linkedin, Github, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CATEGORY_ORDER = [
  "Executive Board",
  "Advisory Board",
  "Core Team",
  "General Members",
];

const CATEGORY_SUBTITLES: Record<string, string> = {
  "Executive Board": "Leading the vision and operations of RUET IoT Club",
  "Advisory Board": "Faculty advisors and mentors guiding our journey",
  "Core Team": "The working teams powering our initiatives",
  "General Members": "The heart of our community",
};

const Team = () => {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      const { data } = await supabase.from("team_members").select("*").order("sort_order", { ascending: true });
      setTeam(data || []);
      setLoading(false);
    };
    fetchTeam();
  }, []);

  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      members: team.filter((m) => (m.category || "Executive Board") === cat),
    }))
    .filter((g) => g.members.length > 0);

  // Any members with categories not in the predefined list
  const otherCategories = [...new Set(team.map((m) => m.category || "Executive Board"))]
    .filter((c) => !CATEGORY_ORDER.includes(c));
  otherCategories.forEach((cat) => {
    const members = team.filter((m) => m.category === cat);
    if (members.length > 0) grouped.push({ category: cat, members });
  });

  return (
    <Layout>
      <section className="py-24">
        <div className="container max-w-6xl">
          <SectionHeading title="Our Team" subtitle="Meet the people driving RUET IoT Club" />

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : team.length === 0 ? (
            <p className="text-center text-muted-foreground">Team members coming soon.</p>
          ) : (
            <div className="space-y-16">
              {grouped.map((group, gi) => (
                <motion.div
                  key={group.category}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: gi * 0.1 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {group.category}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {CATEGORY_SUBTITLES[group.category] || ""}
                    </p>
                    <div className="w-16 h-0.5 bg-primary/50 mx-auto mt-3" />
                  </div>

                  <div className={`grid gap-5 max-w-5xl mx-auto ${
                    group.members.length <= 2
                      ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
                      : group.members.length === 3
                      ? "grid-cols-1 sm:grid-cols-3 max-w-3xl"
                      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  }`}>
                    {group.members.map((member, i) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="p-6 rounded-xl glass text-center hover:border-primary/30 transition-all duration-300 group"
                      >
                        {member.image_url ? (
                          <img src={getOptimizedImageUrl(member.image_url, { width: 100, height: 100 })} alt={member.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all" loading="lazy" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-4 flex items-center justify-center ring-2 ring-primary/20">
                            <span className="font-display text-xl font-bold text-primary">
                              {member.name.split(" ").map((n: string) => n[0]).join("")}
                            </span>
                          </div>
                        )}
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{member.name}</h3>
                        <p className="text-xs font-mono text-primary mt-1">{member.position}</p>
                        {member.department && <p className="text-xs text-muted-foreground mt-1">{member.department}</p>}
                        {member.bio && <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{member.bio}</p>}
                        <div className="flex justify-center gap-3 mt-3">
                          {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin size={15} /></a>}
                          {member.github && <a href={member.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Github size={15} /></a>}
                          {member.email && <a href={`mailto:${member.email}`} className="text-muted-foreground hover:text-primary transition-colors"><Mail size={15} /></a>}
                        </div>
                      </motion.div>
                    ))}
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

export default Team;
