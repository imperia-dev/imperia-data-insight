import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, FileText, DollarSign, Package, Users, Search, RefreshCw, ArrowUpDown, FileDown, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import * as XLSX from 'xlsx';
import { exportToPDF } from "@/utils/exportUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { cn } from "@/lib/utils";

interface TranslationOrder {
  id: string;
  pedido_id: string;
  pedido_status: string;
  pedido_data: string;
  valor_pedido: number;
  valor_pago: number;
  status_pagamento: string;
  review_id: string | null;
  review_name: string | null;
  review_email: string | null;
  quantidade_documentos: number | null;
  valor_total_pago_servico: number | null;
  sync_status: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

const TranslationOrders = () => {
  const [orders, setOrders] = useState<TranslationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalOrdersWithoutFilters, setTotalOrdersWithoutFilters] = useState(0);
  const itemsPerPage = 20;

  // Temporary filter states (for user input)
  const [tempSearchTerm, setTempSearchTerm] = useState("");
  const [tempStatusFilter, setTempStatusFilter] = useState("all");
  const [tempPaymentStatusFilter, setTempPaymentStatusFilter] = useState("all");
  const [tempDateFrom, setTempDateFrom] = useState("");
  const [tempDateTo, setTempDateTo] = useState("");
  const [tempReviewerFilter, setTempReviewerFilter] = useState("");
  const [tempSortBy, setTempSortBy] = useState("pedido_data");
  const [tempSortOrder, setTempSortOrder] = useState("desc");

  // Applied filter states (for actual filtering)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reviewerFilter, setReviewerFilter] = useState("");
  const [sortBy, setSortBy] = useState("pedido_data");
  const [sortOrder, setSortOrder] = useState("desc");
  const [observations, setObservations] = useState("");

