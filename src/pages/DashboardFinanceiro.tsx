import React, { useState, useEffect } from 'react';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Calculator, 
  Banknote,
  Target,
  BarChart3,
  Phone,
  ClipboardCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Import all financial components
import { FinancialSummary } from '@/components/financial/FinancialSummary';
import { DREStatement } from '@/components/financial/DREStatement';
import { BalanceSheet } from '@/components/financial/BalanceSheet';
import { CashFlow } from '@/components/financial/CashFlow';
import { FinancialIndicators } from '@/components/financial/FinancialIndicators';
import { UnitEconomics } from '@/components/financial/UnitEconomics';
import { FinancialProjections } from '@/components/financial/FinancialProjections';
import { WhatsAppFinancialReportModal } from '@/components/dashboard/WhatsAppFinancialReportModal';

// Import closing pages
import Fechamento from '@/pages/Fechamento';
import FechamentoDespesas from '@/pages/FechamentoDespesas';

function DashboardFinanceiroContent() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const [activeTab, setActiveTab] = useState('summary');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [financialData, setFinancialData] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    margin: 0,
    ebitda: 0,
    cashFlow: 0,
    assets: 0,
    liabilities: 0,
    equity: 0,
    cac: 0,
    ltv: 0,
    churnRate: 0,
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setUserName(data.full_name || 'Usuário');
        setUserRole(data.role || 'operation');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

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
            {/* Page Header with WhatsApp Button */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">Módulo Financeiro</h1>
                <p className="text-muted-foreground">Gestão financeira completa com análise de demonstrativos e indicadores</p>
              </div>
              <Button
                onClick={() => setIsWhatsAppModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Enviar via WhatsApp
              </Button>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="summary" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden lg:inline">Resumo</span>
                </TabsTrigger>
                <TabsTrigger value="dre" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span className="hidden lg:inline">DRE</span>
                </TabsTrigger>
                <TabsTrigger value="balance" className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden lg:inline">Balanço</span>
                </TabsTrigger>
                <TabsTrigger value="cashflow" className="flex items-center gap-1">
                  <Banknote className="h-4 w-4" />
                  <span className="hidden lg:inline">Fluxo Caixa</span>
                </TabsTrigger>
                <TabsTrigger value="indicators" className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden lg:inline">Indicadores</span>
                </TabsTrigger>
                <TabsTrigger value="unit" className="flex items-center gap-1">
                  <Calculator className="h-4 w-4" />
                  <span className="hidden lg:inline">Unit Economics</span>
                </TabsTrigger>
                <TabsTrigger value="projections" className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  <span className="hidden lg:inline">Projeções</span>
                </TabsTrigger>
                <TabsTrigger value="closing" className="flex items-center gap-1">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden lg:inline">Fechamento</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                <FinancialSummary />
              </TabsContent>

              <TabsContent value="dre">
                <DREStatement />
              </TabsContent>

              <TabsContent value="balance">
                <BalanceSheet />
              </TabsContent>

              <TabsContent value="cashflow">
                <CashFlow />
              </TabsContent>

              <TabsContent value="indicators">
                <FinancialIndicators />
              </TabsContent>

              <TabsContent value="unit">
                <UnitEconomics />
              </TabsContent>

              <TabsContent value="projections">
                <FinancialProjections />
              </TabsContent>

              <TabsContent value="closing">
                <Tabs defaultValue="receitas" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="receitas">Fechamento de Receitas</TabsTrigger>
                    <TabsTrigger value="despesas">Fechamento de Despesas</TabsTrigger>
                  </TabsList>

                  <TabsContent value="receitas">
                    <Fechamento />
                  </TabsContent>

                  <TabsContent value="despesas">
                    <FechamentoDespesas />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      {/* WhatsApp Financial Report Modal */}
      <WhatsAppFinancialReportModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        financialData={financialData}
      />
    </div>
  );
}

export default function DashboardFinanceiro() {
  return (
    <SidebarProvider>
      <DashboardFinanceiroContent />
    </SidebarProvider>
  );
}