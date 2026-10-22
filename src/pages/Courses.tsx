import { useEffect, useState } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Users, DollarSign } from "lucide-react";

const Courses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "free" | "paid">("all");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setCourses(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered =
    filter === "all"
      ? courses
      : filter === "free"
      ? courses.filter((c) => !c.is_paid)
      : courses.filter((c) => c.is_paid);

  return (
    <Layout>
      <SEO title="IoT Courses & Learning | RUET IoT Club" description="Enroll in free and paid IoT, embedded systems, and AI courses offered through the RUET IoT Club learning platform." path="/courses" />
      <section className="py-24">
        <div className="container max-w-6xl">
          <SectionHeading
            title="Learning Management"
            subtitle="Enhance your skills with structured courses and resources"
          />

          {/* Filters */}
          <div className="flex justify-center gap-2 mb-10">
            {(["all", "free", "paid"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 chip-shape text-sm font-medium transition-all capitalize ${
                  filter === f
                    ? "bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold shadow-[0_2px_12px_rgba(45,226,201,0.4)]"
                    : "bg-[#071322]/80 text-muted-foreground border border-[#2de2c9]/25 hover:text-foreground hover:border-[#2de2c9]/60"
                }`}
              >
                {f === "all" ? "All Courses" : f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 chip-shape bg-secondary/30 border border-border/20 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground">No courses available yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/courses/${course.id}`}
                    className="relative block chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 overflow-hidden transition-all duration-300 group h-full"
                  >
                    {/* Pin-1 Index Notch Socket */}
                    <span className="chip-pin-1 absolute top-2.5 left-2.5 z-20" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />
                    <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2de2c9]/60 group-hover:border-[#00d2ff] pointer-events-none transition-colors" />

                    {course.image_url ? (
                      <div className="relative overflow-hidden">
                        <img
                          src={getOptimizedImageUrl(course.image_url, { width: 400, height: 200 })}
                          alt={course.title}
                          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#071322] via-transparent to-transparent opacity-80" />
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <BookOpen size={40} className="text-primary/30" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        {course.category && (
                          <span className="text-[11px] font-mono px-2 py-0.5 chip-shape bg-[#2de2c9]/15 text-[#2de2c9] border border-[#2de2c9]/30">
                            {course.category}
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 chip-shape ${
                            course.is_paid
                              ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                              : "bg-green-500/15 text-green-400 border border-green-500/30"
                          }`}
                        >
                          {course.is_paid ? `৳${course.price}` : "Free"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {course.instructor && (
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {course.instructor}
                          </span>
                        )}
                        {course.duration && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {course.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Courses;
