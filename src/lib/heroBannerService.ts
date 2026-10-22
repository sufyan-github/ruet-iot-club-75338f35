import { supabase } from "@/integrations/supabase/client";

export interface HeroBannerConfig {
  isActive: boolean;
  badge: string;
  title: string;
  daysLeft?: string;
  linkUrl: string;
  buttonText: string;
  buttonUrl: string;
  updatedAt?: string;
}

export const DEFAULT_HERO_BANNER: HeroBannerConfig = {
  isActive: true,
  badge: "Recruitment Ongoing",
  title: "Member Recruitment 2025 Now Open",
  daysLeft: "Register Now",
  linkUrl: "/join",
  buttonText: "Join Us",
  buttonUrl: "/join",
};

const LOCAL_STORAGE_KEY = "ruet_iot_hero_banner_config";
const SPECIAL_TITLE = "HERO_BANNER_CONFIG";

// Read from LocalStorage cache immediately
export const getCachedHeroBanner = (): HeroBannerConfig => {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_HERO_BANNER, ...JSON.parse(cached) };
    }
  } catch (err) {
    console.error("Error reading cached banner:", err);
  }
  return DEFAULT_HERO_BANNER;
};

// Fetch latest config from Supabase
export const fetchHeroBannerConfig = async (): Promise<HeroBannerConfig> => {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, message")
      .eq("title", SPECIAL_TITLE)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch remote banner config:", error);
      return getCachedHeroBanner();
    }

    if (data?.message) {
      const parsed = JSON.parse(data.message) as HeroBannerConfig;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
      return { ...DEFAULT_HERO_BANNER, ...parsed };
    }
  } catch (err) {
    console.error("Error fetching hero banner config:", err);
  }

  return getCachedHeroBanner();
};

// Save config to Supabase (Admin / Moderator) and update local cache
export const saveHeroBannerConfig = async (
  config: HeroBannerConfig,
  userId?: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    const payload = {
      title: SPECIAL_TITLE,
      message: JSON.stringify({ ...config, updatedAt: new Date().toISOString() }),
      created_by: userId || null,
    };

    // Check if row already exists
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

    // Update local cache
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    return { success: true };
  } catch (err: any) {
    console.error("Error saving hero banner config:", err);
    // Still save to local storage as fallback
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    return { success: false, error: err };
  }
};
