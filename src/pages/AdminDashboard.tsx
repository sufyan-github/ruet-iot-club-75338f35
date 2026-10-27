import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, X, Users, FolderOpen, Calendar, Eye, GraduationCap, Pencil, Trash2, Plus, UserCog, Image, FileText, Download, ChevronDown, ChevronUp, BookOpen, Mail, FlaskConical, Video, Award, BarChart3, Shield, Megaphone, MessageSquare, Send, Reply, UserCheck, Clock, Sparkles, Radio, ArrowRight, ExternalLink, Handshake, Copy, Search, Info, RefreshCw, Filter, CheckCircle2, AlertCircle } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import {
  fetchHeroBannerConfig,
  saveHeroBannerConfig,
  getCachedHeroBanner,
  DEFAULT_HERO_BANNER,
  type HeroBannerConfig,
} from "@/lib/heroBannerService";
import {
  fetchPartners,
  savePartners,
  getCachedPartners,
  DEFAULT_PARTNERS,
  type PartnerData,
} from "@/lib/partnersService";
import {
  EXECUTIVE_DESIGNATION_PRESETS,
  OFFICIAL_2026_EXECUTIVE_PANEL,
  getExecutiveTier,
  EXECUTIVE_TIERS,
} from "@/lib/teamHierarchy";
import {
  fetchClubPanels,
  upsertClubPanel,
  publishPanelAsCurrent,
  deleteClubPanel,
  type ClubPanel,
  DEFAULT_EXECUTIVE_ROLES,
  DEFAULT_ADVISORY_ROLES,
  INITIAL_PANELS,
} from "@/lib/panelManagement";

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

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return "—";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString();
  } catch {
    return isoString;
  }
};

type TabType = "overview" | "roles" | "logs" | "applications" | "members" | "payments" | "team" | "projects" | "events" | "participants" | "alumni" | "photos" | "blog" | "research" | "courses" | "hero" | "banner" | "partners" | "announcements" | "messages" | "reports";

const emptyPartnerForm: Partial<PartnerData> = {
  name: "",
  subtitle: "",
  description: "",
  website: "",
  logoUrl: "",
  presetLogoId: "custom",
  accentGlow: "rgba(45, 226, 201, 0.35)",
  active: true,
};

const emptyAlumniForm = { name: "", batch: "", department: "", company: "", linkedin: "" };
const emptyProjectForm = { title: "", description: "", category: "", status: "idea", github_link: "", image_url: "" };
const emptyEventForm = { title: "", date: "", venue: "", description: "", type: "", max_participants: "", image_url: "", is_paid: false, registration_fee: "", payment_methods: [] as string[], payment_number: "01580352238", bank_account: "4170331020181850" };
const TEAM_CATEGORIES = [
  "Executive Board",
  "3rd Executive (2025-2026)",
  "2nd Executive (2024-2025)",
  "1st Executive (2023-2024)",
  "Advisory Board",
  "Advisory Board (2024-2025)",
  "Founding Advisory Board (2023-2024)",
  "Core Team",
  "General Members",
  "Custom...",
];
const emptyTeamForm = { name: "", position: "", department: "", batch: "", bio: "", image_url: "", linkedin: "", github: "", email: "", sort_order: "0", category: "Executive Board", custom_category: "" };
const emptyPhotoForm = { title: "", image_url: "", description: "" };
const emptyResearchForm = { title: "", authors: "", abstract: "", pdf_url: "", doi_link: "", status: "ongoing", research_area: "", tags: "" };
const emptyCourseForm = { title: "", description: "", instructor: "", image_url: "", is_paid: false, price: "", category: "", duration: "", max_students: "", status: "draft" };
const emptyLessonForm = { title: "", video_url: "", pdf_file: "", sort_order: "0" };
const emptyHeroForm = { image_url: "", tagline: "", sort_order: "0", active: true };
const emptyAnnouncementForm = { title: "", message: "" };

