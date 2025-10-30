import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { AnnouncementDialog } from "@/components/announcements/AnnouncementDialog";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AnnouncementType = "info" | "warning" | "success" | "error";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const Announcements = () => {
  const location = useLocation();
  const { userRole } = useRoleAccess(location.pathname);
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const isOwner = userRole === "owner";

  const { data: announcements, isLoading, refetch } = useQuery({
    queryKey: ["announcements", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by date range and cast type
      const now = new Date();
      return (data || []).filter((announcement: any) => {
        const startDate = announcement.start_date ? new Date(announcement.start_date) : null;
        const endDate = announcement.end_date ? new Date(announcement.end_date) : null;

        if (startDate && startDate > now) return false;
        if (endDate && endDate < now) return false;

        return true;
      }) as Announcement[];
    },
  });

  const handleCreateNew = () => {
    setSelectedAnnouncement(null);
    setDialogOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Aviso excluído",
        description: "O aviso foi excluído com sucesso.",
      });

      refetch();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o aviso.",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = (shouldRefetch: boolean) => {
    setDialogOpen(false);
    setSelectedAnnouncement(null);
    if (shouldRefetch) {
      refetch();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Avisos</h1>
          <p className="text-muted-foreground mt-1">
            Informações e atualizações importantes para a equipe
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="info">Informativo</SelectItem>
              <SelectItem value="warning">Atenção</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="error">Urgente</SelectItem>
            </SelectContent>
          </Select>
          {isOwner && (
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Aviso
            </Button>
          )}
        </div>
      </div>

      {/* Announcements Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : announcements && announcements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isOwner={isOwner}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhum aviso encontrado
            {typeFilter !== "all" && " para este filtro"}.
          </p>
        </div>
      )}

      {/* Dialog */}
      {isOwner && (
        <AnnouncementDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          announcement={selectedAnnouncement}
        />
      )}
    </div>
  );
};

export default Announcements;
