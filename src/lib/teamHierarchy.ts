/**
 * teamHierarchy.ts — Core definition, classification, and data models
 * for hierarchical Executive Committee & Leadership representation.
 *
 * Ordered Tier Structure:
 * 1. President & General Secretary (President & GS)
 * 2. Vice Presidents (VP)
 * 3. Assistant General Secretaries (AGS)
 * 4. Secretaries (SEC)
 * 5. Assistant Secretaries (AS)
 * 6. Executive Members (EM)
 * 7. Mentors & Senior Leadership (Other)
 */

export type ExecutiveTier =
  | "president"
  | "vice_president"
  | "general_secretary"
  | "assistant_general_secretary"
  | "secretary"
  | "assistant_secretary"
  | "executive_member"
  | "other";

export interface TierConfig {
  id: ExecutiveTier;
  title: string;
  shortTitle: string;
  rank: number;
  gradient: string;
  borderColor: string;
  textColor: string;
  badgeClass: string;
  accentGlow: string;
  cardCols: string;
  description: string;
}

export const EXECUTIVE_TIERS: Record<ExecutiveTier, TierConfig> = {
  president: {
    id: "president",
    title: "President",
    shortTitle: "President",
    rank: 1,
    gradient: "from-[#2de2c9]/25 via-[#14b8a6]/20 to-[#10b981]/20",
    borderColor: "border-[#2de2c9]/70",
    textColor: "text-[#2de2c9]",
    badgeClass: "bg-[#2de2c9]/15 text-[#2de2c9] border-[#2de2c9]/45",
    accentGlow: "shadow-[0_0_24px_rgba(45,226,201,0.25)]",
    cardCols: "grid-cols-1 max-w-md mx-auto",
    description: "Club President & Executive Governance",
  },
  vice_president: {
    id: "vice_president",
    title: "Vice Presidents",
    shortTitle: "Vice Presidents",
    rank: 2,
    gradient: "from-[#a855f7]/20 to-[#c084fc]/20",
    borderColor: "border-[#c084fc]/50",
    textColor: "text-[#c084fc]",
    badgeClass: "bg-[#a855f7]/15 text-[#c084fc] border-[#a855f7]/35",
    accentGlow: "shadow-[0_0_18px_rgba(168,85,247,0.25)]",
    cardCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-sm sm:max-w-5xl mx-auto",
    description: "Wing Oversight, Strategy Alignment & Administrative Leadership",
  },
  general_secretary: {
    id: "general_secretary",
    title: "General Secretary",
    shortTitle: "General Secretary",
    rank: 3,
    gradient: "from-[#2de2c9]/20 via-[#14b8a6]/20 to-[#10b981]/20",
    borderColor: "border-[#2de2c9]/60",
    textColor: "text-[#2de2c9]",
    badgeClass: "bg-[#2de2c9]/15 text-[#2de2c9] border-[#2de2c9]/40",
    accentGlow: "shadow-[0_0_22px_rgba(45,226,201,0.22)]",
    cardCols: "grid-cols-1 max-w-md mx-auto",
    description: "Operational Secretariat, Administrative Execution & Coordination",
  },
  assistant_general_secretary: {
    id: "assistant_general_secretary",
    title: "Assistant General Secretaries",
    shortTitle: "Assistant General Secretaries",
    rank: 4,
    gradient: "from-[#14b8a6]/15 to-[#2dd4bf]/15",
    borderColor: "border-[#2dd4bf]/40",
    textColor: "text-[#2dd4bf]",
    badgeClass: "bg-[#14b8a6]/15 text-[#2dd4bf] border-[#14b8a6]/30",
    accentGlow: "shadow-[0_0_16px_rgba(45,212,191,0.18)]",
    cardCols: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-sm sm:max-w-6xl mx-auto",
    description: "Operational Management, Wing Execution & Member Mentoring",
  },
  secretary: {
    id: "secretary",
    title: "Secretaries",
    shortTitle: "Secretaries",
    rank: 5,
    gradient: "from-[#fb7185]/15 to-[#f43f5e]/15",
    borderColor: "border-[#fb7185]/40",
    textColor: "text-[#fb7185]",
    badgeClass: "bg-[#f43f5e]/15 text-[#fb7185] border-[#f43f5e]/30",
    accentGlow: "shadow-[0_0_16px_rgba(244,63,94,0.18)]",
    cardCols: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-sm sm:max-w-6xl mx-auto",
    description: "Departmental Secretariats, Wing Specialization & Projects",
  },
  assistant_secretary: {
    id: "assistant_secretary",
    title: "Assistant Secretaries",
    shortTitle: "Assistant Secretaries",
    rank: 6,
    gradient: "from-[#10b981]/15 to-[#34d399]/15",
    borderColor: "border-[#10b981]/40",
    textColor: "text-[#34d399]",
    badgeClass: "bg-[#10b981]/15 text-[#34d399] border-[#10b981]/30",
    accentGlow: "shadow-[0_0_16px_rgba(16,185,129,0.18)]",
    cardCols: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-sm sm:max-w-6xl mx-auto",
    description: "Activity Organization, Logistics Support & Event Coordination",
  },
  executive_member: {
    id: "executive_member",
    title: "Executive Members",
    shortTitle: "Executive Members",
    rank: 7,
    gradient: "from-[#14b8a6]/15 to-[#059669]/15",
    borderColor: "border-[#14b8a6]/40",
    textColor: "text-[#2dd4bf]",
    badgeClass: "bg-[#14b8a6]/15 text-[#2dd4bf] border-[#14b8a6]/30",
    accentGlow: "shadow-[0_0_16px_rgba(20,184,166,0.18)]",
    cardCols: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-sm sm:max-w-6xl mx-auto",
    description: "Technical Collaboration, Sponsor Management & Wing Activities",
  },
  other: {
    id: "other",
    title: "Mentors & Coordinators",
    shortTitle: "Mentors",
    rank: 8,
    gradient: "from-[#64748b]/15 to-[#475569]/15",
    borderColor: "border-[#64748b]/35",
    textColor: "text-[#94a3b8]",
    badgeClass: "bg-[#64748b]/15 text-[#94a3b8] border-[#64748b]/30",
    accentGlow: "shadow-[0_0_14px_rgba(100,116,139,0.15)]",
    cardCols: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-sm sm:max-w-6xl mx-auto",
    description: "Advisors, Mentors & Honorary Coordinators",
  },
};

