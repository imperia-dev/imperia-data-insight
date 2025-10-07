import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProtocolStatusBadge } from "@/components/fechamentoPrestadores/ProtocolStatusBadge";
import { ProtocolDetailsDialog } from "@/components/fechamentoPrestadores/ProtocolDetailsDialog";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLocation, Navigate } from "react-router-dom";
import { CheckCircle, XCircle, Eye, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";

interface Protocol {
  id: string;
  protocol_number: string;
  provider_name: string;
  competence_month: string;
  total_amount: number;
  status: string;
  invoice_file_url?: string;
  payment_reference?: string;
  table_type: 'service_provider' | 'reviewer';
}

export default function OwnerFinalApproval() {
  const location = useLocation();
  const { hasAccess, loading: roleLoading, userRole } = useRoleAccess(location.pathname);
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();

  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      
      // Buscar protocolos de service providers
      const { data: serviceProviderData, error: spError } = await supabase
        .from("service_provider_protocols")
        .select("id, protocol_number, provider_name, competence_month, total_amount, status, invoice_file_url, payment_reference")
        .eq("status", "awaiting_owner_approval")
        .order("created_at", { ascending: false });

      if (spError) throw spError;

      // Buscar protocolos de revisores com status master_final
      const { data: reviewerData, error: revError } = await supabase
        .from("reviewer_protocols")
        .select("id, protocol_number, reviewer_name, competence_month, total_amount, status, invoice_url, payment_reference")
        .eq("status", "master_final")
        .order("created_at", { ascending: false });

      if (revError) throw revError;

      // Combinar ambos os tipos de protocolos
      const serviceProviderProtocols = (serviceProviderData || []).map(p => ({
        ...p,
        table_type: 'service_provider' as const
      }));

      const reviewerProtocols = (reviewerData || []).map(p => ({
        id: p.id,
        protocol_number: p.protocol_number,
        provider_name: p.reviewer_name,
        competence_month: p.competence_month,
        total_amount: p.total_amount,
        status: p.status,
        invoice_file_url: p.invoice_url,
        payment_reference: p.payment_reference,
        table_type: 'reviewer' as const
      }));

      setProtocols([...serviceProviderProtocols, ...reviewerProtocols]);
    } catch (error: any) {
      toast.error("Erro ao carregar protocolos", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (protocol: Protocol) => {
    try {
      if (protocol.table_type === 'service_provider') {
        const { error } = await supabase
          .from("service_provider_protocols")
          .update({
            status: "approved",
          })
          .eq("id", protocol.id);

        if (error) throw error;
      } else {
        // Reviewer protocol
        const { error } = await supabase
          .from("reviewer_protocols")
          .update({
            status: "owner_approval",
            owner_approved_at: new Date().toISOString(),
            owner_approved_by: user?.id,
          })
          .eq("id", protocol.id);

        if (error) throw error;
      }

      toast.success("Protocolo aprovado com sucesso!");
      fetchProtocols();
    } catch (error: any) {
      toast.error("Erro ao aprovar protocolo", {
        description: error.message,
      });
    }
  };

  const handleReturn = async () => {
    if (!selectedProtocol || !returnReason.trim()) {
      toast.error("Por favor, informe o motivo da devolução");
      return;
    }

    try {
      if (selectedProtocol.table_type === 'service_provider') {
        const { error } = await supabase
          .from("service_provider_protocols")
          .update({
            status: "returned_for_adjustment",
            return_reason: returnReason,
          })
          .eq("id", selectedProtocol.id);

        if (error) throw error;
      } else {
        // Reviewer protocol - devolver para master_initial para reiniciar o processo
        const { error } = await supabase
          .from("reviewer_protocols")
          .update({
            status: "master_initial",
            return_reason: returnReason,
          })
          .eq("id", selectedProtocol.id);

        if (error) throw error;
      }

      toast.success("Protocolo devolvido para ajustes");
      setShowReturnDialog(false);
      setReturnReason("");
      setSelectedProtocol(null);
      fetchProtocols();
    } catch (error: any) {
      toast.error("Erro ao devolver protocolo", {
        description: error.message,
      });
    }
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  const sidebarOffset = isCollapsed ? 64 : 256;

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar userRole={userRole || 'operation'} />
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: `${sidebarOffset}px` }}
      >
        <Header userName={user?.email || 'User'} userRole={userRole || 'operation'} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Aprovação Final - Owner</h1>
              <p className="text-muted-foreground">
                Revise e aprove os protocolos para liberação de pagamento
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Protocolos Aguardando Aprovação Final</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : protocols.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum protocolo aguardando aprovação final
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Competência</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Nota Fiscal</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {protocols.map((protocol) => (
                        <TableRow key={protocol.id}>
                          <TableCell className="font-medium">
                            {protocol.protocol_number}
                          </TableCell>
                          <TableCell>{protocol.provider_name}</TableCell>
                          <TableCell>
                            {new Date(protocol.competence_month).toLocaleDateString("pt-BR", {
                              month: "long",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(protocol.total_amount)}
                          </TableCell>
                          <TableCell>
                            <ProtocolStatusBadge status={protocol.status} />
                          </TableCell>
                          <TableCell>
                            {protocol.invoice_file_url && (
                              <a
                                href={protocol.invoice_file_url}
                                download
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <Download className="h-4 w-4" />
                                Baixar
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProtocol(protocol);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApproval(protocol)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedProtocol(protocol);
                                setShowReturnDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Devolver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver Protocolo</DialogTitle>
            <DialogDescription>
              Informe o motivo da devolução para que o prestador possa fazer os ajustes necessários.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da Devolução</Label>
              <Textarea
                id="reason"
                placeholder="Descreva os ajustes necessários..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReturn}>
              Devolver para Ajustes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      {selectedProtocol && (
        <ProtocolDetailsDialog
          protocol={selectedProtocol}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}
    </div>
  );
}
