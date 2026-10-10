import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/contexts/AuthContext";
import { cloudflareData } from "@/integrations/cloudflare/client";
import { apiRequest } from "@/lib/api";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Save, X, Award, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/cloudflare/types";

interface UserSubmission {
  id: string;
  referenceCode: string;
  type: string;
  title: string;
  status: string;
  updatedAt: string;
}

interface UserNotification {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

const Dashboard = () => {
  const { user, loading, signOut, csrfToken } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [learning, setLearning] = useState<{courses:any[];events:any[]}>({courses:[],events:[]});
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    department: "",
    batch: "",
    session: "",
    student_id: "",
    skills: "",
    linkedin: "",
    github: "",
    facebook_link: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      cloudflareData
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          setProfile(data);
          if (data) {
            setForm({
              full_name: data.full_name || "",
              phone: data.phone || "",
              department: data.department || "",
              batch: data.batch || "",
              session: data.session || "",
              student_id: data.student_id || "",
              skills: data.skills || "",
              linkedin: data.linkedin || "",
              github: data.github || "",
              facebook_link: data.facebook_link || "",
            });
          }
        });

      cloudflareData
        .from("certificates")
        .select("*, courses(title, instructor)")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false })
        .then(({ data }) => {
          setCertificates(data || []);
        });

      void Promise.all([
        apiRequest<UserSubmission[]>("/submissions/mine").then(setSubmissions),
        apiRequest<UserNotification[]>("/notifications").then(setNotifications),
        apiRequest<any>("/learning/dashboard").then((data)=>{setLearning({courses:data.courses||[],events:data.events||[]});if(data.certificates?.length)setCertificates(data.certificates.map((cert:any)=>({id:cert.id,certificate_number:cert.certificate_number,issued_at:cert.issued_at,status:cert.status,courses:{title:cert.course_title}})));}),
      ]).catch(() => toast.error("Some dashboard activity could not be loaded."));
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await cloudflareData
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        department: form.department || null,
        batch: form.batch || null,
        session: form.session || null,
        student_id: form.student_id || null,
        skills: form.skills || null,
        linkedin: form.linkedin || null,
        github: form.github || null,
        facebook_link: form.facebook_link || null,
      })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      // Refresh profile
      const { data } = await cloudflareData.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };
  const requestEventCertificate = async (eventId: string) => {
    if (!csrfToken) return toast.error("Your session is not ready. Refresh and try again.");
    try {
      await apiRequest(`/learning/events/${eventId}/certificate-request`, { method: "POST", csrfToken, body: {} });
      toast.success("Certificate request submitted for review.");
      const data = await apiRequest<any>("/learning/dashboard");
      setLearning({ courses: data.courses || [], events: data.events || [] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Certificate request failed."); }
  };

  if (loading || !user) return null;

  const inputClass =
    "w-full rounded-xl border border-input bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground shadow-inner shadow-black/10 transition placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/[0.15]";

  return (
    <Layout>
      <section className="py-20">
        <div className="container max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <SectionHeading level={1} title="Dashboard" align="left" />
            <div className="flex flex-wrap justify-end gap-2">
              <Link to="/account/security" className="px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 transition-colors">Account & password</Link>
              {user.permissions.includes("admin.access") && <Link to="/admin" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Administration</Link>}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl glass"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-bold tracking-wider text-primary">Profile</h3>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                    >
                      <Save size={12} /> Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        if (profile) {
                          setForm({
                            full_name: profile.full_name || "",
                            phone: profile.phone || "",
                            department: profile.department || "",
                            batch: profile.batch || "",
                            session: profile.session || "",
                            student_id: profile.student_id || "",
                            skills: profile.skills || "",
                            linkedin: profile.linkedin || "",
                            github: profile.github || "",
                            facebook_link: profile.facebook_link || "",
                          });
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                    <input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Student ID</label>
                      <input className={inputClass} value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                      <input className={inputClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Batch</label>
                      <input className={inputClass} value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Session</label>
                      <input className={inputClass} value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                    <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Skills</label>
                    <input className={inputClass} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. Python, IoT, Arduino" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">LinkedIn</label>
                    <input className={inputClass} value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">GitHub</label>
                    <input className={inputClass} value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Facebook</label>
                    <input className={inputClass} value={form.facebook_link} onChange={(e) => setForm({ ...form, facebook_link: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <ProfileRow label="Name" value={profile?.full_name} />
                  <ProfileRow label="Email" value={user.email} />
                  <ProfileRow label="Student ID" value={profile?.student_id} />
                  <ProfileRow label="Department" value={profile?.department} />
                  <ProfileRow label="Batch" value={profile?.batch} />
                  <ProfileRow label="Session" value={profile?.session} />
                  <ProfileRow label="Phone" value={profile?.phone} />
                  <ProfileRow label="Skills" value={profile?.skills} />
                  <ProfileRow label="LinkedIn" value={profile?.linkedin} />
                  <ProfileRow label="GitHub" value={profile?.github} />
                </div>
              )}
            </motion.div>

            {/* Member ID Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-xl glass border-primary/20"
            >
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">Membership & volunteering</h3>
              <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/20 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto mb-3 flex items-center justify-center">
                  <span className="font-display text-xl font-bold text-primary">
                    {profile?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </span>
                </div>
                <h4 className="font-semibold text-foreground">{profile?.full_name}</h4>
                <p className="text-xs text-muted-foreground">{profile?.department || "—"}</p>
                <p className="text-xs text-muted-foreground mt-3">Authoritative applications, membership IDs, volunteer IDs, renewals, and closure history are stored separately from this compatibility profile.</p>
                <Link to="/dashboard/membership" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open membership workspace</Link>
              </div>
            </motion.div>
          </div>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 p-6 rounded-xl glass">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-display text-sm font-bold tracking-wider text-primary">My submissions</h3><p className="mt-1 text-sm text-muted-foreground">Track proposals and requests stored securely in Cloudflare D1.</p></div>
              <div className="flex gap-2"><Link to="/projects/submit" className="rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/40">Submit project</Link><Link to="/research/submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Submit research</Link></div>
            </div>
            <div className="mt-4 space-y-2">
              {submissions.length === 0 ? <p className="text-sm text-muted-foreground">No proposals submitted from this account yet.</p> : submissions.map((submission) => <article key={submission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-4 text-sm"><div><strong>{submission.title}</strong><p className="mt-1 text-xs text-muted-foreground">{submission.type} · {submission.referenceCode} · updated {new Date(submission.updatedAt).toLocaleString()}</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{submission.status.replace(/_/g, " ")}</span></article>)}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mt-6 p-6 rounded-xl glass">
            <h3 className="font-display text-sm font-bold tracking-wider text-primary">Notifications</h3>
            <div className="mt-4 space-y-2">{notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : notifications.slice(0, 8).map((notification) => <article key={notification.id} className={`rounded-lg border p-3 text-sm ${notification.readAt ? "border-border/50" : "border-primary/30 bg-primary/5"}`}><div className="flex flex-wrap justify-between gap-2"><strong>{notification.title}</strong><time className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</time></div><p className="mt-1 text-muted-foreground">{notification.message}</p>{notification.actionUrl && <Link className="mt-2 inline-block text-xs text-primary hover:underline" to={notification.actionUrl}>Open</Link>}</article>)}</div>
          </motion.section>

          <motion.section initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mt-6 rounded-xl glass p-6"><h3 className="font-display text-sm font-bold tracking-wider text-primary">My Courses</h3>{learning.courses.length===0?<p className="mt-4 text-sm text-muted-foreground">No course enrollments yet.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2">{learning.courses.map(course=><Link key={course.id} to={`/courses/${course.course_id}`} className="rounded-xl border border-border p-4 hover:border-primary/40"><div className="flex justify-between gap-2"><strong>{course.title}</strong><span className="text-xs text-primary">{course.progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{width:`${course.progress}%`}}/></div><p className="mt-2 text-xs text-muted-foreground">{String(course.enrollment_status).replace(/_/g," ")} · {course.completed_lessons}/{course.total_lessons} lessons</p></Link>)}</div>}</motion.section>
          <motion.section initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mt-6 rounded-xl glass p-6"><h3 className="font-display text-sm font-bold tracking-wider text-primary">My Events</h3>{learning.events.length===0?<p className="mt-4 text-sm text-muted-foreground">No event registrations yet.</p>:<div className="mt-4 space-y-2">{learning.events.map(event=><div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"><div><Link to={`/events/${event.slug}`}><strong className="hover:text-primary">{event.title}</strong></Link><p className="mt-1 text-xs text-muted-foreground">{event.registration_status} · Payment {event.payment_status} · Attendance {event.attendance_status}</p>{event.location_type!=="PHYSICAL"&&event.registration_status==="APPROVED"&&event.online_url&&<a href={event.online_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">Open {event.online_platform||"online event"}</a>}</div><div className="flex items-center gap-2">{Boolean(event.certificate_eligible)&&!event.certificate_status&&<button onClick={()=>void requestEventCertificate(event.event_id)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Request certificate</button>}{event.certificate_status&&<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Certificate {event.certificate_status}</span>}</div></div>)}</div>}</motion.section>

          {/* My Certificates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-6 rounded-xl glass"
          >
            <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4 flex items-center gap-2">
              <Award size={16} /> My Certificates
            </h3>
            {certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No certificates yet. Complete a course and submit a certificate request.
              </p>
            ) : (
              <div className="space-y-3">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {cert.courses?.title || "Course"}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          {cert.certificate_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(cert.issued_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/certificate/${cert.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <ExternalLink size={12} /> View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

const ProfileRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <span className="text-muted-foreground">{label}:</span>{" "}
    <span className="text-foreground">{value || "Not set"}</span>
  </div>
);

export default Dashboard;
