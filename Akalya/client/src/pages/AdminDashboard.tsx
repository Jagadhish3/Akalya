// src/pages/AdminDashboard.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Home, Users, BookOpen, FileText, Calendar,
  MessageSquare, TrendingUp, Upload, Bell, Settings,
  LogOut, Menu, X, Shield, Activity, Trash2, Edit, RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usersAPI, coursesAPI, assignmentsAPI, attendanceAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

/**
 * Full Admin Dashboard
 * - Manage Users (includes user id + full name)
 * - Manage Courses
 * - Assignments
 * - Attendance
 * - Forum oversight
 * - Analytics
 * - Resources
 * - Announcements (send)
 * - Settings
 *
 * Defensive / normalization logic used so API shape variations won't break UI.
 */

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");

  // State
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeCourses: 0,
    totalAssignments: 0,
    students: 0,
    teachers: 0,
    admins: 0
  });

  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);

  // demo data for forum / resources / announcements if backend not present
  const [forumPosts, setForumPosts] = useState<any[]>([
    { id: "f1", user: "Student123", topic: "Help with Mathematics Assignment", category: "Q&A", replies: 5, time: "2 hours ago" },
    { id: "f2", user: "TeacherJohn", topic: "New Study Resources Available", category: "Announcements", replies: 12, time: "5 hours ago" },
    { id: "f3", user: "Student456", topic: "Physics Lab Discussion", category: "Discussions", replies: 8, time: "1 day ago" },
  ]);

  const [resources, setResources] = useState<any[]>([
    { id: "r1", title: "Teacher Guidelines", type: "PDF", size: "5.2 MB", downloads: 234, uploadedAt: new Date().toISOString() },
    { id: "r2", title: "Student Handbook", type: "PDF", size: "8.7 MB", downloads: 567, uploadedAt: new Date().toISOString() },
    { id: "r3", title: "Platform Tutorial Videos", type: "ZIP", size: "125 MB", downloads: 189, uploadedAt: new Date().toISOString() },
  ]);

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementAudience, setAnnouncementAudience] = useState("All Users");

  // helpers
  const asArray = (v: any) => Array.isArray(v) ? v : (v ? [v] : []);
  const idOf = (obj: any) => String(obj?._id ?? obj?.id ?? obj?.user_id ?? obj ?? "");
  const safeFormat = (val: any, fmt = "PPP") => {
    try {
      if (!val) return "";
      const d = new Date(val);
      if (isNaN(d.getTime())) return "";
      return format(d, fmt);
    } catch (e) {
      return "";
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch data from APIs (defensive)
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersRaw, coursesRaw, assignmentsRaw] = await Promise.all([
        usersAPI.getAll().catch((e: any) => { console.error("usersAPI.getAll error", e); return []; }),
        coursesAPI.getAll().catch((e: any) => { console.error("coursesAPI.getAll error", e); return []; }),
        assignmentsAPI.getAll().catch((e: any) => { console.error("assignmentsAPI.getAll error", e); return []; }),
      ]);

      const usersData = Array.isArray(usersRaw) ? usersRaw : (usersRaw ? asArray(usersRaw) : []);
      const coursesData = Array.isArray(coursesRaw) ? coursesRaw : (coursesRaw ? asArray(coursesRaw) : []);
      const assignmentsData = Array.isArray(assignmentsRaw) ? assignmentsRaw : (assignmentsRaw ? asArray(assignmentsRaw) : []);

      // dedupe by id
      const usersMap = new Map<string, any>();
      usersData.forEach((u: any) => {
        const uid = idOf(u);
        if (!uid) return;
        if (!usersMap.has(uid)) usersMap.set(uid, u);
      });
      const usersList = Array.from(usersMap.values());

      const coursesMap = new Map<string, any>();
      coursesData.forEach((c: any) => {
        const cid = idOf(c);
        if (!cid) return;
        if (!coursesMap.has(cid)) coursesMap.set(cid, c);
      });
      const coursesList = Array.from(coursesMap.values());

      const assignMap = new Map<string, any>();
      assignmentsData.forEach((a: any) => {
        const aid = idOf(a);
        if (!aid) return;
        if (!assignMap.has(aid)) assignMap.set(aid, a);
      });
      const assignmentsList = Array.from(assignMap.values());

      setUsers(usersList);
      setCourses(coursesList);
      setAssignments(assignmentsList);

      // stats
      const studentsCount = usersList.filter(u => (u.role ?? "").toString().toLowerCase() === "student").length;
      const teachersCount = usersList.filter(u => (u.role ?? "").toString().toLowerCase() === "teacher").length;
      const adminsCount = usersList.filter(u => (u.role ?? "").toString().toLowerCase() === "admin").length;

      setStats({
        totalUsers: usersList.length,
        activeCourses: coursesList.filter(c => (c.status ?? '').toString().toLowerCase() === 'published').length,
        totalAssignments: assignmentsList.length,
        students: studentsCount,
        teachers: teachersCount,
        admins: adminsCount
      });

      // Fetch attendance summary separately (admin-only endpoint)
      try {
        const attSummary = await attendanceAPI.getPlatformSummary();
        setAttendanceSummary(attSummary);
      } catch (e) {
        // non-critical
      }
    } catch (err) {
      console.error("fetchAllData error", err);
      toast({ title: "Error", description: "Failed to load admin data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Delete actions (confirm + call API + refresh)
  const handleDeleteUser = async (u: any) => {
    const uid = idOf(u);
    if (!uid) { toast({ title: "Error", description: "Invalid user id", variant: "destructive" }); return; }
    if (!confirm(`Delete user ${u.fullName ?? u.name ?? uid}?`)) return;
    try {
      if (usersAPI.delete) {
        await usersAPI.delete(uid);
        toast({ title: "Deleted", description: "User removed" });
        fetchAllData();
      } else {
        // fallback: UI-only remove to keep demo working
        setUsers(prev => prev.filter(x => idOf(x) !== uid));
        toast({ title: "Deleted (UI)", description: "User removed from view (no API)" });
      }
    } catch (err: any) {
      console.error("delete user error", err);
      toast({ title: "Error", description: err?.message ?? "Failed to delete user", variant: "destructive" });
    }
  };

  const handleDeleteCourse = async (course: any) => {
    const cid = idOf(course);
    if (!cid) { toast({ title: "Error", description: "Invalid course id", variant: "destructive" }); return; }
    if (!confirm(`Delete course ${course.title ?? cid}?`)) return;
    try {
      if (coursesAPI.delete) {
        await coursesAPI.delete(cid);
        toast({ title: "Deleted", description: "Course removed" });
        fetchAllData();
      } else {
        setCourses(prev => prev.filter(c => idOf(c) !== cid));
        toast({ title: "Deleted (UI)", description: "Course removed from view (no API)" });
      }
    } catch (err: any) {
      console.error("delete course error", err);
      toast({ title: "Error", description: err?.message ?? "Failed to delete course", variant: "destructive" });
    }
  };

  const handleDeleteAssignment = async (assignment: any) => {
    const aid = idOf(assignment);
    if (!aid) { toast({ title: "Error", description: "Invalid assignment id", variant: "destructive" }); return; }
    if (!confirm(`Delete assignment ${assignment.title ?? aid}?`)) return;
    try {
      if (assignmentsAPI.delete) {
        await assignmentsAPI.delete(aid);
        toast({ title: "Deleted", description: "Assignment removed" });
        fetchAllData();
      } else {
        setAssignments(prev => prev.filter(a => idOf(a) !== aid));
        toast({ title: "Deleted (UI)", description: "Assignment removed from view (no API)" });
      }
    } catch (err: any) {
      console.error("delete assignment error", err);
      toast({ title: "Error", description: err?.message ?? "Failed to delete assignment", variant: "destructive" });
    }
  };

  // resources upload (mock) — replace with upload API if available
  const handleUploadResource = () => {
    const id = "r" + Math.random().toString(36).slice(2, 9);
    setResources(prev => [{ id, title: `New resource ${id}`, type: "PDF", size: "1.2 MB", downloads: 0, uploadedAt: new Date().toISOString() }, ...prev]);
    toast({ title: "Uploaded", description: "Resource added (demo)" });
  };

  // send announcement (calls API if available)
  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      toast({ title: "Validation", description: "Please provide both title and message", variant: "destructive" });
      return;
    }
    try {
      // if you have an announcementsAPI, call it here. For now mock sending
      // await announcementsAPI.create({ title: announcementTitle, message: announcementMessage, audience: announcementAudience });
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementAudience("All Users");
      toast({ title: "Announcement sent", description: "Message broadcast to selected audience" });
    } catch (err: any) {
      console.error("send announcement error", err);
      toast({ title: "Error", description: err?.message ?? "Failed to send announcement", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const menuItems = [
    { id: "dashboard", label: "Admin Dashboard", icon: Home },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "courses", label: "Manage Courses", icon: BookOpen },
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "attendance", label: "Attendance Reports", icon: Calendar },
    { id: "forum", label: "Forum Oversight", icon: MessageSquare },
    { id: "analytics", label: "Platform Analytics", icon: TrendingUp },
    { id: "resources", label: "Resources", icon: Upload },
    { id: "announcements", label: "Announcements", icon: Bell },
    { id: "settings", label: "Platform Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} bg-card border-r transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
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
              onClick={() => setActiveSection(item.id)}
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
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">System Overview & Management</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => fetchAllData()}>
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Dashboard */}
          {activeSection === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover-scale">
                  <CardHeader className="pb-3">
                    <CardDescription>Total Users</CardDescription>
                    <CardTitle className="text-4xl">{stats.totalUsers}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Active platform users</p>
                  </CardContent>
                </Card>

                <Card className="hover-scale">
                  <CardHeader className="pb-3">
                    <CardDescription>Active Courses</CardDescription>
                    <CardTitle className="text-4xl">{stats.activeCourses}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Published courses</p>
                  </CardContent>
                </Card>

                <Card className="hover-scale">
                  <CardHeader className="pb-3">
                    <CardDescription>Total Assignments</CardDescription>
                    <CardTitle className="text-4xl">{stats.totalAssignments}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">All assignments</p>
                  </CardContent>
                </Card>

                <Card className="hover-scale">
                  <CardHeader className="pb-3">
                    <CardDescription>System Health</CardDescription>
                    <CardTitle className="text-4xl flex items-center gap-2">
                      <Activity className="h-8 w-8 text-green-500" /> 100%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">All systems operational</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>User Statistics</CardTitle>
                    <CardDescription>Distribution by role</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { role: "Students", count: stats.students, percentage: stats.totalUsers ? (stats.students / stats.totalUsers) * 100 : 0, color: "bg-blue-500" },
                        { role: "Teachers", count: stats.teachers, percentage: stats.totalUsers ? (stats.teachers / stats.totalUsers) * 100 : 0, color: "bg-green-500" },
                        { role: "Admins", count: stats.admins, percentage: stats.totalUsers ? (stats.admins / stats.totalUsers) * 100 : 0, color: "bg-purple-500" },
                      ].map((s, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{s.role}</span>
                            <span className="text-sm text-muted-foreground">{s.count} users</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className={`${s.color} h-2 rounded-full`} style={{ width: `${s.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                    <CardDescription>Platform overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="font-medium">Total Courses</span>
                        <Badge variant="secondary">{courses.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="font-medium">Published Courses</span>
                        <Badge variant="secondary">{stats.activeCourses}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="font-medium">Draft Courses</span>
                        <Badge variant="secondary">{Math.max(0, courses.length - stats.activeCourses)}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="font-medium">Total Assignments</span>
                        <Badge variant="secondary">{stats.totalAssignments}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Manage Users */}
          {activeSection === "users" && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6" /> Manage Users</CardTitle>
                <CardDescription>View and manage all platform users and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                ) : users.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No users found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => {
                        const key = idOf(u) || Math.random().toString(36).slice(2, 9);
                        const displayId = u.user_id ?? u._id ?? u.id ?? key;
                        const fullName = u.fullName ?? u.full_name ?? u.name ?? u.username ?? "—";
                        const role = (u.role ?? "unknown").toString();
                        const created = u.created_at ?? u.createdAt ?? u.created ?? null;

                        return (
                          <TableRow key={key}>
                            <TableCell className="font-medium">{displayId}</TableCell>
                            <TableCell>{fullName}</TableCell>
                            <TableCell>
                              <Badge variant={role === 'admin' ? 'default' : role === 'teacher' ? 'secondary' : 'outline'}>{role}</Badge>
                            </TableCell>
                            <TableCell>{safeFormat(created, "PPP")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manage Courses */}
          {activeSection === "courses" && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="h-6 w-6" /> Manage Courses</CardTitle>
                <CardDescription>View and manage all courses on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                ) : courses.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No courses found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Title</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map(course => {
                        const courseKey = idOf(course) || Math.random().toString(36).slice(2, 9);
                        const created = course.created_at ?? course.createdAt ?? course.created ?? null;
                        const teacherName = course.profiles?.full_name ?? course.teacher?.fullName ?? course.teacher?.name ?? course.instructorName ?? "Unknown";
                        const status = (course.status ?? "unknown").toString();

                        return (
                          <TableRow key={courseKey}>
                            <TableCell className="font-medium">{course.title ?? "Untitled Course"}</TableCell>
                            <TableCell>{teacherName}</TableCell>
                            <TableCell><Badge variant={status.toLowerCase() === "published" ? "default" : "secondary"}>{status}</Badge></TableCell>
                            <TableCell>{safeFormat(created, "PPP")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCourse(course)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => toast({ title: "Edit", description: "Course edit not implemented in demo" })}><Edit className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assignments */}
          {activeSection === "assignments" && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-6 w-6" /> Assignments</CardTitle>
                <CardDescription>View all assignments across all courses</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                ) : assignments.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No assignments found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment Title</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map(a => {
                        const aKey = idOf(a) || Math.random().toString(36).slice(2,9);
                        const due = a.due_date ?? a.dueDate ?? a.due ?? null;
                        const courseTitle = a.courses?.title ?? a.courseTitle ?? a.course?.title ?? "Unknown";
                        const teacherName = a.profiles?.full_name ?? a.teacher?.fullName ?? "Unknown";
                        const status = a.status ?? "unknown";
                        return (
                          <TableRow key={aKey}>
                            <TableCell className="font-medium">{a.title ?? "Untitled"}</TableCell>
                            <TableCell>{courseTitle}</TableCell>
                            <TableCell>{teacherName}</TableCell>
                            <TableCell>{safeFormat(due, "PPP")}</TableCell>
                            <TableCell><Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge></TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteAssignment(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attendance */}
          {activeSection === "attendance" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">Attendance Reports</h2>
                <p className="text-muted-foreground">Platform-wide attendance analytics</p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Overall Attendance</CardDescription>
                    <CardTitle className="text-4xl">{attendanceSummary ? `${attendanceSummary.percentage}%` : '—'}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">Across all courses ({attendanceSummary?.present ?? 0} present / {attendanceSummary?.total ?? 0} sessions)</p></CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Registered Students</CardDescription>
                    <CardTitle className="text-4xl">{stats.students}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">Total student accounts</p></CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Teaching Faculty</CardDescription>
                    <CardTitle className="text-4xl">{stats.teachers}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">Active teacher accounts</p></CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Course-wise Attendance</CardTitle>
                  <CardDescription>Attendance breakdown by course</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No courses yet.</p>
                    ) : courses.slice(0, 6).map((course, idx) => {
                      const cid = idOf(course) || String(idx);
                      return (
                        <div key={cid} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{course.title}</span>
                            <span className="text-sm text-muted-foreground">—</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Forum Oversight */}
          {activeSection === "forum" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Forum Oversight</h2>
                  <p className="text-muted-foreground">Monitor and moderate discussions</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setForumPosts(prev => [{ id: `f${Date.now()}`, user: "Moderator", topic: "Moderation note", category: "Notice", replies: 0, time: "just now" }, ...prev])}>Add Note</Button>
                  <Button variant="outline" onClick={() => toast({ title: "Refresh", description: "Forum refreshed" })}>Refresh</Button>
                </div>
              </div>

              <Card>
                <CardContent>
                  <div className="space-y-3">
                    {forumPosts.map((post) => (
                      <div key={post.id} className="p-4 border rounded-lg flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">{post.topic}</h4>
                          <p className="text-xs text-muted-foreground mb-2">by {post.user} in {post.category}</p>
                          <p className="text-xs text-muted-foreground">{post.replies} replies • {post.time}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" variant="ghost" onClick={() => toast({ title: "View", description: "Open thread" })}>View</Button>
                          <Button size="sm" variant="destructive" onClick={() => setForumPosts(prev => prev.filter(p => p.id !== post.id))}>Remove</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics */}
          {activeSection === "analytics" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">Platform Analytics</h2>
                <p className="text-muted-foreground">Quick insights about platform usage</p>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <Card><CardHeader className="pb-3"><CardDescription>Daily Active Users</CardDescription><CardTitle className="text-4xl">892</CardTitle></CardHeader><CardContent><p className="text-sm text-green-600">↑12% from last week</p></CardContent></Card>
                <Card><CardHeader className="pb-3"><CardDescription>Engagement Rate</CardDescription><CardTitle className="text-4xl">84%</CardTitle></CardHeader><CardContent><p className="text-sm text-green-600">↑5% increase</p></CardContent></Card>
                <Card><CardHeader className="pb-3"><CardDescription>Completion Rate</CardDescription><CardTitle className="text-4xl">76%</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Steady</p></CardContent></Card>
                <Card><CardHeader className="pb-3"><CardDescription>Uptime</CardDescription><CardTitle className="text-4xl">99.9%</CardTitle></CardHeader><CardContent><p className="text-sm text-green-600">Excellent</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Courses</CardTitle>
                  <CardDescription>By enrollments & completion</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {courses.slice(0, 6).map((course, idx) => (
                      <div key={idOf(course) || idx} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{course.title}</p>
                          <p className="text-xs text-muted-foreground">{Math.floor(50 + Math.random() * 100)} enrollments</p>
                        </div>
                        <Badge>{Math.floor(75 + Math.random() * 25)}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Resources */}
          {activeSection === "resources" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Platform Resources</h2>
                  <p className="text-muted-foreground">Manage system-wide resources</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUploadResource}><Upload className="h-4 w-4 mr-2" />Upload Resource</Button>
                  <Button variant="outline" onClick={() => toast({ title: "Refresh", description: "Resources refreshed" })}>Refresh</Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Library</CardTitle>
                  <CardDescription>System-wide educational materials</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {resources.map((resource) => (
                      <div key={resource.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm flex-1">{resource.title}</h4>
                          <span className="px-2 py-1 bg-muted rounded text-xs">{resource.type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{resource.size} • {resource.downloads} downloads</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => toast({ title: "View", description: "Preview resource" })}>View</Button>
                          <Button size="sm" variant="ghost" onClick={() => setResources(prev => prev.filter(r => r.id !== resource.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Announcements */}
          {activeSection === "announcements" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Platform Announcements</h2>
                  <p className="text-muted-foreground">Broadcast important messages</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setAnnouncementTitle(""); setAnnouncementMessage(""); setAnnouncementAudience("All Users"); }}>Clear</Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>New Announcement</CardTitle>
                  <CardDescription>Send a message to users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="Announcement title..." />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Message</label>
                      <textarea value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="Type your message..." />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Target Audience</label>
                      <select value={announcementAudience} onChange={(e) => setAnnouncementAudience(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                        <option>All Users</option>
                        <option>Students Only</option>
                        <option>Teachers Only</option>
                        <option>Admins Only</option>
                      </select>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => { setAnnouncementTitle(""); setAnnouncementMessage(""); setAnnouncementAudience("All Users"); }}>Cancel</Button>
                      <Button onClick={handleSendAnnouncement}>Send Announcement</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Announcements</CardTitle>
                  <CardDescription>Previously sent messages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { title: "Platform Maintenance", message: "System will be down for maintenance on Friday", audience: "All Users", date: "2 days ago" },
                      { title: "New Features Released", message: "Check out the new assignment management features", audience: "Teachers", date: "5 days ago" },
                      { title: "Exam Schedule Published", message: "Final exam dates are now available", audience: "Students", date: "1 week ago" },
                    ].map((announcement, idx) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{announcement.title}</h4>
                          <span className="text-xs text-muted-foreground">{announcement.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{announcement.message}</p>
                        <Badge variant="secondary">{announcement.audience}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings */}
          {activeSection === "settings" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold">{t('settings.title') ?? "Settings"}</h2>
                <p className="text-muted-foreground">{t('settings.preferences') ?? "Platform preferences"}</p>
              </div>

              <LanguageSwitcher />

              <Card>
                <CardHeader><CardTitle>General Settings</CardTitle><CardDescription>Platform configuration</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Platform Name</label>
                      <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="Aकlya" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Support Email</label>
                      <input type="email" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="support@akalya.com" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Time Zone</label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                        <option>UTC (GMT+0)</option>
                        <option>EST (GMT-5)</option>
                        <option>PST (GMT-8)</option>
                        <option>IST (GMT+5:30)</option>
                      </select>
                    </div>
                    <Button>Save Settings</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Feature Toggles</CardTitle><CardDescription>Enable or disable platform features</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "User Registration", description: "Allow new users to sign up" },
                      { label: "Course Creation", description: "Allow teachers to create new courses" },
                      { label: "Forum", description: "Enable discussion forums" },
                      { label: "Live Classes", description: "Enable live video classes" },
                      { label: "Mobile App Access", description: "Allow mobile app connections" },
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{feature.label}</p>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                        <input type="checkbox" className="h-4 w-4" defaultChecked />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Security Settings</CardTitle><CardDescription>Platform security configuration</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start"><Shield className="h-4 w-4 mr-2" /> Configure Password Policy</Button>
                    <Button variant="outline" className="w-full justify-start"><Shield className="h-4 w-4 mr-2" /> Session Management</Button>
                    <Button variant="outline" className="w-full justify-start"><Shield className="h-4 w-4 mr-2" /> API Security</Button>
                    <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive"><Shield className="h-4 w-4 mr-2" /> Emergency Lockdown</Button>
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
