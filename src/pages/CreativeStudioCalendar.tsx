import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";

export default function CreativeStudioCalendar() {
  const { activeCompanyId } = useActiveCompany();

  return (
    <StudioShell title="Calendário">
      <Card>
        <CardHeader>
          <CardTitle>Agenda de posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            Próximo passo: drag-and-drop de criativos aprovados para datas/horas, salvar em <code>calendar_posts</code> e
            exportar CSV (data, legenda, hashtags, image_url).
          </p>
          <p className="text-sm text-muted-foreground">Empresa ativa: {activeCompanyId || "(nenhuma)"}</p>
        </CardContent>
      </Card>
    </StudioShell>
  );
}
