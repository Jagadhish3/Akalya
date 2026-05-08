import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  LogOut,
  Menu,
  X,
  Award,
  FileQuestion,
  Briefcase,
  Map,
  BookOpen,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  User,
  Bell,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

const careerGatewayItems = [
  { to: "scholarships", label: "Scholarships", icon: Award },
  { to: "entrance-exams", label: "Entrance Exams", icon: FileQuestion },
  { to: "certifications", label: "Certifications", icon: GraduationCap },
  { to: "jobs-after-10th", label: "Jobs After 10th", icon: Briefcase },
  { to: "jobs-after-12th", label: "Jobs After 12th", icon: Briefcase },
  { to: "practice", label: "Practice (6–12)", icon: BookOpen },
  { to: "test-series", label: "Test Series", icon: ClipboardList },
  { to: "career-roadmap", label: "Career Roadmap", icon: Map },
  { to: "preparation-resources", label: "Preparation Resources", icon: BookOpen },
];

export function StudentDashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [careerGatewayOpen, setCareerGatewayOpen] = useState(
    location.pathname.includes("career-gateway")
  );

  // Keep Career Gateway expanded when on any of its sub-routes
  useEffect(() => {
    if (location.pathname.includes("career-gateway")) setCareerGatewayOpen(true);
  }, [location.pathname]);

  const basePath = "/dashboard/student";
  const isCareerGateway = location.pathname.startsWith(`${basePath}/career-gateway`);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } border-r border-border bg-card flex flex-col transition-all duration-200 shrink-0`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && (
            <span className="font-semibold text-primary truncate">Student Dashboard</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <Link to={basePath}>
            <Button
              variant={location.pathname === basePath ? "secondary" : "ghost"}
              className={`w-full justify-start gap-2 ${!sidebarOpen ? "px-2" : "px-4"}`}
            >
              <Home className="h-4 w-4 shrink-0" />
              {sidebarOpen && "Dashboard"}
            </Button>
          </Link>

          {/* Career Gateway section */}
          <div className="mt-2">
            <Button
              variant={isCareerGateway ? "secondary" : "ghost"}
              className={`w-full justify-start gap-2 ${!sidebarOpen ? "px-2" : "px-4"}`}
              onClick={() => setCareerGatewayOpen((o) => !o)}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">Career Gateway</span>
                  {careerGatewayOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </Button>
            {careerGatewayOpen && sidebarOpen && (
              <div className="pl-4 mt-1 space-y-0.5 overflow-hidden animate-in slide-in-from-top-1 duration-200">
                {careerGatewayItems.map(({ to, label, icon: Icon }) => {
                  const path = `${basePath}/career-gateway/${to}`;
                  const active = location.pathname === path || location.pathname.startsWith(path + "/");
                  return (
                    <Link key={to} to={path}>
                      <Button
                        variant={active ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-2"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Locker - separate link */}
          <Link to={`${basePath}/career-gateway/locker`} className="mt-2 block">
            <Button
              variant={location.pathname === `${basePath}/career-gateway/locker` ? "secondary" : "ghost"}
              className={`w-full justify-start gap-2 ${!sidebarOpen ? "px-2" : "px-4"}`}
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              {sidebarOpen && "My Locker"}
            </Button>
          </Link>

          {/* Profile - link to settings section on dashboard */}
          <Link to={`${basePath}?section=settings`} className="mt-1 block">
            <Button variant={location.search.includes("section=settings") ? "secondary" : "ghost"} className={`w-full justify-start gap-2 ${!sidebarOpen ? "px-2" : "px-4"}`}>
              <User className="h-4 w-4 shrink-0" />
              {sidebarOpen && "Profile"}
            </Button>
          </Link>

          {/* Notifications */}
          <Link to={`${basePath}?section=notifications`} className="mt-1 block">
            <Button variant={location.search.includes("section=notifications") ? "secondary" : "ghost"} className={`w-full justify-start gap-2 ${!sidebarOpen ? "px-2" : "px-4"}`}>
              <Bell className="h-4 w-4 shrink-0" />
              {sidebarOpen && "Notifications"}
            </Button>
          </Link>
        </div>
        <div className="p-2 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && "Logout"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card/50 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Welcome,</span>
            <span className="font-medium">{user?.fullName || user?.email || "Student"}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
