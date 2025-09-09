import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Package, AlertTriangle, Clock, Calendar, AlertCircle, Filter, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Productivity() {
  const { user } = useAuth();
  const [periodFilter, setPeriodFilter] = useState("month");

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (periodFilter) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "year":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case "last7days":
        startDate = subDays(now, 7);
        endDate = now;
        break;
      case "last30days":
        startDate = subDays(now, 30);
        endDate = now;
        break;
      case "last6months":
        startDate = subMonths(now, 6);
        endDate = now;
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch documents completed by the user in the period
  const { data: documentsData } = useQuery({
    queryKey: ["documents", user?.id, periodFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("assigned_to", user.id)
        .eq("status", "completed")
        .gte("completed_at", startDate.toISOString())
        .lte("completed_at", endDate.toISOString());

      if (error) {
        console.error("Error fetching documents:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch orders in the period
  const { data: ordersData } = useQuery({
    queryKey: ["orders", user?.id, periodFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) {
        console.error("Error fetching orders:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate delayed orders
  const delayedOrders = ordersData?.filter(order => {
    const now = new Date();
    const deadline = new Date(order.deadline);
    
    // Order is delayed if:
    // 1. It's delivered after the deadline
    // 2. It's still in progress and deadline has passed
    if (order.delivered_at) {
      return isAfter(new Date(order.delivered_at), deadline);
    } else if (order.status_order === "in_progress") {
      return isAfter(now, deadline);
    }
    return false;
  }) || [];

  // Fetch productivity data for charts
  const { data: productivityData, isLoading, error } = useQuery({
    queryKey: ["productivity", user?.id, periodFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("productivity")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString())
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching productivity data:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate summary statistics
  const stats = {
    documentsCompleted: documentsData?.length || 0,
    ordersCreated: ordersData?.length || 0,
    delayedOrders: delayedOrders.length,
    delayRate: ordersData?.length ? Math.round((delayedOrders.length / ordersData.length) * 100) : 0,
    totalWords: productivityData?.reduce((sum, item) => sum + (item.words_translated || 0), 0) || 0,
    totalHours: productivityData?.reduce((sum, item) => sum + Number(item.hours_worked || 0), 0) || 0,
    totalEarnings: productivityData?.reduce((sum, item) => sum + Number(item.daily_earnings || 0), 0) || 0,
  };

  // Group data by month for charts
  const monthlyData = productivityData?.reduce((acc: any[], item) => {
    const month = format(new Date(item.date), "MMM yyyy", { locale: ptBR });
    const existing = acc.find(m => m.month === month);
    
    if (existing) {
      existing.documents += item.documents_completed || 0;
      existing.words += item.words_translated || 0;
      existing.pages += item.pages_translated || 0;
      existing.hours += Number(item.hours_worked || 0);
      existing.earnings += Number(item.daily_earnings || 0);
    } else {
      acc.push({
        month,
        documents: item.documents_completed || 0,
        words: item.words_translated || 0,
        pages: item.pages_translated || 0,
        hours: Number(item.hours_worked || 0),
        earnings: Number(item.daily_earnings || 0),
      });
    }
    return acc;
  }, []) || [];

  const chartConfig = {
    documents: {
      label: "Documentos",
      color: "hsl(var(--chart-1))",
    },
    words: {
      label: "Palavras",
      color: "hsl(var(--chart-2))",
    },
    pages: {
      label: "Páginas",
      color: "hsl(var(--chart-3))",
    },
    hours: {
      label: "Horas",
      color: "hsl(var(--chart-4))",
    },
    earnings: {
      label: "Ganhos",
      color: "hsl(var(--chart-5))",
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao carregar os dados de produtividade. Por favor, tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Produtividade</h1>
          <p className="text-muted-foreground">Acompanhe seus indicadores de desempenho</p>
        </div>
        
        {/* Period Filter */}
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
            <SelectItem value="last7days">Últimos 7 dias</SelectItem>
            <SelectItem value="last30days">Últimos 30 dias</SelectItem>
            <SelectItem value="last6months">Últimos 6 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Feitos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentsCompleted}</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Feitos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ordersCreated}</div>
            <p className="text-xs text-muted-foreground">Total de pedidos criados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atraso dos Pedidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delayedOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.delayRate}% de taxa de atraso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      {productivityData && productivityData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Palavras Traduzidas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWords.toLocaleString("pt-BR")}</div>
              <p className="text-xs text-muted-foreground">Total no período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Total de horas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.totalEarnings.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">No período selecionado</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts - only show if there's productivity data */}
      {monthlyData.length > 0 && (
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="words">Palavras</TabsTrigger>
            <TabsTrigger value="hours">Horas</TabsTrigger>
            <TabsTrigger value="earnings">Ganhos</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentos Completos por Mês</CardTitle>
                <CardDescription>Evolução mensal de documentos traduzidos</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="documents" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="words" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Palavras Traduzidas por Mês</CardTitle>
                <CardDescription>Volume de palavras traduzidas ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="words" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Horas Trabalhadas por Mês</CardTitle>
                <CardDescription>Tempo dedicado às traduções</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ganhos Mensais</CardTitle>
                <CardDescription>Evolução dos ganhos ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <ChartTooltip 
                      content={
                        <ChartTooltipContent 
                          formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        />
                      } 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="hsl(var(--chart-5))" 
                      fill="hsl(var(--chart-5) / 0.2)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Show message if no data in selected period */}
      {(!productivityData || productivityData.length === 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sem dados no período</AlertTitle>
          <AlertDescription>
            Não há dados de produtividade registrados para o período selecionado. 
            Tente selecionar um período diferente ou aguarde novos dados serem adicionados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}