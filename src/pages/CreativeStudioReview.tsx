import { useEffect, useMemo, useState } from "react";
import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CreativeDetailsDialog } from "@/components/creative-studio/review/CreativeDetailsDialog";
import { CreativeStatusBadge } from "@/components/creative-studio/review/CreativeStatusBadge";

type CreativeRow = Database["public"]["Tables"]["creatives"]["Row"];
type CreativeStatus = Database["public"]["Enums"]["creative_status"];

type FilterKey = "all" | CreativeStatus;

export default function CreativeStudioReview() {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  const [filter, setFilter] = useState<FilterKey>("generated");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CreativeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<CreativeRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const load = async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    try {
      let qy = supabase
        .from("creatives")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (filter !== "all") qy = qy.eq("status", filter);

      const { data, error } = await qy;
      if (error) throw error;
      setItems(data ?? []);
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao carregar criativos",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const hay = [c.concept_headline, c.concept_subheadline, c.caption]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const openDetails = (c: CreativeRow) => {
    setSelected(c);
    setDetailsOpen(true);
  };

  return (
    <StudioShell title="Revisão">
      <Card>
        <CardHeader>
          <CardTitle>Revisar criativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título/legenda..."
                disabled={!activeCompanyId}
              />
            </div>
            <Button variant="outline" onClick={load} disabled={!activeCompanyId || isLoading}>
              {isLoading ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>

          {!activeCompanyId ? (
            <p className="text-sm text-muted-foreground">
              Selecione/crie uma empresa na aba <strong>Home</strong> para ver os criativos.
            </p>
          ) : (
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                <TabsTrigger value="generated">Gerados</TabsTrigger>
                <TabsTrigger value="approved">Aprovados</TabsTrigger>
                <TabsTrigger value="rejected">Reprovados</TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
              </TabsList>

              <TabsContent value={filter}>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum criativo encontrado.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openDetails(c)}
                        className="text-left rounded-lg border p-4 space-y-2 hover:bg-muted/30 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium line-clamp-2">{c.concept_headline || "(sem título)"}</p>
                          <CreativeStatusBadge status={c.status} />
                        </div>
                        {c.caption && <p className="text-xs text-muted-foreground line-clamp-3">{c.caption}</p>}
                        <p className="text-xs text-muted-foreground">v{c.version}</p>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <CreativeDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        creative={selected}
        onUpdated={load}
      />
    </StudioShell>
  );
}
