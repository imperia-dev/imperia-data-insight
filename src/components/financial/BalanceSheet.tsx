import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BalanceSheetData {
  // Assets
  currentAssets: {
    cash: number;
    accountsReceivable: number;
    inventory: number;
    total: number;
  };
  nonCurrentAssets: {
    investments: number;
    propertyPlantEquipment: number;
    intangibles: number;
    total: number;
  };
  totalAssets: number;
  // Liabilities
  currentLiabilities: {
    accountsPayable: number;
    shortTermDebt: number;
    total: number;
  };
  nonCurrentLiabilities: {
    longTermDebt: number;
    total: number;
  };
  totalLiabilities: number;
  // Equity
  equity: {
    capitalStock: number;
    retainedEarnings: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
}

export function BalanceSheet() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [balanceData, setBalanceData] = useState<BalanceSheetData>({
    currentAssets: { cash: 0, accountsReceivable: 0, inventory: 0, total: 0 },
    nonCurrentAssets: { investments: 0, propertyPlantEquipment: 0, intangibles: 0, total: 0 },
    totalAssets: 0,
    currentLiabilities: { accountsPayable: 0, shortTermDebt: 0, total: 0 },
    nonCurrentLiabilities: { longTermDebt: 0, total: 0 },
    totalLiabilities: 0,
    equity: { capitalStock: 0, retainedEarnings: 0, total: 0 },
    totalLiabilitiesAndEquity: 0,
  });

  useEffect(() => {
    fetchBalanceSheetData();
  }, [period]);

  const fetchBalanceSheetData = async () => {
    try {
      const { data: items, error } = await supabase
        .from('balance_sheet_items')
        .select('*')
        .eq('date', `${period}-01`);

      if (error) throw error;

      // Group items by type and category
      const grouped = items?.reduce((acc: any, item) => {
        const type = item.type;
        const category = item.category;
        if (!acc[type]) acc[type] = {};
        if (!acc[type][category]) acc[type][category] = 0;
        acc[type][category] += Number(item.amount);
        return acc;
      }, {}) || {};

      // Calculate totals
      const currentAssets = {
        cash: grouped.current_asset?.cash || 0,
        accountsReceivable: grouped.current_asset?.accounts_receivable || 0,
        inventory: grouped.current_asset?.inventory || 0,
        total: 0,
      };
      currentAssets.total = currentAssets.cash + currentAssets.accountsReceivable + currentAssets.inventory;

      const nonCurrentAssets = {
        investments: grouped.non_current_asset?.investments || 0,
        propertyPlantEquipment: grouped.non_current_asset?.property || 0,
        intangibles: grouped.non_current_asset?.intangibles || 0,
        total: 0,
      };
      nonCurrentAssets.total = nonCurrentAssets.investments + nonCurrentAssets.propertyPlantEquipment + nonCurrentAssets.intangibles;

      const currentLiabilities = {
        accountsPayable: grouped.current_liability?.accounts_payable || 0,
        shortTermDebt: grouped.current_liability?.short_term_debt || 0,
        total: 0,
      };
      currentLiabilities.total = currentLiabilities.accountsPayable + currentLiabilities.shortTermDebt;

      const nonCurrentLiabilities = {
        longTermDebt: grouped.non_current_liability?.long_term_debt || 0,
        total: 0,
      };
      nonCurrentLiabilities.total = nonCurrentLiabilities.longTermDebt;

      const equity = {
        capitalStock: grouped.equity?.capital_stock || 0,
        retainedEarnings: grouped.equity?.retained_earnings || 0,
        total: 0,
      };
      equity.total = equity.capitalStock + equity.retainedEarnings;

      const totalAssets = currentAssets.total + nonCurrentAssets.total;
      const totalLiabilities = currentLiabilities.total + nonCurrentLiabilities.total;
      const totalLiabilitiesAndEquity = totalLiabilities + equity.total;

      setBalanceData({
        currentAssets,
        nonCurrentAssets,
        totalAssets,
        currentLiabilities,
        nonCurrentLiabilities,
        totalLiabilities,
        equity,
        totalLiabilitiesAndEquity,
      });
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o balanço patrimonial',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const isBalanced = Math.abs(balanceData.totalAssets - balanceData.totalLiabilitiesAndEquity) < 0.01;
  const hasNegativeEquity = balanceData.equity.total < 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Balanço Patrimonial</CardTitle>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </CardHeader>
      <CardContent>
        {hasNegativeEquity && (
          <Alert className="mb-4 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              Atenção: Patrimônio Líquido negativo indica que a empresa tem mais obrigações do que direitos.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Assets */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary">ATIVOS</h3>
            
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Ativo Circulante</h4>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="pl-4">Caixa e Equivalentes</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.currentAssets.cash)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-4">Contas a Receber</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.currentAssets.accountsReceivable)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-4">Estoque</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.currentAssets.inventory)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t font-semibold">
                    <TableCell>Total Ativo Circulante</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.currentAssets.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-2">Ativo Não Circulante</h4>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="pl-4">Investimentos</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.nonCurrentAssets.investments)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-4">Imobilizado</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.nonCurrentAssets.propertyPlantEquipment)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-4">Intangível</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.nonCurrentAssets.intangibles)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t font-semibold">
                    <TableCell>Total Ativo Não Circulante</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.nonCurrentAssets.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Table>
              <TableBody>
                <TableRow className="bg-primary/10">
                  <TableCell className="font-bold text-lg">TOTAL ATIVOS</TableCell>
                  <TableCell className="text-right font-bold text-lg">{formatCurrency(balanceData.totalAssets)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Liabilities and Equity */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary">PASSIVOS E PATRIMÔNIO LÍQUIDO</h3>
            
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Passivo Circulante</h4>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="pl-4">Contas a Pagar</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.currentLiabilities.accountsPayable)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-4">Empréstimos CP</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.currentLiabilities.shortTermDebt)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t font-semibold">
                    <TableCell>Total Passivo Circulante</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.currentLiabilities.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-2">Passivo Não Circulante</h4>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="pl-4">Empréstimos LP</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.nonCurrentLiabilities.longTermDebt)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t font-semibold">
                    <TableCell>Total Passivo Não Circulante</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.nonCurrentLiabilities.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-2">Patrimônio Líquido</h4>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="pl-4">Capital Social</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.equity.capitalStock)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-4">Lucros Acumulados</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.equity.retainedEarnings)}</TableCell>
                  </TableRow>
                  <TableRow className={`border-t font-semibold ${hasNegativeEquity ? 'text-red-600' : ''}`}>
                    <TableCell>Total Patrimônio Líquido</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.equity.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Table>
              <TableBody>
                <TableRow className="bg-primary/10">
                  <TableCell className="font-bold text-lg">TOTAL PASSIVOS + PL</TableCell>
                  <TableCell className="text-right font-bold text-lg">{formatCurrency(balanceData.totalLiabilitiesAndEquity)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Balance Check */}
        <div className="mt-6 p-4 rounded-lg bg-muted">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Verificação de Balanceamento:</span>
            {isBalanced ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Balanço está equilibrado</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>Diferença: {formatCurrency(Math.abs(balanceData.totalAssets - balanceData.totalLiabilitiesAndEquity))}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}