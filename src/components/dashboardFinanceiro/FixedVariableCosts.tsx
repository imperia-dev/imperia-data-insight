import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CostData {
  fixed: number;
  variable: number;
  total: number;
}

export function FixedVariableCosts() {
  const [costs, setCosts] = useState<CostData>({ fixed: 0, variable: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      const currentMonth = new Date();
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          *,
          chart_of_accounts (
            dre_section
          )
        `)
        .gte('data_emissao', firstDay.toISOString().split('T')[0])
        .lte('data_emissao', lastDay.toISOString().split('T')[0]);

      if (error) throw error;

      const variableExpenses = expenses?.filter(e => 
        e.chart_of_accounts?.dre_section === 'VAR_EXP' || 
        (e.fixo_variavel === 'variavel' && e.chart_of_accounts?.dre_section === 'FIXED_EXP')
      ).reduce((sum, e) => sum + Number(e.amount_base || 0), 0) || 0;

      const fixedExpenses = expenses?.filter(e => 
        e.chart_of_accounts?.dre_section === 'FIXED_EXP' && 
        e.fixo_variavel !== 'variavel'
      ).reduce((sum, e) => sum + Number(e.amount_base || 0), 0) || 0;

      setCosts({
        fixed: fixedExpenses,
        variable: variableExpenses,
        total: fixedExpenses + variableExpenses
      });
    } catch (error) {
      console.error('Error fetching costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Custos Fixos', value: costs.fixed, color: 'hsl(var(--primary))' },
    { name: 'Custos Variáveis', value: costs.variable, color: 'hsl(var(--accent))' }
  ];

  const fixedPercentage = costs.total > 0 ? (costs.fixed / costs.total) * 100 : 0;
  const variablePercentage = costs.total > 0 ? (costs.variable / costs.total) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-48">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Custos</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(costs.total)}</div>
          <p className="text-xs text-muted-foreground">Mês atual</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Custos Fixos</CardTitle>
          <TrendingDown className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(costs.fixed)}</div>
          <p className="text-xs text-muted-foreground">
            {fixedPercentage.toFixed(1)}% do total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Custos Variáveis</CardTitle>
          <TrendingUp className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent">{formatCurrency(costs.variable)}</div>
          <p className="text-xs text-muted-foreground">
            {variablePercentage.toFixed(1)}% do total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribuição</CardTitle>
        </CardHeader>
        <CardContent className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={45}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))' 
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
