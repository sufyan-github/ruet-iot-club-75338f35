import { useEffect, useState } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { Calendar, MapPin, Users, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Events = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  return (
    <Layout>
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
                  className="rounded-xl glass hover:border-primary/30 transition-colors overflow-hidden"
                >
                  {event.image_url && (
                    <img src={getOptimizedImageUrl(event.image_url, { width: 600, height: 250 })} alt={event.title} className="w-full h-48 object-cover" loading="lazy" />
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {event.type && (
                            <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">{event.type}</span>
                          )}
                          {event.is_paid ? (
                            <span className="text-xs font-mono px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 flex items-center gap-1">
                              <CreditCard size={10} /> ৳{event.registration_fee}
                            </span>
                          ) : (
                            <span className="text-xs font-mono px-2 py-1 rounded bg-green-500/10 text-green-400">Free</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{event.title}</h3>
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
                          {event.max_participants && (
                            <span className="flex items-center gap-1">
                              <Users size={12} className="text-primary" /> {event.max_participants} spots
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate("/events/register", { state: { event } })}
                        className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors glow-border"
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
