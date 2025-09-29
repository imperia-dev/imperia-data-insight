import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Hash, Plus, Users, Send, Smile, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChannelMembersModal } from "@/components/chat/ChannelMembersModal";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  icon: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  user_id: string;
  user: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    avatar_style: string | null;
    avatar_color: string | null;
  };
  reactions?: Reaction[];
}

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
}

interface Presence {
  user_id: string;
  status: string;
  is_typing: boolean;
  last_seen: string;
}

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { userRole } = useRoleAccess("/chat");
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch channels
  const { data: channels = [] } = useQuery({
    queryKey: ["chat-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_channels")
        .select("*")
        .eq("archived", false)
        .order("created_at");
      
      if (error) throw error;
      return data as Channel[];
    },
  });

  // Fetch messages for selected channel
  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", selectedChannel],
    enabled: !!selectedChannel,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          *,
          user:profiles!chat_messages_user_id_fkey(
            full_name,
            email,
            avatar_url,
            avatar_style,
            avatar_color
          ),
          reactions:chat_reactions(
            id,
            emoji,
            user_id
          )
        `)
        .eq("channel_id", selectedChannel!)
        .is("deleted_at", null)
        .order("created_at");
      
      if (error) throw error;
      return data as Message[];
    },
  });

  // Fetch online users
  const { data: onlineUsers = [] } = useQuery({
    queryKey: ["chat-presence"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_presence")
        .select(`
          user_id,
          status,
          is_typing,
          last_seen,
          user:profiles!chat_presence_user_id_fkey(
            full_name,
            email,
            avatar_url,
            avatar_style,
            avatar_color
          )
        `)
        .eq("status", "online");
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedChannel || !user) throw new Error("No channel selected");
      
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          channel_id: selectedChannel,
          user_id: user.id,
          content,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannel] });
      setMessage("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update presence
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      await supabase
        .from("chat_presence")
        .upsert({
          user_id: user.id,
          status: "online",
          last_seen: new Date().toISOString(),
          is_typing: isTyping,
          typing_channel_id: isTyping ? selectedChannel : null,
        }, {
          onConflict: "user_id",
        });
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000); // Update every minute

    return () => {
      clearInterval(interval);
      // Set offline status
      supabase
        .from("chat_presence")
        .upsert({
          user_id: user.id,
          status: "offline",
          last_seen: new Date().toISOString(),
          is_typing: false,
        }, {
          onConflict: "user_id",
        });
    };
  }, [user, isTyping, selectedChannel]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!selectedChannel) return;

    const channel = supabase
      .channel(`messages:${selectedChannel}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${selectedChannel}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannel] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChannel, queryClient]);

  // Subscribe to presence changes
  useEffect(() => {
    const channel = supabase
      .channel("presence")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_presence",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-presence"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  // Select first channel by default
  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0].id);
    }
  }, [channels, selectedChannel]);

  const currentChannel = channels.find(c => c.id === selectedChannel);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Channels */}
      <div className="w-60 bg-sidebar border-r">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Canais</h2>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors",
                  selectedChannel === channel.id && "bg-accent"
                )}
              >
                <span className="text-lg">{channel.icon}</span>
                <span className="flex-1 truncate">{channel.name}</span>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
          {userRole === 'owner' && (
            <Button
              variant="ghost"
              className="w-full mt-4 justify-start"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Canal
            </Button>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-14 px-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentChannel?.icon}</span>
            <h3 className="font-semibold">{currentChannel?.name}</h3>
            {currentChannel?.description && (
              <span className="text-sm text-muted-foreground">
                {currentChannel.description}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Users className="h-4 w-4" />
            </Button>
            {userRole === 'owner' && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setMembersModalOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <AnimatedAvatar
                  src={msg.user.avatar_url || undefined}
                  alt={msg.user.full_name}
                  size="sm"
                  style={msg.user.avatar_style as any}
                  color={msg.user.avatar_color || undefined}
                />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{msg.user.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                    {msg.edited_at && (
                      <span className="text-xs text-muted-foreground">(editado)</span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{msg.content}</p>
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {Object.entries(
                        msg.reactions.reduce((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          className="px-2 py-1 rounded-full bg-secondary text-xs flex items-center gap-1 hover:bg-secondary/80"
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Typing Indicator */}
        {onlineUsers.some(u => u.is_typing && u.user_id !== user?.id) && (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            Alguém está digitando...
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Smile className="h-4 w-4" />
            </Button>
            <Input
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Mensagem #${currentChannel?.name || ""}`}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Online Users */}
      <div className="w-60 bg-sidebar border-l">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            ONLINE — {onlineUsers.length}
          </h3>
          <div className="space-y-2">
            {onlineUsers.map((presence) => (
              <div key={presence.user_id} className="flex items-center gap-2 p-2 rounded hover:bg-accent">
                <div className="relative">
                  <AnimatedAvatar
                    src={presence.user?.avatar_url || undefined}
                    alt={presence.user?.full_name || ""}
                    size="sm"
                    style={presence.user?.avatar_style as any}
                    color={presence.user?.avatar_color || undefined}
                    showStatus
                    status={presence.status as any}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {presence.user?.full_name}
                  </p>
                  {presence.is_typing && (
                    <p className="text-xs text-muted-foreground">Digitando...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Channel Members Modal */}
      <ChannelMembersModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        channel={currentChannel}
      />
    </div>
  );
}