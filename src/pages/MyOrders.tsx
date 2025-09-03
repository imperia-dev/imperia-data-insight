import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Package, CheckCircle } from "lucide-react";

export function MyOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's orders
  const { data: myOrders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_to", user?.id)
        .order("assigned_at", { ascending: false });
      
      if (error) throw error;
      return data;
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
        })
        .eq("id", orderId)
        .eq("assigned_to", user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast({
        title: "Pedido entregue",
        description: "O pedido foi marcado como entregue com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao marcar pedido como entregue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingOrders = myOrders?.filter(order => !order.delivered_at) || [];
  const deliveredOrders = myOrders?.filter(order => order.delivered_at) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Meus Pedidos</h1>

      {/* Pending Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pedidos em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando pedidos...
            </div>
          ) : pendingOrders.length === 0 ? (
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
                {pendingOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.order_number}
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
                        onClick={() => deliverOrderMutation.mutate(order.id)}
                        disabled={deliverOrderMutation.isPending}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Pedido Entregue
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delivered Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Pedidos Entregues
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliveredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pedido entregue ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>Quantidade de Documentos</TableHead>
                  <TableHead>Prazo Original</TableHead>
                  <TableHead>Data de Entrega</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveredOrders.map((order) => {
                  const deadlineDate = new Date(order.deadline);
                  const deliveredDate = new Date(order.delivered_at!);
                  const isOnTime = deliveredDate <= deadlineDate;
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>{order.document_count}</TableCell>
                      <TableCell>
                        {format(deadlineDate, "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        {format(deliveredDate, "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          isOnTime
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {isOnTime ? "No prazo" : "Atrasado"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}