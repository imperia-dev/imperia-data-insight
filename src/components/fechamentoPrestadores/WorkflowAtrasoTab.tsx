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
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
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
    fetchProtocols();
  }, [filters]);

  const fetchProtocols = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('service_provider_protocols')
        .select(`
          *,
          protocol_workflow_steps(*)
        `)
        .order('created_at', { ascending: false });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      let protocolsWithWorkflow = (data || []).map(protocol => {
        const steps = protocol.protocol_workflow_steps || [];
        const currentStep = steps.find((s: any) => !s.completed_at) || steps[steps.length - 1];
        const completedSteps = steps.filter((s: any) => s.completed_at);
        
        const isDelayed = currentStep && currentStep.due_date && !currentStep.completed_at
          ? new Date(currentStep.due_date) < new Date()
          : false;

        const totalDays = protocol.created_at 
          ? Math.ceil((new Date().getTime() - new Date(protocol.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          ...protocol,
          currentStep,
          completedSteps: completedSteps.length,
          totalSteps: steps.length,
          isDelayed,
          totalDays
        };
      });

      // Filter delayed protocols if needed
      if (filters.delayed === 'yes') {
        protocolsWithWorkflow = protocolsWithWorkflow.filter(p => p.isDelayed);
      } else if (filters.delayed === 'no') {
        protocolsWithWorkflow = protocolsWithWorkflow.filter(p => !p.isDelayed);
      }

      setProtocols(protocolsWithWorkflow);
      calculateMetrics(protocolsWithWorkflow);
    } catch (error: any) {
      console.error('Error fetching protocols:', error);
      toast.error("Erro ao carregar protocolos");
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (protocolsData: any[]) => {
    const openProtocols = protocolsData.filter(p => p.status !== 'paid' && p.status !== 'cancelled');
    const delayedProtocols = protocolsData.filter(p => p.isDelayed);

    const avgDays = protocolsData.length > 0
      ? protocolsData.reduce((sum, p) => sum + p.totalDays, 0) / protocolsData.length
      : 0;

    const totalProtocols = protocolsData.length;
    const completedProtocols = protocolsData.filter(p => p.status === 'paid').length;
    const approvalRate = totalProtocols > 0 ? (completedProtocols / totalProtocols) * 100 : 0;

    setMetrics({
      totalOpen: openProtocols.length,
      totalDelayed: delayedProtocols.length,
      avgCompletionDays: Math.round(avgDays),
      approvalRate: Math.round(approvalRate)
    });
  };

  const getStepLabel = (stepName: string) => {
    const labels: Record<string, string> = {
      provider_validation: 'Validação do Prestador',
      master_initial_approval: 'Aprovação Master Inicial',
      master_final_approval: 'Aprovação Master Final',
      owner_approval: 'Aprovação Owner',
      payment: 'Pagamento',
    };
    return labels[stepName] || stepName;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      awaiting_provider: 'Aguardando Prestador',
      awaiting_master_initial: 'Aguardando Aprovação Master',
      awaiting_master_final: 'Aguardando Aprovação Final',
      awaiting_owner: 'Aguardando Aprovação Owner',
      approved: 'Aprovado',
      paid: 'Pago',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getWorkflowProgress = (protocol: any) => {
    if (protocol.totalSteps === 0) return '0%';
    const percentage = (protocol.completedSteps / protocol.totalSteps) * 100;
    return `${Math.round(percentage)}%`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Protocolos Abertos
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
              Protocolos Atrasados
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
              Taxa Conclusão
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status do Protocolo</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="awaiting_provider">Aguardando Prestador</SelectItem>
                  <SelectItem value="awaiting_master_initial">Aguardando Aprovação Master</SelectItem>
                  <SelectItem value="awaiting_master_final">Aguardando Aprovação Final</SelectItem>
                  <SelectItem value="awaiting_owner">Aguardando Owner</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
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
          <CardTitle>Protocolos - Workflow e Atraso</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : protocols.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum protocolo encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Prestador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Etapa Atual</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Dias Corridos</TableHead>
                  <TableHead>Atraso?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocols.map((protocol) => (
                  <TableRow key={protocol.id}>
                    <TableCell className="font-mono font-medium">
                      {protocol.protocol_number}
                    </TableCell>
                    <TableCell>{protocol.provider_name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        protocol.status === 'paid' ? 'default' :
                        protocol.status === 'approved' ? 'secondary' :
                        protocol.status === 'cancelled' ? 'destructive' :
                        'outline'
                      }>
                        {getStatusLabel(protocol.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {protocol.currentStep 
                        ? getStepLabel(protocol.currentStep.step_name)
                        : 'Concluído'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{getWorkflowProgress(protocol)}</div>
                        <div className="text-xs text-muted-foreground">
                          ({protocol.completedSteps}/{protocol.totalSteps})
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {protocol.total_amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>{protocol.totalDays}</TableCell>
                    <TableCell>
                      {protocol.isDelayed ? (
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
