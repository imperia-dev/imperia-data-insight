import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
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
import { useAuth } from "@/contexts/AuthContext";
import { usePageLayout } from "@/hooks/usePageLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Upload, CheckCircle, XCircle, FileText, Calendar, DollarSign, Loader2, AlertCircle, Search, Eye, Download, Check } from "lucide-react";

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

export default function PaymentReceipts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('viewer');
  const [userFullName, setUserFullName] = useState<string>('');
  const { mainContainerClass } = usePageLayout();
  const [loading, setLoading] = useState(false);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form fields for new receipt
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receiptAmount, setReceiptAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [bankReference, setBankReference] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProtocols();
    fetchReceipts();
    fetchUserInfo();
  }, [user]);

  const fetchUserInfo = async () => {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserRole(profile.role || 'viewer');
        setUserFullName(profile.full_name || '');
      }
    }
  };

  const fetchProtocols = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('closing_protocols')
        .select('*')
        .in('payment_status', ['requested', 'paid'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching protocols:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar protocolos",
          variant: "destructive",
        });
      } else {
        setProtocols(data || []);
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

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_receipts')
        .select(`
          *,
          protocol:closing_protocols(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching receipts:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar comprovantes",
          variant: "destructive",
        });
      } else {
        setReceipts(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar comprovantes",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedProtocol || !receiptFile) {
      toast({
        title: "Atenção",
        description: "Selecione um protocolo e um arquivo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${selectedProtocol.protocol_number}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, receiptFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      // Save receipt record
      const { data: receipt, error: receiptError } = await supabase
        .from('payment_receipts')
        .insert({
          protocol_id: selectedProtocol.id,
          receipt_number: receiptNumber || null,
          receipt_date: receiptDate,
          amount: parseFloat(receiptAmount),
          payment_method: paymentMethod,
          bank_reference: bankReference || null,
          file_url: publicUrl,
          notes: receiptNotes || null,
          validated: false,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (receiptError) {
        throw receiptError;
      }

      toast({
        title: "Sucesso!",
        description: "Comprovante enviado com sucesso",
      });

      // Reset form
      setReceiptNumber("");
      setReceiptAmount("");
      setBankReference("");
      setReceiptNotes("");
      setReceiptFile(null);
      setUploadDialogOpen(false);
      
      // Refresh data
      fetchProtocols();
      fetchReceipts();
      
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar comprovante",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleValidateReceipt = async () => {
    if (!selectedReceipt) return;

    try {
      const { error } = await supabase
        .from('payment_receipts')
        .update({
          validated: true,
          validated_at: new Date().toISOString(),
          validated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', selectedReceipt.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso!",
        description: "Comprovante validado com sucesso",
      });

      setValidationDialogOpen(false);
      fetchReceipts();
      fetchProtocols();
      
    } catch (error) {
      console.error('Error validating receipt:', error);
      toast({
        title: "Erro",
        description: "Erro ao validar comprovante",
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
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'requested':
        return <Badge variant="outline">Solicitado</Badge>;
      case 'paid':
        return <Badge variant="default">Pago</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'transfer':
        return 'Transferência';
      case 'pix':
        return 'PIX';
      case 'boleto':
        return 'Boleto';
      case 'cash':
        return 'Dinheiro';
      case 'check':
        return 'Cheque';
      default:
        return method || 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <Header userName={userFullName} userRole={userRole} />
      <div className={mainContainerClass}>
        <div className="space-y-6 p-6">
          <div>
        <h1 className="text-3xl font-bold tracking-tight">Comprovantes de Pagamento</h1>
        <p className="text-muted-foreground">
          Gerencie e valide comprovantes de pagamento
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocolos Solicitados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {protocols.filter(p => p.payment_status === 'requested').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comprovantes Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {receipts.filter(r => !r.validated).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando validação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(receipts
                .filter(r => r.validated)
                .reduce((sum, r) => sum + r.amount, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamentos confirmados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar protocolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Enviar Comprovante
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Enviar Comprovante de Pagamento</DialogTitle>
              <DialogDescription>
                Faça upload do comprovante de pagamento para um protocolo
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Protocolo *</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  onChange={(e) => {
                    const protocol = protocols.find(p => p.id === e.target.value);
                    setSelectedProtocol(protocol || null);
                    if (protocol) {
                      setReceiptAmount(protocol.total_value.toString());
                    }
                  }}
                >
                  <option value="">Selecione um protocolo</option>
                  {protocols
                    .filter(p => p.payment_status === 'requested')
                    .map(protocol => (
                      <option key={protocol.id} value={protocol.id}>
                        {protocol.protocol_number} - {formatCurrency(protocol.total_value)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receipt-number">Número do Comprovante</Label>
                  <Input
                    id="receipt-number"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="Ex: 123456"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="receipt-date">Data do Pagamento *</Label>
                  <Input
                    id="receipt-date"
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Forma de Pagamento *</Label>
                  <select
                    id="payment-method"
                    className="w-full p-2 border rounded-md"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="transfer">Transferência</option>
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto</option>
                    <option value="check">Cheque</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank-reference">Referência Bancária</Label>
                <Input
                  id="bank-reference"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  placeholder="Ex: TED 123456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo do Comprovante *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: PDF, JPG, PNG (máx. 10MB)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleFileUpload}
                disabled={uploading || !selectedProtocol || !receiptFile}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comprovantes Recentes</CardTitle>
          <CardDescription>
            Lista de comprovantes enviados e seu status de validação
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
                Nenhum comprovante foi enviado ainda.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Forma Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>
                      {receipt.protocol?.protocol_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(receipt.receipt_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(receipt.amount)}
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodLabel(receipt.payment_method)}
                    </TableCell>
                    <TableCell>
                      {receipt.validated ? (
                        <Badge variant="default">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Validado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(receipt.file_url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {!receipt.validated && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              setValidationDialogOpen(true);
                            }}
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

      {/* Validation Dialog */}
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validar Comprovante</DialogTitle>
            <DialogDescription>
              Confirme que o pagamento foi recebido e validado
            </DialogDescription>
          </DialogHeader>
          
          {selectedReceipt && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Protocolo</p>
                <p className="font-medium">{selectedReceipt.protocol?.protocol_number}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="font-medium">{formatCurrency(selectedReceipt.amount)}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Data do Pagamento</p>
                <p className="font-medium">
                  {format(new Date(selectedReceipt.receipt_date), 'dd/MM/yyyy')}
                </p>
              </div>
              
              {selectedReceipt.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{selectedReceipt.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setValidationDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleValidateReceipt}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Validar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}