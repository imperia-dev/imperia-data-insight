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
import { Building, Mail, Phone, CreditCard, FileText, Calendar, CheckCircle, XCircle } from "lucide-react";

interface ProtocolDetailsDialogProps {
  protocol: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProtocolDetailsDialog({ protocol, open, onOpenChange }: ProtocolDetailsDialogProps) {
  if (!protocol) return null;

  const expensesData = protocol.expenses_data || [];
  const workflowSteps = protocol.workflow_steps || [];

  const formatDate = (date: string | null | undefined, formatString: string = "dd/MM/yyyy 'às' HH:mm") => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), formatString, { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

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
              Despesas ({expensesData.length})
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
                  <p className="text-base">{protocol.supplier_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {protocol.supplier_email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {protocol.supplier_phone || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CPF/CNPJ</p>
                  <p className="text-base">{protocol.supplier_cpf || protocol.supplier_cnpj || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Chave PIX</p>
                  <p className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {protocol.supplier_pix_key || "N/A"}
                  </p>
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
                  <span className="text-muted-foreground">Total de Despesas:</span>
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
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhuma despesa registrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      expensesData.map((expense: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>{formatDate(expense.data_competencia, "dd/MM/yyyy")}</TableCell>
                          <TableCell>{expense.tipo_fornecedor}</TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.amount_base || expense.amount_original || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={expense.status === "pago" ? "default" : "secondary"}>
                              {expense.status}
                            </Badge>
                          </TableCell>
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
                <CardTitle>Histórico de Alterações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Protocolo criado</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(protocol.created_at)}
                      </p>
                    </div>
                  </div>

                  {protocol.approved_at && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Protocolo aprovado</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(protocol.approved_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {protocol.paid_at && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Pagamento realizado</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(protocol.paid_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {protocol.cancelled_at && (
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Protocolo cancelado</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(protocol.cancelled_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
