import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
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
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [exporting, setExporting] = useState(false);

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

      // Buscar pendências do mês para calcular taxa de erro
      const { data: pendenciesMonth } = await supabase
        .from('pendencies')
        .select('*')
        .gte('created_at', firstDayOfMonth.toISOString())
        .lte('created_at', lastDayOfMonth.toISOString());

      const { data: ordersMonth } = await supabase
        .from('orders')
        .select('*')
        .gte('attribution_date', firstDayOfMonth.toISOString())
        .lte('attribution_date', lastDayOfMonth.toISOString());

      const errorRate = ordersMonth?.length ? 
        ((pendenciesMonth?.length || 0) / ordersMonth.length * 100) : 0;

      // Agrupar documentos por cliente
      const documentsByCustomer = ordersMonth?.reduce((acc: any, order: any) => {
        const customer = order.customer || 'Sem cliente';
        if (!acc[customer]) {
          acc[customer] = 0;
        }
        acc[customer]++;
        return acc;
      }, {}) || {};

      // Buscar gastos com prestadores de serviço hoje
      const todayFormatted = today.toISOString().split('T')[0];

      const { data: expensesToday } = await supabase
        .from('expenses')
        .select('amount_original')
        .eq('tipo_despesa', 'prestador')
        .eq('data_competencia', todayFormatted);

      const { data: expensesMonth } = await supabase
        .from('expenses')
        .select('amount_original')
        .eq('tipo_despesa', 'prestador')
        .gte('data_competencia', firstDayOfMonth.toISOString().split('T')[0])
        .lte('data_competencia', lastDayOfMonth.toISOString().split('T')[0]);

      const providerCostsToday = expensesToday?.reduce((sum, e) => sum + (e.amount_original || 0), 0) || 0;
      const providerCostsMonth = expensesMonth?.reduce((sum, e) => sum + (e.amount_original || 0), 0) || 0;

      const additionalData = {
        errorRate,
        documentsByCustomer,
        providerCostsToday,
        providerCostsMonth
      };

      // Debug logs
      console.log('=== DADOS ADICIONAIS ===');
      console.log('Taxa de erro:', errorRate);
      console.log('Documentos por cliente:', documentsByCustomer);
      console.log('Gastos prestadores hoje:', providerCostsToday);
      console.log('Gastos prestadores mês:', providerCostsMonth);
      console.log('Pendências do mês:', pendenciesMonth?.length);
      console.log('Pedidos do mês:', ordersMonth?.length);
      console.log('Despesas de hoje:', expensesToday?.length);
      console.log('Despesas do mês:', expensesMonth?.length);

      await exportFinancialDashboard(diagramacaoData, revisaoData, despesasData, additionalData);
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