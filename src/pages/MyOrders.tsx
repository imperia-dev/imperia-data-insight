import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, CheckCircle, Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function MyOrders() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const queryClient = useQueryClient();

  // Fetch user profile
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

  // Fetch user's orders in progress
  const { data: myOrders, isLoading: isLoadingMyOrders } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_to", user?.id)
        .eq("status_order", "in_progress")
        .order("assigned_at", { ascending: false });
      
      if (error) throw error;
      console.log("My orders (in_progress):", data);
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch available orders - ordenado por data de atribuição (mais antiga primeiro)
  const { data: availableOrders, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ["available-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status_order", "available")
        .order("attribution_date", { ascending: true }); // Ordenar por data de atribuição mais antiga
      
      if (error) throw error;
      console.log("Available orders:", data);
      return data;
    },
  });

  // Fetch user's concurrent order limit
  const { data: userLimit } = useQuery({
    queryKey: ["user-order-limit", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("user_document_limits")
        .select("concurrent_order_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user limit:", error);
      }

      // Return default limit if not found
      return data || { concurrent_order_limit: 2 };
    },
    enabled: !!user?.id,
  });

  // Mark order as delivered mutation
  const deliverOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({
          delivered_at: new Date().toISOString(),
          status_order: "delivered",
        })
        .eq("id", orderId)
        .eq("assigned_to", user?.id);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["my-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["delivered-orders"] }); // Invalidate delivered orders cache
      toast({
        title: "Pedido finalizado",
        description: "O pedido foi marcado como entregue com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao finalizar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Take order mutation
  const takeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Check if user has reached the concurrent order limit
      const currentOrderCount = myOrders?.length || 0;
      const maxConcurrentOrders = userLimit?.concurrent_order_limit || 2;
      
      if (currentOrderCount >= maxConcurrentOrders) {
        throw new Error(`Você já possui ${currentOrderCount} pedido(s) em andamento. Finalize um pedido antes de pegar outro.`);
      }

      const { error } = await supabase
        .from("orders")
        .update({
          assigned_to: user?.id,
          assigned_at: new Date().toISOString(),
          status_order: "in_progress", // Set status to in_progress
        })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      // Force immediate refetch of both queries with correct key
      await queryClient.invalidateQueries({ queryKey: ["available-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["my-orders", user?.id] });
      // Force refetch to ensure data is updated
      await queryClient.refetchQueries({ queryKey: ["available-orders"] });
      await queryClient.refetchQueries({ queryKey: ["my-orders", user?.id] });
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

  // Calculate if user can take more orders
  const currentOrderCount = myOrders?.length || 0;
  const maxConcurrentOrders = userLimit?.concurrent_order_limit || 2;
  const canTakeMoreOrders = currentOrderCount < maxConcurrentOrders;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={profile?.role || "operation"} />
      
      <div className={mainContainerClass}>
        <Header userName={profile?.full_name || user?.email || ""} userRole={profile?.role || "operation"} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Meus Pedidos</h1>

          {/* Order Status Badge */}
          <div className="mb-6 flex items-center gap-4">
            <Badge 
              variant={canTakeMoreOrders ? "default" : "secondary"}
              className="px-4 py-2"
            >
              <span className="font-medium">
                {currentOrderCount}/{maxConcurrentOrders} pedidos em andamento
              </span>
            </Badge>
            {!canTakeMoreOrders && (
              <Alert className="flex-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você atingiu o limite de {maxConcurrentOrders} pedidos simultâneos. 
                  Finalize um pedido para pegar outro.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Available Orders */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pedidos Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAvailable ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando pedidos disponíveis...
                </div>
              ) : availableOrders?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pedido disponível no momento
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Pedido</TableHead>
                      <TableHead>Quantidade de Documentos</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Data de Atribuição</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableOrders?.map((order) => (
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
                        <TableCell>
                          {format(new Date(order.deadline), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          {order.attribution_date &&
                            format(new Date(order.attribution_date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => takeOrderMutation.mutate(order.id)}
                            disabled={takeOrderMutation.isPending || !canTakeMoreOrders}
                            title={!canTakeMoreOrders ? `Você já possui ${currentOrderCount} pedido(s) em andamento` : undefined}
                          >
                            Pegar Pedido
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pending Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pedidos em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMyOrders ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando pedidos...
                </div>
              ) : myOrders?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pedido em andamento
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Pedido</TableHead>
                      <TableHead>Quantidade de Documentos</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Data de Atribuição</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myOrders?.map((order) => (
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
                        <TableCell>
                          {format(new Date(order.deadline), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          {order.assigned_at &&
                            format(new Date(order.assigned_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => deliverOrderMutation.mutate(order.id)}
                            disabled={deliverOrderMutation.isPending}
                          >
                            Finalizar
                          </Button>
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