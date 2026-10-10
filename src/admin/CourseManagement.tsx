import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Download,
  FilePlus2,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  adminButton,
  adminInput,
  adminSecondaryButton,
} from "./AdminUI";
import CertificateManagement from "./CertificateManagement";

type Tab =
  | "courses"
  | "curriculum"
  | "enrollments"
  | "completed"
  | "certificates";
interface Course {
  id: string;
  title: string;
  short_description?: string;
  full_description?: string;
  thumbnail_url?: string;
  instructor?: string;
  instructor_bio?: string;
  category?: string;
  level: string;
  duration?: string;
  language: string;
  tags: string[];
  objectives: string[];
  prerequisites: string[];
  course_type: string;
  price: number;
  currency: string;
  payment_instructions?: string;
  status: string;
  featured: number;
  sort_order: number;
  enrollment_count: number;
  completed_count: number;
  modules?: Module[];
}
interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  sort_order: number;
  status: string;
  lessons: Lesson[];
}
interface Lesson {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  sort_order: number;
  status: string;
  contents: Content[];
}
interface Content {
  id: string;
  lesson_id: string;
  content_type: string;
  title?: string;
  body?: string;
  url?: string;
  object_key?: string;
  content_type_metadata?: string;
  byte_size?: number;
  sort_order: number;
  status: string;
}
interface Enrollment {
  id: string;
  student: string;
  email: string;
  title: string;
  course_type: string;
  price: number;
  currency: string;
  payment_status: string;
  enrollment_status: string;
  progress: number;
  enrolled_at: string;
  completed_at?: string;
  certificate_status?: string;
}
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function CourseManagement({
  permissions,
  csrfToken,
}: {
  permissions: string[];
  csrfToken?: string;
}) {
  const [tab, setTab] = useState<Tab>("courses"),
    [courses, setCourses] = useState<Course[]>([]),
    [enrollments, setEnrollments] = useState<Enrollment[]>([]),
    [selected, setSelected] = useState<Course | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [courseForm, setCourseForm] = useState<Partial<Course> | null>(null),
    [moduleForm, setModuleForm] = useState<Partial<Module> | null>(null),
    [lessonForm, setLessonForm] = useState<Partial<Lesson> | null>(null),
    [contentForm, setContentForm] = useState<Partial<Content> | null>(null),
    [busy, setBusy] = useState(false);
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState("ALL");
  const [enrollmentType, setEnrollmentType] = useState("ALL");
  const [enrollmentCourse, setEnrollmentCourse] = useState("ALL");
  const [enrollmentFrom, setEnrollmentFrom] = useState("");
  const [enrollmentTo, setEnrollmentTo] = useState("");
  const canManage = permissions.includes("course.manage"),
    canPublish = permissions.includes("content.publish"),
    canFinance = permissions.includes("finance.verify");
  const selectedId = selected?.id;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, e] = await Promise.all([
        apiRequest<Course[]>("/admin/courses"),
        apiRequest<Enrollment[]>("/admin/enrollments"),
      ]);
      setCourses(c);
      setEnrollments(e);
      if (selectedId) {
        const detail = await apiRequest<Course>(`/admin/courses/${selectedId}`);
        setSelected(detail);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Learning management is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedId]);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      courses.filter(
        (c) =>
          !search ||
          `${c.title} ${c.instructor || ""} ${c.category || ""}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [courses, search],
  );
  const filteredEnrollments = useMemo(
    () =>
      enrollments.filter((enrollment) => {
        const term = enrollmentSearch.trim().toLowerCase();
        if (
          term &&
          !`${enrollment.student} ${enrollment.email} ${enrollment.title}`
            .toLowerCase()
            .includes(term)
        )
          return false;
        if (tab === "completed" && enrollment.enrollment_status !== "COMPLETED")
          return false;
        if (
          enrollmentStatus !== "ALL" &&
          enrollment.enrollment_status !== enrollmentStatus
        )
          return false;
        if (
          enrollmentType !== "ALL" &&
          enrollment.course_type !== enrollmentType
        )
          return false;
        if (enrollmentCourse !== "ALL" && enrollment.title !== enrollmentCourse)
          return false;
        const date = enrollment.enrolled_at.slice(0, 10);
        if (enrollmentFrom && date < enrollmentFrom) return false;
        if (enrollmentTo && date > enrollmentTo) return false;
        return true;
      }),
    [
      enrollments,
      enrollmentSearch,
      enrollmentStatus,
      enrollmentType,
      enrollmentCourse,
      enrollmentFrom,
      enrollmentTo,
      tab,
    ],
  );
  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm || !csrfToken) return;
    setBusy(true);
    try {
      const id = courseForm.id || crypto.randomUUID();
      await apiRequest(`/admin/courses/${id}`, {
        method: "PUT",
        csrfToken,
        body: {
          title: courseForm.title,
          shortDescription: courseForm.short_description,
          fullDescription: courseForm.full_description,
          thumbnailUrl: courseForm.thumbnail_url,
          instructor: courseForm.instructor,
          instructorBio: courseForm.instructor_bio,
          category: courseForm.category,
          level: courseForm.level || "BEGINNER",
          duration: courseForm.duration,
          language: courseForm.language || "English",
          tags: courseForm.tags || [],
          objectives: courseForm.objectives || [],
          prerequisites: courseForm.prerequisites || [],
          courseType: courseForm.course_type || "FREE",
          price:
            courseForm.course_type === "PAID"
              ? Number(courseForm.price || 0)
              : 0,
          currency: courseForm.currency || "BDT",
          paymentInstructions: courseForm.payment_instructions,
          status: courseForm.status || "DRAFT",
          featured: Boolean(courseForm.featured),
          sortOrder: Number(courseForm.sort_order || 0),
        },
      });
      toast.success("Course saved.");
      setCourseForm(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save course.");
    } finally {
      setBusy(false);
    }
  };
  const saveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm || !selected || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(
        `/admin/course-modules/${moduleForm.id || crypto.randomUUID()}`,
        {
          method: "PUT",
          csrfToken,
          body: {
            courseId: selected.id,
            title: moduleForm.title,
            description: moduleForm.description,
            sortOrder: Number(moduleForm.sort_order || 0),
            status: moduleForm.status || "DRAFT",
          },
        },
      );
      toast.success("Module saved.");
      setModuleForm(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save module.");
    } finally {
      setBusy(false);
    }
  };
  const saveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm || !selected || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(
        `/admin/course-lessons/${lessonForm.id || crypto.randomUUID()}`,
        {
          method: "PUT",
          csrfToken,
          body: {
            courseId: selected.id,
            moduleId: lessonForm.module_id,
            title: lessonForm.title,
            description: lessonForm.description,
            durationMinutes: Number(lessonForm.duration_minutes || 0),
            sortOrder: Number(lessonForm.sort_order || 0),
            status: lessonForm.status || "DRAFT",
          },
        },
      );
      toast.success("Lesson saved.");
      setLessonForm(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save lesson.");
    } finally {
      setBusy(false);
    }
  };
  const saveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentForm || !csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(
        `/admin/lesson-contents/${contentForm.id || crypto.randomUUID()}`,
        {
          method: "PUT",
          csrfToken,
          body: {
            lessonId: contentForm.lesson_id,
            contentType: contentForm.content_type || "TEXT",
            title: contentForm.title,
            body: contentForm.body,
            url: contentForm.url,
            objectKey: contentForm.object_key,
            metadataContentType: contentForm.content_type_metadata,
            byteSize: contentForm.byte_size,
            sortOrder: Number(contentForm.sort_order || 0),
            status: contentForm.status || "DRAFT",
          },
        },
      );
      toast.success("Lesson content saved.");
      setContentForm(null);
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Unable to save lesson content.",
      );
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File | null) => {
    if (!file || !contentForm || !csrfToken) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const media = await apiRequest<{
        key: string;
        url: string;
        contentType: string;
        byteSize: number;
        originalName: string;
      }>("/media/upload", { method: "POST", csrfToken, body });
      setContentForm({
        ...contentForm,
        title: contentForm.title || media.originalName,
        url: media.url,
        object_key: media.key,
        content_type_metadata: media.contentType,
        byte_size: media.byteSize,
        content_type:
          file.type === "application/pdf"
            ? "PDF"
            : file.type.includes("word")
              ? "DOC"
              : file.type.includes("presentation")
                ? "PPT"
                : file.type.startsWith("image/")
                  ? "IMAGE"
                  : file.type.startsWith("video/")
                    ? "VIDEO"
                    : "DOWNLOAD",
      });
      toast.success("Resource uploaded to R2.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const uploadThumbnail = async (file: File | null) => {
    if (!file || !courseForm || !csrfToken) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const media = await apiRequest<{ url: string }>("/media/upload", {
        method: "POST",
        csrfToken,
        body,
      });
      setCourseForm({ ...courseForm, thumbnail_url: media.url });
      toast.success("Course thumbnail uploaded to R2.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const decide = async (id: string, action: string) => {
    if (!csrfToken) return;
    try {
      await apiRequest(`/admin/enrollments/${id}/decision`, {
        method: "POST",
        csrfToken,
        body: {
          action,
          reason: `Administrator ${action.toLowerCase()} action`,
        },
      });
      toast.success("Enrollment updated.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    }
  };
  const archive = async (
    kind: "module" | "lesson" | "content",
    id: string,
    title: string,
  ) => {
    if (!csrfToken || !window.confirm(`Archive “${title}”?`)) return;
    try {
      await apiRequest(`/admin/course-content/${kind}/${id}/archive`, {
        method: "POST",
        csrfToken,
      });
      toast.success(`${kind[0].toUpperCase()}${kind.slice(1)} archived.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed.");
    }
  };
  const exportCsv = () => {
    const source = filteredEnrollments;
    const rows = [
      [
        "Student",
        "Email",
        "Course",
        "Type",
        "Payment",
        "Progress",
        "Status",
        "Certificate",
      ],
      ...source.map((e) => [
        e.student,
        e.email,
        e.title,
        e.course_type,
        e.payment_status,
        `${e.progress}%`,
        e.enrollment_status,
        e.certificate_status,
      ]),
    ];
    const blob = new Blob(
      [rows.map((r) => r.map(csv).join(",")).join("\r\n")],
      { type: "text/csv" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tab}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  if (tab === "certificates")
    return (
      <div className="space-y-5">
        <Tabs value={tab} set={setTab} />
        <CertificateManagement
          permissions={permissions}
          csrfToken={csrfToken}
        />
      </div>
    );
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Learning Management"
        description="Courses, curriculum, resources, enrollment, progress, payments, completion, and certificates in one D1-backed workspace."
        actions={
          <>
            {(tab === "enrollments" || tab === "completed") && (
              <button onClick={exportCsv} className={adminSecondaryButton}>
                <Download size={16} />
                Export CSV
              </button>
            )}
            {canManage && tab === "courses" && (
              <button
                onClick={() =>
                  setCourseForm({
                    title: "",
                    level: "BEGINNER",
                    language: "English",
                    tags: [],
                    objectives: [],
                    prerequisites: [],
                    course_type: "FREE",
                    price: 0,
                    currency: "BDT",
                    status: "DRAFT",
                    sort_order: 0,
                  })
                }
                className={adminButton}
              >
                <FilePlus2 size={16} />
                Create Course
              </button>
            )}
          </>
        }
      />
      <Tabs value={tab} set={setTab} />
      {tab === "courses" && (
        <>
          <AdminCard className="p-4">
            <label className="relative block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <input
                className={`${adminInput} pl-9`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses…"
              />
            </label>
          </AdminCard>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : visible.length === 0 ? (
            <EmptyState
              title="No courses found"
              description="Create your first course."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {visible.map((c) => (
                <AdminCard key={c.id} className="overflow-hidden">
                  <div className="aspect-[2/1] bg-primary/5">
                    {c.thumbnail_url ? (
                      <img
                        src={c.thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-primary/40">
                        <BookOpen size={40} />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between gap-2">
                      <h2 className="font-semibold">{c.title}</h2>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {c.instructor || "Instructor pending"} · {c.level} ·{" "}
                      {c.course_type === "PAID"
                        ? `${c.currency} ${c.price}`
                        : "Free"}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setCourseForm(c)}
                        className={adminSecondaryButton}
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          setTab("curriculum");
                          setSelected(
                            await apiRequest<Course>(`/admin/courses/${c.id}`),
                          );
                        }}
                        className={adminButton}
                      >
                        Curriculum
                      </button>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}
        </>
      )}
      {tab === "curriculum" && (
        <>
          {!selected ? (
            <EmptyState
              title="Select a course"
              description="Open Curriculum from a course card to manage modules and lessons."
            />
          ) : (
            <>
              <AdminCard className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-xs text-muted-foreground">Curriculum</p>
                  <h2 className="text-xl font-semibold">{selected.title}</h2>
                </div>
                <button
                  onClick={() =>
                    setModuleForm({
                      course_id: selected.id,
                      title: "",
                      sort_order: (selected.modules?.length || 0) + 1,
                      status: "DRAFT",
                      lessons: [],
                    })
                  }
                  className={adminButton}
                >
                  Add Module
                </button>
              </AdminCard>
              {selected.modules?.length ? (
                <div className="space-y-4">
                  {selected.modules.map((m) => (
                    <AdminCard key={m.id} className="p-5">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">
                            {m.sort_order}. {m.title}
                          </h3>
                          <StatusBadge status={m.status} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setModuleForm(m)}
                            className={adminSecondaryButton}
                          >
                            Edit module
                          </button>
                          <button
                            onClick={() =>
                              void archive("module", m.id, m.title)
                            }
                            className={adminSecondaryButton}
                          >
                            Archive
                          </button>
                          <button
                            onClick={() =>
                              setLessonForm({
                                course_id: selected.id,
                                module_id: m.id,
                                title: "",
                                sort_order: m.lessons.length + 1,
                                status: "DRAFT",
                                contents: [],
                              })
                            }
                            className={adminButton}
                          >
                            Add lesson
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {m.lessons.map((l) => (
                          <div
                            key={l.id}
                            className="rounded-xl border border-[hsl(var(--admin-border))] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span>
                                {l.sort_order}. {l.title}
                              </span>
                              <div className="flex flex-wrap gap-2">
                                <StatusBadge status={l.status} />
                                <button
                                  onClick={() => setLessonForm(l)}
                                  className={adminSecondaryButton}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    void archive("lesson", l.id, l.title)
                                  }
                                  className={adminSecondaryButton}
                                >
                                  Archive
                                </button>
                                <button
                                  onClick={() =>
                                    setContentForm({
                                      lesson_id: l.id,
                                      content_type: "TEXT",
                                      status: "DRAFT",
                                      sort_order: l.contents.length,
                                    })
                                  }
                                  className={adminButton}
                                >
                                  Add content
                                </button>
                              </div>
                            </div>
                            {l.contents.map((x) => (
                              <div
                                key={x.id}
                                className="mt-2 flex flex-wrap justify-between gap-2 rounded-lg bg-primary/[.035] px-3 py-2 text-xs"
                              >
                                <span>
                                  {x.content_type} ·{" "}
                                  {x.title || "Content block"}
                                </span>
                                <span className="flex gap-3">
                                  <button
                                    onClick={() => setContentForm(x)}
                                    className="text-primary"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      void archive(
                                        "content",
                                        x.id,
                                        x.title || "Content block",
                                      )
                                    }
                                    className="text-red-300"
                                  >
                                    Archive
                                  </button>
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </AdminCard>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No curriculum yet"
                  description="Add the first module, then add lessons and content blocks."
                />
              )}
            </>
          )}
        </>
      )}
      {(tab === "enrollments" || tab === "completed") && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total enrollments", enrollments.length],
              [
                "Active",
                enrollments.filter((item) =>
                  ["ENROLLED", "IN_PROGRESS"].includes(item.enrollment_status),
                ).length,
              ],
              [
                "Completed",
                enrollments.filter(
                  (item) => item.enrollment_status === "COMPLETED",
                ).length,
              ],
              [
                "Pending payment",
                enrollments.filter((item) =>
                  ["PENDING", "SUBMITTED"].includes(item.payment_status),
                ).length,
              ],
              [
                "Free",
                enrollments.filter((item) => item.course_type === "FREE")
                  .length,
              ],
              [
                "Paid",
                enrollments.filter((item) => item.course_type === "PAID")
                  .length,
              ],
              [
                "Certificates",
                enrollments.filter(
                  (item) => item.certificate_status === "ISSUED",
                ).length,
              ],
            ].map(([label, value]) => (
              <AdminCard key={String(label)} className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </AdminCard>
            ))}
          </div>
          <AdminCard className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
            <label className="relative xl:col-span-2">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <input
                className={`${adminInput} pl-9`}
                value={enrollmentSearch}
                onChange={(event) => setEnrollmentSearch(event.target.value)}
                placeholder="Search learner, email, course…"
              />
            </label>
            <select
              className={adminInput}
              value={enrollmentCourse}
              onChange={(event) => setEnrollmentCourse(event.target.value)}
            >
              <option value="ALL">All courses</option>
              {Array.from(new Set(enrollments.map((item) => item.title))).map(
                (title) => (
                  <option key={title}>{title}</option>
                ),
              )}
            </select>
            <select
              className={adminInput}
              value={enrollmentStatus}
              onChange={(event) => setEnrollmentStatus(event.target.value)}
            >
              <option value="ALL">All statuses</option>
              {[
                "PENDING",
                "ENROLLED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <select
              className={adminInput}
              value={enrollmentType}
              onChange={(event) => setEnrollmentType(event.target.value)}
            >
              <option value="ALL">Free and paid</option>
              <option value="FREE">Free</option>
              <option value="PAID">Paid</option>
            </select>
            <div className="flex gap-2">
              <input
                aria-label="Enrollment date from"
                type="date"
                className={adminInput}
                value={enrollmentFrom}
                onChange={(event) => setEnrollmentFrom(event.target.value)}
              />
              <input
                aria-label="Enrollment date to"
                type="date"
                className={adminInput}
                value={enrollmentTo}
                onChange={(event) => setEnrollmentTo(event.target.value)}
              />
            </div>
          </AdminCard>
          <EnrollmentTable
            rows={filteredEnrollments}
            canManage={canManage}
            canFinance={canFinance}
            decide={decide}
          />
        </div>
      )}
      {courseForm && (
        <Drawer
          title={courseForm.id ? "Edit course" : "Create course"}
          close={() => setCourseForm(null)}
        >
          <form onSubmit={saveCourse} className="space-y-4">
            <Field
              label="Course title *"
              value={courseForm.title || ""}
              set={(v) => setCourseForm({ ...courseForm, title: v })}
              required
            />
            <Area
              label="Short description"
              value={courseForm.short_description || ""}
              set={(v) =>
                setCourseForm({ ...courseForm, short_description: v })
              }
            />
            <Area
              label="Full description"
              value={courseForm.full_description || ""}
              set={(v) => setCourseForm({ ...courseForm, full_description: v })}
              rows={8}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Instructor"
                value={courseForm.instructor || ""}
                set={(v) => setCourseForm({ ...courseForm, instructor: v })}
              />
              <Field
                label="Language"
                value={courseForm.language || "English"}
                set={(v) => setCourseForm({ ...courseForm, language: v })}
              />
              <Field
                label="Category"
                value={courseForm.category || ""}
                set={(v) => setCourseForm({ ...courseForm, category: v })}
              />
              <Select
                label="Level"
                value={courseForm.level || "BEGINNER"}
                set={(v) => setCourseForm({ ...courseForm, level: v })}
                options={["BEGINNER", "INTERMEDIATE", "ADVANCED"]}
              />
              <Field
                label="Duration"
                value={courseForm.duration || ""}
                set={(v) => setCourseForm({ ...courseForm, duration: v })}
              />
              <Select
                label="Course type"
                value={courseForm.course_type || "FREE"}
                set={(v) =>
                  setCourseForm({
                    ...courseForm,
                    course_type: v,
                    price: v === "FREE" ? 0 : courseForm.price,
                  })
                }
                options={["FREE", "PAID"]}
              />
              {courseForm.course_type === "PAID" && (
                <>
                  <Field
                    label="Price"
                    type="number"
                    value={String(courseForm.price || 0)}
                    set={(v) =>
                      setCourseForm({ ...courseForm, price: Number(v) })
                    }
                  />
                  <Field
                    label="Currency"
                    value={courseForm.currency || "BDT"}
                    set={(v) =>
                      setCourseForm({
                        ...courseForm,
                        currency: v.toUpperCase().slice(0, 3),
                      })
                    }
                  />
                </>
              )}
              <Select
                label="Status"
                value={courseForm.status || "DRAFT"}
                set={(v) => setCourseForm({ ...courseForm, status: v })}
                options={[
                  "DRAFT",
                  "REVIEW",
                  ...(canPublish ? ["PUBLISHED"] : []),
                  "ARCHIVED",
                ]}
              />
              <Field
                label="Thumbnail URL"
                value={courseForm.thumbnail_url || ""}
                set={(v) => setCourseForm({ ...courseForm, thumbnail_url: v })}
              />
              <Field
                label="Display order"
                type="number"
                value={String(courseForm.sort_order || 0)}
                set={(v) =>
                  setCourseForm({ ...courseForm, sort_order: Number(v) })
                }
              />
            </div>
            <Area
              label="Instructor bio"
              value={courseForm.instructor_bio || ""}
              set={(v) => setCourseForm({ ...courseForm, instructor_bio: v })}
            />
            {courseForm.course_type === "PAID" && (
              <Area
                label="Payment instructions"
                value={courseForm.payment_instructions || ""}
                set={(v) =>
                  setCourseForm({ ...courseForm, payment_instructions: v })
                }
              />
            )}
            <label className={`${adminSecondaryButton} w-full cursor-pointer`}>
              <Upload size={16} />
              Upload course thumbnail to R2
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) =>
                  void uploadThumbnail(e.target.files?.[0] || null)
                }
              />
            </label>
            <Area
              label="Tags (one per line)"
              value={(courseForm.tags || []).join("\n")}
              set={(v) =>
                setCourseForm({
                  ...courseForm,
                  tags: v
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
            <Area
              label="Learning objectives (one per line)"
              value={(courseForm.objectives || []).join("\n")}
              set={(v) =>
                setCourseForm({
                  ...courseForm,
                  objectives: v.split("\n").filter(Boolean),
                })
              }
            />
            <Area
              label="Prerequisites (one per line)"
              value={(courseForm.prerequisites || []).join("\n")}
              set={(v) =>
                setCourseForm({
                  ...courseForm,
                  prerequisites: v.split("\n").filter(Boolean),
                })
              }
            />
            <label className="flex items-center gap-3 rounded-xl border border-[hsl(var(--admin-border))] p-4 text-sm font-medium">
              <input
                type="checkbox"
                checked={Boolean(courseForm.featured)}
                onChange={(event) =>
                  setCourseForm({
                    ...courseForm,
                    featured: event.target.checked ? 1 : 0,
                  })
                }
              />
              Feature this course on public listings
            </label>
            <button disabled={busy} className={`${adminButton} w-full`}>
              Save course
            </button>
          </form>
        </Drawer>
      )}
      {moduleForm && (
        <Drawer title="Course module" close={() => setModuleForm(null)}>
          <form onSubmit={saveModule} className="space-y-4">
            <Field
              label="Title *"
              value={moduleForm.title || ""}
              set={(v) => setModuleForm({ ...moduleForm, title: v })}
              required
            />
            <Area
              label="Description"
              value={moduleForm.description || ""}
              set={(v) => setModuleForm({ ...moduleForm, description: v })}
            />
            <Field
              label="Order"
              type="number"
              value={String(moduleForm.sort_order || 0)}
              set={(v) =>
                setModuleForm({ ...moduleForm, sort_order: Number(v) })
              }
            />
            <Select
              label="Status"
              value={moduleForm.status || "DRAFT"}
              set={(v) => setModuleForm({ ...moduleForm, status: v })}
              options={["DRAFT", "PUBLISHED"]}
            />
            <button className={`${adminButton} w-full`}>Save module</button>
          </form>
        </Drawer>
      )}
      {lessonForm && (
        <Drawer title="Course lesson" close={() => setLessonForm(null)}>
          <form onSubmit={saveLesson} className="space-y-4">
            <Field
              label="Title *"
              value={lessonForm.title || ""}
              set={(v) => setLessonForm({ ...lessonForm, title: v })}
              required
            />
            <Area
              label="Description"
              value={lessonForm.description || ""}
              set={(v) => setLessonForm({ ...lessonForm, description: v })}
            />
            <Field
              label="Duration minutes"
              type="number"
              value={String(lessonForm.duration_minutes || 0)}
              set={(v) =>
                setLessonForm({ ...lessonForm, duration_minutes: Number(v) })
              }
            />
            <Field
              label="Order"
              type="number"
              value={String(lessonForm.sort_order || 0)}
              set={(v) =>
                setLessonForm({ ...lessonForm, sort_order: Number(v) })
              }
            />
            <Select
              label="Status"
              value={lessonForm.status || "DRAFT"}
              set={(v) => setLessonForm({ ...lessonForm, status: v })}
              options={["DRAFT", "PUBLISHED"]}
            />
            <button className={`${adminButton} w-full`}>Save lesson</button>
          </form>
        </Drawer>
      )}
      {contentForm && (
        <Drawer title="Lesson content" close={() => setContentForm(null)}>
          <form onSubmit={saveContent} className="space-y-4">
            <Select
              label="Content type"
              value={contentForm.content_type || "TEXT"}
              set={(v) => setContentForm({ ...contentForm, content_type: v })}
              options={[
                "TEXT",
                "RICH_TEXT",
                "YOUTUBE",
                "VIDEO",
                "PDF",
                "DOC",
                "PPT",
                "IMAGE",
                "EXTERNAL",
                "DOWNLOAD",
              ]}
            />
            <Field
              label="Title"
              value={contentForm.title || ""}
              set={(v) => setContentForm({ ...contentForm, title: v })}
            />
            <Area
              label="Text / description"
              value={contentForm.body || ""}
              set={(v) => setContentForm({ ...contentForm, body: v })}
              rows={8}
            />
            <Field
              label="URL"
              value={contentForm.url || ""}
              set={(v) => setContentForm({ ...contentForm, url: v })}
            />
            <label className={`${adminSecondaryButton} cursor-pointer`}>
              <Upload size={16} />
              Upload resource
              <input
                type="file"
                className="sr-only"
                onChange={(e) => void upload(e.target.files?.[0] || null)}
              />
            </label>
            <Field
              label="Order"
              type="number"
              value={String(contentForm.sort_order || 0)}
              set={(v) =>
                setContentForm({ ...contentForm, sort_order: Number(v) })
              }
            />
            <Select
              label="Status"
              value={contentForm.status || "DRAFT"}
              set={(v) => setContentForm({ ...contentForm, status: v })}
              options={["DRAFT", "PUBLISHED"]}
            />
            <button className={`${adminButton} w-full`}>Save content</button>
          </form>
        </Drawer>
      )}
    </div>
  );
}
function Tabs({ value, set }: { value: Tab; set: (t: Tab) => void }) {
  return (
    <AdminCard className="p-2">
      <div className="flex gap-2 overflow-x-auto">
        {(
          [
            "courses",
            "curriculum",
            "enrollments",
            "completed",
            "certificates",
          ] as Tab[]
        ).map((t) => (
          <button
            key={t}
            onClick={() => set(t)}
            className={`${value === t ? adminButton : adminSecondaryButton} whitespace-nowrap capitalize`}
          >
            {t}
          </button>
        ))}
      </div>
    </AdminCard>
  );
}
function EnrollmentTable({
  rows,
  canManage,
  canFinance,
  decide,
}: {
  rows: Enrollment[];
  canManage: boolean;
  canFinance: boolean;
  decide: (id: string, a: string) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  if (!rows.length)
    return (
      <EmptyState
        title="No enrollments found"
        description="Enrollments will appear here after learners register for published courses."
      />
    );
  return (
    <AdminCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-5 py-3">Student</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((e) => (
              <tr
                key={e.id}
                className="border-t border-[hsl(var(--admin-border))]"
              >
                <td className="px-5 py-4">
                  <p className="font-medium">{e.student}</p>
                  <p className="text-xs text-muted-foreground">{e.email}</p>
                </td>
                <td className="px-4 py-4">{e.title}</td>
                <td className="px-4 py-4">{e.course_type}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={e.payment_status} />
                </td>
                <td className="px-4 py-4">{e.progress}%</td>
                <td className="px-4 py-4">
                  <StatusBadge status={e.enrollment_status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {canFinance && e.payment_status === "SUBMITTED" && (
                      <button
                        onClick={() => void decide(e.id, "VERIFY_PAYMENT")}
                        className={adminButton}
                      >
                        Verify payment
                      </button>
                    )}
                    {canManage && e.enrollment_status === "PENDING" && (
                      <button
                        onClick={() => void decide(e.id, "APPROVE")}
                        className={adminSecondaryButton}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-[hsl(var(--admin-border))] px-5 py-3 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {pageCount} · {rows.length} records
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              className={adminSecondaryButton}
            >
              Previous
            </button>
            <button
              disabled={page === pageCount}
              onClick={() => setPage((value) => value + 1)}
              className={adminSecondaryButton}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AdminCard>
  );
}
function Drawer({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/70">
      <button className="absolute inset-0" onClick={close} />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-[hsl(var(--admin-surface-elevated))] p-5">
        <div className="mb-6 flex justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={close}>
            <X />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
function Field({
  label,
  value,
  set,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`${adminInput} mt-2`}
      />
    </label>
  );
}
function Area({
  label,
  value,
  set,
  rows = 4,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`${adminInput} mt-2 resize-y`}
      />
    </label>
  );
}
function Select({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`${adminInput} mt-2`}
      >
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
}
