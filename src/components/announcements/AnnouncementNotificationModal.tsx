import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Info, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Announcement } from "@/pages/Announcements";

interface AnnouncementNotificationModalProps {
  announcements: Announcement[];
  onDismiss: (announcementId: string) => void;
  isLoading?: boolean;
}

const typeConfig = {
  info: {
    icon: Info,
    label: "Informativo",
    gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    iconColor: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    label: "Atenção",
    gradient: "from-yellow-500/20 via-yellow-400/10 to-transparent",
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    iconColor: "text-yellow-500",
  },
  success: {
    icon: CheckCircle,
    label: "Sucesso",
    gradient: "from-green-500/20 via-green-400/10 to-transparent",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    iconColor: "text-green-500",
  },
  error: {
    icon: AlertCircle,
    label: "Urgente",
    gradient: "from-red-500/20 via-red-400/10 to-transparent",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    iconColor: "text-red-500",
  },
};

export function AnnouncementNotificationModal({
  announcements,
  onDismiss,
  isLoading,
}: AnnouncementNotificationModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];
  const config = typeConfig[currentAnnouncement.type as keyof typeof typeConfig];
  const Icon = config.icon;
  const hasMultiple = announcements.length > 1;

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDismiss = () => {
    onDismiss(currentAnnouncement.id);
    
    // Se há mais avisos, ir para o próximo
    if (currentIndex < announcements.length - 1) {
      // Não precisa mudar o índice, pois o array será atualizado
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>📢 Novo Aviso</span>
              {hasMultiple && (
                <Badge variant="secondary" className="text-xs">
                  {currentIndex + 1} de {announcements.length}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Banner do aviso */}
          <div className={`relative rounded-xl overflow-hidden bg-gradient-to-br ${config.gradient} border border-border/50`}>
            {currentAnnouncement.image_url && (
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src={currentAnnouncement.image_url} 
                  alt={currentAnnouncement.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-full bg-background/50 backdrop-blur-sm ${config.iconColor}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <Badge className={config.badgeClass}>
                    {config.label}
                  </Badge>
                  {currentAnnouncement.priority === 1 && (
                    <Badge variant="outline" className="ml-2 border-primary text-primary">
                      Prioritário
                    </Badge>
                  )}
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-3">{currentAnnouncement.title}</h2>
              
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">
                {currentAnnouncement.content}
              </p>

              <p className="text-xs text-muted-foreground">
                Publicado em {format(new Date(currentAnnouncement.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between gap-4">
            {hasMultiple ? (
              <>
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>

                <Button
                  onClick={handleDismiss}
                  disabled={isLoading}
                  className="flex-1"
                >
                  OK, Entendi
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex === announcements.length - 1}
                  className="flex-1"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleDismiss}
                disabled={isLoading}
                className="w-full"
              >
                OK, Entendi
              </Button>
            )}
          </div>

          {hasMultiple && (
            <p className="text-center text-sm text-muted-foreground">
              Você pode navegar entre os avisos ou clicar em "OK" para dispensar o aviso atual
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