  // Metrics states
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalValue: 0,
    totalPaid: 0,
    totalDocuments: 0
  });

  // User data
  const [userProfile, setUserProfile] = useState<{ name: string; role: string } | null>(null);
  
  const { mainContainerClass } = useSidebarOffset();
  
  // Fetch total counts without filters
  useEffect(() => {
    const fetchTotalCounts = async () => {
      // Get total orders without filters
      const { count: ordersCount } = await supabase
        .from('translation_orders')
        .select('*', { count: 'exact', head: true });
      
      if (ordersCount !== null) {
        setTotalOrdersWithoutFilters(ordersCount);
      }
      
      // Get total documents without filters
      const { data: allDocs } = await supabase
        .from('translation_orders')
        .select('quantidade_documentos');
      
      if (allDocs) {
        const totalDocs = allDocs.reduce((sum, order) => sum + (order.quantidade_documentos || 0), 0);
        // Store this in a new state for total documents without filters
      }
    };
    fetchTotalCounts();
  }, []);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserProfile({
            name: profile.full_name || user.email || '',
            role: profile.role
          });
        }
      }
    };
    fetchUserProfile();
  }, []);

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('translation_orders')
        .select('*', { count: 'exact' });

      // Apply filters
      if (searchTerm) {
        query = query.or(`pedido_id.ilike.%${searchTerm}%,review_name.ilike.%${searchTerm}%,review_email.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq('pedido_status', statusFilter);
      }

      if (paymentStatusFilter !== "all") {
        query = query.eq('status_pagamento', paymentStatusFilter);
      }

      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        query = query.gte('pedido_data', startDate.toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('pedido_data', endDate.toISOString());
      }

      if (reviewerFilter) {
        query = query.ilike('review_name', `%${reviewerFilter}%`);
      }

      // Order and pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) throw error;

      setOrders(data || []);
      
      if (count) {
        setTotalOrders(count);
        setTotalPages(Math.ceil(count / itemsPerPage));
      }

      // Calculate metrics from filtered data
      let metricsQuery = supabase
        .from('translation_orders')
        .select('valor_pedido, valor_pago, quantidade_documentos');

      // Apply same filters for metrics
      if (searchTerm) {
        metricsQuery = metricsQuery.or(`pedido_id.ilike.%${searchTerm}%,review_name.ilike.%${searchTerm}%,review_email.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        metricsQuery = metricsQuery.eq('pedido_status', statusFilter);
      }

      if (paymentStatusFilter !== "all") {
        metricsQuery = metricsQuery.eq('status_pagamento', paymentStatusFilter);
      }

      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        metricsQuery = metricsQuery.gte('pedido_data', startDate.toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        metricsQuery = metricsQuery.lte('pedido_data', endDate.toISOString());
      }

      if (reviewerFilter) {
        metricsQuery = metricsQuery.ilike('review_name', `%${reviewerFilter}%`);
      }

      const { data: metricsData, error: metricsError } = await metricsQuery;

      if (!metricsError && metricsData) {
        const totals = metricsData.reduce((acc, order) => ({
          totalOrders: acc.totalOrders + 1,
          totalValue: acc.totalValue + (order.valor_pedido || 0),
          totalPaid: acc.totalPaid + (order.valor_pago || 0),
          totalDocuments: acc.totalDocuments + (order.quantidade_documentos || 0)
        }), {
          totalOrders: 0,
          totalValue: 0,
          totalPaid: 0,
          totalDocuments: 0
        });

        setMetrics(totals);
      }

    } catch (error) {
      console.error('Error fetching translation orders:', error);
      toast.error('Erro ao carregar pedidos de tradução');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch orders when filters are applied or page changes
  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm, statusFilter, paymentStatusFilter, dateFrom, dateTo, reviewerFilter, sortBy, sortOrder]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('translation_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translation_orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleSearch = () => {
    // Apply temporary filters to actual filters
    setSearchTerm(tempSearchTerm);
    setStatusFilter(tempStatusFilter);
    setPaymentStatusFilter(tempPaymentStatusFilter);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setReviewerFilter(tempReviewerFilter);
    setSortBy(tempSortBy);
    setSortOrder(tempSortOrder);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleClearFilters = () => {
    // Clear both temporary and applied filters
    setTempSearchTerm("");
    setTempStatusFilter("all");
    setTempPaymentStatusFilter("all");
    setTempDateFrom("");
    setTempDateTo("");
    setTempReviewerFilter("");
    setTempSortBy("pedido_data");
    setTempSortOrder("desc");
    
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setReviewerFilter("");
    setSortBy("pedido_data");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const handleClearAllOrders = async () => {
    try {
      setLoading(true);
      
      // Delete all records from translation_orders table
      const { error } = await supabase
        .from('translation_orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) throw error;
      
      toast.success('Todos os pedidos de tradução foram removidos com sucesso!');
      
      // Reset data
      setOrders([]);
      setMetrics({
        totalOrders: 0,
        totalValue: 0,
        totalPaid: 0,
        totalDocuments: 0
      });
      setTotalOrders(0);
      setTotalOrdersWithoutFilters(0);
      setTotalPages(1);
      setCurrentPage(1);
      
    } catch (error) {
      console.error('Error clearing translation orders:', error);
      toast.error('Erro ao limpar pedidos de tradução');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      // Fetch all data without pagination
      let query = supabase
        .from('translation_orders')
        .select('*');

      // Apply the same filters as the current view
      if (searchTerm) {
        query = query.or(`pedido_id.ilike.%${searchTerm}%,review_name.ilike.%${searchTerm}%,review_email.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq('pedido_status', statusFilter);
      }

      if (paymentStatusFilter !== "all") {
        query = query.eq('status_pagamento', paymentStatusFilter);
      }

      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        query = query.gte('pedido_data', startDate.toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('pedido_data', endDate.toISOString());
      }

      if (reviewerFilter) {
        query = query.ilike('review_name', `%${reviewerFilter}%`);
      }

      // Apply sorting
      const { data: allOrders, error } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;

      const exportData = (allOrders || []).map(order => ({
        'ID Pedido': order.pedido_id,
        'Status': order.pedido_status,
        'Data': format(new Date(order.pedido_data), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Valor Pedido': order.valor_pedido,
        'Valor Pago': order.valor_pago,
        'Status Pagamento': order.status_pagamento,
        'Revisor': order.review_name || '-',
        'Email Revisor': order.review_email || '-',
        'Documentos': order.quantidade_documentos || 0,
        'Valor Serviço': order.valor_total_pago_servico || 0
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Translation Orders');
      XLSX.writeFile(wb, `translation_orders_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
      
      toast.success(`${allOrders?.length || 0} registros exportados com sucesso!`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const exportToPDFFile = async () => {
    try {
      // Fetch all data without pagination
      let query = supabase
        .from('translation_orders')
        .select('*');

      // Apply the same filters as the current view
      if (searchTerm) {
        query = query.or(`pedido_id.ilike.%${searchTerm}%,review_name.ilike.%${searchTerm}%,review_email.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq('pedido_status', statusFilter);
      }

      if (paymentStatusFilter !== "all") {
        query = query.eq('status_pagamento', paymentStatusFilter);
      }

      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        query = query.gte('pedido_data', startDate.toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('pedido_data', endDate.toISOString());
      }

      if (reviewerFilter) {
        query = query.ilike('review_name', `%${reviewerFilter}%`);
      }

      // Apply sorting
      const { data: allOrders, error } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;

      // Calculate monthly summary by reviewer
      const reviewerSummary = (allOrders || []).reduce((acc, order) => {
        const reviewer = order.review_name || 'Sem Revisor';
        if (!acc[reviewer]) {
          acc[reviewer] = {
            documents: 0,
            value: 0
          };
        }
        acc[reviewer].documents += order.quantidade_documentos || 0;
        acc[reviewer].value = acc[reviewer].documents * 2; // R$ 2,00 por documento
        return acc;
      }, {} as Record<string, { documents: number; value: number }>);

      // Create monthly summary table
      const summaryHeaders = ['Revisor', 'Documentos', 'Valor (R$ 2,00/doc)'];
      const summaryRows = Object.entries(reviewerSummary).map(([reviewer, data]) => [
        reviewer,
        data.documents.toString(),
        formatCurrency(data.value)
      ]);

      // Add total row
      const totalDocs = Object.values(reviewerSummary).reduce((sum, data) => sum + data.documents, 0);
      const totalValue = totalDocs * 2;
      summaryRows.push([
        'TOTAL',
        totalDocs.toString(),
        formatCurrency(totalValue)
      ]);

      const headers = [
        'ID Pedido',
        'Status',
        'Data',
        'Valor Pedido',
        'Valor Pago',
        'Status Pagamento',
        'Revisor',
        'Documentos'
      ];

      const rows = (allOrders || []).map(order => [
        order.pedido_id,
        order.pedido_status,
        format(new Date(order.pedido_data), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        formatCurrency(order.valor_pedido),
        formatCurrency(order.valor_pago),
        order.status_pagamento,
        order.review_name || '-',
        (order.quantidade_documentos || 0).toString()
      ]);

      // Calculate corrected value
      const valorCorrigido = metrics.totalDocuments * 2;

      exportToPDF({
        title: 'Revisão - Plataforma Operação',
        subtitle: `Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
        headers,
        rows,
        totals: [
          { label: 'Total de Pedidos', value: metrics.totalOrders.toString() },
          { label: 'Valor Total', value: formatCurrency(metrics.totalValue) },
          { label: 'Total Pago - Incorreto', value: formatCurrency(metrics.totalPaid) },
          { label: 'Documentos Filtrados', value: metrics.totalDocuments.toString() },
          { label: 'Valor Corrigido', value: formatCurrency(valorCorrigido), subtitle: `(${metrics.totalDocuments} documentos × R$ 2,00)` }
        ],
        observations: observations || undefined,
        additionalTables: [
          {
            title: 'Resumo do Mês por Revisor',
            headers: summaryHeaders,
            rows: summaryRows
          }
        ]
      }, 'landscape');

      toast.success(`${allOrders?.length || 0} registros exportados em PDF com sucesso!`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
      'pending': { label: 'Pendente', variant: 'secondary' },
      'processing': { label: 'Processando', variant: 'default' },
      'completed': { label: 'Concluído', variant: 'outline' },
      'cancelled': { label: 'Cancelado', variant: 'destructive' }
    };

    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
      'pago': { label: 'Pago', variant: 'outline' },
      'pendente': { label: 'Pendente', variant: 'secondary' },
      'atrasado': { label: 'Atrasado', variant: 'destructive' },
      'parcial': { label: 'Parcial', variant: 'default' }
    };

    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-background">
        <Sidebar userRole={userProfile?.role || 'operation'} />
        <div className={cn("flex-1 flex flex-col", mainContainerClass)}>
          <Header userName={userProfile?.name || ''} userRole={userProfile?.role || 'operation'} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalOrders}</div>
                    {(searchTerm || statusFilter !== "all" || paymentStatusFilter !== "all" || dateFrom || dateTo || reviewerFilter) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Total sem filtros: {totalOrdersWithoutFilters}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(metrics.totalPaid)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalDocuments}</div>
                    {(searchTerm || statusFilter !== "all" || paymentStatusFilter !== "all" || dateFrom || dateTo || reviewerFilter) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: {totalOrdersWithoutFilters} pedidos
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="search">Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="ID, Revisor, Email..."
                          value={tempSearchTerm}
                          onChange={(e) => setTempSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status do Pedido</Label>
                      <Select value={tempStatusFilter} onValueChange={setTempStatusFilter}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="processing">Processando</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment">Status Pagamento</Label>
                      <Select value={tempPaymentStatusFilter} onValueChange={setTempPaymentStatusFilter}>
                        <SelectTrigger id="payment">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="atrasado">Atrasado</SelectItem>
                          <SelectItem value="parcial">Parcial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-from">Data Inicial</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={tempDateFrom}
                        onChange={(e) => setTempDateFrom(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-to">Data Final</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={tempDateTo}
                        onChange={(e) => setTempDateTo(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reviewer">Revisor</Label>
                      <Input
                        id="reviewer"
                        placeholder="Nome do revisor"
                        value={tempReviewerFilter}
                        onChange={(e) => setTempReviewerFilter(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sort">Ordenar por</Label>
                      <Select 
                        value={`${tempSortBy}:${tempSortOrder}`} 
                        onValueChange={(value) => {
                          const [field, order] = value.split(':');
                          setTempSortBy(field);
                          setTempSortOrder(order);
                        }}
                      >
                        <SelectTrigger id="sort">
                          <SelectValue />
                          <ArrowUpDown className="h-4 w-4 ml-2" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pedido_data:desc">Data (Mais recente)</SelectItem>
                          <SelectItem value="pedido_data:asc">Data (Mais antiga)</SelectItem>
                          <SelectItem value="valor_pedido:desc">Valor Pedido (Maior)</SelectItem>
                          <SelectItem value="valor_pedido:asc">Valor Pedido (Menor)</SelectItem>
                          <SelectItem value="valor_pago:desc">Valor Pago (Maior)</SelectItem>
                          <SelectItem value="valor_pago:asc">Valor Pago (Menor)</SelectItem>
                          <SelectItem value="pedido_id:asc">ID Pedido (A-Z)</SelectItem>
                          <SelectItem value="pedido_id:desc">ID Pedido (Z-A)</SelectItem>
                          <SelectItem value="review_name:asc">Revisor (A-Z)</SelectItem>
                          <SelectItem value="review_name:desc">Revisor (Z-A)</SelectItem>
                          <SelectItem value="quantidade_documentos:desc">Documentos (Maior)</SelectItem>
                          <SelectItem value="quantidade_documentos:asc">Documentos (Menor)</SelectItem>
                          <SelectItem value="pedido_status:asc">Status (A-Z)</SelectItem>
                          <SelectItem value="pedido_status:desc">Status (Z-A)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleSearch} variant="default">
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </Button>
                    <Button onClick={handleClearFilters} variant="outline">
                      Limpar Filtros
                    </Button>
                    <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                    <Button onClick={exportToExcel} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Excel
                    </Button>
                    <Button onClick={exportToPDFFile} variant="outline">
                      <FileDown className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Limpar Todos os Dados
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso irá remover permanentemente todos os pedidos de tradução da tabela, permitindo que você execute o webhook novamente para reprocessar os dados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClearAllOrders} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sim, limpar todos os dados
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              {/* Observations Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Digite observações que serão incluídas no PDF exportado..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos de Tradução</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Pedido</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor Pedido</TableHead>
                          <TableHead>Valor Pago</TableHead>
                          <TableHead>Status Pagamento</TableHead>
                          <TableHead>Revisor</TableHead>
                          <TableHead>Documentos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              Carregando...
                            </TableCell>
                          </TableRow>
                        ) : orders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              Nenhum pedido encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.pedido_id}</TableCell>
                              <TableCell>{getStatusBadge(order.pedido_status)}</TableCell>
                              <TableCell>
                                {format(new Date(order.pedido_data), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </TableCell>
                              <TableCell>{formatCurrency(order.valor_pedido)}</TableCell>
                              <TableCell>{formatCurrency(order.valor_pago)}</TableCell>
                              <TableCell>{getPaymentStatusBadge(order.status_pagamento)}</TableCell>
                              <TableCell>{order.review_name || '-'}</TableCell>
                              <TableCell>{order.quantidade_documentos || 0}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          
                          {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            const pageNumber = i + 1;
                            return (
                              <PaginationItem key={pageNumber}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(pageNumber)}
                                  isActive={currentPage === pageNumber}
                                  className="cursor-pointer"
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          
                          {totalPages > 5 && (
                            <PaginationItem>
                              <span className="px-2">...</span>
                            </PaginationItem>
                          )}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default TranslationOrders;