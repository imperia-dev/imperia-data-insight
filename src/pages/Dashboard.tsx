import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
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
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [activeTranslators, setActiveTranslators] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

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
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Calculate date filter based on selected period
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      
      switch (selectedPeriod) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = now;
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          startDate = new Date(now.getFullYear(), now.getMonth(), diff);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      // Fetch delivered orders (documents translated) for the period
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('document_count')
        .eq('status_order', 'delivered')
        .gte('delivered_at', startDate.toISOString());

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else {
        const totalDocuments = ordersData?.reduce((sum, order) => sum + (order.document_count || 0), 0) || 0;
        setDocumentsTranslated(totalDocuments);
      }

      // Fetch active translators (users with role 'operation')
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'operation');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      } else {
        setActiveTranslators(profilesData?.length || 0);
      }

      // Fetch total revenue paid to operation users for the period
      const { data: revenueData, error: revenueError } = await supabase
        .from('financial_records')
        .select('amount, user_id')
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0]);

      if (revenueError) {
        console.error('Error fetching revenue:', revenueError);
      } else {
        // Get operation users
        const { data: operationUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'operation');
        
        const operationUserIds = operationUsers?.map(u => u.id) || [];
        
        // Calculate total revenue for operation users
        const totalRev = revenueData?.filter(record => 
          operationUserIds.includes(record.user_id)
        ).reduce((sum, record) => sum + (Number(record.amount) || 0), 0) || 0;
        
        setTotalRevenue(totalRev);
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
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          interval = eachDayOfInterval({ start: startDate, end: endDate });
      }

      // Fetch delivered orders for the period
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('document_count, delivered_at')
        .eq('status_order', 'delivered')
        .gte('delivered_at', startDate.toISOString())
        .lte('delivered_at', endDate.toISOString());

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
        } else if (selectedPeriod === 'week' || selectedPeriod === 'month') {
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
          if (!order.delivered_at) return false;
          const deliveredDate = new Date(order.delivered_at);
          return deliveredDate >= dateStart && deliveredDate < dateEnd;
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
                  Dashboard Operacional
                </h1>
                <p className="text-muted-foreground mt-1">
                  Acompanhe as métricas e performance da sua operação
                </p>
              </div>
              
              <div className="flex items-center gap-3">
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Documentos Traduzidos"
              value={loading ? "..." : documentsTranslated.toLocaleString('pt-BR')}
              change={12}
              trend="up"
              icon={<FileText className="h-5 w-5" />}
              description={`${selectedPeriod === 'day' ? 'hoje' : 
                           selectedPeriod === 'week' ? 'esta semana' : 
                           selectedPeriod === 'month' ? 'este mês' : 
                           selectedPeriod === 'quarter' ? 'este trimestre' : 
                           'este ano'}`}
            />
            <StatsCard
              title="Tradutores Ativos"
              value={loading ? "..." : activeTranslators.toString()}
              change={0}
              trend="neutral"
              icon={<Users className="h-5 w-5" />}
              description="usuários operacionais"
            />
            <StatsCard
              title="Taxa de Produtividade"
              value="87%"
              change={8}
              trend="up"
              icon={<TrendingUp className="h-5 w-5" />}
              description="média mensal"
            />
            <StatsCard
              title="Receita Total"
              value={loading ? "..." : `R$ ${(totalRevenue / 1000).toFixed(1)}k`}
              change={15}
              trend="up"
              icon={<DollarSign className="h-5 w-5" />}
              description={`pagamentos aos operadores ${selectedPeriod === 'day' ? 'hoje' : 
                           selectedPeriod === 'week' ? 'esta semana' : 
                           selectedPeriod === 'month' ? 'este mês' : 
                           selectedPeriod === 'quarter' ? 'este trimestre' : 
                           'este ano'}`}
            />
          </div>

          {/* Evolution Chart - Full Width */}
          <div className="mb-8">
            <ChartCard
              title={`Evolução ${selectedPeriod === 'day' ? 'Horária' : selectedPeriod === 'week' || selectedPeriod === 'month' ? 'Diária' : selectedPeriod === 'quarter' ? 'Semanal' : 'Mensal'}`}
              description={`Documentos traduzidos ${selectedPeriod === 'day' ? 'por hora' : selectedPeriod === 'week' || selectedPeriod === 'month' ? 'por dia' : selectedPeriod === 'quarter' ? 'por semana' : 'por mês'}`}
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

            {/* Pie Chart */}
            <ChartCard
              title="Distribuição por Tipo"
              description="Tipos de documentos"
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
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
    </div>
  );
}