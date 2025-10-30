import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Clock, ExternalLink, Bug, Lightbulb, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

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
  type: string;
  jira_id: string | null;
}

interface TechDemandViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demand: TechDemand | null;
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

export const TechDemandViewDialog = ({ open, onOpenChange, demand, onEdit, onDelete, canManage }: TechDemandViewDialogProps) => {
  if (!demand) return null;

  const priorityInfo = priorityConfig[demand.priority as keyof typeof priorityConfig];
  const PriorityIcon = priorityInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Demanda</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {demand.company}
              </Badge>
              <Badge variant={demand.type === 'bug' ? 'destructive' : 'default'} className="text-sm flex items-center gap-2">
                {demand.type === 'bug' ? <Bug className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                {demand.type === 'bug' ? 'Bug' : 'Melhoria'}
              </Badge>
              {demand.jira_id && (
                <Badge variant="secondary" className="text-sm">
                  Jira: {demand.jira_id}
                </Badge>
              )}
            </div>
            <Badge className={`text-sm ${priorityInfo.color} flex items-center gap-2`}>
              <PriorityIcon className="h-4 w-4" />
              Prioridade: {priorityInfo.label}
            </Badge>
          </div>

          {/* Title */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Título</h3>
            <p className="text-lg font-semibold">{demand.title}</p>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Descrição</h3>
            <p className="text-sm whitespace-pre-wrap">{demand.description}</p>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Etapas</h3>
            <p className="text-sm">{demand.steps}</p>
          </div>

          {/* Error Message */}
          {demand.error_message && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Mensagem de Erro</h3>
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
                <pre className="whitespace-pre-wrap font-mono text-xs">{demand.error_message}</pre>
              </div>
            </div>
          )}

          {/* Image */}
          {demand.image_url && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Screenshot</h3>
              <img 
                src={demand.image_url} 
                alt="Screenshot da demanda"
                className="w-full rounded-lg border"
              />
            </div>
          )}

          {/* URL */}
          {demand.url && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Link</h3>
              <p className="text-sm text-primary">{demand.url}</p>
            </div>
          )}

          {/* Date */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Criado em</h3>
            <p className="text-sm">
              {format(new Date(demand.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex gap-2">
            {demand.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={demand.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Abrir documento
                </a>
              </Button>
            )}
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(demand);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(demand.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
