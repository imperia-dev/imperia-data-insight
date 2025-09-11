import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { PendencyTypesChart } from "@/components/dashboard/PendencyTypesChart";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF } from "@/utils/exportUtils";
import {
  FileText,
  Users,
  TrendingUp,
  DollarSign,
  Calendar as CalendarIconAlias,
  Clock,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
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
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
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

const barChartData = [
  { name: "Ana Silva", documentos: 45, valor: 12500 },
  { name: "Carlos Oliveira", documentos: 38, valor: 10200 },
  { name: "Maria Santos", documentos: 42, valor: 11800 },
  { name: "João Costa", documentos: 35, valor: 9500 },
  { name: "Beatriz Lima", documentos: 40, valor: 11000 },
];

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
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [documentsTranslated, setDocumentsTranslated] = useState(0);
  const [documentsInProgress, setDocumentsInProgress] = useState(0);
  const [documentsDelivered, setDocumentsDelivered] = useState(0);
  const [attributedDocuments, setAttributedDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [urgencies, setUrgencies] = useState(0);
  const [pendencies, setPendencies] = useState(0);
  const [pendencyTypesData, setPendencyTypesData] = useState<any[]>([]);
  const [urgencyPercentage, setUrgencyPercentage] = useState("0.0");
  const [pendencyPercentage, setPendencyPercentage] = useState("0.0");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  // Store IDs for each metric
  const [attributedOrderIds, setAttributedOrderIds] = useState<OrderSummary[]>([]);
  const [inProgressOrderIds, setInProgressOrderIds] = useState<OrderSummary[]>([]);
  const [deliveredOrderIds, setDeliveredOrderIds] = useState<OrderSummary[]>([]);
  const [urgentOrderIds, setUrgentOrderIds] = useState<string[]>([]);
  const [pendencyIds, setPendencyIds] = useState<string[]>([]);
  const [pendenciesList, setPendenciesList] = useState<any[]>([]);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  interface OrderSummary {
    order_number: string;
    document_count: number;
  }
  const [dialogContentData, setDialogContentData] = useState<string[] | OrderSummary[]>([]);
  const [isGroupedDialog, setIsGroupedDialog] = useState(false);

  const showDetails = (title: string, data: string[] | OrderSummary[], isGrouped: boolean = false) => {
    setDialogTitle(title);
    setDialogContentData(data);
    setIsGroupedDialog(isGrouped);
    setDialogOpen(true);
  };

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
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
    fetchEvolutionData();
  }, [selectedPeriod, customDateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Calculate date filter based on selected period or custom range
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
      } else if (selectedPeriod === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
      } else if (selectedPeriod === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }

      // Fetch delivered orders (documents translated) for the period
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, document_count, status_order, is_urgent, urgent_document_count, created_at, delivered_at, deadline')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      const typedOrdersData: OrderData[] = (ordersData || []) as OrderData[];

      // Fetch attributed documents in the period
      const { data: attributedOrdersData, error: attributedError } = await supabase
        .from('orders')
        .select('id, order_number, document_count, attribution_date') // Adicionado order_number e attribution_date
        .gte('attribution_date', startDate.toISOString())
        .lte('attribution_date', endDate.toISOString());
      
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
      const { data: pendenciesData, error: pendenciesError } = await supabase
        .from('pendencies')
        .select('id, c4u_id, error_type, created_at, order_id, description, status, treatment') 
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
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
        
        // Calculate pendency percentage
        const pendencyPercentage = totalDocuments > 0 ? ((totalPendencies / totalDocuments) * 100).toFixed(1) : '0.0';
        setPendencyPercentage(pendencyPercentage);
        
        // Process pendency types data
        const errorTypes = [
          { value: "nao_e_erro", label: "Não é erro" },
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
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = now;
          // Create hourly intervals for today
          interval = Array.from({ length: 24 }, (_, i) => {
            const date = new Date(startDate);
            date.setHours(i);
            return date;
          });
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
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('document_count, attribution_date')
        .gte('attribution_date', startDate.toISOString())
        .lte('attribution_date', endDate.toISOString());

      if (ordersError) {
        console.error('Error fetching evolution data:', ordersError);
        return;
      }

      // Process data based on period
      const chartData = interval.map(date => {
        let label = '';
        let dateStart = date;
        let dateEnd = new Date(date);
        
        if (selectedPeriod === 'day') {
          // Hourly labels
          label = format(date, 'HH:mm', { locale: ptBR });
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

        return {
          label,
          documentos: documentsInInterval,
        };
      });

      setLineChartData(chartData);
    } catch (error) {
      console.error('Error fetching evolution data:', error);
    }
  };

  const handleExportPDF = () => {
    // Prepare indicators data
    const indicators = [
      { label: 'Documentos Atribuídos', value: attributedDocuments.toLocaleString('pt-BR') },
      { label: 'Em Andamento', value: documentsInProgress.toLocaleString('pt-BR') },
      { label: 'Entregues', value: documentsDelivered.toLocaleString('pt-BR') },
      { label: 'Urgências', value: `${urgencies.toLocaleString('pt-BR')} (${urgencyPercentage}%)` },
      { label: 'Pendências', value: `${pendencies.toLocaleString('pt-BR')} (${pendencyPercentage}%)` },
    ];

    // Prepare pendencies table data
    const pendenciesTableRows = pendenciesList.slice(0, 20).map(pendency => {
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
        pendency.description,
        pendency.status === 'pending' ? 'Pendente' : pendency.status === 'resolved' ? 'Resolvido' : pendency.status,
        format(new Date(pendency.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
      ];
    });

    // Prepare chart data for evolution
    const evolutionChartData = lineChartData.map(item => ({
      label: item.label,
      value: item.documentos,
      formattedValue: item.documentos.toString()
    }));

    const exportData = {
      title: 'Dashboard Operacional',
      headers: ['C4U ID', 'Tipo de Erro', 'Descrição', 'Status', 'Data'],
      rows: pendenciesTableRows,
      totals: indicators,
      charts: [
        {
          title: `Evolução ${selectedPeriod === 'day' ? 'Horária' : selectedPeriod === 'week' || selectedPeriod === 'month' ? 'Diária' : selectedPeriod === 'quarter' ? 'Semanal' : 'Mensal'}`,
          type: 'bar' as const,
          data: evolutionChartData.slice(0, 15), // Limit to 15 items for readability
        }
      ]
    };

    exportToPDF(exportData, 'portrait');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className="md:pl-64">
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
              change={5}
              trend="up"
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
              change={12}
              trend="up"
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
              change={parseFloat(urgencyPercentage)}
              trend={parseFloat(urgencyPercentage) > 10 ? "down" : parseFloat(urgencyPercentage) > 5 ? "neutral" : "up"}
              icon={<AlertTriangle className="h-5 w-5" />}
              description={`${urgencyPercentage}% do total`}
              hasDetails={true}
              onViewDetails={() => showDetails("Urgências - IDs dos Pedidos", urgentOrderIds, false)}
            />
            <StatsCard
              title="Pendências"
              value={loading ? "..." : pendencies.toLocaleString('pt-BR')}
              change={parseFloat(pendencyPercentage)}
              trend={parseFloat(pendencyPercentage) > 5 ? "down" : parseFloat(pendencyPercentage) > 2 ? "neutral" : "up"}
              icon={<AlertCircle className="h-5 w-5" />}
              description={`${pendencyPercentage}% do total`}
              hasDetails={true}
              onViewDetails={() => showDetails("Pendências - IDs", pendencyIds, false)}
            />
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

          {/* Performance Chart - Below Evolution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Bar Chart */}
            <ChartCard
              title="Performance por Tradutor"
              description="Top 5 tradutores do mês"
              onExport={() => console.log("Export")}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="documentos" fill="hsl(var(--primary))" name="Documentos" />
                  <Bar dataKey="valor" fill="hsl(var(--accent))" name="Valor (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Pendency Types Chart */}
            <PendencyTypesChart data={pendencyTypesData} />
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
                      Tempo Médio
                    </span>
                  </div>
                  <p className="text-2xl font-black text-primary mt-2">2.5h</p>
                  <p className="text-xs text-muted-foreground">por documento</p>
                </div>
                
                <div className="p-4 rounded-lg bg-gradient-premium">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Taxa de Entrega
                    </span>
                  </div>
                  <p className="text-2xl font-black text-primary mt-2">94%</p>
                  <p className="text-xs text-muted-foreground">no prazo</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Em Andamento
                    </span>
                  </div>
                  <p className="text-2xl font-black text-primary mt-2">38</p>
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

          {/* Documents Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Documentos Recentes
              </h2>
              <Button variant="outline">
                Ver Todos
              </Button>
            </div>
            
            <DocumentTable documents={mockDocuments} />
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
    </div>
  );
}