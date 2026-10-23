/**
 * panelManagement.ts
 * Comprehensive Panel & Committee Management system for RUET IoT Club.
 *
 * Handles:
 * - Creating new panels (e.g., "4th Executive Board (2026-2027)")
 * - Configuring roles/designations per panel
 * - Draft vs Published workflow (draft panels are hidden from public)
 * - Automatic transition of Current vs Archived panels for Executive & Advisory boards
 * - Cloud Supabase persistence with seamless localStorage fallback
 */

import { supabase } from "@/integrations/supabase/client";

export interface ClubPanel {
  id: string;
  title: string;
  boardType: "executive" | "advisory";
  sessionYears: string;
  ordinal: number;
  status: "draft" | "published";
  isCurrent: boolean;
  allowedRoles: string[];
  description?: string;
  createdAt: string;
  publishedAt?: string;
}

export const DEFAULT_EXECUTIVE_ROLES: string[] = [
  "President",
  "Vice-president (Technical & Mentoring)",
  "Vice-president (Logistics & Management)",
  "General Secretary",
  "Assistant General Secretary",
  "Organizing Secretary",
  "Finance Secretary",
  "Information & Research Secretary",
  "Publicity Secretary (Design & Sharing)",
  "Publicity Secretary (Content Writing)",
  "Assistant Organizing Secretary",
  "Assistant Finance Secretary",
  "Assistant Publicity Secretary",
  "Assistant Information & Research Secretary",
  "Executive Member",
  "Mentor",
];

export const DEFAULT_ADVISORY_ROLES: string[] = [
  "Chief Advisor",
  "Faculty Advisor",
  "Advisory Panel Member",
  "Senior Research Advisor",
  "Industry & Innovation Advisor",
  "Honorary Mentor",
];

// Initial baseline panels representing actual club history
export const INITIAL_PANELS: ClubPanel[] = [
  {
    id: "panel-3rd-exec-2025-2026",
    title: "3rd Executive (2025-2026)",
    boardType: "executive",
    sessionYears: "2025-2026",
    ordinal: 3,
    status: "published",
    isCurrent: true,
    allowedRoles: DEFAULT_EXECUTIVE_ROLES,
    description: "Current Governing Executive Committee of RUET IoT Club",
    createdAt: "2025-06-01T00:00:00.000Z",
    publishedAt: "2025-06-01T00:00:00.000Z",
  },
  {
    id: "panel-2nd-exec-2024-2025",
    title: "2nd Executive (2024-2025)",
    boardType: "executive",
    sessionYears: "2024-2025",
    ordinal: 2,
    status: "published",
    isCurrent: false,
    allowedRoles: DEFAULT_EXECUTIVE_ROLES,
    description: "2nd Executive Committee of RUET IoT Club",
    createdAt: "2024-06-01T00:00:00.000Z",
    publishedAt: "2024-06-01T00:00:00.000Z",
  },
  {
    id: "panel-1st-exec-2023-2024",
    title: "1st Executive (2023-2024)",
    boardType: "executive",
    sessionYears: "2023-2024",
    ordinal: 1,
    status: "published",
    isCurrent: false,
    allowedRoles: DEFAULT_EXECUTIVE_ROLES,
    description: "Founding Executive Committee of RUET IoT Club",
    createdAt: "2023-06-01T00:00:00.000Z",
    publishedAt: "2023-06-01T00:00:00.000Z",
  },
  {
    id: "panel-current-advisory",
    title: "Current Advisory Board",
    boardType: "advisory",
    sessionYears: "2025-2026",
    ordinal: 2,
    status: "published",
    isCurrent: true,
    allowedRoles: DEFAULT_ADVISORY_ROLES,
    description: "Current Advisory Council of RUET IoT Club",
    createdAt: "2025-06-01T00:00:00.000Z",
    publishedAt: "2025-06-01T00:00:00.000Z",
  },
  {
    id: "panel-founding-advisory-2023",
    title: "Founding Advisory Board (2023-2024)",
    boardType: "advisory",
    sessionYears: "2023-2024",
    ordinal: 1,
    status: "published",
    isCurrent: false,
    allowedRoles: DEFAULT_ADVISORY_ROLES,
    description: "Founding Advisory Mentors of RUET IoT Club",
    createdAt: "2023-06-01T00:00:00.000Z",
    publishedAt: "2023-06-01T00:00:00.000Z",
  },
];

const STORAGE_KEY = "ruet_iot_club_panels_v1";

/**
 * Retrieve all club panels from localStorage (fallback) and Supabase if available.
 */
export const getStoredPanels = (): ClubPanel[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PANELS));
      return INITIAL_PANELS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error("Failed to load panels from localStorage:", err);
  }
  return INITIAL_PANELS;
};

/**
 * Save panel list to storage and notify listeners
 */
export const saveStoredPanels = (panels: ClubPanel[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
    window.dispatchEvent(new CustomEvent("ruet_panels_updated", { detail: panels }));
  } catch (err) {
    console.error("Failed to save panels to localStorage:", err);
  }
};

