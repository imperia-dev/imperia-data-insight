import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";
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

interface AnnouncementCardProps {
  announcement: Announcement;
  isOwner: boolean;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
}

const typeConfig = {
  info: {
    icon: Info,
    label: "Informativo",
    className: "bg-gradient-to-br from-blue-50/50 to-blue-100/30 border-blue-200 hover:border-blue-300 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-800",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    iconColor: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    label: "Atenção",
    className: "bg-gradient-to-br from-yellow-50/50 to-yellow-100/30 border-yellow-200 hover:border-yellow-300 dark:from-yellow-950/30 dark:to-yellow-900/20 dark:border-yellow-800",
    badgeClassName: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    iconColor: "text-yellow-500",
  },
  success: {
    icon: CheckCircle,
    label: "Sucesso",
    className: "bg-gradient-to-br from-green-50/50 to-green-100/30 border-green-200 hover:border-green-300 dark:from-green-950/30 dark:to-green-900/20 dark:border-green-800",
    badgeClassName: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    iconColor: "text-green-500",
  },
  error: {
    icon: AlertCircle,
    label: "Urgente",
    className: "bg-gradient-to-br from-red-50/50 to-red-100/30 border-red-200 hover:border-red-300 dark:from-red-950/30 dark:to-red-900/20 dark:border-red-800",
    badgeClassName: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    iconColor: "text-red-500",
  },
};

export const AnnouncementCard = ({ 
  announcement, 
  isOwner, 
  onEdit, 
  onDelete 
}: AnnouncementCardProps) => {
  const config = typeConfig[announcement.type as keyof typeof typeConfig];
  const Icon = config.icon;

  return (
    <Card className={`${config.className} border-2 transition-all hover:shadow-xl hover:scale-[1.02] duration-300 overflow-hidden`}>
      {announcement.image_url && (
        <div className="w-full h-40 overflow-hidden">
          <img 
            src={announcement.image_url} 
            alt={announcement.title}
            className="w-full h-full object-cover transition-transform hover:scale-110 duration-300"
          />
        </div>
      )}
      
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className={`p-2 rounded-lg bg-background/50 ${config.iconColor}`}>
              <Icon className="h-5 w-5 flex-shrink-0" />
            </div>
            <h3 className="font-semibold text-lg line-clamp-2 leading-tight">{announcement.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={config.badgeClassName} variant="secondary">
            {config.label}
          </Badge>
          {announcement.priority === 1 && (
            <Badge variant="outline" className="border-primary text-primary">
              Destaque
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed">
          {announcement.content}
        </p>
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t pt-3 bg-background/30">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span>📅</span>
          {format(new Date(announcement.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
        </p>
        
        {isOwner && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(announcement)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
      </CardFooter>
    </Card>
  );
};
