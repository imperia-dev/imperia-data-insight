import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Lightbulb, Megaphone } from "lucide-react";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";
import { AnnouncementDialog } from "@/components/announcements/AnnouncementDialog";
import { SuggestionsDialog } from "@/components/announcements/SuggestionsDialog";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import confetti from "canvas-confetti";
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
  const { user } = useAuth();
  const { userRole } = useRoleAccess(location.pathname);
  const { mainContainerClass } = useSidebarOffset();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const isOwner = userRole === "owner";

  // Confetti effect on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

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

  const mainAnnouncement = announcements && announcements.length > 0 ? announcements[0] : null;
  const otherAnnouncements = announcements && announcements.length > 1 ? announcements.slice(1) : [];

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={user?.user_metadata?.full_name || "Usuário"} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8 space-y-8">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-br from-primary/5 via-background to-background border-b">
            <div className="w-full py-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <Megaphone className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Avisos</h1>
                    <p className="text-muted-foreground mt-1">
                      Fique por dentro das novidades e informações importantes
                    </p>
                  </div>
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
                  <Button variant="outline" onClick={() => setSuggestionsDialogOpen(true)}>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Sugestões
                  </Button>
                  {isOwner && (
                    <Button onClick={handleCreateNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Aviso
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Banner - Full Width */}
          {isLoading ? (
            <div className="w-full">
              <div className="h-[400px] bg-muted animate-pulse rounded-2xl" />
            </div>
          ) : mainAnnouncement ? (
            <div className="w-full">
              <AnnouncementBanner
                announcement={mainAnnouncement}
                isOwner={isOwner}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ) : (
            <div className="w-full">
              <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed">
                <Megaphone className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg text-muted-foreground">
                  Nenhum aviso encontrado
                  {typeFilter !== "all" && " para este filtro"}.
                </p>
              </div>
            </div>
          )}

          {/* Other Announcements - Cards Grid */}
          {!isLoading && otherAnnouncements.length > 0 && (
            <div className="w-full pb-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <span>Mais Avisos</span>
                <span className="text-muted-foreground text-base font-normal">
                  ({otherAnnouncements.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    isOwner={isOwner}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </main>

          {/* Dialog */}
          {isOwner && (
            <AnnouncementDialog
              open={dialogOpen}
              onOpenChange={handleDialogClose}
              announcement={selectedAnnouncement}
            />
          )}

          {/* Suggestions Dialog */}
          <SuggestionsDialog
            open={suggestionsDialogOpen}
            onOpenChange={setSuggestionsDialogOpen}
          />
      </div>
    </div>
  );
};

export default Announcements;
