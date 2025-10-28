import { Badge } from "@/components/ui/badge";

interface ReviewerProtocolStatusBadgeProps {
  status: string;
}

export const ReviewerProtocolStatusBadge = ({ status }: ReviewerProtocolStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Rascunho', variant: 'secondary' as const };
      case 'pending_approval':
        return { label: 'Aguardando Master Inicial', variant: 'default' as const };
      case 'master_initial':
        return { label: 'Aguardando Dados - Operation', variant: 'outline' as const };
      case 'data_inserted':
        return { label: 'Dados Inseridos', variant: 'outline' as const };
      case 'master_final':
        return { label: 'Aguard. Owner', variant: 'default' as const };
      case 'owner_approval':
        return { label: 'Aprovado Owner', variant: 'default' as const };
      case 'sent_to_finance':
        return { label: 'Enviado p/ Financeiro', variant: 'default' as const };
      case 'paid':
        return { label: 'Pago', variant: 'default' as const };
      case 'completed':
        return { label: 'Concluído', variant: 'default' as const, isGreen: true };
      case 'cancelled':
        return { label: 'Cancelado', variant: 'destructive' as const };
      default:
        return { label: status, variant: 'secondary' as const };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant}
      className={config.isGreen ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}
    >
      {config.label}
    </Badge>
  );
};