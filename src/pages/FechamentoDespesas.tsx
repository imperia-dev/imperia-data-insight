import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Download, 
  Lock,
  ChevronDown,
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  CheckSquare,
  XCircle,
  Upload,
  Paperclip,
  File
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ExpenseData {
  id: string;
  description: string;
  amount_base: number;
  conta_contabil_id: string;
  centro_custo_id: string;
  tipo_fornecedor: string;
  data_competencia: string;
  status: string;
  files?: string[];
}

interface ClosingProtocol {
  id: string;
  protocol_number: string;
  competence_month: string;
  total_company_expenses: number;
  total_service_provider_expenses: number;
  total_amount: number;
  expense_count: number;
  status: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
}

function FechamentoDespesasContent() {
  const { user } = useAuth();
  const { mainContainerClass } = useSidebarOffset();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [protocols, setProtocols] = useState<ClosingProtocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"selection" | "validation" | "review" | "completed">("selection");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [currentProtocol, setCurrentProtocol] = useState<ClosingProtocol | null>(null);
  const [notes, setNotes] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachFileDialogOpen, setAttachFileDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  useEffect(() => {
    fetchUserProfile();
    fetchProtocols();
  }, [user]);

  const fetchUserProfile = async () => {
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setUserName(data.full_name);
        setUserRole(data.role);
      }
    }
  };

  const fetchProtocols = async () => {
    const { data, error } = await supabase
      .from('expense_closing_protocols')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setProtocols(data);
    }
  };

  const fetchExpenses = async () => {
    if (!selectedMonth) return;

    setLoading(true);
    setValidationErrors([]);

    try {
      const date = new Date(selectedMonth);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('data_competencia', format(start, 'yyyy-MM-dd'))
        .lte('data_competencia', format(end, 'yyyy-MM-dd'))
        .is('closing_protocol_id', null)
        .in('status', ['lancado', 'pago']);

      if (error) throw error;

      setExpenses(data || []);
      validateExpenses(data || []);
      setCurrentStep("validation");
    } catch (error: any) {
      toast({
        title: "Erro ao buscar despesas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validateExpenses = (expenseList: ExpenseData[]) => {
    const errors: string[] = [];
    const expensesWithoutFiles: Array<{id: string, description: string}> = [];

    expenseList.forEach(expense => {
      if (!expense.conta_contabil_id) {
        errors.push(`Despesa "${expense.description}" sem conta contábil`);
      }
      if (!expense.files || expense.files.length === 0) {
        expensesWithoutFiles.push({id: expense.id, description: expense.description});
      }
    });

    if (expenseList.length === 0) {
      errors.push("Nenhuma despesa encontrada para o período selecionado");
    }

    setValidationErrors(errors);
    return expensesWithoutFiles;
  };

  const handleFileUpload = async () => {
    if (!selectedFiles || !selectedExpenseId) return;

    setUploading(true);
    const uploadedFiles: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = `${Date.now()}-${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('company-cost-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        uploadedFiles.push(fileName);
      }

      // Update expense with the uploaded files
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ files: uploadedFiles })
        .eq('id', selectedExpenseId);

      if (updateError) throw updateError;

      // Update local expenses state
      setExpenses(prevExpenses => 
        prevExpenses.map(exp => 
          exp.id === selectedExpenseId 
            ? { ...exp, files: uploadedFiles }
            : exp
        )
      );

      // Re-validate expenses
      const updatedExpenses = expenses.map(exp => 
        exp.id === selectedExpenseId 
          ? { ...exp, files: uploadedFiles }
          : exp
      );
      validateExpenses(updatedExpenses);

      toast({
        title: "Arquivos anexados com sucesso",
        description: `${uploadedFiles.length} arquivo(s) foram anexados à despesa.`
      });

      setAttachFileDialogOpen(false);
      setSelectedFiles(null);
      setSelectedExpenseId(null);
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "Erro ao anexar arquivos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const generateProtocolNumber = async (): Promise<string> => {
    const date = new Date(selectedMonth);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const { count } = await supabase
      .from('expense_closing_protocols')
      .select('*', { count: 'exact', head: true })
      .like('protocol_number', `DESP-${year}-${month}-%`);
    
    const sequence = String((count || 0) + 1).padStart(3, '0');
    return `DESP-${year}-${month}-${sequence}`;
  };

  const handleCreateProtocol = async () => {
    setLoading(true);
    try {
      const protocolNumber = await generateProtocolNumber();
      
      const companyExpenses = expenses.filter(e => e.tipo_fornecedor === 'empresa');
      const serviceProviderExpenses = expenses.filter(e => e.tipo_fornecedor === 'prestador');
      
      const totalCompany = companyExpenses.reduce((sum, e) => sum + Number(e.amount_base || 0), 0);
      const totalServiceProvider = serviceProviderExpenses.reduce((sum, e) => sum + Number(e.amount_base || 0), 0);
      const totalAmount = totalCompany + totalServiceProvider;

      const { data: protocol, error: protocolError } = await supabase
        .from('expense_closing_protocols')
        .insert({
          protocol_number: protocolNumber,
          competence_month: selectedMonth,
          total_company_expenses: totalCompany,
          total_service_provider_expenses: totalServiceProvider,
          total_amount: totalAmount,
          expense_count: expenses.length,
          status: 'draft',
          closing_data: expenses as any,
          notes: notes,
          created_by: user?.id
        })
        .select()
        .single();

      if (protocolError) throw protocolError;

      // Update expenses with protocol ID
      const expenseIds = expenses.map(e => e.id);
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ closing_protocol_id: protocol.id })
        .in('id', expenseIds);

      if (updateError) throw updateError;

      setCurrentProtocol(protocol);
      setCurrentStep("completed");
      await fetchProtocols();

      toast({
        title: "Protocolo gerado com sucesso",
        description: `Protocolo ${protocolNumber} criado`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar protocolo",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleApproveProtocol = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from('expense_closing_protocols')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', protocolId);

      if (error) throw error;

      await fetchProtocols();
      toast({
        title: "Protocolo aprovado",
        description: "O protocolo foi aprovado com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar protocolo",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCloseProtocol = async (protocolId: string) => {
    try {
      const { error } = await supabase
        .from('expense_closing_protocols')
        .update({ status: 'closed' })
        .eq('id', protocolId);

      if (error) throw error;

      await fetchProtocols();
      toast({
        title: "Protocolo fechado",
        description: "O protocolo foi fechado definitivamente"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fechar protocolo",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(expenses.map(e => ({
      'Descrição': e.description,
      'Valor': e.amount_base,
      'Tipo Fornecedor': e.tipo_fornecedor,
      'Data Competência': format(new Date(e.data_competencia), 'dd/MM/yyyy'),
      'Status': e.status
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Despesas");
    XLSX.writeFile(wb, `fechamento-despesas-${selectedMonth}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório de Fechamento de Despesas", 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Competência: ${format(new Date(selectedMonth), 'MMMM/yyyy', { locale: ptBR })}`, 14, 32);
    doc.text(`Total de Despesas: ${expenses.length}`, 14, 40);
    
    const tableData = expenses.map(e => [
      e.description,
      formatCurrency(e.amount_base),
      e.tipo_fornecedor,
      format(new Date(e.data_competencia), 'dd/MM/yyyy')
    ]);

    (doc as any).autoTable({
      head: [['Descrição', 'Valor', 'Tipo', 'Data']],
      body: tableData,
      startY: 50
    });

    doc.save(`fechamento-despesas-${selectedMonth}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Rascunho", variant: "secondary" as const, icon: FileText },
      under_review: { label: "Em Revisão", variant: "outline" as const, icon: AlertCircle },
      approved: { label: "Aprovado", variant: "default" as const, icon: CheckCircle },
      closed: { label: "Fechado", variant: "default" as const, icon: Lock }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const groupExpensesByCategory = () => {
    const grouped: Record<string, ExpenseData[]> = {};
    
    expenses.forEach(expense => {
      const key = expense.tipo_fornecedor || 'outros';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(expense);
    });

    return grouped;
  };

  return (
    <>
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Fechamento de Despesas</h1>
                <p className="text-muted-foreground mt-2">
                  Consolidação e fechamento mensal de despesas
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setHistoryOpen(!historyOpen)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Histórico
                </Button>
              </div>
            </div>

            <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="selection">
                  <Calendar className="w-4 h-4 mr-2" />
                  Seleção
                </TabsTrigger>
                <TabsTrigger value="validation" disabled={!selectedMonth}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Validação
                </TabsTrigger>
                <TabsTrigger value="review" disabled={validationErrors.length > 0}>
                  <FileText className="w-4 h-4 mr-2" />
                  Revisão
                </TabsTrigger>
                <TabsTrigger value="completed" disabled={!currentProtocol}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Concluído
                </TabsTrigger>
              </TabsList>

              <TabsContent value="selection" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Selecionar Período de Competência</CardTitle>
                    <CardDescription>
                      Escolha o mês para realizar o fechamento das despesas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-6 max-w-2xl mx-auto">
                      <div className="space-y-2">
                        <Label htmlFor="month-select">Mês de Competência</Label>
                        <input
                          id="month-select"
                          type="month"
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <p className="text-sm text-muted-foreground">
                          Selecione o mês que deseja fechar e clique em "Buscar Despesas"
                        </p>
                      </div>
                      <Button
                        onClick={fetchExpenses}
                        disabled={!selectedMonth || loading}
                        className="w-full"
                        size="lg"
                      >
                        {loading ? (
                          <>Buscando...</>
                        ) : (
                          <>
                            <Calendar className="w-4 h-4 mr-2" />
                            Buscar Despesas do Período
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            <TabsContent value="validation" className="space-y-4">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Validação de Despesas</CardTitle>
                  <CardDescription>
                    Verifique pendências antes de prosseguir com o fechamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {validationErrors.length > 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Pendências Encontradas</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-2 space-y-2">
                          {validationErrors.map((error, index) => (
                            <li key={index} className="flex items-center justify-between">
                              <span>{error}</span>
                              {error.includes("sem documentos anexados") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const expenseDesc = error.match(/Despesa "(.+)" sem/)?.[1];
                                    const expense = expenses.find(e => e.description === expenseDesc);
                                    if (expense) {
                                      setSelectedExpenseId(expense.id);
                                      setAttachFileDialogOpen(true);
                                    }
                                  }}
                                >
                                  <Paperclip className="w-3 h-3 mr-1" />
                                  Anexar
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>Validação Concluída</AlertTitle>
                      <AlertDescription>
                        Todas as despesas estão válidas. Você pode prosseguir para a revisão.
                      </AlertDescription>
                    </Alert>
                  )}

                  {expenses.length > 0 && (
                    <>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Total de Despesas</span>
                          <Badge>{expenses.length}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Valor Total</span>
                          <span className="font-semibold">
                            {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount_base || 0), 0))}
                          </span>
                        </div>
                      </div>

                      {/* Lista de despesas com status de anexo */}
                      <div className="border rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-sm mb-2">Status dos Documentos</h4>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {expenses.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between text-sm py-1">
                              <span className="truncate flex-1 mr-2">{expense.description}</span>
                              <div className="flex items-center gap-2">
                                {expense.files && expense.files.length > 0 ? (
                                  <Badge variant="outline" className="text-green-600">
                                    <File className="w-3 h-3 mr-1" />
                                    {expense.files.length} arquivo(s)
                                  </Badge>
                                ) : (
                                  <>
                                    <Badge variant="destructive">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Sem anexos
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedExpenseId(expense.id);
                                        setAttachFileDialogOpen(true);
                                      }}
                                    >
                                      <Upload className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {validationErrors.length === 0 && expenses.length > 0 && (
                    <Button
                      className="w-full mt-4"
                      onClick={() => setCurrentStep("review")}
                    >
                      Prosseguir para Revisão
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Despesas Empresa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(
                            expenses
                              .filter(e => e.tipo_fornecedor === 'empresa')
                              .reduce((sum, e) => sum + Number(e.amount_base || 0), 0)
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {expenses.filter(e => e.tipo_fornecedor === 'empresa').length} lançamentos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Prestadores Serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Users className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(
                            expenses
                              .filter(e => e.tipo_fornecedor === 'prestador')
                              .reduce((sum, e) => sum + Number(e.amount_base || 0), 0)
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {expenses.filter(e => e.tipo_fornecedor === 'prestador').length} lançamentos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Total Geral</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(
                            expenses.reduce((sum, e) => sum + Number(e.amount_base || 0), 0)
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {expenses.length} lançamentos totais
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Categoria</CardTitle>
                  <CardDescription>
                    Revise todas as despesas antes de gerar o protocolo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(groupExpensesByCategory()).map(([category, items]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold capitalize">{category}</h3>
                          <Badge variant="outline">
                            {items.length} itens | {formatCurrency(
                              items.reduce((sum, e) => sum + Number(e.amount_base || 0), 0)
                            )}
                          </Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.slice(0, 5).map((expense) => (
                              <TableRow key={expense.id}>
                                <TableCell className="font-medium">{expense.description}</TableCell>
                                <TableCell>
                                  {format(new Date(expense.data_competencia), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(expense.amount_base)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {items.length > 5 && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                  ... e mais {items.length - 5} itens
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Observações (opcional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Adicione observações sobre este fechamento..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={exportToExcel}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Exportar Excel
                      </Button>
                      <Button
                        variant="outline"
                        onClick={exportToPDF}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar PDF
                      </Button>
                      <Button
                        className="ml-auto"
                        onClick={() => setConfirmDialogOpen(true)}
                      >
                        Gerar Protocolo de Fechamento
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Fechamento Concluído!</AlertTitle>
                <AlertDescription>
                  O protocolo de fechamento foi gerado com sucesso.
                </AlertDescription>
              </Alert>

              {currentProtocol && (
                <Card>
                  <CardHeader>
                    <CardTitle>Protocolo de Fechamento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Número do Protocolo</Label>
                        <p className="text-2xl font-bold text-primary">
                          {currentProtocol.protocol_number}
                        </p>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <div className="mt-1">
                          {getStatusBadge(currentProtocol.status)}
                        </div>
                      </div>
                      <div>
                        <Label>Competência</Label>
                        <p className="font-medium">
                          {format(new Date(currentProtocol.competence_month), 'MMMM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <Label>Total</Label>
                        <p className="font-medium">
                          {formatCurrency(currentProtocol.total_amount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setCurrentStep("selection");
                          setSelectedMonth("");
                          setExpenses([]);
                          setCurrentProtocol(null);
                          setNotes("");
                        }}
                      >
                        Novo Fechamento
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mt-6">
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Histórico de Fechamentos</CardTitle>
                    <ChevronDown className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocolo</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Data Criação</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {protocols.map((protocol) => (
                          <TableRow key={protocol.id}>
                            <TableCell className="font-medium">
                              {protocol.protocol_number}
                            </TableCell>
                            <TableCell>
                              {format(new Date(protocol.competence_month), 'MMM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(protocol.status)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(protocol.total_amount)}
                            </TableCell>
                            <TableCell>
                              {format(new Date(protocol.created_at), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {protocol.status === 'draft' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApproveProtocol(protocol.id)}
                                  >
                                    Aprovar
                                  </Button>
                                )}
                                {protocol.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCloseProtocol(protocol.id)}
                                  >
                                    Fechar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </main>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Geração de Protocolo</DialogTitle>
            <DialogDescription>
              Após gerar o protocolo, as despesas incluídas não poderão mais ser editadas.
              Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total de Despesas:</span>
                <span>{expenses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Valor Total:</span>
                <span className="font-semibold">
                  {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount_base || 0), 0))}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProtocol} disabled={loading}>
              {loading ? "Gerando..." : "Confirmar e Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para anexar arquivos */}
      <Dialog open={attachFileDialogOpen} onOpenChange={setAttachFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar Documentos</DialogTitle>
            <DialogDescription>
              Selecione os arquivos para anexar à despesa selecionada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Arquivos</Label>
              <Input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setSelectedFiles(e.target.files)}
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX
              </p>
            </div>

            {selectedFiles && selectedFiles.length > 0 && (
              <div className="border rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">Arquivos selecionados:</p>
                {Array.from(selectedFiles).map((file, index) => (
                  <div key={index} className="text-sm text-muted-foreground flex items-center gap-1">
                    <File className="w-3 h-3" />
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAttachFileDialogOpen(false);
                setSelectedFiles(null);
                setSelectedExpenseId(null);
              }}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleFileUpload} 
              disabled={!selectedFiles || selectedFiles.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Anexar Arquivos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}

export default FechamentoDespesasContent;