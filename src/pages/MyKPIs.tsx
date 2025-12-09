import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { usePageLayout } from '@/hooks/usePageLayout';
import { cn } from '@/lib/utils';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  FileText,
  BarChart3,
  Info
} from 'lucide-react';
import { 
  useCollaboratorKPIs, 
  useCalculatedKPIs,
  useKPIHistory 
} from '@/hooks/useCollaboratorKPIs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

type PeriodType = 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'year';

const periodOptions = [
  { value: 'current_month', label: 'Mês Atual' },
  { value: 'last_month', label: 'Mês Anterior' },
  { value: 'last_3_months', label: 'Últimos 3 Meses' },
  { value: 'last_6_months', label: 'Últimos 6 Meses' },
  { value: 'year', label: 'Ano Atual' },
];

export default function MyKPIs() {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const { mainContainerClass } = usePageLayout();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('current_month');

  // Fetch KPIs for the current user
  const { data: kpis, isLoading: loadingKPIs } = useCollaboratorKPIs(user?.id || null);
  const { data: history } = useKPIHistory(user?.id || null);

  // Calculate period dates
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    switch (selectedPeriod) {
      case 'current_month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        label = format(now, 'MMMM yyyy', { locale: ptBR });
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        label = format(lastMonth, 'MMMM yyyy', { locale: ptBR });
        break;
      case 'last_3_months':
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        label = `${format(start, 'MMM', { locale: ptBR })} - ${format(end, 'MMM yyyy', { locale: ptBR })}`;
        break;
      case 'last_6_months':
        start = startOfMonth(subMonths(now, 5));
        end = endOfMonth(now);
        label = `${format(start, 'MMM', { locale: ptBR })} - ${format(end, 'MMM yyyy', { locale: ptBR })}`;
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        label = `Ano ${now.getFullYear()}`;
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        label = format(now, 'MMMM yyyy', { locale: ptBR });
    }

    return { periodStart: start, periodEnd: end, periodLabel: label };
  }, [selectedPeriod]);

  const { data: calculatedKPIs, isLoading: loadingCalculations } = useCalculatedKPIs(
    user?.id || null,
    kpis || [],
    periodStart,
    periodEnd
  );

  // Prepare chart data from history
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    const grouped = history.reduce((acc, h) => {
      const monthKey = format(new Date(h.period_start), 'MMM yy', { locale: ptBR });
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey };
      }
      if (h.kpi) {
        acc[monthKey][h.kpi.kpi_name] = h.actual_value;
        acc[monthKey][`${h.kpi.kpi_name}_target`] = h.target_value;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }, [history]);

  const hasKPIs = kpis && kpis.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole || ''} />
      
      <div className={cn(mainContainerClass, "pt-16")}>
        <Header userName="" userRole={userRole || ''} />
        
        <main className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Meus KPIs</h1>
              <p className="text-muted-foreground">Acompanhe seu desempenho pessoal</p>
            </div>
            
            <div className="flex gap-3 items-center">
              <Badge variant="outline" className="capitalize">
                {periodLabel}
              </Badge>
              
              {/* Period Selector */}
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodType)}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {loadingKPIs || loadingCalculations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : hasKPIs && calculatedKPIs && calculatedKPIs.length > 0 ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {calculatedKPIs.map(result => (
                  <KPICard key={result.kpi.id} result={result} />
                ))}
              </div>

              {/* Evolution Chart */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Evolução Mensal
                    </CardTitle>
                    <CardDescription>Acompanhamento histórico dos seus KPIs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis unit="%" className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--popover))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Legend />
                          {kpis?.map((kpi, idx) => (
                            <Line
                              key={kpi.id}
                              type="monotone"
                              dataKey={kpi.kpi_name}
                              name={kpi.kpi_label}
                              stroke={idx === 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          ))}
                          <ReferenceLine 
                            y={1} 
                            stroke="hsl(var(--muted-foreground))" 
                            strokeDasharray="5 5" 
                            label={{ value: 'Meta 1%', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Period Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Detalhes do Período
                  </CardTitle>
                  <CardDescription className="capitalize">{periodLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {calculatedKPIs.map(result => (
                      <div key={result.kpi.id} className="p-4 rounded-lg border bg-muted/30">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          {result.kpi.kpi_label}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total de documentos base:</span>
                            <span className="font-medium">{result.totalBase}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>
                              {result.kpi.calculation_type === 'error_rate' 
                                ? 'Pendências com erro:' 
                                : result.kpi.calculation_type === 'not_error_rate'
                                ? 'Pendências "não é erro":'
                                : 'Contagem:'}
                            </span>
                            <span className="font-medium">{result.totalCount}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span>Taxa calculada:</span>
                            <span className={`font-bold ${result.isWithinTarget ? 'text-green-600' : 'text-red-600'}`}>
                              {result.actualValue.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* No KPIs configured */
            <Card>
              <CardContent className="py-12 text-center">
                <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum KPI configurado</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Você ainda não possui KPIs configurados. Entre em contato com o gestor para configurar seus indicadores de desempenho.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

interface KPICardProps {
  result: {
    kpi: {
      id: string;
      kpi_label: string;
      target_value: number;
      target_operator: string;
      unit: string;
      calculation_type: string;
    };
    actualValue: number;
    targetValue: number;
    isWithinTarget: boolean;
    totalBase: number;
    totalCount: number;
    percentOfTarget: number;
  };
}

function KPICard({ result }: KPICardProps) {
  const { kpi, actualValue, targetValue, isWithinTarget, percentOfTarget } = result;
  
  const operatorLabel = kpi.target_operator === 'lte' ? '≤' : kpi.target_operator === 'gte' ? '≥' : '=';
  const progressValue = Math.min(percentOfTarget, 150);

  return (
    <Card className={`border-2 transition-colors ${isWithinTarget ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{kpi.kpi_label}</CardTitle>
          {isWithinTarget ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold">
              {actualValue.toFixed(2)}<span className="text-lg">{kpi.unit}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Meta: {operatorLabel} {targetValue}{kpi.unit}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {isWithinTarget ? (
              <>
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Dentro da meta</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 font-medium">Acima da meta</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso em relação à meta</span>
            <span>{percentOfTarget.toFixed(0)}%</span>
          </div>
          <Progress 
            value={progressValue} 
            className={`h-2 ${isWithinTarget ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
