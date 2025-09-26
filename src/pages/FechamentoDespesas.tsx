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
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  File,
  Filter,
  ArrowUpDown,
  CreditCard,
  Receipt,
  User,
  Eye
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ExpenseData {
  id: string;
  description: string;
  amount_original: number;
  amount_base: number;
  conta_contabil_id?: string;
  centro_custo_id?: string;
  tipo_fornecedor: string;
  data_competencia: string;
  data_vencimento?: string;
  status: string;
  files?: string[];
  fornecedor_id?: string;
  fornecedor_name?: string;
  payment_method?: string;
  invoice_number?: string;
  cnpj?: string;
  cpf?: string;
  email?: string;
  pix_key?: string;
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
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
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
  
  // New states for selection and payment mode
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [closingMode, setClosingMode] = useState<"complete" | "payment">("complete");
  const [filterType, setFilterType] = useState<"all" | "empresa" | "prestador">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showDetailedView, setShowDetailedView] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchProtocols();
  }, [user]);

  // Auto-fetch expenses when component loads or month changes
  useEffect(() => {
    if (selectedMonth && user) {
      fetchExpenses();
    }
  }, [selectedMonth, user]);

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
    setSelectedExpenseIds(new Set());

    try {
      const date = new Date(selectedMonth);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      // Simplified query without joins
      console.log('Fetching expenses for period:', {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      });

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('data_competencia', format(start, 'yyyy-MM-dd'))
        .lte('data_competencia', format(end, 'yyyy-MM-dd'))
        .is('closing_protocol_id', null)
        .neq('status', 'pago');

      if (expensesError) {
        console.error('Supabase error:', expensesError);
        throw expensesError;
      }

      console.log('Raw expenses data:', expensesData);
      console.log('Number of expenses found:', expensesData?.length || 0);

      // Map the data directly from expenses table
      const mappedExpenses = (expensesData || []).map(expense => {
        const mapped = {
          ...expense,
          fornecedor_name: expense.tipo_fornecedor || expense.description,
          amount_original: Number(expense.amount_original) || 0,
          amount_base: Number(expense.amount_base || expense.amount_original) || 0
        };
        console.log(`Expense ${mapped.id}: amount_base=${mapped.amount_base}, amount_original=${mapped.amount_original}`);
        return mapped;
      });

      console.log('Processed expenses:', mappedExpenses.length);
      setExpenses(mappedExpenses);
      
      // Only validate if there are expenses to validate
      if (mappedExpenses.length > 0) {
        validateExpenses(mappedExpenses);
        toast({
          title: "Despesas carregadas",
          description: `${mappedExpenses.length} despesas encontradas para o período`,
        });
      } else {
        // Clear validation errors when no expenses are found
        setValidationErrors([]);
        toast({
          title: "Nenhuma despesa encontrada",
          description: "Não há despesas para o período selecionado",
          variant: "default",
        });
      }
      
      // In payment mode, automatically select all expenses
      if (closingMode === "payment") {
        setSelectedExpenseIds(new Set(mappedExpenses.map(e => e.id)));
      }
      
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
      
      // Filter expenses based on mode
      const expensesToProcess = closingMode === "payment" 
        ? expenses.filter(e => selectedExpenseIds.has(e.id))
        : expenses;
      
      const companyExpenses = expensesToProcess.filter(e => e.tipo_fornecedor === 'empresa');
      const serviceProviderExpenses = expensesToProcess.filter(e => e.tipo_fornecedor === 'prestador');
      
      const totalCompany = companyExpenses.reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0);
      const totalServiceProvider = serviceProviderExpenses.reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0);
      const totalAmount = totalCompany + totalServiceProvider;

      const { data: protocol, error: protocolError } = await supabase
        .from('expense_closing_protocols')
        .insert({
          protocol_number: protocolNumber,
          competence_month: selectedMonth,
          total_company_expenses: totalCompany,
          total_service_provider_expenses: totalServiceProvider,
          total_amount: totalAmount,
          expense_count: expensesToProcess.length,
          status: 'draft',
          closing_data: expensesToProcess as any,
          notes: `${closingMode === "payment" ? "[PAGAMENTO] " : ""}${notes}`,
          created_by: user?.id
        })
        .select()
        .single();

      if (protocolError) throw protocolError;

      // Update expenses with protocol ID (keep status as 'lancado' for payment mode)
      const expenseIds = expensesToProcess.map(e => e.id);
      
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ 
          closing_protocol_id: protocol.id 
        })
        .in('id', expenseIds);

      if (updateError) throw updateError;

      setCurrentProtocol(protocol);
      setCurrentStep("completed");
      await fetchProtocols();

      toast({
        title: closingMode === "payment" ? "Protocolo de Pagamento Gerado" : "Protocolo de Fechamento Gerado",
        description: `Protocolo ${protocolNumber} criado com ${expensesToProcess.length} despesas`
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
      'Valor': e.amount_base || e.amount_original || 0,
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
      formatCurrency(e.amount_base || e.amount_original || 0),
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

  // Helper functions for filtering and sorting
  const getFilteredExpenses = () => {
    let filtered = [...expenses];
    
    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(e => e.tipo_fornecedor === filterType);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "amount":
          comparison = (a.amount_base || a.amount_original || 0) - (b.amount_base || b.amount_original || 0);
          break;
        case "name":
          comparison = (a.fornecedor_name || a.description).localeCompare(b.fornecedor_name || b.description);
          break;
        case "date":
        default:
          comparison = new Date(a.data_competencia).getTime() - new Date(b.data_competencia).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  };

  const toggleExpenseSelection = (expenseId: string) => {
    const newSelected = new Set(selectedExpenseIds);
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId);
    } else {
      newSelected.add(expenseId);
    }
    setSelectedExpenseIds(newSelected);
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredExpenses();
    if (selectedExpenseIds.size === filtered.length) {
      setSelectedExpenseIds(new Set());
    } else {
      setSelectedExpenseIds(new Set(filtered.map(e => e.id)));
    }
  };

  const getSelectedTotal = () => {
    return expenses
      .filter(e => selectedExpenseIds.has(e.id))
      .reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0);
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
                      Escolha o mês e o modo de operação para o fechamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-6 max-w-2xl mx-auto">
                      <div className="space-y-2">
                        <Label>Modo de Operação</Label>
                        <ToggleGroup
                          type="single"
                          value={closingMode}
                          onValueChange={(value) => value && setClosingMode(value as "complete" | "payment")}
                          className="justify-start"
                        >
                          <ToggleGroupItem value="complete" className="gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Fechamento Completo
                          </ToggleGroupItem>
                          <ToggleGroupItem value="payment" className="gap-2">
                            <CreditCard className="w-4 h-4" />
                            Seleção para Pagamento
                          </ToggleGroupItem>
                        </ToggleGroup>
                        <p className="text-sm text-muted-foreground">
                          {closingMode === "complete" 
                            ? "Fecha todas as despesas do período selecionado"
                            : "Permite selecionar despesas específicas para pagamento"}
                        </p>
                      </div>
                      
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
                          Selecione o mês que deseja processar
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
                            Buscar Despesas em Aberto
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {closingMode === "payment" ? "Seleção de Despesas para Pagamento" : "Validação de Despesas"}
                      </CardTitle>
                      <CardDescription>
                        {closingMode === "payment" 
                          ? "Selecione as despesas que deseja pagar" 
                          : "Verifique pendências antes de prosseguir com o fechamento"}
                      </CardDescription>
                    </div>
                    {closingMode === "payment" && expenses.length > 0 && (
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {selectedExpenseIds.size} de {expenses.length} selecionadas
                        </Badge>
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          Total: {formatCurrency(getSelectedTotal())}
                        </Badge>
                      </div>
                    )}
                  </div>
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
                      {/* Filters and Controls */}
                      {closingMode === "payment" && (
                        <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
                          <div className="flex gap-2">
                            <ToggleGroup
                              type="single"
                              value={filterType}
                              onValueChange={(value) => value && setFilterType(value as any)}
                            >
                              <ToggleGroupItem value="all" size="sm">
                                Todos
                              </ToggleGroupItem>
                              <ToggleGroupItem value="empresa" size="sm">
                                <Building2 className="w-3 h-3 mr-1" />
                                Empresa
                              </ToggleGroupItem>
                              <ToggleGroupItem value="prestador" size="sm">
                                <Users className="w-3 h-3 mr-1" />
                                Prestador
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </div>
                          
                          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="date">Ordenar por Data</SelectItem>
                              <SelectItem value="amount">Ordenar por Valor</SelectItem>
                              <SelectItem value="name">Ordenar por Nome</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                          >
                            <ArrowUpDown className="w-4 h-4" />
                            {sortOrder === "asc" ? "Crescente" : "Decrescente"}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDetailedView(!showDetailedView)}
                            className="ml-auto"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {showDetailedView ? "Ocultar Detalhes" : "Mostrar Detalhes"}
                          </Button>
                        </div>
                      )}

                      {/* Enhanced Expense Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {closingMode === "payment" && (
                                <TableHead className="w-[50px]">
                                  <Checkbox
                                    checked={selectedExpenseIds.size === getFilteredExpenses().length}
                                    onCheckedChange={toggleSelectAll}
                                  />
                                </TableHead>
                              )}
                              <TableHead>Descrição</TableHead>
                              {showDetailedView && (
                                <>
                                  <TableHead>Fornecedor</TableHead>
                                  <TableHead>CPF/CNPJ</TableHead>
                                  <TableHead>Conta</TableHead>
                                </>
                              )}
                              <TableHead>Tipo</TableHead>
                              <TableHead>Competência</TableHead>
                              {showDetailedView && <TableHead>Vencimento</TableHead>}
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead>Anexos</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredExpenses().map((expense) => (
                              <TableRow 
                                key={expense.id}
                                className={selectedExpenseIds.has(expense.id) ? "bg-muted/50" : ""}
                              >
                                {closingMode === "payment" && (
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedExpenseIds.has(expense.id)}
                                      onCheckedChange={() => toggleExpenseSelection(expense.id)}
                                    />
                                  </TableCell>
                                )}
                                <TableCell className="font-medium max-w-[200px] truncate">
                                  {expense.description}
                                </TableCell>
                                {showDetailedView && (
                                  <>
                                    <TableCell className="max-w-[150px] truncate">
                                      {expense.fornecedor_name || "-"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {expense.cpf || expense.cnpj || "-"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {expense.conta_contabil_id ? 
                                        expense.conta_contabil_id.substring(0, 8) + "..." : 
                                        "-"}
                                    </TableCell>
                                  </>
                                )}
                                <TableCell>
                                  <Badge variant={expense.tipo_fornecedor === "empresa" ? "default" : "secondary"}>
                                    {expense.tipo_fornecedor === "empresa" ? (
                                      <Building2 className="w-3 h-3 mr-1" />
                                    ) : (
                                      <Users className="w-3 h-3 mr-1" />
                                    )}
                                    {expense.tipo_fornecedor}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {format(new Date(expense.data_competencia), 'dd/MM/yyyy')}
                                </TableCell>
                                {showDetailedView && (
                                  <TableCell>
                                    {expense.data_vencimento ? 
                                      format(new Date(expense.data_vencimento), 'dd/MM/yyyy') : 
                                      "-"}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <Badge variant={expense.status === "lancado" ? "outline" : "default"}>
                                    {expense.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(expense.amount_base || expense.amount_original || 0)}
                                </TableCell>
                                <TableCell>
                                  {expense.files && expense.files.length > 0 ? (
                                    <Badge variant="outline" className="text-green-600">
                                      <File className="w-3 h-3 mr-1" />
                                      {expense.files.length}
                                    </Badge>
                                  ) : (
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
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">
                              {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0))}
                            </p>
                            <p className="text-xs text-muted-foreground">{expenses.length} despesas</p>
                          </CardContent>
                        </Card>
                        
                        {closingMode === "payment" && (
                          <>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Selecionado</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-2xl font-bold text-primary">
                                  {formatCurrency(getSelectedTotal())}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedExpenseIds.size} despesas selecionadas
                                </p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Restante</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-2xl font-bold text-muted-foreground">
                                  {formatCurrency(
                                    expenses.reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0) - getSelectedTotal()
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {expenses.length - selectedExpenseIds.size} despesas não selecionadas
                                </p>
                              </CardContent>
                            </Card>
                          </>
                        )}
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
                              .reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0)
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
                              .reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0)
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
                            expenses.reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0)
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
                              items.reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0)
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
                                  {formatCurrency(expense.amount_base || expense.amount_original || 0)}
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
                  {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount_base || e.amount_original || 0), 0))}
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