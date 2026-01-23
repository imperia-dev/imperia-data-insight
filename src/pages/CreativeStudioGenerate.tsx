import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";

export default function CreativeStudioGenerate() {
  const { activeCompanyId } = useActiveCompany();

  return (
    <StudioShell title="Geração em Lote">
      <Card>
        <CardHeader>
          <CardTitle>Wizard de geração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            Próximo passo: formulário (objetivo, tema, CTA, formato, quantidade 1–20) + chamada de Edge Function
            para gerar conceitos/legendas/hashtags/imagens e persistir em <code>generations</code> + <code>creatives</code>.
          </p>
          <p className="text-sm text-muted-foreground">Empresa ativa: {activeCompanyId || "(nenhuma)"}</p>
        </CardContent>
      </Card>
    </StudioShell>
  );
}
