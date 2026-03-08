import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Save, X, Award, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    department: "",
    batch: "",
    session: "",
    student_id: "",
    skills: "",
    linkedin: "",
    github: "",
    facebook_link: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          setProfile(data);
          if (data) {
            setForm({
              full_name: data.full_name || "",
              phone: data.phone || "",
              department: data.department || "",
              batch: data.batch || "",
              session: data.session || "",
              student_id: data.student_id || "",
              skills: data.skills || "",
              linkedin: data.linkedin || "",
              github: data.github || "",
              facebook_link: data.facebook_link || "",
            });
          }
        });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        department: form.department || null,
        batch: form.batch || null,
        session: form.session || null,
        student_id: form.student_id || null,
        skills: form.skills || null,
        linkedin: form.linkedin || null,
        github: form.github || null,
        facebook_link: form.facebook_link || null,
      })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      // Refresh profile
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  if (loading || !user) return null;

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-bold tracking-wider text-primary">Profile</h3>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                    >
                      <Save size={12} /> Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        if (profile) {
                          setForm({
                            full_name: profile.full_name || "",
                            phone: profile.phone || "",
                            department: profile.department || "",
                            batch: profile.batch || "",
                            session: profile.session || "",
                            student_id: profile.student_id || "",
                            skills: profile.skills || "",
                            linkedin: profile.linkedin || "",
                            github: profile.github || "",
                            facebook_link: profile.facebook_link || "",
                          });
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                    <input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Student ID</label>
                      <input className={inputClass} value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                      <input className={inputClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Batch</label>
                      <input className={inputClass} value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Session</label>
                      <input className={inputClass} value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                    <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Skills</label>
                    <input className={inputClass} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. Python, IoT, Arduino" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">LinkedIn</label>
                    <input className={inputClass} value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">GitHub</label>
                    <input className={inputClass} value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Facebook</label>
                    <input className={inputClass} value={form.facebook_link} onChange={(e) => setForm({ ...form, facebook_link: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <ProfileRow label="Name" value={profile?.full_name} />
                  <ProfileRow label="Email" value={user.email} />
                  <ProfileRow label="Student ID" value={profile?.student_id} />
                  <ProfileRow label="Department" value={profile?.department} />
                  <ProfileRow label="Batch" value={profile?.batch} />
                  <ProfileRow label="Session" value={profile?.session} />
                  <ProfileRow label="Phone" value={profile?.phone} />
                  <ProfileRow label="Skills" value={profile?.skills} />
                  <ProfileRow label="LinkedIn" value={profile?.linkedin} />
                  <ProfileRow label="GitHub" value={profile?.github} />
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span
                      className={`font-mono text-xs px-2 py-0.5 rounded ${
                        profile?.status === "approved"
                          ? "bg-green-500/10 text-green-400"
                          : profile?.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {profile?.status || "pending"}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Member ID Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-xl glass border-primary/20"
            >
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">Member ID Card</h3>
              <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/20 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto mb-3 flex items-center justify-center">
                  <span className="font-display text-xl font-bold text-primary">
                    {profile?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </span>
                </div>
                <h4 className="font-semibold text-foreground">{profile?.full_name}</h4>
                <p className="text-xs text-muted-foreground">{profile?.department || "—"}</p>
                {(profile as any)?.membership_id ? (
                  <p className="text-sm font-mono font-bold text-primary mt-3 px-3 py-1.5 rounded-lg bg-primary/10 inline-block">
                    {(profile as any).membership_id}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    {profile?.status === "approved" ? "ID being assigned..." : "Membership ID will be assigned upon approval"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">RUET IoT Club</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

const ProfileRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <span className="text-muted-foreground">{label}:</span>{" "}
    <span className="text-foreground">{value || "Not set"}</span>
  </div>
);

export default Dashboard;
