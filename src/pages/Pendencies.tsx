import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";
import { ChevronsUpDown, Check, AlertCircle, ChevronLeft, ChevronRight, Save, CheckCircle, CalendarIcon, Paperclip, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PendencyFilters } from "@/components/pendencies/PendencyFilters";
import { PendencyViewDialog } from "@/components/pendencies/PendencyViewDialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


export default function Pendencies() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const { toast } = useToast();
  const { userRole, loading: roleLoading } = useUserRole();
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Form states
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [c4uId, setC4uId] = useState("");
  const [description, setDescription] = useState("");
  const [oldOrderId, setOldOrderId] = useState("");
  const [errorType, setErrorType] = useState("");
  const [errorDocumentCount, setErrorDocumentCount] = useState("");
  const [isOldOrder, setIsOldOrder] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | undefined>(undefined);
  const [customer, setCustomer] = useState("Cidadania4y");
  
  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [pendencies, setPendencies] = useState<any[]>([]);
  const [filteredPendencies, setFilteredPendencies] = useState<any[]>([]);
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [openOrderSearch, setOpenOrderSearch] = useState(false);
  const [orderSearchValue, setOrderSearchValue] = useState("");
  const [editingTreatment, setEditingTreatment] = useState<{ [key: string]: string }>({});
  const [editingPendency, setEditingPendency] = useState<any | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [filters, setFilters] = useState<any>(null);
  const [viewingPendency, setViewingPendency] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const errorTypes = [
    { value: "nao_e_erro", label: "Não é erro" },
    { value: "falta_de_dados", label: "Falta de dados" },
    { value: "apostila", label: "Apostila" },
    { value: "erro_em_data", label: "Erro em data" },
    { value: "nome_separado", label: "Nome separado" },
    { value: "texto_sem_traduzir", label: "Texto sem traduzir" },
    { value: "nome_incorreto", label: "Nome incorreto" },
    { value: "texto_duplicado", label: "Texto duplicado" },
    { value: "erro_em_crc", label: "Erro em CRC" },
    { value: "nome_traduzido", label: "Nome traduzido" },
    { value: "falta_parte_documento", label: "Falta parte do documento" },
    { value: "erro_digitacao", label: "Erro de digitação" },
    { value: "sem_assinatura_tradutor", label: "Sem assinatura do tradutor" },
    { value: "nome_junto", label: "Nome junto" },
    { value: "traducao_incompleta", label: "Tradução incompleta" },
    { value: "titulo_incorreto", label: "Título incorreto" },
    { value: "trecho_sem_traduzir", label: "Trecho sem traduzir" },
    { value: "matricula_incorreta", label: "Matrícula incorreta" },
    { value: "espacamento", label: "Espaçamento" },
    { value: "sem_cabecalho", label: "Sem cabeçalho" },
    { value: "solicitacao_cliente", label: "Solicitação do Cliente" },
  ];

  useEffect(() => {
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

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    fetchOrders();
    fetchPendencies();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos.",
        variant: "destructive",
      });
    }
  };

  const fetchPendencies = async () => {
    try {
      // Fetch from both tables in parallel
      const [regularPendencies, customerRequests] = await Promise.all([
        supabase
          .from('pendencies')
          .select(`
            *,
            orders(order_number)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('customer_pendency_requests')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (regularPendencies.error) throw regularPendencies.error;
      if (customerRequests.error) throw customerRequests.error;

      // Map customer requests to match pendencies structure
      const mappedCustomerRequests = (customerRequests.data || []).map((request: any) => ({
        id: request.id,
        order_id: request.order_id,
        c4u_id: request.order_id, // Use order_id as c4u_id
        description: request.description,
        error_type: 'solicitacao_cliente', // Special type for customer requests
        error_document_count: 0,
        customer: request.customer_name || 'Cliente',
        treatment: request.internal_notes || '',
        status: request.status === 'approved' ? 'resolved' : 
                request.status === 'rejected' ? 'resolved' : 'pending',
        created_at: request.created_at,
        created_by: request.created_by,
        attachments: request.attachments || [],
        // Mark as customer request for identification
        source: 'customer_request',
        priority: request.priority,
        orders: null, // No join for customer requests
      }));

      // Combine both arrays
      const allPendencies = [
        ...(regularPendencies.data || []).map((p: any) => ({ ...p, source: 'internal' })),
        ...mappedCustomerRequests
      ];

      // Sort by created_at
      allPendencies.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPendencies(allPendencies);
      setFilteredPendencies(allPendencies);
      
      // Extract unique client names
      const clientsSet = new Set<string>();
      allPendencies.forEach((p: any) => {
        const clientName = p.orders?.client_name || p.customer;
        if (clientName) {
          clientsSet.add(clientName);
        }
      });
      setAvailableClients(Array.from(clientsSet).sort());
    } catch (error) {
      console.error('Error fetching pendencies:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as pendências.",
        variant: "destructive",
      });
    }
  };

  const handleApplyFilters = (appliedFilters: any) => {
    setFilters(appliedFilters);
    
    let filtered = [...pendencies];

    // Filter by status
    if (appliedFilters.status && appliedFilters.status !== 'all') {
      filtered = filtered.filter(p => p.status === appliedFilters.status);
    }

    // Filter by error type
    if (appliedFilters.errorType && appliedFilters.errorType !== 'all') {
      filtered = filtered.filter(p => p.error_type === appliedFilters.errorType);
    }

    // Filter by order number
    if (appliedFilters.orderNumber) {
      filtered = filtered.filter(p => 
        p.orders?.order_number?.toLowerCase().includes(appliedFilters.orderNumber.toLowerCase())
      );
    }

    // Filter by C4U ID
    if (appliedFilters.c4uId) {
      filtered = filtered.filter(p => 
        p.c4u_id?.toLowerCase().includes(appliedFilters.c4uId.toLowerCase())
      );
    }

    // Filter by client name
    if (appliedFilters.clientName && appliedFilters.clientName !== 'all') {
      filtered = filtered.filter(p => 
        (p.orders?.client_name === appliedFilters.clientName) ||
        (p.customer === appliedFilters.clientName)
      );
    }

    // Filter by date range
    if (appliedFilters.startDate) {
      filtered = filtered.filter(p => 
        new Date(p.created_at) >= appliedFilters.startDate
      );
    }
    if (appliedFilters.endDate) {
      const endOfDay = new Date(appliedFilters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => 
        new Date(p.created_at) <= endOfDay
      );
    }

    setFilteredPendencies(filtered);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters(null);
    setFilteredPendencies(pendencies);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (
      (!isOldOrder && !selectedOrderId) ||
      (isOldOrder && !oldOrderId) || // oldOrderId is required if isOldOrder is true
      !c4uId ||
      !description ||
      !errorType ||
      !errorDocumentCount
    ) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const insertData: any = {
        order_id: isOldOrder ? null : selectedOrderId, // Set order_id to NULL if it's an old order
        old_order_text_id: isOldOrder ? oldOrderId : null, // Save oldOrderId in the new column
        c4u_id: c4uId,
        description,
        error_type: errorType,
        error_document_count: parseInt(errorDocumentCount),
        customer,
        created_by: user?.id,
      };

      // If a custom creation date is selected, add it to the insert data
      if (createdAt) {
        insertData.created_at = createdAt.toISOString();
      }

      const { error } = await supabase.from('pendencies').insert(insertData);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pendência registrada com sucesso.",
      });

      // Reset form
      setSelectedOrderId("");
      setC4uId("");
      setDescription("");
      setErrorType("");
      setErrorDocumentCount("");
      setIsOldOrder(false); // Reset isOldOrder
      setOldOrderId(""); // Reset oldOrderId
      setCreatedAt(undefined); // Reset creation date
      setCustomer("Cidadania4y"); // Reset customer
      
      // Refresh data
      fetchPendencies();
    } catch (error) {
      console.error('Error creating pendency:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a pendência.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePendency = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pendencies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pendência removida com sucesso.",
      });

      fetchPendencies();
    } catch (error) {
      console.error('Error deleting pendency:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a pendência.",
        variant: "destructive",
      });
    }
  };

  const handleSaveTreatment = async (pendencyId: string) => {
    const treatment = editingTreatment[pendencyId];
    
    if (!treatment || treatment.trim() === '') {
      toast({
        title: "Erro",
        description: "Por favor, insira uma tratativa.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the pendency to check its source
      const pendency = pendencies.find(p => p.id === pendencyId);
      
      if (!pendency) {
        throw new Error('Pendência não encontrada');
      }

      // Save to the correct table based on source
      const { error } = pendency.source === 'customer_request'
        ? await supabase
            .from('customer_pendency_requests')
            .update({ internal_notes: treatment })
            .eq('id', pendencyId)
        : await supabase
            .from('pendencies')
            .update({ treatment })
            .eq('id', pendencyId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tratativa salva com sucesso.",
      });

      // Clear the editing state for this pendency
      setEditingTreatment(prev => {
        const newState = { ...prev };
        delete newState[pendencyId];
        return newState;
      });

      fetchPendencies();
    } catch (error) {
      console.error('Error saving treatment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a tratativa.",
        variant: "destructive",
      });
    }
  };

  const handleResolve = async (pendencyId: string) => {
    try {
      // Busca a pendência para verificar a origem
      const pendency = pendencies.find(p => p.id === pendencyId);
      
      if (!pendency) {
        throw new Error('Pendência não encontrada');
      }

      // Determina a tabela correta baseada na origem
      const tableName = pendency.source === 'customer_request' 
        ? 'customer_pendency_requests' 
        : 'pendencies';

      const { error } = await supabase
        .from(tableName)
        .update({ status: 'resolved' })
        .eq('id', pendencyId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pendência marcada como resolvida.",
      });

      fetchPendencies();
    } catch (error) {
      console.error('Error resolving pendency:', error);
      toast({
        title: "Erro",
        description: "Não foi possível resolver a pendência.",
        variant: "destructive",
      });
    }
  };

  const handleEditPendency = (pendency: any) => {
    setEditingPendency({
      ...pendency,
      order_id: pendency.order_id || '',
      old_order_text_id: pendency.old_order_text_id || '',
      created_at: pendency.created_at,
    });
    setEditModalOpen(true);
  };

  const handleUpdatePendency = async () => {
    if (!editingPendency) return;

    try {
      // Determine the correct table based on source
      const tableName = editingPendency.source === 'customer_request' 
        ? 'customer_pendency_requests' 
        : 'pendencies';

      const updateData: any = {
        c4u_id: editingPendency.c4u_id,
        description: editingPendency.description,
        error_type: editingPendency.error_type,
        error_document_count: editingPendency.error_document_count,
        customer: editingPendency.customer,
      };

      // For customer requests, update internal_notes instead of treatment
      if (editingPendency.source === 'customer_request') {
        updateData.internal_notes = editingPendency.treatment;
      } else {
        updateData.treatment = editingPendency.treatment;
      }

      // If created_at was edited, update it
      if (editingPendency.created_at) {
        updateData.created_at = editingPendency.created_at;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', editingPendency.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pendência atualizada com sucesso.",
      });

      setEditModalOpen(false);
      setEditingPendency(null);
      fetchPendencies();
    } catch (error) {
      logger.error('Error updating pendency:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a pendência.",
        variant: "destructive",
      });
    }
  };


  const getErrorTypeLabel = (value: string) => {
    const type = errorTypes.find(t => t.value === value);
    return type?.label || value;
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    };

    return (
      <span className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
      )}>
        {status === 'pending' ? 'Pendente' : status === 'resolved' ? 'Resolvido' : 'Em Andamento'}
      </span>
    );
  };

  // Calculate pagination
  const totalPages = Math.ceil((filteredPendencies?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPendencies = filteredPendencies?.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageSelect = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-foreground">
              Pendências
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as pendências e erros dos pedidos
            </p>
          </div>

          {/* Filters */}
          <PendencyFilters 
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            clients={availableClients}
          />

          {/* Form Card */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Registrar Nova Pendência
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order Search */}
                <div className="space-y-2">
                  <Label htmlFor="order">Pedido</Label>
                  <Popover open={openOrderSearch} onOpenChange={setOpenOrderSearch}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openOrderSearch}
                        className={cn("w-full justify-between", isOldOrder && "bg-gray-100 text-gray-500")}
                        disabled={isOldOrder}
                      >
                        {selectedOrderId
                          ? orders.find((order) => order.id === selectedOrderId)?.order_number
                          : "Selecione um pedido..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar pedido..." 
                          value={orderSearchValue}
                          onValueChange={setOrderSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum pedido encontrado.</CommandEmpty>
                          <CommandGroup>
                            {orders.map((order) => (
                              <CommandItem
                                key={order.id}
                                value={order.order_number}
                                onSelect={() => {
                                  setSelectedOrderId(order.id);
                                  setOpenOrderSearch(false);
                                  setOrderSearchValue("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedOrderId === order.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {order.order_number}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="old-order"
                    checked={isOldOrder}
                    onCheckedChange={(checked) => {
                      setIsOldOrder(checked as boolean);
                      if (checked) {
                        setSelectedOrderId(""); // Clear selected order when "old order" is checked
                      }
                    }}
                  />
                  <Label htmlFor="old-order">Pedido Antigo</Label>
                </div>

                {isOldOrder && (
                  <div className="space-y-2">
                    <Label htmlFor="old_order_id">ID do Pedido Antigo</Label>
                    <Input
                      id="old_order_id"
                      value={oldOrderId}
                      onChange={(e) => setOldOrderId(e.target.value)}
                      placeholder="Ex: a1b2c3d4-e5f6-7890-1234-567890abcdef"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Insira o ID (UUID) do pedido antigo, se aplicável.
                    </p>
                  </div>
                )}

                {/* C4U ID */}
                <div className="space-y-2">
                  <Label htmlFor="c4u_id">ID C4U</Label>
                  <Input
                    id="c4u_id"
                    value={c4uId}
                    onChange={(e) => setC4uId(e.target.value)}
                    placeholder="Digite o ID C4U"
                    required={!isOldOrder} // C4U ID is required unless it's an old order
                  />
                </div>

                {/* Error Type */}
                <div className="space-y-2">
                  <Label htmlFor="error_type">Tipo de Erro</Label>
                  <Select value={errorType} onValueChange={setErrorType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de erro" />
                    </SelectTrigger>
                    <SelectContent>
                      {errorTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Document Count */}
                <div className="space-y-2">
                  <Label htmlFor="document_count">Quantidade de Documentos com Erro</Label>
                  <Input
                    id="document_count"
                    type="number"
                    value={errorDocumentCount}
                    onChange={(e) => setErrorDocumentCount(e.target.value)}
                    placeholder="Digite a quantidade"
                    min="1"
                  />
                </div>

                {/* Customer */}
                <div className="space-y-2">
                  <Label htmlFor="customer">Cliente</Label>
                  <Select value={customer} onValueChange={setCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cidadania4y">Cidadania4y</SelectItem>
                      <SelectItem value="Yellowling">Yellowling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Creation Date */}
                <div className="space-y-2">
                  <Label htmlFor="created_at">Data de Criação (Opcional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !createdAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {createdAt ? format(createdAt, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecionar data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={createdAt}
                        onSelect={setCreatedAt}
                        initialFocus
                        className="p-3 pointer-events-auto"
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Se não selecionada, a data atual será usada
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva a pendência..."
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? "Registrando..." : "Registrar Pendência"}
              </Button>
            </form>
          </Card>


          {/* Pendencies Table */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Pendências Registradas</h2>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>ID C4U</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo de Erro</TableHead>
                    <TableHead>Qtd. Documentos</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Anexos</TableHead>
                    <TableHead>Tratativa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredPendencies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground">
                        Nenhuma pendência registrada
                      </TableCell>
                    </TableRow>
                   ) : (
                    paginatedPendencies.map((pendency) => (
                       <TableRow key={pendency.id} className={pendency.source === 'customer_request' ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                         <TableCell className="font-medium">
                           {pendency.orders?.order_number || pendency.old_order_text_id || pendency.order_id || '-'}
                         </TableCell>
                         <TableCell>{pendency.c4u_id}</TableCell>
                         <TableCell>
                           {pendency.customer || 'Cidadania4y'}
                           {pendency.source === 'customer_request' && (
                             <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Cliente</span>
                           )}
                         </TableCell>
                         <TableCell>{getErrorTypeLabel(pendency.error_type)}</TableCell>
                         <TableCell>{pendency.error_document_count || '-'}</TableCell>
                         <TableCell className="max-w-xs truncate">
                           {pendency.description}
                         </TableCell>
                         <TableCell>
                           {pendency.attachments && Array.isArray(pendency.attachments) && pendency.attachments.length > 0 ? (
                             <div className="flex flex-col gap-1">
                               {pendency.attachments.map((file: any, index: number) => (
                                 <a
                                   key={index}
                                   href={file.url}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="flex items-center gap-1 text-xs text-primary hover:underline"
                                 >
                                   <Paperclip className="h-3 w-3" />
                                   <span className="truncate max-w-[150px]">{file.name}</span>
                                 </a>
                               ))}
                             </div>
                           ) : (
                             <span className="text-xs text-muted-foreground">-</span>
                           )}
                         </TableCell>
                         <TableCell>
                          {pendency.treatment ? (
                            <span className="text-sm font-medium">{pendency.treatment}</span>
                          ) : (
                            (userRole === 'owner' || userRole === 'master') ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Inserir tratativa..."
                                  value={editingTreatment[pendency.id] || ''}
                                  onChange={(e) => setEditingTreatment(prev => ({
                                    ...prev,
                                    [pendency.id]: e.target.value
                                  }))}
                                  className="w-40"
                                />
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleSaveTreatment(pendency.id)}
                                  disabled={!editingTreatment[pendency.id]}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(pendency.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(pendency.created_at).toLocaleDateString('pt-BR')}
                            <div className="text-xs text-muted-foreground">
                              {new Date(pendency.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewingPendency(pendency);
                                setViewModalOpen(true);
                              }}
                              title="Visualizar detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(userRole === 'owner' || userRole === 'master' || userRole === 'admin') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPendency(pendency)}
                                title="Editar pendência"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            {pendency.status !== 'resolved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResolve(pendency.id)}
                                title="Marcar como resolvido"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {(userRole === 'owner' || userRole === 'master') && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePendency(pendency.id)}
                              >
                                Remover
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {pendencies.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {pendencies.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, pendencies?.length || 0)} de {pendencies?.length || 0} pendências
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show only certain page numbers for large paginations
                        if (
                          totalPages <= 7 ||
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageSelect(page)}
                              className="min-w-[36px]"
                            >
                              {page}
                            </Button>
                          );
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return <span key={page} className="px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </main>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Pendência</DialogTitle>
            <DialogDescription>
              Atualize as informações da pendência
            </DialogDescription>
          </DialogHeader>
          
          {editingPendency && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID C4U</Label>
                  <Input
                    value={editingPendency.c4u_id}
                    onChange={(e) => setEditingPendency({
                      ...editingPendency,
                      c4u_id: e.target.value
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Tipo de Erro</Label>
                  <Select 
                    value={editingPendency.error_type} 
                    onValueChange={(value) => setEditingPendency({
                      ...editingPendency,
                      error_type: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {errorTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Quantidade de Documentos</Label>
                  <Input
                    type="number"
                    value={editingPendency.error_document_count}
                    onChange={(e) => setEditingPendency({
                      ...editingPendency,
                      error_document_count: parseInt(e.target.value)
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select 
                    value={editingPendency.customer || 'Cidadania4y'} 
                    onValueChange={(value) => setEditingPendency({
                      ...editingPendency,
                      customer: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cidadania4y">Cidadania4y</SelectItem>
                      <SelectItem value="Yellowling">Yellowling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data de Criação</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editingPendency.created_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editingPendency.created_at 
                          ? format(new Date(editingPendency.created_at), "dd/MM/yyyy", { locale: ptBR }) 
                          : <span>Selecionar data</span>
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editingPendency.created_at ? new Date(editingPendency.created_at) : undefined}
                        onSelect={(date) => setEditingPendency({
                          ...editingPendency,
                          created_at: date ? date.toISOString() : new Date().toISOString()
                        })}
                        initialFocus
                        className="p-3 pointer-events-auto"
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editingPendency.description}
                  onChange={(e) => setEditingPendency({
                    ...editingPendency,
                    description: e.target.value
                  })}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tratativa</Label>
                <Textarea
                  value={editingPendency.treatment || ''}
                  onChange={(e) => setEditingPendency({
                    ...editingPendency,
                    treatment: e.target.value
                  })}
                  placeholder="Inserir tratativa..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePendency}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Pendency Dialog */}
      <PendencyViewDialog
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        pendency={viewingPendency}
      />
    </div>
  );
}