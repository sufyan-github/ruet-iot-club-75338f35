import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, X, Users, FolderOpen, Calendar, Eye, GraduationCap, Pencil, Trash2, Plus, UserCog, Image, FileText, Download, ChevronDown, ChevronUp, BookOpen, Mail, FlaskConical, Video, Award, BarChart3, Shield, Megaphone } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

const downloadCSV = (rows: Record<string, string>[], filename: string) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${(r[h] || "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

type TabType = "overview" | "applications" | "members" | "payments" | "team" | "projects" | "events" | "alumni" | "photos" | "blog" | "research" | "courses" | "hero" | "announcements";

const emptyAlumniForm = { name: "", batch: "", department: "", company: "", linkedin: "" };
const emptyProjectForm = { title: "", description: "", category: "", status: "idea", github_link: "", image_url: "" };
const emptyEventForm = { title: "", date: "", venue: "", description: "", type: "", max_participants: "", image_url: "", is_paid: false, registration_fee: "", payment_methods: [] as string[], payment_number: "01580352238", bank_account: "4170331020181850" };
const TEAM_CATEGORIES = ["Executive Board", "Advisory Board", "Core Team", "General Members"];
const emptyTeamForm = { name: "", position: "", department: "", bio: "", image_url: "", linkedin: "", github: "", email: "", sort_order: "0", category: "Executive Board" };
const emptyPhotoForm = { title: "", image_url: "", description: "" };
const emptyResearchForm = { title: "", authors: "", abstract: "", pdf_url: "", doi_link: "", status: "ongoing", research_area: "", tags: "" };
const emptyCourseForm = { title: "", description: "", instructor: "", image_url: "", is_paid: false, price: "", category: "", duration: "", max_students: "", status: "draft" };
const emptyLessonForm = { title: "", video_url: "", pdf_file: "", sort_order: "0" };
const emptyHeroForm = { image_url: "", tagline: "", sort_order: "0", active: true };
const emptyAnnouncementForm = { title: "", message: "" };

const AdminDashboard = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("overview");
  const [overviewStats, setOverviewStats] = useState<any>({});
  const [editingMemberProfile, setEditingMemberProfile] = useState<any>(null);
  const [memberProfileForm, setMemberProfileForm] = useState<any>({});
  const [memberRoles, setMemberRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [eventPayments, setEventPayments] = useState<any[]>([]);
  const [paymentSubTab, setPaymentSubTab] = useState<"membership" | "event" | "course">("membership");
  const [projects, setProjects] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [researchPapers, setResearchPapers] = useState<any[]>([]);
  const [adminCourses, setAdminCourses] = useState<any[]>([]);
  const [courseLessons, setCourseLessons] = useState<any[]>([]);
  const [courseRegistrations, setCourseRegistrations] = useState<any[]>([]);
  const [courseCertificates, setCourseCertificates] = useState<any[]>([]);
  const [courseProfiles, setCourseProfiles] = useState<any[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [showHeroForm, setShowHeroForm] = useState(false);
  const [heroForm, setHeroForm] = useState(emptyHeroForm);
  const [editingHeroId, setEditingHeroId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

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

  const [showResearchForm, setShowResearchForm] = useState(false);
  const [researchForm, setResearchForm] = useState(emptyResearchForm);
  const [editingResearchId, setEditingResearchId] = useState<string | null>(null);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

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
      case "overview": {
        const [profilesRes, paymentsRes, eventsRes, projectsRes, coursesRes, blogRes, alumniRes, certsRes, courseRegsRes, eventRegsRes] = await Promise.all([
          supabase.from("profiles").select("status, created_at"),
          supabase.from("membership_payments").select("amount, payment_status"),
          supabase.from("events").select("id"),
          supabase.from("projects").select("id, status"),
          supabase.from("courses").select("id, status"),
          supabase.from("blog_posts").select("id, published"),
          supabase.from("alumni").select("id"),
          supabase.from("certificates").select("id"),
          supabase.from("course_registrations").select("payment_status, completed"),
          supabase.from("event_registrations").select("payment_status"),
        ]);
        const profiles = profilesRes.data || [];
        const pays = paymentsRes.data || [];
        setOverviewStats({
          totalMembers: profiles.length,
          approvedMembers: profiles.filter(p => p.status === "approved").length,
          pendingMembers: profiles.filter(p => p.status === "pending").length,
          totalRevenue: pays.filter(p => p.payment_status === "verified").reduce((s, p) => s + (p.amount || 0), 0),
          pendingPayments: pays.filter(p => p.payment_status === "pending").length,
          totalEvents: (eventsRes.data || []).length,
          totalProjects: (projectsRes.data || []).length,
          activeProjects: (projectsRes.data || []).filter(p => p.status !== "completed").length,
          totalCourses: (coursesRes.data || []).length,
          publishedCourses: (coursesRes.data || []).filter(c => c.status === "published").length,
          pendingBlogs: (blogRes.data || []).filter(b => !b.published).length,
          totalAlumni: (alumniRes.data || []).length,
          totalCertificates: (certsRes.data || []).length,
          courseEnrollments: (courseRegsRes.data || []).length,
          courseCompleted: (courseRegsRes.data || []).filter(r => r.completed).length,
          eventRegistrations: (eventRegsRes.data || []).length,
        });
        break;
      }
      case "applications":
      case "members": {
        const [profilesRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("user_roles").select("*"),
        ]);
        setMembers(profilesRes.data || []);
        setMemberRoles(rolesRes.data || []);
        break;
      }
      case "payments": {
        const { data: payData } = await supabase.from("membership_payments").select("*").order("created_at", { ascending: false });
        const { data: eventRegData } = await supabase.from("event_registrations").select("*, events(title)").order("registered_at", { ascending: false });
        const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, email, phone, department, student_id");
        const { data: courseRegData } = await supabase.from("course_registrations").select("*").order("registered_at", { ascending: false });
        const { data: coursesData } = await supabase.from("courses").select("id, title, price, is_paid");
        setMembers(profilesData || []);
        setPayments(payData || []);
        setEventPayments(eventRegData || []);
        setCourseRegistrations(courseRegData || []);
        setAdminCourses(coursesData || []);
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
      case "research": {
        const { data } = await supabase.from("research_papers").select("*").order("created_at", { ascending: false });
        setResearchPapers(data || []);
        break;
      }
      case "courses": {
        const { data: cData } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
        setAdminCourses(cData || []);
        const { data: lData } = await supabase.from("lessons").select("*").order("sort_order", { ascending: true });
        setCourseLessons(lData || []);
        const { data: rData } = await supabase.from("course_registrations").select("*").order("registered_at", { ascending: false });
        setCourseRegistrations(rData || []);
        const { data: certData } = await supabase.from("certificates").select("*").order("issued_at", { ascending: false });
        setCourseCertificates(certData || []);
        const { data: profData } = await supabase.from("profiles").select("user_id, full_name, email, phone, department, student_id");
        setCourseProfiles(profData || []);
        break;
      }
      case "hero": {
        const { data } = await supabase.from("hero_slides").select("*").order("sort_order", { ascending: true });
        setHeroSlides(data || []);
        break;
      }
      case "announcements": {
        const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
        setAnnouncements(data || []);
        break;
      }
    }
  };

  const updateMemberStatus = async (userId: string, status: string) => {
    let updatePayload: any = { status };
    
    // Auto-assign membership ID on approval
    if (status === "approved") {
      const { data: existing } = await supabase.from("profiles").select("membership_id").eq("user_id", userId).single();
      if (!existing?.membership_id) {
        const { data: idData } = await supabase.rpc("generate_membership_id");
        if (idData) updatePayload.membership_id = idData;
      }
    }
    
    const { error } = await supabase.from("profiles").update(updatePayload).eq("user_id", userId);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success(`Member ${status}${updatePayload.membership_id ? ` — ID: ${updatePayload.membership_id}` : ""}`);
    // Send email notification
    try {
      await supabase.functions.invoke("send-notification", {
        body: { user_id: userId, status, type: "membership" },
      });
    } catch { /* silent fail */ }
    fetchData();
  };

  const updatePaymentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("membership_payments").update({ payment_status: status }).eq("id", id);
    if (error) toast.error("Failed to update payment");
    else { toast.success(`Payment ${status}`); fetchData(); }
  };

  const updateEventPaymentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("event_registrations").update({ payment_status: status }).eq("id", id);
    if (error) toast.error("Failed to update payment");
    else { toast.success(`Payment ${status}`); fetchData(); }
  };

  const updateCoursePaymentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("course_registrations").update({ payment_status: status }).eq("id", id);
    if (error) toast.error("Failed to update payment");
    else { toast.success(`Course payment ${status}`); fetchData(); }
  };

  // ─── Role Management ───
  const assignRole = async (userId: string, role: string) => {
    // Remove existing roles first, then add new one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    if (role !== "none") {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) { toast.error("Failed to assign role"); return; }
    }
    toast.success(`Role updated to ${role}`);
    fetchData();
  };

  const getUserRole = (userId: string) => {
    const role = memberRoles.find((r: any) => r.user_id === userId);
    return role?.role || "none";
  };

  // ─── Admin Edit Member Profile ───
  const startEditMemberProfile = (m: any) => {
    setEditingMemberProfile(m);
    setMemberProfileForm({
      full_name: m.full_name || "",
      phone: m.phone || "",
      department: m.department || "",
      batch: m.batch || "",
      session: m.session || "",
      student_id: m.student_id || "",
      skills: m.skills || "",
      linkedin: m.linkedin || "",
      github: m.github || "",
      email: m.email || "",
    });
  };

  const saveMemberProfile = async () => {
    if (!editingMemberProfile) return;
    const { error } = await supabase.from("profiles").update({
      full_name: memberProfileForm.full_name,
      phone: memberProfileForm.phone || null,
      department: memberProfileForm.department || null,
      batch: memberProfileForm.batch || null,
      session: memberProfileForm.session || null,
      student_id: memberProfileForm.student_id || null,
      skills: memberProfileForm.skills || null,
      linkedin: memberProfileForm.linkedin || null,
      github: memberProfileForm.github || null,
      email: memberProfileForm.email || null,
    }).eq("user_id", editingMemberProfile.user_id);
    if (error) { toast.error("Failed to update profile"); return; }
    toast.success("Profile updated!");
    setEditingMemberProfile(null);
    fetchData();
  };

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
    const payload = { title: eventForm.title, date: eventForm.date, venue: eventForm.venue || null, description: eventForm.description || null, type: eventForm.type || null, max_participants: eventForm.max_participants ? parseInt(eventForm.max_participants) : null, image_url: eventForm.image_url || null, is_paid: eventForm.is_paid, registration_fee: eventForm.is_paid && eventForm.registration_fee ? parseFloat(eventForm.registration_fee) : 0, payment_methods: eventForm.is_paid ? eventForm.payment_methods : [], payment_number: eventForm.is_paid ? eventForm.payment_number || null : null, bank_account: eventForm.is_paid ? eventForm.bank_account || null : null };
    if (editingEventId) {
      const { error } = await supabase.from("events").update(payload).eq("id", editingEventId);
      if (error) toast.error("Failed"); else { toast.success("Event updated!"); resetEventForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) toast.error("Failed"); else {
        toast.success("Event created!");
        // Notify all members
        try {
          await supabase.functions.invoke("send-notification", {
            body: { type: "new_event", title: payload.title, date: payload.date, venue: payload.venue },
          });
          toast.success("Members notified via email!");
        } catch { /* silent */ }
        resetEventForm(); fetchData();
      }
    }
  };
  const editEvent = (ev: any) => { setEventForm({ title: ev.title, date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : "", venue: ev.venue || "", description: ev.description || "", type: ev.type || "", max_participants: ev.max_participants?.toString() || "", image_url: ev.image_url || "", is_paid: ev.is_paid || false, registration_fee: ev.registration_fee?.toString() || "", payment_methods: ev.payment_methods || [], payment_number: ev.payment_number || "01580352238", bank_account: ev.bank_account || "4170331020181850" }); setEditingEventId(ev.id); setShowEventForm(true); };
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

  // ─── Research CRUD ───
  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { title: researchForm.title, authors: researchForm.authors, abstract: researchForm.abstract || null, pdf_url: researchForm.pdf_url || null, doi_link: researchForm.doi_link || null, status: researchForm.status, research_area: researchForm.research_area || null, tags: researchForm.tags ? researchForm.tags.split(",").map(t => t.trim()).filter(Boolean) : null } as any;
    if (editingResearchId) {
      const { error } = await supabase.from("research_papers").update(payload).eq("id", editingResearchId);
      if (error) toast.error("Failed"); else { toast.success("Research updated!"); resetResearchForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("research_papers").insert(payload);
      if (error) toast.error("Failed"); else { toast.success("Research added!"); resetResearchForm(); fetchData(); }
    }
  };
  const editResearch = (r: any) => { setResearchForm({ title: r.title, authors: r.authors, abstract: r.abstract || "", pdf_url: r.pdf_url || "", doi_link: r.doi_link || "", status: r.status || "ongoing", research_area: r.research_area || "", tags: r.tags?.join(", ") || "" }); setEditingResearchId(r.id); setShowResearchForm(true); };
  const deleteResearch = async (id: string) => { const { error } = await supabase.from("research_papers").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Research deleted"); fetchData(); } };
  const resetResearchForm = () => { setResearchForm(emptyResearchForm); setEditingResearchId(null); setShowResearchForm(false); };

  // ─── Course CRUD ───
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { title: courseForm.title, description: courseForm.description || null, instructor: courseForm.instructor || null, image_url: courseForm.image_url || null, is_paid: courseForm.is_paid, price: courseForm.is_paid && courseForm.price ? parseFloat(courseForm.price) : 0, category: courseForm.category || null, duration: courseForm.duration || null, max_students: courseForm.max_students ? parseInt(courseForm.max_students) : null, status: courseForm.status } as any;
    if (editingCourseId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editingCourseId);
      if (error) toast.error("Failed"); else { toast.success("Course updated!"); resetCourseForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) toast.error("Failed"); else {
        toast.success("Course created!");
        // Notify all members
        try {
          await supabase.functions.invoke("send-notification", {
            body: { type: "new_course", title: payload.title, instructor: payload.instructor, duration: payload.duration },
          });
          toast.success("Members notified via email!");
        } catch { /* silent */ }
        resetCourseForm(); fetchData();
      }
    }
  };
  const editCourse = (c: any) => { setCourseForm({ title: c.title, description: c.description || "", instructor: c.instructor || "", image_url: c.image_url || "", is_paid: c.is_paid || false, price: c.price?.toString() || "", category: c.category || "", duration: c.duration || "", max_students: c.max_students?.toString() || "", status: c.status || "draft" }); setEditingCourseId(c.id); setShowCourseForm(true); };
  const deleteCourse = async (id: string) => { const { error } = await supabase.from("courses").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Course deleted"); fetchData(); } };
  const resetCourseForm = () => { setCourseForm(emptyCourseForm); setEditingCourseId(null); setShowCourseForm(false); };

  // ─── Lesson CRUD ───
  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    const payload = { title: lessonForm.title, video_url: lessonForm.video_url || null, pdf_file: lessonForm.pdf_file || null, sort_order: parseInt(lessonForm.sort_order) || 0, course_id: selectedCourseId };
    if (editingLessonId) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editingLessonId);
      if (error) toast.error("Failed"); else { toast.success("Lesson updated!"); resetLessonForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("lessons").insert(payload);
      if (error) toast.error("Failed"); else { toast.success("Lesson added!"); resetLessonForm(); fetchData(); }
    }
  };
  const editLesson = (l: any) => { setLessonForm({ title: l.title, video_url: l.video_url || "", pdf_file: l.pdf_file || "", sort_order: l.sort_order?.toString() || "0" }); setEditingLessonId(l.id); setSelectedCourseId(l.course_id); setShowLessonForm(true); };
  const deleteLesson = async (id: string) => { const { error } = await supabase.from("lessons").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Lesson deleted"); fetchData(); } };
  const resetLessonForm = () => { setLessonForm(emptyLessonForm); setEditingLessonId(null); setShowLessonForm(false); };

  // ─── Hero Slides CRUD ───
  const handleHeroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { image_url: heroForm.image_url, tagline: heroForm.tagline, sort_order: parseInt(heroForm.sort_order) || 0, active: heroForm.active };
    if (editingHeroId) {
      const { error } = await supabase.from("hero_slides").update(payload).eq("id", editingHeroId);
      if (error) toast.error("Failed"); else { toast.success("Slide updated!"); resetHeroForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("hero_slides").insert(payload);
      if (error) toast.error("Failed"); else { toast.success("Slide added!"); resetHeroForm(); fetchData(); }
    }
  };
  const editHeroSlide = (s: any) => { setHeroForm({ image_url: s.image_url, tagline: s.tagline || "", sort_order: s.sort_order?.toString() || "0", active: s.active }); setEditingHeroId(s.id); setShowHeroForm(true); };
  const deleteHeroSlide = async (id: string) => { const { error } = await supabase.from("hero_slides").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Slide deleted"); fetchData(); } };
  const resetHeroForm = () => { setHeroForm(emptyHeroForm); setEditingHeroId(null); setShowHeroForm(false); };
  const toggleHeroActive = async (id: string, active: boolean) => { await supabase.from("hero_slides").update({ active: !active }).eq("id", id); fetchData(); };

  if (loading || !isAdmin) return null;

  const tabsList: { key: TabType; label: string; icon: typeof Users }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "applications", label: "Applications", icon: FileText },
    { key: "members", label: "Members", icon: Users },
    { key: "payments", label: "Payments", icon: Eye },
    { key: "team", label: "Team", icon: UserCog },
    { key: "projects", label: "Projects", icon: FolderOpen },
    { key: "events", label: "Events", icon: Calendar },
    { key: "alumni", label: "Alumni", icon: GraduationCap },
    { key: "research", label: "Research", icon: FlaskConical },
    { key: "courses", label: "Courses", icon: BookOpen },
    { key: "photos", label: "Photos", icon: Image },
    { key: "blog", label: "Blog", icon: BookOpen },
    { key: "hero", label: "Hero Slides", icon: Image },
    { key: "announcements", label: "Announcements", icon: Megaphone },
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

          {/* ════════ Overview Tab ════════ */}
          {tab === "overview" && (
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Members", value: overviewStats.totalMembers || 0, icon: Users, color: "text-primary" },
                  { label: "Approved", value: overviewStats.approvedMembers || 0, icon: Check, color: "text-green-400" },
                  { label: "Pending Applications", value: overviewStats.pendingMembers || 0, icon: FileText, color: "text-yellow-400" },
                  { label: "Revenue (Membership)", value: `৳${overviewStats.totalRevenue || 0}`, icon: Eye, color: "text-primary" },
                  { label: "Total Events", value: overviewStats.totalEvents || 0, icon: Calendar, color: "text-accent" },
                  { label: "Event Registrations", value: overviewStats.eventRegistrations || 0, icon: Calendar, color: "text-primary" },
                  { label: "Total Projects", value: overviewStats.totalProjects || 0, icon: FolderOpen, color: "text-primary" },
                  { label: "Active Projects", value: overviewStats.activeProjects || 0, icon: FolderOpen, color: "text-green-400" },
                  { label: "Published Courses", value: overviewStats.publishedCourses || 0, icon: BookOpen, color: "text-primary" },
                  { label: "Course Enrollments", value: overviewStats.courseEnrollments || 0, icon: GraduationCap, color: "text-primary" },
                  { label: "Certificates Issued", value: overviewStats.totalCertificates || 0, icon: Award, color: "text-primary" },
                  { label: "Completed Courses", value: overviewStats.courseCompleted || 0, icon: Check, color: "text-green-400" },
                  { label: "Pending Blogs", value: overviewStats.pendingBlogs || 0, icon: BookOpen, color: "text-yellow-400" },
                  { label: "Alumni", value: overviewStats.totalAlumni || 0, icon: GraduationCap, color: "text-primary" },
                  { label: "Pending Payments", value: overviewStats.pendingPayments || 0, icon: Eye, color: "text-yellow-400" },
                  { label: "Total Courses", value: overviewStats.totalCourses || 0, icon: BookOpen, color: "text-primary" },
                ].map((stat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-xl glass text-center">
                    <stat.icon className={`mx-auto mb-2 ${stat.color}`} size={20} />
                    <p className="text-xl font-display font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl glass">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Review Applications", tab: "applications" as TabType, count: overviewStats.pendingMembers },
                      { label: "Verify Payments", tab: "payments" as TabType, count: overviewStats.pendingPayments },
                      { label: "Approve Blog Posts", tab: "blog" as TabType, count: overviewStats.pendingBlogs },
                    ].filter(a => a.count > 0).map((action) => (
                      <button key={action.tab} onClick={() => setTab(action.tab)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left">
                        <span className="text-sm text-foreground">{action.label}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{action.count}</span>
                      </button>
                    ))}
                    {[overviewStats.pendingMembers, overviewStats.pendingPayments, overviewStats.pendingBlogs].every(v => !v) && (
                      <p className="text-sm text-muted-foreground text-center py-4">All caught up! No pending actions.</p>
                    )}
                  </div>
                </div>

                <div className="p-6 rounded-xl glass">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">Financial Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Membership Revenue</span>
                      <span className="text-sm font-semibold text-foreground">৳{overviewStats.totalRevenue || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pending Payments</span>
                      <span className="text-sm font-semibold text-yellow-400">{overviewStats.pendingPayments || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Course Enrollments</span>
                      <span className="text-sm font-semibold text-foreground">{overviewStats.courseEnrollments || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Event Registrations</span>
                      <span className="text-sm font-semibold text-foreground">{overviewStats.eventRegistrations || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              {/* Member profile edit modal */}
              {editingMemberProfile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingMemberProfile(null)}>
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg p-6 rounded-xl bg-background border border-border space-y-4 max-h-[80vh] overflow-y-auto">
                    <h3 className="font-display text-sm font-bold tracking-wider text-primary">Edit Member Profile</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                        <input className={inputClass} value={memberProfileForm.full_name} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, full_name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                        <input className={inputClass} value={memberProfileForm.email} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, email: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Student ID</label>
                        <input className={inputClass} value={memberProfileForm.student_id} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, student_id: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                        <input className={inputClass} value={memberProfileForm.department} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, department: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Batch</label>
                        <input className={inputClass} value={memberProfileForm.batch} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, batch: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Session</label>
                        <input className={inputClass} value={memberProfileForm.session} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, session: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                        <input className={inputClass} value={memberProfileForm.phone} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Skills</label>
                        <input className={inputClass} value={memberProfileForm.skills} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, skills: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">LinkedIn</label>
                      <input className={inputClass} value={memberProfileForm.linkedin} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, linkedin: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">GitHub</label>
                      <input className={inputClass} value={memberProfileForm.github} onChange={(e) => setMemberProfileForm({ ...memberProfileForm, github: e.target.value })} />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={saveMemberProfile} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Save Changes</button>
                      <button onClick={() => setEditingMemberProfile(null)} className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
                    </div>
                  </motion.div>
                </div>
              )}

              {members.length === 0 && <p className="text-center text-muted-foreground">No members yet.</p>}
              {members.map((m: any) => {
                const role = getUserRole(m.user_id);
                return (
                  <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-foreground">{m.full_name}</h4>
                          {role !== "none" && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              role === "admin" ? "bg-primary/10 text-primary" :
                              role === "moderator" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                            }`}>
                              <Shield size={10} className="inline mr-0.5" />{role}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.department || "—"} · {m.student_id || "—"} · {m.phone || "—"} · {m.email || "—"}</p>
                        {m.membership_id && <p className="text-xs font-mono text-primary mt-1">ID: {m.membership_id}</p>}
                      </div>
                      <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                        m.status === "approved" ? "bg-green-500/10 text-green-400" :
                        m.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"
                      }`}>{m.status}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEditMemberProfile(m)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Edit Profile"><Pencil size={14} /></button>
                        <select value={role} onChange={(e) => assignRole(m.user_id, e.target.value)}
                          className="text-[10px] px-1.5 py-1 rounded bg-secondary border border-border text-foreground">
                          <option value="none">No role</option>
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => updateMemberStatus(m.user_id, "approved")} className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Approve"><Check size={14} /></button>
                        <button onClick={() => updateMemberStatus(m.user_id, "rejected")} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Reject"><X size={14} /></button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ════════ Payments Tab ════════ */}
          {tab === "payments" && (
            <div className="max-w-4xl mx-auto">
              {/* Sub-tabs */}
              <div className="flex gap-2 mb-6">
                <button onClick={() => setPaymentSubTab("membership")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${paymentSubTab === "membership" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  Membership Payments
                </button>
                <button onClick={() => setPaymentSubTab("event")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${paymentSubTab === "event" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  Event Payments
                </button>
                <button onClick={() => setPaymentSubTab("course")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${paymentSubTab === "course" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  Course Payments
                </button>
              </div>

              {/* ── Membership Payments ── */}
              {paymentSubTab === "membership" && (
                <div>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => {
                        const headers = ["Name", "Department", "Student ID", "Email", "Transaction ID", "Payment Method", "Amount", "Status", "Date"];
                        const rows = payments.map((p: any) => {
                          const member = members.find((m: any) => m.user_id === p.user_id);
                          return [member?.full_name || "Unknown", member?.department || "", member?.student_id || "", member?.email || "", p.transaction_id, p.payment_method, p.amount, p.payment_status, new Date(p.created_at).toLocaleDateString()].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
                        });
                        const csv = [headers.join(","), ...rows].join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = `membership_payments_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
                        toast.success("CSV exported!");
                      }}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                      <Download size={16} /> Export CSV
                    </button>
                  </div>
                  {(() => {
                    const totalPaid = payments.filter(p => p.payment_status === "verified").reduce((sum, p) => sum + (p.amount || 0), 0);
                    const pendingCount = payments.filter(p => p.payment_status === "pending").length;
                    const verifiedCount = payments.filter(p => p.payment_status === "verified").length;
                    const rejectedCount = payments.filter(p => p.payment_status === "rejected").length;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 rounded-xl glass text-center">
                          <p className="text-2xl font-display font-bold text-foreground">{payments.length}</p>
                          <p className="text-xs text-muted-foreground mt-1">Total</p>
                        </div>
                        <div className="p-4 rounded-xl glass text-center">
                          <p className="text-2xl font-display font-bold text-primary">৳{totalPaid}</p>
                          <p className="text-xs text-muted-foreground mt-1">Verified</p>
                        </div>
                        <div className="p-4 rounded-xl glass text-center">
                          <p className="text-2xl font-display font-bold text-foreground">৳{payments.reduce((s, p) => s + (p.amount || 0), 0)}</p>
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
                  <div className="space-y-3">
                    {payments.length === 0 && <p className="text-center text-muted-foreground">No membership payments yet.</p>}
                    {payments.map((p: any) => {
                      const member = members.find((m: any) => m.user_id === p.user_id);
                      return (
                        <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">{member?.full_name || "Unknown Member"}</p>
                              <p className="text-xs text-muted-foreground">{member?.department || "—"} · {member?.student_id || "—"} · {member?.email || "—"}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-xs font-mono text-muted-foreground">TXN: {p.transaction_id}</span>
                                <span className="text-xs text-muted-foreground">{p.payment_method}</span>
                                <span className="text-xs font-semibold text-primary">৳{p.amount}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${p.payment_status === "verified" ? "bg-green-500/10 text-green-400" : p.payment_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"}`}>{p.payment_status}</span>
                            <div className="flex gap-1 shrink-0">
                              {p.payment_status === "pending" ? (
                                <>
                                  <button onClick={() => updatePaymentStatus(p.id, "verified")} className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Verify"><Check size={14} /></button>
                                  <button onClick={() => updatePaymentStatus(p.id, "rejected")} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Reject"><X size={14} /></button>
                                </>
                              ) : (
                                <button onClick={() => updatePaymentStatus(p.id, "pending")} className="text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">Reset</button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Event Payments ── */}
              {paymentSubTab === "event" && (
                <div>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => {
                        const headers = ["Name", "Email", "Phone", "Department", "Event", "Payment Method", "Transaction ID", "Status", "Date"];
                        const rows = eventPayments.map((p: any) => {
                          return [p.name || "Unknown", p.email || "", p.phone || "", p.department || "", p.events?.title || "Unknown Event", p.payment_method || "Free", p.transaction_id || "—", p.payment_status, new Date(p.registered_at).toLocaleDateString()].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
                        });
                        const csv = [headers.join(","), ...rows].join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = `event_payments_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
                        toast.success("CSV exported!");
                      }}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                      <Download size={16} /> Export CSV
                    </button>
                  </div>
                  {(() => {
                    const confirmed = eventPayments.filter(p => p.payment_status === "confirmed").length;
                    const pending = eventPayments.filter(p => p.payment_status === "pending").length;
                    const rejected = eventPayments.filter(p => p.payment_status === "rejected").length;
                    return (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-xl glass text-center">
                          <p className="text-2xl font-display font-bold text-foreground">{eventPayments.length}</p>
                          <p className="text-xs text-muted-foreground mt-1">Total Registrations</p>
                        </div>
                        <div className="p-4 rounded-xl glass text-center">
                          <p className="text-2xl font-display font-bold text-primary">{confirmed}</p>
                          <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
                        </div>
                        <div className="p-4 rounded-xl glass text-center">
                          <div className="flex justify-center gap-3 text-xs">
                            <span className="text-green-400">{confirmed} ✓</span>
                            <span className="text-yellow-400">{pending} ⏳</span>
                            <span className="text-destructive">{rejected} ✗</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">By Status</p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="space-y-3">
                    {eventPayments.length === 0 && <p className="text-center text-muted-foreground">No event registrations yet.</p>}
                    {eventPayments.map((p: any) => (
                      <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{p.name || "Unknown"}</p>
                            <p className="text-xs text-primary font-medium">{p.events?.title || "Unknown Event"}</p>
                            <p className="text-xs text-muted-foreground">{p.email || "—"} · {p.phone || "—"} · {p.department || "—"}</p>
                            {p.transaction_id && (
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-xs font-mono text-muted-foreground">TXN: {p.transaction_id}</span>
                                <span className="text-xs text-muted-foreground">{p.payment_method}</span>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">{new Date(p.registered_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${p.payment_status === "confirmed" ? "bg-green-500/10 text-green-400" : p.payment_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"}`}>{p.payment_status}</span>
                          <div className="flex gap-1 shrink-0">
                            {p.payment_status === "pending" ? (
                              <>
                                <button onClick={() => updateEventPaymentStatus(p.id, "confirmed")} className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Confirm"><Check size={14} /></button>
                                <button onClick={() => updateEventPaymentStatus(p.id, "rejected")} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Reject"><X size={14} /></button>
                              </>
                            ) : (
                              <button onClick={() => updateEventPaymentStatus(p.id, "pending")} className="text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">Reset</button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Course Payments ── */}
              {paymentSubTab === "course" && (
                <div>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => {
                        const rows = courseRegistrations.filter(r => r.payment_method || r.transaction_id).map((r: any) => {
                          const p = members.find((m: any) => m.user_id === r.user_id);
                          const c = adminCourses.find((co: any) => co.id === r.course_id);
                          return {
                            "Student Name": p?.full_name || "Unknown",
                            "Email": p?.email || "—",
                            "Phone": p?.phone || "—",
                            "Student ID": p?.student_id || "—",
                            "Department": p?.department || "—",
                            "Course": c?.title || "—",
                            "Payment Method": r.payment_method || "—",
                            "Transaction ID": r.transaction_id || "—",
                            "Status": r.payment_status,
                            "Date": new Date(r.registered_at).toLocaleDateString(),
                          };
                        });
                        downloadCSV(rows, `course_payments_${new Date().toISOString().slice(0, 10)}.csv`);
                        toast.success("CSV exported!");
                      }}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                      <Download size={16} /> Export CSV
                    </button>
                  </div>
                  {(() => {
                    const paidRegs = courseRegistrations.filter(r => r.payment_method || r.transaction_id);
                    const confirmed = paidRegs.filter(r => r.payment_status === "confirmed").length;
                    const pending = paidRegs.filter(r => r.payment_status === "pending").length;
                    const rejected = paidRegs.filter(r => r.payment_status === "rejected").length;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 rounded-xl glass text-center">
                          <p className="text-2xl font-display font-bold text-foreground">{paidRegs.length}</p>
                          <p className="text-xs text-muted-foreground mt-1">Total Paid Enrollments</p>
                        </div>
                        <div className="p-4 rounded-xl glass text-center">
                          <p className="text-2xl font-display font-bold text-primary">{confirmed}</p>
                          <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
                        </div>
                        <div className="p-4 rounded-xl glass text-center">
                          <p className="text-2xl font-display font-bold text-foreground">{pending}</p>
                          <p className="text-xs text-muted-foreground mt-1">Pending</p>
                        </div>
                        <div className="p-4 rounded-xl glass text-center">
                          <div className="flex justify-center gap-3 text-xs">
                            <span className="text-green-400">{confirmed} ✓</span>
                            <span className="text-yellow-400">{pending} ⏳</span>
                            <span className="text-destructive">{rejected} ✗</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">By Status</p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="space-y-3">
                    {courseRegistrations.length === 0 && <p className="text-center text-muted-foreground">No course enrollments yet.</p>}
                    {courseRegistrations.map((r: any) => {
                      const p = members.find((m: any) => m.user_id === r.user_id);
                      const c = adminCourses.find((co: any) => co.id === r.course_id);
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">{p?.full_name || "Unknown"}</p>
                              <p className="text-xs text-primary font-medium">{c?.title || "Unknown Course"} {c?.is_paid ? `· ৳${c.price}` : "· Free"}</p>
                              <p className="text-xs text-muted-foreground">{p?.email || "—"} · {p?.student_id || "—"} · {p?.department || "—"}</p>
                              {r.transaction_id && (
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-xs font-mono text-muted-foreground">TXN: {r.transaction_id}</span>
                                  <span className="text-xs text-muted-foreground">{r.payment_method}</span>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">{new Date(r.registered_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${r.payment_status === "confirmed" ? "bg-green-500/10 text-green-400" : r.payment_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"}`}>{r.payment_status}</span>
                            <div className="flex gap-1 shrink-0">
                              {r.payment_status === "pending" ? (
                                <>
                                  <button onClick={() => updateCoursePaymentStatus(r.id, "confirmed")} className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Confirm"><Check size={14} /></button>
                                  <button onClick={() => updateCoursePaymentStatus(r.id, "rejected")} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Reject"><X size={14} /></button>
                                </>
                              ) : (
                                <button onClick={() => updateCoursePaymentStatus(r.id, "pending")} className="text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">Reset</button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
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
                    <select value={teamForm.category} onChange={(e) => setTeamForm({ ...teamForm, category: e.target.value })} className={inputClass}>
                      {TEAM_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
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
                        <p className="text-xs text-muted-foreground">{t.position} · {t.category || "Executive Board"} · {t.department || "—"}</p>
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
                        <input placeholder="Payment Number (bKash/Nagad/Rocket)" value={eventForm.payment_number} onChange={(e) => setEventForm({ ...eventForm, payment_number: e.target.value })} className={inputClass} />
                        <input placeholder="Bank Card/Account Number" value={eventForm.bank_account} onChange={(e) => setEventForm({ ...eventForm, bank_account: e.target.value })} className={inputClass} />
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

          {/* ════════ Research Tab ════════ */}
          {tab === "research" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-end mb-4">
                <button onClick={() => { showResearchForm ? resetResearchForm() : setShowResearchForm(true); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Plus size={16} /> {showResearchForm ? "Cancel" : "Add Research"}
                </button>
              </div>
              {showResearchForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleResearchSubmit} className="p-6 rounded-xl glass space-y-4 mb-6">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">{editingResearchId ? "Edit Research" : "Add Research Paper"}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input placeholder="Title *" required value={researchForm.title} onChange={(e) => setResearchForm({ ...researchForm, title: e.target.value })} className={inputClass} />
                    <input placeholder="Authors *" required value={researchForm.authors} onChange={(e) => setResearchForm({ ...researchForm, authors: e.target.value })} className={inputClass} />
                    <select value={researchForm.status} onChange={(e) => setResearchForm({ ...researchForm, status: e.target.value })} className={inputClass}>
                      <option value="ongoing">Ongoing</option>
                      <option value="published">Published</option>
                    </select>
                    <input placeholder="Research Area (IoT, AI, etc.)" value={researchForm.research_area} onChange={(e) => setResearchForm({ ...researchForm, research_area: e.target.value })} className={inputClass} />
                    <input placeholder="PDF URL" value={researchForm.pdf_url} onChange={(e) => setResearchForm({ ...researchForm, pdf_url: e.target.value })} className={inputClass} />
                    <input placeholder="DOI Link" value={researchForm.doi_link} onChange={(e) => setResearchForm({ ...researchForm, doi_link: e.target.value })} className={inputClass} />
                  </div>
                  <textarea placeholder="Abstract" rows={3} value={researchForm.abstract} onChange={(e) => setResearchForm({ ...researchForm, abstract: e.target.value })} className={inputClass + " resize-none"} />
                  <input placeholder="Tags (comma-separated)" value={researchForm.tags} onChange={(e) => setResearchForm({ ...researchForm, tags: e.target.value })} className={inputClass} />
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">{editingResearchId ? "Update" : "Add"}</button>
                </motion.form>
              )}
              <div className="space-y-3">
                {researchPapers.length === 0 && <p className="text-center text-muted-foreground">No research papers yet.</p>}
                {researchPapers.map((r: any) => (
                  <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${r.status === "published" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{r.status}</span>
                        {r.research_area && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{r.research_area}</span>}
                      </div>
                      <h4 className="font-semibold text-sm text-foreground">{r.title}</h4>
                      <p className="text-xs text-muted-foreground">{r.authors}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editResearch(r)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => deleteResearch(r.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ Courses Tab ════════ */}
          {tab === "courses" && (
            <div className="max-w-4xl mx-auto">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="p-4 rounded-xl glass text-center">
                  <p className="text-2xl font-bold text-foreground">{adminCourses.length}</p>
                  <p className="text-xs text-muted-foreground">Total Courses</p>
                </div>
                <div className="p-4 rounded-xl glass text-center">
                  <p className="text-2xl font-bold text-primary">{courseRegistrations.length}</p>
                  <p className="text-xs text-muted-foreground">Enrollments</p>
                </div>
                <div className="p-4 rounded-xl glass text-center">
                  <p className="text-2xl font-bold text-foreground">{courseCertificates.length}</p>
                  <p className="text-xs text-muted-foreground">Certificates Issued</p>
                </div>
                <div className="p-4 rounded-xl glass text-center">
                  <p className="text-2xl font-bold text-foreground">{courseRegistrations.filter(r => r.completed).length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-2 mb-4">
                <button onClick={() => {
                  const rows = courseRegistrations.map(r => {
                    const p = courseProfiles.find((pr: any) => pr.user_id === r.user_id);
                    const c = adminCourses.find((co: any) => co.id === r.course_id);
                    return {
                      "Student Name": p?.full_name || "—",
                      "Email": p?.email || "—",
                      "Phone": p?.phone || "—",
                      "Student ID": p?.student_id || "—",
                      "Department": p?.department || "—",
                      "Course": c?.title || "—",
                      "Payment Status": r.payment_status,
                      "Completed": r.completed ? "Yes" : "No",
                      "Registered At": new Date(r.registered_at).toLocaleDateString(),
                    };
                  });
                  downloadCSV(rows, "enrollments.csv");
                }}
                  className="px-3 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors flex items-center gap-1.5">
                  <Download size={14} /> Export Enrollments CSV
                </button>
                <button onClick={() => {
                  const rows = courseCertificates.map(cert => {
                    const p = courseProfiles.find((pr: any) => pr.user_id === cert.user_id);
                    const c = adminCourses.find((co: any) => co.id === cert.course_id);
                    return {
                      "Certificate #": cert.certificate_number,
                      "Student Name": p?.full_name || "—",
                      "Email": p?.email || "—",
                      "Student ID": p?.student_id || "—",
                      "Department": p?.department || "—",
                      "Course": c?.title || "—",
                      "Issued At": new Date(cert.issued_at).toLocaleDateString(),
                    };
                  });
                  downloadCSV(rows, "certificates.csv");
                }}
                  className="px-3 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors flex items-center gap-1.5">
                  <Download size={14} /> Export Certificates CSV
                </button>
                <button onClick={() => { showCourseForm ? resetCourseForm() : setShowCourseForm(true); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Plus size={16} /> {showCourseForm ? "Cancel" : "Add Course"}
                </button>
              </div>

              {showCourseForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleCourseSubmit} className="p-6 rounded-xl glass space-y-4 mb-6">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">{editingCourseId ? "Edit Course" : "Create New Course"}</h3>
                  <ImageUpload folder="courses" currentUrl={courseForm.image_url} onUpload={(url) => setCourseForm({ ...courseForm, image_url: url })} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <input placeholder="Course Title *" required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} className={inputClass} />
                    <input placeholder="Instructor" value={courseForm.instructor} onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })} className={inputClass} />
                    <input placeholder="Category (IoT, Programming, etc.)" value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })} className={inputClass} />
                    <input placeholder="Duration (e.g., 4 weeks)" value={courseForm.duration} onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })} className={inputClass} />
                    <input placeholder="Max Students" type="number" value={courseForm.max_students} onChange={(e) => setCourseForm({ ...courseForm, max_students: e.target.value })} className={inputClass} />
                    <select value={courseForm.status} onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })} className={inputClass}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <textarea placeholder="Description" rows={3} value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} className={inputClass + " resize-none"} />
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-foreground">Pricing:</label>
                    <button type="button" onClick={() => setCourseForm({ ...courseForm, is_paid: false })} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!courseForm.is_paid ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Free</button>
                    <button type="button" onClick={() => setCourseForm({ ...courseForm, is_paid: true })} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${courseForm.is_paid ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Paid</button>
                    {courseForm.is_paid && <input placeholder="Price (৳)" type="number" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} className={inputClass + " w-32"} />}
                  </div>
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">{editingCourseId ? "Update" : "Create"}</button>
                </motion.form>
              )}

              {/* Courses List */}
              <div className="space-y-4">
                {adminCourses.length === 0 && <p className="text-center text-muted-foreground">No courses yet.</p>}
                {adminCourses.map((c: any) => {
                  const cLessons = courseLessons.filter(l => l.course_id === c.id);
                  const cRegs = courseRegistrations.filter(r => r.course_id === c.id);
                  const cCerts = courseCertificates.filter(cert => cert.course_id === c.id);
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl glass overflow-hidden">
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {c.image_url && <img src={c.image_url} alt={c.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-xs font-mono px-2 py-0.5 rounded ${c.status === "published" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{c.status}</span>
                              <span className={`text-xs font-mono px-2 py-0.5 rounded ${c.is_paid ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-400"}`}>{c.is_paid ? `৳${c.price}` : "Free"}</span>
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">{c.title}</h4>
                            <p className="text-xs text-muted-foreground">{cLessons.length} lessons · {cRegs.length} enrolled · {cCerts.length} certificates</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setSelectedCourseId(c.id); setShowLessonForm(true); }} className="p-1.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors" title="Add Lesson"><Video size={14} /></button>
                          <button onClick={() => editCourse(c)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => deleteCourse(c.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {/* Lessons */}
                      {cLessons.length > 0 && (
                        <div className="border-t border-border/50 p-3 bg-secondary/30">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Lessons:</p>
                          <div className="space-y-1">
                            {cLessons.map((l: any, idx: number) => (
                              <div key={l.id} className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-secondary/50">
                                <span className="text-xs text-foreground">{idx + 1}. {l.title}</span>
                                <div className="flex gap-1">
                                  <button onClick={() => editLesson(l)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Pencil size={10} /></button>
                                  <button onClick={() => deleteLesson(l.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={10} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Enrolled Students */}
                      {cRegs.length > 0 && (
                        <div className="border-t border-border/50 p-3 bg-secondary/20">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Enrolled Students ({cRegs.length}):</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground text-left">
                                  <th className="pb-1 pr-3">Name</th>
                                  <th className="pb-1 pr-3">Student ID</th>
                                  <th className="pb-1 pr-3">Txn ID</th>
                                  <th className="pb-1 pr-3">Method</th>
                                  <th className="pb-1 pr-3">Payment</th>
                                  <th className="pb-1 pr-3">Actions</th>
                                  <th className="pb-1">Progress</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cRegs.map((r: any) => {
                                  const p = courseProfiles.find((pr: any) => pr.user_id === r.user_id);
                                  const hasCert = cCerts.some(cert => cert.user_id === r.user_id);
                                  return (
                                    <tr key={r.id} className="border-t border-border/30">
                                      <td className="py-1.5 pr-3 text-foreground">{p?.full_name || "—"}</td>
                                      <td className="py-1.5 pr-3 text-muted-foreground">{p?.student_id || "—"}</td>
                                      <td className="py-1.5 pr-3 text-muted-foreground font-mono text-[10px]">{r.transaction_id || "—"}</td>
                                      <td className="py-1.5 pr-3 text-muted-foreground">{r.payment_method || "—"}</td>
                                      <td className="py-1.5 pr-3">
                                        <span className={`font-mono px-1.5 py-0.5 rounded ${r.payment_status === "confirmed" ? "bg-green-500/10 text-green-400" : r.payment_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"}`}>{r.payment_status}</span>
                                      </td>
                                      <td className="py-1.5 pr-3">
                                        {r.payment_status === "pending" ? (
                                          <div className="flex gap-1">
                                            <button onClick={() => updateCoursePaymentStatus(r.id, "confirmed")} className="p-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Approve"><Check size={12} /></button>
                                            <button onClick={() => updateCoursePaymentStatus(r.id, "rejected")} className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Reject"><X size={12} /></button>
                                          </div>
                                        ) : (
                                          <button onClick={() => updateCoursePaymentStatus(r.id, "pending")} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">Reset</button>
                                        )}
                                      </td>
                                      <td className="py-1.5">
                                        {r.completed ? (
                                          <span className="flex items-center gap-1 text-green-400">
                                            <Award size={12} /> {hasCert ? "Certified" : "Completed"}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">In Progress</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Lesson Form Modal */}
              {showLessonForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => resetLessonForm()}>
                  <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => e.stopPropagation()} onSubmit={handleLessonSubmit}
                    className="w-full max-w-md p-6 rounded-xl bg-background border border-border space-y-4">
                    <h3 className="font-display text-sm font-bold tracking-wider text-primary">{editingLessonId ? "Edit Lesson" : "Add Lesson"}</h3>
                    <input placeholder="Lesson Title *" required value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} className={inputClass} />
                    <input placeholder="Video URL" value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} className={inputClass} />
                    <input placeholder="PDF/Resource URL" value={lessonForm.pdf_file} onChange={(e) => setLessonForm({ ...lessonForm, pdf_file: e.target.value })} className={inputClass} />
                    <input placeholder="Sort Order" type="number" value={lessonForm.sort_order} onChange={(e) => setLessonForm({ ...lessonForm, sort_order: e.target.value })} className={inputClass} />
                    <div className="flex gap-2">
                      <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">{editingLessonId ? "Update" : "Add"}</button>
                      <button type="button" onClick={() => resetLessonForm()} className="px-6 py-2 rounded-lg bg-secondary text-muted-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
                    </div>
                  </motion.form>
                </div>
              )}
            </div>
          )}

          {/* ════════ Hero Slides Tab ════════ */}
          {tab === "hero" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-sm font-bold tracking-wider text-primary">Hero Carousel Slides</h3>
                <button onClick={() => { resetHeroForm(); setShowHeroForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <Plus size={14} /> Add Slide
                </button>
              </div>

              {heroSlides.length === 0 && <p className="text-center text-muted-foreground">No hero slides yet. Default images will be shown.</p>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {heroSlides.map((slide: any) => (
                  <motion.div key={slide.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`rounded-xl glass overflow-hidden ${!slide.active ? "opacity-50" : ""}`}>
                    {slide.image_url && (
                      <img src={slide.image_url} alt={slide.tagline} className="w-full h-40 object-cover" loading="lazy" />
                    )}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-foreground mb-1">{slide.tagline || "No tagline"}</p>
                      <p className="text-xs text-muted-foreground mb-3">Order: {slide.sort_order} · {slide.active ? "Active" : "Inactive"}</p>
                      <div className="flex gap-2">
                        <button onClick={() => editHeroSlide(slide)} className="p-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil size={12} /></button>
                        <button onClick={() => toggleHeroActive(slide.id, slide.active)} className="p-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          {slide.active ? <X size={12} /> : <Check size={12} />}
                        </button>
                        <button onClick={() => deleteHeroSlide(slide.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Hero Form Modal */}
              {showHeroForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => resetHeroForm()}>
                  <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => e.stopPropagation()} onSubmit={handleHeroSubmit}
                    className="w-full max-w-md p-6 rounded-xl bg-background border border-border space-y-4">
                    <h3 className="font-display text-sm font-bold tracking-wider text-primary">{editingHeroId ? "Edit Slide" : "Add Slide"}</h3>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Image</label>
                      <ImageUpload currentUrl={heroForm.image_url} onUpload={(url) => setHeroForm({ ...heroForm, image_url: url })} folder="hero" />
                    </div>
                    <input placeholder="Tagline *" required value={heroForm.tagline} onChange={(e) => setHeroForm({ ...heroForm, tagline: e.target.value })} className={inputClass} />
                    <input placeholder="Sort Order" type="number" value={heroForm.sort_order} onChange={(e) => setHeroForm({ ...heroForm, sort_order: e.target.value })} className={inputClass} />
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" checked={heroForm.active} onChange={(e) => setHeroForm({ ...heroForm, active: e.target.checked })} />
                      Active
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">{editingHeroId ? "Update" : "Add"}</button>
                      <button type="button" onClick={() => resetHeroForm()} className="px-6 py-2 rounded-lg bg-secondary text-muted-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
                    </div>
                  </motion.form>
                </div>
              )}
            </div>
          )}

          {/* ════════ Announcements Tab ════════ */}
          {tab === "announcements" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Announcements</h3>
                <button onClick={() => { setShowAnnouncementForm(true); setEditingAnnouncementId(null); setAnnouncementForm(emptyAnnouncementForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                  <Plus size={16} /> New Announcement
                </button>
              </div>

              {announcements.length === 0 && !showAnnouncementForm && (
                <p className="text-muted-foreground text-center py-12">No announcements yet. Create one to notify members.</p>
              )}

              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="bg-secondary/30 border border-border/40 rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground">{a.title}</h4>
                      {a.message && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.message}</p>}
                      <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => { setEditingAnnouncementId(a.id); setAnnouncementForm({ title: a.title, message: a.message || "" }); setShowAnnouncementForm(true); }} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                      <button onClick={async () => { await supabase.from("announcements").delete().eq("id", a.id); fetchData(); toast.success("Announcement deleted"); }} className="p-2 rounded-lg hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {showAnnouncementForm && (
                <div className="mt-6">
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-secondary/30 border border-border/40 rounded-xl p-6 space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const payload = { title: announcementForm.title, message: announcementForm.message || null, created_by: user?.id };
                      if (editingAnnouncementId) {
                        await supabase.from("announcements").update(payload).eq("id", editingAnnouncementId);
                        toast.success("Announcement updated");
                      } else {
                        await supabase.from("announcements").insert(payload);
                        toast.success("Announcement published");
                      }
                      setShowAnnouncementForm(false);
                      setAnnouncementForm(emptyAnnouncementForm);
                      setEditingAnnouncementId(null);
                      fetchData();
                    }}
                  >
                    <input value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} placeholder="Announcement title *" required className={inputClass} />
                    <textarea value={announcementForm.message} onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })} placeholder="Message (optional)" rows={3} className={inputClass} />
                    <div className="flex gap-2">
                      <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">{editingAnnouncementId ? "Update" : "Publish"}</button>
                      <button type="button" onClick={() => { setShowAnnouncementForm(false); setAnnouncementForm(emptyAnnouncementForm); setEditingAnnouncementId(null); }} className="px-6 py-2 rounded-lg bg-secondary text-muted-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
                    </div>
                  </motion.form>
                </div>
              )}
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
