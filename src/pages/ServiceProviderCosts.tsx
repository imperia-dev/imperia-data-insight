import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, User, FileSpreadsheet, FileText, ArrowUpDown, Search, Upload, Paperclip, Download, X, Eye, Briefcase, Calendar, CreditCard, CalendarDays, CheckCircle, DollarSign, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentChart } from "@/components/serviceProviderCosts/PaymentChart";
import { exportToExcel, exportToPDF } from "@/utils/exportUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Shield, AlertTriangle, Lock } from "lucide-react";

interface ServiceProviderCost {
  id: string;
  name: string;
  email: string;
  cpf_masked?: string | null;
  cnpj_masked?: string | null;
  phone: string | null;
  days_worked: number | null;
  amount: number;
  pix_key_masked?: string | null;
  type: 'CLT' | 'PJ';
  invoice_number: string | null;
  competence: string;
  status: 'Pago' | 'Não Pago' | 'Pendente';
  files?: string[];
  created_at: string;
  updated_at: string;
  // For edit form - will fetch real data when needed
  cpf?: string | null;
  cnpj?: string | null;
  pix_key?: string | null;
  // Cost center and chart of accounts
  cost_center_name?: string;
  cost_center_code?: string;
  chart_account_name?: string;
  chart_account_code?: string;
}

