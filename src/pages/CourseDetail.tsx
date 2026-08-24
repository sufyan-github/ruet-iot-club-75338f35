import { useEffect, useState } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { cloudflareData } from "@/integrations/cloudflare/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BookOpen, Play, FileText, CheckCircle, Lock, ArrowLeft, Award, ExternalLink, X } from "lucide-react";
import { Link } from "react-router-dom";
import PaymentSlip from "@/components/PaymentSlip";
import { apiRequest } from "@/lib/api";

const getYouTubeEmbedUrl = (url: string): string => {
  try {
    const u = new URL(url);
    let videoId = "";
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    } else if (u.searchParams.get("v")) {
      videoId = u.searchParams.get("v")!;
    } else if (u.pathname.includes("/embed/")) {
      videoId = u.pathname.split("/embed/")[1];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : url;
  } catch {
    return url;
  }
};

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, csrfToken } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [certificate, setCertificate] = useState<any>(null);
  const [certificateRequest, setCertificateRequest] = useState<any>(null);
  const [requestingCertificate, setRequestingCertificate] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activePdf, setActivePdf] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const courseData=await apiRequest<any>(`/courses/${id}`);
        setCourse({...courseData,image_url:courseData.thumbnail_url,is_paid:courseData.course_type==="PAID",description:courseData.short_description});
        setLessons((courseData.modules||[]).flatMap((module:any)=>(module.lessons||[]).map((lesson:any)=>{const video=lesson.contents?.find((item:any)=>item.content_type==="YOUTUBE"||item.content_type==="VIDEO");const pdf=lesson.contents?.find((item:any)=>item.content_type==="PDF");return {...lesson,module_title:module.title,video_url:video?.url,pdf_file:pdf?.url,contents:lesson.contents||[]}})));
      } catch {
        const { data: courseData } = await cloudflareData.from("courses").select("*").eq("id", id).single();setCourse(courseData);
        const { data: lessonData } = await cloudflareData.from("lessons").select("*").eq("course_id", id!).order("sort_order", { ascending: true });setLessons(lessonData || []);
      }

      if (user) {
        try { const dashboard=await apiRequest<any>("/learning/dashboard");const normalized=dashboard.courses?.find((item:any)=>item.course_id===id);if(normalized)setRegistration({...normalized,normalized:true,payment_status:normalized.payment_status==="VERIFIED"||normalized.payment_status==="NOT_REQUIRED"?"confirmed":["SUBMITTED","PENDING"].includes(normalized.payment_status)?"pending":normalized.payment_status.toLowerCase(),completed:normalized.enrollment_status==="COMPLETED",progress:Object.fromEntries((normalized.completed_lesson_ids||[]).map((lessonId:string)=>[lessonId,true]))}); }
        catch { const { data: reg } = await cloudflareData.from("course_registrations").select("*").eq("course_id", id!).eq("user_id", user.id).maybeSingle();setRegistration(reg); }

        // Check for existing certificate
        const { data: certData } = await cloudflareData
          .from("certificates")
          .select("*")
          .eq("course_id", id!)
          .eq("user_id", user.id)
          .maybeSingle();
        setCertificate(certData);
        try {
          const certificateData = await apiRequest<{ requests: any[]; certificates: any[] }>("/learning/certificates/me");
          setCertificateRequest(certificateData.requests.find((item) => item.courseId === id) ?? null);
          const issued = certificateData.certificates.find((item) => item.courseId === id);
          if (issued) setCertificate({
            id: issued.id,
            certificate_number: issued.certificateNumber,
            course_id: issued.courseId,
            user_id: issued.userId,
            issued_at: issued.issuedAt,
            status: issued.status.toLowerCase(),
          });
        } catch {
          // The compatibility record above remains available during staged migrations.
        }
      }
      setLoading(false);
    };
    if (id) fetch();
  }, [id, user]);

  const handleRegister = async () => {
    if (!user) { navigate("/auth"); return; }
    setRegistering(true);
    try {
      if(course.is_paid&&paymentMethod!=="Cash"&&!txnId.trim()){toast.error("Please enter transaction ID");setRegistering(false);return;}
      const result=await apiRequest<any>(`/learning/courses/${id}/enroll`,{method:"POST",csrfToken:csrfToken??undefined,body:{paymentMethod:course.is_paid?paymentMethod:"Not Required",transactionReference:course.is_paid&&paymentMethod!=="Cash"?txnId:undefined}});
      toast.success(
        paymentMethod === "Cash"
          ? "Registration submitted! Please pay cash to the admin."
          : course.is_paid
          ? "Registration submitted! Awaiting payment verification."
          : "Enrolled successfully!"
      );
      setRegistration({id:result.id,normalized:true,payment_status:result.paymentStatus==="NOT_REQUIRED"?"confirmed":"pending",completed:false,progress:{}});
    }catch(error){toast.error(error instanceof Error?error.message:"Registration failed");}
    setRegistering(false);
  };

  const toggleLessonComplete = async (lessonId: string) => {
    if (!registration || !user) return;
    if(registration.normalized){try{const next=await apiRequest<any>(`/learning/enrollments/${registration.id}/progress/${lessonId}`,{method:"POST",csrfToken:csrfToken??undefined,body:{completed:!registration.progress?.[lessonId]}});const progress={...(registration.progress||{}),[lessonId]:!registration.progress?.[lessonId]};setRegistration({...registration,progress,completed:next.status==="COMPLETED"});if(next.status==="COMPLETED")toast.success("Course completed. You can now request your certificate.");}catch(error){toast.error(error instanceof Error?error.message:"Failed to update progress");}return;}
    const progress = { ...(registration.progress || {}) };
    progress[lessonId] = !progress[lessonId];
    const completedCount = Object.values(progress).filter(Boolean).length;
    const allDone = completedCount === lessons.length && lessons.length > 0;
    const { error } = await cloudflareData
      .from("course_registrations")
      .update({ progress, completed: allDone })
      .eq("id", registration.id);
    if (error) { toast.error("Failed to update progress"); return; }
    setRegistration({ ...registration, progress, completed: allDone });

    if (allDone) toast.success("Course completed. You can now request your certificate.", { duration: 5000 });
  };

  const requestCertificate = async () => {
    if (!id) return;
    setRequestingCertificate(true);
    try {
      const next = await apiRequest<{ id: string; status: string }>("/learning/certificates/requests", {
        method: "POST",
        body: { courseId: id },
        csrfToken: csrfToken ?? undefined,
      });
      setCertificateRequest({ ...next, courseId: id });
      toast.success("Certificate request submitted for administrator review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The certificate request could not be submitted.");
    } finally {
      setRequestingCertificate(false);
    }
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
              <img src={getOptimizedImageUrl(course.image_url, { width: 800, height: 350 })} alt={course.title} className="w-full h-48 md:h-64 object-cover" />
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
                    <option value="Cash">Cash Payment</option>
                  </select>
                  {(paymentMethod === "bKash" || paymentMethod === "Nagad" || paymentMethod === "Rocket") && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                      <p>Send <strong className="text-foreground">৳{course.price}</strong> to:</p>
                      <p className="text-primary font-mono text-lg font-bold mt-1">+8801580352238</p>
                      <p className="text-xs mt-1">({paymentMethod} Personal) — Use "Send Money" option and note the Transaction ID.</p>
                    </div>
                  )}
                  {paymentMethod === "Cash" && (
                    <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-sm text-muted-foreground">
                      <p className="font-semibold text-yellow-400">💵 Cash Payment</p>
                      <p className="text-xs mt-1">Pay <strong className="text-foreground">৳{course.price}</strong> directly to the club admin. An unpaid payslip will be generated for tracking.</p>
                    </div>
                  )}
                  {paymentMethod !== "Cash" && (
                    <input placeholder="Transaction ID *" value={txnId} onChange={(e) => setTxnId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  )}
                </div>
              )}
              <button onClick={handleRegister} disabled={registering}
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {registering ? "Processing..." : course.is_paid ? "Submit Payment & Enroll" : "Enroll for Free"}
              </button>
            </motion.div>
          ) : (registration.payment_status === "pending" || registration.payment_status === "unpaid") && course.is_paid ? (
            <div className="rounded-xl glass p-6 mb-8 space-y-4">
              <div className="text-center">
                <p className="text-yellow-400 font-medium">
                  {registration.payment_status === "unpaid" ? "💵 Cash Payment - Unpaid" : "⏳ Payment verification pending"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {registration.payment_status === "unpaid"
                    ? "Please pay cash to the club admin to confirm enrollment."
                    : "Your enrollment will be confirmed once payment is verified."}
                </p>
              </div>
              <PaymentSlip
                type="course"
                title={course.title}
                name={user?.email || ""}
                email={user?.email || ""}
                amount={course.price || 0}
                paymentMethod={registration.payment_method || ""}
                transactionId={registration.transaction_id || ""}
                status={registration.payment_status as "pending" | "confirmed" | "unpaid"}
                date={registration.registered_at}
                registrationId={registration.id}
              />
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
              {certificate && (
                <Link
                  to={`/certificate/${certificate.id}`}
                  className="mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  <Award size={18} /> View Certificate
                  <ExternalLink size={14} />
                </Link>
              )}
              {registration.completed && !certificate && !certificateRequest && (
                <button
                  type="button"
                  onClick={() => void requestCertificate()}
                  disabled={requestingCertificate}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Award size={18} /> {requestingCertificate ? "Submitting request…" : "Request Certificate"}
                </button>
              )}
              {registration.completed && !certificate && certificateRequest && (
                <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-amber-300">Certificate {String(certificateRequest.status).replace(/_/g, " ").toLowerCase()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">An authorized administrator must approve the request before a certificate is issued.</p>
                </div>
              )}
            </div>
          )}

          {/* Video Player */}
          {activeVideo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl overflow-hidden glass"
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">Now Playing</p>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={getYouTubeEmbedUrl(activeVideo)}
                  title="Lesson Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
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
                      {lesson.module_title && <p className="mt-0.5 text-[11px] text-muted-foreground">{lesson.module_title}</p>}
                      {canAccess && lesson.contents?.length > 0 && <div className="mt-3 space-y-2">{lesson.contents.map((content:any)=><div key={content.id} className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs">{["TEXT","RICH_TEXT"].includes(content.content_type)&&<div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">{content.body}</div>}{content.content_type==="IMAGE"&&content.url&&<img src={content.url} alt={content.title||"Lesson resource"} className="max-h-72 rounded-lg object-contain"/>}{!["TEXT","RICH_TEXT","IMAGE","YOUTUBE","VIDEO","PDF"].includes(content.content_type)&&content.url&&<a href={content.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary"><FileText size={13}/>{content.title||content.content_type}<ExternalLink size={12}/></a>}</div>)}</div>}
                    </div>
                    {canAccess && (
                      <div className="flex gap-2 shrink-0">
                        {lesson.video_url && (
                          <button
                            onClick={() => setActiveVideo(lesson.video_url)}
                            className={`p-2 rounded-lg transition-colors ${
                              activeVideo === lesson.video_url
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                            title="Watch Video"
                          >
                            <Play size={14} />
                          </button>
                        )}
                        {lesson.pdf_file && (
                          <button
                            onClick={() => setActivePdf(activePdf === lesson.pdf_file ? null : lesson.pdf_file)}
                            className={`p-2 rounded-lg transition-colors ${
                              activePdf === lesson.pdf_file
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                            title="View PDF"
                          >
                            <FileText size={14} />
                          </button>
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
