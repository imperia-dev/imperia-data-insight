import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useMFA() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      checkMFAStatus();
    }
  }, [user]);

  const checkMFAStatus = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check profile for MFA status first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('mfa_enabled, mfa_verified')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }
      
      if (profile) {
        setMfaEnabled(profile.mfa_enabled || false);
      }
      
      // Try to get MFA factors regardless of profile status
      // This helps detect unverified factors
      try {
        const { data: session } = await supabase.auth.getSession();
        
        // Only call listFactors if we have a valid session
        if (session?.session) {
          const { data, error } = await supabase.auth.mfa.listFactors();
          
          if (data?.all && data.all.length > 0) {
            setFactors(data.all);
            
            // Check if there are only unverified factors
            const verifiedFactors = data.all.filter(f => f.status === 'verified');
            
            // Update MFA enabled status based on verified factors
            if (verifiedFactors.length > 0) {
              setMfaEnabled(true);
              // Update profile if needed
              if (!profile?.mfa_enabled) {
                await supabase
                  .from('profiles')
                  .update({ 
                    mfa_enabled: true,
                    mfa_verified: true 
                  })
                  .eq('id', user.id);
              }
            } else {
              // Has unverified factors only
              setMfaEnabled(false);
              // Update profile if needed
              if (profile?.mfa_enabled) {
                await supabase
                  .from('profiles')
                  .update({ 
                    mfa_enabled: false,
                    mfa_verified: false 
                  })
                  .eq('id', user.id);
              }
            }
          } else {
            setFactors([]);
            setMfaEnabled(false);
          }
        }
      } catch (factorError) {
        // Silently handle MFA factor errors
        console.log('MFA factors not available');
      }
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrollTOTP = async () => {
    try {
      setLoading(true);
      
      // First check if there's an existing unverified factor
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      
      if (existingFactors?.all && existingFactors.all.length > 0) {
        // Remove any unverified factors first
        for (const factor of existingFactors.all) {
          if (factor.status === 'unverified') {
            await supabase.auth.mfa.unenroll({
              factorId: factor.id,
            });
          }
        }
      }
      
      // Now enroll new factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `TOTP ${new Date().toISOString()}`, // Add unique friendly name
      });
      
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao configurar 2FA",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyTOTP = async (factorId: string, code: string, challengeId?: string) => {
    try {
      setLoading(true);
      
      // First create a challenge if not provided
      let actualChallengeId = challengeId;
      if (!actualChallengeId) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId,
        });
        if (challengeError) throw challengeError;
        actualChallengeId = challengeData!.id;
      }
      
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: actualChallengeId,
        code,
      });
      
      if (error) throw error;
      
      // Update profile to reflect MFA is enabled
      await supabase
        .from('profiles')
        .update({ 
          mfa_enabled: true,
          mfa_verified: true,
          mfa_enrollment_date: new Date().toISOString()
        })
        .eq('id', user?.id);
      
      // Log the event
      try {
        await supabase.rpc('log_mfa_event', {
          p_event_type: 'enrollment',
          p_metadata: { factor_type: 'totp' }
        });
      } catch (logError) {
        console.log('Could not log MFA event');
      }
      
      setMfaEnabled(true);
      
      toast({
        title: "2FA ativado com sucesso",
        description: "Sua conta agora está protegida com autenticação de dois fatores.",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Código inválido",
        description: "Verifique o código e tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const challengeTOTP = async (factorId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
      });
      
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar desafio 2FA",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyChallenge = async (factorId: string, code: string, challengeId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });
      
      if (error) throw error;
      
      // Log successful challenge
      try {
        await supabase.rpc('log_mfa_event', {
          p_event_type: 'challenge_success',
          p_metadata: { factor_type: 'totp' }
        });
      } catch (logError) {
        console.log('Could not log MFA event');
      }
      
      return true;
    } catch (error: any) {
      // Log failed challenge
      try {
        await supabase.rpc('log_mfa_event', {
          p_event_type: 'challenge_failed',
          p_metadata: { factor_type: 'totp', error: error.message }
        });
      } catch (logError) {
        console.log('Could not log MFA event');
      }
      
      toast({
        title: "Código inválido",
        description: "Verifique o código e tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disableMFA = async (code: string) => {
    try {
      setLoading(true);
      
      // First, we need to elevate to AAL2 by verifying the MFA code
      // Get the first verified factor
      const verifiedFactor = factors.find(f => f.status === 'verified');
      if (!verifiedFactor) {
        throw new Error('Nenhum fator MFA verificado encontrado');
      }
      
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });
      
      if (challengeError) throw challengeError;
      
      // Verify the code to elevate to AAL2
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData!.id,
        code,
      });
      
      if (verifyError) {
        throw new Error('Código inválido. Verifique e tente novamente.');
      }
      
      // Now we have AAL2, unenroll all factors
      for (const factor of factors) {
        await supabase.auth.mfa.unenroll({
          factorId: factor.id,
        });
      }
      
      // Update profile
      await supabase
        .from('profiles')
        .update({ 
          mfa_enabled: false,
          mfa_verified: false 
        })
        .eq('id', user?.id);
      
      // Log the event
      try {
        await supabase.rpc('log_mfa_event', {
          p_event_type: 'disabled',
          p_metadata: { factors_removed: factors.length }
        });
      } catch (logError) {
        console.log('Could not log MFA event');
      }
      
      setMfaEnabled(false);
      setFactors([]);
      
      toast({
        title: "2FA desativado",
        description: "A autenticação de dois fatores foi removida da sua conta.",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao desativar 2FA",
        description: error.message || "Não foi possível desativar o 2FA.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('generate_mfa_backup_codes');
      
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao gerar códigos de backup",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyBackupCode = async (code: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('verify_mfa_backup_code', {
        p_code: code
      });
      
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao verificar código de backup",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cleanupUnverifiedFactors = async () => {
    try {
      setLoading(true);
      
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      
      if (existingFactors?.all && existingFactors.all.length > 0) {
        // Remove any unverified factors
        for (const factor of existingFactors.all) {
          if (factor.status === 'unverified') {
            await supabase.auth.mfa.unenroll({
              factorId: factor.id,
            });
          }
        }
        
        // Update profile to reflect MFA is disabled if no verified factors remain
        const verifiedFactors = existingFactors.all.filter(f => f.status === 'verified');
        if (verifiedFactors.length === 0) {
          await supabase
            .from('profiles')
            .update({ 
              mfa_enabled: false,
              mfa_verified: false 
            })
            .eq('id', user?.id);
            
          setMfaEnabled(false);
          setFactors([]);
        }
      }
      
      return true;
    } catch (error: any) {
      console.error('Error cleaning up unverified factors:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    mfaEnabled,
    loading,
    factors,
    enrollTOTP,
    verifyTOTP,
    challengeTOTP,
    verifyChallenge,
    disableMFA,
    generateBackupCodes,
    verifyBackupCode,
    checkMFAStatus,
    cleanupUnverifiedFactors,
  };
}