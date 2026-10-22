import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Linkedin,
  Github,
  Mail,
  Filter,
  Phone,
  Sparkles,
  History,
  Users,
  GraduationCap,
  ChevronDown,
  ArrowRight,
  Crown,
  Shield,
  Award,
  Briefcase,
  UserCheck,
  Layers,
  Pencil,
} from "lucide-react";
import {
  groupMembersByTier,
  EXECUTIVE_TIERS,
  type ExecutiveTier,
  type TierGroup,
} from "@/lib/teamHierarchy";

interface SessionOption {
  id: string;
  label: string;
  years: string;
  isCurrent?: boolean;
}

// Preset committee terms / sessions (1st was 2023-2024, current is 3rd: 2025-2026)
const COMMITTEE_SESSIONS: SessionOption[] = [
  { id: "current", label: "3rd Executive (2025-2026)", years: "2025-2026", isCurrent: true },
];

const isAdvisoryCategory = (category?: string | null) => {
  if (!category) return false;
  const lower = category.toLowerCase();
  return lower.includes("advisor") || lower.includes("advisory");
};

const memberMatchesSession = (member: any, sessionId: string, board: "executive" | "advisory") => {
  const cat = (member.category || (board === "advisory" ? "Advisory Board" : "Executive Board")).trim();
  const lower = cat.toLowerCase();

  // If looking for executive board, member must not be advisory
  if (board === "executive" && isAdvisoryCategory(cat)) return false;
  // If looking for advisory board, member must be advisory
  if (board === "advisory" && !isAdvisoryCategory(cat)) return false;

  if (sessionId === "current") {
    const isExplicitPast =
      lower.includes("1st") ||
      lower.includes("2nd") ||
      lower.includes("first") ||
      lower.includes("second") ||
      lower.includes("2023-2024") ||
      lower.includes("2024-2025") ||
      lower.includes("founding") ||
      lower.includes("previous");

    if (lower.includes("current") || lower.includes("3rd") || lower.includes("third") || lower.includes("2025-2026")) return true;
    if (board === "executive" && (cat === "Executive Board" || cat === "Executive Committee")) return true;
    if (board === "advisory" && cat === "Advisory Board") return true;

    return !isExplicitPast;
  }

  if (sessionId === "2nd") {
    return lower.includes("2nd") || lower.includes("second") || lower.includes("2024-2025");
  }
  if (sessionId === "1st") {
    return lower.includes("1st") || lower.includes("first") || lower.includes("2023-2024");
  }

  return cat === sessionId || lower.includes(sessionId.toLowerCase());
};

const getTierIcon = (tierId: string) => {
  switch (tierId) {
    case "president":
      return <Crown size={18} className="text-[#2de2c9]" />;
    case "vice_president":
      return <Shield size={18} className="text-[#00d2ff]" />;
    case "general_secretary":
      return <Award size={18} className="text-[#2de2c9]" />;
    case "assistant_general_secretary":
      return <Award size={18} className="text-[#38bdf8]" />;
    case "secretary":
      return <Briefcase size={18} className="text-[#c084fc]" />;
    case "assistant_secretary":
      return <UserCheck size={18} className="text-[#818cf8]" />;
    case "executive_member":
      return <Sparkles size={18} className="text-[#34d399]" />;
    default:
      return <Users size={18} className="text-[#94a3b8]" />;
  }
};

interface MemberCardProps {
  member: any;
  tierId: string;
  isSpotlight?: boolean;
  currentSessionLabel: string;
  index: number;
}