export const TIER_ORDER: ExecutiveTier[] = [
  "president",
  "vice_president",
  "general_secretary",
  "assistant_general_secretary",
  "secretary",
  "assistant_secretary",
  "executive_member",
  "other",
];

/**
 * Automatically classifies any member position string into its corresponding ExecutiveTier.
 */
export function getExecutiveTier(position: string = ""): ExecutiveTier {
  const pos = position.trim().toLowerCase();

  // 1. Vice President check (must precede President check)
  if (
    pos.includes("vice president") ||
    pos.includes("vice-president") ||
    pos.startsWith("vp") ||
    pos.includes("(vp)") ||
    pos.includes("vice_president")
  ) {
    return "vice_president";
  }

  // 2. Assistant General Secretary check (must precede General Secretary check)
  if (
    pos.includes("assistant general secretary") ||
    pos.includes("asst. general secretary") ||
    pos.includes("asst general secretary") ||
    pos.startsWith("ags") ||
    pos.includes("(ags)") ||
    pos.includes("joint general secretary")
  ) {
    return "assistant_general_secretary";
  }

  // 3. President check (singular)
  if (
    pos === "president" ||
    (pos.includes("president") && !pos.includes("vice") && !pos.includes("assistant"))
  ) {
    return "president";
  }

  // 4. General Secretary check (singular)
  if (
    pos === "general secretary" ||
    pos.startsWith("gs ") ||
    pos === "gs" ||
    (pos.includes("general secretary") && !pos.includes("assistant") && !pos.includes("joint"))
  ) {
    return "general_secretary";
  }

  // 5. Assistant Secretary check (must precede Secretary check)
  if (
    pos.includes("assistant organizing secretary") ||
    pos.includes("assistant event") ||
    pos.includes("assistant project") ||
    (pos.includes("assistant") && pos.includes("secretary")) ||
    (pos.includes("asst.") && pos.includes("secretary")) ||
    pos.startsWith("as ") ||
    pos.includes("(as)")
  ) {
    return "assistant_secretary";
  }

  // 6. Secretary check
  if (
    pos.includes("secretary") ||
    pos.includes("technical content developer") ||
    pos.includes("project development and management")
  ) {
    return "secretary";
  }

  // 7. Executive Member check
  if (
    pos.includes("executive member") ||
    pos.startsWith("em ") ||
    pos.includes("(em)") ||
    pos === "member"
  ) {
    return "executive_member";
  }

  // 8. Other (Mentors, Coordinators, Advisors)
  return "other";
}

