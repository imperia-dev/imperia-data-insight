import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";

export default function CreativeStudioReview() {
  const { activeCompanyId } = useActiveCompany();

  return (
    <StudioShell title="Revisão & Aprovação">
      <Card>
        <CardHeader>
          <CardTitle>Cards de criativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            Próximo passo: listar <code>creatives</code> por empresa/geração e permitir Aprovar/Reprovar/Ajustar,
            respeitando a regra de que aprovado não volta para reprovado (só gera nova versão).
          </p>
          <p className="text-sm text-muted-foreground">Empresa ativa: {activeCompanyId || "(nenhuma)"}</p>
        </CardContent>
      </Card>
    </StudioShell>
  );
}
