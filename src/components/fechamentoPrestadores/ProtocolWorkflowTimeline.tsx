import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateBR } from "@/lib/dateUtils";
import { CheckCircle, Clock, AlertCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStep {
  step_name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  assigned_to?: string;
  notes?: string;
  due_date?: string;
}

interface ProtocolWorkflowTimelineProps {
  steps: WorkflowStep[];
}

export function ProtocolWorkflowTimeline({ steps }: ProtocolWorkflowTimelineProps) {
  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case "delayed":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStepLabel = (stepName: string) => {
    const labels: Record<string, string> = {
      provider_review: "Revisão do Prestador",
      internal_validation: "Validação Interna",
      final_approval: "Aprovação Final",
      payment_processing: "Processamento Pagamento",
      payment_completed: "Pagamento Concluído"
    };
    return labels[stepName] || stepName;
  };

  return (
    <div className="space-y-6">
      {steps.map((step, index) => (
        <div key={index} className="relative pl-8">
          {/* Timeline line */}
          {index < steps.length - 1 && (
            <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
          )}

          {/* Step icon */}
          <div className="absolute left-0 top-1">
            {getStepIcon(step.status)}
          </div>

          {/* Step content */}
          <div>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">
                  {getStepLabel(step.step_name)}
                </h4>
                <p className={cn(
                  "text-xs",
                  step.status === "completed" && "text-green-600",
                  step.status === "in_progress" && "text-blue-600",
                  step.status === "delayed" && "text-red-600",
                  step.status === "pending" && "text-muted-foreground"
                )}>
                  {step.status === "completed" && "Concluído"}
                  {step.status === "in_progress" && "Em andamento"}
                  {step.status === "delayed" && "Atrasado"}
                  {step.status === "pending" && "Pendente"}
                </p>
              </div>

              <div className="text-right space-y-1">
                <p className="text-xs text-muted-foreground">
                  Iniciado: {formatDateBR(step.started_at)}
                </p>
                {step.completed_at && (
                  <p className="text-xs text-green-600">
                    Concluído: {formatDateBR(step.completed_at)}
                  </p>
                )}
                {step.due_date && !step.completed_at && (
                  <p className="text-xs text-orange-600">
                    Prazo: {formatDateBR(step.due_date, "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            </div>

            {step.assigned_to && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Responsável: {step.assigned_to}</span>
              </div>
            )}

            {step.notes && (
              <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                {step.notes}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
