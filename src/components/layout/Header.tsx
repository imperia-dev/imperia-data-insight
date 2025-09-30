import { Bell, Search, User, ChevronDown, LogOut, MessageCircle, AlertCircle, Clock, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  userName: string;
  userRole: string;
}

export function Header({ userName, userRole }: HeaderProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, getTimeAgo } = useNotifications();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<"initials" | "photo" | "generated" | "3d-robot" | "3d-character" | "3d-abstract">("initials");
  
  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, avatar_style')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          setUserAvatar(data.avatar_url);
          setAvatarStyle((data.avatar_style || "initials") as "initials" | "photo" | "generated" | "3d-robot" | "3d-character" | "3d-abstract");
        }
      }
    };
    
    fetchUserAvatar();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgency':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'pendency':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'delay':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'financial':
        return <DollarSign className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Search Bar - Desktop */}
        <div className="hidden md:flex flex-1 items-center px-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos, clientes ou projetos..."
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* WhatsApp Contact Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.open('https://wa.me/5515981074591', '_blank')}
            title="Contato via WhatsApp"
          >
          <MessageCircle className="h-5 w-5" />
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="font-semibold text-sm">Notificações</h3>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead();
                  }}
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Carregando notificações...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-3 cursor-pointer",
                        !notification.read && "bg-muted/50"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </ScrollArea>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="justify-center text-primary text-sm font-medium"
                  onClick={() => navigate('/notifications')}
                >
                  Ver todas as notificações
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3">
                <AnimatedAvatar
                  src={userAvatar}
                  fallback={userName}
                  size="sm"
                  showStatus
                  status="online"
                  animationLevel="normal"
                  style={userAvatar ? "photo" : avatarStyle}
                />
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-semibold">{userName}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 mt-0.5">
                    {userRole}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}