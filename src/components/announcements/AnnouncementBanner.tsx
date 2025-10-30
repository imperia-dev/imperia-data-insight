import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle, Calendar, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Announcement } from "@/pages/Announcements";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AnnouncementBannerProps {
  announcement: Announcement;
  isOwner: boolean;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
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

export const AnnouncementBanner = ({ 
  announcement, 
  isOwner, 
  onEdit, 
  onDelete 
}: AnnouncementBannerProps) => {
  const config = typeConfig[announcement.type as keyof typeof typeConfig];
  const Icon = config.icon;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-card border-2 border-primary/20 shadow-xl animate-[pulse-scale_2s_ease-in-out_infinite]">
      {/* Decorative gradient overlay - removed opacity for clarity */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient.replace('/20', '/40').replace('/10', '/20')} pointer-events-none`} />
      
      {/* Content */}
      <div className="relative z-10">
        {announcement.image_url && (
          <div className="w-full h-[300px] overflow-hidden">
            <img 
              src={announcement.image_url} 
              alt={announcement.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}
        
        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full bg-background backdrop-blur-sm ${config.iconColor}`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <Badge className={`${config.badgeClass} mb-2`}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                {announcement.priority === 1 && (
                  <Badge variant="outline" className="ml-2 border-primary text-primary">
                    Alta Prioridade
                  </Badge>
                )}
              </div>
            </div>
            
            {isOwner && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(announcement)}
                  className="hover:bg-background"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-background">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir aviso</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(announcement.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {announcement.title}
          </h1>

          {/* Content */}
          <p className="text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed mb-6 max-w-4xl">
            {announcement.content}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Publicado em {format(new Date(announcement.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
