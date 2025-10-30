import { useUnreadAnnouncements } from "@/hooks/useUnreadAnnouncements";
import { AnnouncementNotificationModal } from "./AnnouncementNotificationModal";
import { useAuth } from "@/contexts/AuthContext";

export function MainAnnouncementModal() {
  const { user } = useAuth();
  const { mainAnnouncement, markAsRead, isMarkingAsRead } = useUnreadAnnouncements();

  // Só mostrar se o usuário estiver autenticado e houver aviso principal
  if (!user || !mainAnnouncement) {
    return null;
  }

  return (
    <AnnouncementNotificationModal
      announcements={[mainAnnouncement]}
      onDismiss={markAsRead}
      isLoading={isMarkingAsRead}
    />
  );
}
