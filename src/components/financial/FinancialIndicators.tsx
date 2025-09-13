import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface Indicator {
  name: string;
  value: number;
  target: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

export function FinancialIndicators() {
  const [indicators, setIndicators] = useState<Indicator[]>([
    { name: 'Liquidez Corrente', value: 1.5, target: 1.2, unit: 'x', status: 'good', trend: 'up' },
    { name: 'Margem EBITDA', value: 15, target: 20, unit: '%', status: 'warning', trend: 'stable' },
    { name: 'Alavancagem', value: 2.5, target: 3, unit: 'x', status: 'good', trend: 'down' },
    { name: 'ROE', value: 18, target: 15, unit: '%', status: 'good', trend: 'up' },
    { name: 'Capital de Giro', value: 50000, target: 40000, unit: 'R$', status: 'good', trend: 'up' },
    { name: 'Ciclo Financeiro', value: 45, target: 30, unit: 'dias', status: 'warning', trend: 'stable' },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-600';
      case 'warning': return 'bg-yellow-600';
      case 'critical': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'R$') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    }
    return `${value}${unit}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {indicators.map((indicator) => (
        <Card key={indicator.name}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{indicator.name}</CardTitle>
              {indicator.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
              {indicator.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
              {indicator.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-2xl font-bold ${getStatusColor(indicator.status)}`}>
                {formatValue(indicator.value, indicator.unit)}
              </span>
              <span className="text-sm text-muted-foreground">
                Meta: {formatValue(indicator.target, indicator.unit)}
              </span>
            </div>
            <Progress 
              value={(indicator.value / indicator.target) * 100} 
              className="h-2"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}