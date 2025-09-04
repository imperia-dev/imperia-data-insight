import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Define which roles can access which routes
const routePermissions: Record<string, string[]> = {
  '/': ['master', 'admin', 'operation'],
  '/orders': ['master', 'admin'],
  '/my-orders': ['operation'],
  '/delivered-orders': ['master', 'admin'],
  '/documents': ['master', 'admin'],
  '/team': ['master', 'admin'],
  '/productivity': ['master', 'admin'],
  '/financial': ['master', 'admin'],
  '/wallet': ['master', 'operation'],
  '/reports': ['master', 'admin'],
  '/calendar': ['master', 'admin', 'operation'],
  '/timesheet': ['master', 'admin', 'operation'],
  '/ai-analytics': ['master', 'admin'],
  '/settings': ['master', 'admin', 'operation'],
};

export const useRoleAccess = (pathname: string) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setLoading(false);
        setHasAccess(false);
        return;
      }

      try {
        // Fetch user role from profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          console.error('Error fetching user role:', error);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        setUserRole(data.role);

        // Check if the current route allows this role
        const allowedRoles = routePermissions[pathname];
        
        if (!allowedRoles) {
          // If route is not defined in permissions, DENY access by default (security first)
          console.warn(`Route ${pathname} not defined in permissions, denying access`);
          setHasAccess(false);
        } else {
          setHasAccess(allowedRoles.includes(data.role));
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, pathname]);

  return { userRole, loading, hasAccess };
};