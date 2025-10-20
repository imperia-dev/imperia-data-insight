import { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, TrendingUp, TrendingDown, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardControleFinanceiro() {
  const { user } = useAuth();
  const { userRole, loading } = useRoleAccess("/dashboard-controle-financeiro");
  const { isCollapsed } = useSidebar();
  const [userName, setUserName] = useState('');
  const [contasPagar, setContasPagar] = useState({ pendente: 0, pago: 0 });
  const [contasReceber, setContasReceber] = useState({ pendente: 0, recebido: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchFinancialData();
    }
  }, [user, dateFrom, dateTo]);

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

  const fetchFinancialData = async () => {
    setLoadingData(true);
    try {
      // Fetch Contas a Pagar
      let pagarQuery = supabase
        .from('contas_a_pagar')
        .select('valor_total, status, created_at');

      if (dateFrom) {
        pagarQuery = pagarQuery.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        pagarQuery = pagarQuery.lte('created_at', endDate.toISOString());
      }

      const { data: contasPagarData, error: pagarError } = await pagarQuery;

      if (pagarError) throw pagarError;

      const totalPendente = contasPagarData
        ?.filter(c => c.status === 'novo' || c.status === 'aguardando_pagamento')
        .reduce((sum, c) => sum + Number(c.valor_total || 0), 0) || 0;

      const totalPago = contasPagarData
        ?.filter(c => c.status === 'finalizado')
        .reduce((sum, c) => sum + Number(c.valor_total || 0), 0) || 0;

      setContasPagar({ pendente: totalPendente, pago: totalPago });

      // Fetch Contas a Receber
      let receberQuery = supabase
        .from('contas_a_receber')
        .select('valor_total, prestacoes, created_at');

      if (dateFrom) {
        receberQuery = receberQuery.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        receberQuery = receberQuery.lte('created_at', endDate.toISOString());
      }

      const { data: contasReceberData, error: receberError } = await receberQuery;

      if (receberError) throw receberError;

      let totalReceber = 0;
      let totalRecebido = 0;

      contasReceberData?.forEach(conta => {
        const prestacoes = conta.prestacoes as any[] || [];
        prestacoes.forEach((p: any) => {
          const valor = Number(p.valor || 0);
          if (p.status === 'pendente') {
            totalReceber += valor;
          } else if (p.status === 'recebido') {
            totalRecebido += valor;
          }
        });
      });

      setContasReceber({ pendente: totalReceber, recebido: totalRecebido });
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Controle Financeiro</h1>
                <p className="text-muted-foreground mt-2">
                  Visão consolidada de todas as movimentações financeiras
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-semibold mb-4">Contas a Pagar</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <StatsCard
                      title="Total Pendente"
                      value={formatCurrency(contasPagar.pendente)}
                      icon={<TrendingDown className="h-5 w-5" />}
                      description="Aguardando pagamento"
                    />
                    <StatsCard
                      title="Total Pago"
                      value={formatCurrency(contasPagar.pago)}
                      icon={<DollarSign className="h-5 w-5" />}
                      description="Finalizados"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Contas a Receber</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <StatsCard
                      title="Total a Receber"
                      value={formatCurrency(contasReceber.pendente)}
                      icon={<TrendingUp className="h-5 w-5" />}
                      description="Prestações pendentes"
                    />
                    <StatsCard
                      title="Total Recebido"
                      value={formatCurrency(contasReceber.recebido)}
                      icon={<DollarSign className="h-5 w-5" />}
                      description="Prestações pagas"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
