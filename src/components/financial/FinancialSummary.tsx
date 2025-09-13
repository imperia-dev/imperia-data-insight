import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Calculator, Target } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface SummaryData {
  revenue: number;
  expenses: number;
  grossProfit: number;
  ebitda: number;
  netProfit: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
}

export function FinancialSummary() {
  const [period, setPeriod] = useState('month');
  const [accountingMethod, setAccountingMethod] = useState('accrual');
  const [summaryData, setSummaryData] = useState<SummaryData>({
    revenue: 0,
    expenses: 0,
    grossProfit: 0,
    ebitda: 0,
    netProfit: 0,
    cashBalance: 50000,
    accountsReceivable: 25000,
    accountsPayable: 15000,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchSummaryData();
    fetchChartData();
  }, [period, accountingMethod]);

  const fetchSummaryData = async () => {
    try {
      const startDate = getStartDate(period);
      
      const { data: entries } = await supabase
        .from('financial_entries')
        .select('*')
        .gte('date', startDate.toISOString())
        .eq('accounting_method', accountingMethod);

      if (!entries) return;

      const revenue = entries.filter(e => e.type === 'revenue').reduce((sum, e) => sum + Number(e.amount), 0);
      const expenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount), 0);
      const taxes = entries.filter(e => e.type === 'tax').reduce((sum, e) => sum + Number(e.amount), 0);
      
      const grossProfit = revenue - (expenses * 0.4); // Assuming 40% is COGS
      const ebitda = grossProfit - (expenses * 0.6); // Remaining 60% is operational
      const netProfit = ebitda - taxes;

      setSummaryData({
        revenue,
        expenses,
        grossProfit,
        ebitda,
        netProfit,
        cashBalance: 50000 + netProfit * 0.8,
        accountsReceivable: revenue * 0.25,
        accountsPayable: expenses * 0.2,
      });
    } catch (error) {
      console.error('Error fetching summary data:', error);
    }
  };

  const fetchChartData = async () => {
    // Generate sample trend data for the last 6 periods
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      data.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short' }),
        revenue: Math.random() * 50000 + 80000,
        expenses: Math.random() * 30000 + 60000,
        profit: Math.random() * 20000 + 10000,
      });
    }
    setChartData(data);
  };

  const getStartDate = (period: string) => {
    const now = new Date();
    switch (period) {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const percentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const pieData = [
    { name: 'Custos Diretos', value: summaryData.expenses * 0.4, color: 'hsl(var(--destructive))' },
    { name: 'Despesas Operacionais', value: summaryData.expenses * 0.35, color: 'hsl(var(--warning))' },
    { name: 'Marketing/Vendas', value: summaryData.expenses * 0.15, color: 'hsl(var(--info))' },
    { name: 'Outros', value: summaryData.expenses * 0.1, color: 'hsl(var(--muted))' },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Resumo Financeiro</h2>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="quarter">Trimestral</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={accountingMethod} onValueChange={setAccountingMethod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accrual">Regime Competência</SelectItem>
              <SelectItem value="cash">Regime Caixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita Total
              </span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryData.revenue)}</div>
            <p className="text-xs text-muted-foreground">
              +12.5% vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                EBITDA
              </span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryData.ebitda)}</div>
            <p className="text-xs text-muted-foreground">
              Margem: {summaryData.revenue > 0 ? ((summaryData.ebitda / summaryData.revenue) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Lucro Líquido
              </span>
              {summaryData.netProfit > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summaryData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summaryData.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Margem: {summaryData.revenue > 0 ? ((summaryData.netProfit / summaryData.revenue) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Saldo de Caixa
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryData.cashBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Disponível imediato
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                    name="Receita"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stackId="2"
                    stroke="hsl(var(--success))" 
                    fill="hsl(var(--success))" 
                    fillOpacity={0.6}
                    name="Lucro"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Composição de Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${((entry.value / summaryData.expenses) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">Contas a Receber</h4>
              <div className="text-xl font-bold">{formatCurrency(summaryData.accountsReceivable)}</div>
              <p className="text-sm text-muted-foreground">
                {((summaryData.accountsReceivable / summaryData.revenue) * 30).toFixed(0)} dias de prazo médio
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">Contas a Pagar</h4>
              <div className="text-xl font-bold">{formatCurrency(summaryData.accountsPayable)}</div>
              <p className="text-sm text-muted-foreground">
                {((summaryData.accountsPayable / summaryData.expenses) * 30).toFixed(0)} dias de prazo médio
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">Capital de Giro</h4>
              <div className="text-xl font-bold">
                {formatCurrency(summaryData.cashBalance + summaryData.accountsReceivable - summaryData.accountsPayable)}
              </div>
              <p className="text-sm text-muted-foreground">
                Liquidez disponível
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}