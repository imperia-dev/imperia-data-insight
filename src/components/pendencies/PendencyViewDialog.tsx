import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Paperclip, User, FileText, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Pendency {
  id: string;
  order_id: string;
  old_order_text_id: string | null;
  c4u_id: string;
  error_type: string;
  error_document_count: number | null;
  description: string;
  treatment: string | null;
  status: string;
  created_at: string;
  customer: string | null;
  attachments: any[] | null;
  source?: string;
  orders?: {
    order_number: string;
  };
}

interface PendencyViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendency: Pendency | null;
}

const getErrorTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    nao_e_erro: "Não é erro",
    falta_de_dados: "Falta de dados",
    apostila: "Apostila",
    erro_em_data: "Erro em data",
    nome_separado: "Nome separado",
    texto_sem_traduzir: "Texto sem traduzir",
    solicitacao_do_cliente: "Solicitação do Cliente",
    ordem_dos_nomes: "Ordem dos nomes",
    sexo_divergente: "Sexo divergente",
    rg_divergente: "RG divergente",
  };
  return labels[type] || type;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Pendente</Badge>;
    case "resolved":
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Resolvido</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const PendencyViewDialog = ({ open, onOpenChange, pendency }: PendencyViewDialogProps) => {
  if (!pendency) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Pendência</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {pendency.customer || 'Cidadania4y'}
              </Badge>
              {pendency.source === 'customer_request' && (
                <Badge variant="secondary" className="text-sm bg-blue-500 text-white">
                  Solicitação do Cliente
                </Badge>
              )}
            </div>
            {getStatusBadge(pendency.status)}
          </div>

          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Pedido
              </h3>
              <p className="text-lg font-semibold">
                {pendency.orders?.order_number || pendency.old_order_text_id || pendency.order_id || '-'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ID C4U
              </h3>
              <p className="text-lg font-semibold">{pendency.c4u_id || '-'}</p>
            </div>
          </div>

          {/* Error Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Tipo de Erro
              </h3>
              <p className="text-sm">{getErrorTypeLabel(pendency.error_type)}</p>
            </div>
            {pendency.error_document_count && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Qtd. Documentos</h3>
                <p className="text-sm">{pendency.error_document_count}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Descrição</h3>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
              {pendency.description || '-'}
            </p>
          </div>

          {/* Treatment */}
          {pendency.treatment && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Tratativa</h3>
              <p className="text-sm whitespace-pre-wrap bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                {pendency.treatment}
              </p>
            </div>
          )}

          {/* Attachments */}
          {pendency.attachments && Array.isArray(pendency.attachments) && pendency.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos
              </h3>
              <div className="flex flex-col gap-2">
                {pendency.attachments.map((file: any, index: number) => (
                  <a
                    key={index}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted/50 p-2 rounded-md"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {(file.size / 1024).toFixed(2)} KB
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Created At */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Criado em
            </h3>
            <p className="text-sm">
              {format(new Date(pendency.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
