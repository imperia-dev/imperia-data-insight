import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserMinus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  icon: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  avatar_style: string | null;
  avatar_color: string | null;
}

interface ChannelMember {
  id: string;
  user_id: string;
  user: User;
}

interface ChannelMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
}

export function ChannelMembersModal({ isOpen, onClose, channel }: ChannelMembersModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    enabled: isOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, avatar_style, avatar_color")
        .eq("approval_status", "approved");
      
      if (error) throw error;
      return data as User[];
    },
  });

  // Fetch channel members
  const { data: channelMembers = [] } = useQuery({
    queryKey: ["channel-members", channel?.id],
    enabled: isOpen && !!channel,
    queryFn: async () => {
      if (!channel) return [];
      
      const { data, error } = await supabase
        .from("chat_channel_members")
        .select(`
          id,
          user_id,
          user:profiles!chat_channel_members_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            avatar_style,
            avatar_color
          )
        `)
        .eq("channel_id", channel.id);
      
      if (error) throw error;
      return data as ChannelMember[];
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!channel) throw new Error("No channel selected");
      
      const { error } = await supabase
        .from("chat_channel_members")
        .insert({
          channel_id: channel.id,
          user_id: userId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-members", channel?.id] });
      toast({
        title: "Membro adicionado",
        description: "Usuário foi adicionado ao canal com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!channel) throw new Error("No channel selected");
      
      const { error } = await supabase
        .from("chat_channel_members")
        .delete()
        .eq("channel_id", channel.id)
        .eq("user_id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-members", channel?.id] });
      toast({
        title: "Membro removido",
        description: "Usuário foi removido do canal com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const memberIds = new Set(channelMembers.map(m => m.user_id));
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

  const filteredMembers = channelMembers.filter(member =>
    member.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMember = (userId: string) => {
    addMemberMutation.mutate(userId);
  };

  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate(userId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{channel?.icon}</span>
            Gerenciar membros - {channel?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 h-96">
            {/* Current Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Membros Atuais</h3>
                <Badge variant="secondary">{channelMembers.length}</Badge>
              </div>
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <AnimatedAvatar
                          src={member.user.avatar_url || undefined}
                          alt={member.user.full_name}
                          size="sm"
                          style={member.user.avatar_style as any}
                          color={member.user.avatar_color || undefined}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.user.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={removeMemberMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Available Users */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Usuários Disponíveis</h3>
                <Badge variant="outline">{availableUsers.length}</Badge>
              </div>
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {filteredAvailableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <AnimatedAvatar
                          src={user.avatar_url || undefined}
                          alt={user.full_name}
                          size="sm"
                          style={user.avatar_style as any}
                          color={user.avatar_color || undefined}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAddMember(user.id)}
                        disabled={addMemberMutation.isPending}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}