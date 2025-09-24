import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useInactivityDetector } from "@/hooks/useInactivityDetector";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Create signOut function before using it in useInactivityDetector
  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
    setUser(null);
    setSession(null);
    navigate("/auth");
    setLoading(false);
  }, [navigate]);
  
  // Enable inactivity detector for session timeout (30 minutes)
  useInactivityDetector({
    enabled: !!session,
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    warningMs: 5 * 60 * 1000, // 5 minutes warning
    session: session,
    onLogout: signOut
  });

  // Function to check if session is expired (12 hours)
  const checkSessionExpiry = (session: Session | null) => {
    if (!session) return false;
    
    // Get the session creation time (issued at time in seconds)
    const issuedAt = session.expires_at ? session.expires_at - 3600 : 0; // expires_at is 1 hour after issued_at
    const now = Math.floor(Date.now() / 1000); // current time in seconds
    const twelveHours = 12 * 60 * 60; // 12 hours in seconds
    
    // Check if more than 12 hours have passed since session was issued
    if ((now - issuedAt) > twelveHours) {
      return true; // Session is expired
    }
    
    return false;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Check if session is older than 24 hours
        if (session && checkSessionExpiry(session)) {
          // Force sign out if session is too old
          await supabase.auth.signOut();
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only navigate on actual sign out, not on other auth state changes
        if (event === 'SIGNED_OUT') {
          navigate('/auth');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Check if session is older than 24 hours
      if (session && checkSessionExpiry(session)) {
        // Force sign out if session is too old
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        navigate('/auth');
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Set up interval to check session expiry every minute
    const intervalId = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && checkSessionExpiry(session)) {
        await supabase.auth.signOut();
      }
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};