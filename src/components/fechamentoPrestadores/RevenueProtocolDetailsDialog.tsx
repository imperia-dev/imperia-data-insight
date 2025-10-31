import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { formatDateBR } from "@/lib/dateUtils";

interface RevenueProtocol {
  id: string;
  protocol_number: string;
  competence_month: string;
  total_ids: number;
  total_pages: number;
  total_value: number;
  avg_value_per_document: number;
  product_1_count: number;
  product_2_count: number;
  created_at: string;
  payment_status: string | null;
  payment_requested_at: string | null;
  payment_received_at: string | null;
  document_data?: any;
}

interface RevenueProtocolDetailsDialogProps {
  protocol: RevenueProtocol | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RevenueProtocolDetailsDialog({ 
  protocol, 
  open, 
  onOpenChange 
}: RevenueProtocolDetailsDialogProps) {
  if (!protocol) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Protocolo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Número do Protocolo</p>
                <p className="text-sm font-mono">{protocol.protocol_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Competência</p>
                <p className="text-sm">
                  {formatDateBR(protocol.competence_month, "MMMM 'de' yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data de Criação</p>
                <p className="text-sm">
                  {formatDateBR(protocol.created_at)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status de Pagamento</p>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  protocol.payment_status === 'paid' 
                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                    : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                }`}>
                  {protocol.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(protocol.total_value)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Média por Documento</p>
                <p className="text-2xl font-bold">{formatCurrency(protocol.avg_value_per_document)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de IDs</p>
                <p className="text-xl font-semibold">{protocol.total_ids}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Páginas</p>
                <p className="text-xl font-semibold">{protocol.total_pages}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Produtos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produto 1</p>
                <p className="text-xl font-semibold">{protocol.product_1_count} unidades</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produto 2</p>
                <p className="text-xl font-semibold">{protocol.product_2_count} unidades</p>
              </div>
            </CardContent>
          </Card>

          {protocol.payment_requested_at && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pagamento Solicitado em</p>
                  <p className="text-sm">
                    {formatDateBR(protocol.payment_requested_at)}
                  </p>
                </div>
                {protocol.payment_received_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pagamento Recebido em</p>
                    <p className="text-sm">
                      {formatDateBR(protocol.payment_received_at)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
