import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReviewerProtocolStatusBadge } from "./ReviewerProtocolStatusBadge";
import { ReviewerProtocolActionsDropdown } from "./ReviewerProtocolActionsDropdown";
import { ReviewerProtocolDetailsDialog } from "./ReviewerProtocolDetailsDialog";
import { FileText, DollarSign, Clock, CheckCircle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ReviewerProtocolsTabProps {
  userRole: string;
}

export const ReviewerProtocolsTab = ({ userRole }: ReviewerProtocolsTabProps) => {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    totalPaid: 0,
    pending: 0,
    avgDocuments: 0,
  });

  const fetchProtocols = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviewer_protocols')
        .select(`
          *,
          cost_centers (
            id,
            name,
            code
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProtocols(data || []);

      // Calculate metrics
      const total = data?.length || 0;
      const totalPaid = data?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;
      const pending = data?.filter(p => p.status !== 'paid' && p.status !== 'cancelled').length || 0;
      const avgDocuments = total > 0 
        ? Math.round(data.reduce((sum, p) => sum + (p.document_count || 0), 0) / total)
        : 0;

      setMetrics({ total, totalPaid, pending, avgDocuments });
    } catch (error) {
      console.error('Error fetching protocols:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    }
  };

  useEffect(() => {
    fetchProtocols();
    fetchCostCenters();
  }, []);

  const handleProtocolClick = (protocol: any) => {
    setSelectedProtocol(protocol);
    setDetailsOpen(true);
  };

  const handleCostCenterChange = async (protocolId: string, costCenterId: string) => {
    try {
      const { error } = await supabase
        .from('reviewer_protocols')
        .update({ centro_custo_id: costCenterId })
        .eq('id', protocolId);

      if (error) throw error;

      toast.success('Centro de custo atualizado com sucesso!');
      fetchProtocols();
    } catch (error) {
      console.error('Error updating cost center:', error);
      toast.error('Erro ao atualizar centro de custo');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics.total}</p>
                <p className="text-xs text-muted-foreground">Total de Protocolos</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalPaid)}</p>
                <p className="text-xs text-muted-foreground">Total Pago</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics.avgDocuments}</p>
                <p className="text-xs text-muted-foreground">Docs por Protocolo</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Protocols Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Revisor</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {userRole === 'owner' && <TableHead>Centro de Custo</TableHead>}
                  {userRole === 'owner' && <TableHead className="text-center">Nota Fiscal</TableHead>}
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocols.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userRole === 'owner' ? 9 : 8} className="text-center text-muted-foreground">
                      Nenhum protocolo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  protocols.map((protocol) => (
                    <TableRow
                      key={protocol.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleProtocolClick(protocol)}
                    >
                      <TableCell className="font-mono text-sm">{protocol.protocol_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{protocol.reviewer_name}</p>
                          <p className="text-xs text-muted-foreground">{protocol.reviewer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(protocol.competence_month + "T12:00:00"), "MMM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center">{protocol.order_count}</TableCell>
                      <TableCell className="text-center">{protocol.document_count}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(protocol.total_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <ReviewerProtocolStatusBadge status={protocol.status} />
                      </TableCell>
                      {userRole === 'owner' && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={protocol.centro_custo_id || ""}
                            onValueChange={(value) => handleCostCenterChange(protocol.id, value)}
                          >
                            <SelectTrigger className={`w-[200px] ${!protocol.centro_custo_id && protocol.status === 'owner_approval' ? 'border-destructive' : ''}`}>
                              <SelectValue placeholder="Obrigatório *">
                                {protocol.cost_centers 
                                  ? `${protocol.cost_centers.code} - ${protocol.cost_centers.name}`
                                  : "Obrigatório *"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {costCenters.map((center) => (
                                <SelectItem key={center.id} value={center.id}>
                                  {center.code} - {center.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      {userRole === 'owner' && (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {protocol.invoice_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(protocol.invoice_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem NF</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <ReviewerProtocolActionsDropdown
                          protocol={protocol}
                          userRole={userRole}
                          onUpdate={fetchProtocols}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <ReviewerProtocolDetailsDialog
        protocol={selectedProtocol}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};