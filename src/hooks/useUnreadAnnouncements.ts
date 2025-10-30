import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Announcement } from "@/pages/Announcements";

export function useUnreadAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar avisos não lidos
  const { data: unreadAnnouncements, isLoading } = useQuery({
    queryKey: ["unread-announcements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar todos os avisos ativos
      const { data: announcements, error: announcementsError } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (announcementsError) throw announcementsError;

      // Buscar avisos já visualizados pelo usuário
      const { data: viewedAnnouncements, error: viewedError } = await supabase
        .from("announcement_views")
        .select("announcement_id")
        .eq("user_id", user.id);

      if (viewedError) throw viewedError;

      // Filtrar avisos não visualizados
      const viewedIds = new Set(viewedAnnouncements?.map((v) => v.announcement_id) || []);
      const unread = announcements?.filter((a) => !viewedIds.has(a.id)) || [];

      // Filtrar por data (se tiver start_date/end_date)
      const now = new Date();
      return unread.filter((announcement) => {
        const startDate = announcement.start_date ? new Date(announcement.start_date) : null;
        const endDate = announcement.end_date ? new Date(announcement.end_date) : null;

        if (startDate && startDate > now) return false;
        if (endDate && endDate < now) return false;

        return true;
      }) as Announcement[];
    },
    enabled: !!user?.id,
  });

  // Buscar apenas o aviso principal não lido
  const { data: mainAnnouncement, isLoading: isLoadingMain } = useQuery({
    queryKey: ["main-announcement", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Buscar o aviso principal (priority = 1)
      const { data: announcements, error: announcementsError } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .eq("priority", 1)
        .order("created_at", { ascending: false })
        .limit(1);

      if (announcementsError) throw announcementsError;
      if (!announcements || announcements.length === 0) return null;

      const mainAnnouncement = announcements[0];

      // Verificar se já foi visualizado
      const { data: viewedAnnouncements, error: viewedError } = await supabase
        .from("announcement_views")
        .select("announcement_id")
        .eq("user_id", user.id)
        .eq("announcement_id", mainAnnouncement.id);

      if (viewedError) throw viewedError;
      if (viewedAnnouncements && viewedAnnouncements.length > 0) return null;

      // Verificar data
      const now = new Date();
      const startDate = mainAnnouncement.start_date ? new Date(mainAnnouncement.start_date) : null;
      const endDate = mainAnnouncement.end_date ? new Date(mainAnnouncement.end_date) : null;

      if (startDate && startDate > now) return null;
      if (endDate && endDate < now) return null;

      return mainAnnouncement as Announcement;
    },
    enabled: !!user?.id,
  });

  // Marcar aviso como lido
  const markAsReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("announcement_views")
        .insert({
          user_id: user.id,
          announcement_id: announcementId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      // Atualizar a lista de avisos não lidos
      queryClient.invalidateQueries({ queryKey: ["unread-announcements", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["main-announcement", user?.id] });
    },
  });

  return {
    unreadAnnouncements: unreadAnnouncements || [],
    mainAnnouncement: mainAnnouncement || null,
    isLoading,
    isLoadingMain,
    markAsRead: markAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
  };
}
