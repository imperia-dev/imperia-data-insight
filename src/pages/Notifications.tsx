import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { 
  Bell, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Trash2,
  Filter,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const { mainContainerClass } = useSidebarOffset();
  
  const { 
    notifications, 
    unreadCount, 
    loading: notificationsLoading, 
    markAsRead, 
    markAllAsRead, 
    getTimeAgo,
    refresh 
  } = useNotifications();

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setUserName(data.full_name);
        setUserRole(data.role);
      }
      setLoading(false);
    }
    
    fetchUserProfile();
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgency':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'pendency':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'delay':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'financial':
        return <DollarSign className="h-5 w-5 text-primary" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'urgency':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'pendency':
        return <Badge className="bg-warning text-warning-foreground">Pendência</Badge>;
      case 'delay':
        return <Badge className="bg-orange-500 text-white">Atraso</Badge>;
      case 'financial':
        return <Badge variant="secondary">Financeiro</Badge>;
      default:
        return <Badge>Notificação</Badge>;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const filteredNotifications = selectedType === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === selectedType);

  const unreadNotifications = filteredNotifications.filter(n => !n.read);
  const readNotifications = filteredNotifications.filter(n => n.read);

  const notificationTypes = [
    { value: 'all', label: 'Todas', count: notifications.length },
    { value: 'urgency', label: 'Urgências', count: notifications.filter(n => n.type === 'urgency').length },
    { value: 'pendency', label: 'Pendências', count: notifications.filter(n => n.type === 'pendency').length },
    { value: 'delay', label: 'Atrasos', count: notifications.filter(n => n.type === 'delay').length },
    { value: 'financial', label: 'Financeiro', count: notifications.filter(n => n.type === 'financial').length },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar userRole={userRole} />
        <div className={cn("flex-1", mainContainerClass)}>
          <Header userName={userName} userRole={userRole} />
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={userRole} />
      <div className={cn("flex-1", mainContainerClass)}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-6 bg-muted/50 min-h-[calc(100vh-4rem)]">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie todas as suas notificações em um só lugar
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={notificationsLoading}
                >
                  <RefreshCw className={cn(
                    "h-4 w-4 mr-2",
                    notificationsLoading && "animate-spin"
                  )} />
                  Atualizar
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{notifications.length}</p>
                  </div>
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Não lidas</p>
                    <p className="text-2xl font-bold">{unreadCount}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-destructive/50" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Urgências</p>
                    <p className="text-2xl font-bold">
                      {notifications.filter(n => n.type === 'urgency').length}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-destructive/50" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pendências</p>
                    <p className="text-2xl font-bold">
                      {notifications.filter(n => n.type === 'pendency').length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-warning/50" />
                </div>
              </Card>
            </div>

            {/* Tabs for filtering */}
            <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                {notificationTypes.map(type => (
                  <TabsTrigger key={type.value} value={type.value} className="relative">
                    {type.label}
                    {type.count > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="ml-2 h-5 px-1.5 text-xs"
                      >
                        {type.count}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedType} className="mt-6">
                <Card>
                  <ScrollArea className="h-[500px]">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg font-medium">Nenhuma notificação</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Você não tem notificações {selectedType !== 'all' && `do tipo ${notificationTypes.find(t => t.value === selectedType)?.label.toLowerCase()}`}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {/* Unread Notifications */}
                        {unreadNotifications.length > 0 && (
                          <>
                            <div className="px-6 py-3 bg-muted/50">
                              <h3 className="text-sm font-semibold text-muted-foreground">
                                Não lidas ({unreadNotifications.length})
                              </h3>
                            </div>
                            {unreadNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="flex items-start gap-4 p-6 hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="mt-1">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold">
                                          {notification.title}
                                        </p>
                                        {getNotificationBadge(notification.type)}
                                        <Badge variant="default" className="h-5">
                                          Nova
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {notification.description}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {getTimeAgo(notification.timestamp)}
                                  </p>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-primary mt-2 animate-pulse" />
                              </div>
                            ))}
                          </>
                        )}

                        {/* Read Notifications */}
                        {readNotifications.length > 0 && (
                          <>
                            {unreadNotifications.length > 0 && <Separator />}
                            <div className="px-6 py-3 bg-muted/30">
                              <h3 className="text-sm font-semibold text-muted-foreground">
                                Lidas ({readNotifications.length})
                              </h3>
                            </div>
                            {readNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="flex items-start gap-4 p-6 hover:bg-muted/30 cursor-pointer transition-colors opacity-75"
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="mt-1">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium">
                                          {notification.title}
                                        </p>
                                        {getNotificationBadge(notification.type)}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {notification.description}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {getTimeAgo(notification.timestamp)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}