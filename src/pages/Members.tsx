import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { Search, Filter } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
  avatar_url: string | null;
  student_id: string | null;
  department: string | null;
  batch: string | null;
  session: string | null;
  membership_id: string | null;
}

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase.rpc("get_public_members");
      setMembers(data || []);
      setLoading(false);
    };
    fetchMembers();
  }, []);

  const departments = useMemo(() => [...new Set(members.map(m => m.department).filter(Boolean))].sort(), [members]);
  const batches = useMemo(() => [...new Set(members.map(m => m.batch).filter(Boolean))].sort(), [members]);

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.student_id?.includes(search);
      const matchesDept = !deptFilter || m.department === deptFilter;
      const matchesBatch = !batchFilter || m.batch === batchFilter;
      return matchesSearch && matchesDept && matchesBatch;
    });
  }, [members, search, deptFilter, batchFilter]);

  const selectClass = "px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Layout>
      <SEO title="Our Members | RUET IoT Club" description="Browse approved members of RUET IoT Club from departments across Rajshahi University of Engineering & Technology." path="/members" />
      <section className="py-24">
        <div className="container max-w-6xl">
          <SectionHeading title="Our Members" subtitle="Meet the approved members of RUET IoT Club" />

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto mb-10">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or student ID..."
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

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
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
                      <img
                        src={getOptimizedImageUrl(member.avatar_url, { width: 96, height: 96 })}
                        alt={member.full_name}
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-3 flex items-center justify-center ring-2 ring-primary/20">
                        <span className="font-display text-xl font-bold text-primary">
                          {member.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                    )}
                    <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors leading-tight">
                      {member.full_name}
                    </h3>
                    {member.department && (
                      <p className="text-xs font-mono text-primary mt-1">{member.department}</p>
                    )}
                    {member.student_id && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">ID: {member.student_id}</p>
                    )}
                    {(member.batch || member.session) && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {member.batch && `Batch: ${member.batch}`}
                        {member.batch && member.session && " · "}
                        {member.session && member.session}
                      </p>
                    )}
                    {member.membership_id && (
                      <p className="text-[10px] font-mono text-accent mt-1">{member.membership_id}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Members;
