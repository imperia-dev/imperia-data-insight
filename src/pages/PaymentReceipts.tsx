import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Upload, CheckCircle, XCircle, FileText, Calendar, DollarSign, Loader2, AlertCircle, Search, Eye, Download, Check } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider } from "@/contexts/SidebarContext";

interface Protocol {
  id: string;
  protocol_number: string;
  competence_month: string;
  total_value: number;
  payment_status: string;
  payment_requested_at: string | null;
  payment_received_at: string | null;
  payment_amount: number | null;
  receipt_url: string | null;
}

interface Receipt {
  id: string;
  protocol_id: string;
  receipt_number: string | null;
  receipt_date: string;
  amount: number;
  payment_method: string | null;
  bank_reference: string | null;
  file_url: string;
  notes: string | null;
  validated: boolean;
  validated_at: string | null;
  created_at: string;
  protocol?: Protocol;
}

function PaymentReceiptsContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [userFullName, setUserFullName] = useState<string>("");

  // Form states for receipt upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch protocols with payment status
      const { data: protocolsData, error: protocolsError } = await supabase
        .from("closing_protocols")
        .select("*")
        .in("payment_status", ["sent", "paid", "overdue"])
        .order("created_at", { ascending: false });

      if (protocolsError) throw protocolsError;
      setProtocols(protocolsData || []);

      // Fetch existing receipts
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("payment_receipts")
        .select(`
          *,
          protocol:closing_protocols(*)
        `)
        .order("created_at", { ascending: false });

      if (receiptsError) throw receiptsError;
      setReceipts(receiptsData || []);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar dados de pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const uploadReceipt = async () => {
    if (!selectedProtocol || !receiptFile || !receiptDate || !receiptAmount) {
      toast({
        title: "Atenção",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingReceipt(true);

      // Upload file to storage
      const fileExt = receiptFile.name.split(".").pop();
      const fileName = `${selectedProtocol.protocol_number}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("payment-receipts")
        .getPublicUrl(filePath);

      // Create receipt record
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: receipt, error: receiptError } = await supabase
        .from("payment_receipts")
        .insert({
          protocol_id: selectedProtocol.id,
          receipt_number: receiptNumber || null,
          receipt_date: receiptDate,
          amount: parseFloat(receiptAmount),
          payment_method: paymentMethod || null,
          bank_reference: bankReference || null,
          file_url: publicUrl,
          notes: receiptNotes || null,
          validated: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      toast({
        title: "Sucesso!",
        description: "Recibo enviado com sucesso",
      });

      // Reset form
      setSelectedProtocol(null);
      setReceiptFile(null);
      setReceiptNumber("");
      setReceiptDate("");
      setReceiptAmount("");
      setPaymentMethod("");
      setBankReference("");
      setReceiptNotes("");

      // Refresh data
      await fetchData();
      
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar recibo",
        variant: "destructive",
      });
    } finally {
      setUploadingReceipt(false);
    }
  };

  const validateReceipt = async (receiptId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("payment_receipts")
        .update({
          validated: true,
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
        })
        .eq("id", receiptId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Recibo validado com sucesso",
      });

      // Refresh data
      await fetchData();
      
    } catch (error) {
      console.error("Error validating receipt:", error);
      toast({
        title: "Erro",
        description: "Erro ao validar recibo",
        variant: "destructive",
      });
    }
  };

  const filteredProtocols = protocols.filter(p =>
    p.protocol_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.competence_month.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "sent":
        return <Badge variant="secondary">Enviado</Badge>;
      case "overdue":
        return <Badge variant="destructive">Vencido</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aguardando Pagamento</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {protocols.filter(p => p.payment_status === "sent").length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recibos Pendentes</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {receipts.filter(r => !r.validated).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pagos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {protocols.filter(p => p.payment_status === "paid").length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      protocols
                        .filter(p => p.payment_status === "paid")
                        .reduce((sum, p) => sum + (p.payment_amount || 0), 0)
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upload Receipt Section */}
            <Card>
              <CardHeader>
                <CardTitle>Enviar Recibo de Pagamento</CardTitle>
                <CardDescription>
                  Faça upload do comprovante de pagamento para validação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Protocol Selection */}
                  <div className="space-y-2">
                    <Label>Selecionar Protocolo</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar protocolo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchTerm && (
                      <div className="border rounded-lg max-h-48 overflow-y-auto">
                        {filteredProtocols.length === 0 ? (
                          <p className="p-4 text-center text-muted-foreground">
                            Nenhum protocolo encontrado
                          </p>
                        ) : (
                          filteredProtocols.map((protocol) => (
                            <div
                              key={protocol.id}
                              className="p-3 hover:bg-accent cursor-pointer flex items-center justify-between"
                              onClick={() => {
                                setSelectedProtocol(protocol);
                                setSearchTerm("");
                                setReceiptAmount(protocol.total_value.toString());
                              }}
                            >
                              <div>
                                <p className="font-medium">{protocol.protocol_number}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(protocol.competence_month), "MMM/yyyy", { locale: ptBR })} - {formatCurrency(protocol.total_value)}
                                </p>
                              </div>
                              {getStatusBadge(protocol.payment_status)}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {selectedProtocol && (
                    <>
                      <Alert>
                        <AlertDescription>
                          <strong>Protocolo Selecionado:</strong> {selectedProtocol.protocol_number} - 
                          Valor: {formatCurrency(selectedProtocol.total_value)}
                        </AlertDescription>
                      </Alert>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="receipt-file">Arquivo do Recibo *</Label>
                          <Input
                            id="receipt-file"
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="receipt-number">Número do Recibo</Label>
                          <Input
                            id="receipt-number"
                            value={receiptNumber}
                            onChange={(e) => setReceiptNumber(e.target.value)}
                            placeholder="Ex: REC-2024-001"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="receipt-date">Data do Pagamento *</Label>
                          <Input
                            id="receipt-date"
                            type="date"
                            value={receiptDate}
                            onChange={(e) => setReceiptDate(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="receipt-amount">Valor Pago *</Label>
                          <Input
                            id="receipt-amount"
                            type="number"
                            step="0.01"
                            value={receiptAmount}
                            onChange={(e) => setReceiptAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="payment-method">Método de Pagamento</Label>
                          <Input
                            id="payment-method"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            placeholder="Ex: PIX, TED, Boleto"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bank-reference">Referência Bancária</Label>
                          <Input
                            id="bank-reference"
                            value={bankReference}
                            onChange={(e) => setBankReference(e.target.value)}
                            placeholder="Ex: Transação #12345"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="receipt-notes">Observações</Label>
                        <Textarea
                          id="receipt-notes"
                          value={receiptNotes}
                          onChange={(e) => setReceiptNotes(e.target.value)}
                          rows={3}
                          placeholder="Observações adicionais..."
                        />
                      </div>

                      <div className="flex justify-end space-x-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedProtocol(null);
                            setReceiptFile(null);
                            setReceiptNumber("");
                            setReceiptDate("");
                            setReceiptAmount("");
                            setPaymentMethod("");
                            setBankReference("");
                            setReceiptNotes("");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={uploadReceipt}
                          disabled={uploadingReceipt || !receiptFile}
                        >
                          {uploadingReceipt ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Enviar Recibo
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Receipts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recibos Enviados</CardTitle>
                <CardDescription>
                  Histórico de recibos de pagamento enviados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : receipts.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum recibo enviado ainda.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Data Pagamento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell>
                            {receipt.protocol?.protocol_number || "N/A"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(receipt.receipt_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>{formatCurrency(receipt.amount)}</TableCell>
                          <TableCell>{receipt.payment_method || "-"}</TableCell>
                          <TableCell>
                            {receipt.validated ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Validado
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(receipt.file_url, "_blank")}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!receipt.validated && userRole === "owner" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => validateReceipt(receipt.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
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
    </div>
  );
}

export default function PaymentReceipts() {
  return (
    <SidebarProvider>
      <PaymentReceiptsContent />
    </SidebarProvider>
  );
}