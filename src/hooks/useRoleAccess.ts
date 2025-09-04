import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Role, canAccessRoute } from "@/lib/permissions";

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
        const hasPermission = canAccessRoute(data.role as Role, pathname);
        
        if (!hasPermission) {
          console.warn(`User with role '${data.role}' denied access to route '${pathname}'`);
        }
        
        setHasAccess(hasPermission);
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