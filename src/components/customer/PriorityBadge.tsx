import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowUp, Minus, AlertTriangle } from "lucide-react";

interface PriorityBadgeProps {
  priority: 'baixa' | 'normal' | 'alta' | 'urgente';
}

export const PriorityBadge = ({ priority }: PriorityBadgeProps) => {
  const priorityConfig = {
    baixa: { 
      label: 'Baixa', 
      variant: 'secondary' as const,
      icon: Minus 
    },
    normal: { 
      label: 'Normal', 
      variant: 'outline' as const,
      icon: Minus 
    },
    alta: { 
      label: 'Alta', 
      variant: 'default' as const,
      icon: ArrowUp 
    },
    urgente: { 
      label: 'Urgente', 
      variant: 'destructive' as const,
      icon: AlertTriangle 
    }
  };

  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};
