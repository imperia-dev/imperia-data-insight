import { useState, useMemo, useEffect } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePageLayout } from '@/hooks/usePageLayout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  FileText,
  BarChart3,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { 
  useCollaboratorsWithKPIs, 
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
import { useQueryClient } from '@tanstack/react-query';

type PeriodType = 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'year';

const periodOptions = [
  { value: 'current_month', label: 'Mês Atual' },
  { value: 'last_month', label: 'Mês Anterior' },
  { value: 'last_3_months', label: 'Últimos 3 Meses' },
  { value: 'last_6_months', label: 'Últimos 6 Meses' },
  { value: 'year', label: 'Ano Atual' },
];

export default function CollaboratorsKPI() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('current_month');

  const { data: collaborators, isLoading: loadingCollaborators } = useCollaboratorsWithKPIs();
  const { data: kpis, isLoading: loadingKPIs } = useCollaboratorKPIs(selectedUserId);
  const { data: history } = useKPIHistory(selectedUserId);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserName(data.full_name || '');
          setUserRole(data.role || '');
        }
      }
    };
    fetchProfile();
  }, [user]);

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
    selectedUserId,
    kpis || [],
    periodStart,
    periodEnd
  );

  // Auto-select first collaborator
  if (collaborators && collaborators.length > 0 && !selectedUserId) {
    setSelectedUserId(collaborators[0].id);
  }

  const selectedCollaborator = collaborators?.find(c => c.id === selectedUserId);

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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className={cn(mainContainerClass, "pt-16")}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">KPIs de Colaboradores</h1>
              <p className="text-muted-foreground">Acompanhe o desempenho individual de cada colaborador</p>
            </div>
            
            <div className="flex gap-3">
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

          {/* Collaborator Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Colaborador:
                </label>
                {loadingCollaborators ? (
                  <Skeleton className="h-10 w-[300px]" />
                ) : collaborators && collaborators.length > 0 ? (
                  <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {collaborators.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={c.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {c.full_name?.substring(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{c.full_name || c.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-muted-foreground">Nenhum colaborador com KPIs configurados</p>
                )}

                {selectedCollaborator && (
                  <Badge variant="outline" className="ml-auto capitalize">
                    {periodLabel}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          {selectedUserId && (
            <>
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
              ) : calculatedKPIs && calculatedKPIs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {calculatedKPIs.map(result => (
                    <KPICard 
                      key={result.kpi.id} 
                      result={result} 
                      onManualValueUpdate={() => {
                        // Invalidate queries to refresh data
                        window.location.reload();
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum KPI configurado para este colaborador</p>
                  </CardContent>
                </Card>
              )}

              {/* Evolution Chart */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Evolução Mensal
                    </CardTitle>
                    <CardDescription>Acompanhamento histórico dos KPIs</CardDescription>
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
              {calculatedKPIs && calculatedKPIs.length > 0 && (
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
                                  : 'Pendências "não é erro":'}
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
              )}
            </>
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
      is_manual?: boolean;
      manual_value?: number | null;
    };
    actualValue: number;
    targetValue: number;
    isWithinTarget: boolean;
    totalBase: number;
    totalCount: number;
    percentOfTarget: number;
  };
  onManualValueUpdate?: () => void;
}

function KPICard({ result, onManualValueUpdate }: KPICardProps) {
  const { kpi, actualValue, targetValue, isWithinTarget, percentOfTarget } = result;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(String(kpi.manual_value || 0));
  const [isSaving, setIsSaving] = useState(false);
  
  const operatorLabel = kpi.target_operator === 'lte' ? '≤' : kpi.target_operator === 'gte' ? '≥' : '=';
  const progressValue = Math.min(percentOfTarget, 150);

  const handleSave = async () => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      toast.error('Valor deve ser entre 0 e 100');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('collaborator_kpis')
        .update({ manual_value: numValue })
        .eq('id', kpi.id);

      if (error) throw error;

      toast.success('Valor atualizado com sucesso');
      setIsEditing(false);
      onManualValueUpdate?.();
    } catch (error) {
      console.error('Error updating manual value:', error);
      toast.error('Erro ao atualizar valor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(String(kpi.manual_value || 0));
    setIsEditing(false);
  };

  return (
    <Card className={`border-2 transition-colors ${isWithinTarget ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{kpi.kpi_label}</CardTitle>
          <div className="flex items-center gap-2">
            {kpi.calculation_type === 'manual' && !isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditing(true)}
                title="Editar valor"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            {isWithinTarget ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
        </div>
        {kpi.calculation_type === 'manual' && (
          <Badge variant="outline" className="w-fit text-xs">Manual</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Value */}
        <div className="text-center py-2">
          {isEditing ? (
            <div className="flex items-center justify-center gap-2">
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-24 text-center text-lg"
                min={0}
                max={100}
                step={0.01}
              />
              <span className="text-lg font-medium">{kpi.unit}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 text-green-600 hover:text-green-700"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8 w-8 text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span className={`text-4xl font-bold ${isWithinTarget ? 'text-green-600' : 'text-red-600'}`}>
              {actualValue.toFixed(2)}{kpi.unit}
            </span>
          )}
        </div>

        {/* Target */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4" />
          <span>Meta: {operatorLabel} {targetValue}{kpi.unit}</span>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={isWithinTarget ? 'default' : 'destructive'}
            className={isWithinTarget ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isWithinTarget ? (
              <><TrendingDown className="h-3 w-3 mr-1" /> Dentro da meta</>
            ) : (
              <><TrendingUp className="h-3 w-3 mr-1" /> Acima da meta</>
            )}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress 
            value={progressValue} 
            className={`h-2 ${isWithinTarget ? '[&>div]:bg-green-600' : '[&>div]:bg-red-600'}`}
          />
          <p className="text-xs text-center text-muted-foreground">
            {percentOfTarget.toFixed(0)}% da meta
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
