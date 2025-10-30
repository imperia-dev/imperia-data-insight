import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, Trash2, AlertCircle, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TechDemand {
  id: string;
  company: string;
  title: string;
  description: string;
  steps: string;
  error_message: string | null;
  url: string | null;
  image_url: string | null;
  status: string;
  priority: string;
  created_at: string;
  assigned_to: string | null;
}

interface TechDemandCardProps {
  demand: TechDemand;
  onEdit: (demand: TechDemand) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}

const priorityConfig = {
  low: { label: "Baixa", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", icon: Clock },
  medium: { label: "Média", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300", icon: AlertCircle },
  high: { label: "Alta", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", icon: AlertTriangle },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", icon: AlertTriangle },
};

export const TechDemandCard = ({ demand, onEdit, onDelete, canManage }: TechDemandCardProps) => {
  const priorityInfo = priorityConfig[demand.priority as keyof typeof priorityConfig];
  const PriorityIcon = priorityInfo.icon;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <Badge variant="outline" className="text-xs">
          {demand.company}
        </Badge>
        <Badge className={`text-xs ${priorityInfo.color} flex items-center gap-1`}>
          <PriorityIcon className="h-3 w-3" />
          {priorityInfo.label}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm mb-2 line-clamp-2">
        {demand.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
        {demand.description}
      </p>

      {/* Error Message */}
      {demand.error_message && (
        <div className="bg-destructive/10 text-destructive text-xs p-2 rounded mb-3">
          <p className="font-semibold">Erro:</p>
          <p className="line-clamp-2">{demand.error_message}</p>
        </div>
      )}

      {/* Image */}
      {demand.image_url && (
        <img 
          src={demand.image_url} 
          alt="Screenshot"
          className="w-full h-32 object-cover rounded mb-3"
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t">
        <span className="text-xs text-muted-foreground">
          {format(new Date(demand.created_at), "dd/MM/yy", { locale: ptBR })}
        </span>
        <div className="flex gap-1">
          {demand.url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              asChild
            >
              <a href={demand.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
          {canManage && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(demand)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onDelete(demand.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
