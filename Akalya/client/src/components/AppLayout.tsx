import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  Home,
  Award,
  FileQuestion,
  Briefcase,
  Map,
  BookOpen,
  ClipboardList,
  FolderOpen,
  Info,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo, useState } from "react";
import { FloatingChatbot } from "./FloatingChatbot";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, getUserRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = useMemo(() => {
    const studentBase = "/dashboard/student/career-gateway";
    const isStudent = user?.role === "student";
    return [
      { to: "/", label: t('nav.home'), icon: Home },
      { to: isStudent ? `${studentBase}/scholarships` : "/auth", label: t('nav.scholarships'), icon: Award },
      { to: isStudent ? `${studentBase}/entrance-exams` : "/auth", label: t('nav.entranceExams'), icon: FileQuestion },
      { to: isStudent ? `${studentBase}/jobs-after-12th` : "/auth", label: t('nav.jobs'), icon: Briefcase },
      { to: isStudent ? `${studentBase}/career-roadmap` : "/auth", label: t('nav.roadmap'), icon: Map },
      { to: isStudent ? `${studentBase}/practice` : "/auth", label: t('nav.practice'), icon: BookOpen },
      { to: isStudent ? `${studentBase}/test-series` : "/auth", label: t('nav.testSeries'), icon: ClipboardList },
      { to: isStudent ? `${studentBase}/locker` : "/auth", label: t('nav.locker'), icon: FolderOpen },
      { to: "/about", label: t('nav.about'), icon: Info },
    ];
  }, [user?.role]);

  const handleDashboard = async () => {
    if (user) {
      const role = await getUserRole();
      if (role) navigate(`/dashboard/${role}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link to="/" className="flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Akalya
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to}>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              {user ? (
                <>
                  <Button size="sm" onClick={handleDashboard}>
                    {t('nav.dashboard')}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="gap-1.5">
                    <LogIn className="h-4 w-4" />
                    {t('nav.login')}
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-background py-2 px-4 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </nav>
      <main>{children}</main>
      {user?.role === "student" && <FloatingChatbot />}
    </div>
  );
}
