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
import { Package, CheckCircle, Clock, AlertTriangle, AlertCircle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";

export function MyOrders() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const queryClient = useQueryClient();

  // Fetch user profile with operation_account_id and avatar data
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, avatar_url, avatar_style, avatar_color, avatar_animation_preference")
        .eq("id", user?.id)
        .single();
      
      if (error) throw error;
      // Type assertion to include operation_account_id until types are updated
      return data as typeof data & { operation_account_id?: string };
    },
    enabled: !!user?.id,
  });

  // Fetch user's orders in progress
  const { data: myOrders, isLoading: isLoadingMyOrders } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          service_provider_protocols(protocol_number, status)
        `)
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
    mutationFn: async (order: any) => {
      // Check if user has operation_account_id configured
      if (!profile?.operation_account_id) {
        throw new Error("Peça ao admin o cadastro da plataforma ops");
      }

      // Check if user has reached the concurrent order limit
      const currentOrderCount = myOrders?.length || 0;
      const maxConcurrentOrders = userLimit?.concurrent_order_limit || 2;
      
      if (currentOrderCount >= maxConcurrentOrders) {
        throw new Error(`Você já possui ${currentOrderCount} pedido(s) em andamento. Finalize um pedido antes de pegar outro.`);
      }

      // Step 1: Update order in Supabase with operation account ID
      const { error } = await supabase
        .from("orders")
        .update({
          assigned_to: user?.id,
          assigned_at: new Date().toISOString(),
          status_order: "in_progress",
          account_ID: profile.operation_account_id, // Save the operation account ID
        })
        .eq("id", order.id);
      
      if (error) throw error;

      // Step 2: Call n8n webhook with operation_account_id
      try {
        // Prepare payload with correct field names and values
        const payload = {
          translationOrderId: order.order_number, // Use order_number (fragment) instead of full UUID
          AccountId: profile.operation_account_id,
        };

        // Detailed logging for debugging
        console.log('n8n payload:', payload);
        
        // Temporary toast for debugging
        toast({
          title: "Debug: Enviando para n8n",
          description: `translationOrderId=${order.order_number}, AccountId=${profile.operation_account_id}`,
        });

        const webhookResponse = await fetch(
          "https://automations.lytech.global/webhook/45450e61-deeb-429e-b803-7c4419e6c138",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        // Get response text first to handle empty responses
        const responseText = await webhookResponse.text();
        console.log('n8n response status:', webhookResponse.status);
        console.log('n8n response text:', responseText);

        let responseData = null;
        if (responseText && responseText.trim()) {
          try {
            responseData = JSON.parse(responseText);
            
            // Check for known n8n errors
            if (responseData.error) {
              console.error('n8n retornou erro:', responseData.error);
              if (responseData.error === 'INVALID_INPUT') {
                console.error('Dados inválidos enviados ao sistema de operação');
                toast({
                  title: "Erro de Validação",
                  description: "Dados inválidos enviados ao sistema de operação. Verifique o account_ID.",
                  variant: "destructive",
                });
              } else if (responseData.error === 'NOT_FOUND') {
                console.error('Pedido não encontrado no sistema de operação');
                toast({
                  title: "Pedido Não Encontrado",
                  description: `Pedido ${order.order_number} não encontrado no sistema de operação.`,
                  variant: "destructive",
                });
              }
              // Continue with partial success - order was assigned
              return { 
                success: true, 
                partialSuccess: true,
                error: responseData.error
              };
            }
            
            // Step 3: Save the ServiceOrderLink to service_order_link field
            if (responseData.ServiceOrderLink || responseData.Id) {
              const linkToSave = responseData.ServiceOrderLink || responseData.Id;
              
              const { error: updateError } = await supabase
                .from("orders")
                .update({
                  service_order_link: linkToSave,
                } as any)
                .eq("id", order.id);

              if (updateError) {
                console.error("Erro ao salvar link de integração:", updateError);
                // Don't throw, just log - the order was already assigned successfully
              } else {
                console.log('ServiceOrderLink salvo com sucesso:', linkToSave);
              }

              return { 
                success: true, 
                serviceOrderLink: linkToSave 
              };
            }
          } catch (parseError) {
            console.error('Erro ao fazer parse do JSON:', parseError);
            console.log('Resposta recebida:', responseText);
          }
        } else {
          console.warn('Webhook retornou resposta vazia - pedido atribuído mas sem link');
        }

        if (!webhookResponse.ok) {
          console.error("Webhook retornou erro HTTP:", webhookResponse.status);
        }
      } catch (webhookError) {
        console.error("Erro ao chamar webhook:", webhookError);
        // Don't throw - continue with partial success
        return { 
          success: true, 
          partialSuccess: true 
        };
      }

      return { success: true };
    },
    onSuccess: async (result) => {
      // Force immediate refetch of both queries with correct key
      await queryClient.invalidateQueries({ queryKey: ["available-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["my-orders", user?.id] });
      // Force refetch to ensure data is updated
      await queryClient.refetchQueries({ queryKey: ["available-orders"] });
      await queryClient.refetchQueries({ queryKey: ["my-orders", user?.id] });
      
      if (result?.serviceOrderLink) {
        toast({
          title: "Sucesso",
          description: (
            <div className="space-y-2">
              <p>Pedido atribuído e integrado com sucesso!</p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => window.open(result.serviceOrderLink, '_blank')}
              >
                Abrir na Operação
              </Button>
            </div>
          ),
        });
      } else if (result?.partialSuccess) {
        toast({
          title: "Pedido Atribuído",
          description: "Pedido atribuído com sucesso! (Integração com sistema externo falhou)",
        });
      } else {
        toast({
          title: "Pedido atribuído",
          description: "O pedido foi atribuído a você com sucesso.",
        });
      }
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
          {/* User Profile Section */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AnimatedAvatar
                src={profile?.avatar_style === 'photo' ? profile?.avatar_url : undefined}
                fallback={profile?.full_name || user?.email || ""}
                size="lg"
                showStatus
                status="online"
                animationLevel={
                  profile?.avatar_animation_preference && 
                  typeof profile.avatar_animation_preference === 'object' &&
                  'enabled' in profile.avatar_animation_preference &&
                  profile.avatar_animation_preference.enabled
                    ? ((profile.avatar_animation_preference as any).level || "normal")
                    : "subtle"
                }
                style={profile?.avatar_style as any}
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Meus Pedidos</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.full_name} • {profile?.operation_account_id ? `ID: ${profile.operation_account_id}` : 'Sem ID de operação'}
                </p>
              </div>
            </div>
            
            {/* Performance Summary */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Pedidos Hoje</p>
                  <p className="text-2xl font-bold">{myOrders?.length || 0}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </Card>
          </div>

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
                            onClick={() => takeOrderMutation.mutate(order)}
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
                      <TableHead>Link da Operação</TableHead>
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
                          {order.service_order_link ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(order.service_order_link, '_blank')}
                            >
                              Abrir Link
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
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