const AdminDashboard = () => {
  const { user, loading, isAdmin, isModerator } = useAuth();
  const canAccess = isAdmin || isModerator;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get("tab") as TabType | null;
  const [tab, setTabState] = useState<TabType>(queryTab || "overview");

  const setTab = (newTab: TabType) => {
    setTabState(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", newTab);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (queryTab && queryTab !== tab) {
      setTabState(queryTab);
    }
  }, [queryTab]);
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
  const [heroBannerForm, setHeroBannerForm] = useState<HeroBannerConfig>(getCachedHeroBanner);
  const [savingHeroBanner, setSavingHeroBanner] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [participantFilter, setParticipantFilter] = useState<string>("all");
  const [participantStatusFilter, setParticipantStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [teamAdminFilter, setTeamAdminFilter] = useState<string>("all");

  // ─── Partners state ───
  const [partnersList, setPartnersList] = useState<PartnerData[]>(getCachedPartners);
  const [savingPartners, setSavingPartners] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState<Partial<PartnerData>>(emptyPartnerForm);

  // ─── Reports state ───
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  const [reportFrom, setReportFrom] = useState<string>(monthAgo.toISOString().slice(0, 10));
  const [reportTo, setReportTo] = useState<string>(today.toISOString().slice(0, 10));
  const [reportData, setReportData] = useState<any>({ membership: [], events: [], courses: [], activity: [] });

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

  // Panel & Committee Governance States
  const [panels, setPanels] = useState<ClubPanel[]>(INITIAL_PANELS);
  const [activePanelId, setActivePanelId] = useState<string>("panel-3rd-exec-2025-2026");
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState("");
  const [panelModalForm, setPanelModalForm] = useState({
    title: "4th Executive Board (2026-2027)",
    boardType: "executive" as "executive" | "advisory",
    sessionYears: "2026-2027",
    ordinal: 4,
    allowedRoles: [...DEFAULT_EXECUTIVE_ROLES],
    description: "",
  });

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

  // ─── Staff & Roles Management State ───
  const [staffEmailInput, setStaffEmailInput] = useState("");
  const [staffRoleInput, setStaffRoleInput] = useState<"admin" | "moderator">("moderator");
  const [selectedUserIdForRole, setSelectedUserIdForRole] = useState("");
  const [assigningStaffRole, setAssigningStaffRole] = useState(false);
  const [staffFilter, setStaffFilter] = useState<"all" | "admin" | "moderator">("all");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  // ─── Staff Invitation State ───
  const [staffInvitations, setStaffInvitations] = useState<any[]>([]);
  const [lastGeneratedInviteLink, setLastGeneratedInviteLink] = useState<string | null>(null);
  const [lastGeneratedInviteEmail, setLastGeneratedInviteEmail] = useState<string>("");
  const [lastGeneratedInviteRole, setLastGeneratedInviteRole] = useState<"admin" | "moderator">("moderator");

  // ─── Audit & Activity Logs State ───
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logStaffFilter, setLogStaffFilter] = useState<"all" | "admin" | "moderator">("all");
  const [logActionFilter, setLogActionFilter] = useState<string>("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (!isAdmin && isModerator) {
        toast.info("Redirecting to Moderator Workspace");
        navigate("/moderator");
        return;
      }
      if (!isAdmin) {
        toast.error("Administrator access required");
        navigate("/");
      }
    }
  }, [user, loading, isAdmin, isModerator, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, tab]);

  const logActivity = async (action: string, entity_type?: string, entity_id?: string, details?: any) => {
    if (!user) return;
    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: user.id,
        action,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        details: {
          user_name: user.user_metadata?.full_name || "Club Administrator",
          user_email: user.email || null,
          user_role: "admin",
          ...(details || {}),
        },
      });
    } catch { /* silent */ }
  };

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
        const courseRegs = courseRegsRes.data || [];
        const eventRegs = eventRegsRes.data || [];
        const pendingMemberPays = pays.filter(p => p.payment_status === "pending").length;
        const pendingEventPays = eventRegs.filter(r => r.payment_status === "pending").length;
        const pendingCoursePays = courseRegs.filter(r => r.payment_status === "pending" || r.payment_status === "unpaid").length;
        const totalPendingPayments = pendingMemberPays + pendingEventPays + pendingCoursePays;
        setOverviewStats({
          totalMembers: profiles.length,
          approvedMembers: profiles.filter(p => p.status === "approved").length,
          pendingMembers: profiles.filter(p => p.status === "pending").length,
          totalRevenue: pays.filter(p => p.payment_status === "verified").reduce((s, p) => s + (p.amount || 0), 0),
          pendingPayments: totalPendingPayments,
          pendingMemberPayments: pendingMemberPays,
          pendingEventPayments: pendingEventPays,
          pendingCoursePayments: pendingCoursePays,
          totalEvents: (eventsRes.data || []).length,
          totalProjects: (projectsRes.data || []).length,
          activeProjects: (projectsRes.data || []).filter(p => p.status !== "completed").length,
          totalCourses: (coursesRes.data || []).length,
          publishedCourses: (coursesRes.data || []).filter(c => c.status === "published").length,
          pendingBlogs: (blogRes.data || []).filter(b => !b.published).length,
          totalAlumni: (alumniRes.data || []).length,
          totalCertificates: (certsRes.data || []).length,
          courseEnrollments: courseRegs.length,
          courseCompleted: courseRegs.filter(r => r.completed).length,
          eventRegistrations: eventRegs.length,
        });
        break;
      }
      case "roles": {
        const [profilesRes, rolesRes, invitesRes] = await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("user_roles").select("*"),
          supabase
            .from("announcements")
            .select("*")
            .like("title", "STAFF_INVITATION:%")
            .order("created_at", { ascending: false }),
        ]);
        const membersList = profilesRes.data || [];
        const rolesList = rolesRes.data || [];
        setMembers(membersList);
        setMemberRoles(rolesList);

        const parsedInvites: any[] = [];
        for (const row of invitesRes.data || []) {
          try {
            const data = JSON.parse(row.message || "{}");
            const inviteObj = {
              id: row.id,
              ...data,
              announcement_id: row.id,
              created_at: row.created_at || data.created_at,
            };

            // Auto-activate role if user has signed up with this email
            if (inviteObj.status === "pending" || inviteObj.status === "claimed") {
              const matchedMember = membersList.find(
                (m: any) => (m.email || "").toLowerCase() === (inviteObj.email || "").toLowerCase()
              );
              if (matchedMember) {
                const hasTargetRole = rolesList.some(
                  (r: any) => r.user_id === matchedMember.user_id && r.role === inviteObj.role
                );
                if (!hasTargetRole) {
                  await supabase.from("user_roles").insert({
                    user_id: matchedMember.user_id,
                    role: inviteObj.role as any,
                  });
                  inviteObj.status = "accepted";
                  inviteObj.user_id = matchedMember.user_id;
                  await supabase
                    .from("announcements")
                    .update({ message: JSON.stringify(inviteObj) })
                    .eq("id", row.id);
                } else {
                  inviteObj.status = "accepted";
                }
              }
            }

            parsedInvites.push(inviteObj);
          } catch {
            /* ignore malformed message */
          }
        }
        setStaffInvitations(parsedInvites);
        break;
      }
      case "logs": {
        const { data } = await supabase
          .from("admin_activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300);
        setAuditLogs(data || []);
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
        const { data: regs } = await supabase
          .from("event_registrations")
          .select("*, events(title, date)")
          .order("registered_at", { ascending: false });
        setEventRegistrations(regs || []);
        break;
      }
      case "participants": {
        const [evRes, regsRes] = await Promise.all([
          supabase.from("events").select("id, title, date").order("date", { ascending: false }),
          supabase.from("event_registrations").select("*, events(title, date)").order("registered_at", { ascending: false }),
        ]);
        setEvents(evRes.data || []);
        setEventRegistrations(regsRes.data || []);
        break;
      }
      case "alumni": {
        const { data } = await supabase.from("alumni").select("*").order("batch", { ascending: false });
        setAlumni(data || []);
        break;
      }
      case "team": {
        const [{ data }, pList] = await Promise.all([
          supabase.from("team_members").select("*").order("sort_order", { ascending: true }),
          fetchClubPanels(),
        ]);
        setTeamMembers(data || []);
        if (pList && pList.length > 0) {
          setPanels(pList);
        }
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
      case "banner": {
        const cfg = await fetchHeroBannerConfig();
        setHeroBannerForm(cfg);
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
      case "messages": {
        const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
        setContactMessages(data || []);
        break;
      }
      case "reports": {
        const fromISO = new Date(reportFrom + "T00:00:00").toISOString();
        const toISO = new Date(reportTo + "T23:59:59").toISOString();
        const [memRes, evRes, crRes, actRes, eventsRes, coursesRes] = await Promise.all([
          supabase.from("membership_payments").select("*").gte("created_at", fromISO).lte("created_at", toISO).order("created_at", { ascending: false }),
          supabase.from("event_registrations").select("*, events(title, registration_fee)").gte("registered_at", fromISO).lte("registered_at", toISO).order("registered_at", { ascending: false }),
          supabase.from("course_registrations").select("*").gte("registered_at", fromISO).lte("registered_at", toISO).order("registered_at", { ascending: false }),
          supabase.from("admin_activity_log").select("*").gte("created_at", fromISO).lte("created_at", toISO).order("created_at", { ascending: false }).limit(200),
          supabase.from("events").select("id, title, registration_fee"),
          supabase.from("courses").select("id, title, price"),
        ]);
        setReportData({
          membership: memRes.data || [],
          events: evRes.data || [],
          courses: crRes.data || [],
          activity: actRes.data || [],
          eventMap: Object.fromEntries((eventsRes.data || []).map((e: any) => [e.id, e])),
          courseMap: Object.fromEntries((coursesRes.data || []).map((c: any) => [c.id, c])),
        });
        break;
      }
      case "partners": {
        const data = await fetchPartners();
        setPartnersList(data);
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
    else {
      toast.success(`Payment ${status}`);
      logActivity("payment_updated", "membership_payment", id, { status });
      fetchData();
    }
  };

  const updateEventPaymentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("event_registrations").update({ payment_status: status }).eq("id", id);
    if (error) toast.error("Failed to update payment");
    else { toast.success(`Payment ${status}`); fetchData(); }
  };

  const updateEventApproval = async (id: string, approval_status: "approved" | "rejected" | "pending") => {
    const { error } = await supabase.from("event_registrations").update({ approval_status }).eq("id", id);
    if (error) { toast.error("Failed to update approval"); return; }
    toast.success(`Registration ${approval_status}`);
    logActivity("event_approval_updated", "event_registration", id, { approval_status });
    fetchData();
  };

  const deleteEventRegistration = async (id: string) => {
    if (!confirm("Delete this registration permanently?")) return;
    const { error } = await supabase.from("event_registrations").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Registration deleted");
    fetchData();
  };

  const updateCoursePaymentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("course_registrations").update({ payment_status: status }).eq("id", id);
    if (error) {
      toast.error("Failed to update payment: " + error.message);
    } else {
      toast.success(`Course payment ${status}`);
      logActivity("update_course_payment", "course_registrations", id, { status });
      fetchData();
    }
  };

  const toggleCourseCompletion = async (registrationId: string, currentCompleted: boolean, userId: string, courseId: string) => {
    const newStatus = !currentCompleted;
    const { error } = await supabase
      .from("course_registrations")
      .update({ completed: newStatus })
      .eq("id", registrationId);
    if (error) {
      toast.error("Failed to update course completion: " + error.message);
      return;
    }

    // Auto-generate certificate if marked complete and not yet certified
    if (newStatus) {
      const hasCert = courseCertificates.some((c: any) => c.course_id === courseId && c.user_id === userId);
      if (!hasCert) {
        try {
          let certNum: string | null = null;
          try {
            const { data } = await supabase.rpc("generate_certificate_number");
            certNum = data;
          } catch {
            /* ignore RPC error */
          }
          if (!certNum) {
            certNum = `CERT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
          }

          const { error: certErr } = await supabase.from("certificates").insert({
            user_id: userId,
            course_id: courseId,
            certificate_number: certNum,
          });
          if (!certErr) {
            toast.success(`🎉 Marked completed & Certificate #${certNum} issued!`);
          } else {
            toast.success("Course marked as completed!");
          }
        } catch {
          toast.success("Course marked as completed!");
        }
      } else {
        toast.success("Course marked as completed!");
      }
    } else {
      toast.info("Course marked as in progress");
    }

    logActivity("update_course_completion", "course_registrations", registrationId, { completed: newStatus });
    fetchData();
  };

  const issueCourseCertificate = async (userId: string, courseId: string) => {
    try {
      let certNum: string | null = null;
      try {
        const { data } = await supabase.rpc("generate_certificate_number");
        certNum = data;
      } catch {
        /* ignore RPC error */
      }
      if (!certNum) {
        certNum = `CERT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      }

      const { error } = await supabase.from("certificates").insert({
        user_id: userId,
        course_id: courseId,
        certificate_number: certNum,
      });

      if (error) {
        toast.error("Failed to issue certificate: " + error.message);
        return;
      }

      toast.success(`🎉 Certificate #${certNum} issued successfully!`);
      logActivity("issue_certificate", "certificates", courseId, { user_id: userId, certificate_number: certNum });
      fetchData();
    } catch (err: any) {
      toast.error("Error issuing certificate: " + (err?.message || "Unknown error"));
    }
  };

  const deleteCourseRegistration = async (id: string) => {
    if (!confirm("Remove this course enrollment permanently?")) return;
    const { error } = await supabase.from("course_registrations").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete enrollment: " + error.message);
      return;
    }
    toast.success("Enrollment removed");
    logActivity("delete_course_registration", "course_registrations", id);
    fetchData();
  };

  // ─── Role Management ───
  const assignRole = async (userId: string, role: string) => {
    if (userId === user?.id && role !== "admin") {
      if (!confirm("Caution: You are changing your own role away from Admin! You will lose access to this admin dashboard. Continue?")) return;
    }
    // Remove existing roles first, then add new one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    if (role !== "none") {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) { toast.error("Failed to assign role: " + error.message); return; }
    }
    toast.success(`Role updated to ${role}`);
    logActivity("assign_role", "user_roles", userId, { role });
    fetchData();
  };

  const getUserRole = (userId: string) => {
    const role = memberRoles.find((r: any) => r.user_id === userId);
    return role?.role || "none";
  };

  const handleAssignStaffRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssigningStaffRole(true);

    let targetUserId = selectedUserIdForRole;

    if (!targetUserId && staffEmailInput.trim()) {
      const cleanEmail = staffEmailInput.trim().toLowerCase();
      const matched = members.find((m) => (m.email || "").toLowerCase() === cleanEmail);
      if (matched) {
        targetUserId = matched.user_id;
      } else {
        // Try RPC assign_role_by_email
        try {
          const { data, error } = await (supabase.rpc as any)("assign_role_by_email", {
            _email: cleanEmail,
            _role: staffRoleInput,
          });
          if (error) {
            toast.error(error.message);
          } else if (data && data.success) {
            toast.success(data.message || `Assigned ${staffRoleInput} to ${cleanEmail}`);
            setStaffEmailInput("");
            setSelectedUserIdForRole("");
            fetchData();
            setAssigningStaffRole(false);
            return;
          } else {
            toast.error(data?.message || "No registered user found with this email. Ask them to sign up first.");
          }
        } catch (err: any) {
          toast.error("User with email '" + cleanEmail + "' is not registered yet. Ask them to register at /auth.");
        }
        setAssigningStaffRole(false);
        return;
      }
    }

    if (!targetUserId) {
      toast.error("Please select a registered user or enter their email");
      setAssigningStaffRole(false);
      return;
    }

    await assignRole(targetUserId, staffRoleInput);
    setStaffEmailInput("");
    setSelectedUserIdForRole("");
    setAssigningStaffRole(false);
  };

  // ─── Staff Invitation Handler (Stored via announcements table for zero-migration support) ───
  const handleSendStaffInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmailInput.trim()) return;
    setAssigningStaffRole(true);

    const email = staffEmailInput.trim().toLowerCase();
    const token = crypto.randomUUID();
    const inviteUrl = `${window.location.origin}/accept-invite?token=${token}`;

    const invitePayload = {
      type: "STAFF_INVITATION",
      email,
      role: staffRoleInput,
      token,
      invited_by: user?.id,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    try {
      // Store in announcements table with dedicated STAFF_INVITATION prefix
      const { error: insertError } = await supabase.from("announcements").insert({
        title: `STAFF_INVITATION:${token}`,
        message: JSON.stringify(invitePayload),
        created_by: user?.id,
      });

      if (insertError) {
        toast.error("Failed to create invitation: " + insertError.message);
        setAssigningStaffRole(false);
        return;
      }

      setLastGeneratedInviteLink(inviteUrl);
      setLastGeneratedInviteEmail(email);
      setLastGeneratedInviteRole(staffRoleInput);

      // 1. Dispatch email directly to invitee's inbox via Supabase Auth
      try {
        await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: inviteUrl,
          },
        });
      } catch (authErr) {
        console.warn("Supabase Auth direct email dispatch notice:", authErr);
      }

      // 2. Also invoke send-notification edge function for logging & notification
      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            type: "staff_invitation",
            to_email: email,
            role: staffRoleInput,
            invited_by_name: user?.user_metadata?.full_name || "Club Administrator",
            invite_url: inviteUrl,
          },
        });
      } catch {
        /* edge function silent */
      }

      toast.success(`Invitation email sent to ${email}! The onboarding link has been dispatched to their inbox.`);

      logActivity("invite_staff", "announcements", token, {
        email,
        role: staffRoleInput,
        inviteUrl,
      });

      setStaffEmailInput("");
      fetchData();
    } catch (err: any) {
      toast.error("Invitation failed: " + err.message);
    }
    setAssigningStaffRole(false);
  };

  const revokeInvitation = async (invId: string, email: string) => {
    if (!confirm(`Revoke invitation for ${email}?`)) return;
    const { error } = await supabase.from("announcements").delete().eq("id", invId);
    if (error) {
      toast.error("Failed to revoke invitation: " + error.message);
    } else {
      toast.success("Invitation revoked");
      logActivity("revoke_invitation", "announcements", invId, { email });
      fetchData();
    }
  };

  const promoteModeratorToAdmin = async (userId: string, name: string, email: string) => {
    if (!confirm(`Are you sure you want to promote Moderator "${name}" (${email}) to full Administrator?`)) return;
    await assignRole(userId, "admin");
    logActivity("promote_moderator_to_admin", "user_roles", userId, { name, email });
    toast.success(`Successfully promoted ${name} to Administrator!`);
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
  const deleteProject = async (id: string) => { if (!confirm("Are you sure you want to delete this project permanently?")) return; const { error } = await supabase.from("projects").delete().eq("id", id); if (error) toast.error("Failed to delete project: " + error.message); else { toast.success("Project deleted"); logActivity("delete_project", "projects", id); fetchData(); } };
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
  const deleteEvent = async (id: string) => { if (!confirm("Are you sure you want to delete this event? This will also remove attendee registrations.")) return; const { error } = await supabase.from("events").delete().eq("id", id); if (error) toast.error("Failed to delete event: " + error.message); else { toast.success("Event deleted"); logActivity("delete_event", "events", id); fetchData(); } };
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
  const deleteAlumni = async (id: string) => { if (!confirm("Are you sure you want to delete this alumni record?")) return; const { error } = await supabase.from("alumni").delete().eq("id", id); if (error) toast.error("Failed to delete alumni: " + error.message); else { toast.success("Alumni deleted"); logActivity("delete_alumni", "alumni", id); fetchData(); } };
  const resetAlumniForm = () => { setAlumniForm(emptyAlumniForm); setEditingAlumniId(null); setShowAlumniForm(false); };

  // ─── Team CRUD ───
  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory =
      teamForm.category === "Custom..."
        ? teamForm.custom_category?.trim() || "Executive Board"
        : teamForm.category || "Executive Board";

    const payload = {
      name: teamForm.name,
      position: teamForm.position,
      department: teamForm.department || null,
      batch: teamForm.batch || null,
      bio: teamForm.bio || null,
      image_url: teamForm.image_url || null,
      linkedin: teamForm.linkedin || null,
      github: teamForm.github || null,
      email: teamForm.email || null,
      sort_order: parseInt(teamForm.sort_order) || 0,
      category: finalCategory,
    } as any;

    if (editingTeamId) {
      const { error } = await supabase.from("team_members").update(payload).eq("id", editingTeamId);
      if (error) toast.error("Failed to update team member");
      else { toast.success("Team member updated!"); resetTeamForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("team_members").insert(payload);
      if (error) toast.error("Failed to add team member");
      else { toast.success("Team member added!"); resetTeamForm(); fetchData(); }
    }
  };

  const activePanel = panels.find((p) => p.id === activePanelId) || panels[0];

  const handleCreateNewPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelModalForm.title.trim()) {
      toast.error("Please enter a panel title");
      return;
    }

    try {
      const created = await upsertClubPanel({
        title: panelModalForm.title.trim(),
        boardType: panelModalForm.boardType,
        sessionYears: panelModalForm.sessionYears.trim(),
        ordinal: Number(panelModalForm.ordinal) || 4,
        status: "draft",
        isCurrent: false,
        allowedRoles: panelModalForm.allowedRoles,
        description: panelModalForm.description,
      });

      const updatedPanels = await fetchClubPanels();
      setPanels(updatedPanels);
      setActivePanelId(created.id);
      setTeamForm((prev) => ({ ...prev, category: created.title }));
      setShowPanelModal(false);
      toast.success(`🎉 New panel "${created.title}" created in Draft mode! You can now add roles and members.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create panel");
    }
  };

  const handlePublishActivePanel = async () => {
    if (!activePanel) return;
    const isExecutive = activePanel.boardType === "executive";
    const boardName = isExecutive ? "Executive Board" : "Advisory Board";

    const confirmed = window.confirm(
      `Publish "${activePanel.title}" as the new Current ${boardName}?\n\n• This will make "${activePanel.title}" visible on the public Team page as the active Current panel.\n• The previous current panel will automatically be archived as a past term in the dropdown.\n\nDo you want to proceed?`
    );
    if (!confirmed) return;

    try {
      const updated = await publishPanelAsCurrent(activePanel.id);
      setPanels(updated);
      toast.success(`🚀 "${activePanel.title}" is now published and active as the Current ${boardName}!`);
      logActivity("publish_panel_as_current", "club_panels", activePanel.id, { title: activePanel.title });
    } catch (err: any) {
      toast.error(err.message || "Failed to publish panel");
    }
  };

  const handleAddRoleToActivePanel = async () => {
    if (!activePanel || !newRoleInput.trim()) return;
    const role = newRoleInput.trim();
    if (activePanel.allowedRoles.includes(role)) {
      toast.info("Role already exists in this panel");
      return;
    }
    const updatedRoles = [...activePanel.allowedRoles, role];
    await upsertClubPanel({ ...activePanel, allowedRoles: updatedRoles });
    const refreshed = await fetchClubPanels();
    setPanels(refreshed);
    setNewRoleInput("");
    toast.success(`Added role "${role}" to this panel!`);
  };

  const handleRemoveRoleFromActivePanel = async (roleToRemove: string) => {
    if (!activePanel) return;
    if (activePanel.allowedRoles.length <= 1) {
      toast.error("Panel must have at least one role");
      return;
    }
    const updatedRoles = activePanel.allowedRoles.filter((r) => r !== roleToRemove);
    await upsertClubPanel({ ...activePanel, allowedRoles: updatedRoles });
    const refreshed = await fetchClubPanels();
    setPanels(refreshed);
    toast.success(`Removed role "${roleToRemove}"`);
  };

  const handleDeleteActivePanel = async () => {
    if (!activePanel) return;
    if (activePanel.isCurrent) {
      toast.error("Cannot delete the active Current panel. Please set another panel as Current first.");
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete panel "${activePanel.title}"?`);
    if (!confirmed) return;
    await deleteClubPanel(activePanel.id);
    const refreshed = await fetchClubPanels();
    setPanels(refreshed);
    const fallback = refreshed[0];
    if (fallback) setActivePanelId(fallback.id);
    toast.success("Panel deleted");
  };

  const editTeam = (t: any) => {
    const isCustom = !TEAM_CATEGORIES.includes(t.category) && t.category;
    const matchedPanel = panels.find((p) => p.title === t.category || p.id === t.category);
    if (matchedPanel) setActivePanelId(matchedPanel.id);

    setTeamForm({
      name: t.name,
      position: t.position,
      department: t.department || "",
      batch: t.batch || "",
      bio: t.bio || "",
      image_url: t.image_url || "",
      linkedin: t.linkedin || "",
      github: t.github || "",
      email: t.email || "",
      sort_order: t.sort_order?.toString() || "0",
      category: t.category || activePanel?.title || "3rd Executive (2025-2026)",
      custom_category: isCustom ? t.category : "",
    });
    setEditingTeamId(t.id);
    setShowTeamForm(true);
  };
  const deleteTeam = async (id: string) => { const { error } = await supabase.from("team_members").delete().eq("id", id); if (error) toast.error("Failed"); else { toast.success("Team member removed"); fetchData(); } };
  const resetTeamForm = () => {
    setTeamForm({
      ...emptyTeamForm,
      category: activePanel?.title || "3rd Executive (2025-2026)",
    });
    setEditingTeamId(null);
    setShowTeamForm(false);
  };

  const [syncing2026Panel, setSyncing2026Panel] = useState(false);
  const [teamTierFilter, setTeamTierFilter] = useState<string>("all");

  const handleSyncOfficial2026Panel = async () => {
    const confirmed = window.confirm(
      "Sync Official 2026 Executive Panel (46 Members)?\n\nThis will load and update the 46 members from the official 2026 Committee document (President, GS, VPs, AGS, Secretaries, AS, Executive Members) with their exact positions and sort order. Existing records will be updated safely without deleting custom data."
    );
    if (!confirmed) return;

    setSyncing2026Panel(true);
    try {
      let created = 0;
      let updated = 0;

      for (const m of OFFICIAL_2026_EXECUTIVE_PANEL) {
        // Look up by name
        const { data: existing } = await supabase
          .from("team_members")
          .select("id, image_url, bio, linkedin, github, email, phone")
          .ilike("name", m.name.trim())
          .limit(1);

        const payload: any = {
          name: m.name,
          position: m.position,
          category: "Executive Board",
          department: m.department || "RUET",
          batch: m.batch || null,
          sort_order: m.sort_order,
        };

        if (existing && existing.length > 0) {
          const current = existing[0];
          if (!current.bio && (m as any).bio) payload.bio = (m as any).bio;
          const { error } = await supabase.from("team_members").update(payload).eq("id", current.id);
          if (!error) updated++;
        } else {
          payload.bio = (m as any).bio || null;
          const { error } = await supabase.from("team_members").insert(payload);
          if (!error) created++;
        }
      }

      toast.success(`Executive Panel Synced: ${created} added, ${updated} updated!`);
      logActivity("sync_2026_executive_panel", "team_members", undefined, { created, updated });
      fetchData();
    } catch (err: any) {
      toast.error(`Sync failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSyncing2026Panel(false);
    }
  };

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
  const deletePhoto = async (id: string) => { if (!confirm("Are you sure you want to delete this photo?")) return; const { error } = await supabase.from("activity_photos").delete().eq("id", id); if (error) toast.error("Failed to delete photo: " + error.message); else { toast.success("Photo deleted"); logActivity("delete_photo", "activity_photos", id); fetchData(); } };
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
  const deleteResearch = async (id: string) => { if (!confirm("Are you sure you want to delete this research paper?")) return; const { error } = await supabase.from("research_papers").delete().eq("id", id); if (error) toast.error("Failed to delete research: " + error.message); else { toast.success("Research deleted"); logActivity("delete_research", "research_papers", id); fetchData(); } };
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
  const deleteCourse = async (id: string) => { if (!confirm("Are you sure you want to delete this course permanently? This will remove all associated lessons.")) return; const { error } = await supabase.from("courses").delete().eq("id", id); if (error) toast.error("Failed to delete course: " + error.message); else { toast.success("Course deleted"); logActivity("delete_course", "courses", id); fetchData(); } };
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
  const deleteLesson = async (id: string) => { if (!confirm("Are you sure you want to delete this lesson?")) return; const { error } = await supabase.from("lessons").delete().eq("id", id); if (error) toast.error("Failed to delete lesson: " + error.message); else { toast.success("Lesson deleted"); logActivity("delete_lesson", "lessons", id); fetchData(); } };
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
  const deleteHeroSlide = async (id: string) => { if (!confirm("Are you sure you want to delete this slide?")) return; const { error } = await supabase.from("hero_slides").delete().eq("id", id); if (error) toast.error("Failed to delete slide: " + error.message); else { toast.success("Slide deleted"); logActivity("delete_hero_slide", "hero_slides", id); fetchData(); } };
  const resetHeroForm = () => { setHeroForm(emptyHeroForm); setEditingHeroId(null); setShowHeroForm(false); };
  const toggleHeroActive = async (id: string, active: boolean) => { await supabase.from("hero_slides").update({ active: !active }).eq("id", id); fetchData(); };

  // ─── Partners CRUD ───
  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name?.trim()) {
      toast.error("Partner name is required");
      return;
    }
    setSavingPartners(true);
    try {
      let updated: PartnerData[];
      if (editingPartnerId) {
        updated = partnersList.map((p) =>
          p.id === editingPartnerId ? ({ ...p, ...partnerForm, id: p.id } as PartnerData) : p
        );
      } else {
        const newPartner: PartnerData = {
          id: `partner_${Date.now()}`,
          name: partnerForm.name.trim(),
          subtitle: partnerForm.subtitle?.trim() || "",
          description: partnerForm.description?.trim() || "",
          website: partnerForm.website?.trim() || "",
          logoUrl: partnerForm.logoUrl?.trim() || "",
          presetLogoId: (partnerForm.presetLogoId as any) || "custom",
          accentGlow: partnerForm.accentGlow || "rgba(45, 226, 201, 0.35)",
          active: partnerForm.active !== false,
          sortOrder: partnersList.length + 1,
        };
        updated = [...partnersList, newPartner];
      }

      const res = await savePartners(updated, user?.id);
      if (res.success) {
        setPartnersList(updated);
        toast.success(editingPartnerId ? "Partner updated & saved to Database!" : "New Partner added & saved to Database!");
        logActivity(editingPartnerId ? "partner_updated" : "partner_created", "partner", editingPartnerId || "new", { name: partnerForm.name });
        resetPartnerForm();
      } else {
        toast.error("Failed to save to database. Cached locally.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save partner");
    } finally {
      setSavingPartners(false);
    }
  };

  const editPartner = (p: PartnerData) => {
    setPartnerForm({ ...p });
    setEditingPartnerId(p.id);
    setShowPartnerForm(true);
  };

  const deletePartner = async (id: string) => {
    if (!confirm("Are you sure you want to delete this partner?")) return;
    const updated = partnersList.filter((p) => p.id !== id);
    setPartnersList(updated);
    const res = await savePartners(updated, user?.id);
    if (res.success) {
      toast.success("Partner removed and database updated!");
      logActivity("partner_deleted", "partner", id);
    } else {
      toast.error("Failed to update database.");
    }
  };

  const togglePartnerActive = async (id: string) => {
    const updated = partnersList.map((p) =>
      p.id === id ? { ...p, active: !p.active } : p
    );
    setPartnersList(updated);
    const res = await savePartners(updated, user?.id);
    if (res.success) {
      const p = updated.find((x) => x.id === id);
      toast.success(`Partner ${p?.active ? "activated" : "hidden"} on homepage!`);
      logActivity("partner_status_toggle", "partner", id, { active: p?.active });
    }
  };

  const resetPartnerForm = () => {
    setPartnerForm(emptyPartnerForm);
    setEditingPartnerId(null);
    setShowPartnerForm(false);
  };

  const handleResetDefaultPartners = async () => {
    if (!confirm("Reset partners to initial default organizations (IID, The Earth Society, Youth For CARE)?")) return;
    setPartnersList(DEFAULT_PARTNERS);
    const res = await savePartners(DEFAULT_PARTNERS, user?.id);
    if (res.success) {
      toast.success("Partners reset to verified defaults!");
    }
  };

  if (loading || !canAccess) return null;

  const tabsList: { key: TabType; label: string; icon: typeof Users }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "roles", label: "Staff & Roles", icon: Shield },
    { key: "logs", label: "Audit & Staff Logs", icon: Clock },
    { key: "applications", label: "Applications", icon: FileText },
    { key: "members", label: "Members", icon: Users },
    { key: "payments", label: "Payments", icon: Eye },
    { key: "team", label: "Team", icon: UserCog },
    { key: "projects", label: "Projects", icon: FolderOpen },
    { key: "events", label: "Events", icon: Calendar },
    { key: "participants", label: "Participants", icon: UserCheck },
    { key: "alumni", label: "Alumni", icon: GraduationCap },
    { key: "research", label: "Research", icon: FlaskConical },
    { key: "courses", label: "Courses", icon: BookOpen },
    { key: "photos", label: "Photos", icon: Image },
    { key: "blog", label: "Blog", icon: BookOpen },
    { key: "hero", label: "Hero Slides", icon: Image },
    { key: "banner", label: "Hero Banner & CTA", icon: Sparkles },
    { key: "partners", label: "Partners & Collaborators", icon: Handshake },
    { key: "announcements", label: "Announcements", icon: Megaphone },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "reports", label: "Reports", icon: BarChart3 },
  ];

  const inputClass = "w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-border/40">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Shield size={13} /> Administrator Control Center
                </span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Manage club operations, payments, roles & website configuration
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                to="/moderator"
                className="px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/35 hover:bg-[#2de2c9]/25 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(45,226,201,0.2)]"
              >
                <Shield size={14} /> Open Moderator Workspace
              </Link>
            </div>
          </div>

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

          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
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

          {/* ════════ Staff & Roles Management Tab ════════ */}
          {tab === "roles" && (
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Top Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl glass border border-purple-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-medium">Administrators</span>
                    <Shield size={16} className="text-purple-400" />
                  </div>
                  <p className="font-display text-2xl font-bold text-purple-300">
                    {memberRoles.filter((r: any) => r.role === "admin").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Full System Access</p>
                </div>

                <div className="p-4 rounded-xl glass border border-[#2de2c9]/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-medium">Moderators</span>
                    <Shield size={16} className="text-[#2de2c9]" />
                  </div>
                  <p className="font-display text-2xl font-bold text-[#2de2c9]">
                    {memberRoles.filter((r: any) => r.role === "moderator").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Operational Management</p>
                </div>

                <div className="p-4 rounded-xl glass border border-border/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-medium">Total Staff</span>
                    <UserCog size={16} className="text-primary" />
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {memberRoles.filter((r: any) => r.role === "admin" || r.role === "moderator").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Active Club Officers</p>
                </div>

                <div className="p-4 rounded-xl glass border border-border/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-medium">Registered Accounts</span>
                    <Users size={16} className="text-muted-foreground" />
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {members.length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Eligible for Role</p>
                </div>
              </div>

              {/* Instructions Guide & Bootstrap Helper */}
              <div className="p-6 rounded-xl glass border border-border/80 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/25 shrink-0 mt-0.5">
                      <Info size={20} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        How to Add Admin & Moderator
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Follow these simple steps to provision new Club Administrators or Executive Moderators.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSqlGuide(!showSqlGuide)}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-primary hover:bg-secondary/80 border border-border/60 transition-colors shrink-0"
                  >
                    {showSqlGuide ? "Hide SQL Bootstrap" : "Initial Supabase SQL"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/50 space-y-2">
                    <p className="font-bold text-primary flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px]">1</span>
                      Standard In-App Assignment (Recommended)
                    </p>
                    <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-[11px]">
                      <li>Ask the person to sign up at <strong className="text-foreground">ruetiotclub.org/auth</strong>.</li>
                      <li>In the form below, select their name or enter their registered email.</li>
                      <li>Choose role <strong className="text-purple-300">Admin</strong> or <strong className="text-[#2de2c9]">Moderator</strong>.</li>
                      <li>Click &quot;Assign Staff Role&quot;. When they sign in, they will automatically be routed to their staff workspace!</li>
                    </ol>
                  </div>

                  <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/50 space-y-2">
                    <p className="font-bold text-[#2de2c9] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#2de2c9]/20 text-[#2de2c9] flex items-center justify-center text-[11px]">2</span>
                      Permissions Comparison
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-[11px]">
                      <li>
                        <strong className="text-purple-300">Admin:</strong> Complete authority. Approves bKash fees, manages roles, partner resets, and financial reports.
                      </li>
                      <li>
                        <strong className="text-[#2de2c9]">Moderator:</strong> Operational authority. Publishes events, approves attendees, adds projects, writes blogs, posts notices, and replies to messages. Core financials & roles remain protected.
                      </li>
                    </ul>
                  </div>
                </div>

                {showSqlGuide && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-5 rounded-xl bg-black/80 border border-primary/40 space-y-4 text-xs font-mono"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-muted-foreground pb-2 border-b border-border/60">
                      <div>
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5 font-sans">
                          <AlertCircle size={15} /> Database Migration Required for Email Invitations
                        </span>
                        <p className="text-[11px] font-sans text-muted-foreground mt-0.5">
                          Run this SQL once in your Supabase SQL Editor to create the <code className="text-primary font-mono">staff_invitations</code> table, RLS policies, and RPC.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href="https://supabase.com/dashboard/project/kinczqtjiuxvdogcqexp/sql/new"
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40 text-xs font-semibold flex items-center gap-1 font-sans transition-colors"
                        >
                          <ExternalLink size={12} /> Open Supabase SQL Editor
                        </a>

                        <button
                          onClick={() => {
                            const sql = `-- 1. Create Helper Function to Check Staff Status
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'moderator')
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO anon, authenticated;

-- 2. Create staff_invitations Table
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'moderator',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.staff_invitations;
CREATE POLICY "Admins can manage invitations"
  ON public.staff_invitations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;
CREATE POLICY "Anyone can view invitation by token"
  ON public.staff_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

-- 3. Acceptance RPC for onboarding
CREATE OR REPLACE FUNCTION public.accept_staff_invitation(_token TEXT, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv
  FROM public.staff_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();

  IF inv IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid, expired, or already used invitation token');
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, inv.role);

  UPDATE public.staff_invitations
  SET status = 'accepted'
  WHERE id = inv.id;

  UPDATE public.profiles
  SET status = 'approved', updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'role', inv.role,
    'email', inv.email,
    'message', 'Invitation accepted! Granted ' || inv.role || ' role.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_staff_invitation(TEXT, UUID) TO anon, authenticated;

-- 4. Audit Log Enhancements
ALTER TABLE public.admin_activity_log ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.admin_activity_log ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.admin_activity_log ADD COLUMN IF NOT EXISTS user_role TEXT;

DROP POLICY IF EXISTS "Staff can insert activity log" ON public.admin_activity_log;
CREATE POLICY "Staff can insert activity log"
  ON public.admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Strictly Admins can view activity log" ON public.admin_activity_log;
CREATE POLICY "Strictly Admins can view activity log"
  ON public.admin_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';`;
                            navigator.clipboard.writeText(sql);
                            toast.success("Complete migration SQL copied! Paste into Supabase SQL Editor and click RUN.");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 font-sans shadow-sm transition-all"
                        >
                          <Copy size={13} /> Copy Complete Setup SQL
                        </button>
                      </div>
                    </div>

                    <pre className="text-primary text-[11px] overflow-x-auto p-3 bg-secondary/30 rounded-lg border border-border/50 max-h-56 leading-relaxed">
{`-- Step 1: Open Supabase Dashboard -> SQL Editor (or click the button above)
-- Step 2: Paste this complete SQL script and click RUN:

CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'moderator',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON public.staff_invitations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view invitation by token"
  ON public.staff_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

NOTIFY pgrst, 'reload schema';`}
                    </pre>
                  </motion.div>
                )}
              </div>

              {/* ── 1. PRIMARY FLOW: Email Invitation for Automated Onboarding ── */}
              <div className="p-6 rounded-2xl glass border border-primary/40 relative overflow-hidden space-y-5 bg-gradient-to-b from-primary/5 via-transparent to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/15 text-primary border border-primary/30">
                      <Mail size={18} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                        Invite Moderator or Staff via Email
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                          Automated Onboarding
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Send an official onboarding invite. The invitee opens their email, sets up their Name, Password, Roll, Dept & Session, and their Moderator account activates automatically.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSendStaffInvitation} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                        <Mail size={13} className="text-primary" /> Recipient Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. prospective.moderator@ruetiotclub.org"
                        value={staffEmailInput}
                        onChange={(e) => setStaffEmailInput(e.target.value)}
                        className={inputClass}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        They will receive an invitation link valid for 7 days.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                        <Shield size={13} className="text-primary" /> Initial Role
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStaffRoleInput("moderator")}
                          className={`px-3 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            staffRoleInput === "moderator"
                              ? "bg-[#2de2c9]/15 text-[#2de2c9] border-[#2de2c9] shadow-[0_0_12px_rgba(45,226,201,0.25)]"
                              : "bg-secondary/40 text-muted-foreground border-border/70 hover:bg-secondary/70"
                          }`}
                        >
                          <Shield size={13} /> Moderator
                        </button>

                        <button
                          type="button"
                          onClick={() => setStaffRoleInput("admin")}
                          className={`px-3 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            staffRoleInput === "admin"
                              ? "bg-purple-500/15 text-purple-300 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                              : "bg-secondary/40 text-muted-foreground border-border/70 hover:bg-secondary/70"
                          }`}
                        >
                          <Shield size={13} /> Admin
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        You can promote moderators to Admin anytime later.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles size={13} className="text-primary shrink-0" />
                      <span>Generates secure token &amp; sends direct email notification</span>
                    </div>

                    <button
                      type="submit"
                      disabled={assigningStaffRole || !staffEmailInput.trim()}
                      className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all glow-border disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send size={15} />
                      {assigningStaffRole ? "Dispatching Invitation..." : `Send ${staffRoleInput === "admin" ? "Admin" : "Moderator"} Invitation`}
                    </button>
                  </div>
                </form>

                {/* Last Generated Invite Status Banner */}
                {lastGeneratedInviteLink && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 mt-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 size={16} />
                        <span>Invitation Email Dispatched ({lastGeneratedInviteRole === "admin" ? "Admin" : "Moderator"})</span>
                      </div>
                      <button
                        onClick={() => setLastGeneratedInviteLink(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      An official invitation email has been sent to <strong className="text-foreground">{lastGeneratedInviteEmail}</strong>. When they open the email and click the setup link, they can enter their Name, Password, Department, and Roll to activate their {lastGeneratedInviteRole === "admin" ? "Administrator" : "Moderator"} account.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        readOnly
                        value={lastGeneratedInviteLink}
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-border text-xs font-mono text-primary select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(lastGeneratedInviteLink);
                          toast.success("Invite link copied to clipboard!");
                        }}
                        className="px-3.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0"
                      >
                        <Copy size={13} /> Copy Link
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ── 2. Pending Staff Invitations Table ── */}
              <div className="p-6 rounded-2xl glass border border-border/80 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-bold flex items-center gap-2">
                      <Clock size={17} className="text-primary" /> Pending &amp; Recent Invitations
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Invited officers who have not yet completed their onboarding setup
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-secondary text-foreground border border-border">
                    {staffInvitations.filter((i: any) => i.status === "pending").length} Pending
                  </span>
                </div>

                {staffInvitations.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                    No invitations sent yet. Send your first moderator invitation above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground font-mono">
                          <th className="py-2.5 px-3 font-medium">Invitee Email</th>
                          <th className="py-2.5 px-3 font-medium">Role</th>
                          <th className="py-2.5 px-3 font-medium">Status</th>
                          <th className="py-2.5 px-3 font-medium">Sent Date</th>
                          <th className="py-2.5 px-3 font-medium">Expires</th>
                          <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {staffInvitations.map((inv: any) => {
                          const inviteUrl = `${window.location.origin}/accept-invite?token=${inv.token}`;
                          const isExpired = new Date(inv.expires_at).getTime() < Date.now();
                          const isPending = inv.status === "pending" && !isExpired;

                          return (
                            <tr key={inv.id} className="hover:bg-secondary/30 transition-colors">
                              <td className="py-3 px-3 font-semibold text-foreground">
                                {inv.email}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                    inv.role === "admin"
                                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                      : "bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/30"
                                  }`}
                                >
                                  <Shield size={10} /> {inv.role === "admin" ? "Admin" : "Moderator"}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {inv.status === "accepted" ? (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    ✓ Accepted
                                  </span>
                                ) : isExpired ? (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                                    Expired
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    ● Awaiting Setup
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-muted-foreground">
                                {formatRelativeTime(inv.created_at)}
                              </td>
                              <td className="py-3 px-3 text-muted-foreground">
                                {new Date(inv.expires_at).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isPending && (
                                    <>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(inviteUrl);
                                          toast.success("Invite link copied to clipboard!");
                                        }}
                                        className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                        title="Copy Onboarding URL"
                                      >
                                        <Copy size={11} /> Copy
                                      </button>
                                      <a
                                        href={`mailto:${inv.email}?subject=${encodeURIComponent(`Invitation to join RUET IoT Club as ${inv.role === "admin" ? "Club Administrator" : "Club Moderator"}`)}&body=${encodeURIComponent(
                                          `Dear Colleague,\n\nHere is your official invitation link to join the RUET IoT Club team as a ${inv.role === "admin" ? "Club Administrator" : "Club Moderator"}:\n\n${inviteUrl}\n\nPlease complete your onboarding within 7 days.\n\nBest regards,\nRUET IoT Club Executive Team`
                                        )}`}
                                        className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                        title="Send via Email App"
                                      >
                                        <Mail size={11} className="text-primary" /> Email
                                      </a>
                                    </>
                                  )}

                                  <button
                                    onClick={() => revokeInvitation(inv.id, inv.email)}
                                    className="px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive text-[11px] transition-colors"
                                    title="Revoke Invitation"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── 3. Quick Direct Assignment for Registered Accounts ── */}
              <div className="p-6 rounded-2xl glass border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                      <UserCheck size={16} className="text-muted-foreground" /> Direct Assignment for Existing Registered Accounts
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fast-track an existing member who has already signed up at ruetiotclub.org
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAssignStaffRole} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <select
                        value={selectedUserIdForRole}
                        onChange={(e) => setSelectedUserIdForRole(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">-- Choose from registered members ({members.length}) --</option>
                        {members.map((m: any) => {
                          const currentR = getUserRole(m.user_id);
                          return (
                            <option key={m.user_id} value={m.user_id}>
                              {m.full_name} {m.student_id ? `(${m.student_id})` : ""} — {m.email || "No email"} [{currentR}]
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={assigningStaffRole || !selectedUserIdForRole}
                        className="w-full px-4 py-3 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} />
                        {assigningStaffRole ? "Assigning..." : `Direct Assign as ${staffRoleInput === "admin" ? "Admin" : "Moderator"}`}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* ── 4. Active Staff Directory & Promotion Controls ── */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-bold">Active Staff Directory</h3>
                    <p className="text-xs text-muted-foreground">
                      Promote moderators to full Administrators, manage roles, and review privileges
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={staffFilter}
                      onChange={(e) => setStaffFilter(e.target.value as any)}
                      className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground focus:outline-none"
                    >
                      <option value="all">All Staff ({memberRoles.filter((r: any) => r.role === "admin" || r.role === "moderator").length})</option>
                      <option value="admin">Admins Only ({memberRoles.filter((r: any) => r.role === "admin").length})</option>
                      <option value="moderator">Moderators Only ({memberRoles.filter((r: any) => r.role === "moderator").length})</option>
                    </select>

                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        placeholder="Search staff..."
                        className="pl-8 pr-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-36 sm:w-48"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {memberRoles
                    .filter((r: any) => r.role === "admin" || r.role === "moderator")
                    .filter((r: any) => (staffFilter === "all" ? true : r.role === staffFilter))
                    .map((r: any) => {
                      const profile = members.find((m: any) => m.user_id === r.user_id);
                      const name = profile?.full_name || "Account User";
                      const email = profile?.email || "—";
                      const dept = profile?.department || "—";
                      const studentId = profile?.student_id || "—";
                      const phone = profile?.phone || "—";
                      const isCurrentUser = r.user_id === user?.id;

                      const q = staffSearchQuery.toLowerCase();
                      if (q && !name.toLowerCase().includes(q) && !email.toLowerCase().includes(q) && !studentId.toLowerCase().includes(q)) {
                        return null;
                      }

                      return (
                        <div
                          key={r.id || r.user_id}
                          className="p-4 rounded-xl glass border border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">{name}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">
                                  You (Active Session)
                                </span>
                              )}
                              <span
                                className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                  r.role === "admin"
                                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                    : "bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/30"
                                }`}
                              >
                                <Shield size={11} /> {r.role === "admin" ? "Administrator" : "Moderator"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {dept} · Roll: {studentId} · ✉️ {email} · 📞 {phone}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                              <span>User ID: {r.user_id}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(r.user_id);
                                  toast.success("User ID copied");
                                }}
                                title="Copy User ID"
                                className="text-primary hover:opacity-80"
                              >
                                <Copy size={10} />
                              </button>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {r.role === "moderator" ? (
                              <button
                                onClick={() => promoteModeratorToAdmin(r.user_id, name, email)}
                                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-purple-600/30 text-purple-200 border border-purple-500/40 hover:from-purple-500/30 hover:to-purple-600/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                                title="Promote this Moderator to full Administrator"
                              >
                                <Shield size={12} className="text-purple-300" /> ★ Promote to Admin
                              </button>
                            ) : (
                              !isCurrentUser && (
                                <button
                                  onClick={() => assignRole(r.user_id, "moderator")}
                                  className="px-3 py-1.5 rounded-lg bg-[#2de2c9]/10 text-[#2de2c9] border border-[#2de2c9]/25 hover:bg-[#2de2c9]/20 text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <Shield size={12} /> Switch to Moderator
                                </button>
                              )
                            )}

                            {!isCurrentUser && (
                              <button
                                onClick={() => {
                                  if (confirm(`Revoke staff privileges from ${name}? They will become a standard member.`)) {
                                    assignRole(r.user_id, "member");
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/25 hover:bg-destructive/20 text-xs font-semibold transition-colors"
                              >
                                Revoke Role
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {memberRoles.filter((r: any) => r.role === "admin" || r.role === "moderator").length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground glass rounded-xl border border-border/60">
                      No staff members assigned yet. Use the invitation form above to add your first moderator or admin!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════ System Audit & Staff Activity Logs Tab (Admin Only) ════════ */}
          {tab === "logs" && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header with Badges & Export */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <Shield size={11} /> Admin Confidential
                    </span>
                    <span className="text-xs text-muted-foreground">Strictly visible to Administrators</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                    <Clock size={20} className="text-primary" /> System Audit &amp; Staff Activity Log
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time chronicle of all additions, updates, approvals and management actions performed by Admins and Moderators.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      fetchData();
                      toast.success("Activity logs refreshed");
                    }}
                    className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold text-foreground hover:bg-secondary/80 border border-border flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>

                  <button
                    onClick={() => {
                      const rows = auditLogs.map((l: any) => ({
                        "Date & Time": new Date(l.created_at).toLocaleString(),
                        "Staff Name": l.user_name || "Club Staff",
                        "Staff Email": l.user_email || "—",
                        "Staff Role": l.user_role || "admin",
                        "Action": l.action,
                        "Entity Type": l.entity_type || "—",
                        "Entity ID": l.entity_id || "—",
                        "Details": JSON.stringify(l.details || {}),
                      }));
                      downloadCSV(rows, `ruet-iot-club-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
                      toast.success("Audit logs exported to CSV");
                    }}
                    className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download size={13} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl glass border border-border/70">
                  <span className="text-xs text-muted-foreground font-medium">Total Logged Actions</span>
                  <p className="font-display text-2xl font-bold text-foreground mt-1">
                    {auditLogs.length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Historical records</p>
                </div>

                <div className="p-4 rounded-xl glass border border-[#2de2c9]/30">
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 text-[#2de2c9]">
                    <Shield size={12} /> Moderator Actions
                  </span>
                  <p className="font-display text-2xl font-bold text-[#2de2c9] mt-1">
                    {auditLogs.filter((l: any) => (l.user_role || l.details?.user_role) === "moderator").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Events, blogs, notices, photos</p>
                </div>

                <div className="p-4 rounded-xl glass border border-purple-500/30">
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 text-purple-300">
                    <Shield size={12} /> Administrator Actions
                  </span>
                  <p className="font-display text-2xl font-bold text-purple-300 mt-1">
                    {auditLogs.filter((l: any) => (l.user_role || l.details?.user_role || "admin") === "admin").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Financials, roles &amp; master changes</p>
                </div>

                <div className="p-4 rounded-xl glass border border-border/70">
                  <span className="text-xs text-muted-foreground font-medium">Logged Today</span>
                  <p className="font-display text-2xl font-bold text-foreground mt-1">
                    {auditLogs.filter((l: any) => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Today&apos;s activity pulse</p>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="p-4 rounded-xl glass border border-border/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Filter size={13} />
                    <span>Role:</span>
                  </div>
                  <div className="flex rounded-lg bg-secondary p-0.5 border border-border">
                    <button
                      onClick={() => setLogStaffFilter("all")}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        logStaffFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({auditLogs.length})
                    </button>
                    <button
                      onClick={() => setLogStaffFilter("moderator")}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        logStaffFilter === "moderator" ? "bg-[#2de2c9] text-black" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Moderators ({auditLogs.filter((l: any) => (l.user_role || l.details?.user_role) === "moderator").length})
                    </button>
                    <button
                      onClick={() => setLogStaffFilter("admin")}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        logStaffFilter === "admin" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Admins ({auditLogs.filter((l: any) => (l.user_role || l.details?.user_role || "admin") === "admin").length})
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
                    <span>Category:</span>
                  </div>
                  <select
                    value={logActionFilter}
                    onChange={(e) => setLogActionFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground focus:outline-none"
                  >
                    <option value="all">All Action Categories</option>
                    <option value="events">Events &amp; Registrations</option>
                    <option value="projects">Projects &amp; Prototypes</option>
                    <option value="announcements">Notices &amp; Announcements</option>
                    <option value="photos">Gallery &amp; Photos</option>
                    <option value="blogs">Blog Articles</option>
                    <option value="roles">Staff Roles &amp; Invitations</option>
                    <option value="payments">Financials &amp; Payments</option>
                    <option value="messages">Contact Messages</option>
                  </select>
                </div>

                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Search logs by staff name, email, action..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full sm:w-64"
                  />
                </div>
              </div>

              {/* Feed of Log Entries */}
              <div className="space-y-3">
                {auditLogs
                  .filter((log: any) => {
                    const lRole = log.user_role || log.details?.user_role || "admin";
                    if (logStaffFilter === "admin" && lRole !== "admin") return false;
                    if (logStaffFilter === "moderator" && lRole !== "moderator") return false;

                    if (logActionFilter !== "all") {
                      const act = (log.action || "").toLowerCase();
                      const ent = (log.entity_type || "").toLowerCase();
                      if (logActionFilter === "events" && !act.includes("event") && !ent.includes("event")) return false;
                      if (logActionFilter === "projects" && !act.includes("project") && !ent.includes("project")) return false;
                      if (logActionFilter === "announcements" && !act.includes("announcement") && !ent.includes("announcement") && !act.includes("notice")) return false;
                      if (logActionFilter === "photos" && !act.includes("photo") && !ent.includes("photo")) return false;
                      if (logActionFilter === "blogs" && !act.includes("blog") && !ent.includes("blog")) return false;
                      if (logActionFilter === "roles" && !act.includes("role") && !act.includes("staff") && !act.includes("invite") && !act.includes("promote") && !ent.includes("role") && !ent.includes("invitation")) return false;
                      if (logActionFilter === "payments" && !act.includes("payment") && !ent.includes("payment")) return false;
                      if (logActionFilter === "messages" && !act.includes("message") && !act.includes("reply") && !ent.includes("message")) return false;
                    }

                    if (logSearchQuery.trim()) {
                      const q = logSearchQuery.toLowerCase();
                      const lName = (log.user_name || log.details?.user_name || "").toLowerCase();
                      const lEmail = (log.user_email || log.details?.user_email || "").toLowerCase();
                      const nameMatch = lName.includes(q);
                      const emailMatch = lEmail.includes(q);
                      const actMatch = (log.action || "").toLowerCase().includes(q);
                      const entMatch = (log.entity_type || "").toLowerCase().includes(q);
                      const detMatch = JSON.stringify(log.details || {}).toLowerCase().includes(q);
                      if (!nameMatch && !emailMatch && !actMatch && !entMatch && !detMatch) return false;
                    }

                    return true;
                  })
                  .map((log: any) => {
                    const effectiveRole = log.user_role || log.details?.user_role || "admin";
                    const effectiveName = log.user_name || log.details?.user_name || "Club Staff";
                    const effectiveEmail = log.user_email || log.details?.user_email || "";
                    const isModeratorRole = effectiveRole === "moderator";
                    const actionStr = (log.action || "").toLowerCase();
                    const badgeColor =
                      actionStr.includes("delete") || actionStr.includes("revoke") || actionStr.includes("reject")
                        ? "bg-red-500/15 text-red-300 border-red-500/30"
                        : actionStr.includes("promote") || actionStr.includes("admin") || actionStr.includes("role")
                        ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        : actionStr.includes("invite") || actionStr.includes("onboard")
                        ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                        : actionStr.includes("create") || actionStr.includes("add") || actionStr.includes("publish")
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-primary/15 text-primary border-primary/30";

                    return (
                      <div
                        key={log.id}
                        className="p-4 rounded-xl glass border border-border/70 hover:border-border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                isModeratorRole
                                  ? "bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/30"
                                  : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              <Shield size={10} />
                              {isModeratorRole ? "Moderator" : "Admin"}
                            </span>

                            <span className="font-semibold text-foreground">
                              {effectiveName}
                            </span>

                            {effectiveEmail && (
                              <span className="text-muted-foreground text-[11px]">
                                ({effectiveEmail})
                              </span>
                            )}

                            <span className="text-muted-foreground">→</span>

                            <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-medium border ${badgeColor}`}>
                              {log.action.replace(/_/g, " ")}
                            </span>

                            {log.entity_type && (
                              <span className="text-muted-foreground font-mono text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded">
                                {log.entity_type}
                              </span>
                            )}
                          </div>

                          {/* Details preview */}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <p className="text-[11px] text-muted-foreground font-mono bg-secondary/40 p-2 rounded border border-border/40 overflow-x-auto">
                              {JSON.stringify(log.details)}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-foreground font-mono text-[11px]">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(log.created_at)} · {new Date(log.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                {auditLogs.length === 0 && (
                  <div className="py-16 text-center text-sm text-muted-foreground glass rounded-xl border border-border/60 space-y-2">
                    <Clock size={32} className="mx-auto text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">No Audit Logs Recorded Yet</p>
                    <p className="text-xs">
                      Actions taken by Admins and Moderators across events, notices, projects, blogs, and staff changes will automatically stream here.
                    </p>
                  </div>
                )}
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
                            <InfoRow label="Series" value={m.batch || m.session} />
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
                        <label className="text-xs text-muted-foreground mb-1 block">Series</label>
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
                    const paidRegs = courseRegistrations.filter(r => r.payment_method || r.transaction_id || r.payment_status === "unpaid");
                    const confirmed = paidRegs.filter(r => r.payment_status === "confirmed").length;
                    const pending = paidRegs.filter(r => r.payment_status === "pending" || r.payment_status === "unpaid").length;
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
                          <p className="text-xs text-muted-foreground mt-1">Pending / Unpaid</p>
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
                              {(r.transaction_id || r.payment_method) && (
                                <div className="flex items-center gap-3 mt-1.5">
                                  {r.transaction_id && <span className="text-xs font-mono text-muted-foreground">TXN: {r.transaction_id}</span>}
                                  {r.payment_method && <span className="text-xs text-muted-foreground capitalize">Method: {r.payment_method}</span>}
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">{new Date(r.registered_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                              r.payment_status === "confirmed" ? "bg-green-500/10 text-green-400" :
                              r.payment_status === "rejected" ? "bg-destructive/10 text-destructive" :
                              r.payment_status === "unpaid" ? "bg-amber-500/10 text-amber-400" :
                              "bg-yellow-500/10 text-yellow-400"
                            }`}>{r.payment_status}</span>
                            <div className="flex gap-1 shrink-0">
                              {r.payment_status === "pending" || r.payment_status === "unpaid" ? (
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
            <div className="max-w-5xl mx-auto space-y-6">
              {/* ─── Header & Top Actions ─── */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
                <div>
                  <h3 className="font-display text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                    <Shield size={20} className="text-[#2de2c9]" />
                    Panel & Committee Governance
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create separate terms, configure specific roles, build in Draft mode, and publish as the active Current Board.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setPanelModalForm({
                        title: "4th Executive Board (2026-2027)",
                        boardType: "executive",
                        sessionYears: "2026-2027",
                        ordinal: 4,
                        allowedRoles: [...DEFAULT_EXECUTIVE_ROLES],
                        description: "",
                      });
                      setShowPanelModal(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#2de2c9]/20 to-[#14b8a6]/20 border border-[#2de2c9]/50 text-[#2de2c9] text-xs font-semibold hover:bg-[#2de2c9]/30 transition-all flex items-center gap-1.5 shadow-[0_0_14px_rgba(45,226,201,0.2)]"
                  >
                    <Plus size={15} /> Create New Panel
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (showTeamForm) {
                        resetTeamForm();
                      } else {
                        setTeamForm({
                          ...emptyTeamForm,
                          category: activePanel?.title || "3rd Executive (2025-2026)",
                          position: activePanel?.allowedRoles?.[0] || "Executive Member",
                        });
                        setShowTeamForm(true);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={15} /> {showTeamForm ? "Cancel Form" : `Add Member to ${activePanel?.title ? `"${activePanel.title.slice(0, 18)}..."` : "Panel"}`}
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncOfficial2026Panel}
                    disabled={syncing2026Panel}
                    className="px-3 py-2 rounded-lg bg-secondary/80 border border-border text-muted-foreground hover:text-foreground text-xs font-mono transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Sync official 46 members from 2026 Executive Panel document"
                  >
                    <Sparkles size={13} className={syncing2026Panel ? "animate-spin text-[#2de2c9]" : ""} />
                    {syncing2026Panel ? "Syncing..." : "Sync 2026"}
                  </button>
                </div>
              </div>

              {/* ─── Panel Selector Bar ─── */}
              <div className="bg-card/70 p-4 rounded-2xl border border-border/50 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserCog size={14} className="text-[#2de2c9]" /> Select Panel to Manage:
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Total Panels: <strong>{panels.length}</strong> (Drafts hidden from public)
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-border">
                  {panels.map((p) => {
                    const isSelected = p.id === activePanelId;
                    const memberCount = teamMembers.filter(
                      (m: any) =>
                        (m.category || "").trim() === p.title.trim() ||
                        (m.category || "").trim() === p.id
                    ).length;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setActivePanelId(p.id);
                          setTeamForm((prev) => ({ ...prev, category: p.title }));
                        }}
                        className={`group px-3.5 py-2.5 rounded-xl border text-left transition-all shrink-0 flex items-center gap-2.5 ${
                          isSelected
                            ? "bg-[#2de2c9]/10 border-[#2de2c9] text-foreground shadow-[0_0_16px_rgba(45,226,201,0.25)] ring-1 ring-[#2de2c9]/50"
                            : "bg-secondary/40 border-border/60 hover:border-border hover:bg-secondary/70 text-muted-foreground"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                              {p.title}
                            </span>
                            {p.isCurrent ? (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase animate-pulse">
                                LIVE CURRENT
                              </span>
                            ) : p.status === "draft" ? (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                                DRAFT (HIDDEN)
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/40 font-mono">
                                ARCHIVED
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {p.boardType === "executive" ? "Executive" : "Advisory"} · {p.sessionYears} · {memberCount} {memberCount === 1 ? "member" : "members"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Active Panel Control Banner ─── */}
              {activePanel && (
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    activePanel.status === "draft"
                      ? "bg-gradient-to-br from-amber-500/10 via-card to-background border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]"
                      : activePanel.isCurrent
                      ? "bg-gradient-to-br from-[#2de2c9]/10 via-card to-background border-[#2de2c9]/40 shadow-[0_0_20px_rgba(45,226,201,0.12)]"
                      : "bg-card border-border/60"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-secondary text-primary border border-primary/30">
                          {activePanel.boardType === "executive" ? "Executive Committee" : "Advisory Board"}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          Ordinal: #{activePanel.ordinal} ({activePanel.sessionYears})
                        </span>

                        {activePanel.isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                            <CheckCircle2 size={12} /> Active Current Board
                          </span>
                        ) : activePanel.status === "draft" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50">
                            <AlertCircle size={12} /> Draft Mode (Hidden From Public /team)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                            Archived Past Term
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg md:text-xl font-display font-bold text-foreground">
                        {activePanel.title}
                      </h2>

                      <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                        {activePanel.status === "draft" ? (
                          <span className="text-amber-300/90 font-medium">
                            ⚠️ This panel is currently saved as a <strong>DRAFT</strong>. Public visitors on the website (/team) cannot see this panel or its members. Configure roles and add members below. When everything is set, click <strong>"Publish as Current Panel"</strong> to make it live.
                          </span>
                        ) : activePanel.isCurrent ? (
                          <span className="text-[#2de2c9]">
                            🌟 This is the active <strong>Current Board</strong> shown by default on the public /team page.
                          </span>
                        ) : (
                          <span>
                            📁 This panel is archived. Visitors can view it by selecting it in the session dropdown on the /team page.
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {activePanel.status === "draft" ? (
                        <button
                          type="button"
                          onClick={handlePublishActivePanel}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs md:text-sm hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center gap-2 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                        >
                          <CheckCircle2 size={16} /> Publish as Current Panel
                        </button>
                      ) : !activePanel.isCurrent ? (
                        <button
                          type="button"
                          onClick={handlePublishActivePanel}
                          className="px-3.5 py-2 rounded-xl bg-[#2de2c9]/15 border border-[#2de2c9]/40 text-[#2de2c9] font-semibold text-xs hover:bg-[#2de2c9]/25 transition-all flex items-center gap-1.5"
                        >
                          <Sparkles size={14} /> Make Current Panel
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setShowRoleModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Configure roles/designations for this panel"
                      >
                        <UserCog size={14} className="text-[#2de2c9]" /> Configure Roles ({activePanel.allowedRoles?.length || 0})
                      </button>

                      <a
                        href={`/team?session=${encodeURIComponent(activePanel.title)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground text-xs font-mono transition-colors flex items-center gap-1"
                        title="Preview this panel on public /team page"
                      >
                        <ExternalLink size={13} /> Preview
                      </a>

                      {!activePanel.isCurrent && (
                        <button
                          type="button"
                          onClick={handleDeleteActivePanel}
                          className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors"
                          title="Delete this panel"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Panel Configured Roles Quick Bar */}
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider shrink-0">
                      Roles Dropdown Options:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(activePanel.allowedRoles || []).slice(0, 8).map((role) => (
                        <span
                          key={role}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary/80 border border-border/60 text-foreground/90"
                        >
                          {role}
                        </span>
                      ))}
                      {(activePanel.allowedRoles || []).length > 8 && (
                        <button
                          type="button"
                          onClick={() => setShowRoleModal(true)}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#2de2c9]/10 text-[#2de2c9] border border-[#2de2c9]/30 hover:bg-[#2de2c9]/20 transition-colors"
                        >
                          +{(activePanel.allowedRoles || []).length - 8} more roles...
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowRoleModal(true)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors flex items-center gap-1"
                      >
                        <Plus size={11} /> Add Role
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Add / Edit Member Form ─── */}
              {showTeamForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleTeamSubmit}
                  className="p-6 rounded-2xl glass border border-primary/30 shadow-[0_0_24px_rgba(45,226,201,0.12)] space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-sm md:text-base font-bold tracking-wider text-primary flex items-center gap-2">
                      <UserCog size={16} />
                      {editingTeamId ? "Edit Team Member" : `Add Member to ${activePanel?.title || "Panel"}`}
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground">
                      Target Panel: <strong>{teamForm.category || activePanel?.title}</strong>
                    </span>
                  </div>

                  <ImageUpload
                    folder="team"
                    currentUrl={teamForm.image_url}
                    onUpload={(url) => setTeamForm({ ...teamForm, image_url: url })}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <input
                      placeholder="Full Name *"
                      required
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      className={inputClass}
                    />

                    {/* Target Panel Dropdown */}
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                        Select Panel / Term *:
                      </label>
                      <select
                        value={teamForm.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTeamForm({ ...teamForm, category: val });
                          const matched = panels.find((p) => p.title === val || p.id === val);
                          if (matched) {
                            setActivePanelId(matched.id);
                            if (matched.allowedRoles && matched.allowedRoles.length > 0) {
                              setTeamForm((prev) => ({
                                ...prev,
                                category: val,
                                position: matched.allowedRoles[0],
                              }));
                            }
                          }
                        }}
                        className={inputClass}
                      >
                        {panels.map((p) => (
                          <option key={p.id} value={p.title}>
                            {p.title} {p.status === "draft" ? "(DRAFT)" : p.isCurrent ? "(CURRENT)" : "(ARCHIVED)"}
                          </option>
                        ))}
                        <option value="Custom...">Custom Term...</option>
                      </select>
                      {teamForm.category === "Custom..." && (
                        <input
                          placeholder="Enter custom term (e.g. 5th Executive (2027-2028)) *"
                          required
                          value={teamForm.custom_category || ""}
                          onChange={(e) => setTeamForm({ ...teamForm, custom_category: e.target.value })}
                          className={inputClass + " mt-2"}
                        />
                      )}
                    </div>

                    {/* Position / Role Dropdown from Active Panel */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-mono text-muted-foreground">
                          Position / Role (from Panel Roles) *:
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowRoleModal(true)}
                          className="text-[10px] font-mono text-[#2de2c9] hover:underline flex items-center gap-1"
                        >
                          <Plus size={10} /> Add new role to panel
                        </button>
                      </div>

                      <select
                        value={
                          (activePanel?.allowedRoles || []).includes(teamForm.position)
                            ? teamForm.position
                            : teamForm.position ? "__custom__" : (activePanel?.allowedRoles?.[0] || "")
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__custom__") {
                            setTeamForm({ ...teamForm, position: "" });
                          } else {
                            setTeamForm({ ...teamForm, position: val });
                          }
                        }}
                        className={inputClass}
                      >
                        {(activePanel?.allowedRoles || DEFAULT_EXECUTIVE_ROLES).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                        <option value="__custom__">+ Enter Custom Role...</option>
                      </select>

                      {(!activePanel?.allowedRoles?.includes(teamForm.position) || teamForm.position === "") && (
                        <input
                          placeholder="Type custom designation (e.g., Lead Developer, Mentor) *"
                          required
                          value={teamForm.position}
                          onChange={(e) => setTeamForm({ ...teamForm, position: e.target.value })}
                          className={inputClass + " mt-2"}
                        />
                      )}

                      {teamForm.position && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-[#2de2c9]">
                          <Sparkles size={12} />
                          <span>
                            Tier: <strong>{EXECUTIVE_TIERS[getExecutiveTier(teamForm.position)].title}</strong> (#{EXECUTIVE_TIERS[getExecutiveTier(teamForm.position)].rank})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                        Department:
                      </label>
                      <input
                        placeholder="e.g. EEE, CSE, ECE, ME"
                        value={teamForm.department}
                        onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    {/* Series / Batch */}
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                        Series / Batch:
                      </label>
                      <input
                        placeholder="e.g. 20, 21, 22"
                        value={teamForm.batch}
                        onChange={(e) => setTeamForm({ ...teamForm, batch: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                        Sort Order (Lower numbers appear first):
                      </label>
                      <input
                        placeholder="Sort Order (0 = first in tier)"
                        type="number"
                        value={teamForm.sort_order}
                        onChange={(e) => setTeamForm({ ...teamForm, sort_order: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    {/* Email */}
                    <input
                      placeholder="Email Address"
                      type="email"
                      value={teamForm.email}
                      onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                      className={inputClass}
                    />

                    {/* LinkedIn */}
                    <input
                      placeholder="LinkedIn Profile URL"
                      value={teamForm.linkedin}
                      onChange={(e) => setTeamForm({ ...teamForm, linkedin: e.target.value })}
                      className={inputClass}
                    />

                    {/* GitHub */}
                    <input
                      placeholder="GitHub Profile URL"
                      value={teamForm.github}
                      onChange={(e) => setTeamForm({ ...teamForm, github: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <textarea
                    placeholder="Short Bio / Description (optional)"
                    rows={2}
                    value={teamForm.bio}
                    onChange={(e) => setTeamForm({ ...teamForm, bio: e.target.value })}
                    className={inputClass + " resize-none"}
                  />

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-md"
                    >
                      {editingTeamId ? "Update Member" : "Save Member to Panel"}
                    </button>
                    <button
                      type="button"
                      onClick={resetTeamForm}
                      className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}

              {/* ─── Members List Section ─── */}
              <div className="space-y-4">
                {/* Filter and Switcher Controls */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card/60 p-3.5 rounded-xl border border-border/40">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">View Filter:</span>
                      <select
                        value={teamAdminFilter}
                        onChange={(e) => setTeamAdminFilter(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="active_panel">
                          Active Panel Only: {activePanel?.title} ({
                            teamMembers.filter(
                              (t: any) =>
                                (t.category || "").trim() === (activePanel?.title || "").trim() ||
                                (activePanel?.id && (t.category || "").trim() === activePanel.id)
                            ).length
                          })
                        </option>
                        <option value="all">All Panels Combined ({teamMembers.length})</option>
                        {panels.map((p) => (
                          <option key={p.id} value={p.title}>
                            {p.title} ({teamMembers.filter((t: any) => (t.category || "").trim() === p.title.trim()).length})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">Tier:</span>
                      <select
                        value={teamTierFilter}
                        onChange={(e) => setTeamTierFilter(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="all">All Leadership Tiers</option>
                        <option value="president">Tier 1: President</option>
                        <option value="vice_president">Tier 2: Vice Presidents</option>
                        <option value="general_secretary">Tier 3: General Secretary</option>
                        <option value="assistant_general_secretary">Tier 4: AGS</option>
                        <option value="secretary">Tier 5: Secretaries</option>
                        <option value="assistant_secretary">Tier 6: Assistant Secretaries</option>
                        <option value="executive_member">Tier 7: Executive Members</option>
                        <option value="other">Tier 8: Other / Advisors</option>
                      </select>
                    </div>
                  </div>

                  <span className="text-xs text-muted-foreground font-mono">
                    Showing {
                      teamMembers
                        .filter((t: any) => {
                          if (teamAdminFilter === "active_panel") {
                            return (
                              (t.category || "").trim() === (activePanel?.title || "").trim() ||
                              (activePanel?.id && (t.category || "").trim() === activePanel.id)
                            );
                          }
                          if (teamAdminFilter === "all") return true;
                          return (t.category || "").trim() === teamAdminFilter.trim();
                        })
                        .filter((t: any) => teamTierFilter === "all" || getExecutiveTier(t.position) === teamTierFilter)
                        .length
                    } members
                  </span>
                </div>

                {/* Member Cards */}
                {(() => {
                  const filteredMembers = teamMembers
                    .filter((t: any) => {
                      if (teamAdminFilter === "active_panel") {
                        return (
                          (t.category || "").trim() === (activePanel?.title || "").trim() ||
                          (activePanel?.id && (t.category || "").trim() === activePanel.id)
                        );
                      }
                      if (teamAdminFilter === "all") return true;
                      return (t.category || "").trim() === teamAdminFilter.trim();
                    })
                    .filter((t: any) => teamTierFilter === "all" || getExecutiveTier(t.position) === teamTierFilter)
                    .sort((a: any, b: any) => {
                      const tierA = EXECUTIVE_TIERS[getExecutiveTier(a.position)].rank;
                      const tierB = EXECUTIVE_TIERS[getExecutiveTier(b.position)].rank;
                      if (tierA !== tierB) return tierA - tierB;
                      return (a.sort_order ?? 999) - (b.sort_order ?? 999);
                    });

                  if (filteredMembers.length === 0) {
                    return (
                      <div className="p-10 rounded-2xl glass border border-dashed border-border/80 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-secondary mx-auto flex items-center justify-center text-muted-foreground">
                          <Users size={20} />
                        </div>
                        <h4 className="font-semibold text-sm text-foreground">
                          No members in {teamAdminFilter === "active_panel" ? `"${activePanel?.title}"` : "this view"} yet
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          Click "Add Member" above to start populating this panel with members using the configured dropdown roles.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setTeamForm({
                              ...emptyTeamForm,
                              category: activePanel?.title || "3rd Executive (2025-2026)",
                              position: activePanel?.allowedRoles?.[0] || "Executive Member",
                            });
                            setShowTeamForm(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Plus size={14} /> Add First Member
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredMembers.map((t: any) => {
                        const tierId = getExecutiveTier(t.position);
                        const tier = EXECUTIVE_TIERS[tierId];
                        return (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-4 rounded-xl glass border border-border/40 hover:border-[#2de2c9]/40 flex items-center justify-between gap-4 transition-all"
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              {t.image_url ? (
                                <img
                                  src={t.image_url}
                                  alt={t.name}
                                  className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-border"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 ring-1 ring-border">
                                  <span className="font-display text-xs font-bold text-primary">
                                    {t.name
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm text-foreground">{t.name}</h4>
                                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${tier.badgeClass}`}>
                                    TIER {tier.rank}: {tier.shortTitle}
                                  </span>
                                  {typeof t.sort_order === "number" && (
                                    <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                      Order #{t.sort_order}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  <span className="text-foreground/90 font-medium">{t.position}</span> ·{" "}
                                  <span className="text-primary font-mono">{t.category || "Executive Board"}</span> ·{" "}
                                  {t.department || "—"}
                                  {t.batch ? ` (Series ${t.batch})` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => editTeam(t)}
                                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                title="Edit Member"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => deleteTeam(t.id)}
                                className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                title="Delete Member"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* ════════ Modal 1: Create New Panel Modal ════════ */}
              <AnimatePresence>
                {showPanelModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="w-full max-w-xl bg-card border border-[#2de2c9]/40 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <div>
                          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Sparkles size={18} className="text-[#2de2c9]" />
                            Create New Panel / Committee
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Set up a distinct new term. It will be created in <strong>Draft mode</strong> so you can safely add members before publishing.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowPanelModal(false)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleCreateNewPanel} className="space-y-4">
                        {/* Board Type Selection */}
                        <div>
                          <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                            1. Select Board Category *:
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const nextOrd = panelModalForm.ordinal || 4;
                                const suffix = nextOrd === 1 ? "1st" : nextOrd === 2 ? "2nd" : nextOrd === 3 ? "3rd" : `${nextOrd}th`;
                                setPanelModalForm({
                                  ...panelModalForm,
                                  boardType: "executive",
                                  title: `${suffix} Executive Board (${panelModalForm.sessionYears})`,
                                  allowedRoles: [...DEFAULT_EXECUTIVE_ROLES],
                                });
                              }}
                              className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                                panelModalForm.boardType === "executive"
                                  ? "bg-primary/15 border-primary text-foreground ring-1 ring-primary/40"
                                  : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <div className="font-bold text-foreground">Executive Committee</div>
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                Governing student leadership panel
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const nextOrd = panelModalForm.ordinal || 3;
                                const suffix = nextOrd === 1 ? "1st" : nextOrd === 2 ? "2nd" : nextOrd === 3 ? "3rd" : `${nextOrd}th`;
                                setPanelModalForm({
                                  ...panelModalForm,
                                  boardType: "advisory",
                                  title: `${suffix} Advisory Board (${panelModalForm.sessionYears})`,
                                  allowedRoles: [...DEFAULT_ADVISORY_ROLES],
                                });
                              }}
                              className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                                panelModalForm.boardType === "advisory"
                                  ? "bg-primary/15 border-primary text-foreground ring-1 ring-primary/40"
                                  : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <div className="font-bold text-foreground">Advisory Board</div>
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                Faculty mentors & industry advisors
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Ordinal & Session Years */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-mono text-muted-foreground mb-1">
                              2. Panel Number / Ordinal *:
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              required
                              value={panelModalForm.ordinal}
                              onChange={(e) => {
                                const ord = parseInt(e.target.value) || 1;
                                const suffix = ord === 1 ? "1st" : ord === 2 ? "2nd" : ord === 3 ? "3rd" : `${ord}th`;
                                const boardLabel = panelModalForm.boardType === "executive" ? "Executive Board" : "Advisory Board";
                                setPanelModalForm({
                                  ...panelModalForm,
                                  ordinal: ord,
                                  title: `${suffix} ${boardLabel} (${panelModalForm.sessionYears})`,
                                });
                              }}
                              className={inputClass}
                              placeholder="e.g. 4 for 4th Executive"
                            />
                            <span className="text-[10px] font-mono text-muted-foreground mt-1 block">
                              e.g., 4 for "4th Executive Board"
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-mono text-muted-foreground mb-1">
                              3. Session Years *:
                            </label>
                            <input
                              type="text"
                              required
                              value={panelModalForm.sessionYears}
                              onChange={(e) => {
                                const years = e.target.value;
                                const ord = panelModalForm.ordinal || 4;
                                const suffix = ord === 1 ? "1st" : ord === 2 ? "2nd" : ord === 3 ? "3rd" : `${ord}th`;
                                const boardLabel = panelModalForm.boardType === "executive" ? "Executive Board" : "Advisory Board";
                                setPanelModalForm({
                                  ...panelModalForm,
                                  sessionYears: years,
                                  title: `${suffix} ${boardLabel} (${years})`,
                                });
                              }}
                              className={inputClass}
                              placeholder="e.g. 2026-2027"
                            />
                            <span className="text-[10px] font-mono text-muted-foreground mt-1 block">
                              e.g., "2026-2027"
                            </span>
                          </div>
                        </div>

                        {/* Computed Panel Title */}
                        <div>
                          <label className="block text-xs font-mono text-muted-foreground mb-1">
                            4. Panel Full Title *:
                          </label>
                          <input
                            type="text"
                            required
                            value={panelModalForm.title}
                            onChange={(e) => setPanelModalForm({ ...panelModalForm, title: e.target.value })}
                            className={inputClass + " font-semibold text-primary"}
                            placeholder="e.g. 4th Executive Board (2026-2027)"
                          />
                          <span className="text-[10px] font-mono text-muted-foreground mt-1 block">
                            This title is used as the panel identifier and member category.
                          </span>
                        </div>

                        {/* Initial Roles Configured */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-mono text-muted-foreground">
                              5. Allowed Roles in this Panel ({panelModalForm.allowedRoles.length}):
                            </label>
                            <span className="text-[10px] font-mono text-[#2de2c9]">
                              Populates member dropdown
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 max-h-36 overflow-y-auto flex flex-wrap gap-1.5">
                            {panelModalForm.allowedRoles.map((role) => (
                              <span
                                key={role}
                                className="text-[11px] font-mono px-2 py-0.5 rounded bg-background border border-border text-foreground flex items-center gap-1"
                              >
                                {role}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPanelModalForm({
                                      ...panelModalForm,
                                      allowedRoles: panelModalForm.allowedRoles.filter((r) => r !== role),
                                    })
                                  }
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Safety Notice */}
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed flex items-start gap-2">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <span>
                            <strong>Draft Safeguard:</strong> This panel will be created in <strong>Draft mode</strong>. Neither this panel nor the members added to it will appear on the public /team page until you explicitly click "Publish as Current Panel".
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => setShowPanelModal(false)}
                            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md flex items-center gap-1.5"
                          >
                            <Plus size={14} /> Create Panel (Draft Mode)
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* ════════ Modal 2: Manage Roles Modal ════════ */}
              <AnimatePresence>
                {showRoleModal && activePanel && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="w-full max-w-xl bg-card border border-[#2de2c9]/40 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <div>
                          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <UserCog size={18} className="text-[#2de2c9]" />
                            Configure Roles for {activePanel.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            These roles appear in the designation dropdown when adding or editing members in this panel.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowRoleModal(false)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Add New Role Input */}
                      <div className="space-y-2">
                        <label className="block text-xs font-mono text-muted-foreground">
                          Add a Role / Designation:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="e.g., Director of Logistics, Robotics Lead, Research Head"
                            value={newRoleInput}
                            onChange={(e) => setNewRoleInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddRoleToActivePanel();
                              }
                            }}
                            className={inputClass + " flex-1"}
                          />
                          <button
                            type="button"
                            onClick={handleAddRoleToActivePanel}
                            className="px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shrink-0 flex items-center gap-1"
                          >
                            <Plus size={14} /> Add Role
                          </button>
                        </div>
                      </div>

                      {/* Configured Roles List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono text-muted-foreground">
                            Configured Roles ({activePanel.allowedRoles?.length || 0}):
                          </label>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Click × to remove from dropdown
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 max-h-56 overflow-y-auto space-y-1.5">
                          {(activePanel.allowedRoles || []).map((role, idx) => (
                            <div
                              key={role}
                              className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/60 text-xs font-mono"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-[10px] w-5">#{idx + 1}</span>
                                <span className="text-foreground font-medium">{role}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRoleFromActivePanel(role)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Remove this role"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
                        <span className="text-[11px] font-mono text-muted-foreground block">
                          Quick Presets (Click to add if missing):
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            "President",
                            "Vice-president (Technical & Mentoring)",
                            "Vice-president (Logistics & Management)",
                            "General Secretary",
                            "Assistant General Secretary",
                            "Organizing Secretary",
                            "Finance Secretary",
                            "Publicity Secretary",
                            "Research & Development Secretary",
                            "Executive Member",
                            "Faculty Advisor",
                            "Senior Advisor",
                            "Honorary Mentor",
                          ]
                            .filter((r) => !(activePanel.allowedRoles || []).includes(r))
                            .slice(0, 8)
                            .map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={async () => {
                                  const updatedRoles = [...activePanel.allowedRoles, preset];
                                  await upsertClubPanel({ ...activePanel, allowedRoles: updatedRoles });
                                  const refreshed = await fetchClubPanels();
                                  setPanels(refreshed);
                                  toast.success(`Added preset "${preset}"`);
                                }}
                                className="text-[10px] font-mono px-2 py-1 rounded bg-background hover:bg-[#2de2c9]/15 hover:text-[#2de2c9] border border-border transition-colors flex items-center gap-1"
                              >
                                <Plus size={10} /> {preset}
                              </button>
                            ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => setShowRoleModal(false)}
                          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
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
                {events.map((ev: any) => {
                  const evRegs = eventRegistrations.filter((r: any) => r.event_id === ev.id);
                  const pending = evRegs.filter((r: any) => r.approval_status === "pending").length;
                  const approved = evRegs.filter((r: any) => r.approval_status === "approved").length;
                  const isOpen = expandedEventId === ev.id;
                  return (
                    <motion.div key={ev.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl glass overflow-hidden">
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {ev.image_url && <img src={ev.image_url} alt={ev.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-foreground">{ev.title}</h4>
                            <p className="text-xs text-muted-foreground">{ev.type || "—"} · {ev.venue || "—"} · {new Date(ev.date).toLocaleDateString()}{ev.is_paid && <span className="ml-1 text-primary"> · ৳{ev.registration_fee}</span>}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                              <span className="text-muted-foreground">Total: <span className="text-foreground font-medium">{evRegs.length}</span></span>
                              <span className="text-green-400">✓ {approved}</span>
                              {pending > 0 && <span className="text-yellow-400">⏳ {pending} pending</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setExpandedEventId(isOpen ? null : ev.id)}
                            className="p-1.5 rounded bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                            title={isOpen ? "Hide participants" : "Show participants"}
                          >
                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button onClick={() => editEvent(ev)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => deleteEvent(ev.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border/40 overflow-hidden"
                          >
                            <div className="p-4 space-y-2">
                              {evRegs.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No registrations yet.</p>
                              ) : (
                                <>
                                  <div className="flex justify-end mb-2">
                                    <button
                                      onClick={() => downloadCSV(
                                        evRegs.map((r: any) => ({
                                          Name: r.name || "",
                                          Email: r.email || "",
                                          Phone: r.phone || "",
                                          Department: r.department || "",
                                          "Approval Status": r.approval_status,
                                          "Payment Status": r.payment_status,
                                          "Payment Method": r.payment_method || "—",
                                          "Transaction ID": r.transaction_id || "—",
                                          Registered: new Date(r.registered_at).toLocaleString(),
                                        })),
                                        `${ev.title.replace(/\s+/g, "_")}_participants.csv`
                                      )}
                                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1"
                                    >
                                      <Download size={12} /> Export CSV
                                    </button>
                                  </div>
                                  {evRegs.map((r: any) => (
                                    <ParticipantRow
                                      key={r.id}
                                      reg={r}
                                      onApprove={() => updateEventApproval(r.id, "approved")}
                                      onReject={() => updateEventApproval(r.id, "rejected")}
                                      onPending={() => updateEventApproval(r.id, "pending")}
                                      onDelete={() => deleteEventRegistration(r.id)}
                                      onPaymentConfirm={() => updateEventPaymentStatus(r.id, "confirmed")}
                                      showEvent={false}
                                    />
                                  ))}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════ Participants Tab ════════ */}
          {tab === "participants" && (
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <select
                  value={participantFilter}
                  onChange={(e) => setParticipantFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">All Events</option>
                  {events.map((ev: any) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
                <div className="flex gap-1 flex-wrap">
                  {(["all", "pending", "approved", "rejected"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setParticipantStatusFilter(s)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors capitalize ${
                        participantStatusFilter === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="sm:ml-auto">
                  {(() => {
                    const filtered = eventRegistrations.filter((r: any) =>
                      (participantFilter === "all" || r.event_id === participantFilter) &&
                      (participantStatusFilter === "all" || r.approval_status === participantStatusFilter)
                    );
                    return (
                      <button
                        onClick={() => downloadCSV(
                          filtered.map((r: any) => ({
                            Event: r.events?.title || "",
                            Name: r.name || "",
                            Email: r.email || "",
                            Phone: r.phone || "",
                            Department: r.department || "",
                            "Approval Status": r.approval_status,
                            "Payment Status": r.payment_status,
                            "Payment Method": r.payment_method || "—",
                            "Transaction ID": r.transaction_id || "—",
                            Registered: new Date(r.registered_at).toLocaleString(),
                          })),
                          `event_participants_${Date.now()}.csv`
                        )}
                        disabled={filtered.length === 0}
                        className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Download size={14} /> Export ({filtered.length})
                      </button>
                    );
                  })()}
                </div>
              </div>

              {(() => {
                const filtered = eventRegistrations.filter((r: any) =>
                  (participantFilter === "all" || r.event_id === participantFilter) &&
                  (participantStatusFilter === "all" || r.approval_status === participantStatusFilter)
                );
                if (filtered.length === 0) {
                  return <p className="text-center text-muted-foreground py-8">No registrations match the selected filters.</p>;
                }
                return (
                  <div className="space-y-2">
                    {filtered.map((r: any) => (
                      <ParticipantRow
                        key={r.id}
                        reg={r}
                        onApprove={() => updateEventApproval(r.id, "approved")}
                        onReject={() => updateEventApproval(r.id, "rejected")}
                        onPending={() => updateEventApproval(r.id, "pending")}
                        onDelete={() => deleteEventRegistration(r.id)}
                        onPaymentConfirm={() => updateEventPaymentStatus(r.id, "confirmed")}
                        showEvent={true}
                      />
                    ))}
                  </div>
                );
              })()}
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
                    <input placeholder="Series (e.g., 2018 or 18)" value={alumniForm.batch} onChange={(e) => setAlumniForm({ ...alumniForm, batch: e.target.value })} className={inputClass} />
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
                    <div className="flex-1 min-w-0"><h4 className="font-semibold text-sm text-foreground">{a.name}</h4><p className="text-xs text-muted-foreground">{a.batch ? `Series ${a.batch}` : "—"} · {a.department || "—"} · {a.company || "—"}</p></div>
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
                                  <th className="pb-1 pr-3">Payment Info</th>
                                  <th className="pb-1 pr-3">Payment Status</th>
                                  <th className="pb-1 pr-3">Payment Action</th>
                                  <th className="pb-1 pr-3">Progress</th>
                                  <th className="pb-1 pr-3">Certificate</th>
                                  <th className="pb-1 text-right">Remove</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cRegs.map((r: any) => {
                                  const p = courseProfiles.find((pr: any) => pr.user_id === r.user_id);
                                  const cert = cCerts.find(cert => cert.user_id === r.user_id);
                                  return (
                                    <tr key={r.id} className="border-t border-border/30">
                                      <td className="py-1.5 pr-3 text-foreground font-medium">
                                        <div>{p?.full_name || "—"}</div>
                                        {p?.email && <div className="text-[10px] text-muted-foreground">{p.email}</div>}
                                      </td>
                                      <td className="py-1.5 pr-3 text-muted-foreground">{p?.student_id || "—"}</td>
                                      <td className="py-1.5 pr-3 text-muted-foreground">
                                        {r.transaction_id ? (
                                          <div>
                                            <span className="font-mono text-[10px]">{r.transaction_id}</span>
                                            {r.payment_method && <span className="text-[10px] text-muted-foreground block">{r.payment_method}</span>}
                                          </div>
                                        ) : (
                                          <span className="text-[11px] capitalize">{r.payment_method || "Free"}</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 pr-3">
                                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                                          r.payment_status === "confirmed" ? "bg-green-500/10 text-green-400" :
                                          r.payment_status === "rejected" ? "bg-destructive/10 text-destructive" :
                                          r.payment_status === "unpaid" ? "bg-amber-500/10 text-amber-400" :
                                          "bg-yellow-500/10 text-yellow-400"
                                        }`}>{r.payment_status || "unpaid"}</span>
                                      </td>
                                      <td className="py-1.5 pr-3">
                                        {r.payment_status === "pending" || r.payment_status === "unpaid" ? (
                                          <div className="flex gap-1">
                                            <button onClick={() => updateCoursePaymentStatus(r.id, "confirmed")} className="p-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Approve Payment"><Check size={12} /></button>
                                            <button onClick={() => updateCoursePaymentStatus(r.id, "rejected")} className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Reject Payment"><X size={12} /></button>
                                          </div>
                                        ) : (
                                          <button onClick={() => updateCoursePaymentStatus(r.id, "pending")} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">Reset</button>
                                        )}
                                      </td>
                                      <td className="py-1.5 pr-3">
                                        <button
                                          onClick={() => toggleCourseCompletion(r.id, !!r.completed, r.user_id, r.course_id)}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                            r.completed
                                              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                              : "bg-secondary text-muted-foreground hover:bg-primary/20 hover:text-primary"
                                          }`}
                                          title={r.completed ? "Click to set In Progress" : "Click to mark Completed & auto-issue certificate"}
                                        >
                                          <CheckCircle2 size={11} />
                                          <span>{r.completed ? "Completed" : "In Progress"}</span>
                                        </button>
                                      </td>
                                      <td className="py-1.5 pr-3">
                                        {cert ? (
                                          <Link
                                            to={`/certificate/${cert.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono"
                                            title={`Certificate #${cert.certificate_number || cert.id}`}
                                          >
                                            <Award size={12} className="text-primary" />
                                            <span>{cert.certificate_number || "Cert"}</span>
                                            <ExternalLink size={10} />
                                          </Link>
                                        ) : r.completed ? (
                                          <button
                                            onClick={() => issueCourseCertificate(r.user_id, r.course_id)}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-medium transition-colors"
                                            title="Issue Certificate to Student"
                                          >
                                            <Award size={10} /> Issue Cert
                                          </button>
                                        ) : (
                                          <span className="text-muted-foreground text-[10px]">—</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 text-right">
                                        <button
                                          onClick={() => deleteCourseRegistration(r.id)}
                                          className="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                          title="Remove Enrollment"
                                        >
                                          <Trash2 size={12} />
                                        </button>
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

          {/* ════════ Hero Banner & CTA Control Tab ════════ */}
          {tab === "banner" && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header Box */}
              <div className="p-6 rounded-2xl glass border border-primary/30 relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="p-2 rounded-lg bg-primary/15 text-primary border border-primary/30">
                        <Sparkles size={18} />
                      </span>
                      <h3 className="text-xl font-bold text-foreground">Hero Announcement Banner &amp; CTA</h3>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                      Manage the live temporary announcement banner shown <strong>above the logo</strong> in the Hero section and customize the primary CTA button (e.g., switch between &quot;Join Us&quot; and &quot;Register Now&quot;).
                    </p>
                  </div>

                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold transition-all self-start md:self-auto shrink-0"
                  >
                    <ExternalLink size={14} className="text-primary" /> Preview Landing Page
                  </a>
                </div>
              </div>

              {/* Status Toggle Card */}
              <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <span className={`relative flex h-3.5 w-3.5 shrink-0 ${heroBannerForm.isActive ? "" : "opacity-40"}`}>
                    {heroBannerForm.isActive && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2de2c9] opacity-75" />
                    )}
                    <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${heroBannerForm.isActive ? "bg-[#2de2c9] shadow-[0_0_10px_#2de2c9]" : "bg-muted-foreground"}`} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">Banner Display Status:</span>
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        heroBannerForm.isActive
                          ? "bg-green-500/15 text-green-400 border border-green-500/30"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}>
                        {heroBannerForm.isActive ? "ACTIVE & LIVE ON HERO" : "INACTIVE / HIDDEN"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {heroBannerForm.isActive
                        ? "Currently rendered above the logo crest on the public landing page."
                        : "Hidden from public visitors. Activate whenever recruitment or an event begins."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHeroBannerForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-all shadow-md shrink-0 flex items-center gap-2 ${
                    heroBannerForm.isActive
                      ? "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30"
                      : "bg-[#2de2c9] text-[#050b14] hover:brightness-110 shadow-[0_0_15px_rgba(45,226,201,0.4)]"
                  }`}
                >
                  <Radio size={14} />
                  {heroBannerForm.isActive ? "Turn OFF Banner" : "Turn ON Banner"}
                </button>
              </div>

              {/* 1-Click Preset Templates */}
              <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50">
                <h4 className="text-xs font-mono uppercase tracking-widest text-primary mb-3 flex items-center gap-1.5">
                  <Sparkles size={13} /> 1-Click Quick Preset Templates
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setHeroBannerForm({
                        isActive: true,
                        badge: "Recruitment Ongoing",
                        title: "Member Recruitment 2025 Now Open",
                        daysLeft: "Register Now",
                        linkUrl: "/join",
                        buttonText: "Join Us",
                        buttonUrl: "/join",
                      });
                      toast.info("Recruitment template loaded! Click 'Save & Publish' to make it live.");
                    }}
                    className="p-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 hover:border-primary/40 text-left transition-all group"
                  >
                    <div className="text-lg mb-1">🎓</div>
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Member Recruitment</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Recruitment Ongoing · Join Us</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHeroBannerForm({
                        isActive: true,
                        badge: "Flagship Event",
                        title: "IoT Innovation Expo & Hackathon 2025",
                        daysLeft: "3 Days Left",
                        linkUrl: "/events",
                        buttonText: "Register Now",
                        buttonUrl: "/events",
                      });
                      toast.info("Event template loaded! Click 'Save & Publish' to make it live.");
                    }}
                    className="p-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 hover:border-[#00d2ff]/40 text-left transition-all group"
                  >
                    <div className="text-lg mb-1">🚀</div>
                    <div className="text-xs font-bold text-foreground group-hover:text-[#00d2ff] transition-colors">Hackathon / Event</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Event Name · Days Left · Register Now</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHeroBannerForm({
                        isActive: true,
                        badge: "Workshop",
                        title: "Hands-on ESP32 & IoT Systems Workshop",
                        daysLeft: "Limited Seats",
                        linkUrl: "/courses",
                        buttonText: "Join Workshop",
                        buttonUrl: "/courses",
                      });
                      toast.info("Workshop template loaded! Click 'Save & Publish' to make it live.");
                    }}
                    className="p-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 hover:border-accent/40 text-left transition-all group"
                  >
                    <div className="text-lg mb-1">🛠️</div>
                    <div className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">Hands-on Workshop</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Workshop · Limited Seats · Join</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHeroBannerForm(DEFAULT_HERO_BANNER);
                      toast.info("Default settings restored.");
                    }}
                    className="p-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 hover:border-foreground/30 text-left transition-all group"
                  >
                    <div className="text-lg mb-1">🔄</div>
                    <div className="text-xs font-bold text-foreground group-hover:text-foreground transition-colors">Reset Default</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Restore standard defaults</div>
                  </button>
                </div>
              </div>

              {/* Live Visual Preview */}
              <div className="p-6 rounded-2xl bg-[#030914] border border-[#2de2c9]/30 relative overflow-hidden shadow-[0_0_30px_rgba(45,226,201,0.1)]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2de2c9] animate-pulse" />
                    <span className="font-mono text-xs text-[#2de2c9] uppercase tracking-wider font-semibold">
                      Live Hero Preview (Interactive)
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">What visitors see on homepage</span>
                </div>

                <div className="flex flex-col items-center justify-center py-6 gap-3.5 text-center">
                  {/* Wide Banner Preview */}
                  {heroBannerForm.isActive ? (
                    <div className="group relative w-full max-w-xl flex items-center justify-between gap-2.5 sm:gap-4 px-4 py-2.5 rounded-xl bg-[#06101c]/95 border border-[#2de2c9]/45 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_20px_rgba(45,226,201,0.18)] select-none overflow-hidden">
                      {/* Corner Brackets */}
                      <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#2de2c9] pointer-events-none rounded-tl-[3px]" />
                      <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#2de2c9] pointer-events-none rounded-tr-[3px]" />
                      <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#2de2c9] pointer-events-none rounded-bl-[3px]" />
                      <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#2de2c9] pointer-events-none rounded-br-[3px]" />

                      {/* Scanline */}
                      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#2de2c9] to-transparent pointer-events-none shadow-[0_0_8px_#2de2c9]" />
                      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d2ff]/40 to-transparent pointer-events-none" />

                      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 z-10">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2de2c9] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2de2c9] shadow-[0_0_8px_#2de2c9]" />
                        </span>
                        {heroBannerForm.badge && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/40 tracking-wider uppercase">
                            {heroBannerForm.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left px-2 z-10">
                        <span className="font-body text-xs font-bold tracking-wide bg-gradient-to-r from-[#2de2c9] via-[#67e8f9] to-[#38bdf8] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(45,226,201,0.4)] truncate block">
                          {heroBannerForm.title || "Announcement Title"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 z-10">
                        {heroBannerForm.daysLeft && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#00d2ff]/15 text-[#38bdf8] border border-[#00d2ff]/40">
                            {heroBannerForm.daysLeft}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-[#2de2c9] font-bold flex items-center gap-1 px-2 py-0.5 rounded bg-[#2de2c9]/15 border border-[#2de2c9]/40">
                          Details <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-md py-3 rounded-xl border border-dashed border-white/20 text-xs text-muted-foreground/60 select-none text-center">
                      [Banner Currently Disabled / Hidden]
                    </div>
                  )}

                  {/* Logo Emblem Mock */}
                  <div className="w-16 h-16 rounded-full bg-[#081524] border border-[#2de2c9]/40 flex items-center justify-center shadow-[0_0_20px_rgba(45,226,201,0.2)] mt-1">
                    <span className="text-[10px] font-mono text-[#2de2c9] font-bold">LOGO</span>
                  </div>

                  <p className="font-mono text-[10px] tracking-widest uppercase text-[#2de2c9]/80 -mt-1">
                    Rajshahi University of Engineering &amp; Technology
                  </p>
                  <p className="font-display text-lg font-bold text-white tracking-wide">
                    RUET IoT Club
                  </p>

                  {/* Dynamic CTA Button Preview */}
                  <div className="pt-2">
                    <div
                      className="relative inline-flex items-center gap-2.5 px-6 py-2.5 bg-gradient-to-r from-[#2de2c9] via-[#00d2ff] to-[#38bdf8] text-[#050b14] font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(45,226,201,0.5)] select-none cursor-pointer"
                      style={{
                        clipPath: "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)"
                      }}
                    >
                      <span>{heroBannerForm.buttonText || "Join Us"}</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSavingHeroBanner(true);
                  try {
                    const res = await saveHeroBannerConfig(heroBannerForm, user?.id);
                    if (res.success) {
                      toast.success("Hero Banner & CTA configuration published live!");
                      // Dispatch local storage event for instant sync in current window
                      window.dispatchEvent(
                        new StorageEvent("storage", {
                          key: "ruet_iot_hero_banner_config",
                          newValue: JSON.stringify(heroBannerForm),
                        })
                      );
                    } else {
                      toast.error("Failed to save banner configuration to Supabase");
                    }
                  } catch (err) {
                    console.error("Save error:", err);
                    toast.error("Error saving banner configuration");
                  } finally {
                    setSavingHeroBanner(false);
                  }
                }}
                className="p-6 rounded-2xl bg-secondary/30 border border-border/50 space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Badge */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                      <span>Banner Badge / Category Tag</span>
                      <span className="text-[10px] text-muted-foreground font-normal">e.g. Recruitment, Event, Workshop</span>
                    </label>
                    <input
                      className={inputClass}
                      value={heroBannerForm.badge}
                      onChange={(e) => setHeroBannerForm({ ...heroBannerForm, badge: e.target.value })}
                      placeholder="e.g. Recruitment Ongoing, Upcoming Event"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Recruitment Ongoing", "Upcoming Event", "Workshop", "Hackathon", "Registration Open"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setHeroBannerForm({ ...heroBannerForm, badge: tag })}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/80 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-border/40"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Days Left / Subtext */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                      <span>Status / Days Left / Subtext</span>
                      <span className="text-[10px] text-muted-foreground font-normal">e.g. Register Now, 3 Days Left</span>
                    </label>
                    <input
                      className={inputClass}
                      value={heroBannerForm.daysLeft || ""}
                      onChange={(e) => setHeroBannerForm({ ...heroBannerForm, daysLeft: e.target.value })}
                      placeholder="e.g. Register Now, 3 Days Left, Ending Soon"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Register Now", "3 Days Left", "2 Days Left", "Ending Today", "Apply Before 25th"].map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setHeroBannerForm({ ...heroBannerForm, daysLeft: sub })}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/80 hover:bg-[#00d2ff]/20 text-muted-foreground hover:text-[#00d2ff] transition-colors border border-border/40"
                        >
                          +{sub}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Event / Announcement Name */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Event / Announcement Title <span className="text-primary">*</span>
                  </label>
                  <input
                    required
                    className={inputClass}
                    value={heroBannerForm.title}
                    onChange={(e) => setHeroBannerForm({ ...heroBannerForm, title: e.target.value })}
                    placeholder="e.g. Member Recruitment 2025 Now Open or IoT Carnival 2025"
                  />
                </div>

                {/* Banner Click URL */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                    <span>Banner Click Destination URL</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Where users go when clicking the top banner</span>
                  </label>
                  <input
                    className={inputClass}
                    value={heroBannerForm.linkUrl}
                    onChange={(e) => setHeroBannerForm({ ...heroBannerForm, linkUrl: e.target.value })}
                    placeholder="/join, /events, /courses, or https://..."
                  />
                  <div className="flex gap-2 mt-2">
                    {["/join", "/events", "/courses", "/projects"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setHeroBannerForm({ ...heroBannerForm, linkUrl: p })}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="pt-2 pb-1 border-t border-border/40">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[#2de2c9] mb-1">
                    Primary CTA Button Customization (&quot;Join Us&quot; Button)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    You can change the primary Hero button text (e.g. change &quot;Join Us&quot; to &quot;Register Now&quot; or &quot;Join Workshop&quot;) and its destination link.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Button Text */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      CTA Button Label <span className="text-primary">*</span>
                    </label>
                    <input
                      required
                      className={inputClass}
                      value={heroBannerForm.buttonText}
                      onChange={(e) => setHeroBannerForm({ ...heroBannerForm, buttonText: e.target.value })}
                      placeholder="e.g. Join Us, Register Now, Join Workshop"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Join Us", "Register Now", "Apply Now", "Join Workshop", "Get Ticket"].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setHeroBannerForm({ ...heroBannerForm, buttonText: b })}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/80 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-border/40"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button URL */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      CTA Button Destination URL <span className="text-primary">*</span>
                    </label>
                    <input
                      required
                      className={inputClass}
                      value={heroBannerForm.buttonUrl}
                      onChange={(e) => setHeroBannerForm({ ...heroBannerForm, buttonUrl: e.target.value })}
                      placeholder="/join, /events, /courses, or https://..."
                    />
                    <div className="flex gap-2 mt-2">
                      {["/join", "/events", "/courses"].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setHeroBannerForm({ ...heroBannerForm, buttonUrl: b })}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={savingHeroBanner}
                      className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      {savingHeroBanner ? "Publishing Changes..." : "Save & Publish Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const latest = await fetchHeroBannerConfig();
                        setHeroBannerForm(latest);
                        toast.info("Refreshed from server");
                      }}
                      className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground font-medium text-xs transition-colors"
                    >
                      Discard Unsaved
                    </button>
                  </div>

                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    View Homepage <ExternalLink size={13} />
                  </a>
                </div>
              </form>
            </div>
          )}

          {/* ════════ Partners & Collaborators Tab ════════ */}
          {tab === "partners" && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header Box */}
              <div className="p-6 rounded-2xl glass border border-[#2de2c9]/30 relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#2de2c9]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="p-2 rounded-lg bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/30">
                        <Handshake size={18} />
                      </span>
                      <h3 className="text-xl font-bold text-foreground">Partners &amp; Collaborators Management</h3>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                      Manage official partner organizations, research institutions, and sponsors displayed on the homepage. Changes save directly to Supabase and update in real-time.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        resetPartnerForm();
                        setShowPartnerForm(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                    >
                      <Plus size={15} /> Add New Partner
                    </button>

                    <button
                      type="button"
                      onClick={handleResetDefaultPartners}
                      className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                      title="Reset to default 3 partners (IID, The Earth Society, Youth For CARE)"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>
              </div>

              {/* Add / Edit Partner Form Modal or Card */}
              <AnimatePresence>
                {showPartnerForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <form
                      onSubmit={handlePartnerSubmit}
                      className="p-6 rounded-2xl bg-[#071322] border border-[#2de2c9]/45 shadow-[0_4px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(45,226,201,0.12)] space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                          <Handshake size={16} className="text-[#2de2c9]" />
                          {editingPartnerId ? "Edit Partner Organization" : "Add New Partner Organization"}
                        </h4>
                        <button
                          type="button"
                          onClick={resetPartnerForm}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            Organization Name <span className="text-primary">*</span>
                          </label>
                          <input
                            required
                            className={inputClass}
                            value={partnerForm.name || ""}
                            onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                            placeholder="e.g. Institute for Informed Development, Google, RUET"
                          />
                        </div>

                        {/* Subtitle / Short Name */}
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            Subtitle / Tagline (Optional)
                          </label>
                          <input
                            className={inputClass}
                            value={partnerForm.subtitle || ""}
                            onChange={(e) => setPartnerForm({ ...partnerForm, subtitle: e.target.value })}
                            placeholder="e.g. Evidence-Based Research Partner"
                          />
                        </div>

                        {/* Website URL */}
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            Website URL
                          </label>
                          <input
                            type="url"
                            className={inputClass}
                            value={partnerForm.website || ""}
                            onChange={(e) => setPartnerForm({ ...partnerForm, website: e.target.value })}
                            placeholder="https://example.org"
                          />
                        </div>

                        {/* Accent Glow Color */}
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            Card Ambient Accent Glow
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              className={inputClass}
                              value={partnerForm.accentGlow || ""}
                              onChange={(e) => setPartnerForm({ ...partnerForm, accentGlow: e.target.value })}
                              placeholder="rgba(45, 226, 201, 0.35)"
                            />
                            <div className="flex gap-1 shrink-0">
                              {[
                                { label: "Cyan", val: "rgba(0, 180, 216, 0.35)", bg: "#00b4d8" },
                                { label: "Teal", val: "rgba(45, 226, 201, 0.35)", bg: "#2de2c9" },
                                { label: "Gold", val: "rgba(234, 179, 8, 0.35)", bg: "#eab308" },
                                { label: "Purple", val: "rgba(168, 85, 247, 0.35)", bg: "#a855f7" },
                              ].map((c) => (
                                <button
                                  key={c.label}
                                  type="button"
                                  onClick={() => setPartnerForm({ ...partnerForm, accentGlow: c.val })}
                                  className="w-6 h-6 rounded-full border border-white/30 transition-transform hover:scale-110"
                                  style={{ backgroundColor: c.bg }}
                                  title={c.label}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Description <span className="text-primary">*</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          className={inputClass}
                          value={partnerForm.description || ""}
                          onChange={(e) => setPartnerForm({ ...partnerForm, description: e.target.value })}
                          placeholder="Brief explanation of the partner organization and collaboration focus..."
                        />
                      </div>

                      {/* Logo Selector: Preset vs Custom URL / Upload */}
                      <div className="p-4 rounded-xl bg-secondary/40 border border-border/50 space-y-3">
                        <label className="text-xs font-semibold text-foreground block">
                          Logo Option
                        </label>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: "iid", label: "IID Node Logo" },
                            { id: "earth-society", label: "The Earth Society" },
                            { id: "youth-for-care", label: "Youth For CARE" },
                            { id: "custom", label: "Custom Image / URL" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setPartnerForm({ ...partnerForm, presetLogoId: opt.id as any })}
                              className={`p-2.5 rounded-lg text-xs font-medium border text-center transition-all ${
                                partnerForm.presetLogoId === opt.id
                                  ? "bg-primary/20 text-primary border-primary shadow-[0_0_10px_rgba(45,226,201,0.2)]"
                                  : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {partnerForm.presetLogoId === "custom" && (
                          <div className="pt-2 space-y-2">
                            <label className="text-xs text-muted-foreground block">
                              Custom Logo Image URL or Upload:
                            </label>
                            <div className="flex gap-2">
                              <input
                                className={inputClass}
                                value={partnerForm.logoUrl || ""}
                                onChange={(e) => setPartnerForm({ ...partnerForm, logoUrl: e.target.value })}
                                placeholder="https://example.com/logo.png"
                              />
                            </div>
                            <div className="pt-1">
                              <ImageUpload
                                currentUrl={partnerForm.logoUrl}
                                onUpload={(url) => setPartnerForm({ ...partnerForm, logoUrl: url })}
                                folder="partners"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Active Toggle & Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/40">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={partnerForm.active !== false}
                            onChange={(e) => setPartnerForm({ ...partnerForm, active: e.target.checked })}
                            className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                          />
                          <span className="text-xs font-semibold text-foreground">
                            Active (Visible on Homepage)
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={resetPartnerForm}
                            className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground font-semibold text-xs hover:bg-secondary/80 transition-colors"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={savingPartners}
                            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50"
                          >
                            <Check size={14} />
                            {savingPartners ? "Saving..." : editingPartnerId ? "Update Partner" : "Save Partner"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Partners List Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    Showing {partnersList.length} Partner Organizations ({partnersList.filter((p) => p.active !== false).length} Active on Homepage)
                  </span>
                </div>

                {partnersList.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-secondary/20 border border-border text-muted-foreground text-sm">
                    No partner organizations configured. Click &quot;Add New Partner&quot; or &quot;Reset Defaults&quot; above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {partnersList.map((partner) => (
                      <div
                        key={partner.id}
                        className={`p-5 rounded-2xl bg-[#081524]/90 border transition-all duration-200 relative flex flex-col justify-between overflow-hidden ${
                          partner.active !== false
                            ? "border-[#2de2c9]/35 hover:border-[#2de2c9]/70 shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
                            : "border-border/40 opacity-60 bg-secondary/20"
                        }`}
                      >
                        {/* Glow indicator */}
                        <div
                          className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-xl pointer-events-none opacity-20"
                          style={{ background: partner.accentGlow || "rgba(45, 226, 201, 0.35)" }}
                        />

                        <div>
                          {/* Top Row: Preset/Logo Preview + Status Badge */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border/50">
                              {partner.presetLogoId === "iid"
                                ? "Preset: IID"
                                : partner.presetLogoId === "earth-society"
                                ? "Preset: Earth Society"
                                : partner.presetLogoId === "youth-for-care"
                                ? "Preset: Youth For CARE"
                                : "Custom Logo"}
                            </span>

                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                partner.active !== false
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {partner.active !== false ? "Active" : "Hidden"}
                            </span>
                          </div>

                          {/* Logo snippet */}
                          <div className="h-12 flex items-center justify-center w-full mb-3 bg-[#050b14]/70 rounded-xl p-2 border border-border/30">
                            {partner.presetLogoId === "iid" && (
                              <span className="font-bold text-xs text-[#00b4d8]">IID (Institute for Informed Development)</span>
                            )}
                            {partner.presetLogoId === "earth-society" && (
                              <span className="font-serif font-bold text-xs text-[#eab308]">The Earth Society</span>
                            )}
                            {partner.presetLogoId === "youth-for-care" && (
                              <span className="font-bold text-xs text-[#2de2c9]">Youth For CARE</span>
                            )}
                            {partner.presetLogoId === "custom" && partner.logoUrl && (
                              <img src={partner.logoUrl} alt={partner.name} className="max-h-8 max-w-full object-contain" />
                            )}
                            {partner.presetLogoId === "custom" && !partner.logoUrl && (
                              <span className="font-mono text-xs text-muted-foreground">{partner.name}</span>
                            )}
                          </div>

                          {/* Name & Subtitle */}
                          <h4 className="font-bold text-sm text-foreground mb-0.5">
                            {partner.name}
                          </h4>
                          {partner.subtitle && (
                            <p className="text-[11px] font-mono text-[#2de2c9] mb-2 truncate">
                              {partner.subtitle}
                            </p>
                          )}

                          {/* Description */}
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                            {partner.description}
                          </p>

                          {/* Website Link */}
                          {partner.website && (
                            <a
                              href={partner.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#38bdf8] hover:underline mb-4"
                            >
                              <ExternalLink size={11} /> {partner.website}
                            </a>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                          <button
                            type="button"
                            onClick={() => togglePartnerActive(partner.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                              partner.active !== false
                                ? "bg-secondary text-muted-foreground hover:text-foreground"
                                : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                            }`}
                          >
                            {partner.active !== false ? "Hide" : "Show"}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => editPartner(partner)}
                              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit partner"
                            >
                              <Pencil size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => deletePartner(partner.id)}
                              className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                              title="Delete partner"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

              {announcements.filter(a => a.title !== "HERO_BANNER_CONFIG" && a.title !== "PARTNERS_LIST_CONFIG").length === 0 && !showAnnouncementForm && (
                <p className="text-muted-foreground text-center py-12">No announcements yet. Create one to notify members.</p>
              )}

              <div className="space-y-3">
                {announcements.filter(a => a.title !== "HERO_BANNER_CONFIG" && a.title !== "PARTNERS_LIST_CONFIG").map((a) => (
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
                        // Send email notification to all members
                        try {
                          await supabase.functions.invoke("send-notification", {
                            body: { type: "new_announcement", title: announcementForm.title, message: announcementForm.message },
                          });
                        } catch (e) { console.error("Notification error:", e); }
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
          {/* ════════ Messages Tab ════════ */}
          {tab === "messages" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Contact Messages</h3>
                <span className="text-sm text-muted-foreground">{contactMessages.filter(m => m.status === 'new').length} new</span>
              </div>

              {contactMessages.length === 0 && (
                <p className="text-muted-foreground text-center py-12">No contact messages yet.</p>
              )}

              <div className="space-y-3">
                {contactMessages.map((msg) => (
                  <div key={msg.id} className={`border rounded-xl p-4 ${msg.status === 'new' ? 'bg-primary/5 border-primary/30' : 'bg-secondary/30 border-border/40'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{msg.subject}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            msg.status === 'new' ? 'bg-primary/20 text-primary' :
                            msg.status === 'replied' ? 'bg-green-500/20 text-green-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>{msg.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          From: <span className="text-foreground">{msg.name}</span> ({msg.email}) · {new Date(msg.created_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{msg.message}</p>

                        {msg.admin_reply && (
                          <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-xs text-primary font-medium mb-1">Admin Reply · {msg.replied_at ? new Date(msg.replied_at).toLocaleString() : ''}</p>
                            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{msg.admin_reply}</p>
                          </div>
                        )}

                        {replyingMessageId === msg.id && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your reply..."
                              rows={3}
                              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                disabled={sendingReply || !replyText.trim()}
                                onClick={async () => {
                                  setSendingReply(true);
                                  try {
                                    // Update DB
                                    await supabase.from("contact_messages").update({
                                      admin_reply: replyText,
                                      replied_at: new Date().toISOString(),
                                      replied_by: user?.id,
                                      status: 'replied',
                                    }).eq("id", msg.id);

                                    // Send reply email
                                    await supabase.functions.invoke("send-notification", {
                                      body: {
                                        type: "contact_reply",
                                        to_email: msg.email,
                                        to_name: msg.name,
                                        original_subject: msg.subject,
                                        reply_message: replyText,
                                      },
                                    });

                                    toast.success("Reply sent successfully!");
                                    setReplyingMessageId(null);
                                    setReplyText("");
                                    fetchData();
                                  } catch (err) {
                                    toast.error("Failed to send reply");
                                    console.error(err);
                                  } finally {
                                    setSendingReply(false);
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                <Send size={14} /> {sendingReply ? "Sending..." : "Send Reply"}
                              </button>
                              <button
                                onClick={() => { setReplyingMessageId(null); setReplyText(""); }}
                                className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
                              >Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {msg.status === 'new' && (
                          <button onClick={async () => {
                            await supabase.from("contact_messages").update({ status: 'read' }).eq("id", msg.id);
                            fetchData();
                          }} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Mark as read">
                            <Eye size={14} />
                          </button>
                        )}
                        <button onClick={() => { setReplyingMessageId(msg.id); setReplyText(msg.admin_reply || ""); }} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="Reply">
                          <Reply size={14} />
                        </button>
                        <button onClick={async () => {
                          await supabase.from("contact_messages").delete().eq("id", msg.id);
                          fetchData();
                          toast.success("Message deleted");
                        }} className="p-2 rounded-lg hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ Reports Tab ════════ */}
          {tab === "reports" && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="p-4 rounded-xl glass flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">From</label>
                  <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">To</label>
                  <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className={inputClass} />
                </div>
                <button onClick={() => fetchData()} className="px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                  Apply Range
                </button>
                {(() => {
                  const memRev = (reportData.membership || []).filter((p: any) => p.payment_status === "verified").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                  const evRev = (reportData.events || []).filter((r: any) => r.payment_status === "confirmed").reduce((s: number, r: any) => s + Number(r.events?.registration_fee || reportData.eventMap?.[r.event_id]?.registration_fee || 0), 0);
                  const crRev = (reportData.courses || []).filter((r: any) => r.payment_status === "confirmed" || r.payment_status === "verified").reduce((s: number, r: any) => s + Number(reportData.courseMap?.[r.course_id]?.price || 0), 0);
                  const total = memRev + evRev + crRev;
                  return (
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Stat label="Membership Revenue" value={`৳${memRev}`} color="text-primary" />
                      <Stat label="Event Revenue" value={`৳${evRev}`} color="text-accent" />
                      <Stat label="Course Revenue" value={`৳${crRev}`} color="text-green-400" />
                      <Stat label="Total Revenue" value={`৳${total}`} color="text-primary" />
                    </div>
                  );
                })()}
              </div>

              {/* Membership payments report */}
              <div className="p-5 rounded-xl glass">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">Membership Payments ({(reportData.membership || []).length})</h3>
                  <button onClick={() => downloadCSV((reportData.membership || []).map((p: any) => ({ created_at: p.created_at, amount: String(p.amount || 0), method: p.payment_method, status: p.payment_status, txn: p.transaction_id || "" })), `membership_payments_${reportFrom}_${reportTo}.csv`)} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-1">
                    <Download size={12} /> CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground border-b border-border/50"><th className="py-2 pr-2">Date</th><th className="py-2 pr-2">Amount</th><th className="py-2 pr-2">Method</th><th className="py-2 pr-2">Status</th><th className="py-2">Txn ID</th></tr></thead>
                    <tbody>
                      {(reportData.membership || []).slice(0, 50).map((p: any) => (
                        <tr key={p.id} className="border-b border-border/20">
                          <td className="py-2 pr-2">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="py-2 pr-2">৳{p.amount}</td>
                          <td className="py-2 pr-2">{p.payment_method}</td>
                          <td className="py-2 pr-2"><span className={`px-2 py-0.5 rounded ${p.payment_status === "verified" ? "bg-green-500/10 text-green-400" : p.payment_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"}`}>{p.payment_status}</span></td>
                          <td className="py-2 font-mono">{p.transaction_id || "—"}</td>
                        </tr>
                      ))}
                      {(reportData.membership || []).length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No membership payments in range</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Event registrations report */}
              <div className="p-5 rounded-xl glass">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">Event Registrations ({(reportData.events || []).length})</h3>
                  <button onClick={() => downloadCSV((reportData.events || []).map((r: any) => ({ date: r.registered_at, event: r.events?.title || "", name: r.name || "", email: r.email || "", method: r.payment_method || "free", status: r.payment_status, approval: r.approval_status })), `event_registrations_${reportFrom}_${reportTo}.csv`)} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-1">
                    <Download size={12} /> CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground border-b border-border/50"><th className="py-2 pr-2">Date</th><th className="py-2 pr-2">Event</th><th className="py-2 pr-2">Name</th><th className="py-2 pr-2">Method</th><th className="py-2 pr-2">Approval</th><th className="py-2">Payment</th></tr></thead>
                    <tbody>
                      {(reportData.events || []).slice(0, 50).map((r: any) => (
                        <tr key={r.id} className="border-b border-border/20">
                          <td className="py-2 pr-2">{new Date(r.registered_at).toLocaleDateString()}</td>
                          <td className="py-2 pr-2 truncate max-w-[180px]">{r.events?.title || "—"}</td>
                          <td className="py-2 pr-2">{r.name || "—"}</td>
                          <td className="py-2 pr-2">{r.payment_method || "free"}</td>
                          <td className="py-2 pr-2"><span className={`px-2 py-0.5 rounded ${r.approval_status === "approved" ? "bg-green-500/10 text-green-400" : r.approval_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400"}`}>{r.approval_status}</span></td>
                          <td className="py-2"><span className={`px-2 py-0.5 rounded ${r.payment_status === "confirmed" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{r.payment_status}</span></td>
                        </tr>
                      ))}
                      {(reportData.events || []).length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No event registrations in range</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Course enrollments report */}
              <div className="p-5 rounded-xl glass">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">Course Enrollments ({(reportData.courses || []).length})</h3>
                  <button onClick={() => downloadCSV((reportData.courses || []).map((r: any) => ({ date: r.registered_at, course: reportData.courseMap?.[r.course_id]?.title || r.course_id, method: r.payment_method || "free", status: r.payment_status, completed: r.completed ? "yes" : "no" })), `course_enrollments_${reportFrom}_${reportTo}.csv`)} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-1">
                    <Download size={12} /> CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground border-b border-border/50"><th className="py-2 pr-2">Date</th><th className="py-2 pr-2">Course</th><th className="py-2 pr-2">Method</th><th className="py-2 pr-2">Payment</th><th className="py-2">Completed</th></tr></thead>
                    <tbody>
                      {(reportData.courses || []).slice(0, 50).map((r: any) => (
                        <tr key={r.id} className="border-b border-border/20">
                          <td className="py-2 pr-2">{new Date(r.registered_at).toLocaleDateString()}</td>
                          <td className="py-2 pr-2 truncate max-w-[200px]">{reportData.courseMap?.[r.course_id]?.title || "—"}</td>
                          <td className="py-2 pr-2">{r.payment_method || "free"}</td>
                          <td className="py-2 pr-2">
                            <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                              r.payment_status === "confirmed" ? "bg-green-500/10 text-green-400" :
                              r.payment_status === "rejected" ? "bg-destructive/10 text-destructive" :
                              r.payment_status === "unpaid" ? "bg-amber-500/10 text-amber-400" :
                              "bg-yellow-500/10 text-yellow-400"
                            }`}>{r.payment_status || "unpaid"}</span>
                          </td>
                          <td className="py-2">{r.completed ? <span className="text-green-400">✓</span> : "—"}</td>
                        </tr>
                      ))}
                      {(reportData.courses || []).length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No course enrollments in range</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Activity log */}
              <div className="p-5 rounded-xl glass">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-bold tracking-wider text-primary">Admin Activity Log ({(reportData.activity || []).length})</h3>
                  <button onClick={() => downloadCSV((reportData.activity || []).map((a: any) => ({ time: a.created_at, action: a.action, entity: a.entity_type || "", entity_id: a.entity_id || "", details: JSON.stringify(a.details || {}) })), `activity_log_${reportFrom}_${reportTo}.csv`)} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-1">
                    <Download size={12} /> CSV
                  </button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(reportData.activity || []).map((a: any) => (
                    <div key={a.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-secondary/30 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{a.action}</p>
                        <p className="text-muted-foreground truncate">{a.entity_type || "—"} {a.entity_id ? `· ${a.entity_id.slice(0, 8)}` : ""} · {JSON.stringify(a.details || {})}</p>
                      </div>
                      <span className="text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                  {(reportData.activity || []).length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No admin activity recorded in this range.</p>}
                </div>
              </div>
            </div>
          )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

const Stat = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="p-3 rounded-lg bg-secondary/40 text-center">
    <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{label}</p>
  </div>
);

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

// ─── Participant Row Component ───
interface ParticipantRowProps {
  reg: any;
  showEvent: boolean;
  onApprove: () => void;
  onReject: () => void;
  onPending: () => void;
  onDelete: () => void;
  onPaymentConfirm: () => void;
}

const ParticipantRow = ({ reg, showEvent, onApprove, onReject, onPending, onDelete, onPaymentConfirm }: ParticipantRowProps) => {
  const approvalColor =
    reg.approval_status === "approved" ? "bg-green-500/10 text-green-400" :
    reg.approval_status === "rejected" ? "bg-red-500/10 text-red-400" :
    "bg-yellow-500/10 text-yellow-400";
  const paymentColor =
    reg.payment_status === "confirmed" ? "bg-green-500/10 text-green-400" :
    reg.payment_status === "unpaid" ? "bg-red-500/10 text-red-400" :
    "bg-yellow-500/10 text-yellow-400";

  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          {showEvent && reg.events?.title && (
            <p className="text-[11px] font-mono text-primary mb-1 truncate">📅 {reg.events.title}</p>
          )}
          <p className="text-sm font-medium text-foreground truncate">{reg.name || "Unnamed"}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
            {reg.email && <span>✉ {reg.email}</span>}
            {reg.phone && <span>📞 {reg.phone}</span>}
            {reg.department && <span>🎓 {reg.department}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${approvalColor}`}>
              {reg.approval_status}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${paymentColor}`}>
              💳 {reg.payment_status}
            </span>
            {reg.payment_method && (
              <span className="text-[10px] text-muted-foreground">
                {reg.payment_method}{reg.transaction_id ? ` · ${reg.transaction_id}` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {reg.approval_status !== "approved" && (
            <button
              onClick={onApprove}
              className="px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors flex items-center gap-1"
              title="Approve"
            >
              <Check size={12} /> Approve
            </button>
          )}
          {reg.approval_status !== "rejected" && (
            <button
              onClick={onReject}
              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors flex items-center gap-1"
              title="Reject"
            >
              <X size={12} /> Reject
            </button>
          )}
          {reg.approval_status !== "pending" && (
            <button
              onClick={onPending}
              className="px-2.5 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs font-semibold hover:bg-yellow-500/20 transition-colors flex items-center gap-1"
              title="Mark pending"
            >
              <Clock size={12} />
            </button>
          )}
          {reg.payment_status !== "confirmed" && reg.payment_method && (
            <button
              onClick={onPaymentConfirm}
              className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1"
              title="Confirm payment"
            >
              💳 Confirm
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
