// src/pages/TeacherDashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Home, BookOpen, Plus, FileText, Calendar,
  MessageSquare, TrendingUp, Upload, Bell, Settings,
  LogOut, Menu, X, Users, Megaphone
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { coursesAPI, assignmentsAPI, submissionsAPI, classesAPI, enrollmentsAPI, queriesAPI, attendanceAPI, usersAPI, announcementsAPI, resourcesAPI } from "@/lib/api";
import { CreateCourseDialog } from "@/components/CreateCourseDialog";
import { EditCourseDialog } from "@/components/EditCourseDialog";
import { CourseCard } from "@/components/CourseCard";
import { CreateAssignmentDialog } from "@/components/CreateAssignmentDialog";
import { GradeSubmissionDialog } from "@/components/GradeSubmissionDialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { QueriesList } from "@/components/QueriesList";

export default function TeacherDashboard() {
  const { user, signOut } = useAuth();
  const idOf = (obj: any) => (typeof obj === 'object' ? (obj._id || obj.id || obj.courseId) : obj);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  // safe date formatter (handles firestore timestamp objects, numbers, strings)
  const safeFormatDate = (value: any, fmt = "PPp") => {
    if (!value) return "";
    try {
      if (typeof value === "object" && typeof (value as any).toDate === "function") {
        const d = (value as any).toDate();
        if (isNaN(d.getTime())) return "";
        return format(d, fmt);
      }
      if (typeof value === "number") {
        const d = new Date(value);
        if (isNaN(d.getTime())) return "";
        return format(d, fmt);
      }
      const d = new Date(String(value));
      if (isNaN(d.getTime())) return "";
      return format(d, fmt);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("safeFormatDate parse failed for", value, e);
      return "";
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [libraryResources, setLibraryResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manage course UI state
  const [editingCourse, setEditingCourse] = useState<any>(null);

  // derived enrollment counts
  const [courseStudentCounts, setCourseStudentCounts] = useState<Record<string, number>>({});
  const [totalUniqueStudents, setTotalUniqueStudents] = useState<number>(0);

  const [selectedAttendanceCourse, setSelectedAttendanceCourse] = useState<string>("");
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceTopic, setAttendanceTopic] = useState<string>("");
  const [attendanceStudents, setAttendanceStudents] = useState<any[]>([]);
  const [attendanceBatch, setAttendanceBatch] = useState<Record<string, "present" | "absent">>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // reply UI state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");

  // Polling for realtime dashboard (except attendance)
  const pollRef = useRef<number | null>(null);
  const POLL_INTERVAL_MS = 15000; // 15s

  useEffect(() => {
    // initial fetches
    fetchCourses();
    fetchEnrollments(); // ensure enrollments available
    fetchQueries();
    if (activeSection === "assignments") {
      fetchAssignments();
    }
    if (activeSection === "resources") {
      fetchClasses();
      fetchLibraryResources();
    }
    if (activeSection === "announcements") {
      fetchAnnouncements();
    }

    // manage polling for dashboard
    manageDashboardPolling(activeSection === "dashboard");

    return () => {
      stopDashboardPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeSection]);

  // --- Polling helpers ---
  const startDashboardPolling = () => {
    if (pollRef.current) return;
    // immediate fetch
    fetchDashboardRealtime();
    const id = window.setInterval(() => {
      fetchDashboardRealtime();
    }, POLL_INTERVAL_MS);
    pollRef.current = id;
  };

  const stopDashboardPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const manageDashboardPolling = (shouldRun: boolean) => {
    if (shouldRun) startDashboardPolling();
    else stopDashboardPolling();
  };

  const fetchDashboardRealtime = async () => {
    if (!user) return;
    try {
      const [coursesRes, assignmentsRes, submissionsRes, classesRes, enrollmentsRes, queriesRes] = await Promise.allSettled([
        coursesAPI.getAll(),
        assignmentsAPI.getAll(),
        submissionsAPI.getAll(),
        classesAPI.getAll({ hasVideo: true }),
        enrollmentsAPI.getAll(),
        queriesAPI.getAll(),
      ]);

      if (coursesRes.status === "fulfilled") setCourses(Array.isArray(coursesRes.value) ? coursesRes.value : []);
      if (assignmentsRes.status === "fulfilled") setAssignments(Array.isArray(assignmentsRes.value) ? assignmentsRes.value : []);
      if (submissionsRes.status === "fulfilled") setSubmissions(Array.isArray(submissionsRes.value) ? submissionsRes.value : []);
      if (classesRes.status === "fulfilled") setClasses(Array.isArray(classesRes.value) ? classesRes.value : []);
      if (enrollmentsRes.status === "fulfilled") setEnrollments(Array.isArray(enrollmentsRes.value) ? enrollmentsRes.value : []);
      if (queriesRes.status === "fulfilled") {
        const q = queriesRes.value;
        const list = Array.isArray(q) ? q : (q?.items ?? []);
        setQueries(list);
      }
      
    } catch (err: any) {
      // log only — don't spam toasts during polling
      console.error("fetchDashboardRealtime error", err);
    }
  };
  // -----------------------

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await coursesAPI.getAll();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to fetch courses", variant: "destructive" });
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const assignmentsData = await assignmentsAPI.getAll();
      const submissionsData = await submissionsAPI.getAll();
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to fetch assignments", variant: "destructive" });
      setAssignments([]);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  // fetch teacher queries (used in dashboard card)
  const fetchQueries = async () => {
    try {
      const data = await queriesAPI.getAll();
      setQueries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchQueries error", err);
      setQueries([]);
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
      // filter for teacher or all
      setLibraryResources(all.filter((r: any) => r.targetRole === "all" || r.targetRole === "teacher"));
    } catch (err) {
      console.error("fetchLibraryResources error", err);
    }
  };
  

  const fetchClasses = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const classesData = await classesAPI.getAll({ hasVideo: true });
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to fetch uploaded videos", variant: "destructive" });
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // NEW: fetch enrollments and compute counts
  const fetchEnrollments = async () => {
    try {
      const data = await enrollmentsAPI.getAll();
      const list = Array.isArray(data) ? data : [];
      setEnrollments(list);
    } catch (err: any) {
      console.error("fetchEnrollments error", err);
      setEnrollments([]);
    }
  };

  const fetchAttendanceStudents = async (courseId: string, dateStr: string) => {
    if (!courseId) {
      setAttendanceStudents([]);
      return;
    }
    try {
      setLoading(true);
      
      // Fetch enrollments to get student info (student details are populated by backend)
      const allEnrollments = await enrollmentsAPI.getAll();
      const list = Array.isArray(allEnrollments) ? allEnrollments : [];
      
      // Filter by courseId
      const filtered = list.filter((enr: any) => {
        let cid = enr.courseId ?? enr.course_id ?? enr.course;
        if (cid && typeof cid === 'object') {
          cid = cid._id ?? cid.id;
        }
        return String(cid) === String(courseId);
      });

      // Extract student info
      const studentsFound = filtered.map((enr: any) => {
        return enr.student || enr.studentId || enr.user || null;
      }).filter(Boolean);

      // Fetch existing attendance to allow rectification
      const historyRaw = await attendanceAPI.getCourseHistory(courseId);
      const history = Array.isArray(historyRaw) ? historyRaw : [];
      const historyForDate = history.filter((a: any) => (a.date || a.createdAt?.split('T')[0]) === dateStr);

      const existingBatch: Record<string, "present" | "absent"> = {};
      let existingTopic = "";
      historyForDate.forEach((a: any) => {
         const sid = typeof a.studentId === 'object' ? (a.studentId?._id ?? a.studentId?.id) : a.studentId;
         if (sid) existingBatch[String(sid)] = a.status;
         if (a.topic) existingTopic = a.topic;
      });

      setAttendanceTopic(existingTopic);
      
      // Initialize batch state: use existing status if available, otherwise "present"
      const batch: Record<string, "present" | "absent"> = {};
      studentsFound.forEach((s: any) => {
        const sid = idOf(s);
        if (sid) batch[sid] = existingBatch[sid] || "present";
      });

      setAttendanceStudents(studentsFound);
      setAttendanceBatch(batch);
    } catch (err) {
      console.error("fetchAttendanceStudents error", err);
      toast({ title: "Error", description: "Failed to load students for this course", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedAttendanceCourse || attendanceStudents.length === 0) return;
    setSavingAttendance(true);
    try {
      const date = selectedAttendanceDate;
      const records = Object.entries(attendanceBatch).map(([studentId, status]) => ({
        courseId: selectedAttendanceCourse,
        studentId,
        date,
        status,
        topic: attendanceTopic
      }));

      await attendanceAPI.saveBulk(records);
      toast({ title: "Success", description: `Attendance saved for ${records.length} students` });
    } catch (err: any) {
      console.error("handleSaveAttendance error", err);
      toast({ title: "Error", description: err.message || "Failed to save attendance", variant: "destructive" });
    } finally {
      setSavingAttendance(false);
    }
  };

  const toggleAttendance = (studentId: string, status: "present" | "absent") => {
    setAttendanceBatch(prev => ({ ...prev, [studentId]: status }));
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!courseId) return;
    if (!confirm("Delete this course? This will remove it from student Explore Courses.")) return;

    try {
      await coursesAPI.delete(courseId);
      toast({ title: "Course deleted", description: "The course has been removed." });
      await fetchCourses();
      // Also refresh assignments so teacher view stays consistent
      await fetchAssignments();
    } catch (err: any) {
      console.error("handleDeleteCourse error", err);
      toast({ title: "Error", description: err?.message ?? "Failed to delete course", variant: "destructive" });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!assignmentId) return;
    if (user?.role !== "teacher") return; // teacher-only delete
    if (!confirm("Delete this assignment? Students will stop seeing it.")) return;

    try {
      await assignmentsAPI.delete(assignmentId);
      toast({ title: "Assignment deleted", description: "The assignment has been removed." });
      await fetchAssignments();
    } catch (err: any) {
      console.error("handleDeleteAssignment error", err);
      toast({ title: "Error", description: err?.message ?? "Failed to delete assignment", variant: "destructive" });
    }
  };

  // compute derived counts whenever enrollments change
  useEffect(() => {
    const courseCounts: Record<string, number> = {};
    const uniqueStudents = new Set<string>();

    enrollments.forEach((enr: any) => {
      // course extraction
      let courseId: string | null = null;
      const rawCourse = enr.course ?? enr.courseId ?? enr.course_id ?? (enr.course && (enr.course._id ?? enr.course.id)) ?? null;
      if (rawCourse) {
        if (typeof rawCourse === "object") courseId = String(rawCourse._id ?? rawCourse.id ?? "");
        else courseId = String(rawCourse);
      }

      // student extraction
      let studentId: string | null = null;
      const rawStudent = enr.student ?? enr.studentId ?? enr.student_id ?? enr.user ?? enr.userId ?? null;
      if (rawStudent) {
        if (typeof rawStudent === "object") studentId = String(rawStudent._id ?? rawStudent.id ?? "");
        else studentId = String(rawStudent);
      }

      if (studentId) uniqueStudents.add(studentId);
      if (courseId) courseCounts[courseId] = (courseCounts[courseId] || 0) + 1;
    });

    setCourseStudentCounts(courseCounts);
    setTotalUniqueStudents(uniqueStudents.size);
  }, [enrollments]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const menuItems = [
    { id: "dashboard", label: t('nav.dashboard'), icon: Home },
    { id: "announcements", label: t('nav.announcements'), icon: Megaphone },
    { id: "courses", label: t('courses.manage'), icon: BookOpen },
    { id: "create", label: t('courses.create'), icon: Plus },
    { id: "assignments", label: t('nav.assignments'), icon: FileText },
    { id: "attendance", label: t('student.attendance'), icon: Calendar },
    { id: "queries", label: t('nav.queries'), icon: MessageSquare },
    { id: "analytics", label: t('nav.analytics'), icon: TrendingUp },
    { id: "resources", label: t('teacher.resources'), icon: Upload },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "settings", label: t('nav.settings') || "Settings", icon: Settings },
  ];

  // Helper to resolve a readable student label
  const resolveStudentLabel = (submission: any) => {
    if (!submission) return "Student";

    if (typeof submission.studentLabel === "string" && submission.studentLabel.trim()) return submission.studentLabel;
    if (typeof submission.studentName === "string" && submission.studentName.trim()) return submission.studentName;
    if (typeof submission.student_name === "string" && submission.student_name.trim()) return submission.student_name;

    const studObj =
      submission.student ||
      submission.studentObj ||
      submission.studentInfo ||
      submission.student_id ||
      submission.studentId ||
      null;

    if (studObj) {
      if (typeof studObj === "object") {
        // prefer human-friendly names then fall back to email/username/id
        const name = studObj.fullName || studObj.full_name || studObj.name || studObj.username || studObj.email;
        if (name && String(name).trim()) return String(name);
        const id = String(studObj._id || studObj.id || "");
        return id ? id.slice(0, 8) : "Student";
      }
      return String(studObj).slice(0, 8);
    }

    if (submission.student_id) return String(submission.student_id).slice(0, 8);
    if (submission.studentId) return String(submission.studentId).slice(0, 8);

    return "Student";
  };

  // Teacher actions: reply & mark resolved
  const startReply = (queryId: string, existingReply = "") => {
    setReplyingTo(queryId);
    setReplyText(existingReply);
  };

  const sendReply = async (queryId: string) => {
    if (!replyText.trim()) {
      toast({ title: "Empty reply", description: "Please type a reply before sending.", variant: "destructive" });
      return;
    }
    try {
      await queriesAPI.update(queryId, { reply: replyText, status: "responded", respondedBy: user?.id ?? null });
      toast({ title: "Replied", description: "Reply saved and student will see it." });
      setReplyingTo(null);
      setReplyText("");
      fetchQueries();
    } catch (err: any) {
      console.error("sendReply error", err);
      toast({ title: "Error", description: "Failed to send reply", variant: "destructive" });
    }
  };

  const markResolved = async (queryId: string) => {
    // simple confirm - replace with modal if desired
    if (!confirm("Mark this query as resolved?")) return;
    try {
      await queriesAPI.update(queryId, { status: "resolved" });
      toast({ title: "Resolved", description: "Query marked resolved." });
      fetchQueries();
    } catch (err: any) {
      console.error("markResolved error", err);
      toast({ title: "Error", description: "Failed to update query", variant: "destructive" });
    }
  };

  // tiny nav debug helper
  const handleMenuClick = (itemId: string) => {
    // eslint-disable-next-line no-console
    console.debug('[NAV_CLICK]', { clicked: itemId, beforeActive: activeSection });
    setActiveSection(itemId);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} bg-card border-r transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl">Aकlya</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "ghost"}
              className={`w-full justify-start gap-3 ${!sidebarOpen && "justify-center"}`}
              onClick={() => handleMenuClick(item.id)}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className={`w-full gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 ${!sidebarOpen && "justify-center"}`}
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>{t('teacher.logout')}</span>}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Teacher Management Dashboard</h1>
              <p className="text-muted-foreground">{t('teacher.welcomeBack')}, {user?.fullName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setActiveSection("announcements")}>
                <Megaphone className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setActiveSection("notifications")}>
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* DASHBOARD (real-time polling active here) */}
          {activeSection === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover-scale">
                  <CardHeader className="pb-3">
                    <CardDescription>{t('teacher.totalCourses')}</CardDescription>
                    <CardTitle className="text-4xl">{courses.length}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{t('teacher.activeCourses')}</p></CardContent>
                </Card>

                <Card className="hover-scale">
                  <CardHeader className="pb-3">
                    <CardDescription>{t('teacher.totalStudents')}</CardDescription>
                    <CardTitle className="text-4xl">
                      {totalUniqueStudents || courses.reduce((acc, c: any) => acc + (Number(c.students) || Number(c.enrolledCount) || 0), 0) || 0}
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{t('teacher.enrolledStudents')}</p></CardContent>
                </Card>

                <Card className="hover-scale">
                  <CardHeader className="pb-3">
                    <CardDescription>{t('teacher.pendingReviews')}</CardDescription>
                    <CardTitle className="text-4xl">
                      {submissions.filter((s: any) => s.status === "submitted" || s.grade === undefined || s.grade === null).length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{t('teacher.assignmentsToGrade')}</p></CardContent>
                </Card>

                <Card className="hover-scale">
                  <CardHeader className="pb-3">
                    <CardDescription>{t('teacher.avgAttendance')}</CardDescription>
                    <CardTitle className="text-4xl">0%</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">Across all courses</p></CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Courses</CardTitle>
                    <CardDescription>Your recent courses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* show all courses in a scrollable container to keep card compact */}
                    <div className="max-h-96 overflow-y-auto space-y-4">
                      {courses.map((course: any) => {
                        const courseId = String(course._id ?? course.id ?? course.courseId ?? course._uuid ?? "");
                        const count = (courseStudentCounts[courseId] !== undefined)
                          ? courseStudentCounts[courseId]
                          : (Number(course.students) || Number(course.enrolledCount) || 0);

                        return (
                          <div key={courseId || course.title} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex-1">
                              <h4 className="font-semibold">{course.title ?? course.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">{count} students</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => setEditingCourse(course)}>Manage</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteCourse(courseId)}>Delete</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('teacher.recentQueries')}</CardTitle>
                    <CardDescription>{t('assignments.pending')} {t('common.actions')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* QueriesList component replaced with inline rendering to keep this single-file updated */}
                      {queries && queries.length > 0 ? (
                        queries.slice(0, 50).map((q: any) => {
                          const qId = String(q._id ?? q.id ?? Math.random());
                          const studentLabel = q.studentName ?? q.student?.fullName ?? q.student?.name ?? String(q.student ?? "").slice(0, 8) ?? "Student";
                          const subject = q.subject ?? q.topic ?? "General";
                          const text = q.message ?? q.query ?? q.text ?? "";
                          const created = q.createdAt ?? q.created_at ?? q.created ?? null;

                          return (
                            <div key={qId} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold">{studentLabel}</h4>
                                  <p className="text-xs text-muted-foreground">{subject}</p>
                                </div>
                                <div className="text-xs text-muted-foreground">{safeFormatDate(created)}</div>
                              </div>

                              <p className="text-sm text-muted-foreground mb-3">{text}</p>

                              {q.reply && (
                                <div className="mb-3 p-3 bg-muted rounded-md">
                                  <p className="text-sm font-medium mb-1">Teacher Reply:</p>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.reply}</p>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => startReply(qId, q.reply ?? "")}>Reply</Button>
                                <Button size="sm" onClick={() => markResolved(qId)}>Mark Resolved</Button>
                                <Button size="sm" variant="ghost" onClick={() => toast({ title: "Query details", description: text.length > 120 ? text.slice(0, 120) + "..." : text })}>View</Button>
                              </div>

                              {/* inline reply area (shown for the query teacher clicked) */}
                              {replyingTo === qId && (
                                <div className="mt-3">
                                  <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write a reply visible to the student..."
                                    className="w-full rounded-md border border-input px-3 py-2 text-sm"
                                    rows={3}
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <Button size="sm" onClick={() => sendReply(qId)}>Send Reply</Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground">No student queries yet.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Announcements</CardTitle>
                    <CardDescription>Latest updates from administration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {announcements.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recent announcements.</p>
                      ) : announcements.slice(0, 3).map((ann, idx) => (
                        <div key={ann._id || idx} className="p-3 border rounded-lg bg-primary/5">
                          <h4 className="font-semibold text-sm">{ann.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{safeFormatDate(ann.createdAt, "PP")}</p>
                        </div>
                      ))}
                      {announcements.length > 0 && (
                        <Button variant="link" className="w-full text-xs" onClick={() => setActiveSection("announcements")}>View All</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* COURSES */}
          {activeSection === "courses" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">My Courses</h2>
                  <p className="text-muted-foreground">Manage your courses</p>
                </div>
                <CreateCourseDialog onCourseCreated={fetchCourses} />
              </div>

              {editingCourse && (
                <EditCourseDialog
                  course={editingCourse}
                  open={!!editingCourse}
                  onOpenChange={(isOpen) => !isOpen && setEditingCourse(null)}
                  onCourseUpdated={fetchCourses}
                />
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : courses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first course to get started</p>
                    <CreateCourseDialog onCourseCreated={fetchCourses} />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course, idx) => {
                    const courseId = String(course._id ?? course.id ?? `c-${idx}`);
                    return (
                      <CourseCard
                        key={courseId}
                        course={{
                          id: courseId,
                          title: course.title,
                          description: course.description,
                          status: course.status,
                          url: course.url ?? course.courseUrl ?? null,
                        }}
                        canDelete={true}
                        onDelete={(id) => handleDeleteCourse(id)}
                        onManage={() => setEditingCourse(course)}
                        onViewCourse={() => toast({ title: "Course view", description: "Navigating to course content..." })}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CREATE */}
          {activeSection === "create" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold mb-2">Create New Course</h2>
                <p className="text-muted-foreground">Add a new course to your teaching portfolio</p>
              </div>
              <Card>
                <CardContent className="py-12 text-center">
                  <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Quick Create</h3>
                  <p className="text-muted-foreground mb-4">Use the button below to create a new course</p>
                  <CreateCourseDialog onCourseCreated={() => { fetchCourses(); setActiveSection("courses"); }} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ASSIGNMENTS */}
          {activeSection === "assignments" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Assignments</h2>
                  <p className="text-muted-foreground">Create and manage course assignments</p>
                </div>
                <CreateAssignmentDialog teacherId={user?.id || ""} courses={courses} onSuccess={fetchAssignments} />
              </div>

              {assignments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No assignments yet</h3>
                    <p className="text-muted-foreground">Create your first assignment to get started</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment: any, idx: number) => {
                    const assignmentId = String(assignment._id ?? assignment.id ?? `a-${idx}`);

                    // find related submissions
                    const assignmentSubmissions = (Array.isArray(submissions) ? submissions : []).filter((s: any) => {
                      const sAssignRaw = s.assignment_id ?? s.assignmentId ?? s.assignment ?? (s.assignment && (s.assignment._id ?? s.assignment.id));
                      const sAssignId = typeof sAssignRaw === "object" ? String(sAssignRaw._id ?? sAssignRaw.id ?? "") : String(sAssignRaw ?? "");
                      return sAssignId && String(sAssignId) === String(assignmentId);
                    });

                    const gradedCount = assignmentSubmissions.filter((s: any) => s.status === "graded" || (s.grade !== null && s.grade !== undefined)).length;

                    return (
                      <Card key={assignmentId} className="hover-scale">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle>{assignment.title}</CardTitle>
                              <CardDescription>
                                {assignment.courses?.title || assignment.courseTitle || ""} • Due: {assignment.due_date ? safeFormatDate(assignment.due_date) : "No due date"}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2 items-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${assignment.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                {assignment.status ?? "status"}
                              </span>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">{assignment.description || "No description"}</p>

                          <div className="flex items-center justify-between">
                            <div className="flex gap-4 text-sm">
                              <span>Max Score: {assignment.max_score ?? assignment.maxScore ?? "-"}</span>
                              <span>Submissions: {assignmentSubmissions.length}</span>
                              <span>Graded: {gradedCount}</span>
                            </div>

                            {/* optional actions */}
                              {user?.role === "teacher" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteAssignment(assignmentId)}
                                >
                                  Delete
                                </Button>
                              )}
                          </div>

                          {assignmentSubmissions.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="font-semibold mb-3">Recent Submissions</h4>
                              <div className="space-y-2">
                                {assignmentSubmissions.slice(0, 3).map((submission: any, subIdx: number) => {
                                  const normalized = {
                                    ...submission,
                                    id: String(submission._id ?? submission.id ?? submission.submission_id ?? `${assignmentId}-${subIdx}`),
                                    studentId: submission.student_id ?? submission.studentId ?? (submission.student && (submission.student._id ?? submission.student.id)) ?? null,
                                    submitted_at: submission.submitted_at ?? submission.submittedAt ?? submission.createdAt,
                                  };

                                  const studentLabel = resolveStudentLabel(submission);

                                  return (
                                    <div key={normalized.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">Student: {studentLabel}</p>
                                        <p className="text-xs text-muted-foreground">Submitted: {normalized.submitted_at ? safeFormatDate(normalized.submitted_at) : "Unknown"}</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {(normalized.grade !== null && normalized.grade !== undefined) && (
                                          <span className="text-sm font-semibold">{normalized.grade}/{assignment.max_score ?? assignment.maxScore ?? "-"}</span>
                                        )}
                                        <GradeSubmissionDialog submission={normalized} maxScore={assignment.max_score ?? assignment.maxScore} onSuccess={fetchAssignments} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
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

          {/* ATTENDANCE is intentionally static (not polled) */}
          {activeSection === "attendance" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">{t('teacher.attendanceManagement')}</h2>
                <p className="text-muted-foreground">{t('teacher.trackManageAttendance')}</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('teacher.todaysAttendance')}</CardTitle>
                  <CardDescription>{t('teacher.markAttendanceForClasses')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Select Course</label>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                          value={selectedAttendanceCourse}
                          onChange={(e) => {
                            const cid = e.target.value;
                            setSelectedAttendanceCourse(cid);
                            fetchAttendanceStudents(cid, selectedAttendanceDate);
                          }}
                        >
                          <option value="">-- Choose a Course --</option>
                          {courses.map(c => (
                            <option key={idOf(c)} value={idOf(c)}>{c.title ?? c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <input
                          type="date"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                          value={selectedAttendanceDate}
                          onChange={(e) => {
                            const d = e.target.value;
                            setSelectedAttendanceDate(d);
                            if (selectedAttendanceCourse) fetchAttendanceStudents(selectedAttendanceCourse, d);
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Topic Covered</label>
                        <input
                          type="text"
                          placeholder="e.g. Intro to Algebra"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                          value={attendanceTopic}
                          onChange={(e) => setAttendanceTopic(e.target.value)}
                        />
                      </div>
                      <Button 
                        disabled={!selectedAttendanceCourse || attendanceStudents.length === 0 || savingAttendance}
                        onClick={handleSaveAttendance}
                      >
                        {savingAttendance ? "Saving..." : "Submit Attendance"}
                      </Button>
                    </div>

                    {selectedAttendanceCourse && (
                      <div className="border rounded-lg overflow-hidden mt-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceStudents.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                  No students enrolled in this course yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              attendanceStudents.map((s) => {
                                const sid = idOf(s);
                                const currentStatus = attendanceBatch[sid] || "present";
                                return (
                                  <TableRow key={sid}>
                                    <TableCell className="font-medium">{s.fullName || s.name || "Student"}</TableCell>
                                    <TableCell>{s.email || "—"}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          size="sm" 
                                          variant={currentStatus === "present" ? "default" : "outline"}
                                          onClick={() => toggleAttendance(sid, "present")}
                                        >
                                          Present
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant={currentStatus === "absent" ? "destructive" : "outline"}
                                          onClick={() => toggleAttendance(sid, "absent")}
                                        >
                                          Absent
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* RESOURCES */}
          {activeSection === "resources" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{t('teacher.teachingResources')}</h2>
                  <p className="text-muted-foreground">{t('teacher.uploadManageResources')}</p>
                </div>
                <div className="flex gap-2">
                  {courses.length > 0 && <CreateClassDialog courses={courses} courseId={String(courses[0].id ?? courses[0]._id ?? courses[0].courseId ?? "")} onClassCreated={fetchClasses} />}
                  <Button><Upload className="h-4 w-4 mr-2" />Upload Resource</Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Video Lectures</CardTitle>
                  <CardDescription>Video content available to enrolled students</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? <p className="text-center text-muted-foreground">Loading videos...</p> : classes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No video lectures uploaded yet.</p>
                      {courses.length > 0 && <CreateClassDialog courses={courses} courseId={String(courses[0]?.id ?? courses[0]?._id ?? "")} onClassCreated={fetchClasses} />
                    }
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {classes.map((classItem) => <VideoPlayer key={String(classItem.id ?? classItem._id ?? classItem.title ?? classItem.scheduledAt)} classData={classItem} />)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Files</CardTitle>
                  <CardDescription>Documents and assets available to you</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {libraryResources.length === 0 ? (
                      <p className="text-sm text-muted-foreground col-span-full text-center py-8">No library resources available yet.</p>
                    ) : libraryResources.map((res, index) => (
                      <div key={res._id || index} className="p-4 border rounded-lg flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{res.title}</h4>
                          <p className="text-xs text-muted-foreground">{res.type || "Resource"} {res.subject ? `• ${res.subject}` : ""}</p>
                          {res.url && (
                            <a href={res.url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="link" className="px-0 h-auto text-xs">Download</Button>
                            </a>
                          )}
                        </div>
                      </div>
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
                <p className="text-muted-foreground">Updates and broadcasts from administration</p>
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
                        <CardDescription>{safeFormatDate(ann.createdAt, "PPP")}</CardDescription>
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

          {/* NOTIFICATIONS */}
          {activeSection === "notifications" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Notifications</h2>
                  <p className="text-muted-foreground">Important updates and alerts</p>
                </div>
                <Button variant="outline">Mark all as read</Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { type: "submission", message: "New assignment submission from John Doe", course: "Mathematics", time: "1 hour ago", unread: true },
                      { type: "query", message: "Student asked a question in Physics", course: "Physics", time: "3 hours ago", unread: true },
                      { type: "reminder", message: "Assignment grading deadline tomorrow", course: "Chemistry", time: "5 hours ago", unread: false },
                    ].map((notification, i) => (
                      <div key={`${notification.message}-${i}`} className={`p-4 flex gap-3 ${notification.unread ? "bg-primary/5" : ""}`}>
                        <div className={`p-2 rounded-lg h-fit ${notification.type === "submission" ? "bg-blue-500/10" : notification.type === "query" ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-medium text-sm">{notification.message}</p>
                            {notification.unread && <span className="w-2 h-2 bg-primary rounded-full" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{notification.course} • {notification.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SETTINGS */}
          {activeSection === "settings" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">{t('settings.title')}</h2>
                <p className="text-muted-foreground">{t('settings.preferences')}</p>
              </div>

              <LanguageSwitcher />

              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your teaching profile</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Full Name</label>
                      <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="Dr. John Smith" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Department</label>
                      <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="Mathematics" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Bio</label>
                      <textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="Brief description about yourself..." />
                    </div>
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* === STUDENT QUERIES PAGE (detailed teacher view) === */}
          {/* This is an additional page where teachers can see & reply to queries. */}
          {/* NOTE: We keep the Dashboard's small 'recent queries' widget above; this is a full page. */}
          {activeSection === "queries" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Student Queries</h2>
                  <p className="text-muted-foreground">All student submitted questions and teacher responses</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => fetchQueries()}>Refresh</Button>
                </div>
              </div>

              <Card>
                <CardContent>
                  <QueriesList queries={queries} onRefetch={() => fetchQueries()} />
                </CardContent>
              </Card>

            </div>
          )}
          {/* ANALYTICS */}
{activeSection === "analytics" && (
  <div className="space-y-6 animate-fade-in">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-muted-foreground">Quick insights about courses, students and submissions</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => { fetchCourses(); fetchEnrollments(); fetchAssignments(); fetchQueries(); fetchClasses(); }}>
          Refresh
        </Button>
      </div>
    </div>

    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Courses</CardTitle>
          <CardDescription>Number of courses you own</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{courses.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Students</CardTitle>
          <CardDescription>Unique enrolled students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{totalUniqueStudents}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Submissions</CardTitle>
          <CardDescription>Submitted but not graded</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">
            {submissions.filter((s: any) => s.status === "submitted" || s.grade === undefined || s.grade === null).length}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Queries</CardTitle>
          <CardDescription>Student queries awaiting response</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{(queries || []).filter((q: any) => q.status === "open" || !q.reply).length}</div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Course-wise Enrollment</CardTitle>
        <CardDescription>Students per course (best effort)</CardDescription>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="text-sm text-muted-foreground">No courses to show.</div>
        ) : (
          <div className="grid gap-2">
            {courses.map((course: any) => {
              const courseId = String(course._id ?? course.id ?? "");
              const count = courseStudentCounts[courseId] ?? (Number(course.students) || Number(course.enrolledCount) || 0);
              return (
                <div key={courseId} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{course.title ?? course.name ?? "Untitled Course"}</div>
                    <div className="text-xs text-muted-foreground">{course.description ? (String(course.description).slice(0, 80) + (String(course.description).length > 80 ? "…" : "")) : "No description"}</div>
                  </div>
                  <div className="text-sm font-semibold">{count} students</div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest submissions & queries</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold mb-2">Latest Submissions</h4>
            {submissions.slice(0, 5).length === 0 ? <div className="text-sm text-muted-foreground">No recent submissions</div> :
              submissions.slice(0, 5).map((s: any, i: number) => (
                <div key={s._id ?? s.id ?? i} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm">{resolveStudentLabel(s)}</div>
                  <div className="text-xs text-muted-foreground">{(s.submitted_at || s.createdAt) ? safeFormatDate(s.submitted_at ?? s.createdAt) : ""}</div>
                </div>
              ))
            }
          </div>

          <div>
            <h4 className="font-semibold mb-2">Latest Queries</h4>
            {(queries || []).slice(0, 5).length === 0 ? <div className="text-sm text-muted-foreground">No recent queries</div> :
              (queries || []).slice(0, 5).map((q: any, i: number) => (
                <div key={q._id ?? q.id ?? i} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm">{q.studentName ?? String(q.student ?? "").slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{safeFormatDate(q.createdAt ?? q.created)}</div>
                </div>
              ))
            }
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)}

          {/* The app uses "queries" as the menu item label — ensure menu id matches above */}
          {/* If you prefer the menu item to open the full page rather than the small widget, update the menu item id to "student-queries" */}
        </div>
      </main>
    </div>
  );
}
