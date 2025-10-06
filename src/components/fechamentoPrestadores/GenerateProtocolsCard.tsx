import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { FileSpreadsheet, Users, DollarSign, Loader2 } from "lucide-react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProviderPreview {
  supplier_id: string;
  provider_name: string;
  provider_email: string;
  expense_count: number;
  total_amount: number;
}

export function GenerateProtocolsCard({ onProtocolsGenerated }: { onProtocolsGenerated?: () => void }) {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<ProviderPreview[]>([]);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([]);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Generate last 12 months options
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      const value = format(date, "yyyy-MM");
      const label = format(date, "MMMM 'de' yyyy", { locale: ptBR });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    setMonthOptions(months);
    setSelectedMonth(months[1].value); // Previous month by default

    // Fetch service providers
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'operation')
        .order('full_name');

      if (error) throw error;
      
      const formattedProviders = (data || []).map(p => ({
        id: p.id,
        name: p.full_name
      }));
      
      setProviders(formattedProviders);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const fetchPreview = async () => {
    if (!selectedMonth) {
      toast.error("Selecione uma competência");
      return;
    }

    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-provider-protocols', {
        body: { 
          competence: selectedMonth,
          preview: true,
          provider_id: selectedProvider === 'all' ? null : selectedProvider
        }
      });

      if (error) throw error;
      
      setPreview(data.providers || []);
      setPreviewDialogOpen(true);
    } catch (error: any) {
      console.error('Error fetching preview:', error);
      toast.error(error.message || "Erro ao buscar preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const generateProtocols = async () => {
    if (!selectedMonth) {
      toast.error("Selecione uma competência");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-provider-protocols', {
        body: { 
          competence: selectedMonth,
          preview: false,
          provider_id: selectedProvider === 'all' ? null : selectedProvider
        }
      });

      if (error) throw error;
      
      const { created, skipped } = data;
      
      if (created > 0) {
        toast.success(`${created} protocolo(s) gerado(s) com sucesso!`);
      }
      
      if (skipped > 0) {
        toast.info(`${skipped} protocolo(s) já existente(s)`);
      }
      
      if (created === 0 && skipped === 0) {
        toast.info("Nenhum prestador com documentos pendentes nesta competência");
      }
      
      setPreviewDialogOpen(false);
      onProtocolsGenerated?.();
    } catch (error: any) {
      console.error('Error generating protocols:', error);
      toast.error(error.message || "Erro ao gerar protocolos");
    } finally {
      setLoading(false);
    }
  };

  const totalProviders = preview.length;
  const totalAmount = preview.reduce((sum, p) => sum + p.total_amount, 0);
  const totalDocs = preview.reduce((sum, p) => sum + p.expense_count, 0);

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Gerar Protocolos de Fechamento
          </CardTitle>
          <CardDescription>
            Gere protocolos individuais baseados nos documentos completos dos prestadores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Competência</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Prestador</label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prestador" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Todos os Prestadores</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchPreview}
              disabled={!selectedMonth || previewLoading}
              className="flex-1"
            >
              {previewLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Preview Prestadores
                </>
              )}
            </Button>
            <Button 
              onClick={generateProtocols}
              disabled={!selectedMonth || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Gerar Protocolos
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview de Protocolos</DialogTitle>
            <DialogDescription>
              {selectedMonth && `Competência: ${format(new Date(selectedMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}`}
            </DialogDescription>
          </DialogHeader>

          {preview.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prestador com documentos pendentes nesta competência
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-2xl font-bold">{totalProviders}</p>
                        <p className="text-xs text-muted-foreground">Prestadores</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-2xl font-bold">{totalDocs}</p>
                        <p className="text-xs text-muted-foreground">Documentos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestador</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Documentos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((provider, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{provider.provider_name}</TableCell>
                      <TableCell className="text-muted-foreground">{provider.provider_email}</TableCell>
                      <TableCell className="text-center">{provider.expense_count}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(provider.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={generateProtocols}
              disabled={preview.length === 0 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                `Gerar ${totalProviders} Protocolo(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
