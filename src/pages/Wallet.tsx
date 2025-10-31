import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet as WalletIcon, TrendingUp, FileText, Clock, CheckCircle, AlertCircle, Info, FileEdit, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ProviderDataFormDialog } from "@/components/fechamentoPrestadores/ProviderDataFormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderPayment {
  id: string;
  order_number: string;
  document_count: number;
  delivered_at: string;
  attribution_date: string;
  payment_amount: number;
  drive_value: number;
  diagramming_value: number;
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
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);
  const [showDataFormDialog, setShowDataFormDialog] = useState(false);
  const [filterCompetence, setFilterCompetence] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProtocolNumber, setFilterProtocolNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
  }, [user, userEmail, filterCompetence, filterStatus, filterProtocolNumber]);

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

      const ordersWithPayment = data?.map(order => {
        // Calculate payment using the new structure with separate drive and diagramming values
        const driveValue = Number(order.drive_value) || 0;
        const diagrammingValue = Number(order.diagramming_value) || 0;
        const paymentAmount = driveValue + diagrammingValue;

        return {
          id: order.id,
          order_number: order.order_number,
          document_count: order.document_count || 0,
          delivered_at: order.delivered_at,
          attribution_date: order.attribution_date,
          payment_amount: paymentAmount,
          drive_value: driveValue,
          diagramming_value: diagrammingValue
        };
      }) || [];

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
      let query = supabase
        .from('service_provider_protocols')
        .select('*')
        .eq('provider_email', userEmail);

      // Apply filters
      if (filterCompetence) {
        const [year, month] = filterCompetence.split('-');
        const competenceDate = `${year}-${month}-01`;
        query = query.eq('competence_month', competenceDate);
      }

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterProtocolNumber) {
        query = query.ilike('protocol_number', `%${filterProtocolNumber}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setProtocols(data || []);
    } catch (error) {
      console.error('Error fetching protocols:', error);
      toast.error("Erro ao carregar protocolos");
    } finally {
      setProtocolsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilterCompetence("");
    setFilterStatus("");
    setFilterProtocolNumber("");
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
      awaiting_master_initial: { label: "Em Aprovação", variant: "outline" },
      awaiting_provider_data: { label: "Aguardando Dados", variant: "outline" },
      awaiting_master_final: { label: "Em Validação", variant: "outline" },
      awaiting_owner_approval: { label: "Aprovação Final", variant: "outline" },
      returned_for_adjustment: { label: "Retornado", variant: "destructive" },
      approved: { label: "Aprovado", variant: "default" },
      paid: { label: "Pago", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" }
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredOrders = orders.filter(order => {
    if (!startDate && !endDate) return true;
    
    const orderDate = new Date(order.delivered_at);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && orderDate < start) return false;
    if (end && orderDate > end) return false;
    
    return true;
  });

  const totalEarnings = filteredOrders.reduce((sum, order) => sum + order.payment_amount, 0);
  const totalDocuments = filteredOrders.reduce((sum, order) => sum + order.document_count, 0);
  const averagePerOrder = filteredOrders.length > 0 ? totalEarnings / filteredOrders.length : 0;

  const exportToPDF = () => {
    if (filteredOrders.length === 0) {
      toast.error("Nenhum pedido para exportar");
      return;
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Relatório de Pedidos - Carteira', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Prestador: ${userName}`, 14, 30);
    doc.text(`Email: ${userEmail}`, 14, 36);
    
    if (startDate || endDate) {
      const periodText = `Período: ${startDate ? format(new Date(startDate), 'dd/MM/yyyy') : 'Início'} a ${endDate ? format(new Date(endDate), 'dd/MM/yyyy') : 'Hoje'}`;
      doc.text(periodText, 14, 42);
    }
    
    doc.text(`Data do Relatório: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, startDate || endDate ? 48 : 42);
    
    // Table
    const tableData = filteredOrders.map(order => [
      order.order_number,
      formatCurrency(order.drive_value),
      formatCurrency(order.diagramming_value),
      formatCurrency(order.payment_amount),
      order.attribution_date ? format(new Date(order.attribution_date), 'dd/MM/yyyy') : '-',
      format(new Date(order.delivered_at), 'dd/MM/yyyy')
    ]);
    
    autoTable(doc, {
      startY: startDate || endDate ? 54 : 48,
      head: [['Pedido', 'Drive', 'Diagramação', 'Total', 'Dt. Atribuição', 'Dt. Entrega']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });
    
    // Footer with totals
    const finalY = (doc as any).lastAutoTable.finalY || 54;
    doc.setFontSize(10);
    doc.text(`Total de Pedidos: ${filteredOrders.length}`, 14, finalY + 10);
    doc.text(`Total de Documentos: ${totalDocuments}`, 14, finalY + 16);
    doc.text(`Total Geral: ${formatCurrency(totalEarnings)}`, 14, finalY + 22);
    
    const fileName = `carteira-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    doc.save(fileName);
    
    toast.success("PDF exportado com sucesso!");
  };

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="earnings">Ganhos</TabsTrigger>
              <TabsTrigger value="protocols">Protocolos</TabsTrigger>
            </TabsList>

            <TabsContent value="earnings" className="space-y-6">
              {/* Date Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="startDate">Data Inicial</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="endDate">Data Final</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                      variant="outline"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                    <Button onClick={exportToPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
                  ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum pedido encontrado para o período selecionado
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
                        {filteredOrders.map((order) => (
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
              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="competence">Competência</Label>
                      <Input
                        id="competence"
                        type="month"
                        value={filterCompetence}
                        onChange={(e) => setFilterCompetence(e.target.value)}
                        placeholder="Selecione o mês"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="awaiting_master_initial">Em Aprovação</SelectItem>
                          <SelectItem value="awaiting_provider_data">Aguardando Dados</SelectItem>
                          <SelectItem value="awaiting_master_final">Em Validação</SelectItem>
                          <SelectItem value="awaiting_owner_approval">Aprovação Final</SelectItem>
                          <SelectItem value="returned_for_adjustment">Retornado</SelectItem>
                          <SelectItem value="approved">Aprovado</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="protocolNumber">Nº Protocolo</Label>
                      <Input
                        id="protocolNumber"
                        value={filterProtocolNumber}
                        onChange={(e) => setFilterProtocolNumber(e.target.value)}
                        placeholder="PREST-202501-001"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={fetchProtocols} className="flex-1">
                      <Search className="h-4 w-4 mr-2" />
                      Filtrar
                    </Button>
                    <Button onClick={handleClearFilters} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
                              {protocol.status === 'awaiting_provider_data' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProtocolId(protocol.id);
                                    setShowDataFormDialog(true);
                                  }}
                                >
                                  <FileEdit className="h-4 w-4 mr-1" />
                                  Detalhes
                                </Button>
                              )}
                              {protocol.status === 'returned_for_adjustment' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedProtocolId(protocol.id);
                                    setShowDataFormDialog(true);
                                  }}
                                >
                                  <FileEdit className="h-4 w-4 mr-1" />
                                  Corrigir
                                </Button>
                              )}
                              {(protocol.status === 'awaiting_master_initial' || 
                                protocol.status === 'awaiting_master_final' || 
                                protocol.status === 'awaiting_owner_approval') && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Em aprovação
                                </span>
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
                    <p><strong>Geração:</strong> A administração gera os protocolos mensalmente com base nas suas entregas.</p>
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
          </Tabs>

          <ProviderDataFormDialog
            open={showDataFormDialog}
            onOpenChange={setShowDataFormDialog}
            protocolId={selectedProtocolId || ""}
            onSuccess={() => {
              fetchProtocols();
              toast.success("Dados enviados com sucesso!");
            }}
          />
        </main>
      </div>
    </div>
  );
}