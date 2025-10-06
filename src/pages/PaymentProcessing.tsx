import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLocation, Navigate } from "react-router-dom";
import { Send, Eye, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { ProtocolDetailsDialog } from "@/components/fechamentoPrestadores/ProtocolDetailsDialog";
import { ProtocolStatusBadge } from "@/components/fechamentoPrestadores/ProtocolStatusBadge";

interface Protocol {
  id: string;
  protocol_number: string;
  provider_name: string;
  competence_month: string;
  total_amount: number;
  status: string;
  invoice_file_url?: string;
  cpf?: string;
  cnpj?: string;
  pix_key?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  account_type?: string;
}

export default function PaymentProcessing() {
  const location = useLocation();
  const { hasAccess, loading: roleLoading, userRole } = useRoleAccess(location.pathname);
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();

  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocols, setSelectedProtocols] = useState<Set<string>>(new Set());
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("service_provider_protocols")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProtocols(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar protocolos", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProtocols(new Set(protocols.map(p => p.id)));
    } else {
      setSelectedProtocols(new Set());
    }
  };

  const handleSelectProtocol = (protocolId: string, checked: boolean) => {
    const newSelected = new Set(selectedProtocols);
    if (checked) {
      newSelected.add(protocolId);
    } else {
      newSelected.delete(protocolId);
    }
    setSelectedProtocols(newSelected);
  };

  const handleProcessPayments = async () => {
    if (selectedProtocols.size === 0) {
      toast.error("Selecione pelo menos um protocolo para processar");
      return;
    }

    try {
      setProcessing(true);
      
      // Update selected protocols to "payment_processing" status
      const { error } = await supabase
        .from("service_provider_protocols")
        .update({ 
          status: "payment_processing",
          payment_requested_at: new Date().toISOString()
        })
        .in("id", Array.from(selectedProtocols));

      if (error) throw error;

      toast.success(`${selectedProtocols.size} protocolo(s) enviado(s) para processamento de pagamento!`);
      setSelectedProtocols(new Set());
      fetchProtocols();
    } catch (error: any) {
      toast.error("Erro ao processar pagamentos", {
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from("service_provider_protocols")
        .update({ 
          status: "paid",
          paid_at: new Date().toISOString()
        })
        .eq("id", protocolId);

      if (error) throw error;

      toast.success("Protocolo marcado como pago!");
      fetchProtocols();
    } catch (error: any) {
      toast.error("Erro ao marcar como pago", {
        description: error.message,
      });
    }
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  const sidebarOffset = isCollapsed ? 64 : 256;
  const totalSelected = Array.from(selectedProtocols)
    .reduce((sum, id) => {
      const protocol = protocols.find(p => p.id === id);
      return sum + (protocol?.total_amount || 0);
    }, 0);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar userRole={userRole || 'operation'} />
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: `${sidebarOffset}px` }}
      >
        <Header userName={user?.email || 'User'} userRole={userRole || 'operation'} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Processamento de Pagamentos</h1>
                <p className="text-muted-foreground">
                  Processe os pagamentos de protocolos aprovados
                </p>
              </div>
              {selectedProtocols.size > 0 && (
                <Button
                  onClick={handleProcessPayments}
                  disabled={processing}
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {processing ? "Processando..." : `Processar ${selectedProtocols.size} Protocolo(s)`}
                </Button>
              )}
            </div>

            {selectedProtocols.size > 0 && (
              <Card className="bg-primary/5 border-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Selecionados para Processamento</p>
                      <p className="text-2xl font-bold">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(totalSelected)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{selectedProtocols.size} protocolo(s)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Protocolos Aprovados</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : protocols.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum protocolo aprovado aguardando processamento
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedProtocols.size === protocols.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Competência</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Dados Bancários</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {protocols.map((protocol) => (
                        <TableRow key={protocol.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProtocols.has(protocol.id)}
                              onCheckedChange={(checked) => 
                                handleSelectProtocol(protocol.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {protocol.protocol_number}
                          </TableCell>
                          <TableCell>{protocol.provider_name}</TableCell>
                          <TableCell>
                            {new Date(protocol.competence_month).toLocaleDateString("pt-BR", {
                              month: "long",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(protocol.total_amount)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              {protocol.bank_name && (
                                <p><span className="font-medium">Banco:</span> {protocol.bank_name}</p>
                              )}
                              {protocol.pix_key && (
                                <p><span className="font-medium">PIX:</span> {protocol.pix_key}</p>
                              )}
                              {!protocol.bank_name && !protocol.pix_key && (
                                <p className="text-muted-foreground">Dados não informados</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProtocol(protocol);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleMarkAsPaid(protocol.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Marcar como Pago
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Details Dialog */}
      {selectedProtocol && (
        <ProtocolDetailsDialog
          protocol={selectedProtocol}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}
    </div>
  );
}
