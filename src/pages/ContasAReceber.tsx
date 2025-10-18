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
import { Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

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
}

export default function ContasAReceber() {
  const { user } = useAuth();
  const { userRole, loading } = useRoleAccess("/contas-a-receber");
  const { isCollapsed } = useSidebar();
  const [userName, setUserName] = useState('');
  const [protocols, setProtocols] = useState<RevenueProtocol[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("novos");
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
                            </TableRow>
                          ))}
                          {filterProtocolsByStatus(tab).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-muted-foreground">
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
    </div>
  );
}
