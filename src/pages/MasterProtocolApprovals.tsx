import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AssignOperationUserDialog } from "@/components/reviewerProtocols/AssignOperationUserDialog";

interface Protocol {
  id: string;
  protocol_number: string;
  provider_name: string;
  reviewer_name?: string;
  competence_month: string;
  total_amount: number;
  expense_count: number;
  status: string;
  created_at: string;
  invoice_file_url?: string;
  invoice_amount?: number;
  return_reason?: string;
  table_type?: 'service_provider' | 'reviewer';
}

export default function MasterProtocolApprovals() {
  const [initialProtocols, setInitialProtocols] = useState<Protocol[]>([]);
  const [finalProtocols, setFinalProtocols] = useState<Protocol[]>([]);
  const [reviewerProtocols, setReviewerProtocols] = useState<Protocol[]>([]);
  const [reviewerFinalProtocols, setReviewerFinalProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedReviewerProtocolId, setSelectedReviewerProtocolId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      
      const { data: initial, error: initialError } = await supabase
        .from("service_provider_protocols")
        .select("*")
        .eq("status", "awaiting_master_initial")
        .order("created_at", { ascending: false });

      if (initialError) throw initialError;

      const { data: final, error: finalError } = await supabase
        .from("service_provider_protocols")
        .select("*")
        .eq("status", "awaiting_master_final")
        .order("created_at", { ascending: false });

      if (finalError) throw finalError;

      const { data: reviewer, error: reviewerError } = await supabase
        .from("reviewer_protocols")
        .select("*")
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false });

      if (reviewerError) throw reviewerError;

      // Buscar reviewer_protocols aguardando aprovação final do master (após operation inserir dados)
      const { data: reviewerFinal, error: reviewerFinalError } = await supabase
        .from("reviewer_protocols")
        .select("*")
        .eq("status", "operation_data_filled")
        .order("created_at", { ascending: false });

      if (reviewerFinalError) throw reviewerFinalError;

      setInitialProtocols((initial || []).map(p => ({ ...p, table_type: 'service_provider' as const })));
      setFinalProtocols((final || []).map(p => ({ ...p, table_type: 'service_provider' as const })));
      setReviewerProtocols((reviewer || []).map(p => ({ 
        ...p, 
        table_type: 'reviewer' as const,
        provider_name: p.reviewer_email || p.reviewer_name || 'Unknown',
        expense_count: p.document_count || 0
      })));
      setReviewerFinalProtocols((reviewerFinal || []).map(p => ({ 
        ...p, 
        table_type: 'reviewer' as const,
        provider_name: p.reviewer_email || p.reviewer_name || 'Unknown',
        expense_count: p.document_count || 0,
        invoice_file_url: p.invoice_url,
        invoice_amount: p.invoice_amount
      })));
    } catch (error: any) {
      toast({
        title: "Erro ao carregar protocolos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewerApproval = (protocolId: string) => {
    // Abrir dialog para vincular usuário operation
    setSelectedReviewerProtocolId(protocolId);
    setShowAssignDialog(true);
  };

  const handleReviewerFinalApproval = async (protocolId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("reviewer_protocols")
        .update({
          status: "master_final",
          master_final_approved_by: user?.id,
          master_final_approved_at: new Date().toISOString(),
        })
        .eq("id", protocolId);

      if (error) throw error;

      toast({
        title: "Aprovação concluída",
        description: "Protocolo enviado para aprovação final do Owner",
      });

      fetchProtocols();
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInitialApproval = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from("service_provider_protocols")
        .update({
          status: "awaiting_provider_data",
          master_initial_approved_by: (await supabase.auth.getUser()).data.user?.id,
          master_initial_approved_at: new Date().toISOString(),
        })
        .eq("id", protocolId);

      if (error) throw error;

      toast({
        title: "Protocolo aprovado",
        description: "Protocolo enviado para preenchimento de dados pelo prestador",
      });

      fetchProtocols();
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFinalApproval = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from("service_provider_protocols")
        .update({
          status: "awaiting_owner_approval",
          master_final_approved_by: (await supabase.auth.getUser()).data.user?.id,
          master_final_approved_at: new Date().toISOString(),
        })
        .eq("id", protocolId);

      if (error) throw error;

      toast({
        title: "Validação concluída",
        description: "Protocolo enviado para aprovação do owner",
      });

      fetchProtocols();
    } catch (error: any) {
      toast({
        title: "Erro ao validar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReturn = async () => {
    if (!selectedProtocol || !returnReason.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, informe o motivo do retorno",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("service_provider_protocols")
        .update({
          status: "returned_for_adjustment",
          returned_to_provider_at: new Date().toISOString(),
          return_reason: returnReason,
        })
        .eq("id", selectedProtocol.id);

      if (error) throw error;

      toast({
        title: "Protocolo retornado",
        description: "O prestador foi notificado para realizar os ajustes necessários",
      });

      setShowReturnDialog(false);
      setReturnReason("");
      setSelectedProtocol(null);
      fetchProtocols();
    } catch (error: any) {
      toast({
        title: "Erro ao retornar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const ProtocolTable = ({ protocols, isInitial, isReviewer, isReviewerFinal }: { 
    protocols: Protocol[]; 
    isInitial: boolean; 
    isReviewer?: boolean;
    isReviewerFinal?: boolean;
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Protocolo</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Competência</TableHead>
          <TableHead>Valor Total</TableHead>
          <TableHead>Despesas</TableHead>
          {!isInitial && <TableHead>Nota Fiscal</TableHead>}
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {protocols.length === 0 ? (
          <TableRow>
            <TableCell colSpan={isInitial ? 6 : 7} className="text-center text-muted-foreground">
              Nenhum protocolo aguardando aprovação
            </TableCell>
          </TableRow>
        ) : (
          protocols.map((protocol) => (
            <TableRow key={protocol.id}>
              <TableCell className="font-medium">{protocol.protocol_number}</TableCell>
              <TableCell>{protocol.provider_name}</TableCell>
              <TableCell>
                {new Date(protocol.competence_month + 'T12:00:00').toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
              </TableCell>
              <TableCell>{formatCurrency(protocol.total_amount)}</TableCell>
              <TableCell>{protocol.expense_count}</TableCell>
              {!isInitial && (
                <TableCell>
                  {protocol.invoice_file_url ? (
                    <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400">
                      {formatCurrency(protocol.invoice_amount || 0)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sem NF</Badge>
                  )}
                </TableCell>
              )}
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedProtocol(protocol);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (isReviewer) {
                        handleReviewerApproval(protocol.id);
                      } else if (isReviewerFinal) {
                        handleReviewerFinalApproval(protocol.id);
                      } else if (isInitial) {
                        handleInitialApproval(protocol.id);
                      } else {
                        handleFinalApproval(protocol.id);
                      }
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                  {!isInitial && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedProtocol(protocol);
                        setShowReturnDialog(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Retornar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const { mainContainerClass } = usePageLayout();
  const { userRole } = useRoleAccess('/master-protocol-approvals');

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName="" userRole={userRole} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Aprovações Master</h1>
              <p className="text-muted-foreground mt-2">Gerencie as aprovações de protocolos de prestadores</p>
            </div>

            <Tabs defaultValue="initial" className="w-full">
        <TabsList>
          <TabsTrigger value="initial">
            Aprovação Inicial ({initialProtocols.length})
          </TabsTrigger>
          <TabsTrigger value="final">
            Validação Final ({finalProtocols.length})
          </TabsTrigger>
          <TabsTrigger value="reviewer">
            Protocolos Revisores - Inicial ({reviewerProtocols.length})
          </TabsTrigger>
          <TabsTrigger value="reviewer-final">
            Protocolos Revisores - Final ({reviewerFinalProtocols.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="initial">
          <Card>
            <CardHeader>
              <CardTitle>Aprovação Inicial</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <ProtocolTable protocols={initialProtocols} isInitial={true} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final">
          <Card>
            <CardHeader>
              <CardTitle>Validação Final</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <ProtocolTable protocols={finalProtocols} isInitial={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewer">
          <Card>
            <CardHeader>
              <CardTitle>Protocolos de Revisores - Aprovação Inicial</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <ProtocolTable protocols={reviewerProtocols} isInitial={true} isReviewer={true} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewer-final">
          <Card>
            <CardHeader>
              <CardTitle>Protocolos de Revisores - Aprovação Final</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <ProtocolTable protocols={reviewerFinalProtocols} isInitial={false} isReviewerFinal={true} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
            </Tabs>

            <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar para Ajustes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Descreva os ajustes necessários para o prestador:
            </p>
            <Textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Ex: Valor da nota fiscal não confere com o total das despesas..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReturn}>Retornar Protocolo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Protocolo</DialogTitle>
          </DialogHeader>
          {selectedProtocol && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Protocolo</p>
                  <p className="text-sm text-muted-foreground">{selectedProtocol.protocol_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Fornecedor</p>
                  <p className="text-sm text-muted-foreground">{selectedProtocol.provider_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Valor Total</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedProtocol.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Despesas</p>
                  <p className="text-sm text-muted-foreground">{selectedProtocol.expense_count}</p>
                </div>
                {selectedProtocol.invoice_amount && (
                  <div>
                    <p className="text-sm font-medium">Valor da NF</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(selectedProtocol.invoice_amount)}</p>
                  </div>
                )}
                {selectedProtocol.invoice_file_url && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium mb-2">Nota Fiscal</p>
                    <Button asChild variant="outline">
                      <a href={selectedProtocol.invoice_file_url} download>
                        Baixar Nota Fiscal
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

            <AssignOperationUserDialog
              open={showAssignDialog}
              onOpenChange={setShowAssignDialog}
              protocolId={selectedReviewerProtocolId}
              onSuccess={fetchProtocols}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
