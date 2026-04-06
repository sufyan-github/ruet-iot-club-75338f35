import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

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

const MembersShowcase = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, student_id, department, batch, session, membership_id")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(12);
      setMembers(data || []);
      setLoading(false);
    };
    fetchMembers();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-secondary/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return <p className="text-center text-muted-foreground">No approved members yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
      {members.map((member, i) => (
        <motion.div
          key={member.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
          className="p-4 rounded-xl glass text-center hover:border-primary/30 transition-all duration-300 group"
        >
          {member.avatar_url ? (
            <img
              src={getOptimizedImageUrl(member.avatar_url, { width: 80, height: 80 })}
              alt={member.full_name}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-3 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-3 flex items-center justify-center ring-2 ring-primary/20">
              <span className="font-display text-lg font-bold text-primary">
                {member.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
            </div>
          )}
          <h3 className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors leading-tight">
            {member.full_name}
          </h3>
          {member.department && (
            <p className="text-[10px] font-mono text-primary mt-1">{member.department}</p>
          )}
          {member.student_id && (
            <p className="text-[10px] text-muted-foreground mt-0.5">ID: {member.student_id}</p>
          )}
          {(member.batch || member.session) && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {member.batch && `Batch: ${member.batch}`}
              {member.batch && member.session && " · "}
              {member.session && `${member.session}`}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default MembersShowcase;
