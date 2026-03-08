import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { Linkedin, Github, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Team = () => {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("team_members").select("*").order("sort_order", { ascending: true });
      setTeam(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Executive Team" subtitle="Meet the people driving RUET IoT Club" />

          {loading ? (
            <p className="text-center text-muted-foreground">Loading team...</p>
          ) : team.length === 0 ? (
            <p className="text-center text-muted-foreground">Team members coming soon.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {team.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-xl glass text-center hover:border-primary/30 transition-colors group"
                >
                  {member.image_url ? (
                    <img src={member.image_url} alt={member.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-3 flex items-center justify-center">
                      <span className="font-display text-lg font-bold text-primary">
                        {member.name.split(" ").map((n: string) => n[0]).join("")}
                      </span>
                    </div>
                  )}
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{member.name}</h3>
                  <p className="text-xs font-mono text-primary mt-1">{member.position}</p>
                  {member.department && <p className="text-xs text-muted-foreground mt-1">{member.department}</p>}
                  {member.bio && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{member.bio}</p>}
                  <div className="flex justify-center gap-2 mt-3">
                    {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin size={14} /></a>}
                    {member.github && <a href={member.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Github size={14} /></a>}
                    {member.email && <a href={`mailto:${member.email}`} className="text-muted-foreground hover:text-primary transition-colors"><Mail size={14} /></a>}
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
