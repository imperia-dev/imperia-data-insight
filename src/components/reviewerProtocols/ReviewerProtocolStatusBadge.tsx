import { Badge } from "@/components/ui/badge";

interface ReviewerProtocolStatusBadgeProps {
  status: string;
}

export const ReviewerProtocolStatusBadge = ({ status }: ReviewerProtocolStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Rascunho', variant: 'secondary' as const };
      case 'awaiting_reviewer':
        return { label: 'Aguardando Revisor', variant: 'default' as const };
      case 'master_initial':
        return { label: 'Master - Inicial', variant: 'outline' as const };
      case 'master_final':
        return { label: 'Master - Final', variant: 'outline' as const };
      case 'owner_approval':
        return { label: 'Aguardando Owner', variant: 'outline' as const };
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