import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Package, AlertTriangle, Edit, Save, ArrowUpDown, Trash2, ChevronLeft, ChevronRight, Clock, Hammer, Eye } from "lucide-react";
import googleDriveLogo from "@/assets/google-drive-logo.png";
import { Badge } from "@/components/ui/badge";
import { OrderFilters, OrderFilters as OrderFiltersType } from "@/components/orders/OrderFilters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";

export function Orders() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState("");
  const [isEditingLastOrder, setIsEditingLastOrder] = useState(false);
  const [tempLastOrderId, setTempLastOrderId] = useState("");
  const [sortBy, setSortBy] = useState("most_recent");
  const [urgentDialogOpen, setUrgentDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [urgentDocumentCount, setUrgentDocumentCount] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [hasPendencies, setHasPendencies] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isAttentionMode, setIsAttentionMode] = useState(false);
  const [selectedAttentionOrders, setSelectedAttentionOrders] = useState<Set<string>>(new Set());
  const [isDelayMode, setIsDelayMode] = useState(false);
  const [selectedDelayOrders, setSelectedDelayOrders] = useState<Set<string>>(new Set());
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewOpenedAt, setPreviewOpenedAt] = useState<Date | null>(null);
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
    hasAttention: "all",
    hasDelay: "all",
  });
  // Set default deadline to current time + 1 day
  const getDefaultDeadline = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return format(tomorrow, "yyyy-MM-dd'T'HH:mm");
  };

  // Utility function to get next business day
  const getNextBusinessDay = (date: Date): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + 1);
    
    // Se cair em sábado (6), pular para segunda
    if (result.getDay() === 6) {
      result.setDate(result.getDate() + 2);
    }
    // Se cair em domingo (0), pular para segunda
    else if (result.getDay() === 0) {
      result.setDate(result.getDate() + 1);
    }
    
    result.setHours(18, 0, 0, 0);
    return result;
  };

  // Calculate deadline based on urgency tag
  const calculateDeadlineByTag = (attributionDate: string, tag: "1-dia-util" | "mesmo-dia"): string => {
    const baseDate = new Date(attributionDate);
    
    if (tag === "mesmo-dia") {
      // Mesmo dia às 18:00h
      const deadline = new Date(baseDate);
      deadline.setHours(18, 0, 0, 0);
      return format(deadline, "yyyy-MM-dd'T'HH:mm");
    } else {
      // 1 dia útil - próximo dia útil às 18:00h
      const deadline = getNextBusinessDay(baseDate);
      return format(deadline, "yyyy-MM-dd'T'HH:mm");
    }
  };

  const [formData, setFormData] = useState({
    order_number: "",
    document_count: "",
    deadline: getDefaultDeadline(),
    attribution_date: "",
    customer: "",
    serviceType: "",
    tags: [] as string[],
    pages_count_diagramming: "",
    documents: [] as Array<{ quantity: string, pages: string }>,
    totalDocuments: "",
    driveDocuments: "",
    urgencyTag: null as "1-dia-util" | "mesmo-dia" | null,
  });
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    order_number: "",
    document_count: "",
    deadline: "",
    attribution_date: "",
    delivered_at: "",
    customer: "",
    serviceType: "",
    tags: [] as string[],
    pages_count_diagramming: "",
    documents: [] as Array<{ quantity: string, pages: string }>,
    totalDocuments: "",
    driveDocuments: "",
    urgencyTag: null as "1-dia-util" | "mesmo-dia" | null,
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
        .select(`*, assigned_profile:profiles!assigned_to(full_name, email)`)
        .order("is_urgent", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Toggle attention mutation
  const { mutate: toggleAttention, isPending: isToggleAttentionPending } = useMutation({
    mutationFn: async (orderIds: string[]) => {
      // Feature temporarily disabled - has_attention column type sync issue
      // console.log("Toggle attention feature temporarily disabled", orderIds);
      // toast({
      //   variant: "destructive",
      //   title: "Funcionalidade temporariamente desabilitada",
      //   description: "A funcionalidade de atenção está temporariamente desabilitada.",
      // });
      // return;

      const { error } = await supabase
        .from("orders")
        .update({ has_attention: true })
        .in("id", orderIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Atenção marcada",
        description: "As ordens selecionadas foram marcadas como de atenção.",
      });
      setIsAttentionMode(false);
      setSelectedAttentionOrders(new Set());
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar atenção",
        description: error.message,
        variant: "destructive",
      });
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
      const trimmedValue = value.trim();
      const { error } = await supabase
        .from("system_settings")
        .upsert({ 
          key: "last_document_id", 
          value: trimmedValue,
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
      let totalDocuments = 0;
      let totalPages = 0;
      let driveDocCount = 0;
      let diagrammingDocCount = 0;
      let diagrammingPagesTotal = 0;
      let driveValue = 0;
      let diagrammingValue = 0;
      let diagrammingDetails: Array<{ quantity: number; pages: number }> = [];
      
      // Calcular baseado no tipo de serviço
      if (data.serviceType === "Drive") {
        // Drive puro
        driveDocCount = parseInt(data.document_count);
        totalDocuments = driveDocCount;
        driveValue = driveDocCount * 1.30;
        
      } else if (data.serviceType === "Diagramação") {
        // Diagramação pura
        if (data.documents.length === 0) {
          throw new Error("Adicione pelo menos um documento para serviços de Diagramação");
        }
        
        diagrammingDocCount = data.documents.reduce((sum, doc) => sum + parseInt(doc.quantity || "0"), 0);
        diagrammingPagesTotal = data.documents.reduce((sum, doc) => sum + (parseInt(doc.quantity || "0") * parseInt(doc.pages || "0")), 0);
        totalDocuments = diagrammingDocCount;
        diagrammingValue = diagrammingPagesTotal * 3.00;
        diagrammingDetails = data.documents.map(d => ({
          quantity: parseInt(d.quantity),
          pages: parseInt(d.pages)
        }));
        
      } else if (data.serviceType === "Drive + Diagramação") {
        // Híbrido - usar campos separados
        driveDocCount = parseInt(data.driveDocuments || "0");
        diagrammingDocCount = data.documents.reduce((sum, doc) => sum + parseInt(doc.quantity || "0"), 0);
        diagrammingPagesTotal = data.documents.reduce((sum, doc) => sum + (parseInt(doc.quantity || "0") * parseInt(doc.pages || "0")), 0);
        totalDocuments = parseInt(data.totalDocuments);
        driveValue = driveDocCount * 1.30;
        diagrammingValue = diagrammingPagesTotal * 3.00;
        diagrammingDetails = data.documents.map(d => ({
          quantity: parseInt(d.quantity),
          pages: parseInt(d.pages)
        }));
        
      } else {
        // Fallback para tipos antigos
        totalDocuments = parseInt(data.document_count);
      }

      const insertData: any = {
        order_number: data.order_number.trim(),
        document_count: totalDocuments,
        deadline: new Date(data.deadline).toISOString(),
        created_by: user?.id,
        status_order: "available",
        customer: data.customer || null,
        service_type: data.serviceType || null,
        tags: data.tags.length > 0 ? data.tags : null,
        // Novos campos separados
        drive_document_count: driveDocCount,
        diagramming_document_count: diagrammingDocCount,
        diagramming_pages_total: diagrammingPagesTotal,
        diagramming_details: diagrammingDetails,
        drive_value: driveValue,
        diagramming_value: diagrammingValue,
      };
      
      // Manter campos legados para compatibilidade
      if (data.serviceType === "Diagramação" && diagrammingPagesTotal > 0) {
        insertData.pages_count_diagramming = diagrammingPagesTotal;
        insertData.custom_value_diagramming = diagrammingValue;
      }
      
      if (data.serviceType === "Drive + Diagramação") {
        insertData.pages_count_diagramming = diagrammingPagesTotal;
        insertData.custom_value_diagramming = driveValue + diagrammingValue;
      }

      // Add optional fields if provided
      if (data.attribution_date) {
        insertData.attribution_date = new Date(data.attribution_date).toISOString();
      }
      
      // Add urgency_tag if provided
      if (data.urgencyTag) {
        insertData.urgency_tag = data.urgencyTag;
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
          deadline: getDefaultDeadline(),
          attribution_date: "",
          customer: "",
          serviceType: "",
          tags: [],
          pages_count_diagramming: "",
          documents: [],
          totalDocuments: "",
          driveDocuments: "",
          urgencyTag: null,
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
      // ===== LOG 1: DADOS INICIAIS =====
      console.log('=== INÍCIO TAKE ORDER (Orders.tsx) ===');
      console.log('Order ID:', orderId);
      console.log('User ID:', user?.id);
      console.log('Profile operation_account_id:', profile?.operation_account_id);
      console.log('Profile completo:', profile);
      
      // Check if user has operation_account_id configured
      if (!profile?.operation_account_id) {
        console.error('ERRO: operation_account_id não configurado');
        throw new Error("Peça ao admin o cadastro da plataforma ops");
      }

      // Get the full order details to access order_number
      const { data: orderData, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      
      if (fetchError) {
        console.error('ERRO ao buscar order:', fetchError);
        throw fetchError;
      }

      console.log('Order Number:', orderData.order_number);

      // ===== LOG 2: ANTES DE ATUALIZAR NO SUPABASE =====
      const updateData = {
        assigned_to: user?.id,
        assigned_at: new Date().toISOString(),
        status_order: "in_progress",
        account_ID: profile.operation_account_id,
      };
      console.log('=== ATUALIZANDO SUPABASE ===');
      console.log('Update data:', updateData);
      console.log('Order ID a ser atualizado:', orderId);

      // Step 1: Update order in Supabase with operation account ID
      const { data: updateResult, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
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
        .eq("id", orderId)
        .single();
      
      console.log('=== VERIFICAÇÃO account_ID ===');
      console.log('Dados após update:', verifyData);

      // Step 2: Call n8n webhook to generate service order link
      try {
        const payload = {
          translationOrderId: orderData.order_number,
          AccountId: profile.operation_account_id,
        };

        console.log('=== CHAMANDO WEBHOOK N8N ===');
        console.log('Payload:', payload);
        console.log('URL:', 'https://automations.lytech.global/webhook/45450e61-deeb-429e-b803-7c4419e6c138');

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

        const responseText = await webhookResponse.text();
        
        console.log('=== RESPOSTA N8N ===');
        console.log('Status:', webhookResponse.status);
        console.log('Status OK?:', webhookResponse.ok);
        console.log('Response text:', responseText);
        
        if (!webhookResponse.ok) {
          console.error('Webhook failed with status:', webhookResponse.status);
          console.error('Response:', responseText);
          throw new Error(`Webhook retornou status ${webhookResponse.status}`);
        }

        let webhookData;
        try {
          webhookData = JSON.parse(responseText);
          console.log('Webhook data parsed:', webhookData);
        } catch (parseError) {
          console.error('Erro ao fazer parse da resposta:', parseError);
          throw new Error("Erro ao processar resposta do webhook");
        }

        // Save service_order_link if returned (check all possible keys)
        if (webhookData?.ServiceOrderLink || webhookData?.serviceOrderLink || webhookData?.service_order_link) {
          const linkToSave = webhookData.ServiceOrderLink || webhookData.serviceOrderLink || webhookData.service_order_link;
          
          console.log('=== SALVANDO SERVICE_ORDER_LINK ===');
          console.log('Link a salvar:', linkToSave);
          
          const { error: linkError } = await supabase
            .from("orders")
            .update({ service_order_link: linkToSave })
            .eq("id", orderId);

          if (linkError) {
            console.error('Erro ao salvar service_order_link:', linkError);
          } else {
            console.log('service_order_link salvo com sucesso!');
          }
        } else {
          console.warn('Webhook não retornou service_order_link');
          console.log('Chaves disponíveis na resposta:', Object.keys(webhookData));
        }
      } catch (webhookError) {
        console.error('=== ERRO NO WEBHOOK ===');
        console.error('Erro completo:', webhookError);
        // Não vamos bloquear a atribuição do pedido se o webhook falhar
        // apenas logamos o erro
      }
    },
    onSuccess: () => {
      console.log("takeOrderMutation onSuccess: Invalidando e refazendo queries.");
      queryClient.refetchQueries({ queryKey: ["orders"] });
      queryClient.refetchQueries({ queryKey: ["my-orders", user?.id] });
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
    mutationFn: async ({ orderId, isUrgent, urgentDocumentCount }: { orderId: string; isUrgent: boolean; urgentDocumentCount?: number }) => {
      const updateData: any = { is_urgent: isUrgent };
      
      // If setting as urgent, include the document count
      if (isUrgent && urgentDocumentCount !== undefined) {
        updateData.urgent_document_count = urgentDocumentCount;
      } else if (!isUrgent) {
        // If removing urgency, set count to 0
        updateData.urgent_document_count = 0;
      }
      
      const { error } = await supabase
        .from("orders")
        .update(updateData)
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

  // Check pendencies mutation
  const checkPendenciesMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from("pendencies")
        .select("*")
        .eq("order_id", orderId);
      
      if (error) throw error;
      return data && data.length > 0;
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("orders")
        .update(data.updates)
        .eq("id", data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Pedido atualizado",
        description: "O pedido foi atualizado com sucesso.",
      });
      setIsEditDialogOpen(false);
      setEditingOrder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // First check if there are pendencies
      const hasPendencies = await checkPendenciesMutation.mutateAsync(orderId);
      
      if (hasPendencies) {
        // Delete pendencies first
        const { error: pendenciesError } = await supabase
          .from("pendencies")
          .delete()
          .eq("order_id", orderId);
        
        if (pendenciesError) throw pendenciesError;
      }
      
      // Then delete the order
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Pedido excluído",
        description: "O pedido e suas pendências foram excluídos com sucesso.",
      });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      setHasPendencies(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (order: any) => {
    setEditingOrder(order);
    
    // Preparar documents array se existir diagramming_details
    let documentsArray: Array<{ quantity: string, pages: string }> = [];
    if (order.diagramming_details && Array.isArray(order.diagramming_details)) {
      documentsArray = order.diagramming_details.map((d: any) => ({
        quantity: d.quantity?.toString() || "1",
        pages: d.pages?.toString() || "0"
      }));
    }
    
    setEditFormData({
      order_number: order.order_number,
      document_count: order.document_count.toString(),
      deadline: order.deadline ? format(new Date(order.deadline), "yyyy-MM-dd'T'HH:mm") : "",
      attribution_date: order.attribution_date ? format(new Date(order.attribution_date), "yyyy-MM-dd'T'HH:mm") : "",
      delivered_at: order.delivered_at ? format(new Date(order.delivered_at), "yyyy-MM-dd'T'HH:mm") : "",
      customer: order.customer || "",
      serviceType: order.service_type || "",
      tags: order.tags || [],
      pages_count_diagramming: (order as any).pages_count_diagramming?.toString() || "",
      documents: documentsArray,
      totalDocuments: order.document_count?.toString() || "",
      driveDocuments: order.drive_document_count?.toString() || "",
      urgencyTag: null,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação adicional para Diagramação
    if (editFormData.serviceType === "Diagramação" && !editFormData.pages_count_diagramming) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o número de páginas para serviços de Diagramação",
        variant: "destructive",
      });
      return;
    }

    const updates: any = {
      order_number: editFormData.order_number.trim(),
      document_count: parseInt(editFormData.document_count),
      deadline: new Date(editFormData.deadline).toISOString(),
      customer: editFormData.customer,
      service_type: editFormData.serviceType,
      tags: editFormData.tags,
    };
    
    // Recalcular custom_value_diagramming se pages_count_diagramming for alterado
    if (editFormData.serviceType === "Diagramação" && editFormData.pages_count_diagramming) {
      const pagesCount = parseInt(editFormData.pages_count_diagramming);
      updates.pages_count_diagramming = pagesCount;
      updates.custom_value_diagramming = pagesCount * 3;
    } else if (editFormData.serviceType && editFormData.serviceType !== "Diagramação") {
      // Se mudou de Diagramação para outro tipo, limpar campos
      updates.pages_count_diagramming = null;
      updates.custom_value_diagramming = null;
    }

    if (editFormData.attribution_date) {
      updates.attribution_date = new Date(editFormData.attribution_date).toISOString();
    }
    
    // Add urgency_tag if provided
    if (editFormData.urgencyTag) {
      updates.urgency_tag = editFormData.urgencyTag;
    }
    
    if (editFormData.delivered_at) {
      updates.delivered_at = new Date(editFormData.delivered_at).toISOString();
      updates.status_order = "delivered";
    }
    
    updateOrderMutation.mutate({
      id: editingOrder.id,
      updates,
    });
  };

  const handleDeleteClick = async (order: any) => {
    setOrderToDelete(order);
    // Check if there are pendencies
    try {
      const hasPend = await checkPendenciesMutation.mutateAsync(order.id);
      setHasPendencies(hasPend);
    } catch {
      setHasPendencies(false);
    }
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (orderToDelete) {
      deleteOrderMutation.mutate(orderToDelete.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação adicional para Diagramação
    if (formData.serviceType === "Diagramação") {
      if (formData.documents.length === 0) {
        toast({
          title: "Erro de validação",
          description: "Adicione pelo menos um documento para serviços de Diagramação",
          variant: "destructive",
        });
        return;
      }
      
      const hasIncompleteDoc = formData.documents.some(d => !d.quantity || !d.pages || parseInt(d.pages) <= 0);
      if (hasIncompleteDoc) {
        toast({
          title: "Erro de validação",
          description: "Preencha quantidade e páginas (>0) para todos os documentos",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Validação ROBUSTA para Drive + Diagramação
    if (formData.serviceType === "Drive + Diagramação") {
      if (!formData.totalDocuments || !formData.driveDocuments) {
        toast({
          title: "Erro de validação",
          description: "Informe a quantidade total de documentos e a quantidade do Drive",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.documents.length === 0) {
        toast({
          title: "Erro de validação",
          description: "Adicione pelo menos um documento na seção Diagramação",
          variant: "destructive",
        });
        return;
      }
      
      const hasIncompleteDoc = formData.documents.some(d => !d.quantity || !d.pages || parseInt(d.pages) <= 0);
      if (hasIncompleteDoc) {
        toast({
          title: "Erro de validação",
          description: "Preencha páginas (>0) para todos os documentos da Diagramação",
          variant: "destructive",
        });
        return;
      }
      
      // VALIDAÇÃO MATEMÁTICA CRÍTICA
      const driveCount = parseInt(formData.driveDocuments);
      const diagramacaoCount = formData.documents.reduce((sum, d) => sum + parseInt(d.quantity || "0"), 0);
      const totalDeclared = parseInt(formData.totalDocuments);
      const totalActual = driveCount + diagramacaoCount;
      
      if (totalActual !== totalDeclared) {
        const difference = totalDeclared - totalActual;
        const message = difference > 0 
          ? `⚠️ FALTAM ${difference} documento(s)\n\nTotal declarado: ${totalDeclared} docs\nDrive: ${driveCount} docs\nDiagramação: ${diagramacaoCount} docs\nTotal atual: ${totalActual} docs`
          : `⚠️ SOBRAM ${Math.abs(difference)} documento(s)\n\nTotal declarado: ${totalDeclared} docs\nDrive: ${driveCount} docs\nDiagramação: ${diagramacaoCount} docs\nTotal atual: ${totalActual} docs`;
        
        toast({
          title: "Erro de validação matemática",
          description: message,
          variant: "destructive",
        });
        return;
      }
    }
    
    createOrderMutation.mutate(formData);
  };

  const isAdmin = profile?.role === "admin";
  const isMaster = profile?.role === "master";
  const isOwner = profile?.role === "owner";
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

    // Attention filter
    if (filters.hasAttention !== "all") {
      result = result.filter(order => 
        filters.hasAttention === "true" ? order.has_attention : !order.has_attention
      );
    }

    // Delay filter
    if (filters.hasDelay !== "all") {
      result = result.filter(order => 
        filters.hasDelay === "true" ? order.has_delay : !order.has_delay
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
      case "most_recent":
        sortedResult.sort((a, b) => {
          // Sort by creation date only (most recent first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        break;
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy]);

  // Reset urgency tag when customer changes from Yellowling
  useEffect(() => {
    if (formData.customer !== "Yellowling" && formData.urgencyTag) {
      setFormData(prev => ({ ...prev, urgencyTag: null }));
    }
  }, [formData.customer]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={profile?.role || "operation"} />
      
      <div className={mainContainerClass}>
        <Header userName={profile?.full_name || user?.email || ""} userRole={profile?.role || "operation"} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
            
            {(isAdmin || isMaster || isOwner) && (
              <div className="flex gap-2">
                <Dialog 
                  open={isPreviewDialogOpen} 
                  onOpenChange={(open) => {
                    setIsPreviewDialogOpen(open);
                    if (open) {
                      setPreviewOpenedAt(new Date());
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Yellowling
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <div className="flex items-center justify-between">
                        <DialogTitle>Preview de Pedidos - Yellowling</DialogTitle>
                        <img 
                          src="/imperia-logo.png" 
                          alt="Imperia Logo" 
                          className="h-10 object-contain"
                        />
                      </div>
                      {previewOpenedAt && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Aberto em: {format(previewOpenedAt, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                        </p>
                      )}
                    </DialogHeader>
                    
                    <div className="mt-4">
                      {orders?.filter(order => order.customer === "Yellowling").length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum pedido da Yellowling encontrado.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID Pedido</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Data de Atribuição</TableHead>
                              <TableHead>Deadline</TableHead>
                              <TableHead>Tags</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orders?.filter(order => order.customer === "Yellowling").map((order) => (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">
                                  {order.order_number}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{order.customer}</Badge>
                                </TableCell>
                                <TableCell>
                                  {order.attribution_date
                                    ? format(new Date(order.attribution_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(order.deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {(order as any).urgency_tag && (
                                      <Badge 
                                        className={cn(
                                          "text-xs",
                                          (order as any).urgency_tag === "1-dia-util" 
                                            ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
                                            : "bg-red-500 hover:bg-red-600 text-white"
                                        )}
                                      >
                                        {(order as any).urgency_tag === "1-dia-util" ? "🟨 1 dia útil" : "🟥 Mesmo dia"}
                                      </Badge>
                                    )}
                                    {order.tags && order.tags.length > 0 && (
                                      order.tags.map((tag: string) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))
                                    )}
                                    {!(order as any).urgency_tag && (!order.tags || order.tags.length === 0) && (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

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
                      <Label htmlFor="customer">Cliente *</Label>
                      <Select
                        value={formData.customer}
                        onValueChange={(value) =>
                          setFormData({ ...formData, customer: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cidadania4y">Cidadania4y</SelectItem>
                          <SelectItem value="Yellowling">Yellowling</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="serviceType">Tipo de Serviço *</Label>
                      <Select
                        value={formData.serviceType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, serviceType: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Drive">Drive</SelectItem>
                          <SelectItem value="Diagramação">Diagramação</SelectItem>
                          <SelectItem value="Drive + Diagramação">Drive + Diagramação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tags</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={formData.tags.includes("Carimbos") ? "default" : "outline"}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              tags: formData.tags.includes("Carimbos")
                                ? formData.tags.filter(t => t !== "Carimbos")
                                : [...formData.tags, "Carimbos"]
                            });
                          }}
                        >
                          Carimbos
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={formData.tags.includes("Assinaturas") ? "default" : "outline"}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              tags: formData.tags.includes("Assinaturas")
                                ? formData.tags.filter(t => t !== "Assinaturas")
                                : [...formData.tags, "Assinaturas"]
                            });
                          }}
                        >
                          Assinaturas
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={formData.tags.includes("Apostila") ? "default" : "outline"}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              tags: formData.tags.includes("Apostila")
                                ? formData.tags.filter(t => t !== "Apostila")
                                : [...formData.tags, "Apostila"]
                            });
                          }}
                        >
                          Apostila
                        </Button>
                      </div>
                    </div>

                    {/* Campos para Drive + Diagramação */}
        {formData.serviceType === "Drive + Diagramação" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="total_documents" className="text-base font-semibold">Quantidade Total de Documentos *</Label>
              <Input
                id="total_documents"
                type="number"
                min="1"
                value={formData.totalDocuments}
                onChange={(e) => setFormData({ ...formData, totalDocuments: e.target.value })}
                placeholder="Ex: 10"
                required
              />
              <p className="text-xs text-muted-foreground">
                Total de documentos do pedido (será dividido entre Drive e Diagramação)
              </p>
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Drive</Label>
              <div className="mt-2 space-y-2">
                <Label htmlFor="drive_documents">Quantidade de Documentos *</Label>
                <Input
                  id="drive_documents"
                  type="number"
                  min="0"
                  value={formData.driveDocuments}
                  onChange={(e) => setFormData({ ...formData, driveDocuments: e.target.value })}
                  placeholder="Ex: 2"
                  required
                />
                {formData.driveDocuments && (
                  <div className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 p-2 rounded">
                    💰 {parseInt(formData.driveDocuments)} doc × R$ 1,30 = <strong>R$ {(parseInt(formData.driveDocuments) * 1.30).toFixed(2)}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-base font-semibold">Diagramação</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      documents: [...formData.documents, { quantity: "1", pages: "" }]
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Documento
                </Button>
              </div>

              {formData.documents.length === 0 && (
                <div className="text-sm text-muted-foreground text-center p-4 border border-dashed rounded">
                  Clique em "Adicionar Documento" para começar
                </div>
              )}

              {formData.documents.map((doc, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg bg-muted/30 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Documento {index + 1}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newDocs = formData.documents.filter((_, i) => i !== index);
                        setFormData({ ...formData, documents: newDocs });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`doc-quantity-${index}`} className="text-xs">Quantidade de Documentos *</Label>
                      <Input
                        id={`doc-quantity-${index}`}
                        type="number"
                        value="1"
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Sempre 1 documento</p>
                    </div>
                    <div>
                      <Label htmlFor={`doc-pages-${index}`} className="text-xs">Número de Páginas *</Label>
                      <Input
                        id={`doc-pages-${index}`}
                        type="number"
                        min="1"
                        value={doc.pages}
                        onChange={(e) => {
                          const newDocs = [...formData.documents];
                          newDocs[index].pages = e.target.value;
                          setFormData({ ...formData, documents: newDocs });
                        }}
                        placeholder="Ex: 10"
                        required
                      />
                    </div>
                  </div>
                  {doc.pages && (
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                      💰 1 doc × {parseInt(doc.pages)} pág × R$ 3,00 = <strong>R$ {(parseInt(doc.pages) * 3).toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total Geral */}
            {formData.totalDocuments && formData.driveDocuments && formData.documents.length > 0 && formData.documents.every(d => d.pages) && (
              <div className="text-sm font-semibold bg-primary/10 p-3 rounded border-2 border-primary/20">
                <div className="mb-2">
                  📊 Conferência de Documentos:
                  <div className="text-sm text-muted-foreground font-normal mt-1">
                    Drive: {parseInt(formData.driveDocuments)} docs + 
                    Diagramação: {formData.documents.length} doc{formData.documents.length !== 1 ? 's' : ''} = {' '}
                    <strong className={
                      parseInt(formData.driveDocuments) + formData.documents.length === parseInt(formData.totalDocuments)
                        ? "text-green-600"
                        : "text-red-600"
                    }>
                      {parseInt(formData.driveDocuments) + formData.documents.length}
                    </strong>
                    {' '}/ {parseInt(formData.totalDocuments)} declarados
                  </div>
                </div>
                <div className="text-lg mt-2">
                  💰 Valor Total:
                  {(() => {
                    const driveValue = parseInt(formData.driveDocuments) * 1.30;
                    const totalPages = formData.documents.reduce((sum, d) => sum + parseInt(d.pages || "0"), 0);
                    const diagramacaoValue = totalPages * 3;
                    const totalValue = driveValue + diagramacaoValue;
                    return (
                      <>
                        <div className="text-base text-muted-foreground font-normal mt-1">
                          Drive: R$ {driveValue.toFixed(2)} + Diagramação: R$ {diagramacaoValue.toFixed(2)}
                        </div>
                        <div className="text-primary">
                          <strong>R$ {totalValue.toFixed(2)}</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

                    {/* Campo condicional para Diagramação */}
        {formData.serviceType === "Diagramação" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Documentos *</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setFormData({
                    ...formData,
                    documents: [...formData.documents, { quantity: "", pages: "" }]
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Documento
              </Button>
            </div>

            {formData.documents.length === 0 && (
              <div className="text-sm text-muted-foreground text-center p-4 border border-dashed rounded">
                Clique em "Adicionar Documento" para começar
              </div>
            )}

            {formData.documents.map((doc, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Documento {index + 1}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newDocs = formData.documents.filter((_, i) => i !== index);
                      setFormData({ ...formData, documents: newDocs });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`doc-quantity-${index}`} className="text-xs">Quantidade de Documentos *</Label>
                    <Input
                      id={`doc-quantity-${index}`}
                      type="number"
                      min="1"
                      value={doc.quantity}
                      onChange={(e) => {
                        const newDocs = [...formData.documents];
                        newDocs[index].quantity = e.target.value;
                        setFormData({ ...formData, documents: newDocs });
                      }}
                      placeholder="Ex: 5"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`doc-pages-${index}`} className="text-xs">Número de Páginas *</Label>
                    <Input
                      id={`doc-pages-${index}`}
                      type="number"
                      min="1"
                      value={doc.pages}
                      onChange={(e) => {
                        const newDocs = [...formData.documents];
                        newDocs[index].pages = e.target.value;
                        setFormData({ ...formData, documents: newDocs });
                      }}
                      placeholder="Ex: 10"
                      required
                    />
                  </div>
                </div>
                {doc.quantity && doc.pages && (
                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                    💰 {parseInt(doc.quantity)} doc × {parseInt(doc.pages)} pág × R$ 3,00 = <strong>R$ {(parseInt(doc.quantity) * parseInt(doc.pages) * 3).toFixed(2)}</strong>
                  </div>
                )}
              </div>
            ))}

            {formData.documents.length > 0 && formData.documents.every(d => d.quantity && d.pages) && (
              <div className="text-sm font-semibold bg-primary/10 p-3 rounded border-2 border-primary/20">
                🎯 Total Geral:
                <div className="text-lg mt-1">
                  {(() => {
                    const totalDocs = formData.documents.reduce((sum, d) => sum + parseInt(d.quantity || "0"), 0);
                    const totalPages = formData.documents.reduce((sum, d) => sum + (parseInt(d.quantity || "0") * parseInt(d.pages || "0")), 0);
                    const totalValue = totalPages * 3;
                    return (
                      <>
                        <div className="text-base text-muted-foreground">
                          📄 {totalDocs} documento{totalDocs !== 1 ? 's' : ''} • 📃 {totalPages} página{totalPages !== 1 ? 's' : ''}
                        </div>
                        <div className="text-primary">
                          <strong>R$ {totalValue.toFixed(2)}</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {formData.serviceType === "Drive" && (
          <div className="space-y-2">
            <Label htmlFor="document_count">Quantidade de Documentos *</Label>
            <Input
              id="document_count"
              type="number"
              min="1"
              value={formData.document_count}
              onChange={(e) => setFormData({ ...formData, document_count: e.target.value })}
              placeholder="Ex: 20"
              required
            />
            {formData.document_count && (
              <div className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 p-2 rounded">
                💰 Valor calculado: <strong>R$ {(parseInt(formData.document_count) * 1.30).toFixed(2)}</strong>
                <span className="text-xs block mt-1">(R$ 1,30 por documento)</span>
              </div>
            )}
          </div>
        )}

                    <div>
                      <Label htmlFor="order_number">ID do Pedido *</Label>
                      <Input
                        id="order_number"
                        placeholder="Ex: PED-001"
                        value={formData.order_number}
                        onChange={(e) =>
                          setFormData({ ...formData, order_number: e.target.value.trim() })
                        }
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="attribution_date">Data de Atribuição</Label>
                      <div className="flex gap-2">
                        <Input
                          id="attribution_date"
                          type="datetime-local"
                          value={formData.attribution_date}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setFormData({ 
                              ...formData, 
                              attribution_date: newValue,
                              // Se mudar a data e já tinha tag selecionada, recalcular
                              deadline: formData.urgencyTag && newValue 
                                ? calculateDeadlineByTag(newValue, formData.urgencyTag)
                                : formData.deadline
                            });
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
                            setFormData({ ...formData, attribution_date: now, urgencyTag: null });
                          }}
                          className="text-xs px-3 shrink-0"
                        >
                          Agora
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Opcional - Data quando o pedido foi atribuído
                      </p>
                    </div>

                    {/* Tags de Urgência - apenas para Yellowling */}
                    {formData.customer === "Yellowling" && formData.attribution_date && (
                      <div>
                        <Label>Prazo de Entrega</Label>
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={formData.urgencyTag === "1-dia-util" ? "default" : "outline"}
                            className={cn(
                              "flex-1",
                              formData.urgencyTag === "1-dia-util" 
                                ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
                                : "border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                            )}
                            onClick={() => {
                              const newDeadline = calculateDeadlineByTag(formData.attribution_date, "1-dia-util");
                              setFormData({ 
                                ...formData, 
                                urgencyTag: "1-dia-util",
                                deadline: newDeadline
                              });
                            }}
                          >
                            🟨 1 dia útil
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={formData.urgencyTag === "mesmo-dia" ? "default" : "outline"}
                            className={cn(
                              "flex-1",
                              formData.urgencyTag === "mesmo-dia" 
                                ? "bg-red-500 hover:bg-red-600 text-white" 
                                : "border-red-500 text-red-600 hover:bg-red-50"
                            )}
                            onClick={() => {
                              const newDeadline = calculateDeadlineByTag(formData.attribution_date, "mesmo-dia");
                              setFormData({ 
                                ...formData, 
                                urgencyTag: "mesmo-dia",
                                deadline: newDeadline
                              });
                            }}
                          >
                            🟥 Mesmo dia
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Selecione o prazo para calcular a deadline automaticamente
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="deadline">Deadline *</Label>
                      <Input
                        id="deadline"
                        type="datetime-local"
                        value={formData.deadline}
                        onChange={(e) => {
                          setFormData({ 
                            ...formData, 
                            deadline: e.target.value,
                            // Se editar manualmente, limpar a tag
                            urgencyTag: null
                          });
                        }}
                        disabled={!!formData.urgencyTag}
                        required
                      />
                      {formData.urgencyTag && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Deadline calculada automaticamente baseada na tag selecionada
                        </p>
                      )}
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={createOrderMutation.isPending}>
                      {createOrderMutation.isPending ? "Criando..." : "Criar Pedido"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              </div>
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
                    <SelectItem value="most_recent">Mais Recente</SelectItem>
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
                  onChange={(e) => setTempLastOrderId(e.target.value.trim())}
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
                <>
                  <div className="flex justify-end mb-4 gap-2">
                    {isAttentionMode ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsAttentionMode(false);
                            setSelectedAttentionOrders(new Set());
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          disabled={isToggleAttentionPending || selectedAttentionOrders.size === 0}
                          onClick={() => toggleAttention(Array.from(selectedAttentionOrders))}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {isToggleAttentionPending ? "Salvando..." : "Salvar Atenção"}
                        </Button>
                      </div>
                    ) : isDelayMode ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsDelayMode(false);
                            setSelectedDelayOrders(new Set());
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          disabled={selectedDelayOrders.size === 0}
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from("orders")
                                .update({ has_delay: true })
                                .in("id", Array.from(selectedDelayOrders));
                              
                              if (error) throw error;
                              
                              queryClient.invalidateQueries({ queryKey: ["orders"] });
                              toast({
                                title: "Atrasos marcados",
                                description: `${selectedDelayOrders.size} pedido(s) marcado(s) com atraso.`,
                              });
                              setIsDelayMode(false);
                              setSelectedDelayOrders(new Set());
                            } catch (error: any) {
                              toast({
                                title: "Erro ao marcar atrasos",
                                description: error.message,
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Salvar Atrasos ({selectedDelayOrders.size})
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsAttentionMode(true)}
                          className="flex items-center gap-2"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Atenção
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsDelayMode(true)}
                          className="flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          Marcar Atraso
                        </Button>
                      </>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {(isAttentionMode || isDelayMode) && <TableHead className="w-10"></TableHead>}
                        <TableHead className="min-w-[150px]">ID Pedido</TableHead>
                        <TableHead className="w-[120px]">Cliente</TableHead>
                        <TableHead className="w-[120px]">Qtd. Documentos</TableHead>
                        {(isAdmin || isMaster) && <TableHead className="w-[180px]">Data Atribuição</TableHead>}
                        <TableHead className="w-[180px]">Deadline</TableHead>
                        {(isAdmin || isMaster) && <TableHead className="w-[180px]">Data Entrega</TableHead>}
                        <TableHead className="w-[150px]">Status</TableHead>
                        {(isAdmin || isMaster) && <TableHead className="min-w-[150px]">Atribuído a</TableHead>}
                        <TableHead className="text-left">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders?.map((order) => (
                      <TableRow key={order.id}>
                        {(isAttentionMode || isDelayMode) && (
                          <TableCell>
                            <Checkbox
                              checked={
                                isAttentionMode 
                                  ? selectedAttentionOrders.has(order.id)
                                  : selectedDelayOrders.has(order.id)
                              }
                              onCheckedChange={(checked) => {
                                if (isAttentionMode) {
                                  if (checked) {
                                    setSelectedAttentionOrders((prev) => new Set([...prev, order.id]));
                                  } else {
                                    setSelectedAttentionOrders((prev) => {
                                      const newSet = new Set(prev);
                                      newSet.delete(order.id);
                                      return newSet;
                                    });
                                  }
                                } else if (isDelayMode) {
                                  if (checked) {
                                    setSelectedDelayOrders((prev) => new Set([...prev, order.id]));
                                  } else {
                                    setSelectedDelayOrders((prev) => {
                                      const newSet = new Set(prev);
                                      newSet.delete(order.id);
                                      return newSet;
                                    });
                                  }
                                }
                              }}
                              className="mr-2"
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {order.order_number}
                            {order.has_delay && (
                              <Clock className="h-5 w-5 text-red-400" />
                            )}
                            {order.has_attention && (
                              <Badge
                                variant="secondary"
                                className="gap-1 ml-2"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                Atenção
                              </Badge>
                            )}
                            {order.is_urgent && (
                              <Badge 
                                variant="destructive" 
                                className="gap-1 cursor-pointer hover:bg-destructive/90 ml-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isMaster || isOwner) {
                                    setSelectedOrderId(order.id);
                                    setSelectedOrder(order);
                                    setUrgentDocumentCount(order.urgent_document_count?.toString() || "");
                                    setUrgentDialogOpen(true);
                                  }
                                }}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                Urgente ({order.urgent_document_count || 0})
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {order.customer || "-"}
                            {order.service_type === "Drive" && (
                              <img src={googleDriveLogo} alt="Drive" className="h-4 w-4" />
                            )}
                            {order.service_type === "Diagramação" && (
                              <Hammer className="h-4 w-4 text-muted-foreground" />
                            )}
                            {order.tags && order.tags.length > 0 && (
                              <div className="flex gap-1 ml-2">
                                {order.tags.includes("Carimbos") && (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                    Carimbos
                                  </Badge>
                                )}
                                {order.tags.includes("Assinaturas") && (
                                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                                    Assinaturas
                                  </Badge>
                                )}
                                {order.tags.includes("Apostila") && (
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                    Apostila
                                  </Badge>
                                )}
                              </div>
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
                        <TableCell className="text-left">
                          <div className="flex gap-2 justify-start items-center">
                            {(isMaster || isOwner) && (
                              <Button
                                size="sm"
                                variant={order.is_urgent ? "destructive" : "outline"}
                                onClick={() => {
                                  if (order.is_urgent) {
                                    // If already urgent, just remove it
                                    toggleUrgentMutation.mutate({
                                      orderId: order.id,
                                      isUrgent: false
                                    });
                                  } else {
                                    // Open dialog to set urgent document count
                                    setSelectedOrderId(order.id);
                                    setSelectedOrder(order);
                                    setUrgentDocumentCount("");
                                    setUrgentDialogOpen(true);
                                  }
                                }}
                                disabled={toggleUrgentMutation.isPending}
                              >
                                <AlertTriangle className="h-4 w-4" />
                                {order.is_urgent ? "Remover Urgência" : "Marcar Urgente"}
                              </Button>
                            )}
                            {(isMaster || isOwner || isAdmin) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(order)}
                                disabled={updateOrderMutation.isPending}
                              >
                                <Edit className="h-4 w-4" />
                                Editar
                              </Button>
                            )}
                            {(isMaster || isOwner) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteClick(order)}
                                disabled={deleteOrderMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                                Excluir
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, filteredOrders.length)} de {filteredOrders.length} pedidos
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Anterior
                          </Button>
                        </PaginationItem>
                        
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <PaginationItem key={i}>
                              <Button
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="min-w-[40px]"
                              >
                                {pageNum}
                              </Button>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Próxima
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Urgent Document Count Dialog */}
          <Dialog open={urgentDialogOpen} onOpenChange={setUrgentDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Marcar Pedido como Urgente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Pedido: {selectedOrder?.order_number}</Label>
                  <p className="text-sm text-muted-foreground">
                    Total de documentos no pedido: {selectedOrder?.document_count}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgent-count">Quantidade de Documentos Urgentes *</Label>
                  <Input
                    id="urgent-count"
                    type="number"
                    min="1"
                    max={selectedOrder?.document_count || 1}
                    placeholder="Digite a quantidade"
                    value={urgentDocumentCount}
                    onChange={(e) => setUrgentDocumentCount(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Informe quantos documentos deste pedido são urgentes
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUrgentDialogOpen(false);
                    setUrgentDocumentCount("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const count = parseInt(urgentDocumentCount);
                    if (count > 0 && count <= (selectedOrder?.document_count || 0)) {
                      toggleUrgentMutation.mutate({
                        orderId: selectedOrderId,
                        isUrgent: true,
                        urgentDocumentCount: count
                      });
                      setUrgentDialogOpen(false);
                      setUrgentDocumentCount("");
                    } else {
                      toast({
                        title: "Valor inválido",
                        description: `A quantidade deve estar entre 1 e ${selectedOrder?.document_count}`,
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!urgentDocumentCount || toggleUrgentMutation.isPending}
                >
                  {toggleUrgentMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Order Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar Pedido</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-order-number">Número do Pedido *</Label>
                  <Input
                    id="edit-order-number"
                    value={editFormData.order_number}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, order_number: e.target.value.trim() })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-customer">Cliente *</Label>
                  <Select
                    value={editFormData.customer}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, customer: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cidadania4y">Cidadania4y</SelectItem>
                      <SelectItem value="Yellowling">Yellowling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-service-type">Tipo de Serviço *</Label>
                  <Select
                    value={editFormData.serviceType}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, serviceType: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Drive">Drive</SelectItem>
                      <SelectItem value="Diagramação">Diagramação</SelectItem>
                      <SelectItem value="Drive + Diagramação">Drive + Diagramação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={editFormData.tags.includes("Carimbos") ? "default" : "outline"}
                      onClick={() => {
                        setEditFormData({
                          ...editFormData,
                          tags: editFormData.tags.includes("Carimbos")
                            ? editFormData.tags.filter(t => t !== "Carimbos")
                            : [...editFormData.tags, "Carimbos"]
                        });
                      }}
                    >
                      Carimbos
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={editFormData.tags.includes("Assinaturas") ? "default" : "outline"}
                      onClick={() => {
                        setEditFormData({
                          ...editFormData,
                          tags: editFormData.tags.includes("Assinaturas")
                            ? editFormData.tags.filter(t => t !== "Assinaturas")
                            : [...editFormData.tags, "Assinaturas"]
                        });
                      }}
                    >
                      Assinaturas
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={editFormData.tags.includes("Apostila") ? "default" : "outline"}
                      onClick={() => {
                        setEditFormData({
                          ...editFormData,
                          tags: editFormData.tags.includes("Apostila")
                            ? editFormData.tags.filter(t => t !== "Apostila")
                            : [...editFormData.tags, "Apostila"]
                        });
                      }}
                    >
                      Apostila
                    </Button>
                  </div>
                </div>
                
                {/* Campo condicional para Diagramação */}
                {editFormData.serviceType === "Diagramação" && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-pages-count-diagramming">Número de Páginas *</Label>
                    <Input
                      id="edit-pages-count-diagramming"
                      type="number"
                      min="1"
                      value={editFormData.pages_count_diagramming}
                      onChange={(e) => setEditFormData({ ...editFormData, pages_count_diagramming: e.target.value })}
                      placeholder="Ex: 10"
                      required
                    />
                    {editFormData.pages_count_diagramming && (
                      <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                        💰 Valor calculado: <strong>R$ {(parseInt(editFormData.pages_count_diagramming) * 3).toFixed(2)}</strong>
                        <span className="text-xs block mt-1">(R$ 3,00 por página)</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-document-count">Quantidade de Documentos *</Label>
                  <Input
                    id="edit-document-count"
                    type="number"
                    min="1"
                    value={editFormData.document_count}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, document_count: e.target.value })
                    }
                    required
                  />
                  {editFormData.document_count && (
                    <div className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 p-2 rounded">
                      💰 Valor calculado: <strong>R$ {(parseInt(editFormData.document_count) * 1.30).toFixed(2)}</strong>
                      <span className="text-xs block mt-1">(R$ 1,30 por documento)</span>
                    </div>
                  )}
                </div>

                {editFormData.serviceType === "Diagramação" && editFormData.pages_count_diagramming && editFormData.document_count && (
                  <div className="text-sm font-semibold bg-primary/10 p-3 rounded border-2 border-primary/20">
                    🎯 Valor Total: <strong className="text-lg">R$ {(
                      (parseInt(editFormData.pages_count_diagramming) * 3) + 
                      (parseInt(editFormData.document_count) * 1.30)
                    ).toFixed(2)}</strong>
                    <div className="text-xs text-muted-foreground mt-1">
                      Páginas: R$ {(parseInt(editFormData.pages_count_diagramming) * 3).toFixed(2)} + 
                      Documentos: R$ {(parseInt(editFormData.document_count) * 1.30).toFixed(2)}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="edit-deadline">Prazo *</Label>
                  <Input
                    id="edit-deadline"
                    type="datetime-local"
                    value={editFormData.deadline}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, deadline: e.target.value })
                    }
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-attribution-date">Data de Atribuição</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-attribution-date"
                      type="datetime-local"
                      value={editFormData.attribution_date}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, attribution_date: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
                        setEditFormData({ ...editFormData, attribution_date: now });
                      }}
                      className="text-xs px-3 shrink-0"
                    >
                      Agora
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-delivered-at">Data de Entrega</Label>
                  <Input
                    id="edit-delivered-at"
                    type="datetime-local"
                    value={editFormData.delivered_at}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, delivered_at: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Preencher a data de entrega marcará o pedido como entregue
                  </p>
                </div>
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingOrder(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateOrderMutation.isPending}>
                    {updateOrderMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  {hasPendencies ? (
                    <>
                      <span className="font-semibold text-destructive">
                        Atenção: Este pedido possui pendências associadas!
                      </span>
                      <br />
                      <br />
                      Tem certeza que deseja excluir o pedido <strong>{orderToDelete?.order_number}</strong>?
                      <br />
                      As pendências relacionadas também serão excluídas permanentemente.
                      <br />
                      <br />
                      Esta ação não pode ser desfeita.
                    </>
                  ) : (
                    <>
                      Tem certeza que deseja excluir o pedido <strong>{orderToDelete?.order_number}</strong>?
                      <br />
                      Esta ação não pode ser desfeita.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteOrderMutation.isPending ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
}
