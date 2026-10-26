import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";

type NotificationType = "event" | "course" | "activity" | "announcement";

interface Notification {
  id: string;
  title: string;
  message?: string | null;
  type: NotificationType;
  created_at: string;
}

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLastSeen(localStorage.getItem("notifications_last_seen"));
    fetchNotifications();

    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "events" }, () => fetchNotifications())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "courses" }, () => fetchNotifications())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activities" }, () => fetchNotifications())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchNotifications = async () => {
    const [events, courses, activities, announcements] = await Promise.all([
      supabase.from("events").select("id, title, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("courses").select("id, title, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("activities").select("id, title, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("announcements").select("id, title, message, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    const all: Notification[] = [
      ...(events.data || []).map((e) => ({ ...e, type: "event" as const })),
      ...(courses.data || []).map((c) => ({ ...c, type: "course" as const })),
      ...(activities.data || []).map((a) => ({ ...a, type: "activity" as const })),
      ...(announcements.data || [])
        .filter((a) => !a.title?.startsWith("STAFF_INVITATION:") && a.title !== "HERO_BANNER_CONFIG" && a.title !== "PARTNERS_CONFIG")
        .map((a) => ({ ...a, type: "announcement" as const })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);

    setNotifications(all);
  };

  const unreadCount = lastSeen
    ? notifications.filter((n) => new Date(n.created_at) > new Date(lastSeen)).length
    : notifications.length;

  const handleOpen = () => {
    setOpen(!open);
    if (!open) {
      const now = new Date().toISOString();
      setLastSeen(now);
      localStorage.setItem("notifications_last_seen", now);
    }
  };

  const handleClick = (n: Notification) => {
    setOpen(false);
    switch (n.type) {
      case "event":
        navigate(`/events`);
        break;
      case "course":
        navigate(`/courses/${n.id}`);
        break;
      case "activity":
        navigate(`/gallery`);
        break;
      case "announcement":
        // no dedicated page, just close
        break;
    }
  };

  const typeLabel = (type: NotificationType) => {
    switch (type) {
      case "event": return "📅 New Event";
      case "course": return "📚 New Course";
      case "activity": return "🔔 Activity";
      case "announcement": return "📢 Announcement";
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-background border border-border/60 rounded-xl shadow-xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-border/40">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
              ) : (
                notifications.map((n) => {
                  const isNew = lastSeen ? new Date(n.created_at) > new Date(lastSeen) : false;
                  const isClickable = n.type !== "announcement";
                  return (
                    <div
                      key={`${n.type}-${n.id}`}
                      onClick={() => handleClick(n)}
                      className={`px-4 py-3 border-b border-border/20 hover:bg-secondary/30 transition-colors ${isNew ? "bg-primary/5" : ""} ${isClickable ? "cursor-pointer" : ""}`}
                    >
                      <p className="text-xs text-muted-foreground">{typeLabel(n.type)}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5 line-clamp-1">{n.title}</p>
                      {n.type === "announcement" && n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
