import { useEffect, useState } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { Calendar, MapPin, Users, CreditCard, UserCheck, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Events = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Record<string, { name: string | null }[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      // Only show upcoming events (today or future) on the public Events page
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("events")
        .select("*")
        .gte("date", todayStart.toISOString())
        .order("date", { ascending: true });
      const evs = data || [];
      setEvents(evs);

      // Fetch approved participant names per event (RLS allows public read of approved rows)
      if (evs.length > 0) {
        const { data: regs } = await supabase
          .from("event_registrations")
          .select("event_id, name")
          .eq("approval_status", "approved")
          .in("event_id", evs.map(e => e.id));
        const grouped: Record<string, { name: string | null }[]> = {};
        (regs || []).forEach((r: any) => {
          if (!grouped[r.event_id]) grouped[r.event_id] = [];
          grouped[r.event_id].push({ name: r.name });
        });
        setRegistrations(grouped);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  return (
    <Layout>
      <SEO title="Upcoming Events & Workshops | RUET IoT Club" description="Register for IoT workshops, hackathons, seminars, and competitions hosted by RUET IoT Club at RUET, Rajshahi." path="/events" />
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Events" subtitle="Workshops, hackathons, and more" />

          {loading ? (
            <p className="text-center text-muted-foreground">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground">No upcoming events.</p>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 overflow-hidden transition-all duration-300"
                >
                  {/* Pin-1 Index Notch Socket */}
                  <span className="chip-pin-1 absolute top-2.5 left-2.5 z-20" />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                  <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />

                  {event.image_url && (
                    <div className="relative overflow-hidden">
                      <img src={getOptimizedImageUrl(event.image_url, { width: 600, height: 250 })} alt={event.title} className="w-full h-48 object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071322] via-transparent to-transparent opacity-80" />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {event.type && (
                            <span className="text-xs font-mono px-2 py-0.5 chip-shape bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/30">{event.type}</span>
                          )}
                          {event.is_paid ? (
                            <span className="text-xs font-mono px-2 py-0.5 chip-shape bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                              <CreditCard size={10} /> ৳{event.registration_fee}
                            </span>
                          ) : (
                            <span className="text-xs font-mono px-2 py-0.5 chip-shape bg-green-500/15 text-green-400 border border-green-500/30">Free</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground mb-2 group-hover:text-[#2de2c9] transition-colors">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-primary" /> {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          {event.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-primary" /> {event.venue}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users size={12} className="text-primary" />
                            {(registrations[event.id]?.length || 0)}
                            {event.max_participants ? ` / ${event.max_participants}` : ""} confirmed
                          </span>
                        </div>
                        {(registrations[event.id]?.length || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                            className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <UserCheck size={12} />
                            {expanded === event.id ? "Hide" : "View"} confirmed participants
                            {expanded === event.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                        {expanded === event.id && (registrations[event.id]?.length || 0) > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-3 p-3 chip-shape bg-[#050b14]/60 border border-[#2de2c9]/30"
                          >
                            <div className="flex flex-wrap gap-1.5">
                              {registrations[event.id].map((p, idx) => (
                                <span key={idx} className="inline-block px-2 py-0.5 chip-shape bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">
                                  {p.name || "Anonymous"}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <button
                        onClick={() => navigate("/events/register", { state: { event } })}
                        className="shrink-0 px-5 py-2 chip-shape bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] text-sm font-bold shadow-[0_2px_12px_rgba(45,226,201,0.35)] hover:brightness-110 transition-all"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Events;
