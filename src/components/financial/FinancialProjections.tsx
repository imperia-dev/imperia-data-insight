import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { Calculator, TrendingUp, Target, AlertTriangle } from 'lucide-react';

interface ProjectionData {
  month: string;
  revenue: number;
  expenses: number;
  ebitda: number;
  netProfit: number;
  cashFlow: number;
}

interface Scenario {
  pessimistic: ProjectionData[];
  realistic: ProjectionData[];
  optimistic: ProjectionData[];
}

export function FinancialProjections() {
  const [timeHorizon, setTimeHorizon] = useState('6');
  const [selectedScenario, setSelectedScenario] = useState<'all' | 'pessimistic' | 'realistic' | 'optimistic'>('all');
  const [projections, setProjections] = useState<Scenario>({
    pessimistic: [],
    realistic: [],
    optimistic: [],
  });
  const [breakEvenPoint, setBreakEvenPoint] = useState<number | null>(null);

  useEffect(() => {
    generateProjections();
  }, [timeHorizon]);

  const generateProjections = async () => {
    try {
      // Fetch historical data to base projections
      const { data: historicalData } = await supabase
        .from('financial_entries')
        .select('*')
        .order('date', { ascending: false })
        .limit(3);

      const months = parseInt(timeHorizon);
      const baseRevenue = 100000; // Starting point
      const baseExpenses = 85000;
      
      const scenarios: Scenario = {
        pessimistic: [],
        realistic: [],
        optimistic: [],
      };

      for (let i = 1; i <= months; i++) {
        const month = new Date();
        month.setMonth(month.getMonth() + i);
        const monthStr = month.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

        // Pessimistic scenario - 5% growth
        const pessRevenue = baseRevenue * Math.pow(1.05, i);
        const pessExpenses = baseExpenses * Math.pow(1.03, i);
        scenarios.pessimistic.push({
          month: monthStr,
          revenue: pessRevenue,
          expenses: pessExpenses,
          ebitda: pessRevenue - pessExpenses,
          netProfit: (pessRevenue - pessExpenses) * 0.7,
          cashFlow: (pessRevenue - pessExpenses) * 0.8,
        });

        // Realistic scenario - 10% growth
        const realRevenue = baseRevenue * Math.pow(1.10, i);
        const realExpenses = baseExpenses * Math.pow(1.05, i);
        scenarios.realistic.push({
          month: monthStr,
          revenue: realRevenue,
          expenses: realExpenses,
          ebitda: realRevenue - realExpenses,
          netProfit: (realRevenue - realExpenses) * 0.7,
          cashFlow: (realRevenue - realExpenses) * 0.8,
        });

        // Optimistic scenario - 15% growth
        const optRevenue = baseRevenue * Math.pow(1.15, i);
        const optExpenses = baseExpenses * Math.pow(1.06, i);
        scenarios.optimistic.push({
          month: monthStr,
          revenue: optRevenue,
          expenses: optExpenses,
          ebitda: optRevenue - optExpenses,
          netProfit: (optRevenue - optExpenses) * 0.7,
          cashFlow: (optRevenue - optExpenses) * 0.8,
        });
      }

      setProjections(scenarios);
      
      // Calculate break-even point
      const breakEvenMonth = scenarios.realistic.findIndex(m => m.netProfit > 0);
      setBreakEvenPoint(breakEvenMonth !== -1 ? breakEvenMonth + 1 : null);
    } catch (error) {
      console.error('Error generating projections:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar as projeções',
        variant: 'destructive',
      });
    }
  };

  const saveProjections = async () => {
    try {
      const projectionsToSave = [];
      
      for (const [scenario, data] of Object.entries(projections)) {
        for (const projection of data) {
          projectionsToSave.push({
            projection_date: new Date(projection.month).toISOString(),
            metric_type: 'revenue',
            scenario: scenario as 'pessimistic' | 'realistic' | 'optimistic',
            projected_value: projection.revenue,
          });
          projectionsToSave.push({
            projection_date: new Date(projection.month).toISOString(),
            metric_type: 'ebitda',
            scenario: scenario as 'pessimistic' | 'realistic' | 'optimistic',
            projected_value: projection.ebitda,
          });
        }
      }

      const { error } = await supabase
        .from('financial_projections')
        .insert(projectionsToSave);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Projeções salvas com sucesso',
      });
    } catch (error) {
      console.error('Error saving projections:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as projeções',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getChartData = () => {
    if (selectedScenario === 'all') {
      // Combine all scenarios
      const combined = projections.realistic.map((real, index) => ({
        month: real.month,
        pessimistic: projections.pessimistic[index]?.revenue || 0,
        realistic: real.revenue,
        optimistic: projections.optimistic[index]?.revenue || 0,
      }));
      return combined;
    }
    return projections[selectedScenario];
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Projeções Financeiras</CardTitle>
            <div className="flex gap-2">
              <Select value={timeHorizon} onValueChange={setTimeHorizon}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedScenario} onValueChange={(v) => setSelectedScenario(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Cenários</SelectItem>
                  <SelectItem value="pessimistic">Pessimista</SelectItem>
                  <SelectItem value="realistic">Realista</SelectItem>
                  <SelectItem value="optimistic">Otimista</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={saveProjections}>
                Salvar Projeções
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Ponto de Equilíbrio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {breakEvenPoint ? `Mês ${breakEvenPoint}` : 'Não atingido'}
            </div>
            <p className="text-xs text-muted-foreground">Cenário realista</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Crescimento Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10%</div>
            <p className="text-xs text-muted-foreground">ao mês (realista)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              EBITDA Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(projections.realistic[projections.realistic.length - 1]?.ebitda || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Mês {timeHorizon}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Projeção de Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {selectedScenario === 'all' ? (
                <AreaChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="pessimistic" 
                    stackId="1"
                    stroke="hsl(var(--destructive))" 
                    fill="hsl(var(--destructive))" 
                    fillOpacity={0.3}
                    name="Pessimista"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="realistic" 
                    stackId="2"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3}
                    name="Realista"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="optimistic" 
                    stackId="3"
                    stroke="hsl(var(--success))" 
                    fill="hsl(var(--success))" 
                    fillOpacity={0.3}
                    name="Otimista"
                  />
                </AreaChart>
              ) : (
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Receita" />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" name="Despesas" />
                  <Line type="monotone" dataKey="ebitda" stroke="hsl(var(--success))" name="EBITDA" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Cenários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Cenário Pessimista
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Crescimento de 5% ao mês
                </p>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(projections.pessimistic[projections.pessimistic.length - 1]?.revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Receita final</p>
              </div>

              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Cenário Realista
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Crescimento de 10% ao mês
                </p>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(projections.realistic[projections.realistic.length - 1]?.revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Receita final</p>
              </div>

              <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Cenário Otimista
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Crescimento de 15% ao mês
                </p>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(projections.optimistic[projections.optimistic.length - 1]?.revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Receita final</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">Análise de Sensibilidade</h4>
              <p className="text-sm text-muted-foreground">
                A diferença entre o cenário pessimista e otimista no mês {timeHorizon} é de{' '}
                <span className="font-bold">
                  {formatCurrency(
                    (projections.optimistic[projections.optimistic.length - 1]?.revenue || 0) -
                    (projections.pessimistic[projections.pessimistic.length - 1]?.revenue || 0)
                  )}
                </span>
                , representando uma variação de aproximadamente{' '}
                <span className="font-bold">
                  {(
                    ((projections.optimistic[projections.optimistic.length - 1]?.revenue || 0) /
                    (projections.pessimistic[projections.pessimistic.length - 1]?.revenue || 0) - 1) * 100
                  ).toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}