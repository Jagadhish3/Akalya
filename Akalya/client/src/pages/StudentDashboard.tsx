// src/pages/StudentDashboard.tsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Home,
  BookOpen,
  GraduationCap,
  FileText,
  Calendar,
  MessageSquare,
  TrendingUp,
  Library,
  Bell,
  Settings,
} from "lucide-react";
import {
  coursesAPI,
  enrollmentsAPI,
  assignmentsAPI,
  submissionsAPI,
  classesAPI,
  queriesAPI,
  attendanceAPI,
  notificationsAPI,
} from "@/lib/api";
import { CourseCard } from "@/components/CourseCard";
import { SubmitAssignmentDialog } from "@/components/SubmitAssignmentDialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StudentWebsiteChatbot } from "@/components/StudentWebsiteChatbot";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Polling to emulate "real-time" REST updates (courses/assignments).
  // This keeps Student Explore + Assignments in sync after teacher create/delete.
  const pollRef = useRef<number | null>(null);
  const POLL_INTERVAL_MS = 3000;
  // --- helper: find submission for an assignment (robust matching) ---
  const findSubmissionForAssignment = (
    assignment: any,
    submissionsList: any[],
    currentUserId: string | null
  ) => {
    if (!assignment || !Array.isArray(submissionsList)) return null;
  
    // normalize assignment IDs
    const assignmentIds = [
      assignment.id,
      assignment._id,
      assignment.assignment_id,
      assignment.assignmentId,
      assignment.raw?._id,
      assignment.raw?.id,
      assignment.raw?.assignment_id,
      assignment.raw?.assignmentId,
      assignment.raw?.assignment?.id,
      assignment.raw?.assignment?.user_id
    ]
      .filter(Boolean)
      .map((x) => String(x));
  
    // check each submission
    const candidates = submissionsList.filter((s: any) => {
      const subAssign = String(
        s.assignment_id ??
          s.assignmentId ??
          s.assignment?._id ??
          s.assignment?.id ??
          s.assignment ??
          ""
      );
  
      const subStudent = String(
        s.student_id ??
          s.studentId ??
          s.student?._id ??
          s.student?.id ??
          s.student ??
          ""
      );
  
      const matchA = assignmentIds.includes(subAssign);
      const matchS = String(currentUserId) === subStudent;
  
      return matchA && matchS;
    });
  
    if (candidates.length === 0) return null;
  
    // pick most recent
    candidates.sort(
      (a: any, b: any) =>
        new Date(b.updatedAt ?? b.submitted_at ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.submitted_at ?? a.createdAt).getTime()
    );
  
    return candidates[0];
  };
  
  


  // upcoming classes state (for dashboard)
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);

  // Start Learning modal state
  const [learningOpen, setLearningOpen] = useState(false);
  const [learningClasses, setLearningClasses] = useState<any[]>([]);
  const [currentClass, setCurrentClass] = useState<any | null>(null);
  const [learningLoading, setLearningLoading] = useState(false);

  // --- Query / Doubt state (NEW) ---
  const [selectedCourseForQuery, setSelectedCourseForQuery] = useState<string>("");
  const [queryText, setQueryText] = useState<string>("");
  const [myQueries, setMyQueries] = useState<any[]>([]);
  const [queryLoading, setQueryLoading] = useState<boolean>(false);
  // ---------------------------------

  // Normalize helpers
  const normalizeAssignment = (a: any) => ({
    id: String(a._id ?? a.id ?? a.assignment_id ?? a.assignmentId ?? ""),
    raw: a,
    title: a.title ?? a.name ?? "Untitled assignment",
    due: a.due_date ?? a.dueDate ?? a.due ?? null,
    maxScore: a.max_score ?? a.maxScore ?? a.max ?? null,
    courseId: (a.courseId ?? a.course ?? a.course_id ?? (a.courses && (a.courses._id ?? a.courses.id))) ?? null,
    status: (a.status ?? a.state ?? "").toString().toLowerCase(),
    description: a.description ?? a.body ?? a.text ?? "",
  });

  const normalizeSubmission = (s: any) => {
    const assignmentId = 
      s.assignment_id ??
      s.assignmentId ??
      (typeof s.assignment === "string" ? s.assignment : null) ??
      (typeof s.assignment === "object" ? s.assignment._id ?? s.assignment.id : null);
  
    const studentId =
      s.student_id ??
      s.studentId ??
      (typeof s.student === "string" ? s.student : null) ??
      (typeof s.student === "object" ? s.student._id ?? s.student.id : null);
  
    return {
      id: String(s._id ?? s.id ?? Math.random().toString(36).slice(2)),
      assignmentId: String(assignmentId ?? ""),
      studentId: String(studentId ?? ""),
      status: (s.status ?? s.state ?? "submitted").toLowerCase(),
      grade: s.grade ?? null,
      feedback: s.feedback ?? null,
      submissionText: s.submissionText ?? null,
      submissionFileUrl: s.submissionFileUrl ?? null,
      submittedAt: s.submitted_at ?? s.submittedAt ?? s.createdAt ?? null,
    };
  };
  
  // Fetch sequence: ensure enrollments are loaded before classes so filtering is correct
  useEffect(() => {
    (async () => {
      await fetchCourses();
      await fetchEnrolledCourses();
      // After enrollments fetched, fetch classes (so fetchClasses can use enrollments state)
      await fetchClasses();
      if (activeSection === "assignments") {
        await fetchAssignments();
      }
      // keep original behaviour for other sections
      if (activeSection === "library") {
        // fetchClasses already called above; keep for parity
        await fetchClasses();
      }
      if (activeSection === "doubt") {
        await fetchMyQueries();
      }
      if (activeSection === "dashboard" || activeSection === "attendance") {
        await fetchAttendanceStats();
      }
      if (activeSection === "notifications") {
        await fetchNotifications();
      }
    })();

    // Real-time-ish updates for courses/assignments while the student stays on page.
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (activeSection === "explore" || activeSection === "assignments") {
      pollRef.current = window.setInterval(() => {
        if (activeSection === "explore") fetchCourses();
        if (activeSection === "assignments") fetchAssignments();
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await coursesAPI.getAll();
      const allCourses = Array.isArray(data) ? data : [];
      const visibleCourses = allCourses.filter((c: any) => {
        const status = (c?.status ?? c?.state ?? "").toString().toLowerCase();
        return status !== "draft";
      });
      setCourses(visibleCourses);
    } catch (error: any) {
      console.error("fetchCourses error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch courses",
        variant: "destructive",
      });
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    if (!user) return;
    try {
      const studentId = String(user.id ?? user._id ?? "");
      const stats = await attendanceAPI.getStudentSummary(studentId);
      setAttendanceStats(stats);
    } catch (err) {
      console.error("fetchAttendanceStats error", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await notificationsAPI.getMine();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchNotifications error", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("markAllRead error", err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("markRead error", err);
    }
  };

  const fetchEnrolledCourses = async () => {
    if (!user) return;

    try {
      const data = await enrollmentsAPI.getAll();
      setEnrolledCourses(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch enrolled courses",
        variant: "destructive",
      });
      setEnrolledCourses([]);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;

    try {
      await enrollmentsAPI.create(courseId);

      toast({
        title: "Success!",
        description: "You've been enrolled in the course",
      });

      await fetchEnrolledCourses();
      await fetchCourses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll in course",
        variant: "destructive",
      });
    }
  };

  // inside StudentDashboard: fetchAssignments() -> use the student-scoped endpoint
const fetchAssignments = async () => {
  if (!user) return;

  try {
    setLoading(true);

    const [rawAssignments, rawSubmissions] = await Promise.all([
      assignmentsAPI.getAll(),
      // If the user is a student, fetch their own submissions with /me
      user?.role === "student" || user?.role === "learner"
        ? submissionsAPI.getMine()
        : submissionsAPI.getAll(),
    ]);

    // defensive: ensure arrays
    const assignmentsData = Array.isArray(rawAssignments) ? rawAssignments : [];
    const submissionsData = Array.isArray(rawSubmissions) ? rawSubmissions : [];

    const normalizedAssignments = (assignmentsData || []).map(normalizeAssignment);
    const normalizedSubmissions = (submissionsData || []).map(normalizeSubmission);

    setAssignments(normalizedAssignments);
    setSubmissions(normalizedSubmissions);
// in StudentDashboard.tsx - inside fetchAssignments catch
} catch (error: any) {
  console.error('fetchAssignments error', error);
  const serverMsg = error?.message || (error?.toString && error.toString()) || 'Failed to fetch assignments';
  toast({
    title: 'Error',
    description: serverMsg,
    variant: 'destructive',
  });
}

};


  // optimistic insertion when a new submission is created by the student
  const handleSubmissionCreated = (createdSubmission: any) => {
    try {
      const norm = normalizeSubmission(createdSubmission);
      setSubmissions((prev) => {
        // avoid dupes: if same assignment+student exists, replace it
        const filtered = (prev || []).filter((s: any) => !(s.assignmentId === norm.assignmentId && s.studentId === norm.studentId));
        return [norm, ...filtered];
      });
    } catch (e) {
      console.error("handleSubmissionCreated error", e);
    }
  };

  // UPDATED fetchClasses: fetch all classes (not only completed with video),
  // normalize them, set classes and compute upcomingClasses for dashboard.
  const fetchClasses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const classesDataRaw = await classesAPI.getAll();

      const allClasses = Array.isArray(classesDataRaw) ? classesDataRaw : [];

      // Normalize class objects for consistent filtering
      const normalized = allClasses.map((c: any) => {
        const courseRef = c.courseId ?? c.course ?? c.course_id ?? (c.course && (c.course._id ?? c.course.id)) ?? null;
        const status = (c.status ?? c.state ?? "").toString().toLowerCase();
        const startAt = c.startTime ?? c.start_at ?? c.start ?? c.scheduledAt ?? c.scheduled_at ?? c.date ?? null;
        const hasVideo = Boolean(c.hasVideo || c.videoUrl || c.video || c.src || c.url || c.file);
        // normalize enrolledStudents: may be array of objects or strings
        const rawEnrolled = Array.isArray(c.enrolledStudents) ? c.enrolledStudents : (Array.isArray(c.allowedStudents) ? c.allowedStudents : (Array.isArray(c.students) ? c.students : []));
        const enrolledStudents = (Array.isArray(rawEnrolled) ? rawEnrolled : []).map((s: any) => {
          if (!s) return "";
          if (typeof s === "object") return String(s._id ?? s.id ?? s.studentId ?? s.userId ?? "");
          return String(s);
        }).filter(Boolean);

        return {
          ...c,
          _normalizedCourseId: typeof courseRef === "object" ? String(courseRef._id ?? courseRef.id ?? "") : String(courseRef ?? ""),
          _normalizedStatus: status,
          _normalizedStart: startAt ? new Date(startAt) : null,
          _hasVideo: hasVideo,
          _enrolledStudentsNormalized: enrolledStudents,
        };
      });

      setClasses(normalized);

      // Build set of student's enrolled course IDs
      const enrolledSet = new Set<string>(
        (Array.isArray(enrolledCourses) ? enrolledCourses : [])
          .map((enr: any) => {
            const raw = enr.course ?? enr.courseId ?? enr.course_id ?? enr;
            if (!raw) return null;
            if (typeof raw === "object") return String(raw._id ?? raw.id ?? raw.courseId ?? raw.course_id ?? "");
            return String(raw);
          })
          .filter(Boolean)
      );

      // Visible classes for this student (belongs to student's enrolled courses OR explicitly includes this student OR is public for the course)
      const currentUserId = String(user?.id ?? user?._id ?? user?.userId ?? "");

      const visibleForStudent = normalized.filter((c: any) => {
        const courseId = String(c._normalizedCourseId ?? "");
        const isPublic = c.isPublic === true || c.public === true || c.visibility === "public";
        // 1. If class explicitly lists enrolled students and includes current student -> visible
        if (Array.isArray(c._enrolledStudentsNormalized) && c._enrolledStudentsNormalized.length > 0) {
          if (currentUserId && c._enrolledStudentsNormalized.includes(currentUserId)) return true;
        }
        // 2. If class is public and course matches one student is enrolled in -> visible
        if (isPublic && (!courseId || enrolledSet.has(courseId))) {
          // if class doesn't have courseId we still allow (teacher might have created a general public class) => show
          return true;
        }
        // 3. fallback: if course matches student's enrolled courses -> visible
        if (courseId && enrolledSet.has(courseId)) return true;

        return false;
      });

      // Compute upcoming classes: scheduled/published OR start time in future (exclude past completed recordings unless public or enrolled)
      const now = new Date();
      const upcoming = visibleForStudent.filter((c: any) => {
        if (c._normalizedStatus === "scheduled" || c._normalizedStatus === "upcoming" || c._normalizedStatus === "published") return true;
        if (c._normalizedStart && c._normalizedStart > now) return true;
        // also include recent recordings (public or specifically enrolled) so students can see recent uploads
        if ((c._hasVideo) && (c.isPublic === true || (Array.isArray(c._enrolledStudentsNormalized) && c._enrolledStudentsNormalized.includes(currentUserId)))) return true;
        return false;
      }).sort((a: any, b: any) => {
        const ta = a._normalizedStart ? a._normalizedStart.getTime() : 0;
        const tb = b._normalizedStart ? b._normalizedStart.getTime() : 0;
        return ta - tb;
      });

      setUpcomingClasses(upcoming);
    } catch (error: any) {
      console.error("fetchClasses error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch classes",
        variant: "destructive",
      });
      setClasses([]);
      setUpcomingClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Queries API helpers (NEW) -------------------
  // replace your existing fetchMyQueries with this
const fetchMyQueries = async () => {
  if (!user) return;
  try {
    setQueryLoading(true);

    // single request -> backend may return either an array or { items, total, ... }
    const resp = await queriesAPI.getAll({ page: '1', limit: '50' }); // optional paging
    const all = Array.isArray(resp) ? resp : (resp?.items ?? []);

    const myId = String(user?.id ?? user?._id ?? user?.userId ?? '');

    const mine = (all || [])
      .filter((q: any) => {
        const qStudent =
          q.student ??
          q.studentId ??
          q.student_id ??
          (q.student && (q.student._id ?? q.student.id)) ??
          null;
        if (!qStudent) return false;
        if (typeof qStudent === 'object') return String(qStudent._id ?? qStudent.id) === myId;
        return String(qStudent) === myId;
      })
      .sort((a: any, b: any) => {
        const ta = new Date(a.createdAt ?? a.created_at ?? a.created ?? 0).getTime();
        const tb = new Date(b.createdAt ?? b.created_at ?? b.created ?? 0).getTime();
        return tb - ta;
      });

    setMyQueries(mine);
  } catch (err: any) {
    console.error('fetchMyQueries error', err);
    setMyQueries([]);
  } finally {
    setQueryLoading(false);
  }
};


  const submitQuery = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to submit a question", variant: "destructive" });
      return;
    }
    if (!queryText.trim()) {
      toast({ title: "Empty question", description: "Please write your question before submitting", variant: "destructive" });
      return;
    }
  
    try {
      const payload: any = {
        // optional: backend should derive student from token; keep fields compatible
        student: user?.id ?? user?._id ?? user?.userId,
        studentName: user?.fullName ?? user?.name ?? null,
        course: selectedCourseForQuery || null,
        subject: selectedCourseForQuery ? (courses.find(c => String(c._id ?? c.id) === String(selectedCourseForQuery))?.title ?? null) : null,
        message: queryText.trim(),
        status: "open",
        createdAt: new Date().toISOString(),
      };
  
      // create on server and capture returned saved document
      const saved = await queriesAPI.create(payload);
  
      // optimistic update: prepend returned item (if server returned it)
      if (saved) {
        setMyQueries(prev => {
          // avoid duplicates by _id
          const id = saved._id ?? saved.id;
          const filtered = (prev || []).filter((q: any) => String(q._id ?? q.id) !== String(id));
          return [saved, ...filtered];
        });
      } else {
        // fallback: refetch if server didn't return saved doc
        await fetchMyQueries();
      }
  
      toast({ title: "Submitted", description: "Your question was submitted to the teacher." });
      setQueryText("");
      setSelectedCourseForQuery("");
    } catch (err: any) {
      console.error("submitQuery error", err);
      toast({ title: "Error", description: "Failed to submit question", variant: "destructive" });
    }
  };
  
  // -------------------------------------------------

  const isEnrolled = (courseId: string) => {
    if (!enrolledCourses || enrolledCourses.length === 0) return false;
    return enrolledCourses.some((enrollment: any) => {
      const course = enrollment.courseId || enrollment.course;
      if (!course) return false;
      const id = course._id || course.id;
      return id?.toString() === courseId || id === courseId;
    });
  };

  // open first available video for a course in a new tab
  const handleStartLearning = async (courseId: string) => {
    try {
      const classesForCourse = await classesAPI.getAll({ courseId, hasVideo: true });

      const list = Array.isArray(classesForCourse) ? classesForCourse : [];

      if (list.length === 0) {
        toast({
          title: "No videos available",
          description: "There are no uploaded videos for this course yet.",
          variant: "destructive",
        });
        return;
      }

      const cls = list.find((c: any) => (c.videoUrl || c.video || c.src || c.url));
      const first = cls || list[0];

      const videoUrl = first?.videoUrl || first?.video || first?.src || first?.url || first?.file;

      if (!videoUrl) {
        toast({
          title: "No playable video found",
          description: "The video record exists but no URL was found.",
          variant: "destructive",
        });
        return;
      }

      window.open(videoUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error("Start learning error", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to open video",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    { id: "dashboard", label: t("nav.dashboard"), icon: Home },
    { id: "explore", label: t("courses.explore"), icon: BookOpen },
    { id: "enrolled", label: t("courses.myCourses"), icon: GraduationCap },
    { id: "assignments", label: t("nav.assignments"), icon: FileText },
    { id: "attendance", label: "Attendance", icon: Calendar },
    { id: "doubt", label: "Doubt Clearance", icon: MessageSquare },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "library", label: t("nav.library"), icon: Library },
    { id: "notifications", label: t("nav.notifications"), icon: Bell },
    { id: "settings", label: t("nav.settings"), icon: Settings },
  ];

  // helper to find enrolled course options (normalize enrolledCourses shapes)
  const getEnrolledCourseOptions = () => {
    if (!Array.isArray(enrolledCourses) || enrolledCourses.length === 0) return [];
    return enrolledCourses.map((enr: any) => {
      const raw = enr.course ?? enr.courseId ?? enr.course_id ?? enr;
      if (!raw) return null;
      if (typeof raw === "string") {
        const match = courses.find((c: any) => String(c._id ?? c.id ?? "") === String(raw));
        if (!match) return null;
        return { id: String(match._id ?? match.id ?? ""), title: match.title };
      } else if (typeof raw === "object") {
        return { id: String(raw._id ?? raw.id ?? raw.courseId ?? raw.course_id ?? ""), title: raw.title ?? raw.name };
      }
      return null;
    }).filter(Boolean);
  };

  // compute set of enrolled course IDs for easy filtering of classes
  const enrolledCourseIdSet = new Set<string>(
    (Array.isArray(enrolledCourses) ? enrolledCourses : [])
      .map((enr: any) => {
        const raw = enr.course ?? enr.courseId ?? enr.course_id ?? enr;
        if (!raw) return null;
        if (typeof raw === "object") return String(raw._id ?? raw.id ?? raw.courseId ?? raw.course_id ?? "");
        return String(raw);
      })
      .filter(Boolean)
  );

  // classes visible to this student for Library: include classes if
  // - class.course matches student's enrolled course AND class is recorded (completed) with video
  // - OR class explicitly lists this student in enrolledStudents
  // - OR class is public and course matches student's enrolled course
  const currentUserId = String(user?.id ?? user?._id ?? user?.userId ?? "");

  const studentVisibleClasses = Array.isArray(classes)
    ? classes.filter((c: any) => {
        const cCourse = String(c._normalizedCourseId ?? c.courseId ?? c.course ?? c.course_id ?? "");
        const status = (c._normalizedStatus ?? (c.status ?? "")).toString().toLowerCase();
        const hasVideo = Boolean(c._hasVideo || c.hasVideo || c.videoUrl || c.video || c.src || c.url || c.file);

        const enrolledList: string[] = Array.isArray(c._enrolledStudentsNormalized)
          ? c._enrolledStudentsNormalized
          : (Array.isArray(c.enrolledStudents) ? c.enrolledStudents.map((s: any) => (typeof s === "object" ? String(s._id ?? s.id ?? "") : String(s))) : []);

        const isPublic = c.isPublic === true || c.public === true || c.visibility === "public";

        // 1) if student explicitly allowed in enrolled list
        if (enrolledList && enrolledList.length > 0) {
          if (currentUserId && enrolledList.includes(currentUserId)) {
            // require video presence for library listing (we only show recorded sessions here)
            return hasVideo;
          }
        }

        // 2) if public and course matches enrolled, allow (and require video)
        if (isPublic && cCourse && enrolledCourseIdSet.has(cCourse)) {
          return hasVideo;
        }

        // 3) fallback: course match for student's enrolled courses and recorded/completed with video
        if (cCourse && enrolledCourseIdSet.has(cCourse) && (status === "completed" || status === "done") && hasVideo) {
          return true;
        }

        return false;
      })
    : [];

  // refetch assignments when tab becomes visible (helpful to pick up teacher grading)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && activeSection === "assignments") {
        fetchAssignments();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  return (
    <div className="min-h-full">
      {/* Section tabs - single row, no duplicate sidebar */}
      <div className="border-b bg-card/30 px-4 py-2 flex flex-wrap gap-1">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? "default" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => setActiveSection(item.id)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Button>
        ))}
      </div>

      <main className="overflow-auto">
        {/* Start Learning Modal (Dialog) */}
        <Dialog
          open={learningOpen}
          onOpenChange={(val) => {
            setLearningOpen(val);
            if (!val) {
              setCurrentClass(null);
              setLearningClasses([]);
            }
          }}
        >
          <DialogContent className="max-w-4xl w-full" aria-describedby="learning-dialog-desc">
            <DialogHeader>
              <DialogTitle>{currentClass ? currentClass.title || "Course Video" : "Course Videos"}</DialogTitle>
            </DialogHeader>

            <p id="learning-dialog-desc" className="sr-only">
              Select a video from the list to play it in the player on the left.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Video player area */}
              <div className="md:col-span-2">
                {currentClass ? (
                  <VideoPlayer classData={currentClass} />
                ) : (
                  <div className="p-6 text-center text-muted-foreground">Select a video to play</div>
                )}
              </div>

              {/* Video list */}
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {learningClasses.map((c) => (
                  <button
                    key={c.id ?? `video-${c._id ?? Math.random().toString(36).slice(2, 8)}`}
                    onClick={() => setCurrentClass(c)}
                    className={`w-full text-left p-3 rounded-lg border ${currentClass?.id === c.id ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm truncate">{c.title || c.name || `Video ${c.id}`}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                      </div>
                      <div className="text-xs text-muted-foreground ml-2">{/* optional duration */}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setLearningOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        <header className="bg-card border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Student Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user?.fullName}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {activeSection === "dashboard" && (() => {
            const totalCoursesCount = Array.isArray(courses)
              ? courses.filter((c: any) => ((c?.status ?? "").toString().toLowerCase() !== "draft")).length
              : 0;

            const myCoursesCount = Array.isArray(enrolledCourses)
              ? getEnrolledCourseOptions().length
              : 0;

            const currentUserId = user?.id ?? user?._id ?? user?.userId;

            const pendingAssignmentsCount = Array.isArray(assignments)
              ? assignments.filter((assignment: any) => {
                  const assignmentCourseId = assignment.courseId ?? assignment.raw?.courseId ?? assignment.raw?.course ?? assignment.raw?.course_id ?? assignment.raw?.courses?._id ?? assignment.raw?.courses?.id ?? null;
                  const normalizedAssignmentCourseId = typeof assignmentCourseId === "object"
                    ? String(assignmentCourseId._id ?? assignmentCourseId.id ?? "")
                    : String(assignmentCourseId ?? "");
                  if (!normalizedAssignmentCourseId) return false;
                  if (!enrolledCourseIdSet.has(normalizedAssignmentCourseId)) return false;

                  const assignmentId = assignment.id ?? assignment.raw?._id ?? assignment.raw?.id ?? assignment.raw?.assignment_id ?? "";

                  const hasSubmission = Array.isArray(submissions) && submissions.some((s: any) => {
                    const subAssignmentId = s.assignmentId ?? s.raw?.assignment_id ?? s.raw?.assignmentId ?? s.raw?.assignment;
                    const subStudentId = s.studentId ?? s.raw?.student_id ?? s.raw?.studentId ?? (s.raw && (s.raw.student && (s.raw.student._id ?? s.raw.student.id)));
                    const matchesAssignment = subAssignmentId && (String(subAssignmentId) === String(assignmentId) || String(subAssignmentId) === String(assignment.raw?._id) || String(subAssignmentId) === String(assignment.raw?.id));
                    const matchesStudent = currentUserId && subStudentId && String(subStudentId) === String(currentUserId);
                    return matchesAssignment && matchesStudent;
                  });

                  return !hasSubmission;
                }).length
              : 0;

            // Use recorded classes (studentVisibleClasses) for "upcoming" here — we also include scheduled classes from upcomingClasses state above.
            const upcomingCombined = [
              // upcomingClasses are teacher-created scheduled/future classes (already filtered for student)
              ...(Array.isArray(upcomingClasses) ? upcomingClasses : []),
              // plus recorded sessions that match enrolled courses or explicitly include the student (studentVisibleClasses) — avoid duplicates by id
              ...(Array.isArray(studentVisibleClasses) ? studentVisibleClasses : []),
            ].filter((v, i, arr) => {
              const id = String(v._id ?? v.id ?? `${i}`);
              return arr.findIndex((x: any) => String(x._id ?? x.id ?? "") === id) === i;
            });

            return (
              <div className="space-y-6 animate-fade-in">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="hover-scale">
                    <CardHeader className="pb-3">
                      <CardDescription>Total Courses</CardDescription>
                      <CardTitle className="text-4xl">{totalCoursesCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        +2 from last month
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover-scale">
                    <CardHeader className="pb-3">
                      <CardDescription>My Courses</CardDescription>
                      <CardTitle className="text-4xl">{myCoursesCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Enrolled courses
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover-scale">
                    <CardHeader className="pb-3">
                      <CardDescription>Pending Assignments</CardDescription>
                      <CardTitle className="text-4xl">{pendingAssignmentsCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Due this week
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover-scale">
                    <CardHeader className="pb-3">
                      <CardDescription>Attendance</CardDescription>
                      {/* Real attendance calculation */}
                      <CardTitle className="text-4xl">{attendanceStats?.percentage ?? 0}%</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Excellent record
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Classes</CardTitle>
                    <CardDescription>Your scheduled/recorded classes from teachers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingCombined.length === 0 ? (
                        <div className="text-center text-muted-foreground p-6">No recorded or scheduled classes available for your enrolled courses yet.</div>
                      ) : (
                        upcomingCombined
                          .sort((a: any, b: any) => {
                            const ta = a._normalizedStart ? new Date(a._normalizedStart).getTime() : new Date(a.scheduled_at ?? a.start ?? a.date ?? a.createdAt ?? 0).getTime();
                            const tb = b._normalizedStart ? new Date(b._normalizedStart).getTime() : new Date(b.scheduled_at ?? b.start ?? b.date ?? b.createdAt ?? 0).getTime();
                            return ta - tb;
                          })
                          .map((classItem: any, idx: number) => {
                            const scheduledAt = classItem._normalizedStart ?? classItem.scheduled_at ?? classItem.start ?? classItem.date ?? classItem.createdAt ?? null;
                            const teacherName = classItem.teacherName ?? (classItem.teacher && (classItem.teacher.fullName ?? classItem.teacher.name)) ?? classItem.createdByName ?? "Teacher";
                            const courseTitle = classItem.courseTitle ?? classItem.courseName ?? (classItem.course && (classItem.course.title ?? classItem.course.name)) ?? "";
                            const displayTitle = classItem.title ?? courseTitle ?? "Class";
                            const joinUrl = classItem.joinUrl ?? classItem.url ?? classItem.videoUrl ?? classItem.video ?? classItem.src ?? null;

                            return (
                              <div key={String(classItem._id ?? classItem.id ?? `class-${idx}`)} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div>
                                  <h4 className="font-semibold">{displayTitle}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {teacherName}{scheduledAt ? ` • ${format(new Date(scheduledAt), "PPP p")}` : ""}
                                    {courseTitle ? ` • ${courseTitle}` : ""}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Button size="sm" onClick={() => {
                                    if (joinUrl) {
                                      window.open(joinUrl, "_blank", "noopener,noreferrer");
                                    } else if (classItem.courseId || classItem.course) {
                                      handleStartLearning(String(classItem.courseId ?? classItem.course ?? classItem.course_id));
                                    } else {
                                      toast({ title: "No playable link", description: "This class doesn't have a join link or video URL.", variant: "destructive" });
                                    }
                                  }}>
                                    Open
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </CardContent>
                </Card>
                <StudentWebsiteChatbot />
              </div>
            );
          })()}

          {activeSection === "explore" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">{t("courses.explore")}</h2>
                <p className="text-muted-foreground">{t("courses.browse")}</p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : courses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t("courses.noCourses")}</h3>
                    <p className="text-muted-foreground">{t("courses.noCourses")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.isArray(courses) &&
                    courses
                      .filter((course) => (course?.status ?? "").toString().toLowerCase() !== "draft")
                      .map((course, idx) => {
                        const courseId = course._id || course.id;
                        const normalizedCourse = {
                          id: courseId,
                          title: course.title,
                          description: course.description,
                          status: course.status,
                          url: course.url || course.courseUrl || course.link || course.videoUrl || null,
                        };

                        const fallbackKey = String(normalizedCourse.id ?? normalizedCourse.title ?? `explore-${idx}`);

                        return (
                          <CourseCard
                            key={fallbackKey}
                            course={normalizedCourse}
                            isEnrolled={isEnrolled(String(normalizedCourse.id))}
                            onEnroll={() => handleEnroll(String(normalizedCourse.id))}
                          />
                        );
                      })}
                </div>
              )}
            </div>
          )}

          {activeSection === "enrolled" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">{t("courses.myCourses")}</h2>
                <p className="text-muted-foreground">{t("courses.description")}</p>
              </div>

              {(
                (Array.isArray(enrolledCourses) && enrolledCourses.length > 0 && enrolledCourses
                  .map((enr: any) => {
                    const raw = enr.course ?? enr.courseId ?? enr.course_id ?? enr;
                    if (!raw) return null;
                    if (typeof raw === "string") {
                      const match = courses.find((c: any) => String(c._id ?? c.id ?? "") === String(raw));
                      if (!match) return null;
                      const normalized = {
                        id: String(match._id ?? match.id ?? ""),
                        title: match.title,
                        description: match.description,
                        status: match.status,
                        url: match.url ?? match.courseUrl ?? match.link ?? null,
                      };
                      if ((normalized.status ?? "").toString().toLowerCase() === "draft") return null;
                      return normalized;
                    } else if (typeof raw === "object") {
                      const normalized = {
                        id: String(raw._id ?? raw.id ?? raw.courseId ?? raw.course_id ?? ""),
                        title: raw.title ?? raw.name,
                        description: raw.description,
                        status: raw.status,
                        url: raw.url ?? raw.courseUrl ?? raw.link ?? null,
                      };
                      if ((normalized.status ?? "").toString().toLowerCase() === "draft") return null;
                      return normalized;
                    }
                    return null;
                  })
                  .filter(Boolean)
                ) ||
                (Array.isArray(courses) ? courses.filter((c: any) => {
                  const courseId = String(c._id ?? c.id ?? "");
                  const status = (c?.status ?? "").toString().toLowerCase();
                  return status !== "draft" && isEnrolled(courseId);
                }) : [])
              ).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t("courses.noEnrolled")}</h3>
                    <p className="text-muted-foreground mb-4">{t("courses.startLearning")}</p>
                    <Button onClick={() => setActiveSection("explore")}>
                      {t("courses.explore")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(
                    (Array.isArray(enrolledCourses) && enrolledCourses.length > 0 && enrolledCourses
                      .map((enr: any) => {
                        const raw = enr.course ?? enr.courseId ?? enr.course_id ?? enr;
                        if (!raw) return null;
                        if (typeof raw === "string") {
                          const match = courses.find((c: any) => String(c._id ?? c.id ?? "") === String(raw));
                          if (!match) return null;
                          const normalized = {
                            id: String(match._id ?? match.id ?? ""),
                            title: match.title,
                            description: match.description,
                            status: match.status,
                            url: match.url ?? match.courseUrl ?? match.link ?? null,
                          };
                          if ((normalized.status ?? "").toString().toLowerCase() === "draft") return null;
                          return normalized;
                        } else if (typeof raw === "object") {
                          const normalized = {
                            id: String(raw._id ?? raw.id ?? raw.courseId ?? raw.course_id ?? ""),
                            title: raw.title ?? raw.name,
                            description: raw.description,
                            status: raw.status,
                            url: raw.url ?? raw.courseUrl ?? raw.link ?? null,
                          };
                          if ((normalized.status ?? "").toString().toLowerCase() === "draft") return null;
                          return normalized;
                        }
                        return null;
                      })
                      .filter(Boolean)
                    ) ||
                    (Array.isArray(courses) ? courses.filter((c: any) => {
                      const courseId = String(c._id ?? c.id ?? "");
                      const status = (c?.status ?? "").toString().toLowerCase();
                      return status !== "draft" && isEnrolled(courseId);
                    }) : [])
                  ).map((normalizedCourse: any, idx: number) => (
                    <CourseCard
                      key={String(normalizedCourse.id ?? normalizedCourse.title ?? `enrolled-${idx}`)}
                      course={{
                        id: String(normalizedCourse.id ?? ""),
                        title: normalizedCourse.title,
                        description: normalizedCourse.description,
                        status: normalizedCourse.status,
                        url: normalizedCourse.url,
                      }}
                      isEnrolled={true}
                      onStartLearning={() => handleStartLearning(String(normalizedCourse.id))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === "assignments" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">{t("assignments.title")}</h2>
                <p className="text-muted-foreground">{t("assignments.viewSubmit")}</p>
              </div>

              {assignments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t("assignments.noAssignments")}</h3>
                    <p className="text-muted-foreground">{t("assignments.noAssignments")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment, idx) => {
                    const assignmentId = assignment.id ?? assignment.raw?._id ?? "";

                    const currentUserIdForMatch = user?.id ?? user?._id ?? user?.userId ?? null;
const submission = findSubmissionForAssignment(assignment, submissions, currentUserIdForMatch);
                    

                    const dueRaw = assignment.due ?? assignment.raw?.due_date ?? assignment.raw?.dueDate ?? assignment.raw?.due ?? null;
                    const isOverdue = dueRaw ? new Date(dueRaw) < new Date() : false;

                    return (
                      <Card key={assignmentId || assignment.raw?._id || assignment.title || `assignment-${idx}`} className="hover-scale">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle>{assignment.title ?? assignment.raw?.title ?? "Untitled assignment"}</CardTitle>
                              <CardDescription>{assignment.raw?.courses?.title ?? assignment.raw?.courseTitle ?? ""}</CardDescription>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              {submission ? (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${submission.status === "graded"
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-blue-500/10 text-blue-600"
                                }`}>
                                  {submission.status === "graded" ? `Graded: ${submission.grade ?? "—"}/${assignment.maxScore ?? assignment.raw?.max_score ?? "—"}` : "Submitted"}
                                </span>
                              ) : isOverdue ? (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                                  Overdue
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {assignment.description || assignment.raw?.description || "No description"}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1 text-sm">
                              <span className={isOverdue && !submission ? "text-destructive font-medium" : ""}>
                                Due: {dueRaw ? format(new Date(dueRaw), "PPp") : "—"}
                              </span>
                              <span>Maximum Score: {assignment.maxScore ?? assignment.raw?.max_score ?? "—"}</span>
                            </div>

                            {(!submission || (submission.status === "submitted" && !isOverdue)) && (
                              <SubmitAssignmentDialog
                                assignmentId={assignmentId}
                                existingSubmission={submissions.find(s => s.assignmentId === assignmentId && String(s.studentId) === String(user?.id ?? user?._id))}
                                onSuccess={(created) => {
                                  if (created) handleSubmissionCreated(created);
                                  fetchAssignments(); // REFRESH after submit
                                }}
                                
                              />
                            )}
                          </div>

                          {submission && submission.status === "graded" && submission.feedback && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="font-semibold mb-2">Feedback:</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {submission.feedback}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                </div>
              )}
            </div>
          )}

          {activeSection === "attendance" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">{t("student.attendanceTracking")}</h2>
                <p className="text-muted-foreground">{t("student.trackAttendance")}</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("student.attendanceOverview")}</CardTitle>
                  <CardDescription>{t("student.attendanceRecord")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 border rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("student.overallAttendance")}</p>
                        <p className="text-4xl font-bold mt-2">{attendanceStats?.percentage ?? 0}%</p>
                        <p className="text-sm text-muted-foreground mt-1">{attendanceStats?.present ?? 0} of {attendanceStats?.total ?? 0} {t("student.classes")}</p>
                      </div>
                      <Calendar className="h-16 w-16 text-primary opacity-20" />
                    </div>

                    <div className="space-y-4">
                      {[ 
                        { course: "Mathematics", present: 28, total: 30, percentage: 93 },
                        { course: "Physics", present: 42, total: 45, percentage: 93 },
                        { course: "Chemistry", present: 35, total: 40, percentage: 88 },
                        { course: "Computer Science", present: 33, total: 35, percentage: 94 },
                      ].map((record, index) => (
                        <div key={`${record.course ?? 'rec'}-${index}`} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{record.course}</h4>
                            <span className="text-sm font-medium">{record.percentage}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                            <span>{record.present} / {record.total} classes</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${record.percentage >= 90 ? "bg-green-500" :
                                record.percentage >= 75 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                              style={{ width: `${record.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* DOUBT / QUERY SECTION (unchanged) */}
          {activeSection === "doubt" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">{t("student.doubtClearance")}</h2>
                <p className="text-muted-foreground">{t("student.askQuestions")}</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("student.askQuestion")}</CardTitle>
                  <CardDescription>{t("student.submitDoubts")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <select
                        value={selectedCourseForQuery}
                        onChange={(e) => setSelectedCourseForQuery(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value="">{t("student.selectCourse")}</option>
                        {getEnrolledCourseOptions().map((opt: any) => (
                          <option key={opt.id} value={opt.id}>{opt.title}</option>
                        ))}
                      </select>
                      <Button onClick={submitQuery}>{t("student.submitQuestion") ?? "Submit"}</Button>
                    </div>
                    <textarea
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder={t("student.typeQuestion") ?? "Type your question here..."}
                    />
                    <p className="text-xs text-muted-foreground">Tip: keep your question concise and include the exact concept or problem you’re stuck on.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("student.recentQuestions")}</CardTitle>
                  <CardDescription>{t("student.previouslyAsked")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {queryLoading ? (
                      <div className="text-sm text-muted-foreground">Loading your questions...</div>
                    ) : myQueries.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-4">You haven't asked any questions yet.</div>
                    ) : (
                      myQueries.map((q: any, index: number) => {
                        const questionText = q.message ?? q.query ?? q.text ?? "—";
                        const courseTitle = (q.course && typeof q.course === "string")
                          ? (courses.find((c: any) => String(c._id ?? c.id) === String(q.course))?.title ?? q.course)
                          : (q.course?.title ?? q.course?.name ?? "");
                        const status = (q.status ?? "open").toString().toLowerCase();
                        const created = q.createdAt ?? q.created_at ?? q.created ?? null;

                        return (
                          <div key={String(q._id ?? q.id ?? `myq-${index}`)} className="p-4 border rounded-lg space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold">{questionText}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{courseTitle}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${status === "resolved" ? "bg-green-500/10 text-green-600" : status === "responded" ? "bg-blue-500/10 text-blue-600" : "bg-yellow-500/10 text-yellow-600"}`}>
                                {status === "resolved" ? "Resolved" : status === "responded" ? "Responded" : "Open"}
                              </span>
                            </div>

                            {q.reply && (
                              <div className="mt-2 p-3 bg-muted rounded-md">
                                <p className="text-sm font-medium mb-1">Teacher's Reply:</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.reply}</p>
                              </div>
                            )}

                            <div className="text-xs text-muted-foreground flex justify-between">
                              <div>{created ? format(new Date(created), "PPp") : ""}</div>
                              <div>{q.studentName ?? ""}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Remaining sections (progress, library, notifications, settings) */}
          {activeSection === "progress" && (() => {
            // Compute real progress values from enrollment data
            const enrolledList = getEnrolledCourseOptions();
            const enrolledCount = enrolledList.length;

            // Map of enrolledCourses to get progress per course
            const progressByCourse = (Array.isArray(enrolledCourses) ? enrolledCourses : []).map((enr: any) => {
              const raw = enr.course ?? enr.courseId ?? enr.course_id ?? enr;
              const title = typeof raw === 'object' ? (raw.title ?? raw.name ?? 'Course') : 'Course';
              const prog = typeof enr.progress === 'number' ? enr.progress : 0;
              return { name: title, progress: prog };
            });

            const avgProgress = progressByCourse.length > 0
              ? Math.round(progressByCourse.reduce((s, c) => s + c.progress, 0) / progressByCourse.length)
              : 0;

            const submittedAssignments = Array.isArray(submissions) ? submissions.length : 0;
            const totalAssignments = Array.isArray(assignments) ? assignments.filter((a: any) => {
              const cid = String(a.courseId ?? a.raw?.courseId ?? a.raw?.course ?? '');
              return !cid || enrolledCourseIdSet.has(cid);
            }).length : 0;

            // Average score from graded submissions
            const gradedSubs = (Array.isArray(submissions) ? submissions : []).filter((s: any) => s.grade !== null && s.grade !== undefined);
            const avgScore = gradedSubs.length > 0
              ? Math.round(gradedSubs.reduce((sum: number, s: any) => sum + Number(s.grade), 0) / gradedSubs.length)
              : null;

            // Dynamic badges
            const badges = [
              { name: "First Enrollment", icon: "🎓", earned: enrolledCount >= 1 },
              { name: "Assignment Submitted", icon: "📝", earned: submittedAssignments >= 1 },
              { name: "5 Courses", icon: "📚", earned: enrolledCount >= 5 },
              { name: "Top Scorer", icon: "⭐", earned: avgScore !== null && avgScore >= 90 },
              { name: "10 Courses", icon: "🏆", earned: enrolledCount >= 10 },
            ];

            return (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold">{t("student.progressTracking")}</h2>
                  <p className="text-muted-foreground">{t("student.monitorProgress")}</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("student.overallProgress")}</CardTitle>
                      <CardDescription>{t("student.progress")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-primary/20">
                            <div className="text-center">
                              <p className="text-3xl font-bold">{avgProgress}%</p>
                              <p className="text-xs text-muted-foreground">{t("student.completed")}</p>
                            </div>
                          </div>
                          <div className="space-y-3 mt-4">
                            <div className="flex justify-between text-sm">
                              <span>Enrolled Courses</span>
                              <span className="font-medium">{enrolledCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Assignments Submitted</span>
                              <span className="font-medium">{submittedAssignments} / {totalAssignments}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Average Score</span>
                              <span className="font-medium">{avgScore !== null ? `${avgScore}%` : "No grades yet"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t("student.courseProgress")}</CardTitle>
                      <CardDescription>{t("student.completed")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {progressByCourse.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">Enroll in courses to see your progress here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {progressByCourse.map((course, index) => (
                            <div key={`${course.name}-${index}`} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium truncate max-w-[70%]">{course.name}</span>
                                <span className="text-sm text-muted-foreground">{course.progress}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${course.progress}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Achievement Badges</CardTitle>
                    <CardDescription>Milestones you've reached</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-5">
                      {badges.map((badge, index) => (
                        <div
                          key={`${badge.name}-${index}`}
                          className={`p-4 border rounded-lg text-center transition-all ${badge.earned ? "bg-primary/5 border-primary/20" : "opacity-40 grayscale"}`}
                        >
                          <div className="text-4xl mb-2">{badge.icon}</div>
                          <p className="text-sm font-medium">{badge.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{badge.earned ? "✓ Earned" : "Locked"}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {activeSection === "library" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">Digital Library</h2>
                <p className="text-muted-foreground">Access course materials and recorded sessions</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recorded Sessions</CardTitle>
                  <CardDescription>Watch recorded classes from your enrolled courses</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center text-muted-foreground">Loading videos...</p>
                  ) : studentVisibleClasses.length === 0 ? (
                    <p className="text-center text-muted-foreground">No recorded sessions available for your enrolled courses yet.</p>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {studentVisibleClasses.map((classItem) => (
                        <div key={classItem.id ?? classItem._id} className="space-y-2">
                          <VideoPlayer classData={classItem} />
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {classItem.courseTitle ?? classItem.courseName ?? ""}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleStartLearning(String(classItem.courseId ?? classItem.course ?? classItem.course_id))}>Open Video</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("student.libraryResources")}</CardTitle>
                  <CardDescription>{t("student.library")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { title: "Advanced Mathematics Textbook", type: "PDF", size: "12.5 MB", downloads: 234 },
                      { title: "Physics Lab Manual", type: "PDF", size: "8.2 MB", downloads: 189 },
                      { title: "Chemistry Reference Guide", type: "PDF", size: "15.7 MB", downloads: 156 },
                      { title: "Programming Fundamentals", type: "PDF", size: "10.3 MB", downloads: 298 },
                      { title: "Research Paper Collection", type: "ZIP", size: "45.1 MB", downloads: 67 },
                      { title: "Study Notes - Semester 1", type: "PDF", size: "5.8 MB", downloads: 421 },
                    ].map((resource, index) => (
                      <Card key={`${resource.title?.slice(0, 20) ?? 'res'}-${index}`} className="hover-scale">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-3 bg-primary/10 rounded-lg">
                              <Library className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm mb-1 truncate">{resource.title}</h4>
                              <p className="text-xs text-muted-foreground mb-2">
                                {resource.type} • {resource.size}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {resource.downloads} downloads
                                </span>
                                <Button size="sm" variant="outline">Download</Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">Notifications</h2>
                <p className="text-muted-foreground">Stay updated with important alerts</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>All Notifications {notifications.filter(n => !n.isRead).length > 0 && <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">{notifications.filter(n => !n.isRead).length}</span>}</span>
                    <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={notifications.every(n => n.isRead)}>Mark all as read</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No notifications yet</p>
                        <p className="text-sm">Enroll in a course or submit an assignment to get started.</p>
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        const notifId = notification._id || notification.id;
                        const isUnread = !notification.isRead;
                        const typeColor: Record<string, string> = {
                          assignment: "bg-blue-500/10",
                          grade: "bg-green-500/10",
                          course: "bg-purple-500/10",
                          announcement: "bg-orange-500/10",
                          attendance: "bg-cyan-500/10",
                          reminder: "bg-yellow-500/10",
                        };
                        const bgClass = typeColor[notification.type] || "bg-muted";
                        const createdAt = notification.createdAt ? new Date(notification.createdAt) : null;
                        const timeAgo = createdAt ? format(createdAt, "PPp") : "";

                        return (
                          <div
                            key={notifId}
                            className={`p-4 border rounded-lg flex gap-3 cursor-pointer transition-colors ${isUnread ? "bg-primary/5 border-primary/20" : "hover:bg-muted/40"}`}
                            onClick={() => isUnread && notifId && handleMarkRead(notifId)}
                          >
                            <div className={`p-2 rounded-lg h-fit ${bgClass}`}>
                              <Bell className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="font-semibold text-sm">{notification.title}</h4>
                                {isUnread && <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />}
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">{notification.message}</p>
                              <p className="text-xs text-muted-foreground">{timeAgo}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "settings" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">{t("settings.title")}</h2>
                <p className="text-muted-foreground">{t("settings.preferences")}</p>
              </div>

              <LanguageSwitcher />

              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Full Name</label>
                      <input
                        type="text"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                        placeholder="john@example.com"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone Number</label>
                      <input
                        type="tel"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Control how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Email Notifications", description: "Receive notifications via email" },
                      { label: "Assignment Reminders", description: "Get reminded about upcoming assignments" },
                      { label: "Grade Updates", description: "Notifications when assignments are graded" },
                      { label: "Course Updates", description: "New materials and announcements" },
                    ].map((pref, index) => (
                      <div key={`${pref.label?.slice(0, 12) ?? 'pref'}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{pref.label}</p>
                          <p className="text-xs text-muted-foreground">{pref.description}</p>
                        </div>
                        <input type="checkbox" className="h-4 w-4" defaultChecked />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Two-Factor Authentication
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
