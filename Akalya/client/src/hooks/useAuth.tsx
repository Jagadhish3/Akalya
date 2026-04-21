import { useState, useEffect } from "react";
import { authAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  _id?: string;
  email: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin';
  avatarUrl?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Helper: refresh current user from server (returns user or null)
  const refreshCurrentUser = async (): Promise<User | null> => {
    try {
      const data = await authAPI.getCurrentUser();
      // Server may return { user: {...} } or user directly — handle both
      const u: any = data?.user ?? data;
      if (!u) return null;
      u.id = u.id || u._id;
      setUser(u);
      return u as User;
    } catch (err: any) {
      console.error("refreshCurrentUser error:", err);
      // If it's 401 / invalid token, ensure token removed so UI can re-authenticate
      try { localStorage.removeItem("auth_token"); } catch {}
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          await refreshCurrentUser();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'teacher' | 'admin') => {
    try {
      const data = await authAPI.signUp(email, password, fullName, role);
      // Attempt to refresh user info from server (token should be saved by authAPI.signUp)
      const u = await refreshCurrentUser();
      if (u) {
        toast({
          title: "Success!",
          description: "Account created successfully. You are signed in.",
        });
      } else {
        toast({
          title: "Success!",
          description: "Account created. Please sign in.",
        });
      }
      return { error: null, user: u };
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const getUserRole = async (): Promise<User['role'] | null> => {
    // Fast path: if we already have user in state return it
    if (user?.role) return user.role;
    // Otherwise refresh from server
    const u = await refreshCurrentUser();
    return u?.role ?? null;
  };

// inside useAuth.tsx (replace signIn)
const signIn = async (email: string, password: string) => {
  try {
    const data = await authAPI.signIn(email, password);

    // Prefer the user returned by signin response (server already provided it)
    if (data?.user) {
      setUser(data.user);
      // saved token is handled inside authAPI.signIn
      toast({
        title: "Welcome back!",
        description: "Signed in successfully.",
      });
      return { error: null };
    }

    // If server didn't return user, try refreshing current user
    try {
      const refresh = await authAPI.getCurrentUser();
      if (refresh?.user) {
        setUser(refresh.user);
        return { error: null };
      }
      throw new Error("Failed to fetch user after sign in (invalid token?)");
    } catch (err: any) {
      // If refresh fails, remove token and surface error
      localStorage.removeItem("auth_token");
      toast({ title: "Sign in failed", description: err.message || "Failed to fetch user", variant: "destructive" });
      return { error: err };
    }

  } catch (error: any) {
    toast({
      title: "Sign in failed",
      description: error.message,
      variant: "destructive",
    });
    return { error };
  }
};


  const signInWithGoogle = async () => {
    try {
      // TODO: Implement Google OAuth flow with backend
      toast({
        title: "Google sign in",
        description: "Google SignIn will be implemented soon.",
        variant: "default",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await authAPI.signOut();
      setUser(null);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      // send to login (optional)
      navigate("/auth");
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  return {
    user,
    session: user ? { user } : null,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    getUserRole,
    refreshCurrentUser,
  };
};
