import { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, PlayCircle, Eye, FileCheck, Upload, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { RevenueProtocolDetailsDialog } from "@/components/fechamentoPrestadores/RevenueProtocolDetailsDialog";
import { UploadReceiptDialog } from "@/components/fechamentoPrestadores/UploadReceiptDialog";

interface RevenueProtocol {
  id: string;
  protocol_number: string;
  competence_month: string;
  total_ids: number;
  total_pages: number;
  total_value: number;
  avg_value_per_document: number;
  product_1_count: number;
  product_2_count: number;
  created_at: string;
  payment_status: string | null;
  payment_requested_at: string | null;
  payment_received_at: string | null;
  receipt_url: string | null;
}

export default function ContasAReceber() {
  const { user } = useAuth();
  const { userRole, loading } = useRoleAccess("/contas-a-receber");
  const { isCollapsed } = useSidebar();
  const [userName, setUserName] = useState('');
  const [protocols, setProtocols] = useState<RevenueProtocol[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("novos");
  const [selectedProtocol, setSelectedProtocol] = useState<RevenueProtocol | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadProtocol, setUploadProtocol] = useState<RevenueProtocol | null>(null);
  const { toast } = useToast();

  const filterProtocolsByStatus = (status: string) => {
    switch (status) {
      case "novos":
        return protocols.filter(p => !p.payment_requested_at);
      case "aguardando-pagamento":
        return protocols.filter(p => p.payment_requested_at && !p.payment_received_at);
      case "aguardando-comprovante":
        return protocols.filter(p => p.payment_received_at && p.payment_status !== 'paid');
      case "finalizados":
        return protocols.filter(p => p.payment_status === 'paid');
      default:
        return protocols;
    }
  };

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
      const { data, error } = await supabase
        .from('closing_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProtocols(data || []);
    } catch (error) {
      console.error('Error fetching protocols:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar protocolos de receita",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleIniciarPagamento = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from('closing_protocols')
        .update({ payment_requested_at: new Date().toISOString() })
        .eq('id', protocolId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pagamento iniciado com sucesso",
      });

      await fetchContas();
    } catch (error) {
      console.error('Error starting payment:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar pagamento",
        variant: "destructive",
      });
    }
  };

  const handleSeguirParaComprovante = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from('closing_protocols')
        .update({ payment_received_at: new Date().toISOString() })
        .eq('id', protocolId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Protocolo movido para aguardando comprovante",
      });

      await fetchContas();
    } catch (error) {
      console.error('Error updating protocol:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar protocolo",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (protocol: RevenueProtocol) => {
    setSelectedProtocol(protocol);
    setDetailsDialogOpen(true);
  };

  const handleOpenUploadDialog = (protocol: RevenueProtocol) => {
    setUploadProtocol(protocol);
    setUploadDialogOpen(true);
  };

  const handleFinalizarProtocol = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from('closing_protocols')
        .update({ payment_status: 'paid' })
        .eq('id', protocolId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Protocolo finalizado com sucesso",
      });

      await fetchContas();
    } catch (error) {
      console.error('Error finalizing protocol:', error);
      toast({
        title: "Erro",
        description: "Erro ao finalizar protocolo",
        variant: "destructive",
      });
    }
  };

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
              <h1 className="text-3xl font-bold tracking-tight">Contas a Receber</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie os recebimentos de clientes
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(protocols.reduce((sum, p) => sum + p.total_value, 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {protocols.length} protocolo{protocols.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de IDs</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {protocols.reduce((sum, p) => sum + p.total_ids, 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Páginas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {protocols.reduce((sum, p) => sum + p.total_pages, 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Média por Documento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      protocols.length > 0 
                        ? protocols.reduce((sum, p) => sum + p.avg_value_per_document, 0) / protocols.length 
                        : 0
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Protocolos de Receita</CardTitle>
                <CardDescription>Protocolos criados no fechamento de receitas</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="novos">
                      Novos ({filterProtocolsByStatus("novos").length})
                    </TabsTrigger>
                    <TabsTrigger value="aguardando-pagamento">
                      Aguardando Pagamento ({filterProtocolsByStatus("aguardando-pagamento").length})
                    </TabsTrigger>
                    <TabsTrigger value="aguardando-comprovante">
                      Aguardando Comprovante ({filterProtocolsByStatus("aguardando-comprovante").length})
                    </TabsTrigger>
                    <TabsTrigger value="finalizados">
                      Finalizados ({filterProtocolsByStatus("finalizados").length})
                    </TabsTrigger>
                  </TabsList>

                  {["novos", "aguardando-pagamento", "aguardando-comprovante", "finalizados"].map((tab) => (
                    <TabsContent key={tab} value={tab}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Protocolo</TableHead>
                            <TableHead>Competência</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Total IDs</TableHead>
                            <TableHead>Total Páginas</TableHead>
                            <TableHead>Produto 1</TableHead>
                            <TableHead>Produto 2</TableHead>
                            <TableHead>Média/Doc</TableHead>
                            <TableHead>Status</TableHead>
                            {(tab === "novos" || tab === "aguardando-pagamento" || tab === "aguardando-comprovante") && <TableHead>Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterProtocolsByStatus(tab).map((protocol) => (
                            <TableRow key={protocol.id}>
                              <TableCell className="font-mono text-xs font-medium">{protocol.protocol_number}</TableCell>
                              <TableCell>{new Date(protocol.competence_month).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}</TableCell>
                              <TableCell className="font-semibold">{formatCurrency(protocol.total_value)}</TableCell>
                              <TableCell>{protocol.total_ids}</TableCell>
                              <TableCell>{protocol.total_pages}</TableCell>
                              <TableCell>{protocol.product_1_count}</TableCell>
                              <TableCell>{protocol.product_2_count}</TableCell>
                              <TableCell>{formatCurrency(protocol.avg_value_per_document)}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  protocol.payment_status === 'paid' 
                                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                    : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                                }`}>
                                  {protocol.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                </span>
                              </TableCell>
                              {tab === "novos" && (
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleIniciarPagamento(protocol.id)}
                                  >
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Iniciar Pagamento
                                  </Button>
                                </TableCell>
                              )}
                              {tab === "aguardando-pagamento" && (
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewDetails(protocol)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleSeguirParaComprovante(protocol.id)}
                                    >
                                      <FileCheck className="h-4 w-4 mr-2" />
                                      Seguir para Comprovante
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                              {tab === "aguardando-comprovante" && (
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenUploadDialog(protocol)}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Inserir Comprovante
                                    </Button>
                                    {protocol.receipt_url && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => handleFinalizarProtocol(protocol.id)}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Finalizar
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                           {filterProtocolsByStatus(tab).length === 0 && (
                             <TableRow>
                               <TableCell colSpan={(tab === "novos" || tab === "aguardando-pagamento" || tab === "aguardando-comprovante") ? 10 : 9} className="text-center text-muted-foreground">
                                 Nenhum protocolo encontrado nesta categoria
                               </TableCell>
                             </TableRow>
                           )}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <RevenueProtocolDetailsDialog
        protocol={selectedProtocol}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />

      {uploadProtocol && (
        <UploadReceiptDialog
          protocolId={uploadProtocol.id}
          protocolNumber={uploadProtocol.protocol_number}
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onSuccess={fetchContas}
        />
      )}
    </div>
  );
}
