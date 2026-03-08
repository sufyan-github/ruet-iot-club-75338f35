import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, X, Users, FolderOpen, Calendar, Eye, GraduationCap, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type TabType = "members" | "payments" | "projects" | "events" | "alumni";

const emptyAlumniForm = { name: "", batch: "", department: "", company: "", linkedin: "" };

const AdminDashboard = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("members");
  const [members, setMembers] = useState<Tables<"profiles">[]>([]);
  const [payments, setPayments] = useState<Tables<"membership_payments">[]>([]);
  const [projects, setProjects] = useState<Tables<"projects">[]>([]);
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [alumni, setAlumni] = useState<Tables<"alumni">[]>([]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
      if (!isAdmin && user) toast.error("Admin access required");
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, tab]);

  const fetchData = async () => {
    if (tab === "members") {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setMembers(data || []);
    } else if (tab === "payments") {
      const { data } = await supabase.from("membership_payments").select("*").order("created_at", { ascending: false });
      setPayments(data || []);
    } else if (tab === "projects") {
      const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      setProjects(data || []);
    } else if (tab === "events") {
      const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      setEvents(data || []);
    } else if (tab === "alumni") {
      const { data } = await supabase.from("alumni").select("*").order("batch", { ascending: false });
      setAlumni(data || []);
    }
  };

  const updateMemberStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
    if (error) toast.error("Failed to update status");
    else { toast.success(`Member ${status}`); fetchData(); }
  };

  const updatePaymentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("membership_payments").update({ payment_status: status }).eq("id", id);
    if (error) toast.error("Failed to update payment");
    else { toast.success(`Payment ${status}`); fetchData(); }
  };

  const updateProjectStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("projects").update({ status }).eq("id", id);
    if (error) toast.error("Failed to update project");
    else { toast.success("Project status updated"); fetchData(); }
  };

  // Event management
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: "", venue: "", description: "", type: "", max_participants: "" });

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("events").insert({
      title: eventForm.title, date: eventForm.date, venue: eventForm.venue,
      description: eventForm.description, type: eventForm.type,
      max_participants: eventForm.max_participants ? parseInt(eventForm.max_participants) : null,
    });
    if (error) toast.error("Failed to create event");
    else {
      toast.success("Event created!");
      setShowEventForm(false);
      setEventForm({ title: "", date: "", venue: "", description: "", type: "", max_participants: "" });
      fetchData();
    }
  };

  // Alumni management
  const [showAlumniForm, setShowAlumniForm] = useState(false);
  const [alumniForm, setAlumniForm] = useState(emptyAlumniForm);
  const [editingAlumniId, setEditingAlumniId] = useState<string | null>(null);

  const handleAlumniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: alumniForm.name,
      batch: alumniForm.batch || null,
      department: alumniForm.department || null,
      company: alumniForm.company || null,
      linkedin: alumniForm.linkedin || null,
    };

    if (editingAlumniId) {
      const { error } = await supabase.from("alumni").update(payload).eq("id", editingAlumniId);
      if (error) toast.error("Failed to update alumni");
      else { toast.success("Alumni updated!"); resetAlumniForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("alumni").insert(payload);
      if (error) toast.error("Failed to add alumni");
      else { toast.success("Alumni added!"); resetAlumniForm(); fetchData(); }
    }
  };

  const editAlumni = (a: Tables<"alumni">) => {
    setAlumniForm({ name: a.name, batch: a.batch || "", department: a.department || "", company: a.company || "", linkedin: a.linkedin || "" });
    setEditingAlumniId(a.id);
    setShowAlumniForm(true);
  };

  const deleteAlumni = async (id: string) => {
    const { error } = await supabase.from("alumni").delete().eq("id", id);
    if (error) toast.error("Failed to delete alumni");
    else { toast.success("Alumni deleted"); fetchData(); }
  };

  const resetAlumniForm = () => {
    setAlumniForm(emptyAlumniForm);
    setEditingAlumniId(null);
    setShowAlumniForm(false);
  };

  if (loading || !isAdmin) return null;

  const tabs: { key: TabType; label: string; icon: typeof Users }[] = [
    { key: "members", label: "Members", icon: Users },
    { key: "payments", label: "Payments", icon: Eye },
    { key: "projects", label: "Projects", icon: FolderOpen },
    { key: "events", label: "Events", icon: Calendar },
    { key: "alumni", label: "Alumni", icon: GraduationCap },
  ];

  const inputClass = "w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Admin Dashboard" subtitle="Manage all club operations" />

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {/* Members Tab */}
          {tab === "members" && (
            <div className="space-y-3 max-w-4xl mx-auto">
              {members.length === 0 && <p className="text-center text-muted-foreground">No members yet.</p>}
              {members.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground">{m.full_name}</h4>
                    <p className="text-xs text-muted-foreground">{m.department || "—"} · {m.student_id || "—"} · {m.phone || "—"}</p>
                  </div>
                  <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                    m.status === "approved" ? "bg-green-500/10 text-green-400" :
                    m.status === "rejected" ? "bg-destructive/10 text-destructive" :
                    "bg-yellow-500/10 text-yellow-400"
                  }`}>{m.status}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => updateMemberStatus(m.user_id, "approved")}
                      className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"><Check size={14} /></button>
                    <button onClick={() => updateMemberStatus(m.user_id, "rejected")}
                      className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><X size={14} /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Payments Tab */}
          {tab === "payments" && (
            <div className="space-y-3 max-w-4xl mx-auto">
              {payments.length === 0 && <p className="text-center text-muted-foreground">No payments yet.</p>}
              {payments.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-mono">{p.transaction_id}</p>
                    <p className="text-xs text-muted-foreground">{p.payment_method} · ৳{p.amount}</p>
                  </div>
                  <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                    p.payment_status === "verified" ? "bg-green-500/10 text-green-400" :
                    p.payment_status === "rejected" ? "bg-destructive/10 text-destructive" :
                    "bg-yellow-500/10 text-yellow-400"
                  }`}>{p.payment_status}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => updatePaymentStatus(p.id, "verified")}
                      className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"><Check size={14} /></button>
                    <button onClick={() => updatePaymentStatus(p.id, "rejected")}
                      className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><X size={14} /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Projects Tab */}
          {tab === "projects" && (
            <div className="space-y-3 max-w-4xl mx-auto">
              {projects.length === 0 && <p className="text-center text-muted-foreground">No projects yet.</p>}
              {projects.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground">{p.title}</h4>
                    <p className="text-xs text-muted-foreground">{p.category || "—"}</p>
                  </div>
                  <select value={p.status} onChange={(e) => updateProjectStatus(p.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded bg-secondary border border-border text-foreground">
                    <option value="idea">Idea</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="published">Published</option>
                  </select>
                </motion.div>
              ))}
            </div>
          )}

          {/* Events Tab */}
          {tab === "events" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowEventForm(!showEventForm)}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                  {showEventForm ? "Cancel" : "Create Event"}
                </button>
              </div>

              {showEventForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  onSubmit={createEvent} className="p-6 rounded-xl glass space-y-4 mb-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input placeholder="Event Title *" required value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className={inputClass} />
                    <input type="datetime-local" required value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className={inputClass} />
                    <input placeholder="Venue" value={eventForm.venue}
                      onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} className={inputClass} />
                    <input placeholder="Type (Workshop, Hackathon...)" value={eventForm.type}
                      onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })} className={inputClass} />
                    <input placeholder="Max Participants" type="number" value={eventForm.max_participants}
                      onChange={(e) => setEventForm({ ...eventForm, max_participants: e.target.value })} className={inputClass} />
                  </div>
                  <textarea placeholder="Description" rows={3} value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className={inputClass + " resize-none"} />
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                    Create Event
                  </button>
                </motion.form>
              )}

              <div className="space-y-3">
                {events.length === 0 && <p className="text-center text-muted-foreground">No events yet.</p>}
                {events.map((e) => (
                  <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">{e.title}</h4>
                      <p className="text-xs text-muted-foreground">{e.type || "—"} · {e.venue || "—"} · {new Date(e.date).toLocaleDateString()}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Alumni Tab */}
          {tab === "alumni" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-end mb-4">
                <button onClick={() => { showAlumniForm ? resetAlumniForm() : setShowAlumniForm(true); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                  {showAlumniForm ? "Cancel" : "Add Alumni"}
                </button>
              </div>

              {showAlumniForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleAlumniSubmit} className="p-6 rounded-xl glass space-y-4 mb-6">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">
                    {editingAlumniId ? "Edit Alumni" : "Add New Alumni"}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input placeholder="Full Name *" required value={alumniForm.name}
                      onChange={(e) => setAlumniForm({ ...alumniForm, name: e.target.value })} className={inputClass} />
                    <input placeholder="Batch (e.g., 2018)" value={alumniForm.batch}
                      onChange={(e) => setAlumniForm({ ...alumniForm, batch: e.target.value })} className={inputClass} />
                    <input placeholder="Department" value={alumniForm.department}
                      onChange={(e) => setAlumniForm({ ...alumniForm, department: e.target.value })} className={inputClass} />
                    <input placeholder="Current Company" value={alumniForm.company}
                      onChange={(e) => setAlumniForm({ ...alumniForm, company: e.target.value })} className={inputClass} />
                  </div>
                  <input placeholder="LinkedIn URL" value={alumniForm.linkedin}
                    onChange={(e) => setAlumniForm({ ...alumniForm, linkedin: e.target.value })} className={inputClass} />
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                    {editingAlumniId ? "Update Alumni" : "Add Alumni"}
                  </button>
                </motion.form>
              )}

              <div className="space-y-3">
                {alumni.length === 0 && <p className="text-center text-muted-foreground">No alumni records yet.</p>}
                {alumni.map((a) => (
                  <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">{a.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {a.batch ? `Batch ${a.batch}` : "—"} · {a.department || "—"} · {a.company || "—"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editAlumni(a)}
                        className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteAlumni(a.id)}
                        className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AdminDashboard;
