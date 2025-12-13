import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePageLayout } from "@/hooks/usePageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, FileText, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sanitizeInput } from "@/lib/validations/sanitized";

interface ReviewerProtocol {
  id: string;
  protocol_number: string;
  competence_month: string;
  status: string;
  total_amount: number;
  order_count: number;
  reviewer_name: string;
  cpf: string | null;
  cnpj: string | null;
  pix_key: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  account_type: string | null;
  invoice_amount: number | null;
  invoice_url: string | null;
  operation_data_filled_at: string | null;
}

export default function OperationProtocolData() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [protocols, setProtocols] = useState<ReviewerProtocol[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<ReviewerProtocol | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  
  // Form data
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountType, setAccountType] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  useEffect(() => {
    fetchUserInfo();
    fetchAssignedProtocols();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Get role from user_roles table via RPC
      const { data: roleData } = await supabase
        .rpc("get_user_role", { user_id: user.id });

      if (profile) {
        setUserName(profile.full_name || user.email || "");
      }
      
      if (roleData) {
        setUserRole(roleData);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchAssignedProtocols = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reviewer_protocols")
        .select(`
          id,
          protocol_number,
          competence_month,
          status,
          total_amount,
          order_count,
          reviewer_name,
          cpf,
          cnpj,
          pix_key,
          bank_name,
          bank_agency,
          bank_account,
          account_type,
          invoice_amount,
          invoice_url,
          operation_data_filled_at
        `)
        .eq("assigned_operation_user_id", user.id)
        .in("status", ["master_initial", "operation_data_filled"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProtocols(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar protocolos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setInvoiceFile(e.target.files[0]);
    }
  };

  const uploadInvoice = async (): Promise<string | null> => {
    if (!invoiceFile || !selectedProtocol) return null;

    try {
      setUploading(true);
      const fileExt = invoiceFile.name.split('.').pop();
      const fileName = `${selectedProtocol.protocol_number}_nota_fiscal_${Date.now()}.${fileExt}`;
      const filePath = `reviewer-protocols/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('service-provider-files')
        .upload(filePath, invoiceFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('service-provider-files')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProtocol) return;

    // Validação básica
    if (!cpf && !cnpj) {
      toast({
        title: "Dados incompletos",
        description: "Informe CPF ou CNPJ",
        variant: "destructive",
      });
      return;
    }

    if (!pixKey) {
      toast({
        title: "Dados incompletos",
        description: "Informe a chave PIX",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceAmount || parseFloat(invoiceAmount) <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Informe o valor da nota fiscal",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceFile) {
      toast({
        title: "Dados incompletos",
        description: "Faça upload da nota fiscal",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Upload da nota fiscal
      const invoiceUrl = await uploadInvoice();
      if (!invoiceUrl) {
        throw new Error("Falha ao fazer upload da nota fiscal");
      }

      // Atualizar protocolo com os dados (sanitizados)
      const { error } = await supabase
        .from("reviewer_protocols")
        .update({
          cpf: sanitizeInput(cpf) || null,
          cnpj: sanitizeInput(cnpj) || null,
          pix_key: sanitizeInput(pixKey),
          bank_name: sanitizeInput(bankName) || null,
          bank_agency: sanitizeInput(bankAgency) || null,
          bank_account: sanitizeInput(bankAccount) || null,
          account_type: sanitizeInput(accountType) || null,
          invoice_amount: parseFloat(invoiceAmount),
          invoice_url: invoiceUrl,
          status: "operation_data_filled",
          operation_data_filled_at: new Date().toISOString(),
        })
        .eq("id", selectedProtocol.id);

      if (error) throw error;

      toast({
        title: "Dados enviados com sucesso",
        description: "Os dados do protocolo foram atualizados",
      });

      // Limpar formulário e recarregar protocolos
      setSelectedProtocol(null);
      resetForm();
      fetchAssignedProtocols();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCpf("");
    setCnpj("");
    setPixKey("");
    setBankName("");
    setBankAgency("");
    setBankAccount("");
    setAccountType("");
    setInvoiceAmount("");
    setInvoiceFile(null);
  };

  const handleSelectProtocol = (protocol: ReviewerProtocol) => {
    setSelectedProtocol(protocol);
    setCpf(protocol.cpf || "");
    setCnpj(protocol.cnpj || "");
    setPixKey(protocol.pix_key || "");
    setBankName(protocol.bank_name || "");
    setBankAgency(protocol.bank_agency || "");
    setBankAccount(protocol.bank_account || "");
    setAccountType(protocol.account_type || "");
    setInvoiceAmount(protocol.invoice_amount?.toString() || "");
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "success" }> = {
      master_initial: { label: "Aguardando Dados", variant: "default" },
      operation_data_filled: { label: "Dados Enviados", variant: "success" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "default" };
    return <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar userRole={userRole} />
      <main className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Protocolos Vinculados</h2>
              <p className="text-muted-foreground">
                Insira os dados dos protocolos que foram vinculados a você
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Lista de Protocolos */}
            <Card>
              <CardHeader>
                <CardTitle>Meus Protocolos</CardTitle>
                <CardDescription>
                  Selecione um protocolo para inserir os dados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {protocols.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum protocolo vinculado a você
                  </p>
                ) : (
                  protocols.map((protocol) => (
                    <div
                      key={protocol.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                        selectedProtocol?.id === protocol.id ? "bg-accent" : ""
                      }`}
                      onClick={() => handleSelectProtocol(protocol)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">{protocol.protocol_number}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Revisor: {protocol.reviewer_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Pedidos: {protocol.order_count}
                          </p>
                          <p className="text-sm font-medium">
                            Valor: R$ {protocol.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          {getStatusBadge(protocol.status)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Formulário de Dados */}
            <Card>
              <CardHeader>
                <CardTitle>Dados do Protocolo</CardTitle>
                <CardDescription>
                  Preencha os dados bancários e faça upload da nota fiscal
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedProtocol ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Selecione um protocolo para preencher os dados
                  </p>
                ) : selectedProtocol.operation_data_filled_at ? (
                  // Dados já enviados - modo visualização
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div className="text-sm">
                        <p className="font-medium text-green-900 dark:text-green-100">Dados Enviados com Sucesso</p>
                        <p className="text-green-700 dark:text-green-300">
                          Enviado em {new Date(selectedProtocol.operation_data_filled_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        {selectedProtocol.cpf && (
                          <div>
                            <Label className="text-muted-foreground">CPF</Label>
                            <p className="font-medium">{selectedProtocol.cpf}</p>
                          </div>
                        )}
                        {selectedProtocol.cnpj && (
                          <div>
                            <Label className="text-muted-foreground">CNPJ</Label>
                            <p className="font-medium">{selectedProtocol.cnpj}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-muted-foreground">Chave PIX</Label>
                        <p className="font-medium">{selectedProtocol.pix_key}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {selectedProtocol.bank_name && (
                          <div>
                            <Label className="text-muted-foreground">Banco</Label>
                            <p className="font-medium">{selectedProtocol.bank_name}</p>
                          </div>
                        )}
                        {selectedProtocol.bank_agency && (
                          <div>
                            <Label className="text-muted-foreground">Agência</Label>
                            <p className="font-medium">{selectedProtocol.bank_agency}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {selectedProtocol.bank_account && (
                          <div>
                            <Label className="text-muted-foreground">Conta</Label>
                            <p className="font-medium">{selectedProtocol.bank_account}</p>
                          </div>
                        )}
                        {selectedProtocol.account_type && (
                          <div>
                            <Label className="text-muted-foreground">Tipo de Conta</Label>
                            <p className="font-medium">{selectedProtocol.account_type}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-muted-foreground">Valor da Nota Fiscal</Label>
                        <p className="font-medium">
                          R$ {selectedProtocol.invoice_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      {selectedProtocol.invoice_url && (
                        <div>
                          <Label className="text-muted-foreground">Nota Fiscal</Label>
                          <a
                            href={selectedProtocol.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline mt-1"
                          >
                            <FileText className="h-4 w-4" />
                            Ver nota fiscal enviada
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedProtocol(null);
                          resetForm();
                        }}
                        className="w-full"
                      >
                        Voltar para lista
                      </Button>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Próximo passo:</strong> Seus dados foram enviados e estão aguardando aprovação do Master. 
                        Após a aprovação, o protocolo seguirá para aprovação final do Owner e então o pagamento será processado.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Formulário para preenchimento inicial
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={(e) => setCpf(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input
                          id="cnpj"
                          placeholder="00.000.000/0000-00"
                          value={cnpj}
                          onChange={(e) => setCnpj(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pixKey">Chave PIX *</Label>
                      <Input
                        id="pixKey"
                        placeholder="Digite a chave PIX"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Banco</Label>
                        <Input
                          id="bankName"
                          placeholder="Nome do banco"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAgency">Agência</Label>
                        <Input
                          id="bankAgency"
                          placeholder="0000"
                          value={bankAgency}
                          onChange={(e) => setBankAgency(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">Conta</Label>
                        <Input
                          id="bankAccount"
                          placeholder="00000-0"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountType">Tipo de Conta</Label>
                        <Input
                          id="accountType"
                          placeholder="Corrente/Poupança"
                          value={accountType}
                          onChange={(e) => setAccountType(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoiceAmount">Valor da Nota Fiscal *</Label>
                      <Input
                        id="invoiceAmount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice">Nota Fiscal *</Label>
                      <Input
                        id="invoice"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        required
                        disabled={submitting || uploading}
                      />
                      {invoiceFile && (
                        <p className="text-sm text-muted-foreground">
                          Arquivo selecionado: {invoiceFile.name}
                        </p>
                      )}
                    </div>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-900 dark:text-yellow-100">
                        <strong>Atenção:</strong> Após enviar os dados, você não poderá editá-los. Confira todas as informações antes de confirmar.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedProtocol(null);
                          resetForm();
                        }}
                        disabled={submitting}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={submitting || uploading} className="flex-1">
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : uploading ? (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Fazendo upload...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Enviar Dados
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
