import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DocumentTable } from "@/components/documents/DocumentTable";
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

// Mock data for charts
const lineChartData = [
  { month: "Jan", documentos: 120, receita: 45000 },
  { month: "Fev", documentos: 145, receita: 52000 },
  { month: "Mar", documentos: 165, receita: 58000 },
  { month: "Abr", documentos: 180, receita: 65000 },
  { month: "Mai", documentos: 220, receita: 78000 },
  { month: "Jun", documentos: 195, receita: 72000 },
];

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
  const [userRole] = useState("master"); // This will come from auth later
  const [userName] = useState("João Silva");
  const [selectedPeriod, setSelectedPeriod] = useState("month");

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
                  <SelectTrigger className="w-[180px]">
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
                
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Calendar className="h-4 w-4 mr-2" />
                  Filtrar Período
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Documentos Traduzidos"
              value="1,248"
              change={12}
              trend="up"
              icon={<FileText className="h-5 w-5" />}
              description="vs. mês anterior"
            />
            <StatsCard
              title="Tradutores Ativos"
              value="24"
              change={-5}
              trend="down"
              icon={<Users className="h-5 w-5" />}
              description="vs. mês anterior"
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
              value="R$ 125.4k"
              change={15}
              trend="up"
              icon={<DollarSign className="h-5 w-5" />}
              description="este mês"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Line Chart */}
            <ChartCard
              title="Evolução Mensal"
              description="Documentos traduzidos e receita"
              onExport={() => console.log("Export")}
              onFilter={() => console.log("Filter")}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="documentos"
                    stroke="#4A5568"
                    strokeWidth={2}
                    dot={{ fill: "#4A5568" }}
                    name="Documentos"
                  />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#B4D4E1"
                    strokeWidth={2}
                    dot={{ fill: "#B4D4E1" }}
                    name="Receita (R$)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

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
                  <Bar dataKey="documentos" fill="#4A5568" name="Documentos" />
                  <Bar dataKey="valor" fill="#B4D4E1" name="Valor (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Pie Chart */}
            <ChartCard
              title="Distribuição por Tipo"
              description="Tipos de documentos"
            >
              <ResponsiveContainer width="100%" height={250}>
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

            {/* Quick Stats */}
            <div className="lg:col-span-2 space-y-4">
              <ChartCard
                title="Métricas Rápidas"
                description="Indicadores em tempo real"
              >
                <div className="grid grid-cols-2 gap-4">
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