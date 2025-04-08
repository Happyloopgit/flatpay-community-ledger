
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Define the profile interface
interface Profile {
  id: string;
  name: string;
  society_id: number | null;
  role: string;
  phone_number: string | null;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
}

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    mfaRequired: boolean;
  }>;
  signUp: (email: string, password: string, name: string) => Promise<{
    error: Error | null;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  // Fetch profile data when user changes
  const fetchProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        console.log("Profile data loaded:", data);
        setProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  // Make refreshProfile available in the context
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // We need to use setTimeout to avoid Supabase deadlocks
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        // Redirect user based on auth state
        if (event === "SIGNED_IN" && window.location.pathname === "/login") {
          navigate("/");
        } else if (event === "SIGNED_OUT") {
          navigate("/login");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("Initial session check:", session ? "logged in" : "no session");
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
      
      if (error) {
        setError(error);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error);
        // Check if MFA is required
        if (error.status === 401 && error.message?.includes("mfa")) {
          return { error, mfaRequired: true };
        }
        return { error, mfaRequired: false };
      }

      // Check if MFA is required through session factors
      if (data?.session?.user?.factors) {
        return { error: null, mfaRequired: true };
      }

      return { error: null, mfaRequired: false };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("An unknown error occurred");
      setError(error);
      return { error, mfaRequired: false };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        setError(error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("An unknown error occurred");
      setError(error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("An unknown error occurred");
      setError(error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
