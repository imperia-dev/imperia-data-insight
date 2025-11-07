import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { DiagramacaoProtocolsTab } from "@/components/dashboardFinanceiro/DiagramacaoProtocolsTab";
import { RevisaoProtocolsTab } from "@/components/dashboardFinanceiro/RevisaoProtocolsTab";
import { DespesasProtocolsTab } from "@/components/dashboardFinanceiro/DespesasProtocolsTab";
import { FixedVariableCosts } from "@/components/dashboardFinanceiro/FixedVariableCosts";
import { exportFinancialDashboard } from "@/utils/exportFinancialDashboard";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardFinanceiro() {
  const { user } = useAuth();
  const { mainContainerClass } = useSidebarOffset();
  const { userRole, loading: roleLoading } = useUserRole();
  const [userName, setUserName] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Buscar dados de Diagramação
      const { data: diagramacaoProtocols } = await supabase
        .from('service_provider_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      const diagramacaoData = {
        metrics: {
          totalProtocols: diagramacaoProtocols?.length || 0,
          totalAmount: diagramacaoProtocols?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0,
          pendingCount: diagramacaoProtocols?.filter(p => !p.paid_at && p.status !== 'cancelled').length || 0,
          averageValue: diagramacaoProtocols?.length ? 
            (diagramacaoProtocols.reduce((sum, p) => sum + (p.total_amount || 0), 0) / diagramacaoProtocols.length) : 0
        },
        protocols: diagramacaoProtocols || []
      };

      // Buscar dados de Revisão
      const { data: revisaoProtocols } = await supabase
        .from('reviewer_protocols')
        .select('*')
        .not('status', 'in', '("cancelled","draft")')
        .order('created_at', { ascending: false });

      const revisaoData = {
        metrics: {
          totalProtocols: revisaoProtocols?.length || 0,
          totalAmount: revisaoProtocols?.filter(p => p.paid_at).reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0,
          pendingCount: revisaoProtocols?.filter(p => !p.paid_at && p.status !== 'cancelled').length || 0,
          averageValue: revisaoProtocols?.length ? 
            (revisaoProtocols.reduce((sum, p) => sum + (p.document_count || 0), 0) / revisaoProtocols.length) : 0
        },
        protocols: revisaoProtocols || []
      };

      // Buscar dados de Despesas
      const { data: despesasProtocols } = await supabase
        .from('expense_closing_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      const despesasData = {
        metrics: {
          totalProtocols: despesasProtocols?.length || 0,
          totalAmount: despesasProtocols?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0,
          pendingCount: despesasProtocols?.filter(p => p.status === 'draft').length || 0,
          averageValue: despesasProtocols?.length ? 
            (despesasProtocols.reduce((sum, p) => sum + (p.total_amount || 0), 0) / despesasProtocols.length) : 0
        },
        protocols: despesasProtocols || []
      };

      await exportFinancialDashboard(diagramacaoData, revisaoData, despesasData);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
            <Button 
              onClick={handleExportPDF} 
              disabled={exporting}
              size="lg"
              className="gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-5 w-5" />
                  Exportar Relatório Completo
                </>
              )}
            </Button>
          </div>

          <div className="mb-6">
            <FixedVariableCosts />
          </div>
          
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