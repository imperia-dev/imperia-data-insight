import { useEffect, useId, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch user role from user_roles table
 * This ensures consistency with role-based access control
 */
export const useUserRole = () => {
  const subscriptionId = useId();
  const { user, session, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      // If auth is still loading, wait
      if (authLoading) {
        return;
      }

      // If no session after auth loading is complete, set to null
      if (!session) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch user role from user_roles table (security best practice)
        const { data, error } = await supabase.rpc('get_user_role', { user_id: session.user.id });

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
          setLoading(false);
          return;
        }
        
        if (!data) {
          // User has no role assigned yet
          setUserRole(null);
          setLoading(false);
          return;
        }
        
        setUserRole(data);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Set up real-time subscription to user_roles changes
    if (session?.user.id) {
      const channel = supabase
        .channel(`user-role-changes-hook:${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'user_roles',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('Role change detected in hook:', payload);
            // Re-check role when it changes
            fetchUserRole();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, authLoading, subscriptionId]);

  return { userRole, loading: loading || authLoading };
};
