import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

interface UseInactivityDetectorProps {
  timeoutMs?: number; // Default: 30 minutes
  warningMs?: number; // Default: 5 minutes before timeout
  enabled?: boolean;
}

export function useInactivityDetector({
  timeoutMs = 30 * 60 * 1000, // 30 minutes
  warningMs = 5 * 60 * 1000, // 5 minutes warning
  enabled = true
}: UseInactivityDetectorProps = {}) {
  const { signOut, session } = useAuth();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const hasWarnedRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    hasWarnedRef.current = false;
  }, []);

  const handleLogout = useCallback(async () => {
    clearTimers();
    await signOut();
    toast({
      title: "Sessão expirada",
      description: "Você foi desconectado devido à inatividade.",
      variant: "destructive"
    });
  }, [signOut, toast, clearTimers]);

  const showWarning = useCallback(() => {
    if (!hasWarnedRef.current) {
      hasWarnedRef.current = true;
      toast({
        title: "Aviso de inatividade",
        description: "Sua sessão expirará em 5 minutos devido à inatividade.",
        variant: "default",
        duration: 10000
      });
    }
  }, [toast]);

  const resetTimer = useCallback(() => {
    if (!enabled || !session) return;

    lastActivityRef.current = Date.now();
    clearTimers();

    // Set warning timer
    warningRef.current = setTimeout(() => {
      showWarning();
    }, timeoutMs - warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [enabled, session, timeoutMs, warningMs, clearTimers, showWarning, handleLogout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset if more than 1 second has passed (debounce)
    if (timeSinceLastActivity > 1000) {
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled || !session) {
      clearTimers();
      return;
    }

    // Activity events to monitor
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [enabled, session, handleActivity, resetTimer, clearTimers]);

  return {
    lastActivity: lastActivityRef.current,
    resetTimer,
    clearTimers
  };
}