export interface TierGroup {
  tier: TierConfig;
  members: any[];
}

/**
 * Groups an array of team members into hierarchical tiers ordered by leadership rank.
 * Within each tier, members are sorted by sort_order ascending, then by name.
 */
export function groupMembersByTier(members: any[]): TierGroup[] {
  const map: Record<ExecutiveTier, any[]> = {
    president: [],
    vice_president: [],
    general_secretary: [],
    assistant_general_secretary: [],
    secretary: [],
    assistant_secretary: [],
    executive_member: [],
    other: [],
  };

  members.forEach((m) => {
    const tier = getExecutiveTier(m.position || "");
    map[tier].push(m);
  });

  return TIER_ORDER.map((tierId) => {
    const tierMembers = map[tierId].sort((a, b) => {
      const orderA = typeof a.sort_order === "number" ? a.sort_order : 999;
      const orderB = typeof b.sort_order === "number" ? b.sort_order : 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || "").localeCompare(b.name || "");
    });

    return {
      tier: EXECUTIVE_TIERS[tierId],
      members: tierMembers,
    };
  }).filter((group) => group.members.length > 0);
}

/**
 * Pre-defined list of common designations for the Executive Committee
 * to make Admin/Moderator updates instantaneous and standardized.
 */
export const EXECUTIVE_DESIGNATION_PRESETS = [
  // President & GS
  "President",
  "General Secretary",
  // Vice Presidents
  "Vice President (M&E)",
  "Vice President (Publicity)",
  "Vice President (Content & HR)",
  "Vice President (Research & Coordinator)",
  "Vice President (External Collaboration and Affair)",
  // Assistant General Secretaries
  "Assistant General Secretary (Organizing)",
  "Assistant General Secretary (Mentoring)",
  "Assistant General Secretary (Technical)",
  "Assistant General Secretary (Logistics)",
  "Assistant General Secretary (Publicity)",
  // Secretaries
  "Organizing Secretary",
  "Finance Secretary",
  "Research and Development Secretary",
  "Publicity Secretary (Content)",
  "Publicity Secretary (Coordinator)",
  "Organizing Secretary (Event)",
  "Publicity Secretary (Design)",
  "Publicity Secretary (Design and Logistics)",
  "Publicity Secretary (Logistics)",
  "Finance Secretary (Logistics)",
  "Joint Organizing Secretary (Session)",
  "Technical Content Developer",
  "Project Development and Management Secretary",
  // Assistant Secretaries
  "Assistant Organizing Secretary (Event)",
  "Assistant Organizing Secretary (Event Management)",
  "Assistant Organizing Secretary (Logistics)",
  "Assistant Organizing Secretary (Publicity and Logistics)",
  "Assistant Organizing Secretary (Technical)",
  "Assistant Event Management Secretary (HR)",
  "Assistant Event Management Secretary (Publicity)",
  "Assistant Project Development Secretary",
  "Assistant Organizing Secretary (Session)",
  // Executive Members
  "Executive Member (Logistics Management)",
  "Executive Member (Project Development)",
  "Executive Member (Sponsor Management)",
  "Executive Member (Event Management)",
  "Executive Member (Graphics Design)",
];

/**
 * Official 46-member Executive Panel 2026 (Effective 1 October 2026)
 * extracted directly from the official RUET IoT Club charter / document.
 * Can be seeded or populated into Supabase with one click by Admin / Moderator.
 */
