import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProtocolStatusBadgeProps {
  status: string;
  className?: string;
}

export function ProtocolStatusBadge({ status, className }: ProtocolStatusBadgeProps) {
  const statusConfig = {
    draft: {
      label: "Rascunho",
      variant: "secondary" as const,
      className: "bg-secondary/50 text-secondary-foreground"
    },
    awaiting_provider: {
      label: "Aguard. Prestador",
      variant: "default" as const,
      className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50"
    },
    awaiting_provider_data: {
      label: "Aguard. Dados Prestador",
      variant: "default" as const,
      className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50"
    },
    provider_approved: {
      label: "Aprovado Prestador",
      variant: "default" as const,
      className: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/50"
    },
    awaiting_master_initial: {
      label: "Aguard. Master Inicial",
      variant: "default" as const,
      className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50"
    },
    awaiting_master_final: {
      label: "Aguard. Master Final",
      variant: "default" as const,
      className: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50"
    },
    awaiting_owner_approval: {
      label: "Aguard. Owner",
      variant: "default" as const,
      className: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/50"
    },
    awaiting_final: {
      label: "Aguard. Aprovação Final",
      variant: "default" as const,
      className: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50"
    },
    approved: {
      label: "Aprovado",
      variant: "default" as const,
      className: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50"
    },
    completed: {
      label: "Concluído",
      variant: "default" as const,
      className: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50"
    },
    paid: {
      label: "Pago",
      variant: "default" as const,
      className: "bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border-emerald-600/50"
    },
    delayed: {
      label: "Atrasado",
      variant: "destructive" as const,
      className: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/50"
    },
    cancelled: {
      label: "Cancelado",
      variant: "destructive" as const,
      className: "bg-destructive/20 text-destructive border-destructive/50"
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, "border", className)}
    >
      {config.label}
    </Badge>
  );
}
