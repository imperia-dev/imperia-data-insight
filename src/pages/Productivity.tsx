import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, TrendingUp, User, Trophy, Shield, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PaymentData {
  user_id: string;
  user_name: string;
  date: string;
  amount: number;
}

interface AccumulatedPayment {
  user_id: string;
  user_name: string;
  total_amount: number;
  total_documents: number;
}

interface TopPerformer {
  user_name: string;
  document_count: number;
  total_amount: number;
}

export default function Financial() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [dailyPayments, setDailyPayments] = useState<PaymentData[]>([]);
  const [accumulatedPayments, setAccumulatedPayments] = useState<AccumulatedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [customStartTime, setCustomStartTime] = useState("00:00");
  const [customEndTime, setCustomEndTime] = useState("23:59");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
          setUserRole(data.role);
          console.log('Productivity - User role loaded:', data.role, 'User name:', data.full_name);
        } else {
          console.error('Productivity - Error loading user profile:', error);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (selectedPeriod !== 'custom' || (customStartDate && customEndDate)) {
      fetchPaymentData();
    }
  }, [selectedPeriod, customStartDate, customEndDate, customStartTime, customEndTime]);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        // Custom period with time
        startDate = new Date(customStartDate);
        const [startHour, startMinute] = customStartTime.split(':').map(Number);
        startDate.setHours(startHour, startMinute, 0, 0);
        
        endDate = new Date(customEndDate);
        const [endHour, endMinute] = customEndTime.split(':').map(Number);
        endDate.setHours(endHour, endMinute, 59, 999);
      } else {
        // For predefined periods, use local date boundaries
        switch (selectedPeriod) {
          case 'day':
            // Today at 00:00:00 local time
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
          case 'week':
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            endDate = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59, 999);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
            const endMonth = quarter * 3 + 2;
            const lastDayOfQuarter = new Date(now.getFullYear(), endMonth + 1, 0).getDate();
            endDate = new Date(now.getFullYear(), endMonth, lastDayOfQuarter, 23, 59, 59, 999);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const lastDayDefault = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            endDate = new Date(now.getFullYear(), now.getMonth(), lastDayDefault, 23, 59, 59, 999);
        }
      }
      
      // Adjust for Brazilian timezone (UTC-3)
      const timezoneOffset = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
      const startDateUTC = new Date(startDate.getTime() + timezoneOffset);
      const endDateUTC = new Date(endDate.getTime() + timezoneOffset);
      
      console.log('Productivity - Date filter:', {
        period: selectedPeriod,
        localStart: format(startDate, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
        localEnd: format(endDate, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
        utcStart: startDateUTC.toISOString(),
        utcEnd: endDateUTC.toISOString()
      });
      
      // Fetch orders from service providers with date filter
      // Include both delivered and in_progress orders
      let query = supabase
        .from('orders')
        .select(`
          id,
          assigned_to,
          document_count,
          delivered_at,
          created_at,
          status_order
        `)
        .in('status_order', ['delivered', 'in_progress'])
        .not('assigned_to', 'is', null);

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Productivity - Error fetching orders:', ordersError);
        throw ordersError;
      }
      
      // Filter orders based on date
      const filteredOrders = ordersData?.filter(order => {
        const dateToCheck = order.status_order === 'delivered' && order.delivered_at 
          ? new Date(order.delivered_at)
          : new Date(order.created_at);
        
        return dateToCheck >= startDateUTC && dateToCheck <= endDateUTC;
      }) || [];
      
      console.log('Productivity - Orders fetched:', filteredOrders.length, 'orders after date filtering');

      // Fetch all user profiles for the assigned users
      const userIds = [...new Set(filteredOrders.map(order => order.assigned_to).filter(Boolean) || [])];
      console.log('Productivity - User IDs to fetch profiles for:', userIds);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('Productivity - Error fetching profiles:', profilesError);
      }
      
      console.log('Productivity - Profiles fetched:', profilesData);
      
      // Create a map of user IDs to names
      const userNamesMap = new Map<string, string>();
      profilesData?.forEach(profile => {
        userNamesMap.set(profile.id, profile.full_name);
      });
      
      console.log('Productivity - User names map:', Array.from(userNamesMap.entries()));

      // Calculate payments based on R$ 1.30 per document
      const PAYMENT_PER_DOCUMENT = 1.30;
      
      const dailyPaymentsMap = new Map<string, PaymentData>();
      const accumulatedMap = new Map<string, AccumulatedPayment>();

      console.log('Productivity - Processing orders for payments...');
      
      filteredOrders.forEach(order => {
        if (!order.assigned_to) return;
        
        // Use delivered_at for delivered orders, created_at for in_progress
        const dateToUse = order.status_order === 'delivered' && order.delivered_at 
          ? order.delivered_at 
          : order.created_at;
        
        const date = new Date(dateToUse).toISOString().split('T')[0];
        const userId = order.assigned_to;
        const userName = userNamesMap.get(userId) || 'Unknown';
        const amount = (order.document_count || 0) * PAYMENT_PER_DOCUMENT;
        
        // Daily payments aggregation
        const dailyKey = `${userId}-${date}`;
        if (dailyPaymentsMap.has(dailyKey)) {
          const existing = dailyPaymentsMap.get(dailyKey)!;
          existing.amount += amount;
        } else {
          dailyPaymentsMap.set(dailyKey, {
            user_id: userId,
            user_name: userName,
            date: date,
            amount: amount
          });
        }
        
        // Accumulated payments
        if (accumulatedMap.has(userId)) {
          const existing = accumulatedMap.get(userId)!;
          existing.total_amount += amount;
          existing.total_documents += order.document_count || 0;
        } else {
          accumulatedMap.set(userId, {
            user_id: userId,
            user_name: userName,
            total_amount: amount,
            total_documents: order.document_count || 0
          });
        }
      });
      
      console.log('Productivity - Accumulated payments map size:', accumulatedMap.size);
      console.log('Productivity - User role during data processing:', userRole);

      setDailyPayments(Array.from(dailyPaymentsMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      
      setAccumulatedPayments(Array.from(accumulatedMap.values()).sort((a, b) => 
        b.total_amount - a.total_amount
      ));
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalPayments = accumulatedPayments.reduce((sum, payment) => sum + payment.total_amount, 0);
  
  // Get top 5 performers
  // Only filter "Hellem Coelho" for operation role
  const filteredPayments = userRole === 'operation' 
    ? accumulatedPayments.filter(payment => payment.user_name !== 'Hellem Coelho')
    : accumulatedPayments;
  
  console.log('Productivity - Accumulated payments before filter:', accumulatedPayments.length);
  console.log('Productivity - Filtered payments (after removing Hellem if operation):', filteredPayments.length);
  console.log('Productivity - Current userRole for filtering:', userRole);
  
  const topPerformers: TopPerformer[] = filteredPayments
    .slice(0, 5)
    .map(payment => ({
      user_name: payment.user_name,
      document_count: payment.total_documents,
      total_amount: payment.total_amount
    }));
  
  console.log('Productivity - Top performers count:', topPerformers.length);
  
  // Check if ranking should be visible (owner, master and operation can see it)
  // Only check after userRole is loaded
  const canSeeRanking = userRole && (userRole === 'owner' || userRole === 'master' || userRole === 'operation');
  console.log('Productivity - Can see ranking:', canSeeRanking, 'Role:', userRole);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-foreground">
                  Financeiro
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-muted-foreground">
                    Gestão de pagamentos e relatórios financeiros
                  </p>
                  {userRole && (
                    <Badge variant={userRole === 'owner' ? 'default' : userRole === 'master' ? 'secondary' : 'outline'} className="gap-1">
                      <Shield className="h-3 w-3" />
                      {userRole === 'owner' ? 'Owner' : userRole === 'master' ? 'Master' : userRole === 'admin' ? 'Admin' : 'Operation'}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[200px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="quarter">Este Trimestre</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                
                {selectedPeriod === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !customStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Data inicial"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customStartDate}
                          onSelect={setCustomStartDate}
                          className="pointer-events-auto"
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-24"
                    />
                    
                    <span className="text-muted-foreground">até</span>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Data final"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customEndDate}
                          onSelect={setCustomEndDate}
                          className="pointer-events-auto"
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards - Hide for operation role */}
          {userRole !== 'operation' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalPayments)}</div>
                  <p className="text-xs text-muted-foreground">
                    Período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prestadores Ativos</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{accumulatedPayments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Com pagamentos registrados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Média por Prestador</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(accumulatedPayments.length > 0 ? totalPayments / accumulatedPayments.length : 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor médio
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top 5 Performers Card - Visible for owner, master and operation */}
          {canSeeRanking && userRole && (
            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Top 5 Prestadores</CardTitle>
                  <CardDescription>
                    Ranking dos prestadores com mais documentos traduzidos
                  </CardDescription>
                </div>
                <Trophy className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando dados...
                </div>
              ) : topPerformers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum prestador encontrado
                </div>
              ) : (
                <div className="space-y-4">
                  {topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-r from-orange-600 to-orange-700' :
                        index === 3 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        'bg-gradient-to-r from-purple-500 to-purple-600'
                        }`}>
                          {index + 1}º
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{performer.user_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {performer.document_count} {performer.document_count === 1 ? 'documento' : 'documentos'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">{formatCurrency(performer.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">Total ganho</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Daily Payments Table - Hide for operation role */}
          {userRole !== 'operation' && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Pagamentos por Dia por Prestador</CardTitle>
                <CardDescription>
                  Detalhamento diário dos pagamentos realizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando dados...
                  </div>
                ) : dailyPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento registrado no período
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Prestador</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyPayments.map((payment, index) => (
                        <TableRow key={`${payment.user_id}-${payment.date}-${index}`}>
                          <TableCell>
                            {payment.date ? format(new Date(payment.date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                          </TableCell>
                          <TableCell>{payment.user_name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Accumulated Payments Table - Hide for operation role */}
          {userRole !== 'operation' && (
            <Card>
              <CardHeader>
                <CardTitle>Pagamentos Acumulados por Prestador</CardTitle>
                <CardDescription>
                  Total acumulado no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando dados...
                  </div>
                ) : accumulatedPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento registrado no período
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prestador</TableHead>
                        <TableHead className="text-center">Documentos</TableHead>
                        <TableHead className="text-right">Total Acumulado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accumulatedPayments.map((payment) => (
                        <TableRow key={payment.user_id}>
                          <TableCell className="font-medium">{payment.user_name}</TableCell>
                          <TableCell className="text-center">{payment.total_documents}</TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {formatCurrency(payment.total_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
