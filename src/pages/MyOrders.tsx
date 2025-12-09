import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useUserRole } from "@/hooks/useUserRole";
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
import { toZonedTime } from "date-fns-tz";
import { Package, CheckCircle, Clock, AlertTriangle, AlertCircle, User, Hammer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import googleDriveLogo from "@/assets/google-drive-logo.png";

export function MyOrders() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const queryClient = useQueryClient();
  const { userRole } = useUserRole();

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
      // ===== LOG 1: DADOS INICIAIS =====
      console.log('=== INÍCIO TAKE ORDER ===');
      console.log('Order ID:', order.id);
      console.log('Order Number:', order.order_number);
      console.log('User ID:', user?.id);
      console.log('Profile operation_account_id:', profile?.operation_account_id);
      console.log('Profile completo:', profile);
      
      // Check if user has operation_account_id configured
      if (!profile?.operation_account_id) {
        console.error('ERRO: operation_account_id não configurado');
        throw new Error("Peça ao admin o cadastro da plataforma ops");
      }

      // Check if user has reached the concurrent order limit
      const currentOrderCount = myOrders?.length || 0;
      const maxConcurrentOrders = userLimit?.concurrent_order_limit || 2;
      
      if (currentOrderCount >= maxConcurrentOrders) {
        throw new Error(`Você já possui ${currentOrderCount} pedido(s) em andamento. Finalize um pedido antes de pegar outro.`);
      }

      // ===== LOG 2: ANTES DE ATUALIZAR NO SUPABASE =====
      const updateData = {
        assigned_to: user?.id,
        assigned_at: new Date().toISOString(),
        status_order: "in_progress",
        account_ID: profile.operation_account_id,
      };
      console.log('=== ATUALIZANDO SUPABASE ===');
      console.log('Update data:', updateData);
      console.log('Order ID a ser atualizado:', order.id);

      // Step 1: Update order in Supabase with operation account ID
      const { data: updateResult, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order.id)
        .select();
      
      // ===== LOG 3: APÓS ATUALIZAÇÃO =====
      console.log('=== RESULTADO SUPABASE ===');
      console.log('Update result:', updateResult);
      console.log('Update error:', error);
      
      if (error) {
        console.error('ERRO ao atualizar no Supabase:', error);
        throw error;
      }

      // ===== LOG 4: VERIFICAR SE account_ID FOI SALVO =====
      const { data: verifyData } = await supabase
        .from("orders")
        .select("id, account_ID, assigned_to, status_order, order_number")
        .eq("id", order.id)
        .single();
      
      console.log('=== VERIFICAÇÃO account_ID ===');
      console.log('Dados após update:', verifyData);

      // Step 2: Call n8n webhook with operation_account_id
      try {
        // Prepare payload with correct field names and values
        const payload = {
          translationOrderId: order.order_number,
          AccountId: profile.operation_account_id,
        };

        // ===== LOG 5: ANTES DE CHAMAR WEBHOOK =====
        console.log('=== CHAMANDO WEBHOOK N8N ===');
        console.log('Payload:', payload);
        console.log('URL:', 'https://automations.lytech.global/webhook/45450e61-deeb-429e-b803-7c4419e6c138');
        
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
        
        // ===== LOG 6: RESPOSTA DO WEBHOOK =====
        console.log('=== RESPOSTA N8N ===');
        console.log('Status:', webhookResponse.status);
        console.log('Status OK?:', webhookResponse.ok);
        console.log('Response text:', responseText);

        let responseData = null;
        if (responseText && responseText.trim()) {
          try {
            responseData = JSON.parse(responseText);
            console.log('Response data parsed:', responseData);
            
            // Check for known n8n errors
            if (responseData.error) {
              console.error('=== ERRO RETORNADO PELO N8N ===');
              console.error('Erro:', responseData.error);
              
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
            
            // ===== LOG 7: SALVANDO SERVICE_ORDER_LINK =====
            if (responseData.ServiceOrderLink || responseData.Id) {
              const linkToSave = responseData.ServiceOrderLink || responseData.Id;
              
              console.log('=== SALVANDO SERVICE_ORDER_LINK ===');
              console.log('Link a salvar:', linkToSave);
              console.log('Order ID:', order.id);
              
              const { data: updateLinkResult, error: updateError } = await supabase
                .from("orders")
                .update({
                  service_order_link: linkToSave,
                } as any)
                .eq("id", order.id)
                .select();

              console.log('Update link result:', updateLinkResult);
              console.log('Update link error:', updateError);

              if (updateError) {
                console.error("=== ERRO AO SALVAR LINK ===");
                console.error('Erro:', updateError);
              } else {
                console.log('=== LINK SALVO COM SUCESSO ===');
                console.log('ServiceOrderLink salvo:', linkToSave);
              }

              return { 
                success: true, 
                serviceOrderLink: linkToSave 
              };
            }
          } catch (parseError) {
            console.error('=== ERRO AO FAZER PARSE DO JSON ===');
            console.error('Parse error:', parseError);
            console.log('Resposta recebida:', responseText);
          }
        } else {
          console.warn('=== WEBHOOK RETORNOU RESPOSTA VAZIA ===');
          console.warn('Pedido atribuído mas sem link');
        }

        if (!webhookResponse.ok) {
          console.error("=== WEBHOOK RETORNOU ERRO HTTP ===");
          console.error("Status:", webhookResponse.status);
        }
      } catch (webhookError) {
        console.error("=== ERRO AO CHAMAR WEBHOOK ===");
        console.error('Erro completo:', webhookError);
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
      <Sidebar userRole={userRole || ""} />
      
      <div className={mainContainerClass}>
        <Header userName={profile?.full_name || user?.email || ""} userRole={userRole} />
        
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
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {order.order_number}
                              {order.is_urgent && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Urgente
                                </Badge>
                              )}
                            </div>
                            
                            {/* Service Type and Tags Row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Service Type Icon */}
                              {order.service_type && (
                                <div className="flex items-center gap-1.5">
                                  {order.service_type === "Drive" ? (
                                    <img 
                                      src={googleDriveLogo} 
                                      alt="Google Drive" 
                                      className="h-4 w-4"
                                    />
                                  ) : order.service_type === "Diagramação" ? (
                                    <>
                                      <Hammer className="h-4 w-4 text-purple-600" />
                                      {(order as any).pages_count_diagramming ? (
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30">
                                          {(order as any).pages_count_diagramming} pág
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30">
                                          ⚠️ Páginas não informadas
                                        </Badge>
                                      )}
                                    </>
                                  ) : null}
                                  <span className="text-sm text-muted-foreground">
                                    {order.service_type}
                                  </span>
                                </div>
                              )}
                              
                              {/* Tags */}
                              {order.tags && order.tags.length > 0 && (
                                <div className="flex gap-1.5">
                                  {order.tags.map((tag: string) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className={
                                        tag === "Carimbos"
                                          ? "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800"
                                          : tag === "Assinaturas"
                                          ? "bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-800"
                                          : tag === "Apostila"
                                          ? "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-800"
                                          : ""
                                      }
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{order.document_count}</TableCell>
                        <TableCell>
                          {format(toZonedTime(new Date(order.deadline), "America/Sao_Paulo"), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          {order.attribution_date &&
                            format(toZonedTime(new Date(order.attribution_date), "America/Sao_Paulo"), "dd/MM/yyyy HH:mm", {
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
                      <TableHead>Cliente</TableHead>
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
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Service Type Icon */}
                            <div className="flex items-center gap-1.5">
                              {order.service_type === "Drive" ? (
                                <img 
                                  src={googleDriveLogo} 
                                  alt="Google Drive" 
                                  className="h-4 w-4"
                                />
                              ) : order.service_type === "Diagramação" ? (
                                <Hammer className="h-4 w-4 text-muted-foreground" />
                              ) : null}
                              <span className="text-sm text-muted-foreground">
                                {order.service_type}
                              </span>
                            </div>
                            
                            {/* Tags */}
                            {order.tags && order.tags.length > 0 && (
                              <div className="flex gap-1.5">
                                {order.tags.map((tag: string) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className={
                                      tag === "Carimbos"
                                        ? "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800"
                                        : tag === "Assinaturas"
                                        ? "bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-800"
                                        : tag === "Apostila"
                                        ? "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-800"
                                        : ""
                                    }
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{order.document_count}</TableCell>
                        <TableCell>
                          {format(toZonedTime(new Date(order.deadline), "America/Sao_Paulo"), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          {order.assigned_at &&
                            format(toZonedTime(new Date(order.assigned_at), "America/Sao_Paulo"), "dd/MM/yyyy HH:mm", {
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