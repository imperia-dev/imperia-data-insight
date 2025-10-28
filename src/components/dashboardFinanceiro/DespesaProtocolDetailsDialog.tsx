import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DespesaProtocolDetailsDialogProps {
  protocol: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DespesaProtocolDetailsDialog({ protocol, open, onOpenChange }: DespesaProtocolDetailsDialogProps) {
  if (!protocol) return null;

  const expenses = protocol.closing_data || [];
  const companyExpenses = expenses.filter((e: any) => e.tipo_fornecedor === 'empresa' || e.tipo_despesa === 'empresa');
  const providerExpenses = expenses.filter((e: any) => e.tipo_fornecedor === 'prestador' || e.tipo_despesa === 'prestador');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Protocolo {protocol.protocol_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Competência</p>
              <p className="font-semibold">
                {format(new Date(protocol.competence_month), "MMMM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={protocol.status === 'closed' ? 'outline' : 'default'}>
                {protocol.status === 'draft' && 'Rascunho'}
                {protocol.status === 'approved' && 'Aprovado'}
                {protocol.status === 'closed' && 'Fechado'}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Despesas Empresa</p>
              <p className="text-xl font-bold">{formatCurrency(protocol.total_company_expenses || 0)}</p>
              <p className="text-xs text-muted-foreground">{companyExpenses.length} despesas</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Despesas Prestador</p>
              <p className="text-xl font-bold">{formatCurrency(protocol.total_service_provider_expenses || 0)}</p>
              <p className="text-xs text-muted-foreground">{providerExpenses.length} despesas</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Geral</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(protocol.total_amount || 0)}</p>
              <p className="text-xs text-muted-foreground">{protocol.expense_count} despesas</p>
            </div>
          </div>

          {protocol.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{protocol.notes}</p>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold mb-3">Despesas Incluídas</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Competência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {expense.tipo_fornecedor === 'empresa' || expense.tipo_despesa === 'empresa' ? 'Empresa' : 'Prestador'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(expense.amount_base || expense.amount_original || 0)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(expense.data_competencia), "dd/MM/yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {protocol.approved_at && (
            <>
              <Separator />
              <div className="text-sm text-muted-foreground">
                Aprovado em {format(new Date(protocol.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
