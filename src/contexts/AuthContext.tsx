import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useInactivityDetector } from "@/hooks/useInactivityDetector";
import { logger } from "@/utils/logger";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Calculate milliseconds until midnight
const calculateTimeUntilMidnight = (): number => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight
  return midnight.getTime() - now.getTime();
};

// Check if user has logged in today
const checkDailyLogin = (): boolean => {
  const lastLoginDate = localStorage.getItem('last_login_date');
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // If already logged in today, session is valid
  if (lastLoginDate === today) {
    return false; // Not expired
  }
  
  // If no login today, session should be expired
  return true; // Expired - needs new login
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const midnightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create signOut function before using it in useInactivityDetector
  const signOut = useCallback(async (reason?: string) => {
    setLoading(true);
    
    // Clear localStorage
    localStorage.removeItem('last_login_date');
    
    // Clear midnight timeout
    if (midnightTimeoutRef.current) {
      clearTimeout(midnightTimeoutRef.current);
      midnightTimeoutRef.current = null;
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error("Error signing out");
    }
    setUser(null);
    setSession(null);
    
    if (reason === 'daily_login') {
      toast.info("Sessão expirada", {
        description: "Por favor, faça login novamente para continuar.",
        duration: 5000,
      });
    }
    
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

  // Set up midnight expiration timer
  const setupMidnightExpiration = useCallback(() => {
    // Clear any existing timeout
    if (midnightTimeoutRef.current) {
      clearTimeout(midnightTimeoutRef.current);
    }
    
    const msUntilMidnight = calculateTimeUntilMidnight();
    
    // Set timeout to expire session at midnight
    midnightTimeoutRef.current = setTimeout(() => {
      logger.info("Session expired at midnight - daily login required");
      signOut('daily_login');
    }, msUntilMidnight);
    
    logger.debug(`Midnight expiration set for ${Math.round(msUntilMidnight / 1000 / 60)} minutes from now`);
  }, [signOut]);

  useEffect(() => {
    // Set up auth state listener FIRST
    // IMPORTANT: No async callback and no direct Supabase calls to prevent deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only synchronous state updates inside callback
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle new login - save date and don't check expiration
        if (event === 'SIGNED_IN' && session) {
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem('last_login_date', today);
          
          setTimeout(() => {
            setupMidnightExpiration();
          }, 0);
          return; // Don't check expiration on new login
        }
        
        // Only check expiration for TOKEN_REFRESHED or INITIAL_SESSION events
        if (session && event !== 'SIGNED_IN') {
          setTimeout(() => {
            if (checkSessionExpiry(session)) {
              signOut();
              return;
            }
            
            if (checkDailyLogin()) {
              logger.info("Daily login required - session from previous day");
              signOut('daily_login');
              return;
            }
            
            setupMidnightExpiration();
          }, 0);
        }
        
        // Handle sign out event
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('last_login_date');
          setTimeout(() => navigate('/auth'), 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Check if session is older than 12 hours
      if (session && checkSessionExpiry(session)) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        navigate('/auth');
      } 
      // Check daily login requirement
      else if (session && checkDailyLogin()) {
        logger.info("Daily login required on initial load");
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        toast.info("Sessão expirada", {
          description: "Por favor, faça login novamente para continuar.",
          duration: 5000,
        });
        navigate('/auth');
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Set up midnight expiration if session exists
        if (session) {
          setupMidnightExpiration();
        }
      }
      setLoading(false);
    });

    // Set up interval to check session expiry every minute
    const intervalId = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && (checkSessionExpiry(session) || checkDailyLogin())) {
        await supabase.auth.signOut();
      }
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
      if (midnightTimeoutRef.current) {
        clearTimeout(midnightTimeoutRef.current);
      }
    };
  }, [navigate, setupMidnightExpiration]);

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