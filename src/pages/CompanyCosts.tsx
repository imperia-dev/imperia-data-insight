import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { CompanyCostFilters } from "@/components/companyCosts/CompanyCostFilters";
import { exportToExcel, exportToPDF } from "@/utils/exportUtils";

interface CompanyCost {
  id: string;
  date: string;
  category: string;
  sub_category: string | null;
  description: string;
  observations: string | null;
  amount: number;
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
  const [costs, setCosts] = useState<CompanyCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<CompanyCost | null>(null);
  const { userRole } = useRoleAccess('/company-costs');
  const [userName, setUserName] = useState<string>("");
  const [filters, setFilters] = useState<any>({});
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

  // Filter costs based on filters
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

    return filtered;
  }, [costs, filters]);

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
    exportToPDF(exportData);
  };

  if (loading) {
          return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={userName} userRole={userRole} />
      <Sidebar userRole={userRole} />
      <div className="md:ml-64 pt-16">
        <div className="container mx-auto py-8 px-4">
          {/* Filters Component */}
          <CompanyCostFilters 
            onFiltersChange={setFilters}
            categories={categories}
            subCategories={subCategories}
          />
          
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
            <div className="mb-4 p-4 bg-muted rounded-lg flex justify-between items-center">
              <p className="text-lg font-semibold">
                Total: <span className="text-primary">{new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(totalAmount)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {filteredCosts.length} de {costs.length} registros
              </p>
            </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Sub Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>
                      {format(new Date(cost.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{cost.category}</TableCell>
                    <TableCell>{cost.sub_category || '-'}</TableCell>
                    <TableCell>{cost.description}</TableCell>
                    <TableCell>{cost.observations || '-'}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(cost.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(cost)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(cost.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}