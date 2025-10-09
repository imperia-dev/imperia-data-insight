import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePageLayout } from "@/hooks/usePageLayout";
import { supabase } from "@/integrations/supabase/client";

export function useConstructionPage() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        // Get user name from profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setUserName(profileData.full_name);
        }

        // Get role from user_roles
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('role', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (roleData) {
          setUserRole(roleData.role);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  return { userRole, userName, mainContainerClass };
}