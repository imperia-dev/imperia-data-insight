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
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
          setUserRole(data.role);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  return { userRole, userName, mainContainerClass };
}