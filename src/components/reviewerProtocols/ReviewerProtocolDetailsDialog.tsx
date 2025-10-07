import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/currency";
import { ReviewerProtocolStatusBadge } from "./ReviewerProtocolStatusBadge";
import { CheckCircle2, Clock } from "lucide-react";

interface ReviewerProtocolDetailsDialogProps {
  protocol: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReviewerProtocolDetailsDialog = ({
  protocol,
  open,
  onOpenChange,
}: ReviewerProtocolDetailsDialogProps) => {
  if (!protocol) return null;

  const ordersData = protocol.orders_data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{protocol.protocol_number}</DialogTitle>
              <DialogDescription>
                Competência: {format(new Date(protocol.competence_month), "MMMM 'de' yyyy", { locale: ptBR })}
              </DialogDescription>
            </div>
            <ReviewerProtocolStatusBadge status={protocol.status} />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reviewer Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Revisor</p>
                  <p className="font-medium">{protocol.reviewer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{protocol.reviewer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-medium text-xs">{protocol.reviewer_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{protocol.order_count}</div>
                <p className="text-xs text-muted-foreground">Pedidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{protocol.document_count}</div>
                <p className="text-xs text-muted-foreground">Documentos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{formatCurrency(protocol.total_amount)}</div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Approval Timeline */}
          <div>
            <h4 className="font-semibold mb-4">Timeline de Aprovações</h4>
            <div className="space-y-3">
              <TimelineStep
                title="Criado"
                date={protocol.created_at}
                completed={true}
              />
              <TimelineStep
                title="Aprovação Master - Inicial"
                date={protocol.master_initial_approved_at}
                completed={!!protocol.master_initial_approved_at}
                notes={protocol.master_initial_notes}
              />
              <TimelineStep
                title="Inserção de Dados e Nota Fiscal"
                date={protocol.data_inserted_at}
                completed={!!protocol.data_inserted_at}
                notes={protocol.assigned_operation_user_id ? `Responsável: ${protocol.assigned_operation_user_id}` : undefined}
              />
              <TimelineStep
                title="Aprovação Master - Final"
                date={protocol.master_final_approved_at}
                completed={!!protocol.master_final_approved_at}
                notes={protocol.master_final_notes}
              />
              <TimelineStep
                title="Aprovação Owner"
                date={protocol.owner_approved_at}
                completed={!!protocol.owner_approved_at}
                notes={protocol.owner_approval_notes}
              />
              <TimelineStep
                title="Pagamento"
                date={protocol.paid_at}
                completed={!!protocol.paid_at}
                notes={protocol.payment_reference}
              />
            </div>
          </div>

          <Separator />

          {/* Orders List */}
          <div>
            <h4 className="font-semibold mb-4">Pedidos Incluídos ({ordersData.length})</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">Pedido</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Cliente</th>
                    <th className="px-4 py-2 text-center text-sm font-medium">Docs</th>
                    <th className="px-4 py-2 text-center text-sm font-medium">Entrega</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersData.map((order: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{order.numero_pedido}</Badge>
                      </td>
                      <td className="px-4 py-3">{order.cliente || '-'}</td>
                      <td className="px-4 py-3 text-center">{order.quantidade_documentos}</td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {order.data_entrega ? format(new Date(order.data_entrega), "dd/MM/yyyy") : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency((order.quantidade_documentos || 0) * 2.00)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TimelineStep = ({
  title,
  date,
  completed,
  notes,
}: {
  title: string;
  date?: string;
  completed: boolean;
  notes?: string;
}) => {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Clock className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="w-px h-full bg-border mt-1" />
      </div>
      <div className="flex-1 pb-4">
        <p className="font-medium">{title}</p>
        {date && (
          <p className="text-sm text-muted-foreground">
            {format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}
        {notes && (
          <p className="text-sm text-muted-foreground mt-1">{notes}</p>
        )}
      </div>
    </div>
  );
};