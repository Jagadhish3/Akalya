// src/pages/StudentDashboard.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
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
  Megaphone,
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
  announcementsAPI,
  resourcesAPI,
} from "@/lib/api";
import { CourseCard } from "@/components/CourseCard";
import { SubmitAssignmentDialog } from "@/components/SubmitAssignmentDialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, useNavigate } from "react-router-dom";
import { CourseLecturesDialog } from "@/components/CourseLecturesDialog";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const idOf = (obj: any) => (typeof obj === 'object' ? (obj._id || obj.id || obj.courseId) : obj);
  const location = useLocation();
  const navigate = useNavigate();
  
  const queryParams = new URLSearchParams(location.search);
  const sectionParam = queryParams.get("section") || "dashboard";

  const [activeSection, setActiveSection] = useState(sectionParam);

  useEffect(() => {
    if (sectionParam !== activeSection) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam]);

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    navigate(`?section=${sectionId}`);
  };
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [libraryResources, setLibraryResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [scholarshipType, setScholarshipType] = useState<"merit" | "need" | "caste">("merit");
  const [scholarshipLevel, setScholarshipLevel] = useState<"class10" | "class12" | "graduation">("class10");
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
      (s.assignment && typeof s.assignment === "object" ? s.assignment._id ?? s.assignment.id : null);

    const studentId =
      s.student_id ??
      s.studentId ??
      (typeof s.student === "string" ? s.student : null) ??
      (s.student && typeof s.student === "object" ? s.student._id ?? s.student.id : null);

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

  const exploreCourses = useMemo(() => {
    if (!Array.isArray(courses)) return [];
    
    // Group by title (subject)
    const grouped: Record<string, any[]> = {};
    courses.forEach(c => {
      const status = (c?.status ?? "").toString().toLowerCase();
      if (status === "draft") return;
      const title = (c.title || "").trim();
      if (!title) return;
      if (!grouped[title]) grouped[title] = [];
      grouped[title].push(c);
    });

    // Pick one random from each group (Random Allocation)
    return Object.values(grouped).map(group => {
      const randomIndex = Math.floor(Math.random() * group.length);
      return group[randomIndex];
    });
  }, [courses]);

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
      if (activeSection === "announcements") {
        await fetchAnnouncements();
      }
      if (activeSection === "library") {
        await fetchLibraryResources();
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

  const fetchAnnouncements = async () => {
    try {
      const data = await announcementsAPI.getAll();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchAnnouncements error", err);
    }
  };

  const fetchLibraryResources = async () => {
    try {
      const data = await resourcesAPI.getAll();
      const all = Array.isArray(data) ? data : [];
      // filter for student or all
      setLibraryResources(all.filter((r: any) => r.targetRole === "all" || r.targetRole === "student"));
    } catch (err) {
      console.error("fetchLibraryResources error", err);
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
        user?.role === "student"
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
          _normalizedCourseId: (courseRef && typeof courseRef === "object") ? String(courseRef._id ?? courseRef.id ?? "") : String(courseRef ?? ""),
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
      const currentUserId = String(user?.id ?? user?._id ?? "");

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
          if (qStudent && typeof qStudent === 'object') return String(qStudent._id ?? qStudent.id) === myId;
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

  const [lecturesCourseId, setLecturesCourseId] = useState<string | null>(null);

  // open the course lectures dialog
  const handleStartLearning = async (courseId: string) => {
    setLecturesCourseId(courseId);
  };

  const menuItems = [
    { id: "dashboard", label: t("nav.dashboard"), icon: Home },
    { id: "explore", label: t("courses.explore"), icon: BookOpen },
    { id: "enrolled", label: t("courses.myCourses"), icon: GraduationCap },
    { id: "assignments", label: t("nav.assignments"), icon: FileText },
    { id: "attendance", label: t("student.attendanceTracking") || "Attendance", icon: Calendar },
    { id: "doubt", label: t("student.doubts") || "Doubts", icon: MessageSquare },
    { id: "announcements", label: t("nav.announcements") || "Announcements", icon: Megaphone },
    { id: "progress", label: t("student.progress") || "Progress", icon: TrendingUp },
    { id: "library", label: t("nav.library"), icon: Library },
  ];

  const getEnrolledCourseOptions = () => {
    if (!Array.isArray(enrolledCourses) || enrolledCourses.length === 0) return [];
    return enrolledCourses.map((enr: any) => {
      const raw = enr.course ?? enr.courseId ?? enr.course_id ?? enr;
      if (!raw) return null;
      if (typeof raw === "string") {
        const match = courses.find((c: any) => String(c._id ?? c.id ?? "") === String(raw));
        if (!match) return null;
        return { id: String(match._id ?? match.id ?? ""), title: match.title };
      } else if (raw && typeof raw === "object") {
        return { id: String(raw._id ?? raw.id ?? raw.courseId ?? raw.course_id ?? ""), title: raw.title ?? raw.name };
      }
      return null;
    }).filter((opt: any) => opt && opt.id && opt.title);
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

  const scholarshipData: Record<string, Record<string, { name: string; provider: string; amount: string; eligibility: string; deadline: string; link: string; tag: string; }[]>> = {
    merit: {
      class10: [
        { name: "National Means-cum-Merit Scholarship (NMMS)", provider: "Ministry of Education, Govt. of India", amount: "₹12,000/year", eligibility: "Class 8 pass, family income ≤ ₹3.5 lakh/year, govt school student", deadline: "November (state-wise)", link: "https://scholarships.gov.in", tag: "Central Govt" },
        { name: "INSPIRE Scholarship (SHE) – Class 10 Top", provider: "Dept. of Science & Technology", amount: "₹80,000/year", eligibility: "Top 1% in Class 10 board, pursuing science at Class 11", deadline: "October 31", link: "https://online-inspire.gov.in", tag: "Science" },
        { name: "Pragati Scholarship (AICTE)", provider: "AICTE", amount: "₹50,000/year", eligibility: "Girl students, rural area, family income ≤ ₹8 lakh", deadline: "December", link: "https://scholarships.gov.in", tag: "Girls" },
        { name: "Dr. APJ Abdul Kalam Ignite Award", provider: "National Innovation Foundation", amount: "₹10,000 + certificate", eligibility: "Innovative idea by students up to Class 12", deadline: "August 31", link: "https://nif.org.in", tag: "Innovation" },
        { name: "Vidyasiri Scholarship (Karnataka)", provider: "Karnataka Govt.", amount: "₹10,000–₹30,000/year", eligibility: "State board toppers, rural domicile required", deadline: "September", link: "https://karepass.cgg.gov.in", tag: "State Govt" },
      ],
      class12: [
        { name: "Central Sector Scheme of Scholarships (CSSS)", provider: "Ministry of Education", amount: "₹10,000–₹20,000/year", eligibility: "Top 20 percentile in Class 12, family income ≤ ₹8 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "Central Govt" },
        { name: "INSPIRE Scholarship (SHE) – Class 12", provider: "DST, Govt. of India", amount: "₹80,000/year", eligibility: "Top 1% in Class 12, enrolled BSc/Integrated MSc Natural Sciences", deadline: "October 31", link: "https://online-inspire.gov.in", tag: "Science" },
        { name: "KVPY Fellowship", provider: "IISc Bangalore / DST", amount: "₹5,000–₹7,000/month + contingency", eligibility: "Class 12 / 1st yr BSc, aptitude test + interview", deadline: "September", link: "https://kvpy.iisc.ac.in", tag: "Research" },
        { name: "Post-Matric Scholarship (State Merit)", provider: "State Social Welfare Depts.", amount: "₹5,000–₹15,000/year", eligibility: "Rural students ≥ 60% in Class 11, income ≤ ₹1 lakh", deadline: "October", link: "https://scholarships.gov.in", tag: "State Govt" },
        { name: "GE Foundation Scholar-Leaders Programme", provider: "GE Foundation India", amount: "₹1 lakh/year", eligibility: "Girls in STEM, rural background, income ≤ ₹3 lakh", deadline: "June", link: "https://www.b4s.in", tag: "STEM Girls" },
      ],
      graduation: [
        { name: "Prime Minister's Scholarship Scheme (PMSS)", provider: "Ministry of Home Affairs", amount: "₹30,000–₹36,000/year", eligibility: "Wards of ex-servicemen/paramilitary, min 60% in Class 12", deadline: "October 15", link: "https://ksb.gov.in", tag: "Central Govt" },
        { name: "INSPIRE Scholarship – BSc/Integrated MSc", provider: "DST", amount: "₹80,000/year + ₹20,000 research", eligibility: "Top 1% in Class 12, natural sciences", deadline: "October 31", link: "https://online-inspire.gov.in", tag: "Research" },
        { name: "Indira Gandhi Scholarship for Single Girl Child", provider: "UGC", amount: "₹36,200/year", eligibility: "Single girl child, PG programmes in any university", deadline: "October", link: "https://www.ugc.gov.in", tag: "Girls" },
        { name: "Ishan Uday (North-East Region)", provider: "UGC", amount: "₹5,400–₹7,800/month", eligibility: "North-East domicile in general degree colleges", deadline: "October", link: "https://scholarships.gov.in", tag: "Regional" },
        { name: "Reliance Foundation Scholarship", provider: "Reliance Foundation", amount: "₹4 lakh (4 years)", eligibility: "Rural, family income ≤ ₹2.5 lakh, STEM/Liberal Arts", deadline: "June", link: "https://rf.foundation/scholarships", tag: "Corporate" },
      ],
    },
    need: {
      class10: [
        { name: "Mukhyamantri Medhavi Vidyarthi Yojana (MP)", provider: "Govt. of Madhya Pradesh", amount: "Full tuition fee waiver", eligibility: "Family income ≤ ₹6 lakh, MP board ≥ 70% / CBSE ≥ 85%", deadline: "August", link: "http://scholarshipportal.mp.nic.in", tag: "State Govt" },
        { name: "Swami Vivekananda Merit-cum-Means (WB)", provider: "Govt. of West Bengal", amount: "₹12,000–₹60,000/year", eligibility: "Class 10 pass, rural WB domicile, income ≤ ₹2.5 lakh", deadline: "November", link: "https://svmcm.wbhed.gov.in", tag: "State Govt" },
        { name: "NSP Pre-Matric Scholarship – Minorities", provider: "Ministry of Minority Affairs", amount: "₹1,000–₹10,000/year", eligibility: "Muslim/Sikh/Christian/Buddhist student, income ≤ ₹1 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "Minority" },
        { name: "Aam Aadmi Scholarship (Delhi)", provider: "Govt. of Delhi", amount: "₹5,000–₹25,000/year", eligibility: "Delhi domicile, income ≤ ₹2.5 lakh, Class 9–12", deadline: "September", link: "https://edistrict.delhigovt.nic.in", tag: "State Govt" },
        { name: "e-Grantz Scholarship (Kerala)", provider: "Govt. of Kerala", amount: "₹5,000–₹15,000/year", eligibility: "Kerala domicile, rural area, income ≤ ₹1 lakh", deadline: "November", link: "https://egrantz.kerala.gov.in", tag: "State Govt" },
      ],
      class12: [
        { name: "Post-Matric Scholarship – General/EWS", provider: "State Govts. / MoSJE", amount: "₹3,000–₹10,000/year", eligibility: "EWS/OBC, Class 11–12, income ≤ ₹1 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "EWS/OBC" },
        { name: "NSP Post-Matric – Minority", provider: "Ministry of Minority Affairs", amount: "₹13,500–₹20,000/year", eligibility: "Minority community, income ≤ ₹2 lakh, ≥ 50% marks", deadline: "October 31", link: "https://scholarships.gov.in", tag: "Minority" },
        { name: "Apaar Scholarship (Tata Trusts)", provider: "Tata Trusts", amount: "₹30,000/year", eligibility: "Rural girl, income ≤ ₹3 lakh, Science/Commerce stream", deadline: "September", link: "https://www.tatatrusts.org", tag: "NGO" },
        { name: "Vidyalakshmi Education Loan + Interest Subsidy", provider: "Dept. of Financial Services", amount: "Interest subsidy on education loan", eligibility: "Merit-based, recognised institution, income ≤ ₹4.5 lakh", deadline: "Rolling", link: "https://www.vidyalakshmi.co.in", tag: "Loan+Scholarship" },
        { name: "Sitaram Jindal Foundation Scholarship", provider: "Sitaram Jindal Foundation", amount: "₹1,000–₹3,000/month", eligibility: "All streams, income ≤ ₹3 lakh, rural domicile preferred", deadline: "September 30", link: "https://sitaramjindalfoundation.org", tag: "Foundation" },
      ],
      graduation: [
        { name: "Pragati Scholarship – AICTE (Graduation)", provider: "AICTE", amount: "₹50,000/year + ₹30,000 incidental", eligibility: "Girl, AICTE-approved tech institution, income ≤ ₹8 lakh", deadline: "November", link: "https://scholarships.gov.in", tag: "Girls/Technical" },
        { name: "NSP Post-Matric Minority – Degree Level", provider: "Ministry of Minority Affairs", amount: "₹20,000–₹25,000/year", eligibility: "Minority, degree/diploma, income ≤ ₹2 lakh, ≥ 50%", deadline: "October 31", link: "https://scholarships.gov.in", tag: "Minority" },
        { name: "Sitaram Jindal Foundation Scholarship (UG)", provider: "Sitaram Jindal Foundation", amount: "₹1,000–₹3,000/month", eligibility: "All disciplines, income ≤ ₹3 lakh, rural domicile preferred", deadline: "September 30", link: "https://sitaramjindalfoundation.org", tag: "Foundation" },
        { name: "L'Oréal India For Young Women in Science", provider: "L'Oréal – UNESCO", amount: "₹2.5 lakh", eligibility: "Female, BSc/Integrated MSc STEM, ≥ 60% marks", deadline: "July", link: "https://www.lorealindia.com/csr", tag: "Science Girls" },
        { name: "Reliance Foundation Scholarship (UG)", provider: "Reliance Foundation", amount: "Up to ₹4 lakh (4 years)", eligibility: "Rural, income ≤ ₹2.5 lakh, STEM or Liberal Arts", deadline: "June", link: "https://rf.foundation/scholarships", tag: "Corporate" },
      ],
    },
    caste: {
      class10: [
        { name: "Pre-Matric Scholarship – SC Students", provider: "Ministry of Social Justice", amount: "₹1,500–₹7,000/year", eligibility: "SC category, Class 9–10, income ≤ ₹2.5 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "SC" },
        { name: "Pre-Matric Scholarship – ST Students", provider: "Ministry of Tribal Affairs", amount: "₹1,500–₹7,000/year", eligibility: "ST category, Class 9–10, govt/aided school", deadline: "October 31", link: "https://scholarships.gov.in", tag: "ST" },
        { name: "Pre-Matric Scholarship – OBC", provider: "Ministry of Social Justice", amount: "₹1,500–₹5,500/year", eligibility: "OBC category, Class 9–10, income ≤ ₹1 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "OBC" },
        { name: "Dr. Ambedkar Post-Matric Prep Grant (SC/OBC)", provider: "MoSJE", amount: "₹50,000 prep grant", eligibility: "SC/OBC clearing Class 10 with ≥ 55%, income ≤ ₹6 lakh", deadline: "August", link: "https://socialjustice.gov.in", tag: "SC/OBC" },
        { name: "Rajasthan Pre-Matric SC/ST/OBC", provider: "Rajasthan Govt.", amount: "₹8,000–₹15,000/year", eligibility: "SC/ST/OBC domicile of Rajasthan, Class 6–10", deadline: "November", link: "https://sje.rajasthan.gov.in", tag: "State Govt" },
      ],
      class12: [
        { name: "Post-Matric Scholarship – SC", provider: "Ministry of Social Justice", amount: "Tuition + ₹11,000–₹19,800 maintenance/year", eligibility: "SC category, Class 11–12, income ≤ ₹2.5 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "SC" },
        { name: "Post-Matric Scholarship – ST", provider: "Ministry of Tribal Affairs", amount: "Full tuition + ₹10,000–₹15,000 maintenance", eligibility: "ST category, any recognised institution post Class 10", deadline: "October 31", link: "https://scholarships.gov.in", tag: "ST" },
        { name: "Post-Matric Scholarship – OBC", provider: "State Social Welfare Depts.", amount: "₹5,000–₹11,000/year", eligibility: "OBC, Class 11–12, income ≤ ₹1 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "OBC" },
        { name: "Babu Jagjivan Ram Chhatrawas Yojana", provider: "MoSJE", amount: "Hostel accommodation grant", eligibility: "SC students in recognised institutions, income ≤ ₹3 lakh", deadline: "August", link: "https://socialjustice.gov.in", tag: "SC" },
        { name: "Nai Udaan – Minority Class 11–12", provider: "Ministry of Minority Affairs", amount: "₹25,000/year", eligibility: "Minority students clearing Class 10 prelims, income ≤ ₹2 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "Minority" },
      ],
      graduation: [
        { name: "National Fellowship & Scholarship – ST Higher Education", provider: "Ministry of Tribal Affairs", amount: "Full scholarship (UGC norms)", eligibility: "ST category, degree/PG enrolled, income ≤ ₹6 lakh", deadline: "October", link: "https://scholarships.gov.in", tag: "ST" },
        { name: "Dr. Ambedkar Post-Matric Scholarship – OBC/EBC", provider: "MoSJE", amount: "Tuition + maintenance allowance", eligibility: "OBC/EBC, UG/PG, income ≤ ₹1 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "OBC/EBC" },
        { name: "Rajiv Gandhi National Fellowship – SC/ST", provider: "UGC", amount: "₹25,000–₹28,000/month (JRF/SRF)", eligibility: "SC/ST, MPhil/PhD, UGC-NET qualified", deadline: "April", link: "https://www.ugc.gov.in", tag: "SC/ST Research" },
        { name: "Maulana Azad National Fellowship (Minority)", provider: "Ministry of Minority Affairs", amount: "₹25,000–₹28,000/month", eligibility: "Minority community, MPhil/PhD, UGC-NET qualified", deadline: "March/April", link: "https://maef.nic.in", tag: "Minority" },
        { name: "Post-Matric Scholarship SC – Degree Level", provider: "Ministry of Social Justice", amount: "Full tuition + ₹19,800 maintenance/year", eligibility: "SC category, UG/PG degree, income ≤ ₹2.5 lakh", deadline: "October 31", link: "https://scholarships.gov.in", tag: "SC" },
      ],
    },
  };

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
            onClick={() => handleSectionChange(item.id)}
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
              <DialogTitle>{currentClass ? currentClass.title || t('ui.courseVideo') : t('ui.courseVideos')}</DialogTitle>
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
                  <div className="p-6 text-center text-muted-foreground">{t('ui.selectVideo')}</div>
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
              <Button variant="outline" onClick={() => setLearningOpen(false)}>{t('common.close')}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <header className="bg-card border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t('student.dashboard')}</h1>
              <p className="text-muted-foreground">{t('ui.welcomeBack')}, {user?.fullName}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications removed from header as per user request */}
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
                const normalizedAssignmentCourseId = (assignmentCourseId && typeof assignmentCourseId === "object")
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
                      <CardDescription>{t('student.totalCourses')}</CardDescription>
                      <CardTitle className="text-4xl">{totalCoursesCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        +2 {t('ui.fromLastMonth')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover-scale">
                    <CardHeader className="pb-3">
                      <CardDescription>{t('courses.myCourses')}</CardDescription>
                      <CardTitle className="text-4xl">{myCoursesCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {t('ui.enrolledCourses')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover-scale">
                    <CardHeader className="pb-3">
                      <CardDescription>{t('student.pendingAssignments')}</CardDescription>
                      <CardTitle className="text-4xl">{pendingAssignmentsCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {t('ui.dueThisWeek')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover-scale">
                    <CardHeader className="pb-3">
                      <CardDescription>{t('student.attendance')}</CardDescription>
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
                  {exploreCourses.map((course, idx) => {
                    const courseId = course._id || course.id;
                    const normalizedCourse = {
                      id: courseId,
                      title: course.title,
                      description: course.description,
                      status: course.status,
                      teacherName: course.teacherId?.fullName || "Teacher",
                      url: course.url || course.courseUrl || course.link || course.videoUrl || null,
                    };

                    const fallbackKey = String(normalizedCourse.id ?? normalizedCourse.title ?? `explore-${idx}`);

                    return (
                      <CourseCard
                        key={fallbackKey}
                        course={normalizedCourse}
                        isEnrolled={isEnrolled(String(normalizedCourse.id))}
                        onEnroll={() => handleEnroll(String(normalizedCourse.id))}
                        onViewCourse={() => {
                          if (normalizedCourse.url) {
                            window.open(normalizedCourse.url, "_blank");
                          }
                        }}
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
                    } else if (raw && typeof raw === "object") {
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
                            teacherName: match.teacherId?.fullName || "Teacher",
                            url: match.url ?? match.courseUrl ?? match.link ?? null,
                          };
                          if ((normalized.status ?? "").toString().toLowerCase() === "draft") return null;
                          if (!normalized.title) return null;
                          return normalized;
                        } else if (raw && typeof raw === "object") {
                          const normalized = {
                            id: String(raw._id ?? raw.id ?? raw.courseId ?? raw.course_id ?? ""),
                            title: raw.title ?? raw.name,
                            description: raw.description,
                            status: raw.status,
                            teacherName: raw.teacherId?.fullName || "Teacher",
                            url: raw.url ?? raw.courseUrl ?? raw.link ?? null,
                          };
                          if ((normalized.status ?? "").toString().toLowerCase() === "draft") return null;
                          if (!normalized.title) return null;
                          return normalized;
                        }
                        return null;
                      })
                      .filter(Boolean)
                    ) ||
                    (Array.isArray(courses) ? courses.filter((c: any) => {
                      const courseId = String(c._id ?? c.id ?? "");
                      const status = (c?.status ?? "").toString().toLowerCase();
                      return status !== "draft" && isEnrolled(courseId) && c.title;
                    }) : [])
                  ).map((normalizedCourse: any, idx: number) => (
                    <CourseCard
                      key={String(normalizedCourse.id ?? normalizedCourse.title ?? `enrolled-${idx}`)}
                      course={{
                        id: String(normalizedCourse.id ?? ""),
                        title: normalizedCourse.title,
                        description: normalizedCourse.description,
                        status: normalizedCourse.status,
                        teacherName: normalizedCourse.teacherName,
                        url: normalizedCourse.url,
                      }}
                      isEnrolled={true}
                      onStartLearning={() => handleStartLearning(String(normalizedCourse.id ?? normalizedCourse._id))}
                      onViewCourse={() => handleStartLearning(String(normalizedCourse.id ?? normalizedCourse._id))}
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
                      {getEnrolledCourseOptions().map((opt: any, index: number) => {
                        const courseId = String(opt.id);
                        const stats = attendanceStats?.byCourse?.[courseId] || { present: 0, total: 0 };
                        const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                        return (
                          <div key={`${courseId}-${index}`} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{opt.title}</h4>
                              <span className="text-sm font-medium">{percentage}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                              <span>{stats.present} / {stats.total} classes</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${percentage >= 90 ? "bg-green-500" :
                                  percentage >= 75 ? "bg-yellow-500" : "bg-red-500"
                                  }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {getEnrolledCourseOptions().length === 0 && (
                        <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg">You are not enrolled in any courses yet.</div>
                      )}
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

          {activeSection === "scholarships" && (() => {
            const categories = [
              { key: "merit", label: "🏅 Merit" },
              { key: "need", label: "💰 Need-based" },
              { key: "caste", label: "📋 Caste/Category" },
            ] as const;
            const levels = [
              { key: "class10", label: "Class 10" },
              { key: "class12", label: "Class 12" },
              { key: "graduation", label: "Graduation" },
            ] as const;

            type CategoryKey = typeof categories[number]["key"];
            type LevelKey = typeof levels[number]["key"];

            const [schCat, setSchCat] = (window as any).__schCatState ??
              (() => {
                let v: CategoryKey = "merit";
                const setter = (s: CategoryKey) => { v = s; (window as any).__schCatVal = s; };
                (window as any).__schCatState = [() => (window as any).__schCatVal ?? v, setter];
                return (window as any).__schCatState;
              })();

            const [schLvl, setSchLvl] = (window as any).__schLvlState ??
              (() => {
                let v: LevelKey = "class10";
                const setter = (s: LevelKey) => { v = s; (window as any).__schLvlVal = s; };
                (window as any).__schLvlState = [() => (window as any).__schLvlVal ?? v, setter];
                return (window as any).__schLvlState;
              })();

            // Use React state properly via a wrapper
            const [activeCat, setActiveCat] = [
              (window as any).__activeCat ?? "merit" as CategoryKey,
              (c: CategoryKey) => { (window as any).__activeCat = c; }
            ];
            const [activeLvl, setActiveLvl] = [
              (window as any).__activeLvl ?? "class10" as LevelKey,
              (l: LevelKey) => { (window as any).__activeLvl = l; }
            ];

            const currentList = (scholarshipData as any)[activeCat]?.[activeLvl] ?? [];

            return (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold">Scholarship Schemes</h2>
                  <p className="text-muted-foreground">Government & private scholarships for rural students</p>
                </div>

                {/* Category tabs */}
                <div className="flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <Button
                      key={cat.key}
                      variant={activeCat === cat.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => { (window as any).__activeCat = cat.key; window.dispatchEvent(new Event("schchange")); }}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>

                {/* Level tabs */}
                <div className="flex gap-2 flex-wrap">
                  {levels.map((lvl) => (
                    <Button
                      key={lvl.key}
                      variant={activeLvl === lvl.key ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => { (window as any).__activeLvl = lvl.key; window.dispatchEvent(new Event("schchange")); }}
                    >
                      {lvl.label}
                    </Button>
                  ))}
                </div>

                {/* Scholarship cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  {currentList.length === 0 ? (
                    <p className="text-muted-foreground col-span-2 text-center py-8">No scholarships found for this selection.</p>
                  ) : (
                    currentList.map((s: any, idx: number) => (
                      <Card key={`${s.name}-${idx}`} className="hover-scale">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base leading-snug">{s.name}</CardTitle>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{s.tag}</span>
                          </div>
                          <CardDescription>{s.provider}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium text-green-600">{s.amount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Deadline</span>
                            <span className="font-medium">{s.deadline}</span>
                          </div>
                          <p className="text-xs text-muted-foreground border-t pt-2">{s.eligibility}</p>
                          <a
                            href={s.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1"
                          >
                            <Button size="sm" variant="outline" className="w-full">Apply / Learn More ↗</Button>
                          </a>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* Remaining sections (progress, library, notifications, settings) */}
          {activeSection === "progress" && (() => {
            // Compute real progress values from enrollment data
            const enrolledList = getEnrolledCourseOptions();
            const enrolledCount = enrolledList.length;

            // Map of enrolledCourses to get progress per course
            const progressByCourse = (Array.isArray(enrolledCourses) ? enrolledCourses : [])
              .map((enr: any) => {
                const raw = enr.course ?? enr.courseId ?? enr.course_id ?? enr;
                const title = (raw && typeof raw === 'object') ? (raw.title ?? raw.name ?? '') : '';
                const prog = typeof enr.progress === 'number' ? enr.progress : 0;
                return { name: title, progress: prog };
              })
              .filter(course => course.name);

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
                    {libraryResources.length === 0 ? (
                      <p className="text-sm text-muted-foreground col-span-full text-center py-8">No library resources available yet.</p>
                    ) : libraryResources.map((resource, index) => (
                      <Card key={`${resource.title?.slice(0, 20) ?? 'res'}-${index}`} className="hover-scale">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-3 bg-primary/10 rounded-lg">
                              <Library className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm mb-1 truncate">{resource.title}</h4>
                              <p className="text-xs text-muted-foreground mb-2">
                                {resource.type || "Resource"} {resource.subject ? `• ${resource.subject}` : ""}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {resource.classLevel ? `Class: ${resource.classLevel}` : ""}
                                </span>
                                {resource.url && (
                                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="ghost">Download</Button>
                                  </a>
                                )}
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

          {activeSection === "announcements" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">Platform Announcements</h2>
                <p className="text-muted-foreground">Important updates and broadcasts from administration</p>
              </div>

              {announcements.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No announcements at this time.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {announcements.map((ann, idx) => (
                    <Card key={ann._id || idx} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <CardTitle className="text-lg">{ann.title}</CardTitle>
                        <CardDescription>{format(new Date(ann.createdAt), "PPP")}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{ann.message}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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
                    {/* Change Password Dialog */}
                    <Dialog open={changePasswordOpen} onOpenChange={(open) => {
                      setChangePasswordOpen(open);
                      if (!open) { setNewPassword(""); setConfirmNewPassword(""); }
                    }}>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Change Password</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-1">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                              id="new-password"
                              type="password"
                              placeholder="••••••••"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                            {newPassword.length > 0 && newPassword.length < 6 && (
                              <p className="text-xs text-destructive mt-1">
                                ⚠ Password must be more than 6 characters.
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                            <Input
                              id="confirm-new-password"
                              type="password"
                              placeholder="••••••••"
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setChangePasswordOpen(false);
                              setNewPassword("");
                              setConfirmNewPassword("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              if (newPassword.length < 6) {
                                toast({
                                  title: "Password Too Short",
                                  description: "Password length should be more than 6 characters.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              if (newPassword !== confirmNewPassword) {
                                toast({
                                  title: "Passwords Don't Match",
                                  description: "The passwords you entered do not match.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              toast({
                                title: "Password Changed",
                                description: "Your password has been updated successfully.",
                              });
                              setChangePasswordOpen(false);
                              setNewPassword("");
                              setConfirmNewPassword("");
                            }}
                          >
                            Save Password
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button variant="outline" className="w-full justify-start" onClick={() => setChangePasswordOpen(true)}>
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

          {/* ===== SCHOLARSHIPS SECTION ===== */}
          {activeSection === "scholarships" && (
            <div className="space-y-6 animate-fade-in p-4">
              <div>
                <h2 className="text-2xl font-bold">🎓 Scholarships for Rural Students</h2>
                <p className="text-muted-foreground mt-1">
                  Real government &amp; private scholarships — filter by type and education level
                </p>
              </div>

              {/* Type Filter */}
              <div className="flex flex-wrap gap-3">
                <div className="flex gap-2 flex-wrap">
                  {(["merit", "need", "caste"] as const).map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={scholarshipType === type ? "default" : "outline"}
                      onClick={() => setScholarshipType(type)}
                    >
                      {type === "merit" ? "🏆 Merit" : type === "need" ? "💰 Need-Based" : "🏷️ Caste/Category"}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(["class10", "class12", "graduation"] as const).map((lvl) => (
                    <Button
                      key={lvl}
                      size="sm"
                      variant={scholarshipLevel === lvl ? "default" : "outline"}
                      onClick={() => setScholarshipLevel(lvl)}
                    >
                      {lvl === "class10" ? "Class 10" : lvl === "class12" ? "Class 12" : "Graduation"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Result count badge */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {scholarshipData[scholarshipType][scholarshipLevel].length} scholarships found
                </span>
                <span>
                  for {scholarshipLevel === "class10" ? "Class 10" : scholarshipLevel === "class12" ? "Class 12" : "Graduation"}
                  {" · "}
                  {scholarshipType === "merit" ? "Merit-based" : scholarshipType === "need" ? "Need-based" : "Caste/Category"}
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {scholarshipData[scholarshipType][scholarshipLevel].map((s, i) => (
                  <Card key={i} className="hover:shadow-md transition-shadow border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{s.name}</CardTitle>
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
                          {s.tag}
                        </span>
                      </div>
                      <CardDescription className="text-xs mt-1">{s.provider}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="text-green-600 dark:text-green-400 font-semibold text-base">{s.amount}</div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Eligibility</p>
                        <p className="text-xs">{s.eligibility}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/50 mt-2">
                        <p className="text-xs text-muted-foreground">
                          📅 Deadline: <span className="font-medium text-foreground">{s.deadline}</span>
                        </p>
                        <a href={s.link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-7 text-xs">Apply →</Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                * Data sourced from <strong>scholarships.gov.in</strong> (NSP), UGC, DST, AICTE and state portals.
                Deadlines may vary year to year — always verify on the official portal before applying.
              </p>
            </div>
          )}
        </div>
        <CourseLecturesDialog 
          courseId={lecturesCourseId} 
          onClose={() => setLecturesCourseId(null)} 
          onProgressUpdated={() => {
            fetchEnrolledCourses();
            fetchAttendanceStats();
          }} 
        />
      </main>
    </div>
  );
}
