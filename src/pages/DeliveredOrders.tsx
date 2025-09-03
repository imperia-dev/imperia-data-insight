import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle } from "lucide-react";

export function DeliveredOrders() {
  const { user } = useAuth();

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

  // Fetch delivered orders based on user role
  const { data: deliveredOrders, isLoading } = useQuery({
    queryKey: ["delivered-orders", user?.id, profile?.role],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, profiles!orders_assigned_to_fkey(full_name, email)")
        .eq("status_order", "delivered")
        .order("delivered_at", { ascending: false });
      
      // If user is operation, only show their delivered orders
      if (profile?.role === "operation") {
        query = query.eq("assigned_to", user?.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!profile,
  });

  const isAdminOrMaster = profile?.role === "admin" || profile?.role === "master";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={profile?.role || "operation"} />
      
      <div className="md:pl-64">
        <Header userName={profile?.full_name || user?.email || ""} userRole={profile?.role || "operation"} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Pedidos Entregues</h1>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Histórico de Pedidos Entregues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando pedidos entregues...
                </div>
              ) : deliveredOrders?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pedido entregue ainda
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Pedido</TableHead>
                      <TableHead>Quantidade de Documentos</TableHead>
                      <TableHead>Data de Atribuição</TableHead>
                      <TableHead>Prazo Original</TableHead>
                      <TableHead>Data de Entrega</TableHead>
                      {isAdminOrMaster && <TableHead>Responsável</TableHead>}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveredOrders?.map((order) => {
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
                            {order.assigned_at 
                              ? format(new Date(order.assigned_at), "dd/MM/yyyy HH:mm", {
                                  locale: ptBR,
                                })
                              : "-"}
                          </TableCell>
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
                          {isAdminOrMaster && (
                            <TableCell>
                              {order.profiles?.full_name || order.profiles?.email || "-"}
                            </TableCell>
                          )}
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
        </main>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}