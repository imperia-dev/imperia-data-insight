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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronsUpDown, Check, AlertCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImportPendenciesDialog } from "@/components/pendencies/ImportPendenciesDialog";

export default function Pendencies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Form states
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [c4uId, setC4uId] = useState("");
  const [description, setDescription] = useState("");
  const [errorType, setErrorType] = useState("");
  const [errorDocumentCount, setErrorDocumentCount] = useState("");
  
  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [pendencies, setPendencies] = useState<any[]>([]);
  const [openOrderSearch, setOpenOrderSearch] = useState(false);
  const [orderSearchValue, setOrderSearchValue] = useState("");

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
  ];

  useEffect(() => {
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
      const { data, error } = await supabase
        .from('pendencies')
        .select(`
          *,
          orders(order_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendencies(data || []);
    } catch (error) {
      console.error('Error fetching pendencies:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as pendências.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrderId || !c4uId || !description || !errorType || !errorDocumentCount) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('pendencies').insert({
        order_id: selectedOrderId,
        c4u_id: c4uId,
        description,
        error_type: errorType,
        error_document_count: parseInt(errorDocumentCount),
        created_by: user?.id,
      });

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

  const getErrorTypeLabel = (value: string) => {
    const type = errorTypes.find(t => t.value === value);
    return type?.label || value;
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
    };

    return (
      <span className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"
      )}>
        {status === 'pending' ? 'Pendente' : status === 'resolved' ? 'Resolvido' : 'Em Andamento'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black text-foreground">
                Pendências
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie as pendências e erros dos pedidos
              </p>
            </div>
            {(userRole === 'owner' || userRole === 'master' || userRole === 'admin') && (
              <Button 
                onClick={() => setShowImportDialog(true)}
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar pendências
              </Button>
            )}
          </div>

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
                        className="w-full justify-between"
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

                {/* C4U ID */}
                <div className="space-y-2">
                  <Label htmlFor="c4u_id">ID C4U</Label>
                  <Input
                    id="c4u_id"
                    value={c4uId}
                    onChange={(e) => setC4uId(e.target.value)}
                    placeholder="Digite o ID C4U"
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
                    <TableHead>Tipo de Erro</TableHead>
                    <TableHead>Qtd. Documentos</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendencies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhuma pendência registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendencies.map((pendency) => (
                      <TableRow key={pendency.id}>
                        <TableCell className="font-medium">
                          {pendency.orders?.order_number || '-'}
                        </TableCell>
                        <TableCell>{pendency.c4u_id}</TableCell>
                        <TableCell>{getErrorTypeLabel(pendency.error_type)}</TableCell>
                        <TableCell>{pendency.error_document_count}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {pendency.description}
                        </TableCell>
                        <TableCell>{getStatusBadge(pendency.status)}</TableCell>
                        <TableCell>
                          {new Date(pendency.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePendency(pendency.id)}
                          >
                            Remover
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>
      </div>

      <ImportPendenciesDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={fetchPendencies}
      />
    </div>
  );
}