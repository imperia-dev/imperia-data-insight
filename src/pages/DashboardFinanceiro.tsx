import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { DiagramacaoProtocolsTab } from "@/components/dashboardFinanceiro/DiagramacaoProtocolsTab";
import { RevisaoProtocolsTab } from "@/components/dashboardFinanceiro/RevisaoProtocolsTab";
import { DespesasProtocolsTab } from "@/components/dashboardFinanceiro/DespesasProtocolsTab";

export default function DashboardFinanceiro() {
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
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-foreground">Dashboard Financeiro</h1>
          
          <Tabs defaultValue="diagramacao" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="diagramacao">Diagramação</TabsTrigger>
              <TabsTrigger value="revisao">Revisão</TabsTrigger>
              <TabsTrigger value="despesas">Despesas</TabsTrigger>
            </TabsList>

            <TabsContent value="diagramacao">
              <DiagramacaoProtocolsTab userRole={userRole} />
            </TabsContent>

            <TabsContent value="revisao">
              <RevisaoProtocolsTab userRole={userRole} />
            </TabsContent>

            <TabsContent value="despesas">
              <DespesasProtocolsTab userRole={userRole} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}