import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface DREData {
  grossRevenue: number;
  taxes: number;
  deductions: number;
  netRevenue: number;
  directCosts: number;
  grossProfit: number;
  grossMargin: number;
  variableExpenses: number;
  contributionMargin: number;
  fixedExpenses: number;
  ebitda: number;
  depreciation: number;
  financialResult: number;
  lair: number;
  incomeTax: number;
  netProfit: number;
  netMargin: number;
}

export function DREStatement() {
  const [period, setPeriod] = useState('month');
  const [accountingMethod, setAccountingMethod] = useState('accrual');
  const [dreData, setDreData] = useState<DREData>({
    grossRevenue: 0,
    taxes: 0,
    deductions: 0,
    netRevenue: 0,
    directCosts: 0,
    grossProfit: 0,
    grossMargin: 0,
    variableExpenses: 0,
    contributionMargin: 0,
    fixedExpenses: 0,
    ebitda: 0,
    depreciation: 0,
    financialResult: 0,
    lair: 0,
    incomeTax: 0,
    netProfit: 0,
    netMargin: 0,
  });

  useEffect(() => {
    fetchDREData();
  }, [period, accountingMethod]);

  const fetchDREData = async () => {
    try {
      // Fetch from unified expenses table with chart of accounts
      const startDate = getStartDate(period);
      const dateField = accountingMethod === 'accrual' ? 'data_competencia' : 'data_pagamento';
      
      // Fetch expenses with chart of accounts details
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          amount_base,
          chart_of_accounts!inner (
            dre_section,
            name,
            code
          ),
          fixo_variavel
        `)
        .gte(dateField, startDate.toISOString())
        .not('chart_of_accounts.dre_section', 'is', null);

      if (expensesError) throw expensesError;

      // Fetch financial entries for revenue (still using old table)
      const { data: revenues, error: revenueError } = await supabase
        .from('financial_entries')
        .select('*')
        .gte('date', startDate.toISOString())
        .eq('type', 'revenue');

      if (revenueError) throw revenueError;

      // Calculate DRE components based on chart of accounts sections
      const grossRevenue = revenues?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      const taxes = expenses?.filter(e => 
        e.chart_of_accounts?.dre_section === 'DEDUCTIONS'
      ).reduce((sum, e) => sum + Number(e.amount_base), 0) || 0;
      
      const deductions = 0; // Placeholder
      const netRevenue = grossRevenue - taxes - deductions;
      
      const directCosts = expenses?.filter(e => 
        e.chart_of_accounts?.dre_section === 'COGS'
      ).reduce((sum, e) => sum + Number(e.amount_base), 0) || 0;
      
      const grossProfit = netRevenue - directCosts;
      const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
      
      const variableExpenses = expenses?.filter(e => 
        e.chart_of_accounts?.dre_section === 'VAR_EXP' || 
        (e.fixo_variavel === 'variavel' && e.chart_of_accounts?.dre_section === 'FIXED_EXP')
      ).reduce((sum, e) => sum + Number(e.amount_base), 0) || 0;
      
      const contributionMargin = grossProfit - variableExpenses;
      
      const fixedExpenses = expenses?.filter(e => 
        e.chart_of_accounts?.dre_section === 'FIXED_EXP' && 
        e.fixo_variavel !== 'variavel'
      ).reduce((sum, e) => sum + Number(e.amount_base), 0) || 0;
      
      const ebitda = contributionMargin - fixedExpenses;
      
      const depreciation = expenses?.filter(e => 
        e.chart_of_accounts?.dre_section === 'DEPREC_AMORT'
      ).reduce((sum, e) => sum + Number(e.amount_base), 0) || 0;
      
      const financialResult = expenses?.filter(e => 
        e.chart_of_accounts?.dre_section === 'FIN_RESULT'
      ).reduce((sum, e) => sum + Number(e.amount_base), 0) || 0;
      
      const lair = ebitda - depreciation - financialResult;
      
      const incomeTax = expenses?.filter(e => 
        e.chart_of_accounts?.dre_section === 'INCOME_TAX'
      ).reduce((sum, e) => sum + Number(e.amount_base), 0) || 0;
      
      const netProfit = lair - incomeTax;
      const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

      setDreData({
        grossRevenue,
        taxes,
        deductions,
        netRevenue,
        directCosts,
        grossProfit,
        grossMargin,
        variableExpenses,
        contributionMargin,
        fixedExpenses,
        ebitda,
        depreciation,
        financialResult,
        lair,
        incomeTax,
        netProfit,
        netMargin,
      });
    } catch (error) {
      console.error('Error fetching DRE data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do DRE',
        variant: 'destructive',
      });
    }
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

  // Removed local formatCurrency - using imported one

  const renderIndicator = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500 inline ml-2" />;
    } else if (value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500 inline ml-2" />;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Demonstrativo de Resultados (DRE)</CardTitle>
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
                <SelectItem value="accrual">Competência</SelectItem>
                <SelectItem value="cash">Caixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-semibold">Faturamento Bruto</TableCell>
              <TableCell className="text-right">{formatCurrency(dreData.grossRevenue)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">(-) Impostos</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(dreData.taxes)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">(-) Deduções</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(dreData.deductions)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-semibold">Faturamento Líquido</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(dreData.netRevenue)}</TableCell>
              <TableCell>{renderIndicator(dreData.netRevenue)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">(-) Custos Diretos</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(dreData.directCosts)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-semibold">Lucro Bruto</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(dreData.grossProfit)}</TableCell>
              <TableCell>
                {dreData.grossMargin.toFixed(1)}%
                {renderIndicator(dreData.grossProfit)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">(-) Despesas Variáveis</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(dreData.variableExpenses)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-semibold">Margem de Contribuição</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(dreData.contributionMargin)}</TableCell>
              <TableCell>{renderIndicator(dreData.contributionMargin)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">(-) Despesas Fixas</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(dreData.fixedExpenses)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="border-t-2 bg-muted/50">
              <TableCell className="font-bold">EBITDA</TableCell>
              <TableCell className="text-right font-bold text-lg">{formatCurrency(dreData.ebitda)}</TableCell>
              <TableCell>{renderIndicator(dreData.ebitda)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">(-) Depreciação/Amortização</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(dreData.depreciation)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">(-) Resultado Financeiro</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(dreData.financialResult)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-semibold">LAIR</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(dreData.lair)}</TableCell>
              <TableCell>{renderIndicator(dreData.lair)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">(-) Imposto sobre Lucro</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(dreData.incomeTax)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="border-t-2 bg-primary/10">
              <TableCell className="font-bold text-lg">Lucro Líquido</TableCell>
              <TableCell className="text-right font-bold text-lg">{formatCurrency(dreData.netProfit)}</TableCell>
              <TableCell>
                {dreData.netMargin.toFixed(1)}%
                {renderIndicator(dreData.netProfit)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}