import { useEffect, useMemo, useState } from "react";
import { startOfDay, endOfDay } from "date-fns";
import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CalendarPostWithCreative } from "@/components/creative-studio/calendar/types";
import { SchedulePostCard } from "@/components/creative-studio/calendar/SchedulePostCard";

type CreativeRow = Database["public"]["Tables"]["creatives"]["Row"];

export default function CreativeStudioCalendar() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [time, setTime] = useState("09:00");
  const [approvedCreatives, setApprovedCreatives] = useState<CreativeRow[]>([]);
  const [selectedCreativeId, setSelectedCreativeId] = useState<string>("");
  const [posts, setPosts] = useState<CalendarPostWithCreative[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const canUse = useMemo(() => Boolean(activeCompanyId && user), [activeCompanyId, user]);

  const loadApprovedCreatives = async () => {
    if (!activeCompanyId) return;
    try {
      const { data, error } = await supabase
        .from("creatives")
        .select("id, company_id, generation_id, created_at, caption, concept_bullets, concept_headline, concept_subheadline, feedback, hashtags, image_path, image_url, rationale, status, version")
        .eq("company_id", activeCompanyId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setApprovedCreatives(data ?? []);
      if (!selectedCreativeId && (data?.length ?? 0) > 0) setSelectedCreativeId(data![0].id);
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao carregar criativos aprovados",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const loadPostsForDay = async (day: Date) => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    try {
      const from = startOfDay(day).toISOString();
      const to = endOfDay(day).toISOString();

      const { data, error } = await supabase
        .from("calendar_posts")
        .select(
          "id, company_id, created_at, created_by, creative_id, posted_at, scheduled_at, status, creatives (id, concept_headline, caption, hashtags, image_url)"
        )
        .eq("company_id", activeCompanyId)
        .gte("scheduled_at", from)
        .lte("scheduled_at", to)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      setPosts((data as any) ?? []);
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao carregar agenda",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCompanyId) return;
    void loadApprovedCreatives();
    void loadPostsForDay(selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  useEffect(() => {
    if (!activeCompanyId) return;
    void loadPostsForDay(selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const schedule = async () => {
    if (!activeCompanyId) {
      toast({ title: "Selecione uma empresa", description: "Escolha uma empresa no Creative Studio (aba Home).", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Você precisa estar logado", variant: "destructive" });
      return;
    }
    if (!selectedCreativeId) {
      toast({ title: "Selecione um criativo aprovado", variant: "destructive" });
      return;
    }

    const [hh, mm] = time.split(":").map((n) => Number(n));
    const dt = new Date(selectedDay);
    dt.setHours(Number.isFinite(hh) ? hh : 9, Number.isFinite(mm) ? mm : 0, 0, 0);

    setIsScheduling(true);
    try {
      const { error } = await supabase.from("calendar_posts").insert({
        company_id: activeCompanyId,
        creative_id: selectedCreativeId,
        scheduled_at: dt.toISOString(),
        created_by: user.id,
        status: "scheduled",
      });
      if (error) throw error;

      toast({ title: "Agendado com sucesso" });
      await loadPostsForDay(selectedDay);
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao agendar",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <StudioShell title="Calendário">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Escolher dia</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Calendar mode="single" selected={selectedDay} onSelect={(d) => d && setSelectedDay(d)} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agendar post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeCompanyId ? (
              <p className="text-sm text-muted-foreground">
                Selecione/crie uma empresa na aba <strong>Home</strong> antes de agendar.
              </p>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Criativo aprovado</Label>
                    <Select
                      value={selectedCreativeId}
                      onValueChange={setSelectedCreativeId}
                      disabled={!canUse || approvedCreatives.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedCreatives.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {(c.concept_headline || "(sem título)").slice(0, 60)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {approvedCreatives.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Você ainda não tem criativos aprovados. Aprove algum na aba <strong>Revisão</strong>.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Horário</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      disabled={!canUse}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={schedule} disabled={!canUse || isScheduling || approvedCreatives.length === 0}>
                    {isScheduling ? "Agendando..." : "Agendar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void loadApprovedCreatives();
                      void loadPostsForDay(selectedDay);
                    }}
                    disabled={!activeCompanyId || isLoading}
                  >
                    {isLoading ? "Atualizando..." : "Atualizar"}
                  </Button>
                </div>

                <div className="pt-2">
                  <p className="text-sm font-medium">Agendados do dia</p>
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
                  ) : posts.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">Nenhum post agendado para este dia.</p>
                  ) : (
                    <div className="grid gap-4 mt-3 md:grid-cols-2">
                      {posts.map((p) => (
                        <SchedulePostCard key={p.id} post={p} onChanged={() => loadPostsForDay(selectedDay)} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}
