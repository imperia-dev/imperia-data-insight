import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Role, canAccessRoute } from "@/lib/permissions";

export const useRoleAccess = (pathname: string) => {
  const { user, session, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      // If auth is still loading, wait
      if (authLoading) {
        return;
      }

      // If no session after auth loading is complete, deny access
      if (!session) {
        setLoading(false);
        setHasAccess(false);
        return;
      }

      try {
        // Fetch user role from user_roles table (new system)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .order('role', { ascending: true }) // Get highest priority role
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching role access:', error);
          setHasAccess(false);
          setLoading(false);
          return;
        }
        
        if (!data) {
          // User has no role assigned
          setHasAccess(false);
          setLoading(false);
          return;
        }
        
        setUserRole(data.role);

        // Check if the user role is valid
        const validRoles: Role[] = ['owner', 'master', 'admin', 'operation', 'translator', 'customer', 'financeiro'];
        if (!validRoles.includes(data.role as Role)) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Check if the current route allows this role
        const hasPermission = canAccessRoute(data.role as Role, pathname);
        
        setHasAccess(hasPermission);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();

    // Set up real-time subscription to user_roles changes
    if (session?.user.id) {
      const channel = supabase
        .channel('user-role-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'user_roles',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('Role change detected:', payload);
            // Re-check access when role changes
            checkAccess();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, pathname, authLoading]);

  return { userRole, loading: loading || authLoading, hasAccess };
};