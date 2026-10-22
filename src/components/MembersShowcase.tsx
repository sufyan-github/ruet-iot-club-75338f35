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
      const { data } = await supabase.rpc("get_public_members");
      setMembers((data || []).slice(0, 12));
      setLoading(false);
    };
    fetchMembers();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 chip-shape bg-secondary/30 border border-border/20 animate-pulse" />
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
          className="relative p-4 chip-card border border-[#2de2c9]/20 hover:border-[#2de2c9]/60 text-center transition-all duration-300 group overflow-hidden select-none"
        >
          {/* Pin-1 Index Notch Socket */}
          <span className="chip-pin-1 absolute top-2.5 left-2.5 z-20" />
          <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
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
              {member.batch && `Series: ${member.batch}`}
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
