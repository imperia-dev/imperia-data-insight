import { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardControleFinanceiro() {
  const { user } = useAuth();
  const { userRole, loading } = useRoleAccess("/dashboard-controle-financeiro");
  const { isCollapsed } = useSidebar();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setUserName(data.full_name || 'Usuário');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <Header userName={userName} userRole={userRole} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard Controle Financeiro</h1>
              <p className="text-muted-foreground mt-2">
                Visão consolidada de todas as movimentações financeiras
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Dashboard em Desenvolvimento
                </CardTitle>
                <CardDescription>
                  Esta página está sendo construída e em breve exibirá os indicadores consolidados
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground text-lg">
                    Conteúdo em desenvolvimento...
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Em breve você poderá visualizar os totalizadores de Contas a Pagar, 
                    Contas a Receber e filtros por período.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
