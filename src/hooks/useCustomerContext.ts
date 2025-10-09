import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCustomerContext = () => {
  const { session } = useAuth();
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerName = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('customer_name')
          .eq('user_id', session.user.id)
          .eq('role', 'customer')
          .maybeSingle();

        if (error) {
          console.error('Error fetching customer name:', error);
        } else {
          setCustomerName(data?.customer_name || null);
        }
      } catch (error) {
        console.error('Error in useCustomerContext:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerName();
  }, [session]);

  return { customerName, loading };
};