/**
 * Fetch panels from Supabase (or fallback to stored panels)
 */
export const fetchClubPanels = async (): Promise<ClubPanel[]> => {
  try {
    const { data, error } = await supabase
      .from("club_panels" as any)
      .select("*")
      .order("ordinal", { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped: ClubPanel[] = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        boardType: d.board_type,
        sessionYears: d.session_years,
        ordinal: d.ordinal,
        status: d.status,
        isCurrent: Boolean(d.is_current),
        allowedRoles: Array.isArray(d.allowed_roles) ? d.allowed_roles : DEFAULT_EXECUTIVE_ROLES,
        description: d.description || "",
        createdAt: d.created_at,
        publishedAt: d.published_at,
      }));
      saveStoredPanels(mapped);
      return mapped;
    }
  } catch {
    // Supabase table not created yet or offline, continue with stored panels
  }

  return getStoredPanels();
};

/**
 * Create or update a club panel
 */
export const upsertClubPanel = async (panel: Partial<ClubPanel> & { title: string; boardType: "executive" | "advisory" }): Promise<ClubPanel> => {
  const currentPanels = getStoredPanels();
  const id = panel.id || `panel-${panel.boardType}-${Date.now()}`;
  const now = new Date().toISOString();

  const isPublishing = panel.status === "published";

  // If this panel is being published and set as current, retire other current panels of this board type
  let updatedPanels = currentPanels.map((p) => {
    if (panel.isCurrent && p.boardType === panel.boardType && p.id !== id) {
      return { ...p, isCurrent: false };
    }
    return p;
  });

  const existingIdx = updatedPanels.findIndex((p) => p.id === id);

  const fullPanel: ClubPanel = {
    id,
    title: panel.title.trim(),
    boardType: panel.boardType,
    sessionYears: panel.sessionYears || "2025-2026",
    ordinal: panel.ordinal ?? (existingIdx >= 0 ? updatedPanels[existingIdx].ordinal : 4),
    status: panel.status || "draft",
    isCurrent: Boolean(panel.isCurrent),
    allowedRoles: panel.allowedRoles && panel.allowedRoles.length > 0
      ? panel.allowedRoles
      : panel.boardType === "advisory"
      ? DEFAULT_ADVISORY_ROLES
      : DEFAULT_EXECUTIVE_ROLES,
    description: panel.description || "",
    createdAt: existingIdx >= 0 ? updatedPanels[existingIdx].createdAt : now,
    publishedAt: isPublishing ? (panel.publishedAt || now) : undefined,
  };

  if (existingIdx >= 0) {
    updatedPanels[existingIdx] = fullPanel;
  } else {
    updatedPanels.unshift(fullPanel);
  }

  // Save locally
  saveStoredPanels(updatedPanels);

  // Try sync with Supabase if table exists
  try {
    await supabase.from("club_panels" as any).upsert({
      id: fullPanel.id,
      title: fullPanel.title,
      board_type: fullPanel.boardType,
      session_years: fullPanel.sessionYears,
      ordinal: fullPanel.ordinal,
      status: fullPanel.status,
      is_current: fullPanel.isCurrent,
      allowed_roles: fullPanel.allowedRoles,
      description: fullPanel.description,
      published_at: fullPanel.publishedAt,
    });
  } catch {
    // local fallback succeeded
  }

  return fullPanel;
};

/**
 * Publish a draft panel and make it the Current panel.
 * The previous current panel automatically becomes an archived past term.
 */
export const publishPanelAsCurrent = async (panelId: string): Promise<ClubPanel[]> => {
  const currentPanels = getStoredPanels();
  const target = currentPanels.find((p) => p.id === panelId);
  if (!target) throw new Error("Panel not found");

  const now = new Date().toISOString();

  // 1. Mark all other panels of same boardType as not current
  const updated = currentPanels.map((p) => {
    if (p.boardType === target.boardType) {
      if (p.id === panelId) {
        return {
          ...p,
          status: "published" as const,
          isCurrent: true,
          publishedAt: now,
        };
      } else {
        return {
          ...p,
          isCurrent: false,
        };
      }
    }
    return p;
  });

  saveStoredPanels(updated);

  // Attempt sync with Supabase
  try {
    for (const p of updated.filter((item) => item.boardType === target.boardType)) {
      await supabase.from("club_panels" as any).upsert({
        id: p.id,
        title: p.title,
        board_type: p.boardType,
        session_years: p.sessionYears,
        ordinal: p.ordinal,
        status: p.status,
        is_current: p.isCurrent,
        allowed_roles: p.allowedRoles,
        published_at: p.publishedAt,
      });
    }
  } catch {
    // fallback
  }

  return updated;
};

/**
 * Delete a custom panel
 */
export const deleteClubPanel = async (panelId: string): Promise<void> => {
  const currentPanels = getStoredPanels();
  const filtered = currentPanels.filter((p) => p.id !== panelId);
  saveStoredPanels(filtered);

  try {
    await supabase.from("club_panels" as any).delete().eq("id", panelId);
  } catch {
    // fallback
  }
};
