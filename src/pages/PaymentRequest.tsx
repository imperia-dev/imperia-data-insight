import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
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
import { useAuth } from "@/contexts/AuthContext";
import { usePageLayout } from "@/hooks/usePageLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, FileText, AlertCircle, Loader2, DollarSign, Calendar, Hash } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Protocol {
  id: string;
  protocol_number: string;
  type: 'production' | 'expense';
  competence_month: string;
  total_value: number;
  product_1_count?: number;
  product_2_count?: number;
  avg_value_per_document?: number;
  total_pages?: number;
  total_ids?: number;
  expense_count?: number;
  created_at: string;
  payment_status: string;
  closing_data?: any; // Use any type to handle JSON data from Supabase
}

export default function PaymentRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('viewer');
  const { mainContainerClass } = usePageLayout();
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("financeiro@empresa.com");
  const [ccEmails, setCcEmails] = useState("");
  const [subject, setSubject] = useState("Solicitação de Pagamento - Serviços Prestados");
  const [message, setMessage] = useState("");
  const [userFullName, setUserFullName] = useState<string>("");
  const [companyInfo, setCompanyInfo] = useState({
    name: "Império Traduções",
    cnpj: "XX.XXX.XXX/XXXX-XX",
    address: "Endereço da empresa",
    phone: "(XX) XXXX-XXXX",
    email: "contato@imperiotraducoes.com.br"
  });

  useEffect(() => {
    fetchProtocols();
    fetchUserInfo();
    fetchUserRole();
  }, [user]);

  const fetchUserRole = async () => {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserRole(profile.role || 'viewer');
      }
    }
  };

  const fetchUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserFullName(profile.full_name);
      }
    }
  };

  const fetchProtocols = async () => {
    setLoading(true);
    try {
      // Fetch production protocols
      const { data: productionData, error: prodError } = await supabase
        .from('closing_protocols')
        .select('*')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      // Fetch expense protocols
      const { data: expenseData, error: expError } = await supabase
        .from('expense_closing_protocols')
        .select('*')
        .in('status', ['draft', 'approved'])
        .order('created_at', { ascending: false });

      if (prodError) console.error('Error fetching production protocols:', prodError);
      if (expError) console.error('Error fetching expense protocols:', expError);

      // Combine and map protocols
      const allProtocols: Protocol[] = [
        ...(productionData || []).map(p => ({
          ...p,
          type: 'production' as const,
          total_value: p.total_value
        })),
        ...(expenseData || []).map(p => ({
          id: p.id,
          protocol_number: p.protocol_number,
          type: 'expense' as const,
          competence_month: p.competence_month,
          total_value: p.total_amount || 0,
          expense_count: p.expense_count,
          created_at: p.created_at,
          payment_status: p.status === 'approved' ? 'pending' : p.status,
          closing_data: p.closing_data // Include closing_data with expense descriptions
        }))
      ];

      setProtocols(allProtocols);
      
      // Automatically generate message based on protocols
      if (allProtocols.length > 0) {
        const protocolNumbers = allProtocols.map(p => p.protocol_number).join(', ');
        const totalAmount = allProtocols.reduce((sum, p) => sum + p.total_value, 0);
        
        setMessage(`Prezados,

Segue em anexo a solicitação de pagamento referente aos serviços prestados.

Protocolos: ${protocolNumbers}
Valor Total: ${formatCurrency(totalAmount)}

Por favor, confirmar o recebimento e informar a previsão de pagamento.

Atenciosamente,
${userFullName || 'Equipe Império Traduções'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar protocolos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProtocolToggle = (protocolId: string) => {
    setSelectedProtocols(prev => {
      if (prev.includes(protocolId)) {
        return prev.filter(id => id !== protocolId);
      }
      return [...prev, protocolId];
    });
  };

  const handleSelectAll = () => {
    if (selectedProtocols.length === protocols.length) {
      setSelectedProtocols([]);
    } else {
      setSelectedProtocols(protocols.map(p => p.id));
    }
  };

  const calculateTotals = () => {
    const selected = protocols.filter(p => selectedProtocols.includes(p.id));
    return {
      totalValue: selected.reduce((sum, p) => sum + p.total_value, 0),
      totalPages: selected.reduce((sum, p) => sum + (p.total_pages || 0), 0),
      totalIds: selected.reduce((sum, p) => sum + (p.total_ids || 0), 0),
      protocolCount: selected.length
    };
  };

  const generatePDF = async () => {
    const selected = protocols.filter(p => selectedProtocols.includes(p.id));
    if (selected.length === 0) return null;

    const doc = new jsPDF();
    const totals = calculateTotals();
    
    // Header with company info
    doc.setFontSize(18);
    doc.text(companyInfo.name, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`CNPJ: ${companyInfo.cnpj}`, 105, 28, { align: 'center' });
    doc.text(companyInfo.address, 105, 34, { align: 'center' });
    doc.text(`${companyInfo.phone} | ${companyInfo.email}`, 105, 40, { align: 'center' });
    
    // Title
    doc.setFontSize(16);
    doc.text('SOLICITAÇÃO DE PAGAMENTO', 105, 55, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 70);
    
    // Recipient info
    doc.text('Para:', 20, 80);
    doc.text(recipientEmail, 30, 86);
    
    if (ccEmails) {
      doc.text('Cc:', 20, 94);
      doc.text(ccEmails, 30, 100);
    }
    
    // Subject
    doc.setFontSize(12);
    doc.text('Assunto:', 20, 110);
    doc.text(subject, 20, 116);
    
    // Protocols table
    const tableData = selected.map(p => [
      p.protocol_number,
      p.type === 'production' ? 'Produção' : 'Despesas',
      format(new Date(p.competence_month), 'MM/yyyy'),
      formatCurrency(p.total_value),
      p.type === 'production' ? `${p.product_1_count || 0} / ${p.product_2_count || 0}` : `${p.expense_count || 0} despesas`,
      p.type === 'production' ? (p.total_pages || 0).toString() : '-'
    ]);
    
    autoTable(doc, {
      startY: 130,
      head: [['Protocolo', 'Tipo', 'Competência', 'Valor', 'Detalhes', 'Páginas']],
      body: tableData,
      foot: [['TOTAL', '', '', formatCurrency(totals.totalValue), '', totals.totalPages > 0 ? totals.totalPages.toString() : '-']],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    // Message
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(message, 170);
    doc.text(lines, 20, finalY);
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.text('Este documento foi gerado eletronicamente.', 105, pageHeight - 20, { align: 'center' });
    doc.text(`Página 1 de 1`, 105, pageHeight - 15, { align: 'center' });
    
    // Convert to blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  };

  const handleSendEmail = async () => {
    if (selectedProtocols.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um protocolo",
        variant: "destructive",
      });
      return;
    }

    if (!recipientEmail) {
      toast({
        title: "Atenção",
        description: "Informe o e-mail do destinatário",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);
    
    try {
      // Generate PDF
      const pdfBlob = await generatePDF();
      if (!pdfBlob) {
        throw new Error('Erro ao gerar PDF');
      }

      // Convert PDF to base64
      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // Save payment request
      const { data: paymentRequest, error: requestError } = await supabase
        .from('payment_requests')
        .insert({
          protocol_ids: selectedProtocols,
          recipient_email: recipientEmail,
          cc_emails: ccEmails ? ccEmails.split(',').map(e => e.trim()) : [],
          subject,
          message,
          total_amount: calculateTotals().totalValue,
          status: 'sent',
          sent_at: new Date().toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (requestError) {
        throw requestError;
      }

      // Update protocols status - only update the requested timestamp
      const { error: updateError } = await supabase
        .from('closing_protocols')
        .update({ 
          payment_requested_at: new Date().toISOString()
        })
        .in('id', selectedProtocols);

      if (updateError) {
        throw updateError;
      }

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-payment-email', {
        body: {
          recipient_email: recipientEmail,
          cc_emails: ccEmails ? ccEmails.split(',').map(e => e.trim()) : [],
          subject,
          message,
          protocol_ids: selectedProtocols,
          protocols_data: protocols.filter(p => selectedProtocols.includes(p.id)).map(p => {
            // Extract expense descriptions from closing_data if available
            let expenseDescriptions: string[] = [];
            if (p.type === 'expense' && p.closing_data) {
              // Check if closing_data is an array, otherwise try to parse it
              const closingDataArray = Array.isArray(p.closing_data) 
                ? p.closing_data 
                : (typeof p.closing_data === 'string' 
                    ? JSON.parse(p.closing_data) 
                    : []);
                    
              if (Array.isArray(closingDataArray)) {
                expenseDescriptions = closingDataArray.map((expense: any) => 
                  expense.description || 'Despesa sem descrição'
                );
              }
            }
            
            return {
              protocol_number: p.protocol_number,
              competence_month: p.competence_month,
              total_value: p.total_value,
              product_1_count: p.product_1_count,
              product_2_count: p.product_2_count,
              expense_descriptions: expenseDescriptions
            };
          }),
          total_amount: calculateTotals().totalValue,
          company_info: companyInfo,
          pdf_attachment: {
            content: pdfBase64,
            filename: `solicitacao-pagamento-${format(new Date(), 'yyyy-MM-dd')}.pdf`
          }
        }
      });

      if (emailError) {
        throw emailError;
      }

      toast({
        title: "Sucesso!",
        description: "Solicitação de pagamento enviada com sucesso",
      });

      // Clear selection and refresh
      setSelectedProtocols([]);
      fetchProtocols();
      
    } catch (error) {
      console.error('Error sending payment request:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação de pagamento",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <Header userName={userFullName || ""} userRole={userRole} />
      <div className={mainContainerClass}>
        <div className="space-y-6 p-6">
          <div>
        <h1 className="text-3xl font-bold tracking-tight">Solicitação de Pagamento</h1>
        <p className="text-muted-foreground">
          Envie solicitações de pagamento para protocolos pendentes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selecionados</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.protocolCount}</div>
            <p className="text-xs text-muted-foreground">
              de {protocols.length} protocolos disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              {totals.totalPages} páginas | {totals.totalIds} IDs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Protocols Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Protocolos Pendentes</CardTitle>
          <CardDescription>
            Selecione os protocolos que serão incluídos na solicitação de pagamento
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
                Não há protocolos pendentes de pagamento no momento.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedProtocols.length === protocols.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>
              
              <div className="space-y-2">
                {protocols.map((protocol) => (
                  <div
                    key={protocol.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={protocol.id}
                      checked={selectedProtocols.includes(protocol.id)}
                      onCheckedChange={() => handleProtocolToggle(protocol.id)}
                    />
                    <label
                      htmlFor={protocol.id}
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{protocol.protocol_number}</span>
                        <Badge variant={protocol.type === 'production' ? 'default' : 'secondary'}>
                          {protocol.type === 'production' ? 'Produção' : 'Despesas'}
                        </Badge>
                        <Badge variant="outline">
                          {format(new Date(protocol.competence_month), 'MMM/yyyy', { locale: ptBR })}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(protocol.total_value)} • 
                        {protocol.type === 'production' ? (
                          <>
                            {protocol.product_1_count || 0} Produto 1 • 
                            {protocol.product_2_count || 0} Produto 2 • 
                            {protocol.total_pages || 0} páginas
                          </>
                        ) : (
                          <>
                            {protocol.expense_count || 0} despesas
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Configuration */}
      {selectedProtocols.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configurar E-mail</CardTitle>
            <CardDescription>
              Configure os detalhes do e-mail de solicitação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipient">Para *</Label>
                <Input
                  id="recipient"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="financeiro@empresa.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cc">Cc (separar por vírgula)</Label>
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
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSendEmail}
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
      </div>
    </div>
  );
}