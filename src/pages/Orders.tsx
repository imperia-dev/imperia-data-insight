import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Package, AlertTriangle, Edit, Save, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrderFilters, OrderFilters as OrderFiltersType } from "@/components/orders/OrderFilters";

export function Orders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState("");
  const [isEditingLastOrder, setIsEditingLastOrder] = useState(false);
  const [tempLastOrderId, setTempLastOrderId] = useState("");
  const [sortBy, setSortBy] = useState("urgent_created");
  const [filters, setFilters] = useState<OrderFiltersType>({
    orderNumber: "",
    status: "all",
    assignedTo: "all",
    deadlineFrom: "",
    deadlineTo: "",
    attributionFrom: "",
    attributionTo: "",
    documentCountMin: "",
    documentCountMax: "",
    isUrgent: "all",
    deliveredFrom: "",
    deliveredTo: "",
  });
  const [formData, setFormData] = useState({
    order_number: "",
    document_count: "",
    deadline: "",
    attribution_date: "",
  });

  // Fetch user profile to get role
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch all profiles for filter dropdown
  const { data: allProfiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          assigned_profile:profiles!assigned_to(full_name, email)
        `)
        .order("is_urgent", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch last document ID from system settings
  const { data: lastDocumentSetting } = useQuery({
    queryKey: ["system-settings", "last_document_id"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "last_document_id")
        .maybeSingle();
      
      if (error) throw error;
      return data?.value || "";
    },
  });

  // Update last document ID mutation
  const updateLastDocumentMutation = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ 
          key: "last_document_id", 
          value: value,
          updated_by: user?.id 
        }, { 
          onConflict: "key" 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings", "last_document_id"] });
      toast({
        title: "Salvo com sucesso",
        description: "O ID do último documento foi atualizado.",
      });
      setIsEditingLastOrder(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set initial value when data is loaded
  useEffect(() => {
    if (lastDocumentSetting !== undefined) {
      setLastOrderId(lastDocumentSetting);
      setTempLastOrderId(lastDocumentSetting);
    }
  }, [lastDocumentSetting]);

  // Create order mutation (admin and master)
  const createOrderMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const insertData: any = {
        order_number: data.order_number,
        document_count: parseInt(data.document_count),
        deadline: new Date(data.deadline).toISOString(),
        created_by: user?.id,
        status_order: "available", // Always start with available status
      };
      
      // Add optional fields if provided
      if (data.attribution_date) {
        insertData.attribution_date = new Date(data.attribution_date).toISOString();
      }
      
      const { error } = await supabase.from("orders").insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Pedido criado",
        description: "O pedido foi criado com sucesso.",
      });
      setIsDialogOpen(false);
      setFormData({
        order_number: "",
        document_count: "",
        deadline: "",
        attribution_date: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Take order mutation
  const takeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      console.log("Attempting to take order with ID:", orderId);
      console.log("Assigning to user ID:", user?.id);
      const { error } = await supabase
        .from("orders")
        .update({
          assigned_to: user?.id,
          assigned_at: new Date().toISOString(),
          status_order: "in_progress", // Explicitly set status to in_progress
        })
        .eq("id", orderId);
      
      if (error) {
        console.error("Error taking order:", error);
        throw error;
      }
      console.log("Order taken successfully in Supabase.");
    },
    onSuccess: () => {
      console.log("takeOrderMutation onSuccess: Invalidating and refetching queries.");
      queryClient.refetchQueries({ queryKey: ["orders"] }); // Force refetch of all orders
      queryClient.refetchQueries({ queryKey: ["my-orders", user?.id] }); // Force refetch of my-orders for the current user
      toast({
        title: "Pedido atribuído",
        description: "O pedido foi atribuído a você com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("takeOrderMutation onError:", error);
      toast({
        title: "Erro ao pegar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle urgent mutation
  const toggleUrgentMutation = useMutation({
    mutationFn: async ({ orderId, isUrgent }: { orderId: string; isUrgent: boolean }) => {
      const { error } = await supabase
        .from("orders")
        .update({ is_urgent: isUrgent })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Status de urgência atualizado",
        description: "O status de urgência foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar urgência",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrderMutation.mutate(formData);
  };

  const isAdmin = profile?.role === "admin";
  const isMaster = profile?.role === "master";
  const isOperation = profile?.role === "operation";

  // Apply filters and sorting
  const filteredOrders = useMemo(() => {
    let result = orders || [];

    // Filter for operation users first
    if (isOperation) {
      result = result.filter(order => !order.assigned_to || order.assigned_to === user?.id);
    }

    // Apply search filters
    if (filters.orderNumber) {
      result = result.filter(order => 
        order.order_number.toLowerCase().includes(filters.orderNumber.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== "all") {
      result = result.filter(order => {
        if (filters.status === "available") return order.status_order === "available";
        if (filters.status === "in_progress") return order.status_order === "in_progress";
        if (filters.status === "delivered") return order.status_order === "delivered" || order.delivered_at;
        return true;
      });
    }

    // Urgent filter
    if (filters.isUrgent !== "all") {
      result = result.filter(order => 
        filters.isUrgent === "true" ? order.is_urgent : !order.is_urgent
      );
    }

    // Assigned to filter
    if (filters.assignedTo !== "all" && !isOperation) {
      if (filters.assignedTo === "unassigned") {
        result = result.filter(order => !order.assigned_to);
      } else {
        result = result.filter(order => order.assigned_to === filters.assignedTo);
      }
    }

    // Document count filters
    if (filters.documentCountMin) {
      result = result.filter(order => 
        order.document_count >= parseInt(filters.documentCountMin)
      );
    }
    if (filters.documentCountMax) {
      result = result.filter(order => 
        order.document_count <= parseInt(filters.documentCountMax)
      );
    }

    // Deadline filters
    if (filters.deadlineFrom) {
      result = result.filter(order => 
        new Date(order.deadline) >= new Date(filters.deadlineFrom)
      );
    }
    if (filters.deadlineTo) {
      result = result.filter(order => 
        new Date(order.deadline) <= new Date(filters.deadlineTo)
      );
    }

    // Attribution date filters
    if (filters.attributionFrom && !isOperation) {
      result = result.filter(order => 
        order.attribution_date && new Date(order.attribution_date) >= new Date(filters.attributionFrom)
      );
    }
    if (filters.attributionTo && !isOperation) {
      result = result.filter(order => 
        order.attribution_date && new Date(order.attribution_date) <= new Date(filters.attributionTo)
      );
    }

    // Delivered date filters
    if (filters.deliveredFrom && !isOperation) {
      result = result.filter(order => 
        order.delivered_at && new Date(order.delivered_at) >= new Date(filters.deliveredFrom)
      );
    }
    if (filters.deliveredTo && !isOperation) {
      result = result.filter(order => 
        order.delivered_at && new Date(order.delivered_at) <= new Date(filters.deliveredTo)
      );
    }

    // Apply sorting
    const sortedResult = [...result];
    switch (sortBy) {
      case "urgent_created":
        sortedResult.sort((a, b) => {
          if (a.is_urgent !== b.is_urgent) {
            return a.is_urgent ? -1 : 1;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        break;
      case "deadline_asc":
        sortedResult.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        break;
      case "deadline_desc":
        sortedResult.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
        break;
      case "documents_asc":
        sortedResult.sort((a, b) => a.document_count - b.document_count);
        break;
      case "documents_desc":
        sortedResult.sort((a, b) => b.document_count - a.document_count);
        break;
      case "order_number_asc":
        sortedResult.sort((a, b) => a.order_number.localeCompare(b.order_number));
        break;
      case "order_number_desc":
        sortedResult.sort((a, b) => b.order_number.localeCompare(a.order_number));
        break;
      case "created_asc":
        sortedResult.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "created_desc":
        sortedResult.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return sortedResult;
  }, [orders, filters, isOperation, user?.id, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={profile?.role || "operation"} />
      
      <div className="md:pl-64">
        <Header userName={profile?.full_name || user?.email || ""} userRole={profile?.role || "operation"} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
            
            {(isAdmin || isMaster) && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Pedido
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Pedido</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="order_number">ID do Pedido *</Label>
                      <Input
                        id="order_number"
                        placeholder="Ex: PED-001"
                        value={formData.order_number}
                        onChange={(e) =>
                          setFormData({ ...formData, order_number: e.target.value })
                        }
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="document_count">Quantidade de Documentos *</Label>
                      <Input
                        id="document_count"
                        type="number"
                        min="1"
                        placeholder="Ex: 10"
                        value={formData.document_count}
                        onChange={(e) =>
                          setFormData({ ...formData, document_count: e.target.value })
                        }
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="deadline">Deadline *</Label>
                      <Input
                        id="deadline"
                        type="datetime-local"
                        value={formData.deadline}
                        onChange={(e) =>
                          setFormData({ ...formData, deadline: e.target.value })
                        }
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="attribution_date">Data de Atribuição</Label>
                      <Input
                        id="attribution_date"
                        type="datetime-local"
                        value={formData.attribution_date}
                        onChange={(e) =>
                          setFormData({ ...formData, attribution_date: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Opcional - Data quando o pedido foi atribuído
                      </p>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={createOrderMutation.isPending}>
                      {createOrderMutation.isPending ? "Criando..." : "Criar Pedido"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="flex gap-4 items-start mb-4">
            <div className="flex-1">
              <OrderFilters 
                onFiltersChange={setFilters} 
                profiles={allProfiles || []}
                isOperation={isOperation}
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
                    <SelectItem value="urgent_created">Urgente + Mais Recente</SelectItem>
                    <SelectItem value="deadline_asc">Prazo (Mais Próximo)</SelectItem>
                    <SelectItem value="deadline_desc">Prazo (Mais Distante)</SelectItem>
                    <SelectItem value="documents_asc">Documentos (Menor)</SelectItem>
                    <SelectItem value="documents_desc">Documentos (Maior)</SelectItem>
                    <SelectItem value="order_number_asc">ID do Pedido (A-Z)</SelectItem>
                    <SelectItem value="order_number_desc">ID do Pedido (Z-A)</SelectItem>
                    <SelectItem value="created_asc">Data Criação (Mais Antigo)</SelectItem>
                    <SelectItem value="created_desc">Data Criação (Mais Recente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Last Order ID Input Card */}
          <Card className="mb-6">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Último Documento Incluído
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Digite o ID do pedido"
                  value={isEditingLastOrder ? tempLastOrderId : lastOrderId}
                  onChange={(e) => setTempLastOrderId(e.target.value)}
                  disabled={!isEditingLastOrder}
                  className="max-w-xs"
                />
                {!isEditingLastOrder ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingLastOrder(true);
                      setTempLastOrderId(lastOrderId);
                    }}
                    disabled={!isAdmin && !isMaster && profile?.role !== "owner"}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateLastDocumentMutation.mutate(tempLastOrderId)}
                      disabled={updateLastDocumentMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {updateLastDocumentMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingLastOrder(false);
                        setTempLastOrderId(lastOrderId);
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {isOperation ? "Pedidos Disponíveis" : "Todos os Pedidos"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando pedidos...
                </div>
              ) : filteredOrders?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pedido encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Pedido</TableHead>
                      <TableHead>Qtd. Documentos</TableHead>
                      {(isAdmin || isMaster) && <TableHead>Data Atribuição</TableHead>}
                      <TableHead>Deadline</TableHead>
                      {(isAdmin || isMaster) && <TableHead>Data Entrega</TableHead>}
                      <TableHead>Status</TableHead>
                      {(isAdmin || isMaster) && <TableHead>Atribuído a</TableHead>}
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {order.order_number}
                            {order.is_urgent && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Urgente
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{order.document_count}</TableCell>
                        {(isAdmin || isMaster) && (
                          <TableCell>
                            {order.attribution_date 
                              ? format(new Date(order.attribution_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"}
                          </TableCell>
                        )}
                        <TableCell>
                          {format(new Date(order.deadline), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        {(isAdmin || isMaster) && (
                          <TableCell>
                            {order.delivered_at
                              ? format(new Date(order.delivered_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"}
                          </TableCell>
                        )}
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            order.delivered_at
                              ? "bg-green-100 text-green-700"
                              : order.assigned_to
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          )}>
                            {order.delivered_at
                              ? "Entregue"
                              : order.assigned_to
                              ? "Em andamento"
                              : "Disponível"}
                          </span>
                        </TableCell>
                        {(isAdmin || isMaster) && (
                          <TableCell>
                            {order.assigned_profile?.full_name || "-"}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex gap-2">
                            {isMaster && (
                              <Button
                                size="sm"
                                variant={order.is_urgent ? "destructive" : "outline"}
                                onClick={() => toggleUrgentMutation.mutate({
                                  orderId: order.id,
                                  isUrgent: !order.is_urgent
                                })}
                                disabled={toggleUrgentMutation.isPending}
                              >
                                <AlertTriangle className="h-4 w-4" />
                                {order.is_urgent ? "Remover Urgência" : "Marcar Urgente"}
                              </Button>
                            )}
                            {isOperation && !order.assigned_to && (
                              <Button
                                size="sm"
                                onClick={() => takeOrderMutation.mutate(order.id)}
                                disabled={takeOrderMutation.isPending}
                              >
                                Pegar Pedido
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
        </main>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}