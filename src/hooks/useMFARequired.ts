import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMFARequired() {
  const { session, user } = useAuth();
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCompleted, setMfaCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkMFAStatus() {
      if (!session || !user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Verify if user has verified MFA factors
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = factorsData?.all?.filter(f => f.status === 'verified') || [];

        // 2. If no factors, MFA is not required for this user
        if (verifiedFactors.length === 0) {
          setMfaRequired(false);
          setMfaCompleted(true); // Doesn't need MFA
          setLoading(false);
          return;
        }

        // 3. User HAS MFA configured - check if challenge was completed
        setMfaRequired(true);

        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        // AAL2 means MFA was completed in this session
        const isAAL2 = aalData?.currentLevel === 'aal2';
        setMfaCompleted(isAAL2);

        // Log bypass attempt if trying to access without AAL2
        if (!isAAL2) {
          // Log security event (fire and forget)
          try {
            await supabase.rpc('log_security_event', {
              p_event_type: 'mfa_bypass_attempt',
              p_severity: 'high',
              p_details: {
                user_id: user.id,
                current_aal: aalData?.currentLevel || 'aal1',
                required_aal: 'aal2',
                pathname: window.location.pathname,
                timestamp: new Date().toISOString()
              }
            });
          } catch (err) {
            console.error('Failed to log security event:', err);
          }
        }

      } catch (error) {
        console.error('Error checking MFA status:', error);
        setMfaRequired(false);
        setMfaCompleted(true); // In case of error, allow access (fail-open)
      } finally {
        setLoading(false);
      }
    }

    checkMFAStatus();
  }, [session, user]);

  return { mfaRequired, mfaCompleted, loading };
}
