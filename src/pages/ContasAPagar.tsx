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
import { Loader2, PlayCircle, Upload, FileText, CheckCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface ContaPagar {
  id: string;
  protocolo: string | null;
  pedido_ids: string[];
  prestador_nome: string;
  prestador_cpf: string | null;
  prestador_cnpj: string | null;
  prestador_funcao: string | null;
  meio_pagamento_digital: string | null;
  meio_pagamento_agencia: string | null;
  valor_total: number;
  status: string;
  anexos: string[];
  observacoes: string | null;
  nota_fiscal_url: string | null;
  pago_em: string | null;
  created_at: string;
}

interface ProtocoloDespesa {
  id: string;
  protocol_number: string;
  competence_month: string;
  total_amount: number;
  expense_count: number;
  status: string;
  created_at: string;
  payment_receipt_url: string | null;
  notes: string | null;
  approved_at: string | null;
  paid_at: string | null;
}

export default function ContasAPagar() {
  const { user } = useAuth();
  const { userRole, loading } = useRoleAccess("/contas-a-pagar");
  const { isCollapsed } = useSidebar();
  const [userName, setUserName] = useState('');
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [protocolosDespesas, setProtocolosDespesas] = useState<ProtocoloDespesa[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [notaFiscal, setNotaFiscal] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchContas();
      fetchProtocolosDespesas();
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
      const { data, error } = await supabase
        .from('contas_a_pagar')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContas(data || []);
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

  const fetchProtocolosDespesas = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_closing_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProtocolosDespesas(data || []);
    } catch (error) {
      console.error('Error fetching expense protocols:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar protocolos de despesas",
        variant: "destructive",
      });
    }
  };

  const iniciarProcessoPagamento = async (contaId: string) => {
    try {
      const protocolo = `PAG-${Date.now()}`;
      
      const { error } = await supabase
        .from('contas_a_pagar')
        .update({
          protocolo,
          status: 'aguardando_pagamento'
        })
        .eq('id', contaId);

      if (error) throw error;

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
      const { error } = await supabase
        .from('contas_a_pagar')
        .update({
          status: 'aguardando_nf',
          pago_em: new Date().toISOString()
        })
        .eq('id', contaId);

      if (error) throw error;

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

      const { error } = await supabase
        .from('contas_a_pagar')
        .update({
          nota_fiscal_url: publicUrl,
          status: 'finalizado'
        })
        .eq('id', selectedConta.id);

      if (error) throw error;

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
      finalizado: { label: "Finalizado", variant: "default" },
      draft: { label: "Rascunho", variant: "secondary" },
      approved: { label: "Aprovado", variant: "default" },
      paid: { label: "Pago", variant: "outline" },
      reviewed: { label: "Revisado", variant: "default" }
    };

    const config = variants[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const contasNovos = contas.filter(c => c.status === 'novo');
  const contasAguardandoPagamento = contas.filter(c => c.status === 'aguardando_pagamento');
  const contasAguardandoNF = contas.filter(c => c.status === 'aguardando_nf');
  const contasFinalizados = contas.filter(c => c.status === 'finalizado');

  const protocolosDraft = protocolosDespesas.filter(p => p.status === 'draft');
  const protocolosApproved = protocolosDespesas.filter(p => p.status === 'approved');
  const protocolosPaid = protocolosDespesas.filter(p => p.status === 'paid');

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

            <Tabs defaultValue="protocolos" className="space-y-4">
              <TabsList>
                <TabsTrigger value="protocolos">
                  Protocolos de Despesas ({protocolosDespesas.length})
                </TabsTrigger>
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

              <TabsContent value="protocolos" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{protocolosDraft.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(protocolosDraft.reduce((sum, p) => sum + p.total_amount, 0))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{protocolosApproved.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(protocolosApproved.reduce((sum, p) => sum + p.total_amount, 0))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Pagos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{protocolosPaid.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(protocolosPaid.reduce((sum, p) => sum + p.total_amount, 0))}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Protocolos de Despesas</CardTitle>
                    <CardDescription>Protocolos consolidados de fechamento de despesas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocolo</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Qtd. Despesas</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {protocolosDespesas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Nenhum protocolo de despesa encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          protocolosDespesas.map((protocolo) => (
                            <TableRow key={protocolo.id}>
                              <TableCell className="font-mono">{protocolo.protocol_number}</TableCell>
                              <TableCell>
                                {new Date(protocolo.competence_month).toLocaleDateString('pt-BR', { 
                                  month: 'long', 
                                  year: 'numeric' 
                                })}
                              </TableCell>
                              <TableCell>{protocolo.expense_count}</TableCell>
                              <TableCell>{formatCurrency(protocolo.total_amount)}</TableCell>
                              <TableCell>{renderStatusBadge(protocolo.status)}</TableCell>
                              <TableCell>
                                {new Date(protocolo.created_at).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell>
                                {protocolo.payment_receipt_url && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={protocolo.payment_receipt_url} target="_blank" rel="noopener noreferrer">
                                      <FileText className="h-4 w-4 mr-2" />
                                      Ver Comprovante
                                    </a>
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

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
                          <TableHead>Prestador</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contasNovos.map((conta) => (
                          <TableRow key={conta.id}>
                            <TableCell>{conta.prestador_nome}</TableCell>
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
                          <TableHead>Prestador</TableHead>
                          <TableHead>CPF/CNPJ</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contasAguardandoPagamento.map((conta) => (
                          <TableRow key={conta.id}>
                            <TableCell className="font-mono">{conta.protocolo}</TableCell>
                            <TableCell>{conta.prestador_nome}</TableCell>
                            <TableCell>{conta.prestador_cpf || conta.prestador_cnpj}</TableCell>
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
                          <TableHead>Prestador</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Pago em</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contasAguardandoNF.map((conta) => (
                          <TableRow key={conta.id}>
                            <TableCell className="font-mono">{conta.protocolo}</TableCell>
                            <TableCell>{conta.prestador_nome}</TableCell>
                            <TableCell>{formatCurrency(conta.valor_total)}</TableCell>
                            <TableCell>{new Date(conta.pago_em!).toLocaleDateString()}</TableCell>
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
                          <TableHead>Prestador</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>NF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contasFinalizados.map((conta) => (
                          <TableRow key={conta.id}>
                            <TableCell className="font-mono">{conta.protocolo}</TableCell>
                            <TableCell>{conta.prestador_nome}</TableCell>
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
