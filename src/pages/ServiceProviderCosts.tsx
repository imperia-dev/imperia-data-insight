import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, User, FileSpreadsheet, FileText, ArrowUpDown, Search, Upload, Paperclip, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentChart } from "@/components/serviceProviderCosts/PaymentChart";
import { exportToExcel, exportToPDF } from "@/utils/exportUtils";

interface ServiceProviderCost {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  cnpj: string | null;
  phone: string | null;
  days_worked: number | null;
  amount: number;
  pix_key: string | null;
  type: 'CLT' | 'Freelance';
  invoice_number: string | null;
  competence: string;
  status: 'Pago' | 'Não Pago' | 'Pendente';
  files?: string[];
  created_at: string;
  updated_at: string;
}

export default function ServiceProviderCosts() {
  const { user } = useAuth();
  const [costs, setCosts] = useState<ServiceProviderCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<ServiceProviderCost | null>(null);
  const { userRole } = useRoleAccess('/service-provider-costs');
  const [userName, setUserName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    cnpj: "",
    phone: "",
    days_worked: "",
    amount: "",
    pix_key: "",
    type: "Freelance" as 'CLT' | 'Freelance',
    invoice_number: "",
    competence: new Date().toISOString().slice(0, 7),
    status: "Não Pago" as 'Pago' | 'Não Pago' | 'Pendente',
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
        .from('service_provider_costs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCosts((data || []) as ServiceProviderCost[]);
    } catch (error) {
      console.error('Error fetching service provider costs:', error);
      toast.error("Erro ao carregar custos de prestadores");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const costData = {
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf || null,
        cnpj: formData.cnpj || null,
        phone: formData.phone || null,
        days_worked: formData.days_worked ? parseInt(formData.days_worked) : null,
        amount: parseFloat(formData.amount),
        pix_key: formData.pix_key || null,
        type: formData.type,
        invoice_number: formData.invoice_number || null,
        competence: formData.competence,
        status: formData.status,
      };

      if (editingCost) {
        const { error } = await supabase
          .from('service_provider_costs')
          .update(costData)
          .eq('id', editingCost.id);

        if (error) throw error;
        toast.success("Prestador atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from('service_provider_costs')
          .insert([costData]);

        if (error) throw error;
        toast.success("Prestador adicionado com sucesso");
      }

      setIsDialogOpen(false);
      setEditingCost(null);
      setFormData({
        name: "",
        email: "",
        cpf: "",
        cnpj: "",
        phone: "",
        days_worked: "",
        amount: "",
        pix_key: "",
        type: "Freelance",
        invoice_number: "",
        competence: new Date().toISOString().slice(0, 7),
        status: "Não Pago",
      });
      fetchCosts();
    } catch (error) {
      console.error('Error saving service provider cost:', error);
      toast.error("Erro ao salvar prestador");
    }
  };

  const handleEdit = (cost: ServiceProviderCost) => {
    setEditingCost(cost);
    setFormData({
      name: cost.name,
      email: cost.email,
      cpf: cost.cpf || "",
      cnpj: cost.cnpj || "",
      phone: cost.phone || "",
      days_worked: cost.days_worked?.toString() || "",
      amount: cost.amount.toString(),
      pix_key: cost.pix_key || "",
      type: cost.type,
      invoice_number: cost.invoice_number || "",
      competence: cost.competence,
      status: cost.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este prestador?")) return;

    try {
      // First, get the cost to check for files
      const cost = costs.find(c => c.id === id);
      
      // If there are files, delete them from storage
      if (cost?.files && cost.files.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('service-provider-files')
          .remove(cost.files);
        
        if (storageError) {
          console.error('Error deleting files from storage:', storageError);
        }
      }
      
      // Then delete the cost record
      const { error } = await supabase
        .from('service_provider_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Prestador excluído com sucesso");
      fetchCosts();
    } catch (error) {
      console.error('Error deleting service provider cost:', error);
      toast.error("Erro ao excluir prestador");
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
          .from('service-provider-files')
          .upload(fileName, file);
        
        if (error) throw error;
        uploadedPaths.push(data.path);
      }
      
      // Get current files for the cost
      const cost = costs.find(c => c.id === costId);
      const currentFiles = cost?.files || [];
      
      // Update the cost with new file paths
      const { error: updateError } = await supabase
        .from('service_provider_costs')
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
        .from('service-provider-files')
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
        .from('service-provider-files')
        .remove([filePath]);
      
      if (deleteError) throw deleteError;
      
      // Update cost to remove file path
      const cost = costs.find(c => c.id === costId);
      const updatedFiles = (cost?.files || []).filter(f => f !== filePath);
      
      const { error: updateError } = await supabase
        .from('service_provider_costs')
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
    let result = costs;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(cost => 
        cost.name.toLowerCase().includes(term) ||
        cost.email.toLowerCase().includes(term) ||
        cost.type.toLowerCase().includes(term) ||
        cost.competence.toLowerCase().includes(term) ||
        cost.status.toLowerCase().includes(term) ||
        (cost.cpf && cost.cpf.includes(term)) ||
        (cost.cnpj && cost.cnpj.includes(term))
      );
    }
    
    // Apply sorting
    const sorted = [...result];
    switch (sortBy) {
      case "created_desc":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "created_asc":
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "amount_asc":
        sorted.sort((a, b) => a.amount - b.amount);
        break;
      case "amount_desc":
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case "name_asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "type_asc":
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case "type_desc":
        sorted.sort((a, b) => b.type.localeCompare(a.type));
        break;
      case "status_asc":
        sorted.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "status_desc":
        sorted.sort((a, b) => b.status.localeCompare(a.status));
        break;
      case "competence_asc":
        sorted.sort((a, b) => a.competence.localeCompare(b.competence));
        break;
      case "competence_desc":
        sorted.sort((a, b) => b.competence.localeCompare(a.competence));
        break;
    }
    
    return sorted;
  }, [costs, searchTerm, sortBy]);

  const totalAmount = filteredCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const totalPaid = filteredCosts.filter(c => c.status === 'Pago').reduce((sum, cost) => sum + cost.amount, 0);
  const totalPending = filteredCosts.filter(c => c.status !== 'Pago').reduce((sum, cost) => sum + cost.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'Pendente':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'Não Pago':
        return <Badge variant="destructive">Não Pago</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleExportExcel = () => {
    const exportData = {
      title: 'Custos - Prestadores de Serviço',
      headers: ['Nome', 'Email', 'CPF/CNPJ', 'Telefone', 'Tipo', 'Dias', 'Chave PIX', 'NF', 'Competência', 'Status', 'Valor'],
      rows: filteredCosts.map(cost => [
        cost.name,
        cost.email,
        cost.cpf || cost.cnpj || '-',
        cost.phone || '-',
        cost.type,
        cost.days_worked?.toString() || '-',
        cost.pix_key || '-',
        cost.invoice_number || '-',
        cost.competence,
        cost.status,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cost.amount)
      ]),
      totals: [
        { label: 'Total Geral', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalAmount) },
        { label: 'Total Pago', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalPaid) },
        { label: 'Total Pendente', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalPending) }
      ]
    };
    exportToExcel(exportData);
  };

  const handleExportPDF = () => {
    // Prepare chart data - group by person
    const personTotals = filteredCosts.reduce((acc, cost) => {
      if (!acc[cost.name]) {
        acc[cost.name] = {
          name: cost.name,
          paid: 0,
          pending: 0,
          notPaid: 0,
          total: 0,
        };
      }
      
      const amount = cost.amount;
      acc[cost.name].total += amount;
      
      if (cost.status === 'Pago') {
        acc[cost.name].paid += amount;
      } else if (cost.status === 'Pendente') {
        acc[cost.name].pending += amount;
      } else {
        acc[cost.name].notPaid += amount;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const chartData = Object.values(personTotals)
      .map((person: any) => ({
        label: person.name,
        value: person.total,
        formattedValue: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(person.total),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 providers

    const exportData = {
      title: 'Custos - Prestadores de Serviço',
      headers: ['Nome', 'Email', 'CPF/CNPJ', 'Telefone', 'Tipo', 'Dias', 'Chave PIX', 'NF', 'Competência', 'Status', 'Valor'],
      rows: filteredCosts.map(cost => [
        cost.name,
        cost.email,
        cost.cpf || cost.cnpj || '-',
        cost.phone || '-',
        cost.type,
        cost.days_worked?.toString() || '-',
        cost.pix_key || '-',
        cost.invoice_number || '-',
        cost.competence,
        cost.status,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cost.amount)
      ]),
      totals: [
        { label: 'Total Geral', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalAmount) },
        { label: 'Total Pago', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalPaid) },
        { label: 'Total Pendente', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalPending) }
      ],
      charts: [
        {
          title: 'Top 10 Prestadores por Valor Total',
          type: 'bar' as const,
          data: chartData,
        }
      ]
    };
    exportToPDF(exportData, 'landscape');
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
          {/* Search and Sort bar */}
          <div className="flex gap-4 items-start mb-4">
            <div className="flex-1 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Buscar por nome, email, tipo, competência, status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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
                    <SelectItem value="created_desc">Data (Mais Recente)</SelectItem>
                    <SelectItem value="created_asc">Data (Mais Antiga)</SelectItem>
                    <SelectItem value="amount_asc">Valor (Menor)</SelectItem>
                    <SelectItem value="amount_desc">Valor (Maior)</SelectItem>
                    <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
                    <SelectItem value="type_asc">Tipo (A-Z)</SelectItem>
                    <SelectItem value="type_desc">Tipo (Z-A)</SelectItem>
                    <SelectItem value="status_asc">Status (A-Z)</SelectItem>
                    <SelectItem value="status_desc">Status (Z-A)</SelectItem>
                    <SelectItem value="competence_asc">Competência (A-Z)</SelectItem>
                    <SelectItem value="competence_desc">Competência (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Custos - Prestadores de Serviço</CardTitle>
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
                  name: "",
                  email: "",
                  cpf: "",
                  cnpj: "",
                  phone: "",
                  days_worked: "",
                  amount: "",
                  pix_key: "",
                  type: "Freelance",
                  invoice_number: "",
                  competence: new Date().toISOString().slice(0, 7),
                  status: "Não Pago",
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Prestador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCost ? "Editar Prestador" : "Adicionar Prestador"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'CLT' | 'Freelance') => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="Freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="days_worked">Dias Trabalhados</Label>
                    <Input
                      id="days_worked"
                      type="number"
                      value={formData.days_worked}
                      onChange={(e) => setFormData({ ...formData, days_worked: e.target.value })}
                      placeholder="0"
                    />
                  </div>
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
                <div>
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <Input
                    id="pix_key"
                    value={formData.pix_key}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    placeholder="Chave PIX"
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_number">Número NF</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="Número da nota fiscal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="competence">Competência</Label>
                    <Input
                      id="competence"
                      type="month"
                      value={formData.competence}
                      onChange={(e) => setFormData({ ...formData, competence: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'Pago' | 'Não Pago' | 'Pendente') => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Não Pago">Não Pago</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={!formData.name || !formData.email || !formData.amount || !formData.competence}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(totalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(totalPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">{new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(totalPending)}</p>
              </CardContent>
            </Card>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Arquivos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-medium">{cost.name}</TableCell>
                    <TableCell>{cost.email}</TableCell>
                    <TableCell>{cost.cpf || cost.cnpj || '-'}</TableCell>
                    <TableCell>{cost.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={cost.type === 'CLT' ? 'default' : 'secondary'}>
                        {cost.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{cost.days_worked || '-'}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{cost.pix_key || '-'}</TableCell>
                    <TableCell>{cost.invoice_number || '-'}</TableCell>
                    <TableCell>{cost.competence}</TableCell>
                    <TableCell>{getStatusBadge(cost.status)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(cost.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {/* File upload input */}
                        <div className="flex items-center gap-2">
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
                            >
                              <span>
                                {uploadingFiles[cost.id] ? (
                                  <span className="flex items-center gap-1">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    Enviando...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Upload className="h-3 w-3" />
                                    Adicionar
                                  </span>
                                )}
                              </span>
                            </Button>
                          </Label>
                        </div>
                        
                        {/* List uploaded files */}
                        {cost.files && cost.files.length > 0 && (
                          <div className="space-y-1">
                            {cost.files.map((file, index) => {
                              const fileName = file.split('/').pop() || `Arquivo ${index + 1}`;
                              return (
                                <div
                                  key={file}
                                  className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span className="flex-1 truncate max-w-[100px]" title={fileName}>
                                    {fileName}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0"
                                    onClick={() => handleFileDownload(file)}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0"
                                    onClick={() => handleFileRemove(cost.id, file)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
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

      {/* Payment Chart */}
      <PaymentChart costs={filteredCosts} />
        </div>
      </div>
    </div>
  );
}