import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { RoleSelectionDialog } from "@/components/RoleSelectionDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, User, BookOpen, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signUp, signIn, signInWithGoogle, loading, getUserRole, refreshCurrentUser} = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState<string>("student");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  // Check if user needs to select role (OAuth flow)
  useEffect(() => {
    const checkOAuthUser = async () => {
      const isOAuth = searchParams.get('oauth');
      if (user && !loading && isOAuth) {
        const userRole = await getUserRole();
        if (!userRole) {
          setShowRoleDialog(true);
        } else {
          navigate(`/dashboard/${userRole}`);
        }
      }
    };
    checkOAuthUser();
  }, [user, loading, searchParams, navigate, getUserRole]);

  // Redirect based on role if already logged in
  useEffect(() => {
    const redirectToRoleDashboard = async () => {
      if (user && !loading && !searchParams.get('oauth')) {
        // Prefer role from user object if present
        const userRole = user.role ?? (await getUserRole());
        if (userRole) {
          navigate(`/dashboard/${userRole}`);
        } else {
          navigate("/");
        }
      }
    };
    redirectToRoleDashboard();
  }, [user, loading, navigate, getUserRole, searchParams]);

  const roleIcons = {
    student: User,
    teacher: BookOpen,
    admin: Shield,
  };

  const RoleIcon = roleIcons[role as keyof typeof roleIcons];

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      emailSchema.parse(email);

      // Show popup if password is shorter than 6 characters
      if (password.length < 6) {
        toast({
          title: "Password Too Short",
          description: "Password length should be more than 6 characters.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      passwordSchema.parse(password);

      const result = await signIn(email, password);
      if (!result.error) {
        // signIn already refreshed user; redirect using user state
        // small delay to ensure state updated
        await new Promise(resolve => setTimeout(resolve, 200));
        const userRole = (result as any).user?.role ?? (await getUserRole());
        if (userRole) {
          navigate(`/dashboard/${userRole}`);
        } else {
          setShowRoleDialog(true);
        }
      }
    } catch (error: any) {
      console.error("Validation error:", error.message);
      toast({
        title: "Validation Error",
        description: error.message || "Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm-password") as string;
    const fullName = formData.get("name") as string;

    try {
      emailSchema.parse(email);

      // Show popup if password is shorter than 6 characters
      if (password.length < 6) {
        toast({
          title: "Password Too Short",
          description: "Password length should be more than 6 characters.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      passwordSchema.parse(password);
      
      if (password !== confirmPassword) {
        toast({
          title: "Passwords Don't Match",
          description: "The passwords you entered do not match. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const result = await signUp(email, password, fullName, role as 'student' | 'teacher' | 'admin');
      
      if (!result.error) {
        // Small delay to ensure session is established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Navigate to the appropriate dashboard
        navigate(`/dashboard/${role}`);
      }
    } catch (error: any) {
      console.error("Validation error:", error.message);
      toast({
        title: "Validation Error",
        description: error.message || "Please check your details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    await signInWithGoogle();
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleRoleSelected = async (selectedRole: string) => {
    setShowRoleDialog(false);
    // Small delay to ensure role is saved
    await new Promise(resolve => setTimeout(resolve, 500));
    navigate(`/dashboard/${selectedRole}`);
  };

  return (
    <>
      <RoleSelectionDialog 
        open={showRoleDialog} 
        onRoleSelected={handleRoleSelected}
      />
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block text-white space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-12 w-12" />
            <span className="text-4xl font-bold">Aकlya</span>
          </div>
          <h2 className="text-3xl font-bold">Your Journey to Smarter Learning Begins Here</h2>
          <p className="text-lg opacity-90">
            Join thousands of students, teachers, and educators transforming education through 
            AI-powered learning and accessible technology.
          </p>
          <div className="space-y-4 pt-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                ✓
              </div>
              <span>Access courses anytime, anywhere</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                ✓
              </div>
              <span>AI-powered personalized learning</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                ✓
              </div>
              <span>Multilingual support for rural students</span>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <Card className="w-full animate-scale-in shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome to Aकlya</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-role">I am a</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger id="signin-role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Student</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="teacher">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>Teacher</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input 
                      id="signin-email"
                      name="email"
                      type="email" 
                      placeholder="student@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <Link to="#" className="text-sm text-primary hover:underline transition-colors">
                        Forgot password?
                      </Link>
                    </div>
                    <Input 
                      id="signin-password"
                      name="password"
                      type="password" 
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="remember" 
                      className="h-4 w-4 rounded border-border"
                    />
                    <label 
                      htmlFor="remember" 
                      className="text-sm text-muted-foreground"
                    >
                      Remember me
                    </label>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <RoleIcon className="mr-2 h-5 w-5" />
                        Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg" 
                  size="lg"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">I want to register as</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger id="signup-role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Student</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="teacher">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>Teacher</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input 
                      id="signup-name"
                      name="name"
                      type="text" 
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email"
                      name="email"
                      type="email" 
                      placeholder="student@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password"
                      name="password"
                      type="password" 
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input 
                      id="signup-confirm"
                      name="confirm-password"
                      type="password" 
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Preferred Language</Label>
                    <Select defaultValue="english">
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="hindi">Hindi</SelectItem>
                        <SelectItem value="telugu">Telugu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      <>
                        <RoleIcon className="mr-2 h-5 w-5" />
                        Create {role.charAt(0).toUpperCase() + role.slice(1)} Account
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By signing up, you agree to our{" "}
                    <Link to="#" className="text-primary hover:underline transition-colors">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="#" className="text-primary hover:underline transition-colors">
                      Privacy Policy
                    </Link>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default Auth;