export default function ServiceProviderCosts() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
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
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCostDetails, setSelectedCostDetails] = useState<ServiceProviderCost | null>(null);
  const [isAddCostDialogOpen, setIsAddCostDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [sensitiveDataAlert, setSensitiveDataAlert] = useState(false);
  const [viewingSensitiveFor, setViewingSensitiveFor] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [quickCostData, setQuickCostData] = useState({
    days_worked: "",
    amount: "",
    competence: new Date().toISOString().slice(0, 7),
    status: "Não Pago" as 'Pago' | 'Não Pago' | 'Pendente',
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    cnpj: "",
    phone: "",
    days_worked: "",
    amount: "",
    pix_key: "",
    type: "PJ" as 'CLT' | 'PJ',
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
      // Fetch from unified expenses table with related cost center and chart of accounts
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          cost_center:cost_centers (
            code,
            name
          ),
          chart_account:chart_of_accounts (
            code,
            name
          )
        `)
        .eq('tipo_despesa', 'prestador')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map expenses to ServiceProviderCost format
      const mappedData = (data || []).map(expense => ({
        id: expense.id,
        name: expense.description?.replace('Pagamento para ', '') || 'Prestador',
        email: expense.email || '',
        cpf_masked: expense.cpf ? '***.***.***-' + expense.cpf.slice(-2) : null,
        cnpj_masked: expense.cnpj ? '**.***.***/****-' + expense.cnpj.slice(-2) : null,
        phone: expense.phone,
        days_worked: expense.days_worked,
        amount: expense.amount_base || expense.amount_original,
        pix_key_masked: expense.pix_key ? expense.pix_key.slice(0, 3) + '***' + expense.pix_key.slice(-2) : null,
        type: expense.tipo_fornecedor as 'CLT' | 'PJ' || 'PJ',
        invoice_number: expense.invoice_number,
        competence: expense.competence || expense.data_competencia,
        status: expense.status === 'pago' ? 'Pago' : 'Não Pago',
        files: expense.files || [],
        created_at: expense.created_at,
        updated_at: expense.updated_at,
        cpf: expense.cpf,
        cnpj: expense.cnpj,
        pix_key: expense.pix_key,
        // Add cost center and chart of accounts info
        cost_center_name: expense.cost_center?.name || 'OPR - Operacional',
        cost_center_code: expense.cost_center?.code || 'OPR',
        chart_account_name: expense.chart_account?.name || 'Custos de Tradução - Prestadores',
        chart_account_code: expense.chart_account?.code || '4.01',
      }));
      
      setCosts(mappedData as ServiceProviderCost[]);
    } catch (error) {
      console.error('Error fetching service provider costs:', error);
      toast.error("Erro ao carregar custos de prestadores");
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch sensitive data for a specific provider (for editing)
  const fetchSensitiveData = async (costId: string): Promise<{ cpf: string | null; cnpj: string | null; pix_key: string | null } | null> => {
    try {
      // Log the access attempt
      await supabase.rpc('log_sensitive_data_access', {
        p_table_name: 'service_provider_costs',
        p_operation: 'view_sensitive',
        p_record_id: costId,
        p_fields: ['cpf', 'cnpj', 'pix_key']
      });

      // Fetch the actual sensitive data
      const { data, error } = await supabase.rpc('get_service_provider_sensitive_data', {
        p_id: costId
      });

      if (error) {
        if (error.message?.includes('Rate limit exceeded')) {
          toast.error("Limite de acesso excedido. Tente novamente mais tarde.");
        } else if (error.message?.includes('Unauthorized')) {
          toast.error("Você não tem permissão para acessar dados sensíveis.");
        } else {
          throw error;
        }
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching sensitive data:', error);
      toast.error("Erro ao carregar dados sensíveis");
      return null;
    }
  };

  const handleSubmit = async () => {
    try {
      // Verificar se a despesa está vinculada a um protocolo fechado
      if (editingCost) {
        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .select('closing_protocol_id, service_provider_protocol_id')
          .eq('id', editingCost.id)
          .maybeSingle();

        if (expenseError) throw expenseError;

        // Verificar se existe protocolo de fechamento fechado
        if (expense?.closing_protocol_id) {
          const { data: closingProtocol } = await supabase
            .from('expense_closing_protocols')
            .select('status')
            .eq('id', expense.closing_protocol_id)
            .maybeSingle();

          if (closingProtocol?.status === 'closed') {
            toast.error("Esta despesa faz parte de um protocolo fechado e não pode ser modificada");
            return;
          }
        }

        // Verificar se existe protocolo de prestador fechado
        if (expense?.service_provider_protocol_id) {
          const { data: providerProtocol } = await supabase
            .from('service_provider_protocols')
            .select('paid_at')
            .eq('id', expense.service_provider_protocol_id)
            .maybeSingle();

          if (providerProtocol?.paid_at) {
            toast.error("Esta despesa faz parte de um protocolo já pago e não pode ser modificada");
            return;
          }
        }
      }

      // Buscar o plano de contas 4.01 para prestadores de serviço
      const { data: chartOfAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('code', '4.01')
        .maybeSingle();

      // Buscar o centro de custo OPR
      const { data: costCenter } = await supabase
        .from('cost_centers')
        .select('id')
        .eq('code', 'OPR')
        .maybeSingle();

      const expenseData = {
        tipo_lancamento: 'prestador_servico' as const,
        tipo_despesa: 'prestador',
        conta_contabil_id: chartOfAccount?.id || null,
        centro_custo_id: costCenter?.id || null,
        data_competencia: formData.competence ? formData.competence + '-01' : new Date().toISOString().split('T')[0],
        amount_original: parseFloat(formData.amount),
        currency: 'BRL',
        exchange_rate: 1,
        description: 'Pagamento para ' + formData.name,
        email: formData.email,
        cpf: formData.cpf || null,
        cnpj: formData.cnpj || null,
        phone: formData.phone || null,
        pix_key: formData.pix_key || null,
        days_worked: formData.days_worked ? parseInt(formData.days_worked) : null,
        tipo_fornecedor: formData.type,
        invoice_number: formData.invoice_number || null,
        competence: formData.competence,
        status: (formData.status === 'Pago' ? 'pago' : 'lancado') as 'pago' | 'lancado',
      };

      if (editingCost) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingCost.id);

        if (error) throw error;
        toast.success("Prestador atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (error) throw error;
        toast.success("Prestador adicionado | Classificação: 4.01 - Custos de Tradução | Centro: OPR - Operacional");
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
        type: "PJ",
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

  const handleQuickAddCost = async () => {
    try {
      if (!selectedProvider) {
        toast.error("Selecione um prestador");
        return;
      }

      // Find the selected provider's details
      const provider = uniqueProviders.find(p => p.name === selectedProvider);
      if (!provider) {
        toast.error("Prestador não encontrado");
        return;
      }

      const costData = {
        name: provider.name,
        email: provider.email,
        cpf: provider.cpf || null,
        cnpj: provider.cnpj || null,
        phone: provider.phone || null,
        days_worked: quickCostData.days_worked ? parseInt(quickCostData.days_worked) : null,
        amount: parseFloat(quickCostData.amount),
        pix_key: provider.pix_key || null,
        type: provider.type,
        invoice_number: null,
        competence: quickCostData.competence,
        status: quickCostData.status,
      };

      // Buscar o plano de contas 4.01 para prestadores de serviço  
      const { data: chartOfAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('code', '4.01')
        .maybeSingle();

      // Buscar o centro de custo OPR
      const { data: costCenter } = await supabase
        .from('cost_centers')
        .select('id')
        .eq('code', 'OPR')
        .maybeSingle();

      const expenseData = {
        tipo_lancamento: 'prestador_servico' as const,
        tipo_despesa: 'prestador',
        conta_contabil_id: chartOfAccount?.id || null,
        centro_custo_id: costCenter?.id || null,
        data_competencia: costData.competence ? costData.competence + '-01' : new Date().toISOString().split('T')[0],
        amount_original: costData.amount,
        currency: 'BRL',
        exchange_rate: 1,
        description: 'Pagamento para ' + costData.name,
        email: costData.email,
        cpf: costData.cpf,
        cnpj: costData.cnpj,
        phone: costData.phone,
        pix_key: costData.pix_key,
        days_worked: costData.days_worked,
        tipo_fornecedor: costData.type,
        invoice_number: costData.invoice_number,
        competence: costData.competence,
        status: (costData.status === 'Pago' ? 'pago' : 'lancado') as 'pago' | 'lancado',
      };

      const { error } = await supabase
        .from('expenses')
        .insert([expenseData]);

      if (error) throw error;
      
      toast.success("Custo adicionado | Classificação: 4.01 - Custos de Tradução | Centro: OPR - Operacional");
      setIsAddCostDialogOpen(false);
      setSelectedProvider("");
      setQuickCostData({
        days_worked: "",
        amount: "",
        competence: new Date().toISOString().slice(0, 7),
        status: "Não Pago",
      });
      fetchCosts();
    } catch (error) {
      console.error('Error adding quick cost:', error);
      toast.error("Erro ao adicionar custo");
    }
  };

  const handleEdit = async (cost: ServiceProviderCost) => {
    // Show alert before accessing sensitive data
    setSensitiveDataAlert(true);
    setViewingSensitiveFor(cost.id);
  };

  const confirmEditWithSensitiveData = async () => {
    if (!viewingSensitiveFor) return;
    
    const cost = costs.find(c => c.id === viewingSensitiveFor);
    if (!cost) return;

    setSensitiveDataAlert(false);
    
    // Fetch sensitive data for editing
    const sensitiveData = await fetchSensitiveData(viewingSensitiveFor);
    
    setEditingCost(cost);
    setFormData({
      name: cost.name,
      email: cost.email,
      cpf: sensitiveData?.cpf || "",
      cnpj: sensitiveData?.cnpj || "",
      phone: cost.phone || "",
      days_worked: cost.days_worked?.toString() || "",
      amount: cost.amount.toString(),
      pix_key: sensitiveData?.pix_key || "",
      type: cost.type,
      invoice_number: cost.invoice_number || "",
      competence: cost.competence,
      status: cost.status,
    });
    setIsDialogOpen(true);
    setViewingSensitiveFor(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      // First, get the cost to check for files
      const cost = costs.find(c => c.id === deleteConfirmId);
      
      // If there are files, delete them from storage
      if (cost?.files && cost.files.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('service-provider-files')
          .remove(cost.files);
        
        if (storageError) {
          console.error('Error deleting files from storage:', storageError);
          toast.error("Erro ao excluir arquivos do prestador");
          setDeleteConfirmId(null);
          return;
        }
      }
      
      // Then delete the cost record from expenses table
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', deleteConfirmId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      toast.success("Prestador excluído com sucesso");
      setDeleteConfirmId(null);
      fetchCosts();
    } catch (error: any) {
      console.error('Error deleting service provider cost:', error);
      toast.error(error?.message || "Erro ao excluir prestador");
      setDeleteConfirmId(null);
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
        .from('expenses')
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
        .from('expenses')
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

  // Get unique providers for the dropdown
  const uniqueProviders = useMemo(() => {
    const providersMap = new Map<string, ServiceProviderCost>();
    costs.forEach(cost => {
      if (!providersMap.has(cost.name)) {
        providersMap.set(cost.name, cost);
      }
    });
    return Array.from(providersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [costs]);

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
        cost.cpf_masked || cost.cnpj_masked || '-',
        cost.phone || '-',
        cost.type,
        cost.days_worked?.toString() || '-',
        cost.pix_key_masked || '-',
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

    // Group costs by status for pie chart
    const statusData = [
      {
        label: 'Pago',
        value: filteredCosts.filter(c => c.status === 'Pago').reduce((sum, c) => sum + c.amount, 0),
        formattedValue: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(filteredCosts.filter(c => c.status === 'Pago').reduce((sum, c) => sum + c.amount, 0)),
      },
      {
        label: 'Não Pago',
        value: filteredCosts.filter(c => c.status === 'Não Pago').reduce((sum, c) => sum + c.amount, 0),
        formattedValue: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(filteredCosts.filter(c => c.status === 'Não Pago').reduce((sum, c) => sum + c.amount, 0)),
      },
      {
        label: 'Pendente',
        value: filteredCosts.filter(c => c.status === 'Pendente').reduce((sum, c) => sum + c.amount, 0),
        formattedValue: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(filteredCosts.filter(c => c.status === 'Pendente').reduce((sum, c) => sum + c.amount, 0)),
      },
    ].filter(item => item.value > 0);

    const exportData = {
      title: 'Custos - Prestadores de Serviço',
      headers: ['Nome', 'Tipo', 'Dias', 'Chave PIX', 'NF', 'Competência', 'Status', 'Valor'],
      rows: filteredCosts.map(cost => [
        cost.name,
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
        },
        {
          title: 'Distribuição por Status',
          type: 'pie' as const,
          data: statusData,
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
      <div className={`${mainContainerClass} pt-16`}>
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
          
      {/* Security Notice Banner */}
      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              Proteção de Dados Sensíveis Ativada
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              CPF, CNPJ e Chaves PIX estão protegidos e mascarados para sua segurança. 
              Apenas proprietários podem visualizar dados completos ao editar registros. 
              Todos os acessos são monitorados e registrados.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Custos - Prestadores de Serviço</CardTitle>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">Plano de Contas:</span>
                  <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30">
                    4.01 - Custos de Tradução
                  </Badge>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">Centro de Custo:</span>
                  <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30">
                    OPR - Operacional
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Classificação automática aplicada</span>
                </div>
              </div>
            </div>
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
              
              {/* Quick Add Cost Dialog */}
              <Dialog open={isAddCostDialogOpen} onOpenChange={setIsAddCostDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Custo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Custo Rápido</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="provider">Prestador</Label>
                      <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um prestador" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueProviders.map((provider) => (
                            <SelectItem key={provider.id} value={provider.name}>
                              {provider.name} ({provider.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="quick-days">Dias Trabalhados</Label>
                      <Input
                        id="quick-days"
                        type="number"
                        value={quickCostData.days_worked}
                        onChange={(e) => setQuickCostData({ ...quickCostData, days_worked: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="quick-competence">Competência</Label>
                      <Input
                        id="quick-competence"
                        type="month"
                        value={quickCostData.competence}
                        onChange={(e) => setQuickCostData({ ...quickCostData, competence: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="quick-status">Status</Label>
                      <Select
                        value={quickCostData.status}
                        onValueChange={(value: 'Pago' | 'Não Pago' | 'Pendente') => 
                          setQuickCostData({ ...quickCostData, status: value })
                        }
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
                    
                    <div>
                      <Label htmlFor="quick-amount">Valor (R$)</Label>
                      <Input
                        id="quick-amount"
                        type="number"
                        step="0.01"
                        value={quickCostData.amount}
                        onChange={(e) => setQuickCostData({ ...quickCostData, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleQuickAddCost} 
                      className="w-full"
                      disabled={!selectedProvider || !quickCostData.amount || !quickCostData.competence}
                    >
                      Adicionar Custo
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Original Add Provider Dialog */}
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
                  type: "PJ",
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
                {/* Informações de classificação contábil - Read-only */}
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <h4 className="text-sm font-semibold mb-3">Classificação Contábil (Automática)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="font-medium">
                          <Briefcase className="h-3 w-3 mr-1" />
                          OPR - Operacional
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Plano de Contas</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="font-medium">
                          <FileText className="h-3 w-3 mr-1" />
                          4.01 - Custos de Tradução
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Todos os prestadores de serviço são automaticamente classificados neste centro de custo e plano de contas.
                  </p>
                </div>
                
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
                      onValueChange={(value: 'CLT' | 'PJ') => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
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
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(totalAmount)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Pago</p>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(totalPaid)}
                </p>
                <div className="mt-2 h-1.5 bg-green-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Pendente</p>
                  <CalendarDays className="h-4 w-4 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-yellow-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(totalPending)}
                </p>
                <div className="mt-2 h-1.5 bg-yellow-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalAmount > 0 ? (totalPending / totalAmount) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/50 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40 transition-colors">
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Nome
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Tipo
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Dias
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Chave PIX
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      Competência
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Centro de Custo
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Plano de Contas
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      Status
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
                      <FileText className="h-4 w-4 text-muted-foreground" />
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
                    <TableCell colSpan={11} className="h-32 text-center">
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
                            <span className="text-xs font-semibold text-primary">
                              {cost.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{cost.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={cost.type === 'CLT' ? 'default' : 'secondary'}
                          className="font-medium shadow-sm"
                        >
                          {cost.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {cost.days_worked || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          <span title="Dados sensíveis protegidos">{cost.pix_key_masked || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-muted-foreground" />
                          <span>{cost.competence}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {cost.cost_center_code || 'OPR'} - {cost.cost_center_name || 'Operacional'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {cost.chart_account_code || '4.01'} - {cost.chart_account_name?.substring(0, 20) || 'Custos de Tradução'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(cost.status)}</TableCell>
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
                              title="Ver arquivos"
                              className="hover:bg-primary/10 transition-colors"
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
                            onClick={() => {
                              setSelectedCostDetails(cost);
                              setDetailsDialogOpen(true);
                            }}
                            title="Ver detalhes"
                            className="hover:bg-primary/10 transition-colors h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                            onClick={() => setDeleteConfirmId(cost.id)}
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

      {/* Payment Chart */}
      <PaymentChart costs={filteredCosts} />

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Prestador</DialogTitle>
          </DialogHeader>
          {selectedCostDetails && (
            <div className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Nome</Label>
                    <p className="font-medium">{selectedCostDetails.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedCostDetails.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      <Lock className="h-3 w-3 inline mr-1" />
                      CPF (Protegido)
                    </Label>
                    <p className="font-medium text-muted-foreground">{selectedCostDetails.cpf_masked || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      <Lock className="h-3 w-3 inline mr-1" />
                      CNPJ (Protegido)
                    </Label>
                    <p className="font-medium text-muted-foreground">{selectedCostDetails.cnpj_masked || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedCostDetails.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Tipo</Label>
                    <Badge variant={selectedCostDetails.type === 'CLT' ? 'default' : 'secondary'}>
                      {selectedCostDetails.type}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Dias Trabalhados</Label>
                    <p className="font-medium">{selectedCostDetails.days_worked || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      <Lock className="h-3 w-3 inline mr-1" />
                      Chave PIX (Protegida)
                    </Label>
                    <p className="font-medium text-muted-foreground">{selectedCostDetails.pix_key_masked || '-'}</p>
                  </div>
                </div>

                {/* Cost Center and Chart of Accounts Information */}
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <h4 className="text-sm font-semibold mb-3">Classificação Contábil</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="font-medium">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {selectedCostDetails.cost_center_code || 'OPR'} - {selectedCostDetails.cost_center_name || 'Operacional'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Plano de Contas</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="font-medium">
                          <FileText className="h-3 w-3 mr-1" />
                          {selectedCostDetails.chart_account_code || '4.01'} - {selectedCostDetails.chart_account_name || 'Custos de Tradução'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Número NF</Label>
                    <p className="font-medium break-all">{selectedCostDetails.invoice_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Competência</Label>
                    <p className="font-medium">{selectedCostDetails.competence}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <Badge variant={selectedCostDetails.status === 'Pago' ? 'default' : 'destructive'}>
                      {selectedCostDetails.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Valor</Label>
                    <p className="font-medium text-lg">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(selectedCostDetails.amount)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Files section */}
              {selectedCostDetails.files && selectedCostDetails.files.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Arquivos Anexados</Label>
                  <div className="space-y-2 mt-2">
                    {selectedCostDetails.files.map((file, index) => {
                      const fileName = file.split('/').pop() || `Arquivo ${index + 1}`;
                      return (
                        <div
                          key={file}
                          className="flex items-center gap-2 p-2 bg-muted rounded"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span className="flex-1 truncate" title={fileName}>
                            {fileName}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFileDownload(file)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Baixar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              handleFileRemove(selectedCostDetails.id, file);
                              // Update the selected details to reflect the change
                              setSelectedCostDetails({
                                ...selectedCostDetails,
                                files: selectedCostDetails.files?.filter(f => f !== file)
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDetailsDialogOpen(false)}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    handleEdit(selectedCostDetails);
                    setDetailsDialogOpen(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Sensitive Data Access */}
      <AlertDialog open={sensitiveDataAlert} onOpenChange={setSensitiveDataAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              Acesso a Dados Sensíveis
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-semibold">Atenção: Esta ação será registrada</p>
                    <p className="text-sm mt-1">
                      Você está prestes a acessar dados sensíveis protegidos (CPF, CNPJ, Chave PIX). 
                      Este acesso será registrado em nosso sistema de auditoria para fins de segurança e conformidade.
                    </p>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium mb-2">Informações de Segurança:</p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Todos os acessos são monitorados e registrados</li>
                    <li>• Limite de 100 acessos por hora</li>
                    <li>• Dados são mascarados por padrão para proteção</li>
                    <li>• Apenas proprietários podem visualizar dados completos</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Deseja continuar e acessar os dados sensíveis para edição?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmEditWithSensitiveData}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Shield className="h-4 w-4 mr-2" />
              Acessar Dados Protegidos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este prestador? Esta ação não pode ser desfeita e todos os arquivos associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </div>
    </div>
  );
}