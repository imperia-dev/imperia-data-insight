import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { CalendarPostWithCreative } from "@/components/creative-studio/calendar/types";

export function SchedulePostCard({
  post,
  onChanged,
}: {
  post: CalendarPostWithCreative;
  onChanged: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const remove = async () => {
    try {
      const { error } = await supabase.from("calendar_posts").delete().eq("id", post.id);
      if (error) throw error;
      toast({ title: "Agendamento removido" });
      await onChanged();
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao remover",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">
          {post.creatives?.concept_headline || "(sem título)"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {format(new Date(post.scheduled_at), "PPpp", { locale: ptBR })}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {post.creatives?.caption ? (
          <p className="text-sm text-muted-foreground line-clamp-4">{post.creatives.caption}</p>
        ) : (
          <p className="text-sm text-muted-foreground">(sem legenda)</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Status: {post.status}</p>
          <Button variant="destructive" size="sm" onClick={remove}>
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
