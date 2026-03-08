import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  if (loading || !user) return null;

  return (
    <Layout>
      <section className="py-20">
        <div className="container max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <SectionHeading title="Dashboard" align="left" />
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl glass"
            >
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">Profile</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="text-foreground">{profile?.full_name || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="text-foreground">{user.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Student ID:</span>{" "}
                  <span className="text-foreground">{profile?.student_id || "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>{" "}
                  <span className="text-foreground">{profile?.department || "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                    profile?.status === "approved" ? "bg-green-500/10 text-green-400" :
                    profile?.status === "rejected" ? "bg-destructive/10 text-destructive" :
                    "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    {profile?.status || "pending"}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Member ID Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-xl glass border-primary/20"
            >
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">Member ID Card</h3>
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto mb-3 flex items-center justify-center">
                  <span className="font-display text-xl font-bold text-primary">
                    {profile?.full_name?.split(" ").map(n => n[0]).join("") || "?"}
                  </span>
                </div>
                <h4 className="font-semibold text-foreground">{profile?.full_name}</h4>
                <p className="text-xs text-muted-foreground">{profile?.department || "—"}</p>
                <p className="text-xs font-mono text-primary mt-2">ID: {profile?.student_id || "N/A"}</p>
                <p className="text-xs text-muted-foreground mt-1">RUET IoT Club</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Dashboard;
