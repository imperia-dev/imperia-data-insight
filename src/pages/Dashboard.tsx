import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ErrorTypesChart } from "@/components/dashboard/ErrorTypesChart";
import { PendencyGoalChart } from "@/components/dashboard/PendencyGoalChart";
import { DocumentTable } from "@/components/documents/DocumentTable";

import { AnnouncementNotificationModal } from "@/components/announcements/AnnouncementNotificationModal";
import { useUnreadAnnouncements } from "@/hooks/useUnreadAnnouncements";
import { ZApiMessageModal } from "@/components/zapi/ZApiMessageModal";
import { ManageScheduledMessagesDialog } from "@/components/zapi/ManageScheduledMessagesDialog";

import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { exportToPDF } from "@/utils/exportUtils";
import { toast } from "@/hooks/use-toast";
import {
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Calendar as CalendarIconAlias,
  Clock,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  
  MessageCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachHourOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface OrderData {
  id: string;
  order_number: string;
  document_count: number;
  status_order: string;
  is_urgent: boolean;
  urgent_document_count: number;
  attribution_date: string;
  created_at: string;
  delivered_at: string | null;
  deadline: string;
}

// Removed mock data - will be replaced with real data from database

const pieChartData = [
  { name: "Técnico", value: 45, color: "#4A5568" },
  { name: "Jurídico", value: 30, color: "#6B7280" },
  { name: "Médico", value: 15, color: "#B4D4E1" },
  { name: "Financeiro", value: 10, color: "#D4C5B9" },
];

const mockDocuments = [
  {
    id: "1",
    title: "Contrato Internacional XYZ",
    client: "Tech Corp Brasil",
    translator: "Ana Silva",
    pages: 45,
    deadline: "15/12/2024",
    status: "in_progress" as const,
    priority: "high" as const,
    progress: 65,
  },
  {
    id: "2",
    title: "Manual Técnico ABC",
    client: "Indústria Global",
    translator: "Carlos Oliveira",
    pages: 120,
    deadline: "20/12/2024",
    status: "pending" as const,
    priority: "medium" as const,
    progress: 0,
  },
  {
    id: "3",
    title: "Relatório Médico 2024",
    client: "Hospital Central",
    translator: "Maria Santos",
    pages: 30,
    deadline: "10/12/2024",
    status: "completed" as const,
    priority: "low" as const,
    progress: 100,
  },
  {
    id: "4",
    title: "Documento Financeiro Q4",
    client: "Banco Internacional",
    translator: "João Costa",
    pages: 85,
    deadline: "18/12/2024",
    status: "review" as const,
    priority: "high" as const,
    progress: 90,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  
  const { mainContainerClass } = usePageLayout();
  const [userName, setUserName] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [documentsTranslated, setDocumentsTranslated] = useState(0);
  const [documentsInProgress, setDocumentsInProgress] = useState(0);
  const [documentsDelivered, setDocumentsDelivered] = useState(0);
  const [attributedDocuments, setAttributedDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [pendencyGoalData, setPendencyGoalData] = useState<any[]>([]);
  const [urgencies, setUrgencies] = useState(0);
  const [pendencies, setPendencies] = useState(0);
  const [pendencyTypesData, setPendencyTypesData] = useState<any[]>([]);
  const [urgencyPercentage, setUrgencyPercentage] = useState("0.0");
  const [pendencyPercentage, setPendencyPercentage] = useState("0.0");
  const [delays, setDelays] = useState(0);
  const [delayPercentage, setDelayPercentage] = useState("0.0");
  const [lowestScore, setLowestScore] = useState<number>(0);
  const [averageScore, setAverageScore] = useState<number>(0);
  const [highestScore, setHighestScore] = useState<number>(0);
  // Google Sheets integration removed - no longer needed
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  // Announcements hook
  const { unreadAnnouncements, markAsRead, isMarkingAsRead } = useUnreadAnnouncements();
  
  // Store IDs for each metric
  const [attributedOrderIds, setAttributedOrderIds] = useState<OrderSummary[]>([]);
  const [inProgressOrderIds, setInProgressOrderIds] = useState<OrderSummary[]>([]);
  const [deliveredOrderIds, setDeliveredOrderIds] = useState<OrderSummary[]>([]);
  const [urgentOrderIds, setUrgentOrderIds] = useState<string[]>([]);
  const [pendencyIds, setPendencyIds] = useState<string[]>([]);
  const [delayedOrderIds, setDelayedOrderIds] = useState<OrderSummary[]>([]);
  const [pendenciesList, setPendenciesList] = useState<any[]>([]);
  const [translatorPerformanceData, setTranslatorPerformanceData] = useState<any[]>([]);
  const [translatorLoading, setTranslatorLoading] = useState(false);
  const [averageTimePerDocument, setAverageTimePerDocument] = useState<string>("0");
  const [deliveryRate, setDeliveryRate] = useState<string>("0");
  
  const [isZApiModalOpen, setIsZApiModalOpen] = useState(false);
  const [isScheduledMessagesOpen, setIsScheduledMessagesOpen] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  interface OrderSummary {
    order_number: string;
    document_count: number;
  }
  const [dialogContentData, setDialogContentData] = useState<string[] | OrderSummary[]>([]);
  const [isGroupedDialog, setIsGroupedDialog] = useState(false);

  const handleDismissAnnouncement = (announcementId: string) => {
    markAsRead(announcementId, {
      onSuccess: () => {
        toast({
          title: "Aviso dispensado",
          description: "Você pode ver todos os avisos na página de Avisos.",
        });
      },
      onError: () => {
        toast({
          title: "Erro",
          description: "Não foi possível dispensar o aviso.",
          variant: "destructive",
        });
      },
    });
  };

  // Generate Z-API report message
  const getZApiReportMessage = () => {
    const now = new Date();
    const periodLabel = selectedPeriod === 'day' ? 'Hoje' :
                       selectedPeriod === 'week' ? 'Esta Semana' :
                       selectedPeriod === 'month' ? format(now, "MMM/yy", { locale: ptBR }).toUpperCase() :
                       selectedPeriod === 'lastMonth' ? 'Último Mês' :
                       selectedPeriod === 'quarter' ? 'Este Trimestre' :
                       selectedPeriod === 'year' ? 'Este Ano' :
                       'Período Personalizado';
    
    return `📊 *RELATÓRIO OPERACIONAL - ${periodLabel}*

• Documentos Atribuídos: ${attributedDocuments}
• Em Andamento: ${documentsInProgress}
• Entregues: ${documentsDelivered}
• Urgências: ${urgencies}
• Pendências: ${pendencies}

_Enviado por: ${userName}_
_Data: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}_`;
  };

  const showDetails = (title: string, data: string[] | OrderSummary[], isGrouped: boolean = false) => {
    setDialogTitle(title);
    setDialogContentData(data);
    setIsGroupedDialog(isGrouped);
    setDialogOpen(true);
  };

  const { userRole, loading: roleLoading } = useUserRole();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  // Fetch translator performance data
  const fetchTranslatorPerformance = async () => {
    setTranslatorLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      
      // First get users with operation role
      const { data: operationUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'operation');
      
      if (usersError) {
        console.error('Error fetching operation users:', usersError);
        setTranslatorLoading(false);
        return;
      }
      
      if (!operationUsers || operationUsers.length === 0) {
        setTranslatorPerformanceData([]);
        setTranslatorLoading(false);
        return;
      }
      
      // Fetch delivered orders for each operation user
      const performancePromises = operationUsers.map(async (user) => {
        let performanceQuery = supabase
          .from('orders')
          .select('document_count')
          .eq('assigned_to', user.id)
          .eq('status_order', 'delivered')
          .gte('delivered_at', startDate.toISOString())
          .lte('delivered_at', endDate.toISOString());
        
        // Apply customer filter if not "all"
        if (selectedCustomer !== "all") {
          performanceQuery = performanceQuery.eq('customer', selectedCustomer);
        }
        
        const { data: orders, error: ordersError } = await performanceQuery;
        
        if (ordersError) {
          console.error(`Error fetching orders for user ${user.id}:`, ordersError);
          return { name: user.full_name, documentos: 0 };
        }
        
        const totalDocuments = orders?.reduce((sum, order) => sum + (order.document_count || 0), 0) || 0;
        
        return {
          name: user.full_name,
          documentos: totalDocuments
        };
      });
      
      const performanceData = await Promise.all(performancePromises);
      
      // Sort by documents count and take top 5
      const sortedData = performanceData
        .sort((a, b) => b.documentos - a.documentos)
        .filter(item => item.documentos > 0)
        .slice(0, 5);
      
      setTranslatorPerformanceData(sortedData);
    } catch (error) {
      console.error('Error fetching translator performance:', error);
    } finally {
      setTranslatorLoading(false);
    }
  };

  // Helper function to get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    if (selectedPeriod === "custom" && customDateRange.from && customDateRange.to) {
      startDate = new Date(customDateRange.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customDateRange.to);
      endDate.setHours(23, 59, 59, 999);
    } else if (selectedPeriod === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (selectedPeriod === 'week') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      endDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    } else if (selectedPeriod === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (selectedPeriod === 'lastMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (selectedPeriod === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
    } else if (selectedPeriod === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    
    return { startDate, endDate };
  };

  // Fetch Google Sheets data via Edge Function (secure proxy)
  // Google Sheets data fetching removed - no longer needed

  // Initial load and dependencies effect
  useEffect(() => {
    fetchDashboardData();
    fetchEvolutionData();
  }, [selectedPeriod, customDateRange, selectedCustomer]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Use the helper function to get date range
      const { startDate, endDate } = getDateRange();

      // Fetch delivered orders (documents translated) for the period
      let ordersQuery = supabase
        .from('orders')
        .select('id, order_number, document_count, status_order, is_urgent, urgent_document_count, created_at, delivered_at, deadline, attribution_date')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      // Apply customer filter if not "all"
      if (selectedCustomer !== "all") {
        ordersQuery = ordersQuery.eq('customer', selectedCustomer);
      }
      
      const { data: ordersData, error: ordersError } = await ordersQuery;
      
      const typedOrdersData: OrderData[] = (ordersData || []) as OrderData[];

      // Calculate average time per document
      let totalTime = 0;
      let totalDocsWithTime = 0;
      let onTimeDeliveries = 0;
      let totalDelivered = 0;
      
      typedOrdersData.forEach(order => {
        if (order.status_order === 'delivered' && order.delivered_at && order.attribution_date) {
          const startTime = new Date(order.attribution_date).getTime();
          const endTime = new Date(order.delivered_at).getTime();
          const timeDiff = endTime - startTime;
          
          if (timeDiff > 0 && order.document_count > 0) {
            // Time in hours per document
            const hoursPerDoc = (timeDiff / (1000 * 60 * 60)) / order.document_count;
            totalTime += hoursPerDoc * order.document_count;
            totalDocsWithTime += order.document_count;
          }
          
          // Check if delivered on time
          totalDelivered++;
          if (order.deadline && new Date(order.delivered_at) <= new Date(order.deadline)) {
            onTimeDeliveries++;
          }
        }
      });
      
      // Calculate averages
      const avgTime = totalDocsWithTime > 0 ? (totalTime / totalDocsWithTime).toFixed(1) : "0";
      setAverageTimePerDocument(avgTime);
      
      const deliveryRateCalc = totalDelivered > 0 ? ((onTimeDeliveries / totalDelivered) * 100).toFixed(0) : "0";
      setDeliveryRate(deliveryRateCalc);

      // Fetch attributed documents in the period
      let attributedQuery = supabase
        .from('orders')
        .select('id, order_number, document_count, attribution_date')
        .gte('attribution_date', startDate.toISOString())
        .lte('attribution_date', endDate.toISOString());
      
      // Apply customer filter if not "all"
      if (selectedCustomer !== "all") {
        attributedQuery = attributedQuery.eq('customer', selectedCustomer);
      }
      
      const { data: attributedOrdersData, error: attributedError } = await attributedQuery;
      
      const typedAttributedOrdersData: Pick<OrderData, "id" | "order_number" | "document_count" | "attribution_date">[] = (attributedOrdersData || []) as Pick<OrderData, "id" | "order_number" | "document_count" | "attribution_date">[];

      let totalDocuments = 0;
      let urgencyPercentage = '0.0';
      let totalAttributedDocs = 0;
      
      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else {
        totalDocuments = typedOrdersData.reduce((sum, order) => sum + (order.document_count || 0), 0) || 0;
        
        const inProgressOrders = typedOrdersData.filter(order => order.status_order === 'in_progress') || [];
        const inProgressDocs = inProgressOrders.reduce((sum, order) => sum + (order.document_count || 0), 0);
        const groupedInProgressData = new Map<string, number>();
        inProgressOrders.forEach(order => {
          const currentCount = groupedInProgressData.get(order.order_number) || 0;
          groupedInProgressData.set(order.order_number, currentCount + (order.document_count || 0));
        });
        const inProgressSummary: OrderSummary[] = Array.from(groupedInProgressData.entries()).map(([order_number, count]) => ({
          order_number,
          document_count: count,
        }));
        const inProgressIds = inProgressSummary;
        
        const deliveredOrders = typedOrdersData.filter(order => order.status_order === 'delivered') || [];
        const deliveredDocs = deliveredOrders.reduce((sum, order) => sum + (order.document_count || 0), 0);
        const groupedDeliveredData = new Map<string, number>();
        deliveredOrders.forEach(order => {
          const currentCount = groupedDeliveredData.get(order.order_number) || 0;
          groupedDeliveredData.set(order.order_number, currentCount + (order.document_count || 0));
        });
        const deliveredSummary: OrderSummary[] = Array.from(groupedDeliveredData.entries()).map(([order_number, count]) => ({
          order_number,
          document_count: count,
        }));
        const deliveredIds = deliveredSummary;
        
        const urgentOrders = typedOrdersData.filter(order => order.is_urgent === true) || [];
        const urgentDocs = urgentOrders.reduce((sum, order) => sum + (order.urgent_document_count || 0), 0); // Assuming urgent_document_count is part of OrderData
        const urgentIds: string[] = [];
        urgentOrders.forEach(order => {
          for (let i = 0; i < (order.urgent_document_count || 0); i++) {
            urgentIds.push(order.order_number);
          }
        });
        
        // Calculate urgency percentage
        urgencyPercentage = totalDocuments > 0 ? ((urgentDocs / totalDocuments) * 100).toFixed(1) : '0.0';
        
        setDocumentsTranslated(totalDocuments);
        setDocumentsInProgress(inProgressDocs);
        setDocumentsDelivered(deliveredDocs);
        setUrgencies(urgentDocs);
        setUrgencyPercentage(urgencyPercentage);
        setInProgressOrderIds(inProgressIds);
        setDeliveredOrderIds(deliveredIds);
        setUrgentOrderIds(urgentIds);
      }
      
      if (attributedError) {
        console.error('Error fetching attributed documents:', attributedError);
      } else {
        const groupedAttributedData = new Map<string, number>();
        typedAttributedOrdersData.forEach(order => {
          const currentCount = groupedAttributedData.get(order.order_number) || 0;
          groupedAttributedData.set(order.order_number, currentCount + (order.document_count || 0));
        });

        const attributedSummary: OrderSummary[] = Array.from(groupedAttributedData.entries()).map(([order_number, count]) => ({
          order_number,
          document_count: count,
        }));

        totalAttributedDocs = attributedSummary.reduce((sum, item) => sum + item.document_count, 0);
        setAttributedDocuments(totalAttributedDocs);
        setAttributedOrderIds(attributedSummary);
      }
      
      // Fetch pendencies for the period - todas criadas no período
      let pendenciesQuery = supabase
        .from('pendencies')
        .select('id, c4u_id, error_type, created_at, order_id, description, status, treatment') 
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      // Apply customer filter if not "all"
      if (selectedCustomer !== "all") {
        pendenciesQuery = pendenciesQuery.eq('customer', selectedCustomer);
      }
      
      const { data: pendenciesData, error: pendenciesError } = await pendenciesQuery
        .order('created_at', { ascending: false });

      interface PendencyData {
        id: string;
        c4u_id: string;
        error_type: string;
        created_at: string;
        order_id: string | null;
        description: string;
        status: string;
        treatment: string | null;
      }
      const typedPendenciesData: PendencyData[] = (pendenciesData || []) as PendencyData[];

      // Log para debug
      console.debug('Período selecionado:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });
      console.debug('Pendências encontradas:', pendenciesData?.length || 0);

      if (pendenciesError) {
        console.error('Error fetching pendencies:', pendenciesError);
      } else {
        // Cada pendência conta como 1
        const pendencyOrderIds = typedPendenciesData.map(p => p.c4u_id) || []; // Usar c4u_id
        const totalPendencies = pendenciesData?.length || 0;
        setPendencies(totalPendencies);
        setPendencyIds(pendencyOrderIds);
        setPendenciesList(typedPendenciesData);
        
        // Calculate different percentages based on attributed documents
        // 1. Porcentagem de "Não é erro" em relação ao total de documentos atribuídos
        const notErrorPendencies = typedPendenciesData.filter(p => p.error_type === 'nao_e_erro').length;
        const notErrorPercentage = totalAttributedDocs > 0 ? ((notErrorPendencies / totalAttributedDocs) * 100).toFixed(1) : '0.0';
        
        // 2. Pendências aguardando classificação (solicitações de clientes ainda não analisadas)
        const pendingClassification = typedPendenciesData.filter(p => p.error_type === 'solicitacao_cliente').length;
        const pendingPercentage = totalAttributedDocs > 0 ? ((pendingClassification / totalAttributedDocs) * 100).toFixed(1) : '0.0';
        
        // 3. Porcentagem de erros reais (todos menos "não é erro" e "solicitação do cliente")
        const realErrorPendencies = typedPendenciesData.filter(p => p.error_type !== 'nao_e_erro' && p.error_type !== 'solicitacao_cliente').length;
        const realErrorPercentage = totalAttributedDocs > 0 ? ((realErrorPendencies / totalAttributedDocs) * 100).toFixed(1) : '0.0';
        
        // 4. Porcentagem total de pendências em relação ao total de documentos criados no período
        const totalPendencyPercentage = totalDocuments > 0 ? ((totalPendencies / totalDocuments) * 100).toFixed(1) : '0.0';
        
        // Create a formatted description for the pendencies card with line breaks
        const pendencyDescription = `${notErrorPercentage}% - Não é erro\n${realErrorPercentage}% - Erros\n${pendingPercentage}% - Aguardando\n${totalPendencyPercentage}% - Total`;
        setPendencyPercentage(pendencyDescription);
        
        // Process pendency types data
        const errorTypes = [
          { value: "nao_e_erro", label: "Não é erro" },
          { value: "solicitacao_cliente", label: "Solicitação do Cliente" },
          { value: "falta_de_dados", label: "Falta de dados" },
          { value: "apostila", label: "Apostila" },
          { value: "erro_em_data", label: "Erro em data" },
          { value: "nome_separado", label: "Nome separado" },
          { value: "texto_sem_traduzir", label: "Texto sem traduzir" },
          { value: "nome_incorreto", label: "Nome incorreto" },
          { value: "texto_duplicado", label: "Texto duplicado" },
          { value: "erro_em_crc", label: "Erro em CRC" },
          { value: "nome_traduzido", label: "Nome traduzido" },
          { value: "falta_parte_documento", label: "Falta parte do documento" },
          { value: "erro_digitacao", label: "Erro de digitação" },
          { value: "sem_assinatura_tradutor", label: "Sem assinatura do tradutor" },
          { value: "nome_junto", label: "Nome junto" },
          { value: "traducao_incompleta", label: "Tradução incompleta" },
          { value: "titulo_incorreto", label: "Título incorreto" },
          { value: "trecho_sem_traduzir", label: "Trecho sem traduzir" },
          { value: "matricula_incorreta", label: "Matrícula incorreta" },
          { value: "espacamento", label: "Espaçamento" },
          { value: "sem_cabecalho", label: "Sem cabeçalho" },
        ];
        
        const typeCounts = errorTypes.map(type => {
          const pendenciesOfType = pendenciesData?.filter(p => p.error_type === type.value) || [];
          // Cada pendência conta como 1
          const count = pendenciesOfType.length;
          return {
            type: type.label,
            count: count
          };
        }).filter(item => item.count > 0); // Only show types with pendencies
        
        setPendencyTypesData(typeCounts);
      }
      
      // Fetch orders marked with delay (has_delay = true)
      const { data: delayedOrdersData, error: delayedError } = await supabase
        .from('orders')
        .select('id, order_number, document_count, has_delay')
        .eq('has_delay', true)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (delayedError) {
        console.error('Error fetching delayed orders:', delayedError);
      } else {
        const delayedOrders = delayedOrdersData || [];
        
        // Group by order_number for details view
        const groupedDelayedData = new Map<string, number>();
        delayedOrders.forEach(order => {
          const currentCount = groupedDelayedData.get(order.order_number) || 0;
          groupedDelayedData.set(order.order_number, currentCount + (order.document_count || 0));
        });
        
        const delayedSummary: OrderSummary[] = Array.from(groupedDelayedData.entries()).map(([order_number, count]) => ({
          order_number,
          document_count: count,
        }));
        
        // Calculate total documents with delay
        const totalDelayedDocs = delayedOrders.reduce((sum, order) => sum + (order.document_count || 0), 0);
        
        setDelays(totalDelayedDocs);
        setDelayedOrderIds(delayedSummary);
        
        // Calculate delay percentage based on total documents in the period
        const delayPercentage = totalDocuments > 0 ? ((totalDelayedDocs / totalDocuments) * 100).toFixed(1) : '0.0';
        setDelayPercentage(delayPercentage);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvolutionData = async () => {
    try {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      let interval: Date[] = [];
      
      switch (selectedPeriod) {
        case 'day':
          // For today, show hourly data
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          // Use eachHourOfInterval for proper hourly intervals
          interval = eachHourOfInterval({ start: startDate, end: endDate });
          break;
        case 'week':
          // Show daily data for this week
          const dayOfWeek = now.getDay();
          const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          startDate = new Date(now.getFullYear(), now.getMonth(), diff);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          interval = eachDayOfInterval({ start: startDate, end: endDate });
          break;
        case 'month':
          // Show daily data for this month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          interval = eachDayOfInterval({ start: startDate, end: endDate });
          break;
        case 'lastMonth':
          // Show daily data for last month
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          interval = eachDayOfInterval({ start: startDate, end: endDate });
          break;
        case 'quarter':
          // Show weekly data for this quarter
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
          interval = eachWeekOfInterval({ start: startDate, end: endDate });
          break;
        case 'year':
          // Show monthly data for this year
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          interval = eachMonthOfInterval({ start: startDate, end: endDate });
          break;
        case 'custom':
          // Handle custom date range
          if (customDateRange?.from && customDateRange?.to) {
            startDate = customDateRange.from;
            endDate = customDateRange.to;
            interval = eachDayOfInterval({ start: startDate, end: endDate });
          } else {
            // Fallback to month if no custom range selected
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            interval = eachDayOfInterval({ start: startDate, end: endDate });
          }
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          interval = eachDayOfInterval({ start: startDate, end: endDate });
      }

      // Fetch assigned orders for the period
      let evolutionQuery = supabase
        .from('orders')
        .select('document_count, attribution_date')
        .gte('attribution_date', startDate.toISOString())
        .lte('attribution_date', endDate.toISOString());
      
      // Apply customer filter if not "all"
      if (selectedCustomer !== "all") {
        evolutionQuery = evolutionQuery.eq('customer', selectedCustomer);
      }
      
      const { data: ordersData, error: ordersError } = await evolutionQuery;

      if (ordersError) {
        console.error('Error fetching evolution data:', ordersError);
        return;
      }

      // Fetch pendencies for the same period
      let pendenciesQuery = supabase
        .from('pendencies')
        .select('id, created_at, order_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      // Apply customer filter if not "all"
      if (selectedCustomer !== "all") {
        // First get orders for this customer
        const { data: customerOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('customer', selectedCustomer);
        
        if (customerOrders && customerOrders.length > 0) {
          const orderIds = customerOrders.map(o => o.id);
          pendenciesQuery = pendenciesQuery.in('order_id', orderIds);
        }
      }
      
      const { data: pendenciesData } = await pendenciesQuery;

      // Process data based on period
      const chartData = interval.map(date => {
        let label = '';
        let dateStart = date;
        let dateEnd = new Date(date);
        
        if (selectedPeriod === 'day') {
          // Hourly labels - show only the hour
          label = format(date, 'HH:00', { locale: ptBR });
          dateEnd = new Date(date);
          dateEnd.setHours(date.getHours() + 1);
        } else if (selectedPeriod === 'week' || selectedPeriod === 'month' || selectedPeriod === 'custom') {
          // Daily labels
          label = format(date, 'dd/MM', { locale: ptBR });
          dateEnd = new Date(date);
          dateEnd.setDate(date.getDate() + 1);
        } else if (selectedPeriod === 'quarter') {
          // Weekly labels
          label = `Sem ${format(date, 'w', { locale: ptBR })}`;
          dateEnd = endOfWeek(date, { locale: ptBR });
        } else if (selectedPeriod === 'year') {
          // Monthly labels
          label = format(date, 'MMM', { locale: ptBR });
          dateEnd = endOfMonth(date);
        }

        // Count documents for this interval
        const documentsInInterval = ordersData?.filter(order => {
          if (!order.attribution_date) return false;
          const attributionDate = new Date(order.attribution_date);
          return attributionDate >= dateStart && attributionDate < dateEnd;
        }).reduce((sum, order) => sum + (order.document_count || 0), 0) || 0;

        // Count pendencies for this interval
        const pendenciesInInterval = pendenciesData?.filter(pendency => {
          if (!pendency.created_at) return false;
          const createdDate = new Date(pendency.created_at);
          return createdDate >= dateStart && createdDate < dateEnd;
        }).length || 0;

        return {
          label,
          documentos: documentsInInterval,
          pendencies: pendenciesInInterval,
          total: documentsInInterval,
        };
      });

      setLineChartData(chartData);
      setPendencyGoalData(chartData);
    } catch (error) {
      console.error('Error fetching evolution data:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [selectedPeriod, customDateRange, selectedCustomer]);

  useEffect(() => {
    fetchEvolutionData();
  }, [selectedPeriod, customDateRange, selectedCustomer]);

  useEffect(() => {
    fetchTranslatorPerformance();
  }, [selectedPeriod, customDateRange, selectedCustomer]);

  const handleExportPDF = async () => {
    try {
      // Use the selected period's date range instead of current month
      const exportDateRange = getDateRange();
      const exportStartDate = exportDateRange.startDate;
      const exportEndDate = exportDateRange.endDate;

      // Buscar pendências do período selecionado para calcular taxa de erro
      const { data: pendenciesPeriod } = await supabase
        .from('pendencies')
        .select('*')
        .gte('created_at', exportStartDate.toISOString())
        .lte('created_at', exportEndDate.toISOString());

      let ordersPeriodQuery = supabase
        .from('orders')
        .select('*')
        .gte('attribution_date', exportStartDate.toISOString())
        .lte('attribution_date', exportEndDate.toISOString());
      
      // Apply customer filter if not "all"
      if (selectedCustomer !== "all") {
        ordersPeriodQuery = ordersPeriodQuery.eq('customer', selectedCustomer);
      }
      
      const { data: ordersPeriod } = await ordersPeriodQuery;

      // Calculate error rate based on documents, not orders
      const totalDocumentsPeriod = ordersPeriod?.reduce((sum, order) => sum + (order.document_count || 0), 0) || 0;
      const periodErrorRate = totalDocumentsPeriod > 0 ? 
        ((pendenciesPeriod?.length || 0) / totalDocumentsPeriod * 100) : 0;

      // Agrupar documentos por cliente
      const documentsByCustomer = ordersPeriod?.reduce((acc: any, order: any) => {
        const customer = order.customer || 'Sem cliente';
        if (!acc[customer]) {
          acc[customer] = 0;
        }
        acc[customer] += order.document_count || 0;
        return acc;
      }, {}) || {};

      // Buscar pedidos entregues do período para calcular gastos com prestadores
      const { data: deliveredOrdersPeriod } = await supabase
        .from('orders')
        .select('drive_value, diagramming_value, custom_value_diagramming')
        .eq('status_order', 'delivered')
        .gte('delivered_at', exportStartDate.toISOString())
        .lte('delivered_at', exportEndDate.toISOString());

      // Calculate provider costs from delivered orders (drive + diagramming)
      const providerCostsPeriod = deliveredOrdersPeriod?.reduce((sum, order) => {
        const driveValue = order.drive_value || 0;
        const diagrammingValue = order.custom_value_diagramming || order.diagramming_value || 0;
        return sum + driveValue + diagrammingValue;
      }, 0) || 0;

      // Formatar valores monetários
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      };

      // Prepare indicators data with better labels
      // Parse the pendency percentages from the description
      const pendencyLines = pendencyPercentage.split('\n');
      
      // Calculate urgency percentage
      const urgencyPercent = attributedDocuments > 0 
        ? ((urgencies / attributedDocuments) * 100).toFixed(1) 
        : '0.0';

      const indicators = [
        { label: 'Atribuídos', value: attributedDocuments.toLocaleString('pt-BR') },
        { label: 'Em Andamento', value: documentsInProgress.toLocaleString('pt-BR') },
        { label: 'Entregues', value: documentsDelivered.toLocaleString('pt-BR') },
        { label: 'Urgências', value: urgencies.toLocaleString('pt-BR') },
        { label: '% Urgências', value: `${urgencyPercent}%` },
        { label: 'Pendências', value: pendencies.toLocaleString('pt-BR') },
        { label: 'Não é Erro', value: pendencyLines[0] || '0.0% - Não é erro' },
        { label: 'Taxa Real de Erros', value: pendencyLines[1] || '0.0% - Erros' },
        { label: 'Atrasos', value: delays.toLocaleString('pt-BR'), percentage: delayPercentage },
      ];

      // Prepare pendencies table data - include all pendencies in export
      const pendenciesTableRows = pendenciesList.map(pendency => {
        const errorTypeLabel = {
          "nao_e_erro": "Não é erro",
          "falta_de_dados": "Falta de dados",
          "apostila": "Apostila",
          "erro_em_data": "Erro em data",
          "nome_separado": "Nome separado",
          "texto_sem_traduzir": "Texto sem traduzir",
          "nome_incorreto": "Nome incorreto",
          "texto_duplicado": "Texto duplicado",
          "erro_em_crc": "Erro em CRC",
          "nome_traduzido": "Nome traduzido",
          "falta_parte_documento": "Falta parte do documento",
          "erro_digitacao": "Erro de digitação",
          "sem_assinatura_tradutor": "Sem assinatura do tradutor",
          "nome_junto": "Nome junto",
          "traducao_incompleta": "Tradução incompleta",
          "titulo_incorreto": "Título incorreto",
          "trecho_sem_traduzir": "Trecho sem traduzir",
          "matricula_incorreta": "Matrícula incorreta",
          "espacamento": "Espaçamento",
          "sem_cabecalho": "Sem cabeçalho",
        }[pendency.error_type] || pendency.error_type;

        return [
          pendency.c4u_id,
          errorTypeLabel,
          pendency.description.substring(0, 50) + (pendency.description.length > 50 ? '...' : ''),
          pendency.treatment || '-',
          pendency.status === 'pending' ? 'Pendente' : pendency.status === 'resolved' ? 'Resolvido' : pendency.status,
          format(new Date(pendency.created_at), "dd/MM/yyyy", { locale: ptBR })
        ];
      });

      // Prepare chart data for evolution
      const evolutionChartData = lineChartData.map(item => ({
        label: item.label,
        value: item.documentos,
        formattedValue: item.documentos.toString()
      }));

      // Get period text for the title
      const { startDate, endDate } = getDateRange();
      const periodText = selectedPeriod === 'custom' && customDateRange.from && customDateRange.to
        ? `${format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
        : selectedPeriod === 'day' ? format(new Date(), "dd/MM/yyyy", { locale: ptBR })
        : selectedPeriod === 'week' ? `Últimos 7 dias`
        : selectedPeriod === 'month' ? `Últimos 30 dias`
        : selectedPeriod === 'lastMonth' ? `Último mês`
        : selectedPeriod === 'quarter' ? `Últimos 3 meses`
        : `Últimos 12 meses`;
      
      const customerText = selectedCustomer === 'all' ? 'Todos os Clientes' : selectedCustomer;

      // Criar tabela adicional com documentos por cliente
      const customerDocsRows = Object.entries(documentsByCustomer)
        .map(([customer, count]) => [customer, count.toString()])
        .sort((a, b) => parseInt(b[1]) - parseInt(a[1])); // Ordenar por quantidade

      const exportData = {
        title: `Dashboard Operacional - ${customerText}`,
        subtitle: periodText,
        headers: ['C4U ID', 'Tipo de Erro', 'Descrição', 'Tratativa', 'Status', 'Data'],
        rows: pendenciesTableRows,
        totals: indicators,
        charts: [
          {
            title: "Distribuição de Tipos de Erro",
            type: 'bar' as const,
            data: pendencyTypesData.slice(0, 8).map(item => ({
              label: item.type,
              value: item.count,
              formattedValue: item.count.toString()
            }))
          }
        ],
        additionalTables: [
          {
            title: `Documentos Atribuídos por Cliente (${periodText})`,
            headers: ["Cliente", "Quantidade de Documentos"],
            rows: customerDocsRows
          },
          {
            title: "Tipos de Erro - Estatísticas",
            headers: ["Tipo de Erro", "Quantidade", "Percentual"],
            rows: pendencyTypesData.map(item => [
              item.type,
              item.count.toString(),
              pendencies > 0 ? `${((item.count / pendencies) * 100).toFixed(1)}%` : '0%'
            ])
          }
        ]
      };

      // Force landscape orientation for better layout
      exportToPDF(exportData, 'landscape');
      
      toast({
        title: "PDF exportado com sucesso!",
        description: "O relatório operacional foi gerado.",
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro ao exportar PDF",
        description: "Ocorreu um erro ao gerar o relatório.",
        variant: "destructive",
      });
    }
  };

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
                  Dashboard Operação
                </h1>
                <p className="text-muted-foreground mt-1">
                  Acompanhe as métricas e performance da sua operação
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Customer Filter */}
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    <SelectItem value="Cidadania4y">Cidadania4y</SelectItem>
                    <SelectItem value="Yellowling">Yellowling</SelectItem>
                  </SelectContent>
                </Select>
                
                
                {/* Z-API Button - Owner only */}
                {userRole === 'owner' && (
                  <Button 
                    onClick={() => setIsZApiModalOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Z-API
                  </Button>
                )}
                
                {/* Scheduled Messages Button - Owner only */}
                {userRole === 'owner' && (
                  <Button 
                    onClick={() => setIsScheduledMessagesOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Agendar
                  </Button>
                )}
                
                {/* Export PDF Button */}
                <Button 
                  onClick={handleExportPDF}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </Button>
                
                {/* Period Select */}
                <Select 
                  value={selectedPeriod} 
                  onValueChange={(value) => {
                    setSelectedPeriod(value);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <CalendarIconAlias className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Período rápido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="lastMonth">Último Mês</SelectItem>
                    <SelectItem value="quarter">Este Trimestre</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {selectedPeriod === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-[220px] justify-start text-left font-normal",
                          !customDateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.from ? (
                          customDateRange.to ? (
                            `${format(customDateRange.from, "LLL dd, y", { locale: ptBR })} - ${format(
                              customDateRange.to,
                              "LLL dd, y",
                              { locale: ptBR }
                            )}`
                          ) : (
                            format(customDateRange.from, "LLL dd, y", { locale: ptBR })
                          )
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DatePickerCalendar
                        initialFocus
                        mode="range"
                        defaultMonth={customDateRange.from || new Date()}
                        selected={customDateRange}
                        onSelect={(range) => {
                          setCustomDateRange({
                            from: range?.from,
                            to: range?.to
                          });
                        }}
                        numberOfMonths={2}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatsCard
              title="Documentos Atribuídos"
              value={loading ? "..." : attributedDocuments.toLocaleString('pt-BR')}
              icon={<CalendarIcon className="h-5 w-5" />}
              description={`${selectedPeriod === 'day' ? 'hoje' : 
                           selectedPeriod === 'week' ? 'esta semana' : 
                           selectedPeriod === 'month' ? 'este mês' : 
                           selectedPeriod === 'quarter' ? 'este trimestre' : 
                           'este ano'}`}
              hasDetails={true}
              onViewDetails={() => showDetails("Documentos Atribuídos - IDs dos Pedidos", attributedOrderIds, true)}
            />
            <StatsCard
              title="Em Andamento"
              value={loading ? "..." : documentsInProgress.toLocaleString('pt-BR')}
              icon={<Clock className="h-5 w-5" />}
              description={`${selectedPeriod === 'day' ? 'hoje' : 
                           selectedPeriod === 'week' ? 'esta semana' : 
                           selectedPeriod === 'month' ? 'este mês' : 
                           selectedPeriod === 'quarter' ? 'este trimestre' : 
                           'este ano'}`}
              hasDetails={true}
              onViewDetails={() => showDetails("Em Andamento - IDs dos Pedidos", inProgressOrderIds, true)}
            />
            <StatsCard
              title="Entregues"
              value={loading ? "..." : documentsDelivered.toLocaleString('pt-BR')}
              icon={<FileText className="h-5 w-5" />}
              description={`${selectedPeriod === 'day' ? 'hoje' : 
                           selectedPeriod === 'week' ? 'esta semana' : 
                           selectedPeriod === 'month' ? 'este mês' : 
                           selectedPeriod === 'quarter' ? 'este trimestre' : 
                           'este ano'}`}
              hasDetails={true}
              onViewDetails={() => showDetails("Entregues - IDs dos Pedidos", deliveredOrderIds, true)}
            />
            <StatsCard
              title="Urgências"
              value={loading ? "..." : urgencies.toLocaleString('pt-BR')}
              icon={<AlertTriangle className="h-5 w-5" />}
              description={`${urgencyPercentage}%`}
              hasDetails={true}
              onViewDetails={() => showDetails("Urgências - IDs dos Pedidos", urgentOrderIds, false)}
            />
            <StatsCard
              title="Pendências"
              value={loading ? "..." : pendencies.toLocaleString('pt-BR')}
              icon={<AlertCircle className="h-5 w-5" />}
              description={`${pendencyPercentage}%`}
              hasDetails={true}
              onViewDetails={() => showDetails("Pendências - IDs", pendencyIds, false)}
            />
          </div>
          
          {/* Second row with Delays and AI Score indicators */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Indicadores de Desempenho</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Atrasos"
                value={loading ? "..." : delays.toLocaleString('pt-BR')}
                icon={<Clock className="h-5 w-5" />}
                description={`${delayPercentage}%`}
                trend={delays > 0 ? "down" : "neutral"}
                hasDetails={true}
                onViewDetails={() => showDetails("Atrasos - IDs dos Pedidos", delayedOrderIds, true)}
              />
              <StatsCard
                title="Menor Nota"
                value={loading ? "..." : lowestScore.toLocaleString('pt-BR')}
                icon={<TrendingDown className="h-5 w-5" />}
                description="Menor divergência"
                trend="up"
              />
              <StatsCard
                title="Média"
                value={loading ? "..." : averageScore.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                icon={<Activity className="h-5 w-5" />}
                description="Média de divergências"
                trend="neutral"
              />
              <StatsCard
                title="Maior Nota"
                value={loading ? "..." : highestScore.toLocaleString('pt-BR')}
                icon={<TrendingUp className="h-5 w-5" />}
                description="Maior divergência"
                trend="down"
              />
            </div>
          </div>

          {/* Pendencies List */}
          {pendenciesList.length > 0 && (
            <div className="mb-8">
              <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Pendências</h3>
                    <p className="text-sm text-muted-foreground">
                      {pendenciesList.length} pendência{pendenciesList.length > 1 ? 's' : ''} no período selecionado
                    </p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">C4U ID</TableHead>
                        <TableHead className="w-[150px]">Tipo de Erro</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tratativa</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[150px]">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendenciesList.slice(0, 10).map((pendency) => {
                        const errorTypeLabel = {
                          "nao_e_erro": "Não é erro",
                          "falta_de_dados": "Falta de dados",
                          "apostila": "Apostila",
                          "erro_em_data": "Erro em data",
                          "nome_separado": "Nome separado",
                          "texto_sem_traduzir": "Texto sem traduzir",
                          "nome_incorreto": "Nome incorreto",
                          "texto_duplicado": "Texto duplicado",
                          "erro_em_crc": "Erro em CRC",
                          "nome_traduzido": "Nome traduzido",
                          "falta_parte_documento": "Falta parte do documento",
                          "erro_digitacao": "Erro de digitação",
                          "sem_assinatura_tradutor": "Sem assinatura do tradutor",
                          "nome_junto": "Nome junto",
                          "traducao_incompleta": "Tradução incompleta",
                          "titulo_incorreto": "Título incorreto",
                          "trecho_sem_traduzir": "Trecho sem traduzir",
                          "matricula_incorreta": "Matrícula incorreta",
                          "espacamento": "Espaçamento",
                          "sem_cabecalho": "Sem cabeçalho",
                        }[pendency.error_type] || pendency.error_type;

                        return (
                          <TableRow key={pendency.id}>
                            <TableCell className="font-medium">{pendency.c4u_id}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {errorTypeLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {pendency.description}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {pendency.treatment || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={pendency.status === 'resolved' ? 'outline' : pendency.status === 'pending' ? 'secondary' : 'default'}
                                className={pendency.status === 'resolved' ? 'border-green-500 text-green-700' : ''}
                              >
                                {pendency.status === 'pending' ? 'Pendente' : pendency.status === 'resolved' ? 'Resolvido' : pendency.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(pendency.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  {pendenciesList.length > 10 && (
                    <div className="mt-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.href = '/pendencies'}
                        className="text-primary hover:text-primary/80"
                      >
                        Ver todas as {pendenciesList.length} pendências
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Evolution Chart - Full Width */}
          <div className="mb-8">
            <ChartCard
              title={`Evolução ${selectedPeriod === 'day' ? 'Horária' : selectedPeriod === 'week' || selectedPeriod === 'month' ? 'Diária' : selectedPeriod === 'quarter' ? 'Semanal' : 'Mensal'}`}
              description={`Documentos atribuídos ${selectedPeriod === 'day' ? 'por hora' : selectedPeriod === 'week' || selectedPeriod === 'month' ? 'por dia' : selectedPeriod === 'quarter' ? 'por semana' : 'por mês'}`}
              onExport={() => console.log("Export")}
              onFilter={() => console.log("Filter")}
            >
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="documentos"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                    name="Documentos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Pendency Goal Chart - Full Width */}
          <div className="mb-8">
            <PendencyGoalChart data={pendencyGoalData} />
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Bar Chart */}
            <ChartCard
              title="Performance por Tradutor"
              description={`Top 5 tradutores ${
                selectedPeriod === 'day' ? 'de hoje' :
                selectedPeriod === 'week' ? 'desta semana' :
                selectedPeriod === 'month' ? 'deste mês' :
                selectedPeriod === 'quarter' ? 'deste trimestre' :
                selectedPeriod === 'year' ? 'deste ano' :
                'do período selecionado'
              }`}
              onExport={() => console.log("Export")}
            >
              {translatorLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-muted-foreground">Carregando dados...</div>
                </div>
              ) : translatorPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={translatorPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="documentos" fill="hsl(var(--primary))" name="Documentos" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-muted-foreground">Nenhum documento entregue no período</div>
                </div>
              )}
            </ChartCard>

            {/* Table of Recent Pendencies */}
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Pendências Recentes</h3>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>C4U ID</TableHead>
                        <TableHead>Tipo de Erro</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendenciesList.slice(0, 10).map((pendency) => {
                        const errorTypeLabels: Record<string, string> = {
                          "nao_e_erro": "Não é erro",
                          "falta_de_dados": "Falta de dados",
                          "apostila": "Apostila",
                          "erro_em_data": "Erro em data",
                          "nome_separado": "Nome separado",
                          "texto_sem_traduzir": "Texto sem traduzir",
                          "nome_incorreto": "Nome incorreto",
                          "texto_duplicado": "Texto duplicado",
                          "erro_em_crc": "Erro em CRC",
                          "nome_traduzido": "Nome traduzido",
                          "falta_parte_documento": "Falta parte do documento",
                          "erro_digitacao": "Erro de digitação",
                          "sem_assinatura_tradutor": "Sem assinatura do tradutor",
                          "nome_junto": "Nome junto",
                          "traducao_incompleta": "Tradução incompleta",
                          "titulo_incorreto": "Título incorreto",
                          "trecho_sem_traduzir": "Trecho sem traduzir",
                          "matricula_incorreta": "Matrícula incorreta",
                          "espacamento": "Espaçamento",
                          "sem_cabecalho": "Sem cabeçalho",
                        };
                        
                        return (
                          <TableRow key={pendency.id}>
                            <TableCell className="font-medium">#{pendency.c4u_id}</TableCell>
                            <TableCell className="text-xs">{errorTypeLabels[pendency.error_type] || pendency.error_type}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={pendency.status === 'resolved' ? 'default' : 'secondary'}
                              >
                                {pendency.status === 'resolved' ? 'Resolvido' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(pendency.created_at), 'dd/MM', { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Error Types Chart */}
          <div className="mb-8">
            <ErrorTypesChart 
              data={pendencyTypesData.map(item => ({
                type: item.type,
                count: item.count,
                label: item.type
              }))} 
            />
          </div>

          {/* Quick Stats */}
          <div className="mb-8">
            <ChartCard
              title="Métricas Rápidas"
              description="Indicadores em tempo real"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-gradient-accent">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Tempo Médio Por Documento
                    </span>
                  </div>
                  <p className="text-2xl font-black text-primary mt-2">{averageTimePerDocument}h</p>
                  <p className="text-xs text-muted-foreground">por documento</p>
                </div>
                
                <div className="p-4 rounded-lg bg-gradient-premium">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Taxa de Entrega
                    </span>
                  </div>
                  <p className="text-2xl font-black text-primary mt-2">{deliveryRate}%</p>
                  <p className="text-xs text-muted-foreground">no prazo</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Em Andamento
                    </span>
                  </div>
                  <p className="text-2xl font-black text-primary mt-2">{documentsInProgress}</p>
                  <p className="text-xs text-muted-foreground">documentos</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Online Agora
                    </span>
                  </div>
                  <p className="text-2xl font-black text-primary mt-2">18</p>
                  <p className="text-xs text-muted-foreground">tradutores</p>
                </div>
              </div>
            </ChartCard>
          </div>
        </main>
      </div>
      
      {/* Dialog para mostrar IDs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Total de {isGroupedDialog ? (dialogContentData as OrderSummary[]).reduce((sum, item) => sum + item.document_count, 0) : (dialogContentData as string[]).length} {isGroupedDialog ? ((dialogContentData as OrderSummary[]).reduce((sum, item) => sum + item.document_count, 0) === 1 ? 'documento' : 'documentos') : ((dialogContentData as string[]).length === 1 ? 'registro' : 'registros')}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <div className="space-y-2">
              {dialogContentData.length > 0 ? (
                isGroupedDialog ? (
                  (dialogContentData as OrderSummary[]).map((item, index) => (
                    <div
                      key={item.order_number}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <code className="text-xs bg-background px-2 py-1 rounded">{item.order_number} ({item.document_count} docs)</code>
                    </div>
                  ))
                ) : (
                  (dialogContentData as string[]).map((id, index) => (
                    <div
                      key={id + index} // Use index in key if IDs can be identical and not truly unique without context
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <code className="text-xs bg-background px-2 py-1 rounded">{id}</code>
                    </div>
                  ))
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  Nenhum registro encontrado
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Modal de avisos não lidos */}
      {unreadAnnouncements.length > 0 && (
        <AnnouncementNotificationModal
          announcements={unreadAnnouncements}
          onDismiss={handleDismissAnnouncement}
          isLoading={isMarkingAsRead}
        />
      )}
      
      
      {/* Z-API Message Modal */}
      <ZApiMessageModal
        open={isZApiModalOpen}
        onOpenChange={setIsZApiModalOpen}
        metrics={{
          attributedDocuments,
          documentsInProgress,
          documentsDelivered,
          urgencies,
          pendencies,
          delays,
          lowestScore,
          averageScore,
          highestScore,
          selectedPeriod,
          userName,
        }}
      />
      
      {/* Scheduled Messages Dialog */}
      <ManageScheduledMessagesDialog
        open={isScheduledMessagesOpen}
        onOpenChange={setIsScheduledMessagesOpen}
      />
    </div>
  );
}
