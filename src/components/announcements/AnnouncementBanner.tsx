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
    gradient: "from-blue-500/60 via-cyan-400/40 to-purple-500/30",
    badgeClass: "bg-blue-500 text-white dark:bg-blue-600 dark:text-white",
    iconColor: "text-blue-500",
    glowColor: "shadow-[0_0_30px_rgba(59,130,246,0.5)]",
  },
  warning: {
    icon: AlertTriangle,
    label: "Atenção",
    gradient: "from-yellow-500/60 via-orange-400/40 to-red-500/30",
    badgeClass: "bg-yellow-500 text-white dark:bg-yellow-600 dark:text-white",
    iconColor: "text-yellow-500",
    glowColor: "shadow-[0_0_30px_rgba(234,179,8,0.5)]",
  },
  success: {
    icon: CheckCircle,
    label: "Sucesso",
    gradient: "from-green-500/60 via-emerald-400/40 to-teal-500/30",
    badgeClass: "bg-green-500 text-white dark:bg-green-600 dark:text-white",
    iconColor: "text-green-500",
    glowColor: "shadow-[0_0_30px_rgba(34,197,94,0.5)]",
  },
  error: {
    icon: AlertCircle,
    label: "Urgente",
    gradient: "from-red-500/60 via-pink-500/40 to-rose-500/30",
    badgeClass: "bg-red-500 text-white dark:bg-red-600 dark:text-white",
    iconColor: "text-red-500",
    glowColor: "shadow-[0_0_30px_rgba(239,68,68,0.5)]",
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
    <div className={`relative w-full overflow-hidden rounded-2xl bg-card border-2 border-primary/30 shadow-xl animate-[pulse-scale_2s_ease-in-out_infinite] ${config.glowColor}`}>
      {/* Decorative gradient overlay - vibrant colors */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} pointer-events-none`} />
      
      {/* Animated color spots */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
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
              <div className={`p-3 rounded-full bg-gradient-to-br from-background to-muted backdrop-blur-sm ${config.iconColor} shadow-lg`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <Badge className={`${config.badgeClass} mb-2 shadow-md font-semibold`}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                {announcement.priority === 1 && (
                  <Badge variant="outline" className="ml-2 border-2 border-primary text-primary bg-primary/10 font-semibold shadow-md">
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
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground drop-shadow-sm">
            {announcement.title}
          </h1>

          {/* Content */}
          <p className="text-lg text-foreground/90 whitespace-pre-wrap leading-relaxed mb-6 max-w-4xl font-medium">
            {announcement.content}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-2 text-sm text-foreground/80 font-medium">
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
