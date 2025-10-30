import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Bug, Sparkles, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ViewSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Suggestion {
  id: string;
  type: "improvement" | "bug" | "tip";
  title: string;
  description: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const typeConfig = {
  improvement: {
    label: "Melhoria",
    icon: Sparkles,
    variant: "default" as const,
  },
  bug: {
    label: "Bug",
    icon: Bug,
    variant: "destructive" as const,
  },
  tip: {
    label: "Dica",
    icon: Lightbulb,
    variant: "secondary" as const,
  },
};

export function ViewSuggestionsDialog({
  open,
  onOpenChange,
}: ViewSuggestionsDialogProps) {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["view-suggestions"],
    queryFn: async () => {
      const { data: suggestionsData, error } = await supabase
        .from("suggestions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(suggestionsData?.map(s => s.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      // Merge data
      const suggestionsWithProfiles = suggestionsData?.map(suggestion => ({
        ...suggestion,
        profiles: profilesData?.find(p => p.id === suggestion.user_id) || null
      })) || [];

      return suggestionsWithProfiles as Suggestion[];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Lightbulb className="h-6 w-6 text-primary" />
            Sugestões dos Usuários
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-5/6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.map((suggestion) => {
                const config = typeConfig[suggestion.type];
                const Icon = config.icon;

                return (
                  <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            {suggestion.title}
                          </CardTitle>
                        </div>
                        <Badge variant={config.variant}>
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed">
                        {suggestion.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4" />
                          <span>
                            {suggestion.profiles?.full_name || suggestion.profiles?.email || "Usuário"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(suggestion.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lightbulb className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg text-muted-foreground">
                Nenhuma sugestão encontrada
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As sugestões dos usuários aparecerão aqui
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
