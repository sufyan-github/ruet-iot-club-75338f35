import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
  FolderOpen,
  UserCheck,
  Megaphone,
  Image,
  BookOpen,
  FlaskConical,
  GraduationCap,
  UserCog,
  MessageSquare,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Download,
  Search,
  ExternalLink,
  Shield,
  Sparkles,
  ArrowRight,
  Eye,
  Reply,
  Send,
  Lock,
} from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

const downloadCSV = (rows: Record<string, string>[], filename: string) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => `"${(r[h] || "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

type ModTabType =
  | "overview"
  | "events"
  | "participants"
  | "projects"
  | "announcements"
  | "photos"
  | "blog"
  | "research"
  | "courses"
  | "alumni"
  | "team"
  | "messages";

const emptyEventForm = {
  title: "",
  date: "",
  venue: "",
  description: "",
  type: "Workshop",
  max_participants: "",
  image_url: "",
  is_paid: false,
  registration_fee: "",
  payment_methods: [] as string[],
  payment_number: "01580352238",
  bank_account: "",
};

const emptyProjectForm = {
  title: "",
  description: "",
  category: "IoT & Embedded",
  status: "idea",
  github_link: "",
  image_url: "",
};

const emptyAnnouncementForm = {
  title: "",
  message: "",
  active: true,
};

const emptyPhotoForm = {
  title: "",
  description: "",
  image_url: "",
};

const emptyBlogForm = {
  title: "",
  content: "",
  excerpt: "",
  cover_image: "",
  category: "IoT Technology",
  published: true,
};

const emptyResearchForm = {
  title: "",
  authors: "",
  abstract: "",
  pdf_url: "",
  doi_link: "",
  status: "ongoing",
  research_area: "Internet of Things",
  tags: "",
};

const emptyCourseForm = {
  title: "",
  description: "",
  instructor: "",
  image_url: "",
  is_paid: false,
  price: "0",
  category: "IoT Fundamentals",
  duration: "4 Weeks",
  max_students: "50",
  status: "published",
};

const emptyLessonForm = {
  title: "",
  video_url: "",
  pdf_file: "",
  sort_order: "0",
};

const emptyAlumniForm = {
  name: "",
  batch: "",
  department: "ECE",
  company: "",
  linkedin: "",
};

const emptyTeamForm = {
  name: "",
  position: "",
  department: "",
  batch: "",
  bio: "",
  image_url: "",
  linkedin: "",
  github: "",
  email: "",
  sort_order: "0",
  category: "Core Team",
};

const ModeratorDashboard = () => {
  const { user, loading, isAdmin, isModerator } = useAuth();
  const canAccess = isAdmin || isModerator;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get("tab") as ModTabType | null;
  const [tab, setTabState] = useState<ModTabType>(queryTab || "overview");

  const setTab = (newTab: ModTabType) => {
    setTabState(newTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", newTab);
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    if (queryTab && queryTab !== tab) {
      setTabState(queryTab);
    }
  }, [queryTab]);

  useEffect(() => {
    if (!loading && (!user || !canAccess)) {
      navigate("/auth");
      if (!canAccess && user) {
        toast.error("Moderator or Admin access required to open this dashboard");
      }
    }
  }, [user, loading, canAccess, navigate]);

  // ─── Data states ───
  const [stats, setStats] = useState<any>({});
  const [events, setEvents] = useState<any[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("all");
  const [participantStatusFilter, setParticipantStatusFilter] = useState<string>("all");
  const [participantSearch, setParticipantSearch] = useState<string>("");
  const [projects, setProjects] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [researchPapers, setResearchPapers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // ─── Form states ───
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [photoForm, setPhotoForm] = useState(emptyPhotoForm);

  const [showBlogForm, setShowBlogForm] = useState(false);
  const [blogForm, setBlogForm] = useState(emptyBlogForm);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);

  const [showResearchForm, setShowResearchForm] = useState(false);
  const [researchForm, setResearchForm] = useState(emptyResearchForm);
  const [editingResearchId, setEditingResearchId] = useState<string | null>(null);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const [showAlumniForm, setShowAlumniForm] = useState(false);
  const [alumniForm, setAlumniForm] = useState(emptyAlumniForm);
  const [editingAlumniId, setEditingAlumniId] = useState<string | null>(null);

  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (canAccess) fetchData();
  }, [canAccess, tab]);

  const fetchData = async () => {
    switch (tab) {
      case "overview": {
        const [
          eventsRes,
          regsRes,
          projectsRes,
          announcementsRes,
          photosRes,
          blogRes,
          researchRes,
          messagesRes,
        ] = await Promise.all([
          supabase.from("events").select("id"),
          supabase.from("event_registrations").select("id"),
          supabase.from("projects").select("id, status"),
          supabase.from("announcements").select("id"),
          supabase.from("activity_photos").select("id"),
          supabase.from("blog_posts").select("id"),
          supabase.from("research_papers").select("id"),
          supabase.from("contact_messages").select("id"),
        ]);
        setStats({
          eventsCount: (eventsRes.data || []).length,
          participantsCount: (regsRes.data || []).length,
          projectsCount: (projectsRes.data || []).length,
          activeProjects: (projectsRes.data || []).filter(
            (p) => p.status === "ongoing" || p.status === "published"
          ).length,
          announcementsCount: (announcementsRes.data || []).length,
          photosCount: (photosRes.data || []).length,
          blogCount: (blogRes.data || []).length,
          researchCount: (researchRes.data || []).length,
          messagesCount: (messagesRes.data || []).length,
        });
        break;
      }
      case "events": {
        const { data } = await supabase
          .from("events")
          .select("*")
          .order("date", { ascending: false });
        setEvents(data || []);
        break;
      }
      case "participants": {
        const [eventsList, regsList] = await Promise.all([
          supabase.from("events").select("id, title, date").order("date", { ascending: false }),
          supabase
            .from("event_registrations")
            .select("*, events(title)")
            .order("registered_at", { ascending: false }),
        ]);
        setEvents(eventsList.data || []);
        setEventRegistrations(regsList.data || []);
        break;
      }
      case "projects": {
        const { data } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });
        setProjects(data || []);
        break;
      }
      case "announcements": {
        const { data } = await supabase
          .from("announcements")
          .select("*")
          .neq("title", "HERO_BANNER_CONFIG")
          .not("title", "like", "STAFF_INVITATION:%")
          .order("created_at", { ascending: false });
        setAnnouncements(data || []);
        break;
      }
      case "photos": {
        const { data } = await supabase
          .from("activity_photos")
          .select("*")
          .order("created_at", { ascending: false });
        setPhotos(data || []);
        break;
      }
      case "blog": {
        const { data } = await supabase
          .from("blog_posts")
          .select("*")
          .order("created_at", { ascending: false });
        setBlogPosts(data || []);
        break;
      }
      case "research": {
        const { data } = await supabase
          .from("research_papers")
          .select("*")
          .order("created_at", { ascending: false });
        setResearchPapers(data || []);
        break;
      }
      case "courses": {
        const { data: coursesData } = await supabase
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false });
        setCourses(coursesData || []);
        if (selectedCourseId) {
          const { data: lessonsData } = await supabase
            .from("lessons")
            .select("*")
            .eq("course_id", selectedCourseId)
            .order("sort_order", { ascending: true });
          setLessons(lessonsData || []);
        }
        break;
      }
      case "alumni": {
        const { data } = await supabase
          .from("alumni")
          .select("*")
          .order("batch", { ascending: false });
        setAlumni(data || []);
        break;
      }
      case "team": {
        const { data } = await supabase
          .from("team_members")
          .select("*")
          .order("sort_order", { ascending: true });
        setTeamMembers(data || []);
        break;
      }
      case "messages": {
        const { data } = await supabase
          .from("contact_messages")
          .select("*")
          .order("created_at", { ascending: false });
        setContactMessages(data || []);
        break;
      }
    }
  };

  const logActivity = async (action: string, entity_type?: string, entity_id?: string, details?: any) => {
    if (!user) return;
    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: user.id,
        action,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        details: {
          user_name: user.user_metadata?.full_name || "Club Moderator",
          user_email: user.email || null,
          user_role: isAdmin ? "admin" : "moderator",
          ...(details || {}),
        },
      });
    } catch { /* silent */ }
  };

  // ─── Event CRUD ───
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: eventForm.title,
      date: eventForm.date,
      venue: eventForm.venue || null,
      description: eventForm.description || null,
      type: eventForm.type || null,
      max_participants: eventForm.max_participants
        ? parseInt(eventForm.max_participants)
        : null,
      image_url: eventForm.image_url || null,
      is_paid: eventForm.is_paid,
      registration_fee:
        eventForm.is_paid && eventForm.registration_fee
          ? parseFloat(eventForm.registration_fee)
          : 0,
      payment_methods: eventForm.is_paid ? eventForm.payment_methods : [],
      payment_number: eventForm.is_paid ? eventForm.payment_number || null : null,
      bank_account: eventForm.is_paid ? eventForm.bank_account || null : null,
    };

    if (editingEventId) {
      const { error } = await supabase.from("events").update(payload).eq("id", editingEventId);
      if (error) {
        toast.error("Failed to update event: " + error.message);
      } else {
        toast.success("Event updated!");
        logActivity("update_event", "events", editingEventId, { title: payload.title, venue: payload.venue });
        resetEventForm();
        fetchData();
      }
    } else {
      const { data: newEv, error } = await supabase.from("events").insert(payload).select().single();
      if (error) {
        toast.error("Failed to create event: " + error.message);
      } else {
        toast.success("Event created successfully!");
        logActivity("create_event", "events", newEv?.id, { title: payload.title, venue: payload.venue, type: payload.type });
        resetEventForm();
        fetchData();
      }
    }
  };

  const editEvent = (ev: any) => {
    setEventForm({
      title: ev.title,
      date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : "",
      venue: ev.venue || "",
      description: ev.description || "",
      type: ev.type || "Workshop",
      max_participants: ev.max_participants?.toString() || "",
      image_url: ev.image_url || "",
      is_paid: ev.is_paid || false,
      registration_fee: ev.registration_fee?.toString() || "",
      payment_methods: ev.payment_methods || [],
      payment_number: ev.payment_number || "01580352238",
      bank_account: ev.bank_account || "",
    });
    setEditingEventId(ev.id);
    setShowEventForm(true);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error("Failed to delete event");
    else {
      toast.success("Event deleted");
      logActivity("delete_event", "events", id);
      fetchData();
    }
  };

  const resetEventForm = () => {
    setEventForm(emptyEventForm);
    setEditingEventId(null);
    setShowEventForm(false);
  };

  // ─── Participant Status ───
  const updateParticipantStatus = async (
    regId: string,
    status: "approved" | "rejected" | "pending"
  ) => {
    const { error } = await supabase
      .from("event_registrations")
      .update({ payment_status: status })
      .eq("id", regId);
    if (error) toast.error("Failed to update participant status");
    else {
      toast.success(`Participant status updated to ${status}`);
      logActivity("update_participant_status", "event_registrations", regId, { status });
      setEventRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, payment_status: status } : r))
      );
    }
  };

  // ─── Project CRUD ───
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = {
      title: projectForm.title,
      description: projectForm.description || null,
      category: projectForm.category || null,
      status: projectForm.status as any,
      github_link: projectForm.github_link || null,
      image_url: projectForm.image_url || null,
      created_by: user.id,
    };

    if (editingProjectId) {
      const { error } = await supabase.from("projects").update(payload).eq("id", editingProjectId);
      if (error) toast.error("Failed to update project: " + error.message);
      else {
        toast.success("Project updated!");
        logActivity("update_project", "projects", editingProjectId, { title: payload.title, category: payload.category });
        resetProjectForm();
        fetchData();
      }
    } else {
      const { data: newProj, error } = await supabase.from("projects").insert(payload).select().single();
      if (error) toast.error("Failed to add project: " + error.message);
      else {
        toast.success("Project added successfully!");
        logActivity("create_project", "projects", newProj?.id, { title: payload.title, category: payload.category });
        resetProjectForm();
        fetchData();
      }
    }
  };

  const editProject = (p: any) => {
    setProjectForm({
      title: p.title,
      description: p.description || "",
      category: p.category || "IoT & Embedded",
      status: p.status || "idea",
      github_link: p.github_link || "",
      image_url: p.image_url || "",
    });
    setEditingProjectId(p.id);
    setShowProjectForm(true);
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) toast.error("Failed to delete project");
    else {
      toast.success("Project deleted");
      logActivity("delete_project", "projects", id);
      fetchData();
    }
  };

  const resetProjectForm = () => {
    setProjectForm(emptyProjectForm);
    setEditingProjectId(null);
    setShowProjectForm(false);
  };

  // ─── Announcement CRUD ───
  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAnnouncementId) {
      const { error } = await supabase
        .from("announcements")
        .update(announcementForm)
        .eq("id", editingAnnouncementId);
      if (error) toast.error("Failed to update announcement");
      else {
        toast.success("Announcement updated!");
        logActivity("update_announcement", "announcements", editingAnnouncementId, { title: announcementForm.title });
        setAnnouncementForm(emptyAnnouncementForm);
        setEditingAnnouncementId(null);
        setShowAnnouncementForm(false);
        fetchData();
      }
    } else {
      const { data: newAnn, error } = await supabase.from("announcements").insert(announcementForm).select().single();
      if (error) toast.error("Failed to post announcement");
      else {
        toast.success("Announcement broadcasted!");
        logActivity("create_announcement", "announcements", newAnn?.id, { title: announcementForm.title });
        setAnnouncementForm(emptyAnnouncementForm);
        setShowAnnouncementForm(false);
        fetchData();
      }
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Announcement removed");
      logActivity("delete_announcement", "announcements", id);
      fetchData();
    }
  };

  // ─── Photo CRUD ───
  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoForm.image_url) {
      toast.error("Please provide an image");
      return;
    }
    const { data: newPh, error } = await supabase.from("activity_photos").insert(photoForm).select().single();
    if (error) toast.error("Failed to upload photo: " + error.message);
    else {
      toast.success("Photo uploaded to club gallery!");
      logActivity("upload_photo", "activity_photos", newPh?.id, { title: photoForm.title });
      setPhotoForm(emptyPhotoForm);
      setShowPhotoForm(false);
      fetchData();
    }
  };

  const deletePhoto = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    const { error } = await supabase.from("activity_photos").delete().eq("id", id);
    if (error) toast.error("Failed to delete photo");
    else {
      toast.success("Photo deleted");
      logActivity("delete_photo", "activity_photos", id);
      fetchData();
    }
  };

  // ─── Blog CRUD ───
  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = {
      title: blogForm.title,
      content: blogForm.content,
      excerpt: blogForm.excerpt || null,
      cover_image: blogForm.cover_image || null,
      category: blogForm.category || "IoT Technology",
      published: blogForm.published,
      author_id: user.id,
      author_name: user.user_metadata?.full_name || "Club Moderator",
    };

    if (editingBlogId) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", editingBlogId);
      if (error) toast.error("Failed to update post");
      else {
        toast.success("Blog post updated!");
        logActivity("update_blog", "blog_posts", editingBlogId, { title: payload.title });
        setBlogForm(emptyBlogForm);
        setEditingBlogId(null);
        setShowBlogForm(false);
        fetchData();
      }
    } else {
      const { data: newBlog, error } = await supabase.from("blog_posts").insert(payload).select().single();
      if (error) toast.error("Failed to publish blog: " + error.message);
      else {
        toast.success("Blog post created!");
        logActivity("publish_blog", "blog_posts", newBlog?.id, { title: payload.title });
        setBlogForm(emptyBlogForm);
        setShowBlogForm(false);
        fetchData();
      }
    }
  };

  const toggleBlogPublish = async (post: any) => {
    const { error } = await supabase
      .from("blog_posts")
      .update({ published: !post.published })
      .eq("id", post.id);
    if (error) toast.error("Failed to toggle status");
    else {
      toast.success(post.published ? "Post unpublished" : "Post published!");
      logActivity("toggle_blog_publish", "blog_posts", post.id, { title: post.title, published: !post.published });
      fetchData();
    }
  };

  const deleteBlogPost = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Blog post removed");
      logActivity("delete_blog", "blog_posts", id);
      fetchData();
    }
  };

  // ─── Research Papers CRUD ───
  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: researchForm.title,
      authors: researchForm.authors.split(",").map((a) => a.trim()).filter(Boolean),
      abstract: researchForm.abstract || null,
      pdf_url: researchForm.pdf_url || null,
      doi_link: researchForm.doi_link || null,
      status: researchForm.status,
      research_area: researchForm.research_area || null,
      tags: researchForm.tags ? researchForm.tags.split(",").map((t) => t.trim()) : [],
    };

    if (editingResearchId) {
      const { error } = await supabase
        .from("research_papers")
        .update(payload)
        .eq("id", editingResearchId);
      if (error) toast.error("Failed to update research paper");
      else {
        toast.success("Research paper updated!");
        setResearchForm(emptyResearchForm);
        setEditingResearchId(null);
        setShowResearchForm(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("research_papers").insert(payload);
      if (error) toast.error("Failed to add paper: " + error.message);
      else {
        toast.success("Research paper added!");
        setResearchForm(emptyResearchForm);
        setShowResearchForm(false);
        fetchData();
      }
    }
  };

  const deleteResearchPaper = async (id: string) => {
    if (!confirm("Delete this research paper?")) return;
    const { error } = await supabase.from("research_papers").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Research paper deleted");
      fetchData();
    }
  };

  // ─── Courses CRUD ───
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: courseForm.title,
      description: courseForm.description || null,
      instructor: courseForm.instructor || null,
      image_url: courseForm.image_url || null,
      is_paid: courseForm.is_paid,
      price: courseForm.is_paid ? parseFloat(courseForm.price || "0") : 0,
      category: courseForm.category || null,
      duration: courseForm.duration || null,
      max_students: courseForm.max_students ? parseInt(courseForm.max_students) : null,
      status: courseForm.status,
    };

    if (editingCourseId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editingCourseId);
      if (error) toast.error("Failed to update course");
      else {
        toast.success("Course updated!");
        setCourseForm(emptyCourseForm);
        setEditingCourseId(null);
        setShowCourseForm(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) toast.error("Failed to create course: " + error.message);
      else {
        toast.success("Course added!");
        setCourseForm(emptyCourseForm);
        setShowCourseForm(false);
        fetchData();
      }
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Delete this course and its syllabus?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) toast.error("Failed to delete course");
    else {
      toast.success("Course removed");
      fetchData();
    }
  };

  // ─── Alumni CRUD ───
  const handleAlumniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAlumniId) {
      const { error } = await supabase.from("alumni").update(alumniForm).eq("id", editingAlumniId);
      if (error) toast.error("Failed to update alumni record");
      else {
        toast.success("Alumni record updated!");
        setAlumniForm(emptyAlumniForm);
        setEditingAlumniId(null);
        setShowAlumniForm(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("alumni").insert(alumniForm);
      if (error) toast.error("Failed to add alumni: " + error.message);
      else {
        toast.success("Alumni record added!");
        setAlumniForm(emptyAlumniForm);
        setShowAlumniForm(false);
        fetchData();
      }
    }
  };

  const deleteAlumni = async (id: string) => {
    if (!confirm("Delete this alumni record?")) return;
    const { error } = await supabase.from("alumni").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Alumni record deleted");
      fetchData();
    }
  };

  // ─── Team Members CRUD ───
  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...teamForm,
      sort_order: parseInt(teamForm.sort_order || "0"),
    };
    if (editingTeamId) {
      const { error } = await supabase.from("team_members").update(payload).eq("id", editingTeamId);
      if (error) toast.error("Failed to update team member");
      else {
        toast.success("Team member updated!");
        setTeamForm(emptyTeamForm);
        setEditingTeamId(null);
        setShowTeamForm(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("team_members").insert(payload);
      if (error) toast.error("Failed to add member: " + error.message);
      else {
        toast.success("Team member added!");
        setTeamForm(emptyTeamForm);
        setShowTeamForm(false);
        fetchData();
      }
    }
  };

  const deleteTeamMember = async (id: string) => {
    if (!confirm("Remove this team member from showcase?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) toast.error("Failed to remove member");
    else {
      toast.success("Team member removed");
      fetchData();
    }
  };

  // ─── Reply to messages ───
  const sendReply = async (msg: any) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      // Mark as replied
      await supabase.from("contact_messages").update({ replied: true } as any).eq("id", msg.id);
      logActivity("reply_contact_message", "contact_messages", msg.id, { to_email: msg.email, subject: msg.subject });
      toast.success("Reply recorded! Email delivery dispatched.");
      setReplyingMessageId(null);
      setReplyText("");
      fetchData();
    } catch {
      toast.error("Failed to send reply");
    }
    setSendingReply(false);
  };

  if (loading || !canAccess) return null;

  const tabsList: { key: ModTabType; label: string; icon: typeof Calendar }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "events", label: "Events", icon: Calendar },
    { key: "participants", label: "Participants", icon: UserCheck },
    { key: "projects", label: "Projects", icon: FolderOpen },
    { key: "announcements", label: "Notices", icon: Megaphone },
    { key: "photos", label: "Gallery", icon: Image },
    { key: "blog", label: "Blog", icon: BookOpen },
    { key: "research", label: "Research", icon: FlaskConical },
    { key: "courses", label: "Courses", icon: BookOpen },
    { key: "alumni", label: "Alumni", icon: GraduationCap },
    { key: "team", label: "Team", icon: UserCog },
    { key: "messages", label: "Messages", icon: MessageSquare },
  ];

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  // Filtered participants
  const filteredParticipants = eventRegistrations.filter((r) => {
    const matchesEvent =
      selectedEventFilter === "all" || r.event_id === selectedEventFilter;
    const matchesStatus =
      participantStatusFilter === "all" || r.payment_status === participantStatusFilter;
    const searchLow = participantSearch.toLowerCase();
    const matchesSearch =
      !participantSearch ||
      (r.full_name && r.full_name.toLowerCase().includes(searchLow)) ||
      (r.email && r.email.toLowerCase().includes(searchLow)) ||
      (r.phone && r.phone.toLowerCase().includes(searchLow)) ||
      (r.student_id && r.student_id.toLowerCase().includes(searchLow)) ||
      (r.transaction_id && r.transaction_id.toLowerCase().includes(searchLow));
    return matchesEvent && matchesStatus && matchesSearch;
  });

  return (
    <Layout>
      <section className="py-16 md:py-20">
        <div className="container max-w-7xl">
          {/* ─── Top Header & Role Banner ─── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-border/40">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/30 shadow-[0_0_12px_rgba(45,226,201,0.2)]">
                  <Shield size={13} /> Club Moderator Workspace
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    Administrator Access
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                Moderator Operations Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage events, participants, projects, blogs, gallery & announcements with ease
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 transition-all flex items-center gap-1.5"
                >
                  <Shield size={14} /> Open Admin Panel
                </Link>
              )}
              <Link
                to="/dashboard"
                className="px-3 py-2 rounded-lg text-xs md:text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              >
                My Profile
              </Link>
            </div>
          </div>

          {/* ─── Quick Actions Bar ─── */}
          <div className="p-3 mb-8 rounded-xl bg-card/60 backdrop-blur-xl border border-border/60 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-muted-foreground font-semibold px-2 shrink-0">Quick Add:</span>
            <button
              onClick={() => {
                resetEventForm();
                setTab("events");
                setShowEventForm(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={13} /> New Event
            </button>
            <button
              onClick={() => {
                resetProjectForm();
                setTab("projects");
                setShowProjectForm(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={13} /> New Project
            </button>
            <button
              onClick={() => {
                setAnnouncementForm(emptyAnnouncementForm);
                setTab("announcements");
                setShowAnnouncementForm(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={13} /> Post Notice
            </button>
            <button
              onClick={() => {
                setPhotoForm(emptyPhotoForm);
                setTab("photos");
                setShowPhotoForm(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={13} /> Upload Photo
            </button>
            <button
              onClick={() => {
                setBlogForm(emptyBlogForm);
                setTab("blog");
                setShowBlogForm(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={13} /> Write Blog
            </button>
            <button
              onClick={() => {
                setCourseForm(emptyCourseForm);
                setTab("courses");
                setShowCourseForm(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={13} /> Add Course
            </button>
            <button
              onClick={() => {
                setAlumniForm(emptyAlumniForm);
                setTab("alumni");
                setShowAlumniForm(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={13} /> Add Alumni
            </button>
          </div>

          {/* ─── Navigation Tabs ─── */}
          <div className="flex flex-wrap justify-start gap-1.5 mb-8">
            {tabsList.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  tab === t.key
                    ? "bg-[#2de2c9] text-black font-semibold shadow-[0_0_14px_rgba(45,226,201,0.35)]"
                    : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* ─── Tab Contents ─── */}
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* ════════ Overview Tab ════════ */}
            {tab === "overview" && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Active Events", value: stats.eventsCount || 0, icon: Calendar, color: "text-[#2de2c9]" },
                    { label: "Registered Attendees", value: stats.participantsCount || 0, icon: UserCheck, color: "text-green-400" },
                    { label: "Club Projects", value: stats.projectsCount || 0, icon: FolderOpen, color: "text-blue-400" },
                    { label: "Published Blogs", value: stats.blogCount || 0, icon: BookOpen, color: "text-purple-400" },
                    { label: "Gallery Photos", value: stats.photosCount || 0, icon: Image, color: "text-pink-400" },
                    { label: "Active Notices", value: stats.announcementsCount || 0, icon: Megaphone, color: "text-yellow-400" },
                    { label: "Research Papers", value: stats.researchCount || 0, icon: FlaskConical, color: "text-cyan-400" },
                    { label: "Guest Inquiries", value: stats.messagesCount || 0, icon: MessageSquare, color: "text-orange-400" },
                  ].map((s, idx) => (
                    <div key={idx} className="p-4 rounded-xl glass border border-border/60 hover:border-primary/40 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                        <s.icon size={16} className={s.color} />
                      </div>
                      <p className="font-display text-2xl font-bold">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Moderator Responsibilities & Scope Info */}
                <div className="p-6 rounded-xl glass border border-border/80">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[#2de2c9]/10 text-[#2de2c9] border border-[#2de2c9]/25 shrink-0">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold">Moderator Permissions & Operational Scope</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        As an authorized club moderator, your workspace is tuned for speed and direct content management. You can publish events, manage attendees, showcase IoT projects, post notices, and communicate with visitors.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/40 text-xs">
                        <div className="space-y-1.5">
                          <p className="font-semibold text-green-400 flex items-center gap-1.5">
                            <Check size={14} /> Full Operational Management
                          </p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
                            <li>Create, edit & schedule club workshops and events</li>
                            <li>Review, approve & export event participant registrations</li>
                            <li>Publish & update club innovation projects & github repos</li>
                            <li>Broadcast notices & flash announcements to members</li>
                            <li>Upload activity & event photos to the website gallery</li>
                            <li>Write & publish technical blogs and research papers</li>
                          </ul>
                        </div>

                        <div className="space-y-1.5">
                          <p className="font-semibold text-yellow-400 flex items-center gap-1.5">
                            <Lock size={14} /> Protected Core Admin Areas
                          </p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
                            <li>Club financial revenue & bKash/Nagad membership fee verification</li>
                            <li>Granting or modifying system Admin and Moderator roles</li>
                            <li>Permanent member account deletion & identity configurations</li>
                            <li>Verified institutional partner presets & hero banner overrides</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════ Events Tab ════════ */}
            {tab === "events" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Manage Events & Workshops</h2>
                  <button
                    onClick={() => {
                      resetEventForm();
                      setShowEventForm(!showEventForm);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all glow-border"
                  >
                    <Plus size={14} /> {showEventForm ? "Cancel" : "Add Event"}
                  </button>
                </div>

                {showEventForm && (
                  <form onSubmit={handleEventSubmit} className="p-6 rounded-xl glass border border-primary/30 space-y-4">
                    <h3 className="text-sm font-bold text-primary">
                      {editingEventId ? "Edit Event" : "Create New Event"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Event Title *</label>
                        <input
                          required
                          value={eventForm.title}
                          onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. IoT Bootcamp 2026: From Sensors to Cloud"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={eventForm.date}
                          onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Venue / Platform</label>
                        <input
                          value={eventForm.venue}
                          onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. ECE Building, Room 302 or Google Meet"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Event Type</label>
                        <select
                          value={eventForm.type}
                          onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                          className={inputClass}
                        >
                          <option value="Workshop">Workshop</option>
                          <option value="Bootcamp">Bootcamp</option>
                          <option value="Seminar">Seminar</option>
                          <option value="Hackathon">Hackathon</option>
                          <option value="Competition">Competition</option>
                          <option value="Webinar">Webinar</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        className={inputClass}
                        placeholder="Detailed event overview, agenda, prerequisites..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Max Participants</label>
                        <input
                          type="number"
                          value={eventForm.max_participants}
                          onChange={(e) => setEventForm({ ...eventForm, max_participants: e.target.value })}
                          className={inputClass}
                          placeholder="Leave empty for unlimited"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Banner Image</label>
                        <ImageUpload
                          currentUrl={eventForm.image_url}
                          onUpload={(url) => setEventForm({ ...eventForm, image_url: url })}
                          folder="events"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-secondary/50 border border-border/60 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="mod_is_paid"
                          checked={eventForm.is_paid}
                          onChange={(e) => setEventForm({ ...eventForm, is_paid: e.target.checked })}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <label htmlFor="mod_is_paid" className="text-xs font-semibold">
                          Is this a Paid Event? (Requires registration fee)
                        </label>
                      </div>
                      {eventForm.is_paid && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Registration Fee (৳ BDT)</label>
                            <input
                              type="number"
                              value={eventForm.registration_fee}
                              onChange={(e) => setEventForm({ ...eventForm, registration_fee: e.target.value })}
                              className={inputClass}
                              placeholder="e.g. 150"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Club Payment bKash/Nagad</label>
                            <input
                              value={eventForm.payment_number}
                              onChange={(e) => setEventForm({ ...eventForm, payment_number: e.target.value })}
                              className={inputClass}
                              placeholder="01580352238"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={resetEventForm}
                        className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        {editingEventId ? "Save Changes" : "Publish Event"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map((ev) => (
                    <div key={ev.id} className="p-5 rounded-xl glass border border-border/70 space-y-3 flex flex-col justify-between">
                      <div>
                        {ev.image_url && (
                          <div className="h-36 w-full rounded-lg overflow-hidden mb-3 border border-border/40">
                            <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-base">{ev.title}</h3>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                            {ev.type || "Event"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          📅 {new Date(ev.date).toLocaleDateString()} at {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {ev.venue && ` · 📍 ${ev.venue}`}
                        </p>
                        {ev.description && (
                          <p className="text-xs text-foreground/80 mt-2 line-clamp-2">{ev.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3 text-xs">
                          <span className={`px-2 py-0.5 rounded font-mono ${ev.is_paid ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"}`}>
                            {ev.is_paid ? `৳${ev.registration_fee}` : "Free"}
                          </span>
                          {ev.max_participants && (
                            <span className="text-muted-foreground">Limit: {ev.max_participants} attendees</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-2">
                        <button
                          onClick={() => {
                            setSelectedEventFilter(ev.id);
                            setTab("participants");
                          }}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <UserCheck size={13} /> View Participants
                        </button>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => editEvent(ev)}
                            className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                            title="Edit Event"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteEvent(ev.id)}
                            className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                      No events added yet. Click &quot;Add Event&quot; to publish your first workshop!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Participants Tab ════════ */}
            {tab === "participants" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-bold">Event Registrations & Attendees</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Review registered students, approve payment tickets, or export attendance
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      downloadCSV(
                        filteredParticipants.map((r) => ({
                          "Full Name": r.full_name || "",
                          "Email": r.email || "",
                          "Phone": r.phone || "",
                          "Department": r.department || "",
                          "Student ID": r.student_id || "",
                          "Event": r.events?.title || "",
                          "Status": r.payment_status || "pending",
                          "Payment Method": r.payment_method || "",
                          "TrxID": r.transaction_id || "",
                          "Registered At": r.registered_at || "",
                        })),
                        `participants-${Date.now()}.csv`
                      )
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-secondary text-xs md:text-sm font-semibold hover:bg-secondary/80 transition-colors shrink-0"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl glass border border-border/60">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Filter by Event</label>
                    <select
                      value={selectedEventFilter}
                      onChange={(e) => setSelectedEventFilter(e.target.value)}
                      className={inputClass}
                    >
                      <option value="all">All Events ({eventRegistrations.length})</option>
                      {events.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Filter by Status</label>
                    <select
                      value={participantStatusFilter}
                      onChange={(e) => setParticipantStatusFilter(e.target.value)}
                      className={inputClass}
                    >
                      <option value="all">All Statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Search Participant</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        placeholder="Search name, roll, phone, TrxID..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Attendees Table / Cards */}
                <div className="space-y-3">
                  {filteredParticipants.map((reg) => (
                    <div
                      key={reg.id}
                      className="p-4 rounded-xl glass border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{reg.full_name}</span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              reg.payment_status === "approved"
                                ? "bg-green-500/10 text-green-400"
                                : reg.payment_status === "rejected"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-yellow-500/10 text-yellow-400"
                            }`}
                          >
                            {reg.payment_status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reg.department || "Dept —"} · Roll: {reg.student_id || "—"} · 📞 {reg.phone || "—"} · ✉️ {reg.email || "—"}
                        </p>
                        <p className="text-xs font-medium text-primary">
                          Event: {reg.events?.title || "Event Registration"}
                          {reg.transaction_id && ` · TrxID: ${reg.transaction_id} (${reg.payment_method || "Online"})`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => updateParticipantStatus(reg.id, "approved")}
                          className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold hover:bg-green-500/20 flex items-center gap-1 transition-colors"
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          onClick={() => updateParticipantStatus(reg.id, "rejected")}
                          className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive/20 flex items-center gap-1 transition-colors"
                        >
                          <X size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredParticipants.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No participants match your search criteria.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Projects Tab ════════ */}
            {tab === "projects" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Club Innovation Projects</h2>
                  <button
                    onClick={() => {
                      resetProjectForm();
                      setShowProjectForm(!showProjectForm);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all glow-border"
                  >
                    <Plus size={14} /> {showProjectForm ? "Cancel" : "Add Project"}
                  </button>
                </div>

                {showProjectForm && (
                  <form onSubmit={handleProjectSubmit} className="p-6 rounded-xl glass border border-primary/30 space-y-4">
                    <h3 className="text-sm font-bold text-primary">
                      {editingProjectId ? "Edit Project" : "Add Club Project"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Project Title *</label>
                        <input
                          required
                          value={projectForm.title}
                          onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Smart Campus Air Quality Monitor"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                        <select
                          value={projectForm.category}
                          onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                          className={inputClass}
                        >
                          <option value="IoT & Embedded">IoT & Embedded</option>
                          <option value="AI & Robotics">AI & Robotics</option>
                          <option value="Smart Agriculture">Smart Agriculture</option>
                          <option value="Smart Home & Automation">Smart Home & Automation</option>
                          <option value="Healthcare & Bio-IoT">Healthcare & Bio-IoT</option>
                          <option value="Industrial IoT">Industrial IoT</option>
                          <option value="Research & Hardware">Research & Hardware</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Development Status</label>
                        <select
                          value={projectForm.status}
                          onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                          className={inputClass}
                        >
                          <option value="idea">Idea / Prototype</option>
                          <option value="ongoing">Ongoing Development</option>
                          <option value="completed">Completed</option>
                          <option value="published">Published / Showcased</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">GitHub / Documentation Link</label>
                        <input
                          value={projectForm.github_link}
                          onChange={(e) => setProjectForm({ ...projectForm, github_link: e.target.value })}
                          className={inputClass}
                          placeholder="https://github.com/ruet-iot-club/..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        className={inputClass}
                        placeholder="Key hardware, microcontrollers (ESP32/STM32), sensors, cloud architecture..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Project Thumbnail</label>
                      <ImageUpload
                        currentUrl={projectForm.image_url}
                        onUpload={(url) => setProjectForm({ ...projectForm, image_url: url })}
                        folder="projects"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={resetProjectForm}
                        className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        {editingProjectId ? "Save Project" : "Publish Project"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((p) => (
                    <div key={p.id} className="p-4 rounded-xl glass border border-border/70 flex flex-col justify-between space-y-3">
                      <div>
                        {p.image_url && (
                          <div className="h-32 w-full rounded-lg overflow-hidden mb-3 border border-border/40">
                            <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-semibold text-sm line-clamp-1">{p.title}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#2de2c9] font-medium mt-0.5">{p.category}</p>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                        )}
                        {p.github_link && (
                          <a
                            href={p.github_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-2 font-mono"
                          >
                            <ExternalLink size={11} /> GitHub Repo
                          </a>
                        )}
                      </div>

                      <div className="flex justify-end gap-1.5 pt-2 border-t border-border/40">
                        <button
                          onClick={() => editProject(p)}
                          className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80"
                          title="Edit Project"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteProject(p.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                          title="Delete Project"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                      No projects added yet. Click &quot;Add Project&quot; to showcase club hardware & software innovations!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Announcements Tab ════════ */}
            {tab === "announcements" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Club Announcements & Notices</h2>
                  <button
                    onClick={() => {
                      setAnnouncementForm(emptyAnnouncementForm);
                      setShowAnnouncementForm(!showAnnouncementForm);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all glow-border"
                  >
                    <Plus size={14} /> {showAnnouncementForm ? "Cancel" : "Post Notice"}
                  </button>
                </div>

                {showAnnouncementForm && (
                  <form onSubmit={handleAnnouncementSubmit} className="p-6 rounded-xl glass border border-primary/30 space-y-4">
                    <h3 className="text-sm font-bold text-primary">
                      {editingAnnouncementId ? "Edit Notice" : "Broadcast New Notice"}
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Notice Title *</label>
                      <input
                        required
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                        className={inputClass}
                        placeholder="e.g. Workshop Registration Open for Embedded Systems"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Message Content *</label>
                      <textarea
                        required
                        rows={3}
                        value={announcementForm.message}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                        className={inputClass}
                        placeholder="Write announcement details..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="mod_notice_active"
                        checked={announcementForm.active}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, active: e.target.checked })}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <label htmlFor="mod_notice_active" className="text-xs font-medium">
                        Active (Visible across website header / alerts)
                      </label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAnnouncementForm(false)}
                        className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        Publish Notice
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl glass border border-border/70 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{a.title}</h3>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${a.active ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                            {a.active ? "Active" : "Archived"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Posted on {new Date(a.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setAnnouncementForm({
                              title: a.title,
                              message: a.message,
                              active: a.active,
                            });
                            setEditingAnnouncementId(a.id);
                            setShowAnnouncementForm(true);
                          }}
                          className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80"
                          title="Edit Notice"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteAnnouncement(a.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                          title="Delete Notice"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No notices active right now.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Photos / Gallery Tab ════════ */}
            {tab === "photos" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Activity Photos & Gallery</h2>
                  <button
                    onClick={() => {
                      setPhotoForm(emptyPhotoForm);
                      setShowPhotoForm(!showPhotoForm);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all glow-border"
                  >
                    <Plus size={14} /> {showPhotoForm ? "Cancel" : "Upload Photo"}
                  </button>
                </div>

                {showPhotoForm && (
                  <form onSubmit={handlePhotoSubmit} className="p-6 rounded-xl glass border border-primary/30 space-y-4">
                    <h3 className="text-sm font-bold text-primary">Add Photo to Gallery</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Photo Title</label>
                        <input
                          value={photoForm.title}
                          onChange={(e) => setPhotoForm({ ...photoForm, title: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. IoT Hackathon Award Ceremony 2026"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Description / Caption</label>
                        <input
                          value={photoForm.description}
                          onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Members testing LoRa mesh network"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Image Upload *</label>
                      <ImageUpload
                        currentUrl={photoForm.image_url}
                        onUpload={(url) => setPhotoForm({ ...photoForm, image_url: url })}
                        folder="gallery"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPhotoForm(false)}
                        className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        Save Photo
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photos.map((ph) => (
                    <div key={ph.id} className="group relative rounded-xl overflow-hidden glass border border-border/60">
                      <img src={ph.image_url} alt={ph.title || "Club Photo"} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 p-3 flex flex-col justify-end">
                        <p className="text-xs font-semibold text-white line-clamp-1">{ph.title || "Club Activity"}</p>
                        {ph.description && (
                          <p className="text-[10px] text-white/70 line-clamp-1">{ph.description}</p>
                        )}
                        <button
                          onClick={() => deletePhoto(ph.id)}
                          className="mt-2 self-end p-1.5 rounded bg-destructive/80 text-destructive-foreground hover:bg-destructive transition-colors text-xs"
                          title="Delete Photo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {photos.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                      No photos uploaded yet. Upload event memories to the club gallery!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Blog Tab ════════ */}
            {tab === "blog" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Club Tech Blogs & Articles</h2>
                  <button
                    onClick={() => {
                      setBlogForm(emptyBlogForm);
                      setShowBlogForm(!showBlogForm);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all glow-border"
                  >
                    <Plus size={14} /> {showBlogForm ? "Cancel" : "Write Blog"}
                  </button>
                </div>

                {showBlogForm && (
                  <form onSubmit={handleBlogSubmit} className="p-6 rounded-xl glass border border-primary/30 space-y-4">
                    <h3 className="text-sm font-bold text-primary">
                      {editingBlogId ? "Edit Blog Post" : "Write New Technical Article"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Post Title *</label>
                        <input
                          required
                          value={blogForm.title}
                          onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Getting Started with ESP32-S3 and TinyML"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                        <input
                          value={blogForm.category}
                          onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. IoT Tutorials, Firmware, Hardware"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Excerpt / Brief Summary</label>
                      <input
                        value={blogForm.excerpt}
                        onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                        className={inputClass}
                        placeholder="Short summary displayed on cards..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Full Article Content (Markdown supported) *</label>
                      <textarea
                        required
                        rows={8}
                        value={blogForm.content}
                        onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                        className={inputClass}
                        placeholder="Write your article in markdown..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Cover Image</label>
                      <ImageUpload
                        currentUrl={blogForm.cover_image}
                        onUpload={(url) => setBlogForm({ ...blogForm, cover_image: url })}
                        folder="blog"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="mod_blog_publish"
                        checked={blogForm.published}
                        onChange={(e) => setBlogForm({ ...blogForm, published: e.target.checked })}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <label htmlFor="mod_blog_publish" className="text-xs font-medium">
                        Publish immediately
                      </label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBlogForm(false)}
                        className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        Save Post
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {blogPosts.map((post) => (
                    <div key={post.id} className="p-4 rounded-xl glass border border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{post.title}</h3>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${post.published ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                            {post.published ? "Published" : "Draft"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          By {post.author_name || "Club Moderator"} · {post.category || "General"} · {new Date(post.created_at).toLocaleDateString()}
                        </p>
                        {post.excerpt && <p className="text-xs text-foreground/80 line-clamp-1">{post.excerpt}</p>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleBlogPublish(post)}
                          className="px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
                        >
                          {post.published ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => {
                            setBlogForm({
                              title: post.title,
                              content: post.content,
                              excerpt: post.excerpt || "",
                              cover_image: post.cover_image || "",
                              category: post.category || "IoT Technology",
                              published: post.published,
                            });
                            setEditingBlogId(post.id);
                            setShowBlogForm(true);
                          }}
                          className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80"
                          title="Edit Blog"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteBlogPost(post.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                          title="Delete Blog"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {blogPosts.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No blog posts written yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Research Tab ════════ */}
            {tab === "research" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Research Papers & Publications</h2>
                  <button
                    onClick={() => {
                      setResearchForm(emptyResearchForm);
                      setShowResearchForm(!showResearchForm);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all glow-border"
                  >
                    <Plus size={14} /> {showResearchForm ? "Cancel" : "Add Paper"}
                  </button>
                </div>

                {showResearchForm && (
                  <form onSubmit={handleResearchSubmit} className="p-6 rounded-xl glass border border-primary/30 space-y-4">
                    <h3 className="text-sm font-bold text-primary">
                      {editingResearchId ? "Edit Paper" : "Add Research Paper"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Paper Title *</label>
                        <input
                          required
                          value={researchForm.title}
                          onChange={(e) => setResearchForm({ ...researchForm, title: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Authors (comma separated) *</label>
                        <input
                          required
                          value={researchForm.authors}
                          onChange={(e) => setResearchForm({ ...researchForm, authors: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Nayem Islam, Dr. John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Research Area</label>
                        <input
                          value={researchForm.research_area}
                          onChange={(e) => setResearchForm({ ...researchForm, research_area: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Publication Status</label>
                        <select
                          value={researchForm.status}
                          onChange={(e) => setResearchForm({ ...researchForm, status: e.target.value })}
                          className={inputClass}
                        >
                          <option value="ongoing">Ongoing</option>
                          <option value="under_review">Under Review</option>
                          <option value="published">Published</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">PDF URL / Link</label>
                        <input
                          value={researchForm.pdf_url}
                          onChange={(e) => setResearchForm({ ...researchForm, pdf_url: e.target.value })}
                          className={inputClass}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">DOI / IEEE Link</label>
                        <input
                          value={researchForm.doi_link}
                          onChange={(e) => setResearchForm({ ...researchForm, doi_link: e.target.value })}
                          className={inputClass}
                          placeholder="https://doi.org/..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Abstract</label>
                      <textarea
                        rows={3}
                        value={researchForm.abstract}
                        onChange={(e) => setResearchForm({ ...researchForm, abstract: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowResearchForm(false)}
                        className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        Save Paper
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {researchPapers.map((paper) => (
                    <div key={paper.id} className="p-4 rounded-xl glass border border-border/70 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-sm">{paper.title}</h3>
                        <p className="text-xs text-[#2de2c9] mt-0.5 font-medium">
                          {Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{paper.abstract}</p>
                        <div className="flex gap-2 mt-2 text-xs">
                          {paper.pdf_url && (
                            <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 font-mono">
                              <ExternalLink size={11} /> PDF Link
                            </a>
                          )}
                          {paper.doi_link && (
                            <a href={paper.doi_link} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 font-mono">
                              <ExternalLink size={11} /> DOI
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => deleteResearchPaper(paper.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                          title="Delete Paper"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {researchPapers.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No research papers listed yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Courses Tab ════════ */}
            {tab === "courses" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Course Catalog & Training</h2>
                  <button
                    onClick={() => {
                      setCourseForm(emptyCourseForm);
                      setShowCourseForm(!showCourseForm);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all glow-border"
                  >
                    <Plus size={14} /> {showCourseForm ? "Cancel" : "Add Course"}
                  </button>
                </div>

                {showCourseForm && (
                  <form onSubmit={handleCourseSubmit} className="p-6 rounded-xl glass border border-primary/30 space-y-4">
                    <h3 className="text-sm font-bold text-primary">
                      {editingCourseId ? "Edit Course" : "Add New Course"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Course Title *</label>
                        <input
                          required
                          value={courseForm.title}
                          onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Hands-on Robotics with ROS2 & ESP32"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Instructor</label>
                        <input
                          value={courseForm.instructor}
                          onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. IoT Club Mentor Panel"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Duration</label>
                        <input
                          value={courseForm.duration}
                          onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. 6 Weeks"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Course Category</label>
                        <input
                          value={courseForm.category}
                          onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={courseForm.description}
                        onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCourseForm(false)}
                        className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        Save Course
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl glass border border-border/70 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm">{c.title}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Instructor: {c.instructor || "IoT Club"} · {c.duration || "Self-paced"}
                        </p>
                        {c.description && <p className="text-xs text-foreground/80 mt-2 line-clamp-2">{c.description}</p>}
                      </div>

                      <div className="flex justify-end gap-1.5 pt-2 border-t border-border/40">
                        <button
                          onClick={() => deleteCourse(c.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                          title="Delete Course"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {courses.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                      No courses created yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Alumni Tab ════════ */}
            {tab === "alumni" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Club Alumni Network</h2>
                  <button
                    onClick={() => {
                      setAlumniForm(emptyAlumniForm);
                      setShowAlumniForm(!showAlumniForm);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all glow-border"
                  >
                    <Plus size={14} /> {showAlumniForm ? "Cancel" : "Add Alumni"}
                  </button>
                </div>

                {showAlumniForm && (
                  <form onSubmit={handleAlumniSubmit} className="p-6 rounded-xl glass border border-primary/30 space-y-4">
                    <h3 className="text-sm font-bold text-primary">
                      {editingAlumniId ? "Edit Alumni" : "Add Alumni Record"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name *</label>
                        <input
                          required
                          value={alumniForm.name}
                          onChange={(e) => setAlumniForm({ ...alumniForm, name: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Batch / Graduation Year</label>
                        <input
                          value={alumniForm.batch}
                          onChange={(e) => setAlumniForm({ ...alumniForm, batch: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. 19 Series / 2024"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Department</label>
                        <input
                          value={alumniForm.department}
                          onChange={(e) => setAlumniForm({ ...alumniForm, department: e.target.value })}
                          className={inputClass}
                          placeholder="ECE, CSE, EEE, ME..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Current Company / Institution</label>
                        <input
                          value={alumniForm.company}
                          onChange={(e) => setAlumniForm({ ...alumniForm, company: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Software Engineer at Google / PhD at TU Munich"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">LinkedIn Profile</label>
                        <input
                          value={alumniForm.linkedin}
                          onChange={(e) => setAlumniForm({ ...alumniForm, linkedin: e.target.value })}
                          className={inputClass}
                          placeholder="https://linkedin.com/in/..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAlumniForm(false)}
                        className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        Save Record
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {alumni.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl glass border border-border/70 flex flex-col justify-between space-y-2">
                      <div>
                        <h3 className="font-semibold text-sm">{a.name}</h3>
                        <p className="text-xs text-[#2de2c9] font-medium">{a.company || "Alumnus"}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.department} · {a.batch || "Graduated"}
                        </p>
                        {a.linkedin && (
                          <a href={a.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-2">
                            <ExternalLink size={11} /> LinkedIn
                          </a>
                        )}
                      </div>
                      <div className="flex justify-end gap-1.5 pt-2 border-t border-border/40">
                        <button
                          onClick={() => deleteAlumni(a.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                          title="Delete Alumni"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {alumni.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                      No alumni records added yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Team Tab ════════ */}
            {tab === "team" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Team & Committee Showcase</h2>
                  <button
                    onClick={() => {
                      setTeamForm(emptyTeamForm);
                      setShowTeamForm(!showTeamForm);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all glow-border"
                  >
                    <Plus size={14} /> {showTeamForm ? "Cancel" : "Add Member"}
                  </button>
                </div>

                {showTeamForm && (
                  <form onSubmit={handleTeamSubmit} className="p-6 rounded-xl glass border border-primary/30 space-y-4">
                    <h3 className="text-sm font-bold text-primary">
                      {editingTeamId ? "Edit Member" : "Add Team Member"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name *</label>
                        <input
                          required
                          value={teamForm.name}
                          onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Designation / Role *</label>
                        <input
                          required
                          value={teamForm.position}
                          onChange={(e) => setTeamForm({ ...teamForm, position: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Vice President / Lead Embedded Engineer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Department & Batch</label>
                        <input
                          value={teamForm.department}
                          onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })}
                          className={inputClass}
                          placeholder="ECE '21"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                        <select
                          value={teamForm.category}
                          onChange={(e) => setTeamForm({ ...teamForm, category: e.target.value })}
                          className={inputClass}
                        >
                          <option value="Executive Board">Executive Board</option>
                          <option value="Core Team">Core Team</option>
                          <option value="Advisory Board">Advisory Board</option>
                          <option value="General Members">General Members</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Member Photo</label>
                      <ImageUpload
                        currentUrl={teamForm.image_url}
                        onUpload={(url) => setTeamForm({ ...teamForm, image_url: url })}
                        folder="team"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTeamForm(false)}
                        className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        Save Member
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {teamMembers.map((m) => (
                    <div key={m.id} className="p-4 rounded-xl glass border border-border/70 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {m.image_url ? (
                          <img src={m.image_url} alt={m.name} className="w-12 h-12 rounded-full object-cover border border-primary/30" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                            {m.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-sm">{m.name}</h3>
                          <p className="text-xs text-[#2de2c9] font-medium">{m.position}</p>
                          <p className="text-[11px] text-muted-foreground">{m.category}</p>
                        </div>
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => deleteTeamMember(m.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                          title="Remove Member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {teamMembers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                      No team members listed yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ Messages Tab ════════ */}
            {tab === "messages" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-bold">Visitor & Student Inquiries</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Messages received through the RUET IoT Club contact form
                  </p>
                </div>

                <div className="space-y-3">
                  {contactMessages.map((msg) => (
                    <div key={msg.id} className="p-5 rounded-xl glass border border-border/70 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{msg.subject || "No Subject"}</h3>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${msg.replied ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                              {msg.replied ? "Replied" : "Needs Reply"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            From: <strong className="text-foreground">{msg.name}</strong> ({msg.email}) · {new Date(msg.created_at).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setReplyingMessageId(replyingMessageId === msg.id ? null : msg.id)}
                          className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/20 flex items-center gap-1.5 transition-colors"
                        >
                          <Reply size={13} /> {replyingMessageId === msg.id ? "Close Reply" : "Reply"}
                        </button>
                      </div>

                      <p className="text-xs text-foreground/90 bg-secondary/40 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                        {msg.message}
                      </p>

                      {replyingMessageId === msg.id && (
                        <div className="pt-3 border-t border-border/40 space-y-2">
                          <textarea
                            rows={3}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Write response to ${msg.name} (${msg.email})...`}
                            className={inputClass}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingMessageId(null);
                                setReplyText("");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={sendingReply}
                              onClick={() => sendReply(msg)}
                              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Send size={13} /> {sendingReply ? "Sending..." : "Send Response"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {contactMessages.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No messages received yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default ModeratorDashboard;
