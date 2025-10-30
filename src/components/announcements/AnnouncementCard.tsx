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
    className: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    badgeClassName: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  warning: {
    icon: AlertTriangle,
    label: "Atenção",
    className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
    badgeClassName: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  success: {
    icon: CheckCircle,
    label: "Sucesso",
    className: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
    badgeClassName: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  error: {
    icon: AlertCircle,
    label: "Urgente",
    className: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    badgeClassName: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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
    <Card className={`${config.className} border-2 transition-all hover:shadow-lg`}>
      {announcement.image_url && (
        <div className="w-full h-48 overflow-hidden rounded-t-lg">
          <img 
            src={announcement.image_url} 
            alt={announcement.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Icon className="h-5 w-5 flex-shrink-0" />
            <h3 className="font-semibold text-lg line-clamp-2">{announcement.title}</h3>
          </div>
          <Badge className={config.badgeClassName} variant="secondary">
            {config.label}
          </Badge>
        </div>
        {announcement.priority > 1 && (
          <Badge variant="outline" className="w-fit">
            Prioridade {announcement.priority}
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        <p className="text-sm whitespace-pre-wrap line-clamp-4">{announcement.content}</p>
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t pt-4">
        <p className="text-xs text-muted-foreground">
          {format(new Date(announcement.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
        </p>
        
        {isOwner && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(announcement)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
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
