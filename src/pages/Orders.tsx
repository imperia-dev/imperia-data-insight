import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Package } from "lucide-react";

export function Orders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    order_number: "",
    document_count: "",
    deadline: "",
    attribution_date: "",
    delivered_at: "",
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
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

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
      
      if (data.delivered_at) {
        insertData.delivered_at = new Date(data.delivered_at).toISOString();
        insertData.status_order = "delivered"; // If delivered date is set, mark as delivered
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
        delivered_at: "",
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
      const { error } = await supabase
        .from("orders")
        .update({
          assigned_to: user?.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Pedido atribuído",
        description: "O pedido foi atribuído a você com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao pegar pedido",
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

  // Filter orders for operation users
  const filteredOrders = isOperation 
    ? orders?.filter(order => !order.assigned_to || order.assigned_to === user?.id)
    : orders;

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
                    
                    <div>
                      <Label htmlFor="delivered_at">Data de Entrega</Label>
                      <Input
                        id="delivered_at"
                        type="datetime-local"
                        value={formData.delivered_at}
                        onChange={(e) =>
                          setFormData({ ...formData, delivered_at: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Opcional - Data quando o pedido foi entregue
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
                          {order.order_number}
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
                          {isOperation && !order.assigned_to && (
                            <Button
                              size="sm"
                              onClick={() => takeOrderMutation.mutate(order.id)}
                              disabled={takeOrderMutation.isPending}
                            >
                              Pegar Pedido
                            </Button>
                          )}
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