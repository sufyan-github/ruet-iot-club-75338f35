import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All Courses" : f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-xl bg-secondary/50 animate-pulse" />
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
                    className="block rounded-xl glass overflow-hidden hover:border-primary/30 transition-all duration-300 group h-full"
                  >
                    {course.image_url ? (
                      <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <BookOpen size={40} className="text-primary/30" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        {course.category && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {course.category}
                          </span>
                        )}
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded ${
                            course.is_paid
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-green-500/10 text-green-400"
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
