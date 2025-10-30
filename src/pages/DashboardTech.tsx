import { useEffect, useState } from "react";
import { Construction } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardTech() {
  const { user } = useAuth();
  const { mainContainerClass } = useSidebarOffset();
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

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="text-center space-y-6 max-w-md">
              <div className="flex justify-center">
                <div className="p-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse">
                  <Construction className="h-24 w-24 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-foreground">
                  Em Construção
                </h1>
                <p className="text-lg text-muted-foreground">
                  Esta página está sendo desenvolvida e estará disponível em breve.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
