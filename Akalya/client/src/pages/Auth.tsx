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
import { GraduationCap, User, BookOpen, Shield, Eye, EyeOff, InfoIcon, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/lib/api";

const emailSchema = z.string().email("Invalid email address");

const validatePassword = (password: string) => {
  const minLength = 10;
  const hasCapital = /[A-Z]/.test(password);
  const hasSmall = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) return "Password must be at least 10 characters long.";
  if (!hasCapital) return "Password must contain at least one capital letter.";
  if (!hasSmall) return "Password must contain at least one lowercase letter.";
  if (!hasNumber) return "Password must contain at least one digit.";
  if (!hasSpecial) return "Password must contain at least one special character.";
  
  return null;
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signUp, signIn, loading, getUserRole } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState<string>("student");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);

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

  useEffect(() => {
    const redirectToRoleDashboard = async () => {
      if (user && !loading && !searchParams.get('oauth')) {
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

      const result = await signIn(email, password);
      if (!result.error) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const userRole = (result as any).user?.role ?? (await getUserRole());
        if (userRole) {
          navigate(`/dashboard/${userRole}`);
        } else {
          setShowRoleDialog(true);
        }
      }
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsResetLoading(true);

    try {
      emailSchema.parse(forgotEmail);
      const result = await authAPI.forgotPassword(forgotEmail);
      
      toast({
        title: "Success",
        description: "Password reset token generated. Redirecting to reset page...",
      });
      
      if (result.token) {
        setTimeout(() => {
          navigate(`/reset-password/${result.token}`);
        }, 1500);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link.",
        variant: "destructive",
      });
    } finally {
      setIsResetLoading(false);
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

      const passwordError = validatePassword(password);
      if (passwordError) {
        toast({
          title: "Weak Password",
          description: passwordError,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
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
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate(`/dashboard/${role}`);
      }
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Please check your details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">✓</div>
              <span>Access courses anytime, anywhere</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">✓</div>
              <span>AI-powered personalized learning</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">✓</div>
              <span>Multilingual support for rural students</span>
            </div>
          </div>
        </div>

        <Card className="w-full animate-scale-in shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome to Aकlya</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showForgotPassword ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Forgot Password?</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email Address</Label>
                    <Input 
                      id="forgot-email"
                      type="email"
                      placeholder="student@example.com"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isResetLoading}>
                    {isResetLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mx-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                  </button>
                </form>
              </div>
            ) : (
              <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

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
                          <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Student</span></div>
                        </SelectItem>
                        <SelectItem value="teacher">
                          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>Teacher</span></div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2"><Shield className="h-4 w-4" /><span>Admin</span></div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" name="email" type="email" placeholder="student@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <button 
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary hover:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input 
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default Auth;
