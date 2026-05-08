import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Moon, Sun, Menu, X, Home, Info, Mail } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/about", label: "About", icon: Info },
  { to: "/contact", label: "Contact", icon: Mail },
];

export function LandingNav() {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Akalya
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative group gap-2 px-3 py-1.5 hover:bg-primary/10 rounded-full transition-all duration-300"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="relative z-10 font-medium group-hover:text-primary transition-colors">{label}</span>
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">
                Register
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-2 px-4 space-y-1 animate-in slide-in-from-top duration-300">
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl hover:bg-primary/10 group">
                  <Icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <span className="font-medium group-hover:text-primary transition-colors">{label}</span>
                </Button>
              </Link>
            ))}
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Login
              </Button>
            </Link>
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button className="w-full justify-start">
                Register
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
