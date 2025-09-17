import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowDownIcon, ArrowUpIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/currency';

interface CashFlowData {
  operational: {
    inflows: number;
    outflows: number;
    net: number;
  };
  investment: {
    inflows: number;
    outflows: number;
    net: number;
  };
  financing: {
    inflows: number;
    outflows: number;
    net: number;
  };
  beginningBalance: number;
  endingBalance: number;
  netChange: number;
}

export function CashFlow() {
  const [period, setPeriod] = useState('month');
  const [method, setMethod] = useState<'direct' | 'indirect'>('direct');
  const [cashFlowData, setCashFlowData] = useState<CashFlowData>({
    operational: { inflows: 0, outflows: 0, net: 0 },
    investment: { inflows: 0, outflows: 0, net: 0 },
    financing: { inflows: 0, outflows: 0, net: 0 },
    beginningBalance: 0,
    endingBalance: 0,
    netChange: 0,
  });
  const [dailyFlow, setDailyFlow] = useState<any[]>([]);

  useEffect(() => {
    fetchCashFlowData();
    fetchDailyFlow();
  }, [period, method]);

  const fetchCashFlowData = async () => {
    try {
      const startDate = getStartDate(period);
      
      // Fetch expenses with chart of accounts for DFC activity classification
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          amount_base,
          data_pagamento,
          tipo_lancamento,
          chart_of_accounts!inner (
            dfc_activity,
            name
          )
        `)
        .gte('data_pagamento', startDate.toISOString())
        .not('data_pagamento', 'is', null)
        .not('chart_of_accounts.dfc_activity', 'is', null);

      if (error) throw error;

      // Fetch revenue from financial_entries (temporary until migrated)
      const { data: revenues } = await supabase
        .from('financial_entries')
        .select('*')
        .gte('date', startDate.toISOString())
        .eq('type', 'revenue');

      // Calculate cash flows by DFC activity
      let operational = { inflows: 0, outflows: 0, net: 0 };
      let investment = { inflows: 0, outflows: 0, net: 0 };
      let financing = { inflows: 0, outflows: 0, net: 0 };

      // Add revenues to operational inflows
      revenues?.forEach(rev => {
        operational.inflows += Number(rev.amount);
      });

      // Process expenses by DFC activity
      expenses?.forEach(expense => {
        const amount = Number(expense.amount_base);
        const activity = expense.chart_of_accounts?.dfc_activity;
        
        if (activity === 'OPERATING') {
          operational.outflows += amount;
        } else if (activity === 'INVESTING') {
          investment.outflows += amount;
        } else if (activity === 'FINANCING') {
          financing.outflows += amount;
        }
      });

      operational.net = operational.inflows - operational.outflows;
      investment.net = investment.inflows - investment.outflows;
      financing.net = financing.inflows - financing.outflows;

      const netChange = operational.net + investment.net + financing.net;
      const beginningBalance = 50000; // Placeholder - should fetch from balance sheet
      const endingBalance = beginningBalance + netChange;

      setCashFlowData({
        operational,
        investment,
        financing,
        beginningBalance,
        endingBalance,
        netChange,
      });
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o fluxo de caixa',
        variant: 'destructive',
      });
    }
  };

  const fetchDailyFlow = async () => {
    try {
      const startDate = getStartDate(period);
      const endDate = new Date();
      
      const { data: entries } = await supabase
        .from('financial_entries')
        .select('*')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .eq('accounting_method', 'cash')
        .order('date', { ascending: true });

      if (!entries) return;

      // Group by day and calculate cumulative balance
      const grouped = entries.reduce((acc: any, entry) => {
        const date = entry.date;
        if (!acc[date]) {
          acc[date] = { date, inflows: 0, outflows: 0, balance: 0 };
        }
        
        if (entry.type === 'revenue') {
          acc[date].inflows += Number(entry.amount);
        } else if (entry.type === 'expense') {
          acc[date].outflows += Number(entry.amount);
        }
        
        return acc;
      }, {});

      const dailyData = Object.values(grouped);
      let cumulativeBalance = 50000; // Starting balance
      
      dailyData.forEach((day: any) => {
        day.netFlow = day.inflows - day.outflows;
        cumulativeBalance += day.netFlow;
        day.balance = cumulativeBalance;
      });

      setDailyFlow(dailyData);
    } catch (error) {
      console.error('Error fetching daily flow:', error);
    }
  };

  const getStartDate = (period: string) => {
    const now = new Date();
    switch (period) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return weekStart;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  };

  // Removed local formatCurrency - using imported one

  const hasNegativeBalance = cashFlowData.endingBalance < 0;
  const hasCriticalCash = cashFlowData.endingBalance < 10000 && cashFlowData.endingBalance > 0;

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {hasNegativeBalance && (
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">
            Atenção: Saldo de caixa negativo! Necessário captação imediata de recursos.
          </AlertDescription>
        </Alert>
      )}
      {hasCriticalCash && (
        <Alert className="border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-600">
            Caixa em nível crítico. Considere antecipar recebimentos ou postergar pagamentos.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Demonstrativo de Fluxo de Caixa (DFC)</CardTitle>
            <div className="flex gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semanal</SelectItem>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="quarter">Trimestral</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={method} onValueChange={(v) => setMethod(v as 'direct' | 'indirect')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Método Direto</SelectItem>
                  <SelectItem value="indirect">Método Indireto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="detailed">Detalhado</TabsTrigger>
              <TabsTrigger value="chart">Gráfico</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-bold" colSpan={3}>Saldo Inicial de Caixa</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(cashFlowData.beginningBalance)}</TableCell>
                  </TableRow>
                  
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold" colSpan={4}>Atividades Operacionais</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Entradas</TableCell>
                    <TableCell className="text-right text-green-600">
                      <ArrowUpIcon className="inline h-4 w-4 mr-1" />
                      {formatCurrency(cashFlowData.operational.inflows)}
                    </TableCell>
                    <TableCell className="pl-8">Saídas</TableCell>
                    <TableCell className="text-right text-red-600">
                      <ArrowDownIcon className="inline h-4 w-4 mr-1" />
                      {formatCurrency(cashFlowData.operational.outflows)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold pl-4" colSpan={3}>Fluxo Líquido Operacional</TableCell>
                    <TableCell className={`text-right font-semibold ${cashFlowData.operational.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlowData.operational.net)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold" colSpan={4}>Atividades de Investimento</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Entradas</TableCell>
                    <TableCell className="text-right text-green-600">
                      <ArrowUpIcon className="inline h-4 w-4 mr-1" />
                      {formatCurrency(cashFlowData.investment.inflows)}
                    </TableCell>
                    <TableCell className="pl-8">Saídas</TableCell>
                    <TableCell className="text-right text-red-600">
                      <ArrowDownIcon className="inline h-4 w-4 mr-1" />
                      {formatCurrency(cashFlowData.investment.outflows)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold pl-4" colSpan={3}>Fluxo Líquido de Investimento</TableCell>
                    <TableCell className={`text-right font-semibold ${cashFlowData.investment.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlowData.investment.net)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold" colSpan={4}>Atividades de Financiamento</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Entradas</TableCell>
                    <TableCell className="text-right text-green-600">
                      <ArrowUpIcon className="inline h-4 w-4 mr-1" />
                      {formatCurrency(cashFlowData.financing.inflows)}
                    </TableCell>
                    <TableCell className="pl-8">Saídas</TableCell>
                    <TableCell className="text-right text-red-600">
                      <ArrowDownIcon className="inline h-4 w-4 mr-1" />
                      {formatCurrency(cashFlowData.financing.outflows)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold pl-4" colSpan={3}>Fluxo Líquido de Financiamento</TableCell>
                    <TableCell className={`text-right font-semibold ${cashFlowData.financing.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlowData.financing.net)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="border-t-2 bg-muted">
                    <TableCell className="font-bold" colSpan={3}>Variação Líquida de Caixa</TableCell>
                    <TableCell className={`text-right font-bold ${cashFlowData.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlowData.netChange)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-primary/10">
                    <TableCell className="font-bold text-lg" colSpan={3}>Saldo Final de Caixa</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${cashFlowData.endingBalance >= 0 ? '' : 'text-red-600'}`}>
                      {formatCurrency(cashFlowData.endingBalance)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="detailed">
              <div className="text-muted-foreground text-center py-8">
                Detalhamento por categoria em desenvolvimento
              </div>
            </TabsContent>

            <TabsContent value="chart">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyFlow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3}
                      name="Saldo Acumulado"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netFlow" 
                      stroke="hsl(var(--secondary))" 
                      name="Fluxo Diário"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}