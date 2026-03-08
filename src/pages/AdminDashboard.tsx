import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, X, Users, FolderOpen, Calendar, Eye, GraduationCap, Pencil, Trash2, Plus, UserCog, Image, FileText, Download, ChevronDown, ChevronUp, BookOpen, Mail } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

type TabType = "applications" | "members" | "payments" | "team" | "projects" | "events" | "alumni" | "photos" | "blog";

const emptyAlumniForm = { name: "", batch: "", department: "", company: "", linkedin: "" };
const emptyProjectForm = { title: "", description: "", category: "", status: "idea", github_link: "", image_url: "" };
const emptyEventForm = { title: "", date: "", venue: "", description: "", type: "", max_participants: "", image_url: "", is_paid: false, registration_fee: "", payment_methods: [] as string[] };
const TEAM_CATEGORIES = ["Executive Board", "Advisory Board", "Core Team", "General Members"];
const emptyTeamForm = { name: "", position: "", department: "", bio: "", image_url: "", linkedin: "", github: "", email: "", sort_order: "0", category: "Executive Board" };
const emptyPhotoForm = { title: "", image_url: "", description: "" };

const AdminDashboard = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("applications");
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  // Form states
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [showAlumniForm, setShowAlumniForm] = useState(false);
  const [alumniForm, setAlumniForm] = useState(emptyAlumniForm);
  const [editingAlumniId, setEditingAlumniId] = useState<string | null>(null);

  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [photoForm, setPhotoForm] = useState(emptyPhotoForm);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
      if (!isAdmin && user) toast.error("Admin access required");
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, tab]);

  const fetchData = async () => {
    switch (tab) {
      case "applications":
      case "members": {
        const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
        setMembers(data || []);
        break;
      }
      case "payments": {
        const { data: payData } = await supabase.from("membership_payments").select("*").order("created_at", { ascending: false });
        // Fetch member names for payments
        const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, email, phone, department, student_id");
        setMembers(profilesData || []);
        setPayments(payData || []);
        break;
      }
      case "projects": {
        const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
        setProjects(data || []);
        break;
      }
      case "events": {
        const { data } = await supabase.from("events").select("*").order("date", { ascending: false });
        setEvents(data || []);
        break;
      }
      case "alumni": {
        const { data } = await supabase.from("alumni").select("*").order("batch", { ascending: false });
        setAlumni(data || []);
        break;
      }
      case "team": {
        const { data } = await supabase.from("team_members").select("*").order("sort_order", { ascending: true });
        setTeamMembers(data || []);
        break;
      }
      case "photos": {
        const { data } = await supabase.from("activity_photos").select("*").order("created_at", { ascending: false });
        setPhotos(data || []);
        break;
      }
      case "blog": {
        const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
        setBlogPosts(data || []);
        break;
      }
    }
  };

  const updateMemberStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success(`Member ${status}`);
    // Send email notification
    try {
      await supabase.functions.invoke("send-notification", {
        body: { user_id: userId, status, type: "membership" },
      });
      toast.info("Notification email sent");
    } catch { /* silent fail */ }
    fetchData();
  };

  const updatePaymentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("membership_payments").update({ payment_status: status }).eq("id", id);
    if (error) toast.error("Failed to update payment");
    else { toast.success(`Payment ${status}`); fetchData(); }
  };

  // ─── Project CRUD ───
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { title: projectForm.title, description: projectForm.description || null, category: projectForm.category || null, status: projectForm.status, github_link: projectForm.github_link || null, image_url: projectForm.image_url || null };
    if (editingProjectId) {
      const { error } = await supabase.from("projects").update(payload).eq("id", editingProjectId);
      if (error) toast.error("Failed"); else { toast.success("Project updated!"); resetProjectForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("projects").insert({ ...payload, created_by: user!.id });
      if (error) toast.error("Failed"); else { toast.success("Project created!"); resetProjectForm(); fetchData(); }
    }
  };
  const editProject = (p: any) => { setProjectForm({ title: p.title, description: p.description || "", category: p.category || "", status: p.status, github_link: p.github_link || "", image_url: p.image_url || "" }); setEditingProjectId(p.id); setShowProjectForm(true); };
  const deleteProject = async (id: string) => { const { error } = await supabase.from("projects").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Project deleted"); fetchData(); } };
  const resetProjectForm = () => { setProjectForm(emptyProjectForm); setEditingProjectId(null); setShowProjectForm(false); };

  // ─── Event CRUD ───
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { title: eventForm.title, date: eventForm.date, venue: eventForm.venue || null, description: eventForm.description || null, type: eventForm.type || null, max_participants: eventForm.max_participants ? parseInt(eventForm.max_participants) : null, image_url: eventForm.image_url || null, is_paid: eventForm.is_paid, registration_fee: eventForm.is_paid && eventForm.registration_fee ? parseFloat(eventForm.registration_fee) : 0, payment_methods: eventForm.is_paid ? eventForm.payment_methods : [] };
    if (editingEventId) {
      const { error } = await supabase.from("events").update(payload).eq("id", editingEventId);
      if (error) toast.error("Failed"); else { toast.success("Event updated!"); resetEventForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) toast.error("Failed"); else { toast.success("Event created!"); resetEventForm(); fetchData(); }
    }
  };
  const editEvent = (ev: any) => { setEventForm({ title: ev.title, date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : "", venue: ev.venue || "", description: ev.description || "", type: ev.type || "", max_participants: ev.max_participants?.toString() || "", image_url: ev.image_url || "", is_paid: ev.is_paid || false, registration_fee: ev.registration_fee?.toString() || "", payment_methods: ev.payment_methods || [] }); setEditingEventId(ev.id); setShowEventForm(true); };
  const deleteEvent = async (id: string) => { const { error } = await supabase.from("events").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Event deleted"); fetchData(); } };
  const resetEventForm = () => { setEventForm(emptyEventForm); setEditingEventId(null); setShowEventForm(false); };
  const togglePaymentMethod = (method: string) => { setEventForm(prev => ({ ...prev, payment_methods: prev.payment_methods.includes(method) ? prev.payment_methods.filter(m => m !== method) : [...prev.payment_methods, method] })); };

  // ─── Alumni CRUD ───
  const handleAlumniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: alumniForm.name, batch: alumniForm.batch || null, department: alumniForm.department || null, company: alumniForm.company || null, linkedin: alumniForm.linkedin || null };
    if (editingAlumniId) {
      const { error } = await supabase.from("alumni").update(payload).eq("id", editingAlumniId);
      if (error) toast.error("Failed"); else { toast.success("Alumni updated!"); resetAlumniForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("alumni").insert(payload);
      if (error) toast.error("Failed"); else { toast.success("Alumni added!"); resetAlumniForm(); fetchData(); }
    }
  };
  const editAlumni = (a: any) => { setAlumniForm({ name: a.name, batch: a.batch || "", department: a.department || "", company: a.company || "", linkedin: a.linkedin || "" }); setEditingAlumniId(a.id); setShowAlumniForm(true); };
  const deleteAlumni = async (id: string) => { const { error } = await supabase.from("alumni").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Alumni deleted"); fetchData(); } };
  const resetAlumniForm = () => { setAlumniForm(emptyAlumniForm); setEditingAlumniId(null); setShowAlumniForm(false); };

  // ─── Team CRUD ───
  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: teamForm.name, position: teamForm.position, department: teamForm.department || null, bio: teamForm.bio || null, image_url: teamForm.image_url || null, linkedin: teamForm.linkedin || null, github: teamForm.github || null, email: teamForm.email || null, sort_order: parseInt(teamForm.sort_order) || 0, category: teamForm.category || "Executive Board" } as any;
    if (editingTeamId) {
      const { error } = await supabase.from("team_members").update(payload).eq("id", editingTeamId);
      if (error) toast.error("Failed"); else { toast.success("Team member updated!"); resetTeamForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("team_members").insert(payload);
      if (error) toast.error("Failed"); else { toast.success("Team member added!"); resetTeamForm(); fetchData(); }
    }
  };
  const editTeam = (t: any) => { setTeamForm({ name: t.name, position: t.position, department: t.department || "", bio: t.bio || "", image_url: t.image_url || "", linkedin: t.linkedin || "", github: t.github || "", email: t.email || "", sort_order: t.sort_order?.toString() || "0", category: t.category || "Executive Board" }); setEditingTeamId(t.id); setShowTeamForm(true); };
  const deleteTeam = async (id: string) => { const { error } = await supabase.from("team_members").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Team member removed"); fetchData(); } };
  const resetTeamForm = () => { setTeamForm(emptyTeamForm); setEditingTeamId(null); setShowTeamForm(false); };

  // ─── Photo CRUD ───
  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoForm.image_url) { toast.error("Please upload an image"); return; }
    const payload = { title: photoForm.title || null, image_url: photoForm.image_url, description: photoForm.description || null };
    if (editingPhotoId) {
      const { error } = await supabase.from("activity_photos").update(payload).eq("id", editingPhotoId);
      if (error) toast.error("Failed"); else { toast.success("Photo updated!"); resetPhotoForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("activity_photos").insert(payload);
      if (error) toast.error("Failed"); else { toast.success("Photo added!"); resetPhotoForm(); fetchData(); }
    }
  };
  const editPhoto = (p: any) => { setPhotoForm({ title: p.title || "", image_url: p.image_url, description: p.description || "" }); setEditingPhotoId(p.id); setShowPhotoForm(true); };
  const deletePhoto = async (id: string) => { const { error } = await supabase.from("activity_photos").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Photo deleted"); fetchData(); } };
  const resetPhotoForm = () => { setPhotoForm(emptyPhotoForm); setEditingPhotoId(null); setShowPhotoForm(false); };

  if (loading || !isAdmin) return null;

  const tabsList: { key: TabType; label: string; icon: typeof Users }[] = [
    { key: "applications", label: "Applications", icon: FileText },
    { key: "members", label: "Members", icon: Users },
    { key: "payments", label: "Payments", icon: Eye },
    { key: "team", label: "Team", icon: UserCog },
    { key: "projects", label: "Projects", icon: FolderOpen },
    { key: "events", label: "Events", icon: Calendar },
    { key: "alumni", label: "Alumni", icon: GraduationCap },
    { key: "photos", label: "Photos", icon: Image },
    { key: "blog", label: "Blog", icon: BookOpen },
  ];

  const inputClass = "w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Admin Dashboard" subtitle="Manage all club operations" />

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabsList.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* ════════ Applications Tab ════════ */}
          {tab === "applications" && (
            <div className="space-y-3 max-w-4xl mx-auto">
              <p className="text-xs text-muted-foreground text-center mb-4">Click on an application to view full details</p>
              {members.length === 0 && <p className="text-center text-muted-foreground">No applications yet.</p>}
              {members.filter(m => m.motivation || m.areas_of_interest).map((m: any) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl glass overflow-hidden">
                  <button onClick={() => setExpandedApp(expandedApp === m.id ? null : m.id)}
                    className="w-full p-4 flex items-center justify-between gap-4 text-left">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">{m.full_name}</h4>
                      <p className="text-xs text-muted-foreground">{m.department || "—"} · {m.student_id || "—"} · {m.batch || m.session || "—"}</p>
                    </div>
                    <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                      m.status === "approved" ? "bg-green-500/10 text-green-400" :
                      m.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"
                    }`}>{m.status}</span>
                    {expandedApp === m.id ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {expandedApp === m.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/50 overflow-hidden">
                        <div className="p-5 space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <InfoRow label="Full Name" value={m.full_name} />
                            <InfoRow label="Student ID" value={m.student_id} />
                            <InfoRow label="Email" value={m.email} />
                            <InfoRow label="Phone" value={m.phone} />
                            <InfoRow label="Department" value={m.department} />
                            <InfoRow label="Batch" value={m.batch || m.session} />
                            <InfoRow label="Experience Level" value={m.experience_level} />
                            <InfoRow label="Time Commitment" value={m.time_commitment} />
                          </div>
                          <InfoRow label="Areas of Interest" value={m.areas_of_interest} />
                          {m.previous_projects && <InfoRow label="Previous Projects" value={m.previous_projects} />}
                          <InfoRow label="Motivation" value={m.motivation} />
                          <div className="grid md:grid-cols-2 gap-4">
                            {m.linkedin && <InfoRow label="LinkedIn" value={m.linkedin} isLink />}
                            {m.github && <InfoRow label="GitHub" value={m.github} isLink />}
                          </div>
                          {m.resume_url && (
                            <div>
                              <span className="text-xs text-muted-foreground">Resume/CV</span>
                              <button onClick={async () => {
                                const { data } = await supabase.storage.from("resumes").createSignedUrl(m.resume_url, 300);
                                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                else toast.error("Failed to get resume URL");
                              }} className="flex items-center gap-1 text-sm text-primary hover:underline mt-1">
                                <Download size={14} /> Download Resume
                              </button>
                            </div>
                          )}
                          <div className="flex gap-2 pt-2 border-t border-border/30">
                            <button onClick={() => updateMemberStatus(m.user_id, "approved")}
                              className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm font-medium transition-colors flex items-center gap-1">
                              <Check size={14} /> Approve
                            </button>
                            <button onClick={() => updateMemberStatus(m.user_id, "rejected")}
                              className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm font-medium transition-colors flex items-center gap-1">
                              <X size={14} /> Reject
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}

          {/* ════════ Members Tab ════════ */}
          {tab === "members" && (
            <div className="space-y-3 max-w-4xl mx-auto">
              {members.length === 0 && <p className="text-center text-muted-foreground">No members yet.</p>}
              {members.map((m: any) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground">{m.full_name}</h4>
                    <p className="text-xs text-muted-foreground">{m.department || "—"} · {m.student_id || "—"} · {m.phone || "—"}</p>
                  </div>
                  <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                    m.status === "approved" ? "bg-green-500/10 text-green-400" :
                    m.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"
                  }`}>{m.status}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => updateMemberStatus(m.user_id, "approved")} className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"><Check size={14} /></button>
                    <button onClick={() => updateMemberStatus(m.user_id, "rejected")} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><X size={14} /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ════════ Payments Tab ════════ */}
          {tab === "payments" && (
            <div className="max-w-4xl mx-auto">
              {/* Export Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    const headers = ["Name", "Department", "Student ID", "Email", "Transaction ID", "Payment Method", "Amount", "Status", "Date"];
                    const rows = payments.map((p: any) => {
                      const member = members.find((m: any) => m.user_id === p.user_id);
                      return [
                        member?.full_name || "Unknown",
                        member?.department || "",
                        member?.student_id || "",
                        member?.email || "",
                        p.transaction_id,
                        p.payment_method,
                        p.amount,
                        p.payment_status,
                        new Date(p.created_at).toLocaleDateString(),
                      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
                    });
                    const csv = [headers.join(","), ...rows].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("CSV exported!");
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Download size={16} /> Export CSV
                </button>
              </div>
              {/* Summary Cards */}
              {(() => {
                const totalRegistered = payments.length;
                const totalPaid = payments.filter(p => p.payment_status === "verified").reduce((sum, p) => sum + (p.amount || 0), 0);
                const pendingCount = payments.filter(p => p.payment_status === "pending").length;
                const verifiedCount = payments.filter(p => p.payment_status === "verified").length;
                const rejectedCount = payments.filter(p => p.payment_status === "rejected").length;
                const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-xl glass text-center">
                      <p className="text-2xl font-display font-bold text-foreground">{totalRegistered}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Registered</p>
                    </div>
                    <div className="p-4 rounded-xl glass text-center">
                      <p className="text-2xl font-display font-bold text-primary">৳{totalPaid}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Verified</p>
                    </div>
                    <div className="p-4 rounded-xl glass text-center">
                      <p className="text-2xl font-display font-bold text-foreground">৳{totalAmount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Amount</p>
                    </div>
                    <div className="p-4 rounded-xl glass text-center">
                      <div className="flex justify-center gap-3 text-xs">
                        <span className="text-green-400">{verifiedCount} ✓</span>
                        <span className="text-yellow-400">{pendingCount} ⏳</span>
                        <span className="text-destructive">{rejectedCount} ✗</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">By Status</p>
                    </div>
                  </div>
                );
              })()}

              {/* Payments List */}
              <div className="space-y-3">
                {payments.length === 0 && <p className="text-center text-muted-foreground">No payments yet.</p>}
                {payments.map((p: any) => {
                  const member = members.find((m: any) => m.user_id === p.user_id);
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{member?.full_name || "Unknown Member"}</p>
                          <p className="text-xs text-muted-foreground">
                            {member?.department || "—"} · {member?.student_id || "—"} · {member?.email || "—"}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs font-mono text-muted-foreground">TXN: {p.transaction_id}</span>
                            <span className="text-xs text-muted-foreground">{p.payment_method}</span>
                            <span className="text-xs font-semibold text-primary">৳{p.amount}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                          p.payment_status === "verified" ? "bg-green-500/10 text-green-400" :
                          p.payment_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"
                        }`}>{p.payment_status}</span>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => updatePaymentStatus(p.id, "verified")} className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"><Check size={14} /></button>
                          <button onClick={() => updatePaymentStatus(p.id, "rejected")} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><X size={14} /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════ Team Tab ════════ */}
          {tab === "team" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-end mb-4">
                <button onClick={() => { showTeamForm ? resetTeamForm() : setShowTeamForm(true); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Plus size={16} /> {showTeamForm ? "Cancel" : "Add Team Member"}
                </button>
              </div>

              {showTeamForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleTeamSubmit} className="p-6 rounded-xl glass space-y-4 mb-6">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">
                    {editingTeamId ? "Edit Team Member" : "Add Team Member"}
                  </h3>
                  <ImageUpload folder="team" currentUrl={teamForm.image_url}
                    onUpload={(url) => setTeamForm({ ...teamForm, image_url: url })} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <input placeholder="Full Name *" required value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} className={inputClass} />
                    <input placeholder="Position (e.g., President) *" required value={teamForm.position} onChange={(e) => setTeamForm({ ...teamForm, position: e.target.value })} className={inputClass} />
                    <input placeholder="Department" value={teamForm.department} onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })} className={inputClass} />
                    <input placeholder="Sort Order (0 = first)" type="number" value={teamForm.sort_order} onChange={(e) => setTeamForm({ ...teamForm, sort_order: e.target.value })} className={inputClass} />
                    <input placeholder="Email" value={teamForm.email} onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })} className={inputClass} />
                    <input placeholder="LinkedIn URL" value={teamForm.linkedin} onChange={(e) => setTeamForm({ ...teamForm, linkedin: e.target.value })} className={inputClass} />
                    <input placeholder="GitHub URL" value={teamForm.github} onChange={(e) => setTeamForm({ ...teamForm, github: e.target.value })} className={inputClass} />
                  </div>
                  <textarea placeholder="Bio / Description" rows={3} value={teamForm.bio} onChange={(e) => setTeamForm({ ...teamForm, bio: e.target.value })} className={inputClass + " resize-none"} />
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                    {editingTeamId ? "Update" : "Add Member"}
                  </button>
                </motion.form>
              )}

              <div className="space-y-3">
                {teamMembers.length === 0 && <p className="text-center text-muted-foreground">No team members yet.</p>}
                {teamMembers.map((t: any) => (
                  <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {t.image_url ? (
                        <img src={t.image_url} alt={t.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                          <span className="font-display text-xs font-bold text-primary">{t.name.split(" ").map((n: string) => n[0]).join("")}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground">{t.name}</h4>
                        <p className="text-xs text-muted-foreground">{t.position} · {t.department || "—"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editTeam(t)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => deleteTeam(t.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ Projects Tab ════════ */}
          {tab === "projects" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-end mb-4">
                <button onClick={() => { showProjectForm ? resetProjectForm() : setShowProjectForm(true); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Plus size={16} /> {showProjectForm ? "Cancel" : "Add Project"}
                </button>
              </div>
              {showProjectForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleProjectSubmit} className="p-6 rounded-xl glass space-y-4 mb-6">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">{editingProjectId ? "Edit Project" : "Add New Project"}</h3>
                  <ImageUpload folder="projects" currentUrl={projectForm.image_url} onUpload={(url) => setProjectForm({ ...projectForm, image_url: url })} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <input placeholder="Project Title *" required value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} className={inputClass} />
                    <input placeholder="Category" value={projectForm.category} onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })} className={inputClass} />
                    <select value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })} className={inputClass}>
                      <option value="idea">Idea</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="published">Published</option>
                    </select>
                    <input placeholder="GitHub Link" value={projectForm.github_link} onChange={(e) => setProjectForm({ ...projectForm, github_link: e.target.value })} className={inputClass} />
                  </div>
                  <textarea placeholder="Description" rows={3} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className={inputClass + " resize-none"} />
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">{editingProjectId ? "Update" : "Create"}</button>
                </motion.form>
              )}
              <div className="space-y-3">
                {projects.length === 0 && <p className="text-center text-muted-foreground">No projects yet.</p>}
                {projects.map((p: any) => (
                  <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {p.image_url && <img src={p.image_url} alt={p.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                      <div className="min-w-0"><h4 className="font-semibold text-sm text-foreground">{p.title}</h4><p className="text-xs text-muted-foreground">{p.category || "—"} · {p.status}</p></div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editProject(p)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => deleteProject(p.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ Events Tab ════════ */}
          {tab === "events" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-end mb-4">
                <button onClick={() => { showEventForm ? resetEventForm() : setShowEventForm(true); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Plus size={16} /> {showEventForm ? "Cancel" : "Create Event"}
                </button>
              </div>
              {showEventForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleEventSubmit} className="p-6 rounded-xl glass space-y-4 mb-6">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">{editingEventId ? "Edit Event" : "Create New Event"}</h3>
                  <ImageUpload folder="events" currentUrl={eventForm.image_url} onUpload={(url) => setEventForm({ ...eventForm, image_url: url })} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <input placeholder="Event Title *" required value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className={inputClass} />
                    <input type="datetime-local" required value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className={inputClass} />
                    <input placeholder="Venue" value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} className={inputClass} />
                    <input placeholder="Type (Workshop, Hackathon...)" value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })} className={inputClass} />
                    <input placeholder="Max Participants" type="number" value={eventForm.max_participants} onChange={(e) => setEventForm({ ...eventForm, max_participants: e.target.value })} className={inputClass} />
                  </div>
                  <textarea placeholder="Description" rows={3} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className={inputClass + " resize-none"} />
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-foreground">Registration:</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEventForm({ ...eventForm, is_paid: false })} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!eventForm.is_paid ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Free</button>
                        <button type="button" onClick={() => setEventForm({ ...eventForm, is_paid: true })} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${eventForm.is_paid ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Paid</button>
                      </div>
                    </div>
                    {eventForm.is_paid && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        <input placeholder="Registration Fee (৳)" type="number" value={eventForm.registration_fee} onChange={(e) => setEventForm({ ...eventForm, registration_fee: e.target.value })} className={inputClass} />
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Payment Methods:</label>
                          <div className="flex flex-wrap gap-2">
                            {["bKash", "Nagad", "Rocket", "Online Banking"].map((method) => (
                              <button key={method} type="button" onClick={() => togglePaymentMethod(method)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${eventForm.payment_methods.includes(method) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{method}</button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">{editingEventId ? "Update" : "Create"}</button>
                </motion.form>
              )}
              <div className="space-y-3">
                {events.length === 0 && <p className="text-center text-muted-foreground">No events yet.</p>}
                {events.map((ev: any) => (
                  <motion.div key={ev.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {ev.image_url && <img src={ev.image_url} alt={ev.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground">{ev.title}</h4>
                        <p className="text-xs text-muted-foreground">{ev.type || "—"} · {ev.venue || "—"} · {new Date(ev.date).toLocaleDateString()}{ev.is_paid && <span className="ml-1 text-primary"> · ৳{ev.registration_fee}</span>}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editEvent(ev)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => deleteEvent(ev.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ Alumni Tab ════════ */}
          {tab === "alumni" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-end mb-4">
                <button onClick={() => { showAlumniForm ? resetAlumniForm() : setShowAlumniForm(true); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Plus size={16} /> {showAlumniForm ? "Cancel" : "Add Alumni"}
                </button>
              </div>
              {showAlumniForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleAlumniSubmit} className="p-6 rounded-xl glass space-y-4 mb-6">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">{editingAlumniId ? "Edit Alumni" : "Add New Alumni"}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input placeholder="Full Name *" required value={alumniForm.name} onChange={(e) => setAlumniForm({ ...alumniForm, name: e.target.value })} className={inputClass} />
                    <input placeholder="Batch (e.g., 2018)" value={alumniForm.batch} onChange={(e) => setAlumniForm({ ...alumniForm, batch: e.target.value })} className={inputClass} />
                    <input placeholder="Department" value={alumniForm.department} onChange={(e) => setAlumniForm({ ...alumniForm, department: e.target.value })} className={inputClass} />
                    <input placeholder="Current Company" value={alumniForm.company} onChange={(e) => setAlumniForm({ ...alumniForm, company: e.target.value })} className={inputClass} />
                  </div>
                  <input placeholder="LinkedIn URL" value={alumniForm.linkedin} onChange={(e) => setAlumniForm({ ...alumniForm, linkedin: e.target.value })} className={inputClass} />
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">{editingAlumniId ? "Update" : "Add"}</button>
                </motion.form>
              )}
              <div className="space-y-3">
                {alumni.length === 0 && <p className="text-center text-muted-foreground">No alumni records yet.</p>}
                {alumni.map((a: any) => (
                  <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0"><h4 className="font-semibold text-sm text-foreground">{a.name}</h4><p className="text-xs text-muted-foreground">{a.batch ? `Batch ${a.batch}` : "—"} · {a.department || "—"} · {a.company || "—"}</p></div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editAlumni(a)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => deleteAlumni(a.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ Photos Tab ════════ */}
          {tab === "photos" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-end mb-4">
                <button onClick={() => { showPhotoForm ? resetPhotoForm() : setShowPhotoForm(true); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Plus size={16} /> {showPhotoForm ? "Cancel" : "Upload Photo"}
                </button>
              </div>
              {showPhotoForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handlePhotoSubmit} className="p-6 rounded-xl glass space-y-4 mb-6">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">{editingPhotoId ? "Edit Photo" : "Upload Activity Photo"}</h3>
                  <ImageUpload folder="activities" currentUrl={photoForm.image_url} onUpload={(url) => setPhotoForm({ ...photoForm, image_url: url })} />
                  <input placeholder="Title / Caption" value={photoForm.title} onChange={(e) => setPhotoForm({ ...photoForm, title: e.target.value })} className={inputClass} />
                  <textarea placeholder="Description" rows={2} value={photoForm.description} onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })} className={inputClass + " resize-none"} />
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">{editingPhotoId ? "Update" : "Upload"}</button>
                </motion.form>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.length === 0 && <p className="col-span-full text-center text-muted-foreground">No photos yet.</p>}
                {photos.map((p: any) => (
                  <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="rounded-xl glass overflow-hidden group relative">
                    <img src={p.image_url} alt={p.title || "Activity"} className="w-full h-40 object-cover" />
                    <div className="p-3">
                      {p.title && <p className="text-xs font-semibold text-foreground">{p.title}</p>}
                      {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => editPhoto(p)} className="p-1.5 rounded bg-background/80 text-primary hover:bg-background transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => deletePhoto(p.id)} className="p-1.5 rounded bg-background/80 text-destructive hover:bg-background transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ Blog Tab ════════ */}
          {tab === "blog" && (
            <div className="max-w-4xl mx-auto">
              <p className="text-xs text-muted-foreground text-center mb-4">Review and publish member blog posts</p>
              {blogPosts.length === 0 && <p className="text-center text-muted-foreground">No blog posts yet.</p>}
              <div className="space-y-3">
                {blogPosts.map((post: any) => (
                  <motion.div key={post.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-4 rounded-xl glass">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground">{post.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                        post.published ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {post.published ? "Published" : "Pending"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{post.content?.substring(0, 200)}</p>
                    <div className="flex gap-2">
                      {!post.published && (
                        <button onClick={async () => {
                          const { error } = await supabase.from("blog_posts").update({ published: true }).eq("id", post.id);
                          if (error) toast.error("Failed"); else { toast.success("Blog post published!"); fetchData(); }
                        }} className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-medium transition-colors flex items-center gap-1">
                          <Check size={12} /> Publish
                        </button>
                      )}
                      {post.published && (
                        <button onClick={async () => {
                          const { error } = await supabase.from("blog_posts").update({ published: false }).eq("id", post.id);
                          if (error) toast.error("Failed"); else { toast.success("Blog post unpublished"); fetchData(); }
                        }} className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 text-xs font-medium transition-colors">
                          Unpublish
                        </button>
                      )}
                      <button onClick={async () => {
                        const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
                        if (error) toast.error("Failed"); else { toast.success("Blog post deleted"); fetchData(); }
                      }} className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-medium transition-colors flex items-center gap-1">
                        <Trash2 size={12} /> Delete
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

const InfoRow = ({ label, value, isLink }: { label: string; value?: string | null; isLink?: boolean }) => {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline truncate">{value}</a>
      ) : (
        <p className="text-sm text-foreground">{value}</p>
      )}
    </div>
  );
};

export default AdminDashboard;
