import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";

export default function CreativeStudioSources() {
  const { activeCompanyId } = useActiveCompany();

  return (
    <StudioShell title="Fontes de Conteúdo">
      <Card>
        <CardHeader>
          <CardTitle>Contexto para a IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            MVP inicial: vamos salvar inspirações (texto/URLs) no <code>knowledge_base</code> e usar na geração.
          </p>
          <p className="text-sm text-muted-foreground">Empresa ativa: {activeCompanyId || "(nenhuma)"}</p>
          <p className="text-sm text-muted-foreground">
            Firecrawl: ficará disponível apenas para uso interno do role global <strong>owner</strong> (próxima etapa).
          </p>
        </CardContent>
      </Card>
    </StudioShell>
  );
}