const MemberCard = ({
  member,
  tierId,
  isSpotlight = false,
  currentSessionLabel,
  index,
}: MemberCardProps) => {
  const isLeader = tierId === "president" || tierId === "general_secretary" || isSpotlight;

  return (
    <motion.div
      key={member.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.35) }}
      className={`relative text-center transition-all duration-300 group select-none flex flex-col justify-between overflow-hidden ${
        isLeader
          ? "p-4 sm:p-7 bg-[#071322]/95 hover:bg-[#0b1c30] border-2 border-[#2de2c9]/70 hover:border-[#00d2ff] shadow-[0_4px_24px_rgba(0,0,0,0.7),0_0_24px_rgba(45,226,201,0.28)] hover:shadow-[0_4px_32px_rgba(0,0,0,0.85),0_0_36px_rgba(45,226,201,0.45)]"
          : tierId === "vice_president"
          ? "p-3 sm:p-6 bg-[#071322]/90 hover:bg-[#0b1c30] border border-[#00d2ff]/50 hover:border-[#00d2ff] shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_18px_rgba(0,210,255,0.2)] hover:shadow-[0_4px_28px_rgba(0,0,0,0.8),0_0_24px_rgba(0,210,255,0.35)]"
          : tierId === "assistant_general_secretary"
          ? "p-3 sm:p-5 bg-[#071322]/88 hover:bg-[#0a192c] border border-[#38bdf8]/45 hover:border-[#38bdf8] shadow-[0_4px_18px_rgba(0,0,0,0.6),0_0_15px_rgba(56,189,248,0.18)]"
          : tierId === "secretary"
          ? "p-3 sm:p-5 bg-[#071322]/88 hover:bg-[#0a192c] border border-[#a855f7]/45 hover:border-[#c084fc] shadow-[0_4px_18px_rgba(0,0,0,0.6),0_0_15px_rgba(168,85,247,0.18)]"
          : tierId === "assistant_secretary"
          ? "p-3 sm:p-5 bg-[#071322]/88 hover:bg-[#0a192c] border border-[#6366f1]/45 hover:border-[#818cf8] shadow-[0_4px_18px_rgba(0,0,0,0.6),0_0_15px_rgba(99,102,241,0.18)]"
          : tierId === "executive_member"
          ? "p-3 sm:p-5 bg-[#071322]/88 hover:bg-[#0a192c] border border-[#10b981]/45 hover:border-[#34d399] shadow-[0_4px_18px_rgba(0,0,0,0.6),0_0_15px_rgba(16,185,129,0.18)]"
          : "p-3 sm:p-5 bg-[#071322]/88 hover:bg-[#0a192c] border border-[#2de2c9]/35 hover:border-[#2de2c9] shadow-[0_4px_18px_rgba(0,0,0,0.6),0_0_15px_rgba(45,226,201,0.15)]"
      }`}
      style={{
        clipPath: isLeader
          ? "polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)"
          : "polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)",
      }}
    >
      {/* Micro-Circuit Bus Grid inside Package (Explore Projects Button DNA) */}
      <div
        className="absolute inset-0 opacity-15 group-hover:opacity-35 pointer-events-none transition-opacity"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(45,226,201,0.2) 1px, transparent 1px), linear-gradient(rgba(45,226,201,0.2) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      />

      {/* IC Package Corner Tech Brackets */}
      <span className="absolute top-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-t-2 border-r-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
      <span className="absolute bottom-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-b-2 border-l-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />

      {/* IC Pin Socket Notch (No text) */}
      <span className="chip-pin-1 absolute top-2 left-2 sm:top-3 sm:left-3 z-20 pointer-events-none" />

      {/* Sort Order / IC Model Number */}
      {typeof member.sort_order === "number" && member.sort_order > 0 && (
        <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded bg-[#031526]/90 text-[#2de2c9] border border-[#2de2c9]/40 group-hover:border-[#00d2ff] transition-colors shadow-sm">
          #{String(member.sort_order).padStart(2, "0")}
        </span>
      )}

      <div className="relative z-10 pt-2 sm:pt-4">
        {/* Avatar with Glowing Concentric Cyber Ring */}
        <div className="relative mx-auto mb-2 sm:mb-3.5 inline-block">
          <div
            className={`absolute -inset-1 rounded-full opacity-60 group-hover:opacity-100 transition-all blur-sm ${
              isLeader
                ? "bg-gradient-to-r from-[#2de2c9] via-[#00d2ff] to-[#38bdf8]"
                : tierId === "vice_president"
                ? "bg-[#00d2ff]"
                : "bg-[#2de2c9]/50"
            }`}
          />
          {member.image_url ? (
            <img
              src={getOptimizedImageUrl(member.image_url, {
                width: isLeader ? 120 : 96,
                height: isLeader ? 120 : 96,
              })}
              alt={member.name}
              className={`relative rounded-full object-cover border-2 transition-all ${
                isLeader
                  ? "w-16 h-16 sm:w-28 sm:h-28 border-[#2de2c9] shadow-[0_0_18px_rgba(45,226,201,0.4)]"
                  : tierId === "vice_president"
                  ? "w-14 h-14 sm:w-20 sm:h-20 border-[#00d2ff] shadow-[0_0_14px_rgba(0,210,255,0.3)]"
                  : "w-12 h-12 sm:w-20 sm:h-20 border-[#2de2c9]/60 group-hover:border-[#2de2c9]"
              }`}
              loading="lazy"
            />
          ) : (
            <div
              className={`relative rounded-full bg-[#05111e] flex items-center justify-center border-2 transition-all ${
                isLeader
                  ? "w-16 h-16 sm:w-28 sm:h-28 border-[#2de2c9] shadow-[0_0_18px_rgba(45,226,201,0.35)]"
                  : tierId === "vice_president"
                  ? "w-14 h-14 sm:w-20 sm:h-20 border-[#00d2ff] shadow-[0_0_14px_rgba(0,210,255,0.25)]"
                  : "w-12 h-12 sm:w-20 sm:h-20 border-[#2de2c9]/60 group-hover:border-[#2de2c9]"
              }`}
            >
              <span
                className={`font-display font-bold text-[#2de2c9] ${
                  isLeader ? "text-lg sm:text-2xl" : "text-sm sm:text-xl"
                }`}
              >
                {member.name
                  ? member.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                  : "—"}
              </span>
            </div>
          )}
        </div>

        {/* Member Name */}
        <h3
          className={`font-semibold text-foreground transition-colors ${
            isLeader
              ? "text-sm sm:text-lg font-bold group-hover:text-[#2de2c9]"
              : "text-xs sm:text-base font-semibold group-hover:text-primary leading-tight"
          }`}
        >
          {member.name}
        </h3>

        {/* Designation / Position with IC Chip-Shape Cut */}
        <div className="mt-1.5 sm:mt-2.5 mb-1 sm:mb-1.5 flex justify-center">
          <span
            className={`chip-shape inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 sm:px-3 sm:py-1 tracking-tight sm:tracking-wide max-w-full truncate ${
              isLeader
                ? "bg-[#2de2c9]/20 text-[#2de2c9] border border-[#2de2c9]/50 shadow-[0_0_12px_rgba(45,226,201,0.25)]"
                : tierId === "vice_president"
                ? "bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40 shadow-[0_0_10px_rgba(0,210,255,0.2)]"
                : tierId === "assistant_general_secretary"
                ? "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/35"
                : tierId === "secretary"
                ? "bg-[#a855f7]/15 text-[#c084fc] border border-[#a855f7]/35"
                : tierId === "assistant_secretary"
                ? "bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/35"
                : tierId === "executive_member"
                ? "bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/35"
                : "bg-[#2de2c9]/10 text-[#2de2c9] border border-[#2de2c9]/30"
            }`}
          >
            {tierId === "president" && <Crown size={11} className="text-[#2de2c9]" />}
            {tierId === "general_secretary" && <Award size={11} className="text-[#2de2c9]" />}
            {member.position}
          </span>
        </div>

        {/* Department & Batch / Series */}
        {(member.department || member.batch) && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-1.5 line-clamp-1">
            {member.department && <span className="font-medium text-foreground/85">{member.department}</span>}
            {member.department && member.batch && " · "}
            {member.batch && <span>Series {member.batch}</span>}
          </p>
        )}

        {/* Bio / Quote (if any) */}
        {member.bio && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2 leading-tight sm:leading-relaxed line-clamp-2 sm:line-clamp-3">
            {member.bio}
          </p>
        )}
      </div>

      {/* Bottom I/O Bus Terminal: Social & Contact */}
      <div className={`relative z-10 mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-[#2de2c9]/20 bg-[#040d18]/60 ${isLeader ? "-mx-4 -mb-4 sm:-mx-7 sm:-mb-7" : "-mx-3 -mb-3 sm:-mx-5 sm:-mb-5"} px-2 py-1.5 sm:px-4 sm:py-3`}>
        <div className="flex justify-center items-center gap-2 sm:gap-3">
          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-[#2de2c9] transition-colors p-0.5 sm:p-1"
              title="LinkedIn"
            >
              <Linkedin size={13} className="sm:w-[15px] sm:h-[15px]" />
            </a>
          )}
          {member.github && (
            <a
              href={member.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-[#2de2c9] transition-colors p-0.5 sm:p-1"
              title="GitHub"
            >
              <Github size={13} className="sm:w-[15px] sm:h-[15px]" />
            </a>
          )}
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="text-muted-foreground hover:text-[#2de2c9] transition-colors p-0.5 sm:p-1"
              title="Email"
            >
              <Mail size={13} className="sm:w-[15px] sm:h-[15px]" />
            </a>
          )}
          {member.phone && (
            <a
              href={`tel:${member.phone}`}
              className="text-muted-foreground hover:text-[#2de2c9] transition-colors p-0.5 sm:p-1"
              title="Call"
            >
              <Phone size={13} className="sm:w-[15px] sm:h-[15px]" />
            </a>
          )}
        </div>

        {member.phone && (
          <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-1 sm:mt-1.5 font-mono">{member.phone}</p>
        )}
      </div>
    </motion.div>
  );
};

