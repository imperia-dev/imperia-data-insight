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
        // Fetch user role from profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !data) {
          setHasAccess(false);
          setLoading(false);
          return;
        }
        
        setUserRole(data.role);

        // Check if the user role is valid
        const validRoles: Role[] = ['owner', 'master', 'admin', 'operation'];
        if (!validRoles.includes(data.role as Role)) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Check if the current route allows this role
        const hasPermission = canAccessRoute(data.role as Role, pathname);
        
        console.log('🔍 Role Access Check:', {
          role: data.role,
          pathname,
          hasPermission,
          availableRoutes: pathname === '/master-protocol-approvals' ? 'checking...' : ''
        });
        
        setHasAccess(hasPermission);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [session, pathname, authLoading]);

  return { userRole, loading: loading || authLoading, hasAccess };
};