import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLocation, Navigate } from "react-router-dom";
import { Send, Eye, CheckCircle2, Upload, FileCheck, Loader2, FileSpreadsheet } from "lucide-react";
import { exportBTGPayments } from "@/utils/exportBTGPayments";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  protocol_type?: 'service_provider' | 'reviewer'; // Identificar tipo de protocolo
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
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [protocolReceipts, setProtocolReceipts] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      
      // Buscar protocolos de prestadores com status "approved"
      const { data: serviceProviderData, error: spError } = await supabase
        .from("service_provider_protocols")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (spError) throw spError;

      // Buscar protocolos de revisores com status "owner_approval"
      const { data: reviewerData, error: revError } = await supabase
        .from("reviewer_protocols")
        .select("*")
        .eq("status", "owner_approval")
        .order("created_at", { ascending: false });

      // Buscar perfis dos revisores separadamente
      let reviewerProfiles: any = {};
      if (reviewerData && reviewerData.length > 0) {
        const userIds = reviewerData
          .map((p: any) => p.assigned_operation_user_id)
          .filter(Boolean);
        
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", userIds);
          
          if (profilesData) {
            reviewerProfiles = Object.fromEntries(
              profilesData.map(p => [p.id, p])
            );
          }
        }
      }

      if (revError) throw revError;

      // Combinar e marcar tipo de protocolo
      const allProtocols = [
        ...(serviceProviderData || []).map((p: any) => ({ 
          ...p, 
          protocol_type: 'service_provider' as const,
          provider_name: p.provider_name || 'N/A'
        })),
        ...(reviewerData || []).map((p: any) => {
          const profile = reviewerProfiles[p.assigned_operation_user_id];
          return {
            ...p, 
            protocol_type: 'reviewer' as const,
            provider_name: profile?.email || profile?.full_name || p.reviewer_name || 'N/A'
          };
        })
      ];
      
      setProtocols(allProtocols as Protocol[]);
      
      // Initialize receipt map with existing receipt URLs  
      const receiptsMap = new Map<string, string>();
      allProtocols.forEach((protocol: any) => {
        if (protocol.payment_receipt_url) {
          receiptsMap.set(protocol.id, protocol.payment_receipt_url);
        }
      });
      setProtocolReceipts(receiptsMap);
    } catch (error: any) {
      toast.error("Erro ao carregar protocolos", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean, protocolType?: 'service_provider' | 'reviewer') => {
    if (checked) {
      const protocolsToSelect = protocolType 
        ? protocols.filter(p => p.protocol_type === protocolType)
        : protocols;
      setSelectedProtocols(new Set([...selectedProtocols, ...protocolsToSelect.map(p => p.id)]));
    } else {
      if (protocolType) {
        const protocolsToDeselect = protocols.filter(p => p.protocol_type === protocolType).map(p => p.id);
        setSelectedProtocols(new Set([...selectedProtocols].filter(id => !protocolsToDeselect.includes(id))));
      } else {
        setSelectedProtocols(new Set());
      }
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
      
      // Separar protocolos por tipo
      const selectedIds = Array.from(selectedProtocols);
      const spIds = protocols.filter(p => selectedIds.includes(p.id) && p.protocol_type === 'service_provider').map(p => p.id);
      const revIds = protocols.filter(p => selectedIds.includes(p.id) && p.protocol_type === 'reviewer').map(p => p.id);
      
      // Atualizar protocolos de prestadores
      if (spIds.length > 0) {
        const { error: spError } = await supabase
          .from("service_provider_protocols")
          .update({ 
            status: "payment_processing",
            payment_requested_at: new Date().toISOString()
          })
          .in("id", spIds);

        if (spError) throw spError;
      }

      // Atualizar protocolos de revisores
      if (revIds.length > 0) {
        const { error: revError } = await supabase
          .from("reviewer_protocols")
          .update({ 
            status: "payment_processing",
            payment_requested_at: new Date().toISOString()
          })
          .in("id", revIds);

        if (revError) throw revError;
      }

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
    const receiptUrl = protocolReceipts.get(protocolId);
    
    if (!receiptUrl) {
      toast.error("Por favor, envie o comprovante antes de marcar como pago");
      return;
    }

    try {
      // Identificar o tipo do protocolo
      const protocol = protocols.find(p => p.id === protocolId);
      if (!protocol) {
        toast.error("Protocolo não encontrado");
        return;
      }

      const tableName = protocol.protocol_type === 'service_provider' 
        ? 'service_provider_protocols' 
        : 'reviewer_protocols';

      const { error } = await supabase
        .from(tableName)
        .update({ 
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_receipt_url: receiptUrl
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

  const handleFileUpload = async (protocolId: string, file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Apenas arquivos PDF, JPG ou PNG são permitidos");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5MB");
      return;
    }

    setUploadingFiles(prev => new Set(prev).add(protocolId));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${protocolId}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      // Identificar o tipo do protocolo
      const protocol = protocols.find(p => p.id === protocolId);
      if (!protocol) {
        throw new Error("Protocolo não encontrado");
      }

      const tableName = protocol.protocol_type === 'service_provider' 
        ? 'service_provider_protocols' 
        : 'reviewer_protocols';

      // Update protocol with receipt URL
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ payment_receipt_url: publicUrl })
        .eq("id", protocolId);

      if (updateError) throw updateError;

      setProtocolReceipts(prev => new Map(prev).set(protocolId, publicUrl));
      toast.success("Comprovante enviado com sucesso");
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || "Erro ao enviar comprovante");
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(protocolId);
        return newSet;
      });
    }
  };

  const handleExportBTG = () => {
    if (selectedProtocols.size === 0) {
      toast.error("Selecione pelo menos um protocolo para exportar");
      return;
    }

    const selectedProtocolsData = protocols.filter(p => selectedProtocols.has(p.id));
    const prestadoresCount = selectedProtocolsData.filter(p => p.protocol_type === 'service_provider').length;
    const revisoresCount = selectedProtocolsData.filter(p => p.protocol_type === 'reviewer').length;
    
    try {
      const result = exportBTGPayments(selectedProtocolsData);
      toast.success(`Arquivo BTG exportado com sucesso!`, {
        description: `${prestadoresCount} prestadores, ${revisoresCount} revisores | ${result.pixCount} pagamentos PIX`
      });
    } catch (error: any) {
      toast.error("Erro ao exportar arquivo BTG", {
        description: error.message
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
                <div className="flex gap-2">
                  <Button
                    onClick={handleExportBTG}
                    variant="outline"
                    size="lg"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar BTG
                  </Button>
                  <Button
                    onClick={handleProcessPayments}
                    disabled={processing}
                    size="lg"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {processing ? "Processando..." : `Processar ${selectedProtocols.size} Protocolo(s)`}
                  </Button>
                </div>
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

            <Tabs defaultValue="prestadores" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prestadores">
                  Prestadores ({protocols.filter(p => p.protocol_type === 'service_provider').length})
                </TabsTrigger>
                <TabsTrigger value="revisores">
                  Revisores ({protocols.filter(p => p.protocol_type === 'reviewer').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prestadores">
                <Card>
                  <CardHeader>
                    <CardTitle>Protocolos de Prestadores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                    ) : protocols.filter(p => p.protocol_type === 'service_provider').length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        Nenhum protocolo de prestador aprovado aguardando processamento
                      </p>
                    ) : (
                      <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={protocols.filter(p => p.protocol_type === 'service_provider').every(p => selectedProtocols.has(p.id)) && protocols.filter(p => p.protocol_type === 'service_provider').length > 0}
                            onCheckedChange={(checked) => handleSelectAll(checked as boolean, 'service_provider')}
                          />
                        </TableHead>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Competência</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Comprovante</TableHead>
                        <TableHead>Dados Bancários</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {protocols.filter(p => p.protocol_type === 'service_provider').map((protocol) => (
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
                            <div className="flex flex-col gap-1">
                              <span>{protocol.protocol_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {protocol.protocol_type === 'reviewer' ? 'Revisor' : 'Prestador'}
                              </span>
                            </div>
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
                            <div className="flex flex-col gap-2">
                              {protocolReceipts.has(protocol.id) ? (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <FileCheck className="h-4 w-4" />
                                  <span>Enviado</span>
                                  <a 
                                    href={protocolReceipts.get(protocol.id)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary underline"
                                  >
                                    Ver
                                  </a>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`file-${protocol.id}`} className="cursor-pointer">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                      {uploadingFiles.has(protocol.id) ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span>Enviando...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-4 w-4" />
                                          <span>Enviar</span>
                                        </>
                                      )}
                                    </div>
                                  </Label>
                                  <Input
                                    id={`file-${protocol.id}`}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    disabled={uploadingFiles.has(protocol.id)}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(protocol.id, file);
                                    }}
                                  />
                                </div>
                              )}
                            </div>
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
                              disabled={!protocolReceipts.has(protocol.id)}
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
              </TabsContent>

              <TabsContent value="revisores">
                <Card>
                  <CardHeader>
                    <CardTitle>Protocolos de Revisores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                    ) : protocols.filter(p => p.protocol_type === 'reviewer').length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        Nenhum protocolo de revisor aprovado aguardando processamento
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={protocols.filter(p => p.protocol_type === 'reviewer').every(p => selectedProtocols.has(p.id)) && protocols.filter(p => p.protocol_type === 'reviewer').length > 0}
                                onCheckedChange={(checked) => handleSelectAll(checked as boolean, 'reviewer')}
                              />
                            </TableHead>
                            <TableHead>Protocolo</TableHead>
                            <TableHead>Revisor</TableHead>
                            <TableHead>Competência</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Comprovante</TableHead>
                            <TableHead>Dados Bancários</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {protocols.filter(p => p.protocol_type === 'reviewer').map((protocol) => (
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
                                <div className="flex flex-col gap-1">
                                  <span>{protocol.protocol_number}</span>
                                  <span className="text-xs text-muted-foreground">Revisor</span>
                                </div>
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
                                <div className="flex flex-col gap-2">
                                  {protocolReceipts.has(protocol.id) ? (
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                      <FileCheck className="h-4 w-4" />
                                      <span>Enviado</span>
                                      <a 
                                        href={protocolReceipts.get(protocol.id)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary underline"
                                      >
                                        Ver
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Label htmlFor={`file-${protocol.id}`} className="cursor-pointer">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                          {uploadingFiles.has(protocol.id) ? (
                                            <>
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                              <span>Enviando...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Upload className="h-4 w-4" />
                                              <span>Enviar</span>
                                            </>
                                          )}
                                        </div>
                                      </Label>
                                      <Input
                                        id={`file-${protocol.id}`}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        disabled={uploadingFiles.has(protocol.id)}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleFileUpload(protocol.id, file);
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm space-y-1">
                                  {protocol.pix_key && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">PIX:</span>
                                      <span className="text-muted-foreground">{protocol.pix_key}</span>
                                    </div>
                                  )}
                                  {protocol.bank_name && (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Banco:</span>
                                        <span className="text-muted-foreground">{protocol.bank_name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Agência:</span>
                                        <span className="text-muted-foreground">{protocol.bank_agency}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Conta:</span>
                                        <span className="text-muted-foreground">{protocol.bank_account}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedProtocol(protocol);
                                      setShowDetailsDialog(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleMarkAsPaid(protocol.id)}
                                    disabled={!protocolReceipts.has(protocol.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Marcar como Pago
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
