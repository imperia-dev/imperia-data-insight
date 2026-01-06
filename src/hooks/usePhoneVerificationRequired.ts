import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PhoneVerificationState {
  phoneVerified: boolean;
  phoneNumber: string | null;
  loading: boolean;
  refetch: () => void;
}

export function usePhoneVerificationRequired(): PhoneVerificationState {
  const { user } = useAuth();
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPhoneStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone_number, phone_verified')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setPhoneNumber(data?.phone_number || null);
      setPhoneVerified(data?.phone_verified === true);
    } catch (error) {
      console.error('Error fetching phone verification status:', error);
      setPhoneVerified(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneStatus();
  }, [user]);

  return {
    phoneVerified,
    phoneNumber,
    loading,
    refetch: fetchPhoneStatus,
  };
}
