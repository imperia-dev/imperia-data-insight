import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

export function WorkflowAtrasoTab() {
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    protocolType: 'all',
    status: 'all',
    delayed: 'all'
  });
  const [metrics, setMetrics] = useState({
    totalOpen: 0,
    totalDelayed: 0,
    avgCompletionDays: 0,
    approvalRate: 0
  });

  useEffect(() => {
    fetchWorkflowSteps();
  }, [filters]);

  const fetchWorkflowSteps = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('protocol_workflow_steps')
        .select('*')
        .order('started_at', { ascending: false });

      if (filters.protocolType !== 'all') {
        query = query.eq('protocol_type', filters.protocolType);
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Filter delayed steps if needed
      if (filters.delayed === 'yes') {
        filteredData = filteredData.filter(step => {
          if (step.completed_at || !step.due_date) return false;
          return new Date(step.due_date) < new Date();
        });
      } else if (filters.delayed === 'no') {
        filteredData = filteredData.filter(step => {
          if (step.completed_at) return true;
          if (!step.due_date) return true;
          return new Date(step.due_date) >= new Date();
        });
      }

      setSteps(filteredData);
      calculateMetrics(filteredData);
    } catch (error: any) {
      console.error('Error fetching workflow steps:', error);
      toast.error("Erro ao carregar workflow");
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (stepsData: any[]) => {
    const openSteps = stepsData.filter(s => s.status === 'pending' || s.status === 'in_progress');
    const delayedSteps = stepsData.filter(s => {
      if (s.completed_at || !s.due_date) return false;
      return new Date(s.due_date) < new Date();
    });

    const completedSteps = stepsData.filter(s => s.status === 'completed' && s.completed_at && s.started_at);
    const avgDays = completedSteps.length > 0
      ? completedSteps.reduce((sum, s) => {
          const days = Math.ceil((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / completedSteps.length
      : 0;

    const totalSteps = stepsData.length;
    const approvedSteps = stepsData.filter(s => s.status === 'completed').length;
    const approvalRate = totalSteps > 0 ? (approvedSteps / totalSteps) * 100 : 0;

    setMetrics({
      totalOpen: openSteps.length,
      totalDelayed: delayedSteps.length,
      avgCompletionDays: Math.round(avgDays),
      approvalRate: Math.round(approvalRate)
    });
  };

  const isDelayed = (step: any) => {
    if (step.completed_at || !step.due_date) return false;
    return new Date(step.due_date) < new Date();
  };

  const getStepDays = (step: any) => {
    const endDate = step.completed_at ? new Date(step.completed_at) : new Date();
    const startDate = new Date(step.started_at);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Steps Abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOpen}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Steps Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.totalDelayed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgCompletionDays} dias</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxa Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.approvalRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Protocolo</Label>
              <Select value={filters.protocolType} onValueChange={(value) => setFilters({ ...filters, protocolType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="consolidated">Consolidado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status do Step</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="delayed">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Com Atraso?</Label>
              <Select value={filters.delayed} onValueChange={(value) => setFilters({ ...filters, delayed: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Sim</SelectItem>
                  <SelectItem value="no">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Steps</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : steps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum step encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Iniciado</TableHead>
                  <TableHead>Concluído</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Atraso?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {steps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell className="font-mono text-sm">{step.protocol_id}</TableCell>
                    <TableCell>{step.step_name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        step.status === 'completed' ? 'default' :
                        step.status === 'in_progress' ? 'secondary' :
                        'outline'
                      }>
                        {step.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{step.assigned_to || '-'}</TableCell>
                    <TableCell>{format(new Date(step.started_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>
                      {step.completed_at ? format(new Date(step.completed_at), "dd/MM HH:mm", { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell>{getStepDays(step)}</TableCell>
                    <TableCell>
                      {isDelayed(step) ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Não
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