const Team = () => {
  const { isAdmin, isModerator } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active board: "executive" | "advisory" | "members"
  const [activeBoard, setActiveBoard] = useState<"executive" | "advisory" | "members">("executive");

  // Selected committee session (e.g., "current", "7th", "6th", ..., "1st")
  const [selectedSessionId, setSelectedSessionId] = useState<string>("current");

  // Selected tier filter ('all' or specific tier ID like 'president_gs', 'vice_president', etc.)
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("all");

  // Members directory search & filters (admin view)
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      const [teamRes, membersRes] = await Promise.all([
        supabase.from("team_members").select("*").order("sort_order", { ascending: true }),
        supabase.rpc("get_public_members"),
      ]);
      setTeam(teamRes.data || []);
      setMembers(membersRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Dynamically include any custom sessions stored in database
  const allSessions = useMemo(() => {
    const list = [...COMMITTEE_SESSIONS];
    const customSessions = new Set<string>();

    team.forEach((m) => {
      const cat = m.category;
      if (!cat) return;
      const board = isAdvisoryCategory(cat) ? "advisory" : "executive";
      const matchesPreset = list.some((p) => memberMatchesSession(m, p.id, board));
      if (!matchesPreset) customSessions.add(cat);
    });

    customSessions.forEach((cat) => {
      list.push({ id: cat, label: cat, years: "" });
    });

    return list;
  }, [team]);

  // Handle clicking Executive Board button
  const handleSelectExecutive = () => {
    setActiveBoard("executive");
  };

  // Handle clicking Advisory Board button
  const handleSelectAdvisory = () => {
    setActiveBoard("advisory");
  };

  // Handle dropdown selection (selects session / year)
  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    if (activeBoard === "members") {
      setActiveBoard("executive");
    }
  };

  // Filter members by the selected Board and Session
  const boardMembers = useMemo(() => {
    if (activeBoard === "members") return [];
    return team.filter((m) => memberMatchesSession(m, selectedSessionId, activeBoard));
  }, [team, activeBoard, selectedSessionId]);

  // Group executive members hierarchically into rank-ordered tiers
  const tierGroups = useMemo(() => {
    if (activeBoard !== "executive") return [];
    return groupMembersByTier(boardMembers);
  }, [activeBoard, boardMembers]);

  // Reset tier filter whenever board or session changes
  useEffect(() => {
    setSelectedTierFilter("all");
  }, [activeBoard, selectedSessionId]);

  // Tiers to display (either all or filtered down to a selected tier)
  const displayedTierGroups = useMemo(() => {
    if (selectedTierFilter === "all") return tierGroups;
    return tierGroups.filter((g) => g.tier.id === selectedTierFilter);
  }, [tierGroups, selectedTierFilter]);

  // Directory filter for registered club members (admin view)
  const departments = useMemo(() => [...new Set(members.map((m) => m.department).filter(Boolean))].sort(), [members]);
  const seriesList = useMemo(() => [...new Set(members.map((m) => m.batch).filter(Boolean))].sort(), [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.full_name?.toLowerCase().includes(q) ||
        m.student_id?.toLowerCase().includes(q) ||
        m.membership_id?.toLowerCase().includes(q);
      const matchesDept = !deptFilter || m.department === deptFilter;
      const matchesSeries = !seriesFilter || m.batch === seriesFilter;
      return matchesSearch && matchesDept && matchesSeries;
    });
  }, [members, search, deptFilter, seriesFilter]);

  const currentSessionLabel = useMemo(() => {
    const session = allSessions.find((s) => s.id === selectedSessionId);
    const years = session?.years ? ` (${session.years})` : "";
    const baseName = session?.id === "current" ? "Current" : session?.id || "";

    if (activeBoard === "executive") {
      if (selectedSessionId === "current") return "Current Executive Board";
      return `${baseName} Executive Board${years}`;
    } else if (activeBoard === "advisory") {
      if (selectedSessionId === "current") return "Current Advisory Board";
      if (selectedSessionId === "1st") return `Founding Advisory Board${years}`;
      return `Advisory Board${years ? ` ${years}` : ` (${baseName})`}`;
    }
    return session?.label || selectedSessionId;
  }, [activeBoard, selectedSessionId, allSessions]);

  const selectClass =
    "px-3 py-2 chip-shape bg-secondary border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Layout>
      <SEO
        title="Team & Leadership | RUET IoT Club"
        description="Meet the Executive Board, Advisory Board, and leadership of RUET IoT Club."
        path="/team"
      />
      <section className="py-24">
        <div className="container max-w-6xl">
          <SectionHeading
            title="Team & Leadership"
            subtitle="Meet the executive committee, advisory mentors, and leadership driving RUET IoT Club"
          />

          {/* ── 3 Main Controls in One Sleek Unified Row ── */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {/* 1. Executive Board button */}
            <button
              type="button"
              onClick={handleSelectExecutive}
              className={`h-11 px-6 chip-shape text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeBoard === "executive"
                  ? "bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold shadow-[0_2px_16px_rgba(45,226,201,0.45)]"
                  : "bg-[#071322]/85 text-muted-foreground border border-[#2de2c9]/30 hover:text-foreground hover:border-[#2de2c9]/70"
              }`}
            >
              <Sparkles size={16} />
              Executive Board
            </button>

            {/* 2. Advisory Board button */}
            <button
              type="button"
              onClick={handleSelectAdvisory}
              className={`h-11 px-6 chip-shape text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeBoard === "advisory"
                  ? "bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold shadow-[0_2px_16px_rgba(45,226,201,0.45)]"
                  : "bg-[#071322]/85 text-muted-foreground border border-[#2de2c9]/30 hover:text-foreground hover:border-[#2de2c9]/70"
              }`}
            >
              <GraduationCap size={16} />
              Advisory Board
            </button>

            {/* 3. Dropdown right beside them with unified terms / years */}
            <div className="relative min-w-[200px] sm:min-w-[230px]">
              <select
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="h-11 w-full appearance-none pl-4 pr-9 rounded-xl text-xs sm:text-sm font-mono font-medium bg-[#071322]/95 border border-[#2de2c9]/45 text-foreground hover:border-[#2de2c9] focus:outline-none focus:ring-2 focus:ring-[#2de2c9]/50 cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
              >
                {allSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.isCurrent ? `● ${s.label}` : s.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2de2c9] pointer-events-none" />
            </div>

            {/* Admin and Moderator: Members directory */}
            {(isAdmin || isModerator) && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveBoard("members")}
                  className={`h-11 px-4 chip-shape text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    activeBoard === "members"
                      ? "bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold shadow-[0_2px_14px_rgba(45,226,201,0.45)]"
                      : "bg-[#071322]/70 text-muted-foreground border border-[#2de2c9]/20 hover:text-foreground hover:border-[#2de2c9]/50"
                  }`}
                >
                  <Users size={14} />
                  Members ({members.length})
                </button>
                <Link
                  to="/admin?tab=team"
                  className="h-11 px-4 chip-shape text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-1.5 bg-[#071322]/85 text-[#2de2c9] border border-[#2de2c9]/40 hover:bg-[#2de2c9]/15 hover:border-[#2de2c9] shadow-sm"
                  title="Open Team Management in Admin Dashboard"
                >
                  <Pencil size={13} />
                  Edit / Add Members
                </Link>
              </>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 chip-shape bg-secondary/30 border border-border/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div
              key={`${activeBoard}-${selectedSessionId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {activeBoard === "members" ? (
                /* ── Members Directory (Admins Only) ── */
                <>
              <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto mb-10">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, student ID, or membership ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectClass}>
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d!}>{d}</option>
                  ))}
                </select>
                <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)} className={selectClass}>
                  <option value="">All Series</option>
                  {seriesList.map((b) => (
                    <option key={b} value={b!}>{b}</option>
                  ))}
                </select>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Filter size={40} className="mx-auto mb-4 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    {members.length === 0 ? "No approved members yet." : "No members match your filters."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground text-center mb-6 font-mono">
                    Showing {filteredMembers.length} of {members.length} members
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredMembers.map((member, i) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: Math.min(i * 0.03, 0.5) }}
                        className="relative p-5 chip-card border border-[#2de2c9]/20 hover:border-[#2de2c9]/60 text-center transition-all duration-300 group overflow-hidden select-none"
                      >
                        <span className="chip-pin-1 absolute top-2.5 left-2.5 z-20" />
                        <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                        <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
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
                              {member.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </span>
                          </div>
                        )}
                        <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors leading-tight">
                          {member.full_name}
                        </h3>
                        {member.department && <p className="text-xs font-mono text-primary mt-1">{member.department}</p>}
                        {member.student_id && <p className="text-[11px] text-muted-foreground mt-0.5">ID: {member.student_id}</p>}
                        {(member.batch || member.session) && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {member.batch && `Series: ${member.batch}`}
                            {member.batch && member.session && " · "}
                            {member.session && member.session}
                          </p>
                        )}
                        {member.membership_id && <p className="text-[10px] font-mono text-accent mt-1">{member.membership_id}</p>}
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            /* ── Executive / Advisory Board Grid ── */
            <>
              {/* Team Members Grid or Archived Empty State */}
              {boardMembers.length === 0 ? (
                <div className="text-center py-16 px-6 max-w-lg mx-auto rounded-2xl bg-[#081524]/60 border border-[#2de2c9]/25 backdrop-blur-sm shadow-xl">
                  <div className="w-14 h-14 rounded-full bg-[#2de2c9]/10 border border-[#2de2c9]/30 flex items-center justify-center mx-auto mb-4 text-[#2de2c9]">
                    <History size={28} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1.5">
                    {currentSessionLabel}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    Records for {currentSessionLabel} will be archived here soon. Club admins can add executive members for this term from the Admin Dashboard.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedSessionId("current");
                    }}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-semibold text-xs inline-flex items-center gap-1.5 shadow-[0_0_16px_rgba(45,226,201,0.35)]"
                  >
                    View Current {activeBoard === "executive" ? "Executive Board" : "Advisory Board"} <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-8 sm:space-y-12">
                  <div className="hidden sm:flex items-center justify-between text-xs text-muted-foreground font-mono mb-2">
                    <span>
                      {boardMembers.length} {activeBoard === "executive" ? "Executive Members" : "Advisors"}
                    </span>
                  </div>

                  {activeBoard === "executive" ? (
                    /* ── Executive Hierarchical Tiers ── */
                    <div className="space-y-8 sm:space-y-12">
                      {/* Tier Quick Filter / Jump Bar (Hidden on Mobile) */}
                      {tierGroups.length > 1 && (
                        <div className="hidden sm:flex items-center justify-center gap-2 flex-wrap mb-8">
                          <button
                            type="button"
                            onClick={() => setSelectedTierFilter("all")}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                              selectedTierFilter === "all"
                                ? "bg-[#2de2c9] text-[#050b14] font-bold shadow-[0_0_12px_rgba(45,226,201,0.4)]"
                                : "bg-[#071322]/80 text-muted-foreground border border-border/40 hover:text-foreground hover:border-[#2de2c9]/50"
                            }`}
                          >
                            All ({boardMembers.length})
                          </button>
                          {tierGroups.map((group) => {
                            const isSelected = selectedTierFilter === group.tier.id;
                            return (
                              <button
                                key={group.tier.id}
                                type="button"
                                onClick={() => setSelectedTierFilter(group.tier.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-[#2de2c9] text-[#050b14] font-bold shadow-[0_0_12px_rgba(45,226,201,0.4)]"
                                    : "bg-[#071322]/80 text-muted-foreground border border-border/40 hover:text-foreground hover:border-[#2de2c9]/50"
                                }`}
                              >
                                {getTierIcon(group.tier.id)}
                                <span>{group.tier.shortTitle}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    isSelected
                                      ? "bg-black/25 text-black font-bold"
                                      : "bg-white/10 text-muted-foreground"
                                  }`}
                                >
                                  {group.members.length}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Render Each Tier in Strict Rank Order */}
                      {displayedTierGroups.map((group) => (
                        <div key={group.tier.id} className="space-y-4 sm:space-y-6">
                          {/* Clean Section Header (No redundant TIER text, description, or sub-labels) */}
                          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border/25">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                              <div
                                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br ${group.tier.gradient} border ${group.tier.borderColor} shadow-sm`}
                              >
                                {getTierIcon(group.tier.id)}
                              </div>
                              <div className="flex items-center gap-2">
                                <h3
                                  className={`font-display text-base sm:text-xl font-bold ${group.tier.textColor}`}
                                >
                                  {group.tier.title}
                                </h3>
                                <span className="text-xs font-mono text-muted-foreground">
                                  ({group.members.length})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Member cards grid (Compact on mobile) */}
                          <div
                            className={`grid gap-3 sm:gap-5 ${
                              group.tier.id === "president"
                                ? "grid-cols-1 max-w-xs sm:max-w-md mx-auto"
                                : group.tier.id === "general_secretary"
                                ? "grid-cols-1 max-w-xs sm:max-w-md mx-auto"
                                : group.tier.id === "vice_president"
                                ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
                                : group.tier.id === "assistant_general_secretary"
                                ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-6xl mx-auto"
                                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-6xl mx-auto"
                            }`}
                          >
                            {group.members.map((member, i) => (
                              <MemberCard
                                key={member.id}
                                member={member}
                                tierId={group.tier.id}
                                isSpotlight={group.tier.id === "president" || group.tier.id === "general_secretary"}
                                currentSessionLabel={currentSessionLabel}
                                index={i}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* ── Advisory Board Grid ── */
                    <div className="space-y-8">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pb-2 border-b border-border/30">
                        <span>
                          Showing {boardMembers.length} advisors · {currentSessionLabel}
                        </span>
                        <span className="text-[#2de2c9]">RUET IoT Club Advisory Panel</span>
                      </div>

                      <div
                        className={`grid gap-5 max-w-5xl mx-auto ${
                          boardMembers.length <= 2
                            ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
                            : boardMembers.length === 3
                            ? "grid-cols-1 sm:grid-cols-3 max-w-3xl"
                            : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        }`}
                      >
                        {boardMembers.map((member, i) => (
                          <MemberCard
                            key={member.id}
                            member={member}
                            tierId="other"
                            currentSessionLabel={currentSessionLabel}
                            index={i}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
            </motion.div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Team;
