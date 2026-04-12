import { useEffect, useState, useMemo } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { Search, Linkedin, Github, Mail, Filter } from "lucide-react";

const CATEGORY_ORDER = ["Executive Board", "Advisory Board", "Core Team"];
const CATEGORY_SUBTITLES: Record<string, string> = {
  "Executive Board": "Leading the vision and operations of RUET IoT Club",
  "Advisory Board": "Faculty advisors and mentors guiding our journey",
  "Core Team": "The working teams powering our initiatives",
};

const Team = () => {
  const [team, setTeam] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"team" | "members">("team");

  useEffect(() => {
    const fetchAll = async () => {
      const [teamRes, membersRes] = await Promise.all([
        supabase.from("team_members").select("*").order("sort_order", { ascending: true }),
        supabase.from("profiles")
          .select("id, full_name, avatar_url, student_id, department, batch, session, membership_id")
          .eq("status", "approved")
          .order("full_name", { ascending: true }),
      ]);
      setTeam(teamRes.data || []);
      setMembers(membersRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const grouped = useMemo(() => {
    const groups = CATEGORY_ORDER
      .map((cat) => ({
        category: cat,
        members: team.filter((m) => (m.category || "Executive Board") === cat),
      }))
      .filter((g) => g.members.length > 0);

    const otherCategories = [...new Set(team.map((m) => m.category || "Executive Board"))]
      .filter((c) => !CATEGORY_ORDER.includes(c));
    otherCategories.forEach((cat) => {
      const catMembers = team.filter((m) => m.category === cat);
      if (catMembers.length > 0) groups.push({ category: cat, members: catMembers });
    });
    return groups;
  }, [team]);

  const departments = useMemo(() => [...new Set(members.map(m => m.department).filter(Boolean))].sort(), [members]);
  const batches = useMemo(() => [...new Set(members.map(m => m.batch).filter(Boolean))].sort(), [members]);

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = !search ||
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.student_id?.toLowerCase().includes(search.toLowerCase()) ||
        m.membership_id?.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !deptFilter || m.department === deptFilter;
      const matchesBatch = !batchFilter || m.batch === batchFilter;
      return matchesSearch && matchesDept && matchesBatch;
    });
  }, [members, search, deptFilter, batchFilter]);

  const selectClass = "px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Layout>
      <section className="py-24">
        <div className="container max-w-6xl">
          <SectionHeading title="Our People" subtitle="Meet the team and members driving RUET IoT Club" />

          {/* Tab Switcher */}
          <div className="flex justify-center gap-2 mb-10">
            <button
              onClick={() => setActiveTab("team")}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "team"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Executive & Advisory Board
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "members"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Members ({members.length})
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : activeTab === "team" ? (
            /* Team Section */
            team.length === 0 ? (
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
                      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">{group.category}</h2>
                      <p className="text-sm text-muted-foreground">{CATEGORY_SUBTITLES[group.category] || ""}</p>
                      <div className="w-16 h-0.5 bg-primary/50 mx-auto mt-3" />
                    </div>
                    <div className={`grid gap-5 max-w-5xl mx-auto ${
                      group.members.length <= 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl" :
                      group.members.length === 3 ? "grid-cols-1 sm:grid-cols-3 max-w-3xl" :
                      "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
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
            )
          ) : (
            /* Members Section */
            <>
              <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto mb-10">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, or membership ID..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className={selectClass}>
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d} value={d!}>{d}</option>)}
                </select>
                <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className={selectClass}>
                  <option value="">All Batches</option>
                  {batches.map(b => <option key={b} value={b!}>{b}</option>)}
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Filter size={40} className="mx-auto mb-4 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    {members.length === 0 ? "No approved members yet." : "No members match your filters."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground text-center mb-6">
                    Showing {filtered.length} of {members.length} members
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filtered.map((member, i) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: Math.min(i * 0.03, 0.5) }}
                        className="p-5 rounded-xl glass text-center hover:border-primary/30 transition-all duration-300 group"
                      >
                        {member.avatar_url ? (
                          <img src={getOptimizedImageUrl(member.avatar_url, { width: 96, height: 96 })} alt={member.full_name}
                            className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all" loading="lazy" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-3 flex items-center justify-center ring-2 ring-primary/20">
                            <span className="font-display text-xl font-bold text-primary">
                              {member.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </span>
                          </div>
                        )}
                        <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors leading-tight">{member.full_name}</h3>
                        {member.department && <p className="text-xs font-mono text-primary mt-1">{member.department}</p>}
                        {member.student_id && <p className="text-[11px] text-muted-foreground mt-0.5">ID: {member.student_id}</p>}
                        {(member.batch || member.session) && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {member.batch && `Batch: ${member.batch}`}
                            {member.batch && member.session && " · "}
                            {member.session && member.session}
                          </p>
                        )}
                        {member.membership_id && <p className="text-[10px] font-mono text-accent mt-1">{member.membership_id}</p>}
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Team;
