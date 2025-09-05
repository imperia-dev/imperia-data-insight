import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, AlertTriangle, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export function DeliveredOrders() {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState("delivered_desc");

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

  // Apply sorting to delivered orders
  const sortedOrders = useMemo(() => {
    if (!deliveredOrders) return [];
    
    const sorted = [...deliveredOrders];
    switch (sortBy) {
      case "delivered_desc":
        sorted.sort((a, b) => new Date(b.delivered_at!).getTime() - new Date(a.delivered_at!).getTime());
        break;
      case "delivered_asc":
        sorted.sort((a, b) => new Date(a.delivered_at!).getTime() - new Date(b.delivered_at!).getTime());
        break;
      case "deadline_asc":
        sorted.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        break;
      case "deadline_desc":
        sorted.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
        break;
      case "documents_asc":
        sorted.sort((a, b) => a.document_count - b.document_count);
        break;
      case "documents_desc":
        sorted.sort((a, b) => b.document_count - a.document_count);
        break;
      case "order_number_asc":
        sorted.sort((a, b) => a.order_number.localeCompare(b.order_number));
        break;
      case "order_number_desc":
        sorted.sort((a, b) => b.order_number.localeCompare(a.order_number));
        break;
      case "status":
        sorted.sort((a, b) => {
          const aOnTime = new Date(a.delivered_at!) <= new Date(a.deadline);
          const bOnTime = new Date(b.delivered_at!) <= new Date(b.deadline);
          if (aOnTime === bOnTime) return 0;
          return aOnTime ? -1 : 1;
        });
        break;
    }
    
    return sorted;
  }, [deliveredOrders, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={profile?.role || "operation"} />
      
      <div className="md:pl-64">
        <Header userName={profile?.full_name || user?.email || ""} userRole={profile?.role || "operation"} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-4">Pedidos Entregues</h1>
            <div className="flex justify-end">
              <div className="w-64">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ordenar por</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivered_desc">Entrega (Mais Recente)</SelectItem>
                      <SelectItem value="delivered_asc">Entrega (Mais Antiga)</SelectItem>
                      <SelectItem value="deadline_asc">Prazo (Mais Próximo)</SelectItem>
                      <SelectItem value="deadline_desc">Prazo (Mais Distante)</SelectItem>
                      <SelectItem value="documents_asc">Documentos (Menor)</SelectItem>
                      <SelectItem value="documents_desc">Documentos (Maior)</SelectItem>
                      <SelectItem value="order_number_asc">ID do Pedido (A-Z)</SelectItem>
                      <SelectItem value="order_number_desc">ID do Pedido (Z-A)</SelectItem>
                      <SelectItem value="status">Status (No Prazo Primeiro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

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
                    {sortedOrders?.map((order) => {
                      const deadlineDate = new Date(order.deadline);
                      const deliveredDate = new Date(order.delivered_at!);
                      const isOnTime = deliveredDate <= deadlineDate;
                      
                      return (
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