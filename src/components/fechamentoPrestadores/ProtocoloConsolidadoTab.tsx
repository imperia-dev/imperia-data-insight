import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GitMerge, AlertTriangle, CheckCircle, DollarSign, FileDown, Building2 } from "lucide-react";
import { ProtocolStatusBadge } from "./ProtocolStatusBadge";

export function ProtocoloConsolidadoTab() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [consolidatedProtocol, setConsolidatedProtocol] = useState<any>(null);
  const [individualProtocols, setIndividualProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const monthStart = `${selectedMonth}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      
      // Fetch consolidated protocol for the month
      const { data: consolidated, error: consError } = await supabase
        .from('consolidated_protocols')
        .select('*')
        .gte('competence_month', monthStart)
        .lte('competence_month', monthEnd)
        .maybeSingle();

      if (consError) throw consError;

      setConsolidatedProtocol(consolidated);

      // Fetch individual protocols for the month
      const { data: individual, error: indError } = await supabase
        .from('service_provider_protocols')
        .select('*')
        .gte('competence_month', monthStart)
        .lte('competence_month', monthEnd)
        .order('provider_name');

      if (indError) throw indError;

      setIndividualProtocols(individual || []);

      // Check if can generate consolidated (all must be approved or paid)
      const allApproved = (individual || []).every(
        (p: any) => p.status === 'approved' || p.status === 'paid'
      );
      setCanGenerate(allApproved && !consolidated && (individual || []).length > 0);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateConsolidated = async () => {
    if (!canGenerate) return;

    setLoading(true);
    try {
      const protocolIds = individualProtocols.map(p => p.id);
      const totalAmount = individualProtocols.reduce((sum, p) => sum + (p.total_amount || 0), 0);
      const expenseCount = individualProtocols.reduce((sum, p) => sum + (p.expense_count || 0), 0);

      const protocolNumber = `CONS-${selectedMonth.replace('-', '')}`;

      const { data, error } = await supabase
        .from('consolidated_protocols')
        .insert({
          competence_month: `${selectedMonth}-01`,
          protocol_number: protocolNumber,
          service_provider_protocol_ids: protocolIds,
          total_amount: totalAmount,
          expense_count: expenseCount,
          provider_count: individualProtocols.length,
          status: 'draft',
          summary_data: individualProtocols
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Protocolo consolidado gerado com sucesso!");
      fetchData();
    } catch (error: any) {
      console.error('Error generating consolidated:', error);
      toast.error("Erro ao gerar protocolo consolidado");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!consolidatedProtocol) return;

    try {
      const { error } = await supabase
        .from('consolidated_protocols')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', consolidatedProtocol.id);

      if (error) throw error;

      toast.success("Protocolo consolidado aprovado!");
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao aprovar protocolo");
    }
  };

  const handleMarkPaid = async () => {
    if (!consolidatedProtocol) return;

    try {
      const { error } = await supabase
        .from('consolidated_protocols')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', consolidatedProtocol.id);

      if (error) throw error;

      toast.success("Protocolo consolidado marcado como pago!");
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao marcar como pago");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Competência</CardTitle>
          <CardDescription>
            Escolha o mês para gerar ou visualizar o protocolo consolidado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="month">Mês de Competência</Label>
              <input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button onClick={fetchData} disabled={loading}>
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {!canGenerate && individualProtocols.length > 0 && !consolidatedProtocol && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não é possível gerar protocolo consolidado</AlertTitle>
          <AlertDescription>
            Todos os protocolos individuais do mês devem estar aprovados ou pagos para gerar o consolidado.
            <div className="mt-2">
              Pendentes: {individualProtocols.filter(p => !['approved', 'paid'].includes(p.status)).length}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {consolidatedProtocol ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <GitMerge className="h-6 w-6" />
                  {consolidatedProtocol.protocol_number}
                </CardTitle>
                <CardDescription>
                  Protocolo Consolidado - {format(new Date(selectedMonth), "MMMM 'de' yyyy", { locale: ptBR })}
                </CardDescription>
              </div>
              <ProtocolStatusBadge status={consolidatedProtocol.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(consolidatedProtocol.total_amount || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Prestadores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    {consolidatedProtocol.provider_count || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {consolidatedProtocol.expense_count || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Protocolos Individuais Incluídos</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Prestador</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {individualProtocols.map((protocol) => (
                    <TableRow key={protocol.id}>
                      <TableCell className="font-mono text-sm">{protocol.protocol_number}</TableCell>
                      <TableCell>{protocol.provider_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(protocol.total_amount || 0)}</TableCell>
                      <TableCell>
                        <ProtocolStatusBadge status={protocol.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              {consolidatedProtocol.status === 'draft' && (
                <Button onClick={handleApprove}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar Protocolo
                </Button>
              )}
              {consolidatedProtocol.status === 'approved' && (
                <Button onClick={handleMarkPaid}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Marcar como Pago
                </Button>
              )}
              <Button variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            {individualProtocols.length === 0 ? (
              <div className="text-muted-foreground">
                <GitMerge className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum protocolo individual encontrado para este mês</p>
              </div>
            ) : canGenerate ? (
              <div className="space-y-4">
                <GitMerge className="h-12 w-12 mx-auto text-primary" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Gerar Protocolo Consolidado</h3>
                  <p className="text-muted-foreground mb-4">
                    {individualProtocols.length} protocolos individuais estão prontos para consolidação
                  </p>
                  <Button onClick={handleGenerateConsolidated} disabled={loading}>
                    <GitMerge className="h-4 w-4 mr-2" />
                    Gerar Protocolo Consolidado
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                <p>Aguardando aprovação de todos os protocolos individuais</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
