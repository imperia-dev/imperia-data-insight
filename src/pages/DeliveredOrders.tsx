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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight, CalendarIcon, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeliveredOrders() {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState("delivered_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");

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

  // Apply filters
  const filteredOrders = useMemo(() => {
    if (!sortedOrders) return [];
    
    let filtered = [...sortedOrders];
    
    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(order => {
        const deliveredDate = new Date(order.delivered_at!);
        return deliveredDate >= dateFrom;
      });
    }
    
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        const deliveredDate = new Date(order.delivered_at!);
        return deliveredDate <= endOfDay;
      });
    }
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => {
        const deadlineDate = new Date(order.deadline);
        const deliveredDate = new Date(order.delivered_at!);
        const isOnTime = deliveredDate <= deadlineDate;
        return statusFilter === "ontime" ? isOnTime : !isOnTime;
      });
    }
    
    // Urgency filter
    if (urgencyFilter !== "all") {
      filtered = filtered.filter(order => {
        return urgencyFilter === "urgent" ? order.is_urgent : !order.is_urgent;
      });
    }
    
    // Responsible filter (for admin/master)
    if (responsibleFilter !== "all") {
      filtered = filtered.filter(order => order.assigned_to === responsibleFilter);
    }
    
    return filtered;
  }, [sortedOrders, dateFrom, dateTo, statusFilter, urgencyFilter, responsibleFilter]);

  // Calculate pagination based on filtered orders
  const totalPages = Math.ceil((filteredOrders?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders?.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageSelect = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setStatusFilter("all");
    setUrgencyFilter("all");
    setResponsibleFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== "all" || urgencyFilter !== "all" || responsibleFilter !== "all";

  // Get unique responsible users for filter
  const responsibleUsers = useMemo(() => {
    if (!deliveredOrders) return [];
    const users = new Map();
    deliveredOrders.forEach(order => {
      if (order.assigned_to && order.profiles) {
        users.set(order.assigned_to, order.profiles.full_name || order.profiles.email);
      }
    });
    return Array.from(users, ([id, name]) => ({ id, name }));
  }, [deliveredOrders]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={profile?.role || "operation"} />
      
      <div className="md:pl-64">
        <Header userName={profile?.full_name || user?.email || ""} userRole={profile?.role || "operation"} />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-4">Pedidos Entregues</h1>
            
            {/* Filters Section */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filtros
                    </h3>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Date From */}
                    <div className="space-y-2">
                      <Label className="text-xs">Data de (Entrega)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateFrom && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                            locale={ptBR}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Date To */}
                    <div className="space-y-2">
                      <Label className="text-xs">Data até (Entrega)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateTo && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                            locale={ptBR}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="ontime">No prazo</SelectItem>
                          <SelectItem value="late">Atrasado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Urgency Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs">Urgência</Label>
                      <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="urgent">Urgentes</SelectItem>
                          <SelectItem value="normal">Normais</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Responsible Filter (for admin/master) */}
                    {isAdminOrMaster && (
                      <div className="space-y-2">
                        <Label className="text-xs">Responsável</Label>
                        <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {responsibleUsers.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Sort controls */}
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
                <>
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
                      {paginatedOrders?.map((order) => {
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

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {filteredOrders.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredOrders?.length || 0)} de {filteredOrders?.length || 0} pedidos
                      {hasActiveFilters && " (filtrados)"}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show only certain page numbers for large paginations
                          if (
                            totalPages <= 7 ||
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={page === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageSelect(page)}
                                className="min-w-[36px]"
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return <span key={page} className="px-1">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages || totalPages === 0}
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
