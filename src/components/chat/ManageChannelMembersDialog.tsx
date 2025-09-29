import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, UserMinus } from "lucide-react";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  avatar_style: string | null;
  avatar_color: string | null;
  role: string;
}

interface ChannelMember {
  user_id: string;
  user: User;
  joined_at: string;
}

interface ManageChannelMembersDialogProps {
  channelId: string;
  channelName: string;
}

export function ManageChannelMembersDialog({ channelId, channelName }: ManageChannelMembersDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, avatar_style, avatar_color, role")
        .order("full_name");
      
      if (error) throw error;
      return data as User[];
    },
  });

  // Fetch channel members
  const { data: channelMembers = [] } = useQuery({
    queryKey: ["channel-members", channelId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_channel_members")
        .select(`
          user_id,
          joined_at,
          user:profiles!chat_channel_members_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            avatar_style,
            avatar_color,
            role
          )
        `)
        .eq("channel_id", channelId);
      
      if (error) throw error;
      return data as ChannelMember[];
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("chat_channel_members")
        .insert({
          channel_id: channelId,
          user_id: userId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-members", channelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
      toast({
        title: "Membro adicionado",
        description: "Usuário foi adicionado ao canal com sucesso.",
      });
    },
    onError: (error: any) => {
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
      const { error } = await supabase
        .from("chat_channel_members")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-members", channelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
      toast({
        title: "Membro removido",
        description: "Usuário foi removido do canal com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const memberIds = channelMembers.map(m => m.user_id);
  const nonMembers = allUsers.filter(user => !memberIds.includes(user.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Membros - #{channelName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Current Members */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              Membros Atuais
              <Badge variant="secondary">{channelMembers.length}</Badge>
            </h3>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {channelMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
                  >
                    <AnimatedAvatar
                      src={member.user.avatar_url || undefined}
                      alt={member.user.full_name}
                      size="sm"
                      style={member.user.avatar_style as any}
                      color={member.user.avatar_color || undefined}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.user.role}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeMemberMutation.mutate(member.user_id)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Available Users */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              Adicionar Usuários
              <Badge variant="outline">{nonMembers.length}</Badge>
            </h3>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {nonMembers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
                  >
                    <AnimatedAvatar
                      src={user.avatar_url || undefined}
                      alt={user.full_name}
                      size="sm"
                      style={user.avatar_style as any}
                      color={user.avatar_color || undefined}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.role}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => addMemberMutation.mutate(user.id)}
                      disabled={addMemberMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}