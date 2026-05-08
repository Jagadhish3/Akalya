import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Video,
  Award,
  FileQuestion,
  BookOpen,
  ClipboardList,
  Users,
  FolderOpen,
  ArrowRight,
  Sparkles,
  UserPlus,
  LogIn,
  Trophy,
  CheckCircle2,
  Globe,
} from "lucide-react";
import heroImage from "@/assets/hero-education.jpg";
import FeatureShowcase from "@/components/FeatureShowcase";
import { LandingNav } from "@/components/LandingNav";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, getUserRole } = useAuth();
  const navigate = useNavigate();

  const handleFeatureClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    getUserRole?.()
      .then((r) => {
        if (r === "student") navigate("/dashboard/student/career-gateway");
        else navigate("/auth");
      })
      .catch(() => navigate("/auth"));
  };

  const features = [
    { icon: Award, title: "Explore Scholarships", description: "Discover merit and need-based scholarships with eligibility and deadline filters. Access from your dashboard after login." },
    { icon: FileQuestion, title: "Prepare for Entrance Exams", description: "National and state exam details: JEE, NEET, CUET, CLAT and state CETs. Syllabus, dates and official links." },
    { icon: Users, title: "Discover Career Opportunities", description: "Jobs after 10th and 12th — government and private. Eligibility, salary ranges and application links." },
    { icon: BookOpen, title: "Practice & Mock Tests", description: "MCQ practice for classes 6–12 and full-length test series with timer and score analysis. Available in Career Gateway." },
    { icon: FolderOpen, title: "Digital Certificate Locker", description: "Store and manage your certificates securely. Upload, rename and download from your student dashboard." },
    { icon: Video, title: "Live & Recorded Classes", description: "Attend live sessions or access recorded lectures with subtitles. Enrol in courses from your dashboard." },
  ];

  const steps = [
    { number: "01", title: "Register", description: "Create your account as a Student, Teacher or Admin in seconds.", icon: UserPlus },
    { number: "02", title: "Log in", description: "Access your dashboard and the Career Gateway for scholarships, exams and jobs.", icon: LogIn },
    { number: "03", title: "Learn & Grow", description: "Enrol in courses, attempt practice tests and plan your career with our tools.", icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-in fade-in slide-in-from-left duration-1000">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium animate-bounce-subtle">
                <Sparkles className="h-4 w-4" />
                Rural Education Platform
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold leading-tight">
                Empowering Rural Education through{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-text-gradient">
                  Smart Learning
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Quality learning, scholarships, entrance exams and career guidance — in one place for rural students.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="group relative overflow-hidden animate-pulse-glow" onClick={() => navigate("/auth")}>
                  <span className="relative z-10 flex items-center">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
                <Link to="/about">
                  <Button size="lg" variant="outline" className="hover:bg-muted transition-colors">About Us</Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-medium">Free Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-medium">Multi-language</span>
                </div>
              </div>
            </div>
            <div className="relative animate-in fade-in zoom-in duration-1000 delay-200">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-2xl animate-pulse" />
              <img
                src={heroImage}
                alt="Students learning"
                className="relative rounded-2xl shadow-2xl w-full object-cover aspect-[4/3] animate-float"
              />
            </div>
          </div>
        </div>
      </section>

      <FeatureShowcase />

      {/* Feature highlight cards — click redirects to Login if not authenticated */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">What we offer</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Log in to access the Career Gateway: scholarships, exams, jobs, practice tests and more.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group cursor-pointer border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
                onClick={handleFeatureClick}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="relative z-10">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <feature.icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">How it works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simple steps to start your journey.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted hidden md:block -translate-y-1/2 -z-10" />
            {steps.map((step, index) => (
              <div key={index} className="group text-center space-y-4 relative bg-background px-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-2xl font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                  <step.icon className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-primary uppercase tracking-widest">{step.number}</div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary animate-gradient-slow" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="container mx-auto px-4 text-center text-white relative z-10">
          <h2 className="text-3xl sm:text-5xl font-bold mb-6 animate-pulse">Ready to start your journey?</h2>
          <p className="mb-10 text-xl opacity-90 max-w-2xl mx-auto">
            Join thousands of rural students who are already shaping their future with Akalya.
          </p>
          <Link to="/auth">
            <Button size="xl" variant="secondary" className="gap-3 group px-10 py-8 text-lg hover:scale-105 transition-transform shadow-xl">
              Create Your Account Now
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 py-10 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <span className="text-lg font-bold text-primary">Akalya</span>
              <p className="text-muted-foreground mt-2 text-sm">
                Rural Student Empowerment — learning, scholarships and career guidance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Links</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link to="/" className="hover:text-primary">Home</Link></li>
                <li><Link to="/about" className="hover:text-primary">About</Link></li>
                <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Account</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link to="/auth" className="hover:text-primary">Login</Link></li>
                <li><Link to="/auth" className="hover:text-primary">Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link to="/about" className="hover:text-primary">Privacy & Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground text-sm">
            &copy; 2025 Akalya. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
