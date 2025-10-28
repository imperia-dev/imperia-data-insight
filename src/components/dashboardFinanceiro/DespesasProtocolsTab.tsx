import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProtocolMetrics } from "./ProtocolMetrics";
import { DespesaProtocolDetailsDialog } from "./DespesaProtocolDetailsDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Eye, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DespesasProtocolsTabProps {
  userRole: string;
}

export function DespesasProtocolsTab({ userRole }: DespesasProtocolsTabProps) {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    totalProtocols: 0,
    totalAmount: 0,
    pendingCount: 0,
    averageValue: 0
  });

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expense_closing_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const protocolsData = data || [];
      setProtocols(protocolsData);

      const totalAmount = protocolsData.reduce((sum, p) => sum + (p.total_amount || 0), 0);
      const pendingCount = protocolsData.filter(p => p.status === 'draft').length;
      const averageValue = protocolsData.length > 0 ? totalAmount / protocolsData.length : 0;

      setMetrics({
        totalProtocols: protocolsData.length,
        totalAmount,
        pendingCount,
        averageValue
      });
    } catch (error: any) {
      console.error('Error fetching protocols:', error);
      toast.error("Erro ao carregar protocolos");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from('expense_closing_protocols')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', protocolId);

      if (error) throw error;

      toast.success("Protocolo aprovado");
      fetchProtocols();
    } catch (error: any) {
      toast.error("Erro ao aprovar protocolo");
    }
  };

  const handleClose = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from('expense_closing_protocols')
        .update({ status: 'closed' })
        .eq('id', protocolId);

      if (error) throw error;

      toast.success("Protocolo fechado");
      fetchProtocols();
    } catch (error: any) {
      toast.error("Erro ao fechar protocolo");
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: any }> = {
      draft: { label: "Rascunho", variant: "secondary" },
      approved: { label: "Aprovado", variant: "default" },
      closed: { label: "Fechado", variant: "outline" }
    };

    const config = configs[status] || configs.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProtocolMetrics {...metrics} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Protocolos de Despesas</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          {protocols.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum protocolo encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Empresa</TableHead>
                  <TableHead className="text-right">Prestador</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocols.map((protocol) => (
                  <TableRow 
                    key={protocol.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedProtocol(protocol)}
                  >
                    <TableCell className="font-mono text-sm">{protocol.protocol_number}</TableCell>
                    <TableCell>
                      {format(new Date(protocol.competence_month), "MMM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(protocol.status)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(protocol.total_company_expenses || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(protocol.total_service_provider_expenses || 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(protocol.total_amount || 0)}
                    </TableCell>
                    <TableCell className="text-center">{protocol.expense_count || 0}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-end">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setSelectedProtocol(protocol)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {protocol.status === 'draft' && (userRole === 'master' || userRole === 'owner') && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleApprove(protocol.id)}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {protocol.status === 'approved' && userRole === 'owner' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleClose(protocol.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DespesaProtocolDetailsDialog
        protocol={selectedProtocol}
        open={!!selectedProtocol}
        onOpenChange={(open) => !open && setSelectedProtocol(null)}
      />
    </div>
  );
}
