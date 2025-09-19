import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, FileText, AlertCircle, Loader2, DollarSign, Calendar, Hash } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider } from "@/contexts/SidebarContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Protocol {
  id: string;
  protocol_number: string;
  competence_month: string;
  total_value: number;
  product_1_count: number;
  product_2_count: number;
  avg_value_per_document: number;
  total_pages: number;
  total_ids: number;
  created_at: string;
  payment_status: string;
}

function PaymentRequestContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("financeiro@empresa.com");
  const [ccEmails, setCcEmails] = useState("");
  const [subject, setSubject] = useState("Solicitação de Pagamento - Serviços Prestados");
  const [message, setMessage] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [userFullName, setUserFullName] = useState<string>("");
  const [companyInfo, setCompanyInfo] = useState({
    name: "Império Traduções",
    cnpj: "XX.XXX.XXX/0001-XX",
    bank_name: "Banco do Brasil",
    account_number: "XXXXX-X",
    pix_key: "cnpj@imperio.com",
  });

  useEffect(() => {
    fetchPendingProtocols();
    loadDefaultMessage();
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserFullName(profile.full_name || "");
          setUserRole(profile.role || "");
        }
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchPendingProtocols = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("closing_protocols")
        .select("*")
        .in("payment_status", ["pending", "sent"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProtocols(data || []);
    } catch (error) {
      console.error("Error fetching protocols:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar protocolos pendentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultMessage = () => {
    const defaultMsg = `Prezados,

Segue solicitação de pagamento referente aos serviços de tradução prestados conforme protocolos detalhados abaixo.

Após o processamento do pagamento, favor enviar o comprovante para validação e fechamento do protocolo.

Qualquer dúvida, estamos à disposição.

Atenciosamente,
Equipe Financeira`;
    
    setMessage(defaultMsg);
  };

  const handleSelectProtocol = (protocolId: string) => {
    setSelectedProtocols(prev => {
      if (prev.includes(protocolId)) {
        return prev.filter(id => id !== protocolId);
      }
      return [...prev, protocolId];
    });
  };

  const calculateTotal = () => {
    return protocols
      .filter(p => selectedProtocols.includes(p.id))
      .reduce((sum, p) => sum + p.total_value, 0);
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const selectedData = protocols.filter(p => selectedProtocols.includes(p.id));
    
    // Header
    doc.setFontSize(20);
    doc.text("SOLICITAÇÃO DE PAGAMENTO", 105, 20, { align: "center" });
    
    // Company Info
    doc.setFontSize(12);
    doc.text(companyInfo.name, 20, 40);
    doc.text(`CNPJ: ${companyInfo.cnpj}`, 20, 48);
    
    // Date
    doc.text(`Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 20, 60);
    
    // Protocols Table
    const tableData = selectedData.map(p => [
      p.protocol_number,
      format(new Date(p.competence_month), "MMM/yyyy", { locale: ptBR }),
      p.product_1_count.toString(),
      p.product_2_count.toString(),
      formatCurrency(p.total_value),
    ]);

    autoTable(doc, {
      head: [["Protocolo", "Competência", "Produto 1", "Produto 2", "Valor"]],
      body: tableData,
      startY: 70,
      foot: [["", "", "", "Total:", formatCurrency(calculateTotal())]],
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    // Payment Info
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text("DADOS PARA PAGAMENTO", 20, finalY);
    
    doc.setFontSize(11);
    doc.text(`Banco: ${companyInfo.bank_name}`, 20, finalY + 10);
    doc.text(`Conta: ${companyInfo.account_number}`, 20, finalY + 18);
    doc.text(`Chave PIX: ${companyInfo.pix_key}`, 20, finalY + 26);
    
    // Total
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(`Valor Total: ${formatCurrency(calculateTotal())}`, 20, finalY + 45);
    
    return doc.output("blob");
  };

  const sendPaymentRequest = async () => {
    if (selectedProtocols.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um protocolo",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingEmail(true);
      
      const selectedData = protocols.filter(p => selectedProtocols.includes(p.id));
      
      // Generate PDF
      const pdfBlob = await generatePDF();
      
      // Send email via Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("send-payment-email", {
        body: {
          recipient_email: recipientEmail,
          cc_emails: ccEmails ? ccEmails.split(",").map(e => e.trim()) : [],
          subject,
          protocol_ids: selectedProtocols,
          protocols_data: selectedData.map(p => ({
            protocol_number: p.protocol_number,
            competence_month: format(new Date(p.competence_month), "MMM/yyyy", { locale: ptBR }),
            total_value: p.total_value,
            product_1_count: p.product_1_count,
            product_2_count: p.product_2_count,
          })),
          total_amount: calculateTotal(),
          message,
          company_info: companyInfo,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Sucesso!",
        description: "Solicitação de pagamento enviada com sucesso",
      });

      // Refresh protocols
      await fetchPendingProtocols();
      setSelectedProtocols([]);
      
    } catch (error) {
      console.error("Error sending payment request:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação de pagamento",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole as any} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userName={userFullName} userRole={userRole as any} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Protocolos Pendentes
                  </CardTitle>
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {protocols.filter(p => p.payment_status === "pending").length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Selecionados
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedProtocols.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Valor Total
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(calculateTotal())}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Protocols Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Selecionar Protocolos</CardTitle>
                <CardDescription>
                  Escolha os protocolos que serão incluídos na solicitação de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : protocols.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum protocolo pendente de pagamento encontrado.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {protocols.map((protocol) => (
                      <div
                        key={protocol.id}
                        className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedProtocols.includes(protocol.id)}
                          onCheckedChange={() => handleSelectProtocol(protocol.id)}
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Protocolo</p>
                            <p className="font-medium">{protocol.protocol_number}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Competência</p>
                            <p className="font-medium">
                              {format(new Date(protocol.competence_month), "MMM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Produto 1 / 2</p>
                            <p className="font-medium">
                              {protocol.product_1_count} / {protocol.product_2_count}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Valor</p>
                            <p className="font-medium">{formatCurrency(protocol.total_value)}</p>
                          </div>
                          <div>
                            <Badge
                              variant={protocol.payment_status === "sent" ? "secondary" : "outline"}
                            >
                              {protocol.payment_status === "sent" ? "Enviado" : "Pendente"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Email Configuration */}
            {selectedProtocols.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Configurar Email</CardTitle>
                  <CardDescription>
                    Personalize o email de solicitação de pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient">Email do Destinatário</Label>
                      <Input
                        id="recipient"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="financeiro@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cc">CC (separe por vírgula)</Label>
                      <Input
                        id="cc"
                        type="text"
                        value={ccEmails}
                        onChange={(e) => setCcEmails(e.target.value)}
                        placeholder="email1@empresa.com, email2@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProtocols([])}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={sendPaymentRequest}
                      disabled={sendingEmail}
                    >
                      {sendingEmail ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Solicitação
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PaymentRequest() {
  return (
    <SidebarProvider>
      <PaymentRequestContent />
    </SidebarProvider>
  );
}