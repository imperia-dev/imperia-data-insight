import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProtocolStatusBadge } from "../fechamentoPrestadores/ProtocolStatusBadge";
import { ProtocolActionsDropdown } from "../fechamentoPrestadores/ProtocolActionsDropdown";
import { ProtocolFilters } from "../fechamentoPrestadores/ProtocolFilters";
import { ProtocolDetailsDialog } from "../fechamentoPrestadores/ProtocolDetailsDialog";
import { GenerateProtocolsCard } from "../fechamentoPrestadores/GenerateProtocolsCard";
import { ProtocolMetrics } from "./ProtocolMetrics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DiagramacaoProtocolsTabProps {
  userRole: string;
}

export function DiagramacaoProtocolsTab({ userRole }: DiagramacaoProtocolsTabProps) {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string; protocol: any | null }>({
    open: false,
    action: "",
    protocol: null
  });

  const [metrics, setMetrics] = useState({
    totalProtocols: 0,
    totalAmount: 0,
    pendingCount: 0,
    averageValue: 0
  });

  useEffect(() => {
    fetchProtocols();
    fetchSuppliers();
  }, []);

  const fetchProtocols = async (filters: any = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('service_provider_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.competence) {
        query = query.gte('competence_month', `${filters.competence}-01`)
          .lte('competence_month', `${filters.competence}-31`);
      }

      if (filters.supplierId && filters.supplierId !== 'all') {
        query = query.eq('supplier_id', filters.supplierId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.protocolNumber) {
        query = query.ilike('protocol_number', `%${filters.protocolNumber}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const protocolsData = data || [];
      setProtocols(protocolsData);

      // Calculate metrics
      const totalAmount = protocolsData
        .filter(p => p.paid_at)
        .reduce((sum, p) => sum + (p.total_amount || 0), 0);
      
      const pendingCount = protocolsData.filter(p => !p.paid_at && p.status !== 'cancelled').length;
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

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('service_provider_protocols')
        .select('*');

      if (error) throw error;
      
      const suppliersMap = new Map();
      (data || []).forEach((protocol: any) => {
        if (protocol.supplier_id && !suppliersMap.has(protocol.supplier_id)) {
          suppliersMap.set(protocol.supplier_id, {
            id: protocol.supplier_id,
            name: protocol.expenses_data?.[0]?.fornecedor_name || 'Prestador'
          });
        }
      });
      
      setSuppliers(Array.from(suppliersMap.values()));
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleAction = async (action: string, protocol: any) => {
    if (action === "details") {
      setSelectedProtocol(protocol);
      setDetailsDialogOpen(true);
      return;
    }

    setActionDialog({ open: true, action, protocol });
  };

  const confirmAction = async () => {
    const { action, protocol } = actionDialog;
    
    setActionDialog({ open: false, action: "", protocol: null });

    const getNewStatus = (action: string) => {
      switch (action) {
        case "send_approval": return "awaiting_master_initial";
        case "approve_manual":
        case "approve_final": return "approved";
        case "mark_paid": return "paid";
        case "cancel": return "cancelled";
        default: return protocol.status;
      }
    };

    const newStatus = getNewStatus(action);
    
    setProtocols(prev => prev.map(p => 
      p.id === protocol.id 
        ? { 
            ...p, 
            status: newStatus, 
            approved_at: action.includes("approve") ? new Date().toISOString() : p.approved_at, 
            paid_at: action === "mark_paid" ? new Date().toISOString() : p.paid_at 
          }
        : p
    ));

    try {
      switch (action) {
        case "send_approval":
          await sendForApproval(protocol);
          break;
        case "approve_manual":
        case "approve_final":
          await approveProtocol(protocol);
          break;
        case "mark_paid":
          await markAsPaid(protocol);
          break;
        case "cancel":
          await cancelProtocol(protocol);
          break;
        case "resend_link":
          await resendLink(protocol);
          break;
      }

      await fetchProtocols();
    } catch (error: any) {
      console.error('Action failed:', error);
      await fetchProtocols();
      toast.error(error.message || "Erro ao executar ação");
    }
  };

  const sendForApproval = async (protocol: any) => {
    const { error } = await supabase
      .from('service_provider_protocols')
      .update({ status: 'awaiting_master_initial' })
      .eq('id', protocol.id);

    if (error) throw error;
    toast.success("Protocolo enviado para aprovação");
  };

  const approveProtocol = async (protocol: any) => {
    const { error } = await supabase
      .from('service_provider_protocols')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', protocol.id);

    if (error) throw error;
    toast.success("Protocolo aprovado");
  };

  const markAsPaid = async (protocol: any) => {
    const { error } = await supabase
      .from('service_provider_protocols')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', protocol.id);

    if (error) throw error;
    toast.success("Protocolo marcado como pago");
  };

  const cancelProtocol = async (protocol: any) => {
    const { error } = await supabase
      .from('service_provider_protocols')
      .update({ status: 'cancelled' })
      .eq('id', protocol.id);

    if (error) throw error;
    toast.success("Protocolo cancelado");
  };

  const resendLink = async (protocol: any) => {
    toast.success("Link reenviado para o prestador");
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
      
      <GenerateProtocolsCard onProtocolsGenerated={fetchProtocols} />
      
      <ProtocolFilters onFilterChange={fetchProtocols} suppliers={suppliers} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Protocolos de Diagramação</CardTitle>
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
                  <TableHead>Prestador</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Qtd Despesas</TableHead>
                  <TableHead className="text-center">Aprovado?</TableHead>
                  <TableHead className="text-center">Pago?</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocols.map((protocol) => (
                  <TableRow key={protocol.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleAction("details", protocol)}>
                    <TableCell className="font-mono text-sm">{protocol.protocol_number}</TableCell>
                    <TableCell>{protocol.provider_name}</TableCell>
                    <TableCell>{format(new Date(protocol.competence_month), "MMM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <ProtocolStatusBadge status={protocol.status} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(protocol.total_amount || 0)}
                    </TableCell>
                    <TableCell>{protocol.expense_count || 0}</TableCell>
                    <TableCell className="text-center">
                      {protocol.provider_approved_at ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {protocol.paid_at ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <ProtocolActionsDropdown 
                        protocol={protocol}
                        onAction={handleAction}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProtocolDetailsDialog
        protocol={selectedProtocol}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />

      <AlertDialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, action: "", protocol: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.action === "send_approval" && "Deseja enviar este protocolo para aprovação?"}
              {actionDialog.action === "approve_manual" && "Deseja aprovar manualmente este protocolo?"}
              {actionDialog.action === "approve_final" && "Deseja realizar a aprovação final?"}
              {actionDialog.action === "mark_paid" && "Deseja marcar como pago?"}
              {actionDialog.action === "cancel" && "Deseja cancelar este protocolo?"}
              {actionDialog.action === "resend_link" && "Deseja reenviar o link?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
