import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtocolStatusBadge } from "./ProtocolStatusBadge";
import { ProtocolWorkflowTimeline } from "./ProtocolWorkflowTimeline";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building, Mail, Phone, CreditCard, FileText, Calendar, CheckCircle, XCircle, Clock, User, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtocolDetailsDialogProps {
  protocol: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryEvent {
  timestamp: string;
  action: string;
  user_name: string | null;
  user_email: string | null;
  notes?: string;
  icon: any;
  color: string;
}

export function ProtocolDetailsDialog({ protocol, open, onOpenChange }: ProtocolDetailsDialogProps) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open && protocol) {
      buildHistory();
    }
  }, [open, protocol]);

  const formatDate = (date: string | null | undefined, formatString: string = "dd/MM/yyyy 'às' HH:mm") => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), formatString, { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const getUserInfo = async (userId: string | null) => {
    if (!userId) return { name: null, email: null };
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return { name: data?.full_name || null, email: data?.email || null };
    } catch {
      return { name: null, email: null };
    }
  };

  const buildHistory = async () => {
    setLoadingHistory(true);
    const events: HistoryEvent[] = [];

    try {
      // Created
      if (protocol.created_at) {
        const userInfo = await getUserInfo(protocol.created_by);
        events.push({
          timestamp: protocol.created_at,
          action: "Protocolo criado",
          user_name: userInfo.name,
          user_email: userInfo.email,
          icon: Calendar,
          color: "text-blue-600"
        });
      }

      // Owner initial approval
      if (protocol.owner_approved_at) {
        const userInfo = await getUserInfo(protocol.owner_approved_by);
        events.push({
          timestamp: protocol.owner_approved_at,
          action: "Aprovação inicial do Owner",
          user_name: userInfo.name,
          user_email: userInfo.email,
          icon: CheckCircle,
          color: "text-green-600"
        });
      }

      // Master initial approval
      if (protocol.master_initial_approved_at) {
        const userInfo = await getUserInfo(protocol.master_initial_approved_by);
        events.push({
          timestamp: protocol.master_initial_approved_at,
          action: "Aprovação inicial do Master",
          user_name: userInfo.name,
          user_email: userInfo.email,
          notes: "Enviado para preenchimento de dados pelo prestador",
          icon: CheckCircle,
          color: "text-green-600"
        });
      }

      // Provider data submitted
      if (protocol.provider_approved_at) {
        events.push({
          timestamp: protocol.provider_approved_at,
          action: "Dados bancários inseridos pelo prestador",
          user_name: protocol.provider_name,
          user_email: protocol.provider_email,
          notes: protocol.provider_approval_notes,
          icon: User,
          color: "text-purple-600"
        });
      }

      // Returned to provider
      if (protocol.returned_to_provider_at) {
        events.push({
          timestamp: protocol.returned_to_provider_at,
          action: "Devolvido ao prestador",
          user_name: null,
          user_email: null,
          notes: protocol.return_reason,
          icon: ArrowRight,
          color: "text-orange-600"
        });
      }

      // Master final approval
      if (protocol.master_final_approved_at) {
        const userInfo = await getUserInfo(protocol.master_final_approved_by);
        events.push({
          timestamp: protocol.master_final_approved_at,
          action: "Validação final do Master",
          user_name: userInfo.name,
          user_email: userInfo.email,
          icon: CheckCircle,
          color: "text-green-600"
        });
      }

      // Final approval (owner)
      if (protocol.final_approved_at) {
        const userInfo = await getUserInfo(protocol.final_approved_by);
        events.push({
          timestamp: protocol.final_approved_at,
          action: "Aprovação final do Owner",
          user_name: userInfo.name,
          user_email: userInfo.email,
          notes: protocol.final_approval_notes,
          icon: CheckCircle,
          color: "text-green-600"
        });
      }

      // Payment requested
      if (protocol.payment_requested_at) {
        events.push({
          timestamp: protocol.payment_requested_at,
          action: "Pagamento solicitado",
          user_name: null,
          user_email: null,
          icon: Clock,
          color: "text-yellow-600"
        });
      }

      // Paid
      if (protocol.paid_at) {
        events.push({
          timestamp: protocol.paid_at,
          action: "Pagamento realizado",
          user_name: null,
          user_email: null,
          notes: protocol.payment_reference ? `Referência: ${protocol.payment_reference}` : undefined,
          icon: CheckCircle,
          color: "text-blue-600"
        });
      }

      // Sort by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setHistory(events);
    } finally {
      setLoadingHistory(false);
    }
  };


  if (!protocol) return null;

  const expensesData = protocol.expenses_data || [];
  const workflowSteps = protocol.workflow_steps || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{protocol.protocol_number}</DialogTitle>
              <DialogDescription>
                Competência: {formatDate(protocol.competence_month, "MMMM 'de' yyyy")}
              </DialogDescription>
            </div>
            <ProtocolStatusBadge status={protocol.status} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="expenses">
              Pedidos ({expensesData.length})
            </TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Dados do Prestador
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="text-base">{protocol.provider_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {protocol.email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {protocol.phone || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CPF/CNPJ</p>
                  <p className="text-base">{protocol.cpf || protocol.cnpj || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Chave PIX</p>
                  <p className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {protocol.pix_key || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Banco</p>
                  <p className="text-base">{protocol.bank_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agência</p>
                  <p className="text-base">{protocol.bank_agency || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conta</p>
                  <p className="text-base">{protocol.bank_account || "N/A"} {protocol.account_type ? `(${protocol.account_type})` : ""}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total de Pedidos:</span>
                  <span className="font-semibold">{protocol.expense_count || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Valor Total:</span>
                  <span className="font-bold text-lg">{formatCurrency(protocol.total_amount || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Status do Pagamento:</span>
                  <Badge variant={protocol.status === "paid" ? "default" : "secondary"}>
                    {protocol.status === "paid" ? "Pago" : "Pendente"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Pedido</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Documentos</TableHead>
                      <TableHead>Data Entrega</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhum pedido registrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      expensesData.map((expense: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{expense.expense_id}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{expense.document_count || 0} docs</TableCell>
                          <TableCell>{formatDate(expense.delivered_at, "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.amount || 0)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Timeline do Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                {workflowSteps.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma etapa de workflow registrada
                  </p>
                ) : (
                  <ProtocolWorkflowTimeline steps={workflowSteps} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico Completo</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <p className="text-center text-muted-foreground py-8">Carregando histórico...</p>
                ) : history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum evento registrado</p>
                ) : (
                  <div className="relative space-y-6">
                    {/* Timeline line */}
                    <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-border" />
                    
                    {history.map((event, index) => {
                      const Icon = event.icon;
                      return (
                        <div key={index} className="relative flex gap-4 pb-6 last:pb-0">
                          {/* Icon */}
                          <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 ${event.color} border-current`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 pt-0.5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <p className="font-medium">{event.action}</p>
                                
                                {(event.user_name || event.user_email) && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span>
                                      {event.user_name || event.user_email}
                                    </span>
                                  </div>
                                )}
                                
                                {event.notes && (
                                  <p className="text-sm text-muted-foreground italic">
                                    {event.notes}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                                <Clock className="h-3 w-3" />
                                {formatDate(event.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
