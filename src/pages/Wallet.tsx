import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet as WalletIcon, TrendingUp, FileText, Clock, CheckCircle, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface OrderPayment {
  id: string;
  order_number: string;
  document_count: number;
  delivered_at: string;
  payment_amount: number;
}

interface ServiceProviderProtocol {
  id: string;
  protocol_number: string;
  competence_month: string;
  total_amount: number;
  expense_count: number;
  status: string;
  provider_approved_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function Wallet() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [orders, setOrders] = useState<OrderPayment[]>([]);
  const [protocols, setProtocols] = useState<ServiceProviderProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [protocolsLoading, setProtocolsLoading] = useState(true);
  
  // Payment info state
  const [paymentInfo, setPaymentInfo] = useState({
    cpf: "",
    cnpj: "",
    pix_key: "",
    phone: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "corrente"
  });
  const [savingPaymentInfo, setSavingPaymentInfo] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role, email')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
          setUserRole(data.role);
          setUserEmail(data.email);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    fetchOrders();
    if (userEmail) {
      fetchProtocols();
    }
  }, [user, userEmail]);

  const fetchOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('status_order', 'delivered')
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false });

      if (error) throw error;

      const PAYMENT_PER_DOCUMENT = 1.30;
      const ordersWithPayment = data?.map(order => ({
        id: order.id,
        order_number: order.order_number,
        document_count: order.document_count || 0,
        delivered_at: order.delivered_at,
        payment_amount: (order.document_count || 0) * PAYMENT_PER_DOCUMENT
      })) || [];

      setOrders(ordersWithPayment);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProtocols = async () => {
    if (!userEmail) return;
    
    setProtocolsLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_provider_protocols')
        .select('*')
        .eq('provider_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProtocols(data || []);
      
      // Load payment info from the most recent protocol if exists
      if (data && data.length > 0) {
        const latest = data[0];
        setPaymentInfo({
          cpf: latest.provider_cpf || "",
          cnpj: latest.provider_cnpj || "",
          pix_key: latest.provider_pix_key || "",
          phone: latest.provider_phone || "",
          banco: latest.provider_banco || "",
          agencia: latest.provider_agencia || "",
          conta: latest.provider_conta || "",
          tipo_conta: latest.provider_tipo_conta || "corrente"
        });
      }
    } catch (error) {
      console.error('Error fetching protocols:', error);
      toast.error("Erro ao carregar protocolos");
    } finally {
      setProtocolsLoading(false);
    }
  };

  const handleSavePaymentInfo = async () => {
    if (!userEmail) {
      toast.error("Email do usuário não encontrado");
      return;
    }

    setSavingPaymentInfo(true);
    try {
      // Update all protocols with the new payment information
      const { error } = await supabase
        .from('service_provider_protocols')
        .update({
          provider_cpf: paymentInfo.cpf || null,
          provider_cnpj: paymentInfo.cnpj || null,
          provider_pix_key: paymentInfo.pix_key || null,
          provider_phone: paymentInfo.phone || null,
          provider_banco: paymentInfo.banco || null,
          provider_agencia: paymentInfo.agencia || null,
          provider_conta: paymentInfo.conta || null,
          provider_tipo_conta: paymentInfo.tipo_conta || null,
        })
        .eq('provider_email', userEmail);

      if (error) throw error;

      toast.success("Informações de pagamento salvas com sucesso");
      fetchProtocols();
    } catch (error: any) {
      console.error('Error saving payment info:', error);
      toast.error(error.message || "Erro ao salvar informações de pagamento");
    } finally {
      setSavingPaymentInfo(false);
    }
  };

  const handleApproveProtocol = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from('service_provider_protocols')
        .update({
          status: 'approved',
          provider_approved_at: new Date().toISOString(),
        })
        .eq('id', protocolId)
        .eq('provider_email', userEmail);

      if (error) throw error;

      toast.success("Protocolo aprovado com sucesso");
      fetchProtocols();
    } catch (error: any) {
      console.error('Error approving protocol:', error);
      toast.error(error.message || "Erro ao aprovar protocolo");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "secondary" },
      awaiting_provider: { label: "Aguardando Aprovação", variant: "outline" },
      approved: { label: "Aprovado", variant: "default" },
      paid: { label: "Pago", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" }
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalEarnings = orders.reduce((sum, order) => sum + order.payment_amount, 0);
  const totalDocuments = orders.reduce((sum, order) => sum + order.document_count, 0);
  const averagePerOrder = orders.length > 0 ? totalEarnings / orders.length : 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-foreground">
              Carteira
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe seus ganhos e histórico de pedidos
            </p>
          </div>

          <Tabs defaultValue="earnings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="earnings">Ganhos</TabsTrigger>
              <TabsTrigger value="protocols">Protocolos</TabsTrigger>
              <TabsTrigger value="payment-info">Dados de Pagamento</TabsTrigger>
            </TabsList>

            <TabsContent value="earnings" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Ganhos</CardTitle>
                    <WalletIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
                    <p className="text-xs text-muted-foreground">
                      Valor total acumulado
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Documentos Traduzidos</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalDocuments}</div>
                    <p className="text-xs text-muted-foreground">
                      Total de documentos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Média por Pedido</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(averagePerOrder)}</div>
                    <p className="text-xs text-muted-foreground">
                      Valor médio
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pedidos Entregues</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{orders.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Total de pedidos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Value per Document Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Valor por Documento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      R$ 1,30
                    </Badge>
                    <span className="text-muted-foreground">
                      por documento traduzido
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Pedidos</CardTitle>
                  <CardDescription>
                    Detalhamento dos pedidos entregues e seus valores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando dados...
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum pedido entregue ainda
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Data de Entrega</TableHead>
                          <TableHead className="text-center">Documentos</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_number}</TableCell>
                            <TableCell>
                              {format(new Date(order.delivered_at), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-center">{order.document_count}</TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {formatCurrency(order.payment_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="protocols" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Protocolos de Pagamento</CardTitle>
                  <CardDescription>
                    Acompanhe o status dos seus protocolos de fechamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {protocolsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando protocolos...
                    </div>
                  ) : protocols.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                      <Info className="h-8 w-8" />
                      <p>Nenhum protocolo encontrado</p>
                      <p className="text-sm">Os protocolos serão gerados automaticamente pela administração</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocolo</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead className="text-center">Despesas</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {protocols.map((protocol) => (
                          <TableRow key={protocol.id}>
                            <TableCell className="font-medium">{protocol.protocol_number}</TableCell>
                            <TableCell>
                              {format(new Date(protocol.competence_month), "MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-center">{protocol.expense_count}</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(protocol.total_amount)}
                            </TableCell>
                            <TableCell>{getStatusBadge(protocol.status)}</TableCell>
                            <TableCell>
                              {protocol.status === 'awaiting_provider' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveProtocol(protocol.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                              )}
                              {protocol.status === 'approved' && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Aguardando pagamento
                                </span>
                              )}
                              {protocol.status === 'paid' && protocol.paid_at && (
                                <span className="text-sm text-green-600 flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  Pago em {format(new Date(protocol.paid_at), "dd/MM/yyyy")}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <Info className="h-5 w-5" />
                    Como Funciona o Processo de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-blue-900 dark:text-blue-100">
                  <div className="flex items-start gap-2">
                    <div className="rounded-full bg-blue-200 dark:bg-blue-900 w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                    <p><strong>Geração:</strong> A administração gera os protocolos mensalmente com base nas suas despesas.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="rounded-full bg-blue-200 dark:bg-blue-900 w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                    <p><strong>Aprovação:</strong> Você recebe uma notificação para revisar e aprovar o protocolo.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="rounded-full bg-blue-200 dark:bg-blue-900 w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                    <p><strong>Processamento:</strong> Após sua aprovação, o pagamento é processado pela administração.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="rounded-full bg-blue-200 dark:bg-blue-900 w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold">4</div>
                    <p><strong>Pagamento:</strong> O valor é transferido para sua conta cadastrada.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-info" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Pagamento</CardTitle>
                  <CardDescription>
                    Mantenha seus dados bancários atualizados para receber seus pagamentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={paymentInfo.cpf}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cpf: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ (se aplicável)</Label>
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0000-00"
                        value={paymentInfo.cnpj}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cnpj: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        placeholder="(00) 00000-0000"
                        value={paymentInfo.phone}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pix_key">Chave PIX</Label>
                      <Input
                        id="pix_key"
                        placeholder="CPF, CNPJ, Email ou Telefone"
                        value={paymentInfo.pix_key}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, pix_key: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold">Dados Bancários</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="banco">Banco</Label>
                        <Input
                          id="banco"
                          placeholder="Nome do banco"
                          value={paymentInfo.banco}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, banco: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="agencia">Agência</Label>
                        <Input
                          id="agencia"
                          placeholder="0000"
                          value={paymentInfo.agencia}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, agencia: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="conta">Conta</Label>
                        <Input
                          id="conta"
                          placeholder="00000-0"
                          value={paymentInfo.conta}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, conta: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                      <select
                        id="tipo_conta"
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={paymentInfo.tipo_conta}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, tipo_conta: e.target.value })}
                      >
                        <option value="corrente">Conta Corrente</option>
                        <option value="poupanca">Conta Poupança</option>
                        <option value="pagamento">Conta Pagamento</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Informações Importantes
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Certifique-se de que todos os dados estão corretos antes de salvar. 
                        Essas informações serão usadas para processar seus pagamentos.
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSavePaymentInfo} 
                    disabled={savingPaymentInfo}
                    className="w-full md:w-auto"
                  >
                    {savingPaymentInfo ? "Salvando..." : "Salvar Informações"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}