export const OFFICIAL_2026_EXECUTIVE_PANEL = [
  // ── PRESIDENT (1) ──
  {
    sort_order: 1,
    name: "Asifur Rahman Siyam",
    position: "President",
    batch: "2021",
    department: "EEE",
    category: "Executive Board",
  },
  // ── VICE PRESIDENTS (5) ──
  {
    sort_order: 2,
    name: "Mahim Ishraq Badhon",
    position: "Vice President (M&E)",
    batch: "2021",
    department: "ECE",
    category: "Executive Board",
  },
  {
    sort_order: 3,
    name: "Fatiha Kawser",
    position: "Vice President (Publicity)",
    batch: "2021",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 4,
    name: "Humaira Ulfat",
    position: "Vice President (Content & HR)",
    batch: "2021",
    department: "EEE",
    category: "Executive Board",
  },
  {
    sort_order: 5,
    name: "Atia Sadika",
    position: "Vice President (Research & Coordinator)",
    batch: "2021",
    department: "MTE",
    category: "Executive Board",
  },
  {
    sort_order: 6,
    name: "Safius Sifat",
    position: "Vice President (External Collaboration and Affair)",
    batch: "2021",
    department: "EEE",
    category: "Executive Board",
  },
  // ── GENERAL SECRETARY (1) ──
  {
    sort_order: 7,
    name: "Md. Raisul Islam Sagor",
    position: "General Secretary",
    batch: "2021",
    department: "ETE",
    category: "Executive Board",
  },
  // ── ASSISTANT GENERAL SECRETARIES (5) ──
  {
    sort_order: 8,
    name: "Md Nahidul Hasan Desh",
    position: "Assistant General Secretary (Organizing)",
    batch: "2021",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 9,
    name: "MD. Talha Bin Kobir",
    position: "Assistant General Secretary (Mentoring)",
    batch: "2021",
    department: "ECE",
    category: "Executive Board",
  },
  {
    sort_order: 10,
    name: "Sakif Wasit",
    position: "Assistant General Secretary (Technical)",
    batch: "2021",
    department: "EEE",
    category: "Executive Board",
  },
  {
    sort_order: 11,
    name: "Shohely Muntaha Drishty",
    position: "Assistant General Secretary (Logistics)",
    batch: "2021",
    department: "MTE",
    category: "Executive Board",
  },
  {
    sort_order: 12,
    name: "Mst. Afia Ibnath",
    position: "Assistant General Secretary (Publicity)",
    batch: "2021",
    department: "ECE",
    category: "Executive Board",
  },
  // ── SECRETARIES (14) ──
  {
    sort_order: 13,
    name: "Md Asikur Rahman",
    position: "Technical Content Developer",
    batch: "2022",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 14,
    name: "Tahmidur Rahman",
    position: "Organizing Secretary",
    batch: "2022",
    department: "EEE",
    category: "Executive Board",
  },
  {
    sort_order: 15,
    name: "Md. Nayem",
    position: "Project Development and Management Secretary",
    batch: "2022",
    department: "ECE",
    category: "Executive Board",
  },
  {
    sort_order: 16,
    name: "Md. Minhajul Islam Niloy",
    position: "Finance Secretary",
    batch: "2022",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 17,
    name: "Kallol Roy",
    position: "Research and Development Secretary",
    batch: "2022",
    department: "ETE",
    category: "Executive Board",
  },
  {
    sort_order: 18,
    name: "Sameeha Tahseen",
    position: "Publicity Secretary (Content)",
    batch: "2022",
    department: "EEE",
    category: "Executive Board",
  },
  {
    sort_order: 19,
    name: "Mst. Saima Akter Munny",
    position: "Publicity Secretary (Coordinator)",
    batch: "2022",
    department: "MTE",
    category: "Executive Board",
  },
  {
    sort_order: 20,
    name: "MD. Mostahid Hasan",
    position: "Organizing Secretary (Event)",
    batch: "2022",
    department: "ECE",
    category: "Executive Board",
  },
  {
    sort_order: 21,
    name: "Shamsuzzoha Ibne Aziz",
    position: "Publicity Secretary (Design)",
    batch: "2022",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 22,
    name: "Anik Islam Shuvo",
    position: "Publicity Secretary (Design and Logistics)",
    batch: "2022",
    department: "EEE",
    category: "Executive Board",
  },
  {
    sort_order: 23,
    name: "Syed Shams Ishtiaque Niaz",
    position: "Publicity Secretary (Logistics)",
    batch: "2022",
    department: "MTE",
    category: "Executive Board",
  },
  {
    sort_order: 24,
    name: "ASIR INTISAR SIFAT",
    position: "Finance Secretary (Logistics)",
    batch: "2022",
    department: "ECE",
    category: "Executive Board",
  },
  {
    sort_order: 25,
    name: "MD. SAMIUL AMIN",
    position: "Joint Organizing Secretary (Session)",
    batch: "2022",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 26,
    name: "Md. Atique Ashfak Arib",
    position: "Joint Organizing Secretary (Session)",
    batch: "2022",
    department: "EEE",
    category: "Executive Board",
  },
  // ── ASSISTANT SECRETARIES (13) ──
  {
    sort_order: 27,
    name: "Md. Mahmudunnobi",
    position: "Assistant Organizing Secretary (Event)",
    batch: "2023",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 28,
    name: "Mohammad Mushfiqur Rahman",
    position: "Assistant Organizing Secretary (Event)",
    batch: "2023",
    department: "EEE",
    category: "Executive Board",
  },
  {
    sort_order: 29,
    name: "Mohammad Sarfaraz Hussain",
    position: "Assistant Organizing Secretary (Event Management)",
    batch: "2023",
    department: "ECE",
    category: "Executive Board",
  },
  {
    sort_order: 30,
    name: "Naqeeb Ibne Huda",
    position: "Assistant Organizing Secretary (Logistics)",
    batch: "2023",
    department: "MTE",
    category: "Executive Board",
  },
  {
    sort_order: 31,
    name: "Md. Imran Hasan",
    position: "Assistant Organizing Secretary (Publicity and Logistics)",
    batch: "2023",
    department: "ETE",
    category: "Executive Board",
  },
  {
    sort_order: 32,
    name: "Fayem Muktadir Rahman",
    position: "Assistant Organizing Secretary (Technical)",
    batch: "2023",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 33,
    name: "Sreeja Ghosh",
    position: "Assistant Event Management Secretary (HR)",
    batch: "2023",
    department: "EEE",
    category: "Executive Board",
  },
  {
    sort_order: 34,
    name: "Srabonti Baroi Suchi",
    position: "Assistant Event Management Secretary (Publicity)",
    batch: "2023",
    department: "ECE",
    category: "Executive Board",
  },
  {
    sort_order: 35,
    name: "Md. Afnan Abedin",
    position: "Assistant Organizing Secretary (Logistics)",
    batch: "2023",
    department: "MTE",
    category: "Executive Board",
  },
  {
    sort_order: 36,
    name: "Ragib Rownak",
    position: "Assistant Project Development Secretary",
    batch: "2023",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 37,
    name: "Prionti Nandi",
    position: "Assistant Organizing Secretary (Session)",
    batch: "2023",
    department: "EEE",
    category: "Executive Board",
  },
  {
    sort_order: 38,
    name: "Md. Shahab Uddwia",
    position: "Assistant Organizing Secretary (Session)",
    batch: "2023",
    department: "ECE",
    category: "Executive Board",
  },
  {
    sort_order: 39,
    name: "Tahsin Rifat",
    position: "Assistant Organizing Secretary (Logistics)",
    batch: "2023",
    department: "MTE",
    category: "Executive Board",
  },
  // ── EXECUTIVE MEMBERS (7) ──
  {
    sort_order: 40,
    name: "Anirban Biswas",
    position: "Executive Member (Logistics Management)",
    batch: "2024",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 41,
    name: "Md. Abu Tarek",
    position: "Executive Member (Project Development)",
    batch: "2024",
    department: "EEE",
    category: "Executive Board",
  },
  {
    sort_order: 42,
    name: "Arko Saha Raja",
    position: "Executive Member (Sponsor Management)",
    batch: "2024",
    department: "ECE",
    category: "Executive Board",
  },
  {
    sort_order: 43,
    name: "Tasnim Masud",
    position: "Executive Member (Event Management)",
    batch: "2024",
    department: "MTE",
    category: "Executive Board",
  },
  {
    sort_order: 44,
    name: "MD. HASAN IMAM",
    position: "Executive Member (Event Management)",
    batch: "2024",
    department: "ETE",
    category: "Executive Board",
  },
  {
    sort_order: 45,
    name: "Afia Samin",
    position: "Executive Member (Graphics Design)",
    batch: "2024",
    department: "CSE",
    category: "Executive Board",
  },
  {
    sort_order: 46,
    name: "Avishek Sarker Supto",
    position: "Executive Member (Logistics Management)",
    batch: "2024",
    department: "EEE",
    category: "Executive Board",
  },
];
