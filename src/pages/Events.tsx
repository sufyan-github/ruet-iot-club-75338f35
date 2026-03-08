import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { Calendar, MapPin, Users } from "lucide-react";

const events = [
  { title: "IoT Workshop: ESP32 Basics", date: "Mar 15, 2026", venue: "RUET Auditorium", type: "Workshop", desc: "Hands-on workshop on ESP32 microcontroller programming and sensor integration.", spots: 50 },
  { title: "Hackathon 2026", date: "Apr 5-6, 2026", venue: "CSE Building", type: "Hackathon", desc: "24-hour hackathon focused on building smart city solutions.", spots: 100 },
  { title: "AI + IoT Bootcamp", date: "Apr 20, 2026", venue: "Online", type: "Bootcamp", desc: "Intensive 3-day bootcamp on integrating AI with IoT systems.", spots: 80 },
  { title: "Arduino for Beginners", date: "May 1, 2026", venue: "EEE Lab", type: "Training", desc: "Introduction to Arduino programming for first-year students.", spots: 40 },
  { title: "IoT Project Exhibition", date: "May 15, 2026", venue: "RUET Campus", type: "Exhibition", desc: "Annual showcase of IoT Club projects and research.", spots: 200 },
];

const Events = () => {
  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Events" subtitle="Workshops, hackathons, and more" />

          <div className="max-w-3xl mx-auto space-y-4">
            {events.map((event, i) => (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl glass hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">{event.type}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{event.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{event.desc}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar size={12} className="text-primary" /> {event.date}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> {event.venue}</span>
                      <span className="flex items-center gap-1"><Users size={12} className="text-primary" /> {event.spots} spots</span>
                    </div>
                  </div>
                  <button className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Register
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Events;
