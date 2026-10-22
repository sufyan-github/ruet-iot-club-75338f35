import { supabase } from "@/integrations/supabase/client";

export interface PartnerData {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  logoUrl?: string; // Image URL
  presetLogoId?: "iid" | "earth-society" | "youth-for-care" | "custom";
  website?: string;
  accentGlow?: string;
  active: boolean;
  sortOrder?: number;
}

export const DEFAULT_PARTNERS: PartnerData[] = [
  {
    id: "iid",
    name: "IID",
    subtitle: "Institute for Informed Development",
    description: "Independent research and development organization working to advance evidence-based public policy, youth engagement, and social innovation.",
    presetLogoId: "iid",
    website: "https://iidbd.org",
    accentGlow: "rgba(0, 180, 216, 0.35)",
    active: true,
    sortOrder: 1,
  },
  {
    id: "the-earth-society",
    name: "The Earth Society",
    subtitle: "Climate & Environmental Action",
    description: "A youth-led organization working to advance climate action, sustainable development, and environmental innovation across communities.",
    presetLogoId: "earth-society",
    website: "https://theearthsociety.org",
    accentGlow: "rgba(234, 179, 8, 0.35)",
    active: true,
    sortOrder: 2,
  },
  {
    id: "youth-for-care",
    name: "Youth For CARE",
    subtitle: "Youth Innovation & Empowerment",
    description: "Youth-led organization working to empower young people and foster innovation, social entrepreneurship, and community leadership.",
    presetLogoId: "youth-for-care",
    website: "https://youthforcare.org",
    accentGlow: "rgba(45, 226, 201, 0.35)",
    active: true,
    sortOrder: 3,
  },
];

const LOCAL_STORAGE_KEY = "ruet_iot_partners_list";
const SPECIAL_TITLE = "PARTNERS_LIST_CONFIG";

// Read from LocalStorage cache immediately
export const getCachedPartners = (): PartnerData[] => {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading cached partners:", err);
  }
  return DEFAULT_PARTNERS;
};

// Fetch latest partners from Supabase
export const fetchPartners = async (): Promise<PartnerData[]> => {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, message")
      .eq("title", SPECIAL_TITLE)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch remote partners config:", error);
      return getCachedPartners();
    }

    if (data?.message) {
      const parsed = JSON.parse(data.message) as PartnerData[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error fetching partners:", err);
  }

  return getCachedPartners();
};

// Save partners to Supabase and cache
export const savePartners = async (
  partners: PartnerData[],
  userId?: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    const payload = {
      title: SPECIAL_TITLE,
      message: JSON.stringify(partners),
      created_by: userId || null,
    };

    const { data: existing } = await supabase
      .from("announcements")
      .select("id")
      .eq("title", SPECIAL_TITLE)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("announcements")
        .update({
          message: payload.message,
          created_by: payload.created_by,
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("announcements").insert(payload);
      if (error) throw error;
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(partners));
    return { success: true };
  } catch (err: any) {
    console.error("Error saving partners to Supabase:", err);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(partners));
    return { success: false, error: err };
  }
};
