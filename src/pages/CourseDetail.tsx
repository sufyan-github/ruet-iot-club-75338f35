import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BookOpen, Play, FileText, CheckCircle, Lock, ArrowLeft, Award } from "lucide-react";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bKash");

  useEffect(() => {
    const fetch = async () => {
      const { data: courseData } = await supabase.from("courses").select("*").eq("id", id).single();
      setCourse(courseData);
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", id!)
        .order("sort_order", { ascending: true });
      setLessons(lessonData || []);

      if (user) {
        const { data: reg } = await supabase
          .from("course_registrations")
          .select("*")
          .eq("course_id", id!)
          .eq("user_id", user.id)
          .maybeSingle();
        setRegistration(reg);
      }
      setLoading(false);
    };
    if (id) fetch();
  }, [id, user]);

  const handleRegister = async () => {
    if (!user) { navigate("/auth"); return; }
    setRegistering(true);
    const payload: any = { course_id: id, user_id: user.id };
    if (course.is_paid) {
      if (!txnId.trim()) { toast.error("Please enter transaction ID"); setRegistering(false); return; }
      payload.payment_method = paymentMethod;
      payload.transaction_id = txnId;
      payload.payment_status = "pending";
    } else {
      payload.payment_status = "confirmed";
    }
    const { error } = await supabase.from("course_registrations").insert(payload);
    if (error) {
      if (error.code === "23505") toast.error("Already registered!");
      else toast.error("Registration failed");
    } else {
      toast.success(course.is_paid ? "Registration submitted! Awaiting payment verification." : "Enrolled successfully!");
      const { data: reg } = await supabase
        .from("course_registrations")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", user.id)
        .maybeSingle();
      setRegistration(reg);
    }
    setRegistering(false);
  };

  const toggleLessonComplete = async (lessonId: string) => {
    if (!registration) return;
    const progress = registration.progress || {};
    progress[lessonId] = !progress[lessonId];
    const completedCount = Object.values(progress).filter(Boolean).length;
    const allDone = completedCount === lessons.length;
    const { error } = await supabase
      .from("course_registrations")
      .update({ progress, completed: allDone })
      .eq("id", registration.id);
    if (error) toast.error("Failed to update progress");
    else setRegistration({ ...registration, progress, completed: allDone });
  };

  const isEnrolled = registration && (registration.payment_status === "confirmed" || !course?.is_paid);
  const completedLessons = registration?.progress ? Object.values(registration.progress).filter(Boolean).length : 0;
  const progressPercent = lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

  if (loading) return <Layout><div className="py-24 text-center text-muted-foreground">Loading...</div></Layout>;
  if (!course) return <Layout><div className="py-24 text-center text-muted-foreground">Course not found.</div></Layout>;

  return (
    <Layout>
      <section className="py-24">
        <div className="container max-w-4xl">
          <button onClick={() => navigate("/courses")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Courses
          </button>

          {/* Header */}
          <div className="rounded-xl glass overflow-hidden mb-8">
            {course.image_url && (
              <img src={course.image_url} alt={course.title} className="w-full h-48 md:h-64 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                {course.category && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{course.category}</span>}
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${course.is_paid ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>
                  {course.is_paid ? `৳${course.price}` : "Free"}
                </span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">{course.title}</h1>
              {course.instructor && <p className="text-sm text-muted-foreground mb-2">Instructor: {course.instructor}</p>}
              {course.description && <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>}
            </div>
          </div>

          {/* Enrollment / Progress */}
          {!registration ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl glass p-6 mb-8">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">
                {course.is_paid ? "Enroll in this Course" : "Start Learning"}
              </h2>
              {course.is_paid && (
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-muted-foreground">Fee: <span className="text-primary font-semibold">৳{course.price}</span></p>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Online Banking">Online Banking</option>
                  </select>
                  <input placeholder="Transaction ID *" value={txnId} onChange={(e) => setTxnId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              )}
              <button onClick={handleRegister} disabled={registering}
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {registering ? "Processing..." : course.is_paid ? "Submit Payment & Enroll" : "Enroll for Free"}
              </button>
            </motion.div>
          ) : registration.payment_status === "pending" && course.is_paid ? (
            <div className="rounded-xl glass p-6 mb-8 text-center">
              <p className="text-yellow-400 font-medium">⏳ Payment verification pending</p>
              <p className="text-xs text-muted-foreground mt-1">Your enrollment will be confirmed once payment is verified.</p>
            </div>
          ) : (
            <div className="rounded-xl glass p-6 mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold text-foreground">Your Progress</h2>
                {registration.completed && (
                  <span className="flex items-center gap-1 text-sm text-green-400 font-medium">
                    <Award size={16} /> Course Completed!
                  </span>
                )}
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-primary rounded-full"
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{completedLessons} of {lessons.length} lessons completed ({progressPercent}%)</p>
            </div>
          )}

          {/* Lessons */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground mb-4">
              <BookOpen size={18} className="inline mr-2" />
              Lessons ({lessons.length})
            </h2>
            {lessons.length === 0 ? (
              <p className="text-center text-muted-foreground">No lessons added yet.</p>
            ) : (
              lessons.map((lesson, i) => {
                const isCompleted = registration?.progress?.[lesson.id];
                const canAccess = isEnrolled;
                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-4 rounded-xl glass flex items-center gap-4 ${!canAccess ? "opacity-60" : ""}`}
                  >
                    {canAccess ? (
                      <button onClick={() => toggleLessonComplete(lesson.id)}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isCompleted ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"
                        }`}>
                        {isCompleted && <CheckCircle size={14} />}
                      </button>
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 border-border flex items-center justify-center shrink-0">
                        <Lock size={12} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isCompleted ? "text-primary line-through" : "text-foreground"}`}>
                        {i + 1}. {lesson.title}
                      </p>
                    </div>
                    {canAccess && (
                      <div className="flex gap-2 shrink-0">
                        {lesson.video_url && (
                          <a href={lesson.video_url} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Watch Video">
                            <Play size={14} />
                          </a>
                        )}
                        {lesson.pdf_file && (
                          <a href={lesson.pdf_file} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="View PDF">
                            <FileText size={14} />
                          </a>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CourseDetail;
