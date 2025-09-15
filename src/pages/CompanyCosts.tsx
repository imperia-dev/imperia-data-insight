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

interface CompanyCost {
  id: string;
  date: string;
  category: string;
  sub_category: string | null;
  description: string;
  observations: string | null;
  amount: number;
  files?: string[];
  created_at: string;
  updated_at: string;
}

const categories = [
  "Airbnb",
  "Passagem Aérea",
  "Refeição",
  "Software",
  "Custo",
  "Marketing",
  "Infraestrutura",
  "Consultoria",
  "Outros"
];

const subCategories: Record<string, string[]> = {
  Software: ["Novas Ideias", "Gestão", "Comunicação", "Desenvolvimento"],
  Custo: ["Utensílios", "Material de Escritório", "Manutenção"],
  Marketing: ["Publicidade", "Eventos", "Material Promocional"],
  Infraestrutura: ["Internet", "Telefone", "Aluguel", "Energia"],
};

export default function CompanyCosts() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const [costs, setCosts] = useState<CompanyCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<CompanyCost | null>(null);
  const { userRole } = useRoleAccess('/company-costs');
  const [userName, setUserName] = useState<string>("");
  const [filters, setFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState("date_desc");
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
  const [selectedCostDetails, setSelectedCostDetails] = useState<CompanyCost | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: "",
    sub_category: "",
    description: "",
    observations: "",
    amount: "",
  });

  useEffect(() => {
    fetchCosts();
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

  const fetchCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('company_costs')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setCosts(data || []);
    } catch (error) {
      console.error('Error fetching costs:', error);
      toast.error("Erro ao carregar custos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const costData = {
        date: formData.date,
        category: formData.category,
        sub_category: formData.sub_category || null,
        description: formData.description,
        observations: formData.observations || null,
        amount: parseFloat(formData.amount),
      };

      if (editingCost) {
        const { error } = await supabase
          .from('company_costs')
          .update(costData)
          .eq('id', editingCost.id);

        if (error) throw error;
        toast.success("Custo atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from('company_costs')
          .insert([costData]);

        if (error) throw error;
        toast.success("Custo adicionado com sucesso");
      }

      setIsDialogOpen(false);
      setEditingCost(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: "",
        sub_category: "",
        description: "",
        observations: "",
        amount: "",
      });
      fetchCosts();
    } catch (error) {
      console.error('Error saving cost:', error);
      toast.error("Erro ao salvar custo");
    }
  };

  const handleEdit = (cost: CompanyCost) => {
    setEditingCost(cost);
    setFormData({
      date: cost.date,
      category: cost.category,
      sub_category: cost.sub_category || "",
      description: cost.description,
      observations: cost.observations || "",
      amount: cost.amount.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este custo?")) return;

    try {
      // First, get the cost to check for files
      const cost = costs.find(c => c.id === id);
      
      // If there are files, delete them from storage
      if (cost?.files && cost.files.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('company-cost-files')
          .remove(cost.files);
        
        if (storageError) {
          console.error('Error deleting files from storage:', storageError);
        }
      }
      
      // Then delete the cost record
      const { error } = await supabase
        .from('company_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Custo excluído com sucesso");
      fetchCosts();
    } catch (error) {
      console.error('Error deleting cost:', error);
      toast.error("Erro ao excluir custo");
    }
  };

  const handleFileUpload = async (costId: string, files: FileList) => {
    if (files.length === 0) return;
    
    setUploadingFiles(prev => ({ ...prev, [costId]: true }));
    
    try {
      const uploadedPaths: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${costId}/${Date.now()}_${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('company-cost-files')
          .upload(fileName, file);
        
        if (error) throw error;
        uploadedPaths.push(data.path);
      }
      
      // Get current files for the cost
      const cost = costs.find(c => c.id === costId);
      const currentFiles = cost?.files || [];
      
      // Update the cost with new file paths
      const { error: updateError } = await supabase
        .from('company_costs')
        .update({ files: [...currentFiles, ...uploadedPaths] })
        .eq('id', costId);
      
      if (updateError) throw updateError;
      
      toast.success(`${files.length} arquivo(s) enviado(s) com sucesso`);
      fetchCosts();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error("Erro ao enviar arquivos");
    } finally {
      setUploadingFiles(prev => ({ ...prev, [costId]: false }));
    }
  };

  const handleFileDownload = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('company-cost-files')
        .download(filePath);
      
      if (error) throw error;
      
      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const handleFileRemove = async (costId: string, filePath: string) => {
    if (!confirm("Tem certeza que deseja remover este arquivo?")) return;
    
    try {
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('company-cost-files')
        .remove([filePath]);
      
      if (deleteError) throw deleteError;
      
      // Update cost to remove file path
      const cost = costs.find(c => c.id === costId);
      const updatedFiles = (cost?.files || []).filter(f => f !== filePath);
      
      const { error: updateError } = await supabase
        .from('company_costs')
        .update({ files: updatedFiles })
        .eq('id', costId);
      
      if (updateError) throw updateError;
      
      toast.success("Arquivo removido com sucesso");
      fetchCosts();
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error("Erro ao remover arquivo");
    }
  };

  // Filter and sort costs
  const filteredCosts = useMemo(() => {
    let filtered = [...costs];

    // Date filters
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(cost => {
        const costDate = new Date(cost.date + 'T00:00:00');
        return costDate >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(cost => {
        const costDate = new Date(cost.date + 'T00:00:00');
        return costDate <= endDate;
      });
    }

    // Category filter
    if (filters.category && filters.category !== "all") {
      filtered = filtered.filter(cost => 
        cost.category === filters.category
      );
    }

    // SubCategory filter
    if (filters.subCategory && filters.subCategory !== "all") {
      filtered = filtered.filter(cost => 
        cost.sub_category === filters.subCategory
      );
    }

    // Description filter
    if (filters.description) {
      filtered = filtered.filter(cost => 
        cost.description.toLowerCase().includes(filters.description.toLowerCase())
      );
    }

    // Observations filter
    if (filters.observations) {
      filtered = filtered.filter(cost => 
        cost.observations?.toLowerCase().includes(filters.observations.toLowerCase())
      );
    }

    // Amount filters
    if (filters.minAmount) {
      filtered = filtered.filter(cost => 
        cost.amount >= parseFloat(filters.minAmount)
      );
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(cost => 
        cost.amount <= parseFloat(filters.maxAmount)
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case "date_desc":
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "date_asc":
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "amount_asc":
        sorted.sort((a, b) => a.amount - b.amount);
        break;
      case "amount_desc":
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case "category_asc":
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "category_desc":
        sorted.sort((a, b) => b.category.localeCompare(a.category));
        break;
      case "description_asc":
        sorted.sort((a, b) => a.description.localeCompare(b.description));
        break;
      case "description_desc":
        sorted.sort((a, b) => b.description.localeCompare(a.description));
        break;
    }

    return sorted;
  }, [costs, filters, sortBy]);

  const totalAmount = filteredCosts.reduce((sum, cost) => sum + cost.amount, 0);

  const handleExportExcel = () => {
    const exportData = {
      title: 'Custos - Empresa',
      headers: ['Data', 'Categoria', 'Sub Categoria', 'Descrição', 'Observações', 'Valor'],
      rows: filteredCosts.map(cost => [
        format(new Date(cost.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
        cost.category,
        cost.sub_category || '-',
        cost.description,
        cost.observations || '-',
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cost.amount)
      ]),
      totals: [
        { label: 'Total Geral', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalAmount) }
      ]
    };
    exportToExcel(exportData);
  };

  const handleExportPDF = () => {
    // Prepare chart data
    const categoryTotals = filteredCosts.reduce((acc, cost) => {
      acc[cost.category] = (acc[cost.category] || 0) + cost.amount;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        label: category,
        value: amount,
        percentage: parseFloat(((amount / totalAmount) * 100).toFixed(1)),
        formattedValue: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(amount),
      }))
      .sort((a, b) => b.value - a.value);

    const exportData = {
      title: 'Custos - Empresa',
      headers: ['Data', 'Categoria', 'Sub Categoria', 'Descrição', 'Observações', 'Valor'],
      rows: filteredCosts.map(cost => [
        format(new Date(cost.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
        cost.category,
        cost.sub_category || '-',
        cost.description,
        cost.observations || '-',
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cost.amount)
      ]),
      totals: [
        { label: 'Total Geral', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalAmount) }
      ],
      charts: [
        {
          title: 'Distribuição por Categoria',
          type: 'bar' as const,
          data: chartData,
        },
        {
          title: 'Proporção de Gastos',
          type: 'pie' as const,
          data: chartData,
        }
      ]
    };
    exportToPDF(exportData);
  };

  if (loading) {
          return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={userName} userRole={userRole} />
      <Sidebar userRole={userRole} />
      <div className={`${mainContainerClass} pt-16`}>
        <div className="container mx-auto py-8 px-4">
          {/* Filters and Sort Component */}
          <div className="flex gap-4 items-start mb-4">
            <div className="flex-1">
              <CompanyCostFilters 
                onFiltersChange={setFilters}
                categories={categories}
                subCategories={subCategories}
              />
            </div>
            <div className="w-64">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ordenar por</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Data (Mais Recente)</SelectItem>
                    <SelectItem value="date_asc">Data (Mais Antiga)</SelectItem>
                    <SelectItem value="amount_asc">Valor (Menor)</SelectItem>
                    <SelectItem value="amount_desc">Valor (Maior)</SelectItem>
                    <SelectItem value="category_asc">Categoria (A-Z)</SelectItem>
                    <SelectItem value="category_desc">Categoria (Z-A)</SelectItem>
                    <SelectItem value="description_asc">Descrição (A-Z)</SelectItem>
                    <SelectItem value="description_desc">Descrição (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Custos - Empresa</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Exportar PDF
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCost(null);
                setFormData({
                  date: new Date().toISOString().split('T')[0],
                  category: "",
                  sub_category: "",
                  description: "",
                  observations: "",
                  amount: "",
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Custo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCost ? "Editar Custo" : "Adicionar Custo"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        category: value,
                        sub_category: "" 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {subCategories[formData.category] && (
                  <div>
                    <Label htmlFor="sub_category">Sub Categoria</Label>
                    <Select
                      value={formData.sub_category}
                      onValueChange={(value) => setFormData({ ...formData, sub_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma subcategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {subCategories[formData.category].map((subCat) => (
                          <SelectItem key={subCat} value={subCat}>
                            {subCat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Digite a descrição"
                  />
                </div>
                <div>
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Digite as observações (opcional)"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={!formData.date || !formData.category || !formData.description || !formData.amount}
                >
                  {editingCost ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="mb-4 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-border/50 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total de Custos</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(totalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {filteredCosts.length} de {costs.length} registros
                  </p>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden w-32">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${costs.length > 0 ? (filteredCosts.length / costs.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          <div className="overflow-x-auto rounded-lg border border-border/50 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40 transition-colors">
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Data
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      Categoria
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4 text-muted-foreground" />
                      Sub Categoria
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Descrição
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Observações
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Valor
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      Arquivos
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground">
                    <div className="flex items-center justify-end gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Ações
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <FileText className="h-10 w-10 opacity-40" />
                        <p className="text-sm">Nenhum custo encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCosts.map((cost, index) => (
                    <TableRow 
                      key={cost.id}
                      className={`
                        hover:bg-muted/20 transition-all duration-200
                        ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}
                      `}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {format(new Date(cost.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {cost.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {cost.sub_category || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{cost.description}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {cost.observations || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-lg text-foreground">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(cost.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* File upload input */}
                          <Input
                            type="file"
                            multiple
                            id={`file-upload-${cost.id}`}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) {
                                handleFileUpload(cost.id, e.target.files);
                              }
                            }}
                            disabled={uploadingFiles[cost.id]}
                          />
                          <Label
                            htmlFor={`file-upload-${cost.id}`}
                            className="cursor-pointer"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={uploadingFiles[cost.id]}
                              asChild
                              className="hover:bg-primary/10 transition-colors"
                            >
                              <span>
                                {uploadingFiles[cost.id] ? (
                                  <span className="flex items-center gap-1">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    <span className="text-xs">Enviando...</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Upload className="h-3 w-3" />
                                    {cost.files && cost.files.length > 0 && (
                                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                                        {cost.files.length}
                                      </Badge>
                                    )}
                                  </span>
                                )}
                              </span>
                            </Button>
                          </Label>
                          
                          {/* View files button */}
                          {cost.files && cost.files.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedCostDetails(cost);
                                setDetailsDialogOpen(true);
                              }}
                              className="hover:bg-primary/10"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(cost)}
                            title="Editar"
                            className="hover:bg-primary/10 transition-colors h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(cost.id)}
                            title="Excluir"
                            className="hover:bg-destructive/10 text-destructive transition-colors h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Category Charts */}
      <CategoryChart costs={filteredCosts} />
        </div>
      </div>
      {/* Details Dialog for viewing files */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Custo</DialogTitle>
          </DialogHeader>
          {selectedCostDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(new Date(selectedCostDetails.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{selectedCostDetails.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="font-medium">{selectedCostDetails.description}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(selectedCostDetails.amount)}
                  </p>
                </div>
              </div>
              
              {selectedCostDetails.observations && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{selectedCostDetails.observations}</p>
                </div>
              )}
              
              {selectedCostDetails.files && selectedCostDetails.files.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Arquivos Anexados</p>
                  <div className="space-y-2">
                    {selectedCostDetails.files.map((file, index) => {
                      const fileName = file.split('/').pop() || `Arquivo ${index + 1}`;
                      return (
                        <div
                          key={file}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{fileName}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFileDownload(file)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Baixar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleFileRemove(selectedCostDetails.id, file);
                                setDetailsDialogOpen(false);
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}