import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileSpreadsheet, FileText, ArrowUpDown, Upload, Paperclip, Download, X, Calendar, FolderOpen, List, MessageSquare, DollarSign, Settings, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { CompanyCostFilters } from "@/components/companyCosts/CompanyCostFilters";
import { CategoryChart } from "@/components/companyCosts/CategoryChart";
import { exportToExcel, exportToPDF } from "@/utils/exportUtils";
import { formatCurrency } from "@/lib/currency";
import { sanitizeInput } from "@/lib/validations/sanitized";

interface ExportData {
  headers: string[];
  rows: any[][];
  title: string;
  totals?: { label: string; value: string }[];
}

interface Expense {
  id: string;
  data_competencia: string;
  amount_base: number;
  description: string;
  notes: string | null;
  files?: string[];
  created_at: string;
  updated_at: string;
  chart_of_accounts?: {
    id: string;
    name: string;
    code: string;
  };
  cost_centers?: {
    id: string;
    name: string;
  };
  suppliers?: {
    id: string;
    name: string;
  };
  status: string;
  payment_method?: string;
}

export default function CompanyCostsRefactored() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { userRole } = useRoleAccess('/company-costs');
  const [userName, setUserName] = useState<string>("");
  const [filters, setFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState("date_desc");
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
  const [selectedExpenseDetails, setSelectedExpenseDetails] = useState<Expense | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    data_competencia: new Date().toISOString().split('T')[0],
    conta_contabil_id: "",
    centro_custo_id: "",
    description: "",
    notes: "",
    amount_original: "",
    currency: "BRL",
    payment_method: "",
    status: "lancado",
  });

  useEffect(() => {
    fetchExpenses();
    fetchChartOfAccounts();
    fetchCostCenters();
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setUserName(data.full_name);
      }
    }
  };

  const fetchChartOfAccounts = async () => {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('code');
    
    if (data && !error) {
      setChartOfAccounts(data);
    }
  };

  const fetchCostCenters = async () => {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data && !error) {
      setCostCenters(data);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          chart_of_accounts(id, name, code),
          cost_centers(id, name)
        `)
        .eq('tipo_lancamento', 'empresa')
        .order('data_competencia', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const expenseData = {
        tipo_lancamento: 'empresa' as 'empresa',
        conta_contabil_id: formData.conta_contabil_id,
        centro_custo_id: formData.centro_custo_id || null,
        description: sanitizeInput(formData.description),
        notes: sanitizeInput(formData.notes) || null,
        amount_original: parseFloat(formData.amount_original),
        currency: formData.currency,
        exchange_rate: 1, // Default for BRL
        data_competencia: formData.data_competencia,
        payment_method: formData.payment_method,
        status: formData.status as 'previsto' | 'lancado' | 'pago' | 'conciliado',
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
        toast.success('Despesa atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (error) throw error;
        toast.success('Despesa cadastrada com sucesso!');
      }

      fetchExpenses();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Erro ao salvar despesa');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Despesa excluída com sucesso!');
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Erro ao excluir despesa');
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
    setFormData({
      data_competencia: new Date().toISOString().split('T')[0],
      conta_contabil_id: "",
      centro_custo_id: "",
      description: "",
      notes: "",
      amount_original: "",
      currency: "BRL",
      payment_method: "",
      status: "lancado",
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      data_competencia: expense.data_competencia,
      conta_contabil_id: expense.chart_of_accounts?.id || "",
      centro_custo_id: expense.cost_centers?.id || "",
      description: expense.description,
      notes: expense.notes || "",
      amount_original: expense.amount_base.toString(),
      currency: "BRL",
      payment_method: expense.payment_method || "",
      status: expense.status,
    });
    setIsDialogOpen(true);
  };

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Apply filters
    if (filters.startDate) {
      filtered = filtered.filter(e => new Date(e.data_competencia) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      filtered = filtered.filter(e => new Date(e.data_competencia) <= new Date(filters.endDate));
    }
    if (filters.category) {
      filtered = filtered.filter(e => e.chart_of_accounts?.id === filters.category);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(searchLower) ||
        e.notes?.toLowerCase().includes(searchLower) ||
        e.chart_of_accounts?.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date_desc":
          return new Date(b.data_competencia).getTime() - new Date(a.data_competencia).getTime();
        case "date_asc":
          return new Date(a.data_competencia).getTime() - new Date(b.data_competencia).getTime();
        case "amount_desc":
          return b.amount_base - a.amount_base;
        case "amount_asc":
          return a.amount_base - b.amount_base;
        default:
          return 0;
      }
    });

    return filtered;
  }, [expenses, filters, sortBy]);

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount_base, 0);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole || 'operation'} />
      
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole || 'operation'} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Custos - Empresa</h1>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="data_competencia">Data de Competência</Label>
                        <Input
                          id="data_competencia"
                          type="date"
                          value={formData.data_competencia}
                          onChange={(e) => setFormData({...formData, data_competencia: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="amount">Valor</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={formData.amount_original}
                          onChange={(e) => setFormData({...formData, amount_original: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="conta">Conta Contábil</Label>
                        <Select
                          value={formData.conta_contabil_id}
                          onValueChange={(value) => setFormData({...formData, conta_contabil_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta" />
                          </SelectTrigger>
                          <SelectContent>
                            {chartOfAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="centro_custo">Centro de Custo</Label>
                        <Select
                          value={formData.centro_custo_id}
                          onValueChange={(value) => setFormData({...formData, centro_custo_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o centro" />
                          </SelectTrigger>
                          <SelectContent>
                            {costCenters.map((center) => (
                              <SelectItem key={center.id} value={center.id}>
                                {center.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="payment_method">Método de Pagamento</Label>
                        <Select
                          value={formData.payment_method}
                          onValueChange={(value) => setFormData({...formData, payment_method: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="boleto">Boleto</SelectItem>
                            <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                            <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                            <SelectItem value="transferencia">Transferência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData({...formData, status: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="previsto">Previsto</SelectItem>
                            <SelectItem value="lancado">Lançado</SelectItem>
                            <SelectItem value="pago">Pago</SelectItem>
                            <SelectItem value="conciliado">Conciliado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={handleCloseDialog}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingExpense ? 'Atualizar' : 'Cadastrar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredExpenses.length} lançamentos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Média Mensal</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalAmount / 12)}
                  </div>
                  <p className="text-xs text-muted-foreground">Base anual</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categorias</CardTitle>
                  <List className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Set(filteredExpenses.map(e => e.chart_of_accounts?.id)).size}
                  </div>
                  <p className="text-xs text-muted-foreground">Contas utilizadas</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <CompanyCostFilters 
              onFiltersChange={setFilters}
              categories={chartOfAccounts.map(acc => `${acc.code} - ${acc.name}`)}
              subCategories={{}} // No subcategories for chart of accounts
            />

            {/* Category Chart */}
            <CategoryChart costs={filteredExpenses.map(e => ({
              category: e.chart_of_accounts?.name || 'Sem categoria',
              amount: e.amount_base
            }))} />

            {/* Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Lançamentos</CardTitle>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date_desc">Data (Mais recente)</SelectItem>
                        <SelectItem value="date_asc">Data (Mais antiga)</SelectItem>
                        <SelectItem value="amount_desc">Valor (Maior)</SelectItem>
                        <SelectItem value="amount_asc">Valor (Menor)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const exportData: ExportData = {
                          title: 'Despesas da Empresa',
                          headers: ['Data', 'Conta Contábil', 'Descrição', 'Fornecedor', 'Valor'],
                          rows: filteredExpenses.map(expense => [
                            format(new Date(expense.data_competencia), 'dd/MM/yyyy'),
                            expense.chart_of_accounts ? `${expense.chart_of_accounts.code} - ${expense.chart_of_accounts.name}` : 'N/A',
                            expense.description,
                            expense.suppliers?.name || 'N/A',
                            formatCurrency(expense.amount_base)
                          ]),
                          totals: [
                            { label: 'Total', value: formatCurrency(totalAmount) }
                          ]
                        };
                        exportToExcel(exportData);
                      }}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const exportData: ExportData = {
                          title: 'Despesas da Empresa',
                          headers: ['Data', 'Conta Contábil', 'Descrição', 'Fornecedor', 'Valor'],
                          rows: filteredExpenses.map(expense => [
                            format(new Date(expense.data_competencia), 'dd/MM/yyyy'),
                            expense.chart_of_accounts ? `${expense.chart_of_accounts.code} - ${expense.chart_of_accounts.name}` : 'N/A',
                            expense.description,
                            expense.suppliers?.name || 'N/A',
                            formatCurrency(expense.amount_base)
                          ]),
                          totals: [
                            { label: 'Total', value: formatCurrency(totalAmount) }
                          ]
                        };
                        exportToPDF(exportData);
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Conta Contábil</TableHead>
                      <TableHead>Centro de Custo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {format(new Date(expense.data_competencia), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {expense.chart_of_accounts?.code} - {expense.chart_of_accounts?.name}
                        </TableCell>
                        <TableCell>
                          {expense.cost_centers?.name || '-'}
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant={
                            expense.status === 'pago' ? 'default' :
                            expense.status === 'lancado' ? 'secondary' :
                            expense.status === 'previsto' ? 'outline' :
                            'destructive'
                          }>
                            {expense.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(expense.amount_base)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedExpenseDetails(expense);
                                setDetailsDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Despesa</DialogTitle>
          </DialogHeader>
          {selectedExpenseDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data</p>
                  <p>{format(new Date(selectedExpenseDetails.data_competencia), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedExpenseDetails.amount_base)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conta Contábil</p>
                <p>{selectedExpenseDetails.chart_of_accounts?.code} - {selectedExpenseDetails.chart_of_accounts?.name}</p>
              </div>
              {selectedExpenseDetails.cost_centers && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Centro de Custo</p>
                  <p>{selectedExpenseDetails.cost_centers.name}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                <p>{selectedExpenseDetails.description}</p>
              </div>
              {selectedExpenseDetails.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Observações</p>
                  <p className="whitespace-pre-wrap">{selectedExpenseDetails.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={
                    selectedExpenseDetails.status === 'pago' ? 'default' :
                    selectedExpenseDetails.status === 'lancado' ? 'secondary' :
                    selectedExpenseDetails.status === 'previsto' ? 'outline' :
                    'destructive'
                  }>
                    {selectedExpenseDetails.status}
                  </Badge>
                </div>
                {selectedExpenseDetails.payment_method && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Método de Pagamento</p>
                    <p>{selectedExpenseDetails.payment_method}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}