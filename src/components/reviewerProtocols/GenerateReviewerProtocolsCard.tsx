import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/currency";

interface PreviewData {
  reviewerCount: number;
  totalOrders: number;
  totalDocuments: number;
  totalAmount: number;
  reviewers: Array<{
    reviewer_id: string;
    reviewer_name: string;
    reviewer_email: string;
    orderCount: number;
    documentCount: number;
    totalAmount: number;
  }>;
}

export const GenerateReviewerProtocolsCard = ({ onProtocolsGenerated }: { onProtocolsGenerated: () => void }) => {
  const [competenceMonth, setCompetenceMonth] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const handlePreview = async () => {
    if (!competenceMonth) {
      toast.error("Selecione o mês de competência");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-reviewer-protocols', {
        body: {
          competence: format(competenceMonth, 'yyyy-MM-dd'),
          preview: true,
        },
      });

      if (error) throw error;

      if (data.reviewerCount === 0) {
        toast.info("Nenhum pedido entregue encontrado para este mês");
        return;
      }

      setPreviewData(data);
      setPreviewOpen(true);
    } catch (error: any) {
      console.error('Error previewing protocols:', error);
      toast.error("Erro ao carregar preview: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!competenceMonth) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-reviewer-protocols', {
        body: {
          competence: format(competenceMonth, 'yyyy-MM-dd'),
          preview: false,
        },
      });

      if (error) throw error;

      toast.success(
        `${data.protocolsCreated} protocolo(s) gerado(s) com sucesso!` +
        (data.protocolsSkipped > 0 ? ` (${data.protocolsSkipped} já existiam)` : '')
      );

      setPreviewOpen(false);
      setPreviewData(null);
      onProtocolsGenerated();
    } catch (error: any) {
      console.error('Error generating protocols:', error);
      toast.error("Erro ao gerar protocolos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Protocolos de Revisores
          </CardTitle>
          <CardDescription>
            Selecione o mês de competência para gerar os protocolos dos revisores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !competenceMonth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {competenceMonth ? format(competenceMonth, "MMMM 'de' yyyy", { locale: ptBR }) : "Selecionar mês"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={competenceMonth}
                  onSelect={setCompetenceMonth}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Button
              onClick={handlePreview}
              disabled={!competenceMonth || loading}
              variant="outline"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview - Protocolos de Revisores</DialogTitle>
            <DialogDescription>
              {competenceMonth && format(competenceMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{previewData.reviewerCount}</div>
                    <p className="text-xs text-muted-foreground">Revisores</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{previewData.totalOrders}</div>
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{previewData.totalDocuments}</div>
                    <p className="text-xs text-muted-foreground">Documentos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{formatCurrency(previewData.totalAmount)}</div>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Detalhamento por Revisor</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">Revisor</th>
                        <th className="px-4 py-2 text-center text-sm font-medium">Pedidos</th>
                        <th className="px-4 py-2 text-center text-sm font-medium">Docs</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.reviewers.map((reviewer) => (
                        <tr key={reviewer.reviewer_id} className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-medium">{reviewer.reviewer_name}</div>
                            <div className="text-xs text-muted-foreground">{reviewer.reviewer_email}</div>
                          </td>
                          <td className="px-4 py-3 text-center">{reviewer.orderCount}</td>
                          <td className="px-4 py-3 text-center">{reviewer.documentCount}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(reviewer.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
              Gerar Protocolos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};