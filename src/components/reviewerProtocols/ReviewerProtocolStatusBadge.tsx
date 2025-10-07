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
        return { label: 'Aguardando Aprovação', variant: 'default' as const };
      case 'reviewer_approved':
        return { label: 'Aprovado pelo Revisor', variant: 'default' as const };
      case 'master_initial':
        return { label: 'Master Inicial - Aguardando Dados', variant: 'outline' as const };
      case 'data_inserted':
        return { label: 'Dados Inseridos', variant: 'outline' as const };
      case 'master_final':
        return { label: 'Aprovação Master Final', variant: 'outline' as const };
      case 'owner_approval':
        return { label: 'Aprovado Owner', variant: 'default' as const };
      case 'paid':
        return { label: 'Pago', variant: 'default' as const };
      case 'cancelled':
        return { label: 'Cancelado', variant: 'destructive' as const };
      default:
        return { label: status, variant: 'secondary' as const };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};