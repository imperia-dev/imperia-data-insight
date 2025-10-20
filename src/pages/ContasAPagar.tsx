import { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlayCircle, Upload, FileText, CheckCircle, Eye, TrendingUp, Receipt, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface ContaPagar {
  id: string;
  protocolo: string;
  tipo: 'despesas' | 'prestadores' | 'revisores';
  prestador_nome: string;
  prestador_detalhe?: string; // Para email ou função do revisor
  valor_total: number;
  competencia: string | null;
  status: string;
  pago_em: string | null;
  nota_fiscal_url: string | null;
  created_at: string;
  original_data: any;
}

export default function ContasAPagar() {
  const { user } = useAuth();
  const { userRole, loading } = useRoleAccess("/contas-a-pagar");
  const { isCollapsed } = useSidebar();
  const [userName, setUserName] = useState('');
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [notaFiscal, setNotaFiscal] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("novos");
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchContas();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) setUserName(data.full_name || 'Usuário');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchContas = async () => {
    try {
      // Buscar protocolos de fechamento de despesas
      const { data: despesas, error: despesasError } = await supabase
        .from('expense_closing_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      if (despesasError) throw despesasError;

      // Buscar protocolos de prestadores
      const { data: prestadores, error: prestadoresError } = await supabase
        .from('service_provider_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      if (prestadoresError) throw prestadoresError;

      // Buscar protocolos de revisores
      const { data: revisores, error: revisoresError } = await supabase
        .from('reviewer_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      if (revisoresError) throw revisoresError;

      // Mapear protocolos de despesas
      const contasDespesas: ContaPagar[] = (despesas || []).map(d => ({
        id: d.id,
        protocolo: d.protocol_number,
        tipo: 'despesas' as const,
        prestador_nome: 'Fechamento de Despesas',
        valor_total: Number(d.total_amount || 0),
        competencia: d.competence_month,
        status: mapExpenseStatus(d.status),
        pago_em: d.paid_at,
        nota_fiscal_url: d.payment_receipt_url,
        created_at: d.created_at,
        original_data: d
      }));

      // Mapear protocolos de prestadores (excluindo cancelados)
      const contasPrestadores: ContaPagar[] = (prestadores || [])
        .filter(p => p.status !== 'cancelled')
        .map(p => ({
          id: p.id,
          protocolo: p.protocol_number,
          tipo: 'prestadores' as const,
          prestador_nome: p.provider_name || 'Prestador',
          valor_total: Number(p.total_amount || 0),
          competencia: p.competence_month,
          status: mapProviderStatus(p.status),
          pago_em: p.paid_at,
          nota_fiscal_url: null,
          created_at: p.created_at,
          original_data: p
        }));

      // Mapear protocolos de revisores (excluindo cancelados)
      const contasRevisores: ContaPagar[] = (revisores || [])
        .filter(r => r.status !== 'cancelled')
        .map(r => ({
          id: r.id,
          protocolo: r.protocol_number,
          tipo: 'revisores' as const,
          prestador_nome: r.reviewer_name || 'Revisor',
          prestador_detalhe: r.reviewer_email || undefined,
          valor_total: Number(r.total_amount || 0),
          competencia: r.competence_month,
          status: mapReviewerStatus(r.status),
          pago_em: r.paid_at,
          nota_fiscal_url: null,
          created_at: r.created_at,
          original_data: r
        }));

      // Combinar todos os protocolos
      const todasContas = [...contasDespesas, ...contasPrestadores, ...contasRevisores]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setContas(todasContas);
    } catch (error) {
      console.error('Error fetching contas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contas a pagar",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Mapear status de expense_closing_protocols para status de contas
  const mapExpenseStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'draft': 'novo',
      'under_review': 'novo',
      'approved': 'novo',
      'cancelled': 'novo',
      'closed': 'finalizado'
    };
    return statusMap[status] || 'novo';
  };

  // Mapear status de service_provider_protocols para status de contas
  const mapProviderStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'draft': 'novo',
      'awaiting_provider_data': 'novo',
      'awaiting_approval': 'novo',
      'approved': 'novo',
      'awaiting_payment': 'aguardando_pagamento',
      'cancelled': 'novo',
      'paid': 'finalizado',
      'completed': 'finalizado'
    };
    return statusMap[status] || 'novo';
  };

  // Mapear status de reviewer_protocols para status de contas
  const mapReviewerStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'draft': 'novo',
      'pending_approval': 'novo',
      'awaiting_approval': 'novo',
      'approved': 'novo',
      'awaiting_payment': 'aguardando_pagamento',
      'cancelled': 'novo',
      'paid': 'finalizado',
      'completed': 'finalizado'
    };
    return statusMap[status] || 'novo';
  };

  const iniciarProcessoPagamento = async (contaId: string) => {
    try {
      const conta = contas.find(c => c.id === contaId);
      if (!conta) return;

      let updateError;

      if (conta.tipo === 'despesas') {
        const { error } = await supabase
          .from('expense_closing_protocols')
          .update({ status: 'approved' })
          .eq('id', contaId);
        updateError = error;
      } else if (conta.tipo === 'prestadores') {
        const { error } = await supabase
          .from('service_provider_protocols')
          .update({ status: 'awaiting_payment' })
          .eq('id', contaId);
        updateError = error;
      } else if (conta.tipo === 'revisores') {
        const { error } = await supabase
          .from('reviewer_protocols')
          .update({ status: 'awaiting_payment' })
          .eq('id', contaId);
        updateError = error;
      }

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Processo de pagamento iniciado",
      });

      fetchContas();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar processo",
        variant: "destructive",
      });
    }
  };

  const marcarComoPago = async (contaId: string) => {
    try {
      const conta = contas.find(c => c.id === contaId);
      if (!conta) return;

      let updateError;
      const now = new Date().toISOString();

      if (conta.tipo === 'despesas') {
        const { error } = await supabase
          .from('expense_closing_protocols')
          .update({ 
            status: 'under_review',
            paid_at: now
          })
          .eq('id', contaId);
        updateError = error;
      } else if (conta.tipo === 'prestadores') {
        const { error } = await supabase
          .from('service_provider_protocols')
          .update({ 
            status: 'paid',
            paid_at: now
          })
          .eq('id', contaId);
        updateError = error;
      } else if (conta.tipo === 'revisores') {
        const { error } = await supabase
          .from('reviewer_protocols')
          .update({ 
            status: 'paid',
            paid_at: now
          })
          .eq('id', contaId);
        updateError = error;
      }

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Conta marcada como paga",
      });

      fetchContas();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar como pago",
        variant: "destructive",
      });
    }
  };

  const uploadNotaFiscal = async () => {
    if (!selectedConta || !notaFiscal) return;

    try {
      const fileExt = notaFiscal.name.split('.').pop();
      const fileName = `${selectedConta.id}-${Date.now()}.${fileExt}`;
      const filePath = `notas-fiscais/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, notaFiscal);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      let updateError;

      if (selectedConta.tipo === 'despesas') {
        const { error } = await supabase
          .from('expense_closing_protocols')
          .update({
            payment_receipt_url: publicUrl,
            status: 'closed'
          })
          .eq('id', selectedConta.id);
        updateError = error;
      } else if (selectedConta.tipo === 'prestadores') {
        const { error } = await supabase
          .from('service_provider_protocols')
          .update({
            status: 'completed'
          })
          .eq('id', selectedConta.id);
        updateError = error;
      } else if (selectedConta.tipo === 'revisores') {
        const { error } = await supabase
          .from('reviewer_protocols')
          .update({
            status: 'completed'
          })
          .eq('id', selectedConta.id);
        updateError = error;
      }

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Nota fiscal enviada com sucesso",
      });

      setSelectedConta(null);
      setNotaFiscal(null);
      fetchContas();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar nota fiscal",
        variant: "destructive",
      });
    }
  };

  const renderStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      novo: { label: "Novo", variant: "secondary" },
      aguardando_pagamento: { label: "Aguardando Pagamento", variant: "default" },
      aguardando_nf: { label: "Aguardando NF", variant: "outline" },
      finalizado: { label: "Finalizado", variant: "default" }
    };

    const config = variants[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const contasNovos = contas.filter(c => c.status === 'novo');
  const contasAguardandoPagamento = contas.filter(c => c.status === 'aguardando_pagamento');
  const contasAguardandoNF = contas.filter(c => c.status === 'aguardando_nf');
  const contasFinalizados = contas.filter(c => c.status === 'finalizado');

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <Header userName={userName} userRole={userRole} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie o fluxo completo de pagamentos
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      (activeTab === 'novos' ? contasNovos :
                       activeTab === 'aguardando' ? contasAguardandoPagamento :
                       activeTab === 'nf' ? contasAguardandoNF :
                       contasFinalizados).reduce((sum, c) => sum + c.valor_total, 0)
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(activeTab === 'novos' ? contasNovos :
                      activeTab === 'aguardando' ? contasAguardandoPagamento :
                      activeTab === 'nf' ? contasAguardandoNF :
                      contasFinalizados).length} conta{(activeTab === 'novos' ? contasNovos :
                        activeTab === 'aguardando' ? contasAguardandoPagamento :
                        activeTab === 'nf' ? contasAguardandoNF :
                        contasFinalizados).length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(activeTab === 'novos' ? contasNovos :
                      activeTab === 'aguardando' ? contasAguardandoPagamento :
                      activeTab === 'nf' ? contasAguardandoNF :
                      contasFinalizados).filter(c => c.tipo === 'despesas').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(
                      (activeTab === 'novos' ? contasNovos :
                        activeTab === 'aguardando' ? contasAguardandoPagamento :
                        activeTab === 'nf' ? contasAguardandoNF :
                        contasFinalizados).filter(c => c.tipo === 'despesas').reduce((sum, c) => sum + c.valor_total, 0)
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prestadores</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(activeTab === 'novos' ? contasNovos :
                      activeTab === 'aguardando' ? contasAguardandoPagamento :
                      activeTab === 'nf' ? contasAguardandoNF :
                      contasFinalizados).filter(c => c.tipo === 'prestadores').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(
                      (activeTab === 'novos' ? contasNovos :
                        activeTab === 'aguardando' ? contasAguardandoPagamento :
                        activeTab === 'nf' ? contasAguardandoNF :
                        contasFinalizados).filter(c => c.tipo === 'prestadores').reduce((sum, c) => sum + c.valor_total, 0)
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revisores</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(activeTab === 'novos' ? contasNovos :
                      activeTab === 'aguardando' ? contasAguardandoPagamento :
                      activeTab === 'nf' ? contasAguardandoNF :
                      contasFinalizados).filter(c => c.tipo === 'revisores').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(
                      (activeTab === 'novos' ? contasNovos :
                        activeTab === 'aguardando' ? contasAguardandoPagamento :
                        activeTab === 'nf' ? contasAguardandoNF :
                        contasFinalizados).filter(c => c.tipo === 'revisores').reduce((sum, c) => sum + c.valor_total, 0)
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="novos">
                  Novos ({contasNovos.length})
                </TabsTrigger>
                <TabsTrigger value="aguardando">
                  Aguardando Pagamento ({contasAguardandoPagamento.length})
                </TabsTrigger>
                <TabsTrigger value="nf">
                  Aguardando NF ({contasAguardandoNF.length})
                </TabsTrigger>
                <TabsTrigger value="finalizados">
                  Finalizados ({contasFinalizados.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="novos" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Itens Novos</CardTitle>
                    <CardDescription>Contas que ainda não iniciaram o processo de pagamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocolo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Prestador</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contasNovos.map((conta) => (
                          <TableRow key={conta.id}>
                            <TableCell className="font-mono">{conta.protocolo}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {conta.tipo === 'despesas' ? 'Despesas' : conta.tipo === 'prestadores' ? 'Prestadores' : 'Revisores'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{conta.prestador_nome}</p>
                                {conta.prestador_detalhe && (
                                  <p className="text-xs text-muted-foreground">{conta.prestador_detalhe}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {conta.competencia ? new Date(conta.competencia).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '-'}
                            </TableCell>
                            <TableCell>{formatCurrency(conta.valor_total)}</TableCell>
                            <TableCell>{renderStatusBadge(conta.status)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => iniciarProcessoPagamento(conta.id)}
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Iniciar Processo
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="aguardando" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Aguardando Pagamento</CardTitle>
                    <CardDescription>Contas com processo iniciado aguardando pagamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocolo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Prestador</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contasAguardandoPagamento.map((conta) => (
                          <TableRow key={conta.id}>
                            <TableCell className="font-mono">{conta.protocolo}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {conta.tipo === 'despesas' ? 'Despesas' : conta.tipo === 'prestadores' ? 'Prestadores' : 'Revisores'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{conta.prestador_nome}</p>
                                {conta.prestador_detalhe && (
                                  <p className="text-xs text-muted-foreground">{conta.prestador_detalhe}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {conta.competencia ? new Date(conta.competencia).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '-'}
                            </TableCell>
                            <TableCell>{formatCurrency(conta.valor_total)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => marcarComoPago(conta.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar como Pago
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nf" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Aguardando Nota Fiscal</CardTitle>
                    <CardDescription>Pagamentos realizados aguardando upload da NF</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocolo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Prestador</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Pago em</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contasAguardandoNF.map((conta) => (
                          <TableRow key={conta.id}>
                            <TableCell className="font-mono">{conta.protocolo}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {conta.tipo === 'despesas' ? 'Despesas' : conta.tipo === 'prestadores' ? 'Prestadores' : 'Revisores'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{conta.prestador_nome}</p>
                                {conta.prestador_detalhe && (
                                  <p className="text-xs text-muted-foreground">{conta.prestador_detalhe}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {conta.competencia ? new Date(conta.competencia).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '-'}
                            </TableCell>
                            <TableCell>{formatCurrency(conta.valor_total)}</TableCell>
                            <TableCell>{conta.pago_em ? new Date(conta.pago_em).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedConta(conta)}
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload NF
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Enviar Nota Fiscal</DialogTitle>
                                    <DialogDescription>
                                      Protocolo: {conta.protocolo}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="nf">Nota Fiscal (PDF)</Label>
                                      <Input
                                        id="nf"
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setNotaFiscal(e.target.files?.[0] || null)}
                                      />
                                    </div>
                                    <Button onClick={uploadNotaFiscal} disabled={!notaFiscal}>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Enviar Nota Fiscal
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="finalizados" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pagamentos Finalizados</CardTitle>
                    <CardDescription>Contas completas (pagos + NF anexada)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocolo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Prestador</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>NF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contasFinalizados.map((conta) => (
                          <TableRow key={conta.id}>
                            <TableCell className="font-mono">{conta.protocolo}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {conta.tipo === 'despesas' ? 'Despesas' : conta.tipo === 'prestadores' ? 'Prestadores' : 'Revisores'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{conta.prestador_nome}</p>
                                {conta.prestador_detalhe && (
                                  <p className="text-xs text-muted-foreground">{conta.prestador_detalhe}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {conta.competencia ? new Date(conta.competencia).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '-'}
                            </TableCell>
                            <TableCell>{formatCurrency(conta.valor_total)}</TableCell>
                            <TableCell>{renderStatusBadge(conta.status)}</TableCell>
                            <TableCell>
                              {conta.nota_fiscal_url && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={conta.nota_fiscal_url} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Ver NF
                                  </a>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
