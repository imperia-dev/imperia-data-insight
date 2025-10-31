import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, TrendingUp, User, Trophy, Shield, CalendarIcon, FileDown, FileText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateBR, formatDateOnlyBR, toSaoPauloTime } from "@/lib/dateUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { exportToPDF } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";

interface PaymentData {
  user_id: string;
  user_name: string;
  date: string;
  amount: number;
  order_numbers: string[];
  drive_value: number;
  diagramming_value: number;
}

interface AccumulatedPayment {
  user_id: string;
  user_name: string;
  total_amount: number;
  total_documents: number;
  drive_value: number;
  diagramming_value: number;
}

interface TopPerformer {
  user_name: string;
  document_count: number;
  total_amount: number;
  drive_value: number;
  diagramming_value: number;
}

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { mainContainerClass } = usePageLayout();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [dailyPayments, setDailyPayments] = useState<PaymentData[]>([]);
  const [accumulatedPayments, setAccumulatedPayments] = useState<AccumulatedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [orderSearchFilter, setOrderSearchFilter] = useState("");
  const [customStartTime, setCustomStartTime] = useState("00:00");
  const [customEndTime, setCustomEndTime] = useState("23:59");
  const [observations, setObservations] = useState("");
  const [showAllPerformers, setShowAllPerformers] = useState(false);

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
      
      // Convert local time to UTC (Brazil is UTC-3, so we subtract 3 hours)
      const timezoneOffset = -3 * 60 * 60 * 1000; // -3 hours in milliseconds
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
      // Include delivered, in_progress and available orders (that might be picked up today)
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          assigned_to,
          document_count,
          delivered_at,
          created_at,
          assigned_at,
          status_order,
          drive_value,
          diagramming_value,
          custom_value_diagramming
        `)
        .in('status_order', ['delivered', 'in_progress'])
        .not('assigned_to', 'is', null);

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Productivity - Error fetching orders:', ordersError);
        throw ordersError;
      }
      
      console.log('Productivity - Raw orders fetched:', ordersData?.length, 'orders');
      
      // Filter orders based on date (using São Paulo timezone)
      const filteredOrders = ordersData?.filter(order => {
        // For delivered orders, use delivered_at
        // For in_progress orders, use assigned_at or created_at
        let dateToCheck;
        if (order.status_order === 'delivered' && order.delivered_at) {
          dateToCheck = toSaoPauloTime(order.delivered_at);
        } else if (order.assigned_at) {
          dateToCheck = toSaoPauloTime(order.assigned_at);
        } else {
          dateToCheck = toSaoPauloTime(order.created_at);
        }
        
        const isInRange = dateToCheck >= startDate && dateToCheck <= endDate;
        
        if (isInRange && selectedPeriod === 'day') {
          console.log('Order in today\'s range:', {
            id: order.id,
            status: order.status_order,
            assigned_to: order.assigned_to,
            dateUsed: dateToCheck.toISOString(),
            documents: order.document_count
          });
        }
        
        return isInRange;
      }) || [];
      
      console.log('Productivity - Filtered orders:', filteredOrders.length, 'orders after date filtering');

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

      // Calculate payments using actual order values
      const dailyPaymentsMap = new Map<string, PaymentData>();
      const accumulatedMap = new Map<string, AccumulatedPayment>();

      console.log('Productivity - Processing orders for payments...');
      
      filteredOrders.forEach(order => {
        if (!order.assigned_to) return;
        
        // Use the appropriate date based on order status (convert to São Paulo time)
        let dateToUse;
        if (order.status_order === 'delivered' && order.delivered_at) {
          dateToUse = toSaoPauloTime(order.delivered_at);
        } else if (order.assigned_at) {
          dateToUse = toSaoPauloTime(order.assigned_at);
        } else {
          dateToUse = toSaoPauloTime(order.created_at);
        }
        
        const date = format(dateToUse, 'yyyy-MM-dd');
        const userId = order.assigned_to;
        const userName = userNamesMap.get(userId) || 'Unknown';
        // Use actual order values with priority: custom_value_diagramming > diagramming_value
        const driveValue = order.drive_value || 0;
        const diagrammingValue = order.custom_value_diagramming || order.diagramming_value || 0;
        const amount = driveValue + diagrammingValue;
        
        // Daily payments aggregation
        const dailyKey = `${userId}-${date}`;
        if (dailyPaymentsMap.has(dailyKey)) {
          const existing = dailyPaymentsMap.get(dailyKey)!;
          existing.amount += amount;
          existing.drive_value += driveValue;
          existing.diagramming_value += diagrammingValue;
          existing.order_numbers.push(order.order_number || order.id);
        } else {
          dailyPaymentsMap.set(dailyKey, {
            user_id: userId,
            user_name: userName,
            date: date,
            amount: amount,
            drive_value: driveValue,
            diagramming_value: diagrammingValue,
            order_numbers: [order.order_number || order.id]
          });
        }
        
        // Accumulated payments
        if (accumulatedMap.has(userId)) {
          const existing = accumulatedMap.get(userId)!;
          existing.total_amount += amount;
          existing.drive_value += driveValue;
          existing.diagramming_value += diagrammingValue;
          existing.total_documents += order.document_count || 0;
        } else {
          accumulatedMap.set(userId, {
            user_id: userId,
            user_name: userName,
            total_amount: amount,
            drive_value: driveValue,
            diagramming_value: diagrammingValue,
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

  const handleExportPDF = () => {
    try {
      // Get period label for subtitle
      let periodLabel = '';
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        periodLabel = `${format(customStartDate, 'dd/MM/yyyy')} até ${format(customEndDate, 'dd/MM/yyyy')}`;
      } else {
        const periodMap: Record<string, string> = {
          'day': 'Hoje',
          'week': 'Esta Semana',
          'month': 'Este Mês',
          'quarter': 'Este Trimestre',
          'year': 'Este Ano'
        };
        periodLabel = periodMap[selectedPeriod] || 'Período Selecionado';
      }

      // Normalize observations text for PDF compatibility
      // Replace special Unicode characters with PDF-safe alternatives
      const normalizeTextForPDF = (text: string): string => {
        return text
          .replace(/→/g, '->')  // Right arrow
          .replace(/←/g, '<-')  // Left arrow
          .replace(/↑/g, '^')   // Up arrow
          .replace(/↓/g, 'v')   // Down arrow
          .replace(/•/g, '*')   // Bullet point
          .replace(/…/g, '...') // Ellipsis
          .replace(/'/g, "'")   // Smart single quote left
          .replace(/'/g, "'")   // Smart single quote right
          .replace(/"/g, '"')   // Smart double quote left
          .replace(/"/g, '"')   // Smart double quote right
          .replace(/–/g, '-')   // En dash
          .replace(/—/g, '-')   // Em dash
          .replace(/[^\x00-\x7F]/g, ''); // Remove any remaining non-ASCII characters
      };

      const normalizedObservations = observations.trim() 
        ? normalizeTextForPDF(observations.trim()) 
        : undefined;

      // Prepare data for PDF export
      // Daily payments will be the main table now
      const dailyHeaders = ['Data', 'Prestador', 'Nº Pedido(s)', 'Valor Drive', 'Valor Diagramação', 'Valor Total'];
      const dailyRows = dailyPayments
        .filter(payment => userRole !== 'operation' || payment.user_name !== 'Hellem Coelho')
        .map(payment => {
          const orderNumbersText = payment.order_numbers.join(', ');
          return [
            format(new Date(payment.date), 'dd/MM/yyyy'),
            payment.user_name,
            orderNumbersText,
            formatCurrency(payment.drive_value),
            formatCurrency(payment.diagramming_value),
            formatCurrency(payment.amount)
          ];
        });

      // Calculate daily totals
      const dailyTotalDrive = dailyPayments
        .filter(payment => userRole !== 'operation' || payment.user_name !== 'Hellem Coelho')
        .reduce((sum, payment) => sum + payment.drive_value, 0);
      
      const dailyTotalDiagramming = dailyPayments
        .filter(payment => userRole !== 'operation' || payment.user_name !== 'Hellem Coelho')
        .reduce((sum, payment) => sum + payment.diagramming_value, 0);
      
      const dailyTotalAmount = dailyPayments
        .filter(payment => userRole !== 'operation' || payment.user_name !== 'Hellem Coelho')
        .reduce((sum, payment) => sum + payment.amount, 0);

      const dailyTotals = [
        { label: 'Total Drive:', value: formatCurrency(dailyTotalDrive) },
        { label: 'Total Diagramação:', value: formatCurrency(dailyTotalDiagramming) },
        { label: 'Valor Total:', value: formatCurrency(dailyTotalAmount) }
      ];

      // Prepare accumulated data for additional table
      const accumulatedHeaders = ['Prestador', 'Documentos', 'Valor Drive', 'Valor Diagramação', 'Valor Total'];
      
      // Filter data based on user role
      const dataToExport = userRole === 'operation' 
        ? accumulatedPayments.filter(payment => payment.user_name !== 'Hellem Coelho')
        : accumulatedPayments;

      const accumulatedRows = dataToExport.map(payment => [
        payment.user_name,
        payment.total_documents.toString(),
        formatCurrency(payment.drive_value),
        formatCurrency(payment.diagramming_value),
        formatCurrency(payment.total_amount)
      ]);

      // Calculate accumulated totals
      const totalDocuments = dataToExport.reduce((sum, payment) => sum + payment.total_documents, 0);
      const totalDrive = dataToExport.reduce((sum, payment) => sum + payment.drive_value, 0);
      const totalDiagramming = dataToExport.reduce((sum, payment) => sum + payment.diagramming_value, 0);
      const totalAmount = dataToExport.reduce((sum, payment) => sum + payment.total_amount, 0);

      // Prepare chart data for top performers
      const chartData = topPerformers.map(performer => ({
        label: performer.user_name,
        value: performer.total_amount,
        formattedValue: formatCurrency(performer.total_amount)
      }));

      exportToPDF({
        title: 'Relatório de Produtividade',
        subtitle: `Período: ${periodLabel}`,
        headers: dailyHeaders,
        rows: dailyRows,
        totals: dailyTotals,
        charts: chartData.length > 0 ? [{
          title: 'Top 5 Prestadores',
          type: 'bar' as const,
          data: chartData
        }] : undefined,
        additionalTables: accumulatedRows.length > 0 ? [{
          title: 'Resumo do Período',
          headers: accumulatedHeaders,
          rows: [
            ...accumulatedRows,
            ['', '', '', '', ''],
            ['Total de Documentos:', totalDocuments.toString(), '', '', ''],
            ['Total Drive:', '', formatCurrency(totalDrive), '', ''],
            ['Total Diagramação:', '', '', formatCurrency(totalDiagramming), ''],
            ['Valor Total:', '', '', '', formatCurrency(totalAmount)]
          ]
        }] : undefined,
        observations: normalizedObservations
      });

      toast({
        title: "PDF exportado com sucesso",
        description: `Relatório de produtividade exportado para PDF`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível exportar o relatório para PDF",
        variant: "destructive",
      });
    }
  };

  const totalPayments = accumulatedPayments.reduce((sum, payment) => sum + payment.total_amount, 0);
  const totalDriveValue = accumulatedPayments.reduce((sum, payment) => sum + (payment.drive_value || 0), 0);
  const totalDiagrammingValue = accumulatedPayments.reduce((sum, payment) => sum + (payment.diagramming_value || 0), 0);
  
  // Get top 5 performers
  // Only filter "Hellem Coelho" for operation role
  const filteredPayments = userRole === 'operation' 
    ? accumulatedPayments.filter(payment => payment.user_name !== 'Hellem Coelho')
    : accumulatedPayments;
  
  console.log('Productivity - Accumulated payments before filter:', accumulatedPayments.length);
  console.log('Productivity - Filtered payments (after removing Hellem if operation):', filteredPayments.length);
  console.log('Productivity - Current userRole for filtering:', userRole);
  
  const topPerformers: TopPerformer[] = filteredPayments
    .slice(0, showAllPerformers ? filteredPayments.length : 5)
    .map(payment => ({
      user_name: payment.user_name,
      document_count: payment.total_documents,
      total_amount: payment.total_amount,
      drive_value: payment.drive_value,
      diagramming_value: payment.diagramming_value
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
                
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <Button 
                    onClick={handleExportPDF} 
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={loading || accumulatedPayments.length === 0}
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
                
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

          {/* Observations field */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Observações para o Relatório</CardTitle>
              </div>
              <CardDescription>
                Adicione informações relevantes que aparecerão no PDF exportado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Digite aqui as observações que deseja incluir no relatório em PDF..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {observations.length}/1000 caracteres
              </p>
            </CardContent>
          </Card>

          {/* Summary Cards - Hide for operation role */}
          {userRole !== 'operation' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
                  <CardTitle className="text-sm font-medium">Total Drive</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalDriveValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Somente Drive
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Diagramação</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalDiagrammingValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Somente Diagramação
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
                  <CardTitle>{showAllPerformers ? 'Todos os Prestadores' : 'Top 5 Prestadores'}</CardTitle>
                  <CardDescription>
                    Ranking dos prestadores com mais documentos traduzidos
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllPerformers(!showAllPerformers)}
                  >
                    {showAllPerformers ? 'Ver Top 5' : 'Ver Todos'}
                  </Button>
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
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
                      <div className="text-right space-y-1">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">Drive:</span>
                          <span className="font-semibold text-sm">{formatCurrency(performer.drive_value)}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">Diagramação:</span>
                          <span className="font-semibold text-sm">{formatCurrency(performer.diagramming_value)}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1 border-t">
                          <span className="text-xs font-medium text-muted-foreground">Total:</span>
                          <span className="font-bold text-lg text-primary">{formatCurrency(performer.total_amount)}</span>
                        </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pagamentos por Dia por Prestador</CardTitle>
                    <CardDescription>
                      Detalhamento diário dos pagamentos realizados
                    </CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nº do pedido..."
                      value={orderSearchFilter}
                      onChange={(e) => setOrderSearchFilter(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
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
                        <TableHead>Nº Pedido(s)</TableHead>
                        <TableHead className="text-right">Valor Drive</TableHead>
                        <TableHead className="text-right">Valor Diagramação</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyPayments
                        .filter(payment => 
                          !orderSearchFilter || 
                          payment.order_numbers.some(orderNum => 
                            orderNum.toLowerCase().includes(orderSearchFilter.toLowerCase())
                          )
                        )
                        .map((payment, index) => (
                        <TableRow key={`${payment.user_id}-${payment.date}-${index}`}>
                          <TableCell>
                            {payment.date ? format(new Date(payment.date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                          </TableCell>
                          <TableCell>{payment.user_name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {payment.order_numbers.map((orderNumber, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {orderNumber}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payment.drive_value)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payment.diagramming_value)}
                          </TableCell>
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
                        <TableHead className="text-right">Valor Drive</TableHead>
                        <TableHead className="text-right">Valor Diagramação</TableHead>
                        <TableHead className="text-right">Total Acumulado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accumulatedPayments.map((payment) => (
                        <TableRow key={payment.user_id}>
                          <TableCell className="font-medium">{payment.user_name}</TableCell>
                          <TableCell className="text-center">{payment.total_documents}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payment.drive_value)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payment.diagramming_value)}
                          </TableCell>
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
