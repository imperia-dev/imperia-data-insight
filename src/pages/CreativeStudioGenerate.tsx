import { useEffect, useMemo, useState } from "react";
import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type GenerationRow = Database["public"]["Tables"]["generations"]["Row"];
type CreativeRow = Database["public"]["Tables"]["creatives"]["Row"];

const FORMAT_OPTIONS = [
  { value: "feed", label: "Feed" },
  { value: "reels", label: "Reels" },
  { value: "stories", label: "Stories" },
  { value: "carousel", label: "Carrossel" },
] as const;

export default function CreativeStudioGenerate() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();

  const [objective, setObjective] = useState("");
  const [campaignTheme, setCampaignTheme] = useState("");
  const [cta, setCta] = useState("");
  const [format, setFormat] = useState<(typeof FORMAT_OPTIONS)[number]["value"]>("feed");
  const [quantity, setQuantity] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recentGenerations, setRecentGenerations] = useState<GenerationRow[]>([]);
  const [recentCreatives, setRecentCreatives] = useState<CreativeRow[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const canGenerate = useMemo(() => {
    return Boolean(activeCompanyId && user);
  }, [activeCompanyId, user]);

  const loadRecent = async () => {
    if (!activeCompanyId) return;
    setLoadingRecent(true);
    try {
      const { data: gens, error: gensError } = await supabase
        .from("generations")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (gensError) throw gensError;

      const genIds = (gens ?? []).map((g) => g.id);
      const { data: creatives, error: creativesError } = await supabase
        .from("creatives")
        .select("*")
        .eq("company_id", activeCompanyId)
        .in("generation_id", genIds.length ? genIds : ["00000000-0000-0000-0000-000000000000"]) // avoid empty IN
        .order("created_at", { ascending: false })
        .limit(20);
      if (creativesError) throw creativesError;

      setRecentGenerations(gens ?? []);
      setRecentCreatives(creatives ?? []);
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao carregar histórico",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    void loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const handleGenerate = async () => {
    if (!activeCompanyId) {
      toast({ title: "Selecione uma empresa", description: "Escolha uma empresa no Creative Studio (aba Home).", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Você precisa estar logado", variant: "destructive" });
      return;
    }

    const q = Math.max(1, Math.min(20, Number(quantity) || 1));
    if (!objective.trim() || !cta.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha Objetivo e CTA.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("studio-generate-text", {
        body: {
          companyId: activeCompanyId,
          objective: objective.trim(),
          campaignTheme: campaignTheme.trim() || null,
          cta: cta.trim(),
          format,
          quantity: q,
        },
      });

      if (error) throw error;

      toast({
        title: "Geração concluída",
        description: `Criamos ${data?.creativesCreated ?? 0} criativos.`,
      });

      await loadRecent();
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao gerar",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StudioShell title="Geração">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gerar conceitos (texto)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo *</Label>
                <Textarea
                  id="objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: aumentar pedidos via WhatsApp para o serviço X"
                  rows={3}
                  disabled={!canGenerate || isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaignTheme">Tema (opcional)</Label>
                <Textarea
                  id="campaignTheme"
                  value={campaignTheme}
                  onChange={(e) => setCampaignTheme(e.target.value)}
                  placeholder="Ex: volta às aulas, black friday, campanha de janeiro"
                  rows={3}
                  disabled={!canGenerate || isSubmitting}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cta">CTA *</Label>
                <Input
                  id="cta"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder='Ex: "Chame no WhatsApp"'
                  disabled={!canGenerate || isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as any)} disabled={!canGenerate || isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade (1–20)</Label>
                <Input
                  id="quantity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  disabled={!canGenerate || isSubmitting}
                />
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <Button onClick={handleGenerate} disabled={!canGenerate || isSubmitting} className="w-full md:w-auto">
                  {isSubmitting ? "Gerando..." : "Gerar"}
                </Button>
                <Button variant="outline" onClick={loadRecent} disabled={!activeCompanyId || loadingRecent}>
                  {loadingRecent ? "Atualizando..." : "Atualizar"}
                </Button>
              </div>
            </div>

            {!activeCompanyId && (
              <p className="text-sm text-muted-foreground">
                Selecione/crie uma empresa na aba <strong>Home</strong> antes de gerar.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas gerações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingRecent ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : recentGenerations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma geração ainda.</p>
            ) : (
              <ul className="space-y-2">
                {recentGenerations.map((g) => (
                  <li key={g.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{g.objective}</p>
                      <span className="text-xs text-muted-foreground">{g.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{g.format} • {g.quantity_requested} itens</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criativos gerados (recentes)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : recentCreatives.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada gerado ainda.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentCreatives.map((c) => (
                <div key={c.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium line-clamp-2">{c.concept_headline || "(sem título)"}</p>
                    <span className="text-xs text-muted-foreground">{c.status}</span>
                  </div>
                  {c.caption && <p className="text-xs text-muted-foreground line-clamp-4">{c.caption}</p>}
                  <p className="text-xs text-muted-foreground">v{c.version}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </StudioShell>
  );
}
