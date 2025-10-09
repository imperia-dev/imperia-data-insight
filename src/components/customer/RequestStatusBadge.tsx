import { Badge } from "@/components/ui/badge";

interface RequestStatusBadgeProps {
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'converted';
}

export const RequestStatusBadge = ({ status }: RequestStatusBadgeProps) => {
  const statusConfig = {
    pending: { label: 'Pendente', variant: 'secondary' as const },
    under_review: { label: 'Em Análise', variant: 'default' as const },
    approved: { label: 'Aprovado', variant: 'default' as const },
    rejected: { label: 'Rejeitado', variant: 'destructive' as const },
    converted: { label: 'Convertido', variant: 'default' as const }
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};
