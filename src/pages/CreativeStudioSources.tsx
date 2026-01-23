import { useEffect, useMemo, useState } from "react";
import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

type KnowledgeSourceType = "website" | "competitor_inspiration" | "brand_kit_summary";

type KnowledgeRow = {
  id: string;
  company_id: string;
  source_type: KnowledgeSourceType;
  content: string;
  source_url: string | null;
  created_at: string;
  created_by: string;
};

export default function CreativeStudioSources() {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  const [sourceType, setSourceType] = useState<KnowledgeSourceType>("website");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<KnowledgeRow[]>([]);

  const canUseUrl = sourceType === "website" || sourceType === "competitor_inspiration";

  const typeLabel = useMemo(() => {
    switch (sourceType) {
      case "website":
        return "Website";
      case "competitor_inspiration":
        return "Inspiração (concorrente)";
      case "brand_kit_summary":
        return "Resumo do Brand Kit";
      default:
        return "Fonte";
    }
  }, [sourceType]);

  const loadItems = async () => {
    if (!activeCompanyId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("id, company_id, source_type, content, source_url, created_at, created_by")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as any);
    } catch (e) {
      console.error(e);
      setItems([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as fontes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const addSource = async () => {
    if (!activeCompanyId) {
      toast({
        title: "Selecione uma empresa",
        description: "Volte na Home do Creative Studio e selecione uma empresa.",
      });
      return;
    }

    const trimmedContent = content.trim();
    const trimmedUrl = sourceUrl.trim();

    if (!trimmedContent) {
      toast({
        title: "Conteúdo obrigatório",
        description: "Cole um texto curto (ex: posicionamento, palavras-chave, exemplo de copy).",
        variant: "destructive",
      });
      return;
    }

    if (canUseUrl && trimmedUrl) {
      try {
        // validação simples de URL
        // eslint-disable-next-line no-new
        new URL(trimmedUrl);
      } catch {
        toast({ title: "URL inválida", description: "Informe uma URL válida (https://...).", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not_authenticated");

      const { error } = await supabase.from("knowledge_base").insert({
        company_id: activeCompanyId,
        source_type: sourceType,
        content: trimmedContent,
        source_url: canUseUrl && trimmedUrl ? trimmedUrl : null,
        created_by: user.id,
      } as any);
      if (error) throw error;

      toast({ title: "Fonte adicionada", description: "Salvo para ser usado na geração." });
      setContent("");
      setSourceUrl("");
      await loadItems();
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível salvar a fonte.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!activeCompanyId) return;
    try {
      const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast({ title: "Removido", description: "A fonte foi removida." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" });
    }
  };

  return (
    <StudioShell title="Fontes de Conteúdo">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Adicionar fonte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Empresa ativa: <span className="text-foreground font-medium">{activeCompanyId || "(nenhuma)"}</span>
            </p>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as KnowledgeSourceType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="competitor_inspiration">Inspiração (concorrente)</SelectItem>
                  <SelectItem value="brand_kit_summary">Resumo do Brand Kit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_url">URL (opcional)</Label>
              <Input
                id="source_url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={canUseUrl ? "https://..." : "(não se aplica)"}
                disabled={!canUseUrl}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Cole aqui um texto curto para a IA (ex: tom de voz, palavras-chave, exemplos).`}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Dica: 3–10 linhas já ajudam. Tipo selecionado: <span className="text-foreground">{typeLabel}</span>
              </p>
            </div>

            <Button className="w-full" onClick={addSource} disabled={saving}>
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fontes salvas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!activeCompanyId ? (
              <p className="text-sm text-muted-foreground">Selecione uma empresa para ver as fontes.</p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fonte salva ainda.</p>
            ) : (
              <div className="space-y-3">
                {items.map((it) => (
                  <div key={it.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {it.source_type === "website"
                            ? "Website"
                            : it.source_type === "competitor_inspiration"
                              ? "Inspiração (concorrente)"
                              : "Resumo do Brand Kit"}
                        </p>
                        {it.source_url ? (
                          <a
                            className="text-sm text-muted-foreground underline underline-offset-4"
                            href={it.source_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {it.source_url}
                          </a>
                        ) : null}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void removeItem(it.id)}>
                        Remover
                      </Button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{it.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}
