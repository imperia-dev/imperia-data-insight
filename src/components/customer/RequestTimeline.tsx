import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Clock, XCircle, FileCheck, AlertCircle } from "lucide-react";

type StatusHistoryEntry = {
  id: string;
  status: string;
  changed_at: string;
  notes: string | null;
  changed_by: string | null;
  metadata: any;
};

interface RequestTimelineProps {
  history: StatusHistoryEntry[];
}

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        icon: Clock,
        label: 'Pendente',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
      };
    case 'under_review':
      return {
        icon: AlertCircle,
        label: 'Em Análise',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      };
    case 'approved':
      return {
        icon: Check,
        label: 'Aprovado',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
      };
    case 'rejected':
      return {
        icon: XCircle,
        label: 'Rejeitado',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
      };
    case 'converted':
      return {
        icon: FileCheck,
        label: 'Convertido',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
      };
    default:
      return {
        icon: Clock,
        label: status,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
      };
  }
};

export function RequestTimeline({ history }: RequestTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Nenhum histórico disponível
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold mb-4">Histórico de Status</h4>
      <div className="relative pl-6 space-y-6">
        {/* Vertical line */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
        
        {history.map((entry, index) => {
          const statusInfo = getStatusInfo(entry.status);
          const Icon = statusInfo.icon;
          const isLast = index === history.length - 1;

          return (
            <div key={entry.id} className="relative">
              {/* Icon circle */}
              <div
                className={`absolute left-[-1.375rem] top-1 w-6 h-6 rounded-full ${statusInfo.bgColor} ${statusInfo.color} flex items-center justify-center border-2 border-background`}
              >
                <Icon className="h-3 w-3" />
              </div>

              {/* Content */}
              <div className={`pb-2 ${!isLast ? 'border-l-2 border-transparent' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {entry.notes}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
