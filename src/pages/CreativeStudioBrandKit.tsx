import { useEffect, useMemo, useState } from "react";
import { StudioShell } from "@/components/creative-studio/StudioShell";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { useStudioCompanies } from "@/hooks/creative-studio/useStudioCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const hexRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export default function CreativeStudioBrandKit() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const { data: companies } = useStudioCompanies();
  const company = useMemo(
    () => companies?.find((c) => c.id === activeCompanyId) || null,
    [companies, activeCompanyId]
  );

  const [paletteHex, setPaletteHex] = useState("#");
  const [saving, setSaving] = useState(false);
  const [palette, setPalette] = useState<string[]>([]);
  const [loadingPalette, setLoadingPalette] = useState(false);

  const loadPalette = async () => {
    if (!activeCompanyId) {
      setPalette([]);
      return;
    }

    setLoadingPalette(true);
    try {
      const { data, error } = await supabase
        .from("brand_assets")
        .select("value")
        .eq("company_id", activeCompanyId)
        .eq("asset_type", "palette")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const hexes = (data ?? [])
        .map((row) => {
          const v = row.value as any;
          const hex = typeof v?.hex === "string" ? v.hex : null;
          return hex;
        })
        .filter((h): h is string => !!h);

      setPalette(hexes);
    } catch (e) {
      console.error(e);
      setPalette([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a paleta salva.",
        variant: "destructive",
      });
    } finally {
      setLoadingPalette(false);
    }
  };

  useEffect(() => {
    void loadPalette();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const addPaletteColor = async () => {
    if (!activeCompanyId) {
      toast({ title: "Selecione uma empresa", description: "Volte na Home do Creative Studio e selecione uma empresa." });
      return;
    }

    if (!hexRegex.test(paletteHex.trim())) {
      toast({ title: "Cor inválida", description: "Use HEX (#RRGGBB).", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not_authenticated");

      const { error } = await supabase.from("brand_assets").insert({
        company_id: activeCompanyId,
        asset_type: "palette",
        value: { hex: paletteHex.trim() },
        created_by: user.id,
      } as any);
      if (error) throw error;

      toast({ title: "Cor adicionada", description: "A cor foi salva no Brand Kit." });
      setPaletteHex("#");
      await loadPalette();
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível salvar a cor.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudioShell title="Brand Kit">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Identidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Empresa ativa: <span className="text-foreground font-medium">{company?.name || "(nenhuma)"}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              MVP: aqui vamos começar pelo essencial (paleta). Upload de logo/exemplos entra no próximo passo.
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium">Cores salvas</p>
              {!activeCompanyId ? (
                <p className="text-sm text-muted-foreground">Selecione uma empresa para ver a paleta.</p>
              ) : loadingPalette ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : palette.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma cor salva ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {palette.map((hex, idx) => (
                    <div
                      key={`${hex}-${idx}`}
                      className="flex items-center gap-2 rounded-md border bg-card px-2 py-1"
                    >
                      <span
                        className="h-5 w-5 rounded-sm border"
                        style={{ backgroundColor: hex }}
                        aria-label={`Cor ${hex}`}
                        title={hex}
                      />
                      <span className="text-xs font-mono text-muted-foreground">{hex}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paleta (mín. 1 cor)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hex">Cor HEX</Label>
              <Input id="hex" value={paletteHex} onChange={(e) => setPaletteHex(e.target.value)} />
            </div>
            <Button className="w-full" onClick={addPaletteColor} disabled={saving}>
              {saving ? "Salvando..." : "Adicionar cor"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}
