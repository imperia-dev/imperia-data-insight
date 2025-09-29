import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { cn } from "@/lib/utils";
import { Users, TrendingUp, Target, Award, Activity, AlertTriangle, FileText, CheckCircle2, XCircle, Calendar, Clock, BarChart, Filter, CalendarIcon, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface KPIData {
  delays: { count: number; percentage: number; goal: number };
  errors: { count: number; percentage: number; goal: number };
  documentsCompleted: { count: number; goal: number };
}

interface FilterOptions {
  dateRange: DateRange | undefined;
  departments: string[];
  documentTypes: string[];
  status: string[];
  searchTerm: string;
}

export default function CollaboratorsKPI() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("all");
  const [collaborators, setCollaborators] = useState<Profile[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: undefined,
    departments: [],
    documentTypes: [],
    status: [],
    searchTerm: ""
  });
  const [kpiData, setKpiData] = useState<KPIData>({
    delays: { count: 12, percentage: 4.5, goal: 5 },
    errors: { count: 8, percentage: 3.2, goal: 5 },
    documentsCompleted: { count: 456, goal: 500 }
  });
  const { mainContainerClass } = usePageLayout();

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (profileData && !profileError) {
          setUserName(profileData.full_name);
          setUserRole(profileData.role);
        }

        // Fetch all collaborators
        const { data: collaboratorsData, error: collaboratorsError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('role', ['operation', 'admin', 'master', 'owner'])
          .order('full_name');

        if (collaboratorsData && !collaboratorsError) {
          setCollaborators(collaboratorsData);
        }
      }
    };

    fetchData();
  }, [user]);

  // Update KPI data based on selected collaborator
  useEffect(() => {
    if (selectedCollaborator === 'alineadrianacosta28@gmail.com') {
      setKpiData({
        delays: { count: 12, percentage: 4.5, goal: 5 },
        errors: { count: 8, percentage: 3.2, goal: 5 },
        documentsCompleted: { count: 456, goal: 500 }
      });
    } else if (selectedCollaborator === 'all-operation') {
      setKpiData({
        delays: { count: 25, percentage: 6.2, goal: 5 },
        errors: { count: 18, percentage: 4.8, goal: 5 },
        documentsCompleted: { count: 1850, goal: 2000 }
      });
    } else if (selectedCollaborator === 'all') {
      setKpiData({
        delays: { count: 45, percentage: 5.8, goal: 5 },
        errors: { count: 32, percentage: 4.1, goal: 5 },
        documentsCompleted: { count: 3456, goal: 4000 }
      });
    } else {
      // Individual collaborator data (mock)
      setKpiData({
        delays: { count: Math.floor(Math.random() * 20), percentage: Math.random() * 10, goal: 5 },
        errors: { count: Math.floor(Math.random() * 15), percentage: Math.random() * 8, goal: 5 },
        documentsCompleted: { count: Math.floor(Math.random() * 600), goal: 500 }
      });
    }
  }, [selectedCollaborator]);

  const pieChartData = [
    { name: 'No Prazo', value: 100 - kpiData.delays.percentage, color: 'hsl(var(--chart-1))' },
    { name: 'Atrasados', value: kpiData.delays.percentage, color: 'hsl(var(--chart-2))' }
  ];

  const errorChartData = [
    { name: 'Sem Erros', value: 100 - kpiData.errors.percentage, color: 'hsl(var(--chart-3))' },
    { name: 'Com Erros', value: kpiData.errors.percentage, color: 'hsl(var(--chart-4))' }
  ];

  const performanceData = [
    { month: 'Jan', delays: 3.2, errors: 2.8, documents: 450 },
    { month: 'Fev', delays: 4.1, errors: 3.5, documents: 480 },
    { month: 'Mar', delays: 3.8, errors: 2.9, documents: 520 },
    { month: 'Abr', delays: 4.5, errors: 3.2, documents: 456 }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <Header userName={userName} userRole={userRole} />
      
      <main className={cn(mainContainerClass, "pt-16")}>
        <div className="container mx-auto px-4 py-8 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">KPIs dos Colaboradores</h1>
              <p className="text-muted-foreground mt-1">
                Acompanhe o desempenho e produtividade da equipe
              </p>
            </div>
            
            <div className="flex gap-3">
              {/* Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {(filters.departments.length > 0 || filters.documentTypes.length > 0 || 
                      filters.status.length > 0 || filters.dateRange) && (
                      <Badge variant="secondary" className="ml-1">
                        {filters.departments.length + filters.documentTypes.length + 
                         filters.status.length + (filters.dateRange ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle>Filtros Personalizados</SheetTitle>
                    <SheetDescription>
                      Configure os filtros para análise detalhada dos KPIs
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-6">
                    {/* Search */}
                    <div className="space-y-2">
                      <Label>Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Buscar por nome ou documento..." 
                          className="pl-8"
                          value={filters.searchTerm}
                          onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2">
                      <Label>Período Personalizado</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !filters.dateRange && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateRange?.from ? (
                              filters.dateRange.to ? (
                                <>
                                  {format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                                  {format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                                </>
                              ) : (
                                format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                              )
                            ) : (
                              <span>Selecione um período</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="range"
                            selected={filters.dateRange}
                            onSelect={(range) => setFilters({...filters, dateRange: range})}
                            locale={ptBR}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Departments */}
                    <div className="space-y-2">
                      <Label>Departamentos</Label>
                      <div className="space-y-2">
                        {['Operação', 'Administrativo', 'Financeiro', 'Comercial'].map((dept) => (
                          <div key={dept} className="flex items-center space-x-2">
                            <Checkbox 
                              id={dept}
                              checked={filters.departments.includes(dept)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters({...filters, departments: [...filters.departments, dept]});
                                } else {
                                  setFilters({...filters, departments: filters.departments.filter(d => d !== dept)});
                                }
                              }}
                            />
                            <Label htmlFor={dept} className="text-sm font-normal cursor-pointer">
                              {dept}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Document Types */}
                    <div className="space-y-2">
                      <Label>Tipos de Documento</Label>
                      <div className="space-y-2">
                        {['Contrato', 'Relatório', 'Proposta', 'Nota Fiscal', 'Outros'].map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox 
                              id={type}
                              checked={filters.documentTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters({...filters, documentTypes: [...filters.documentTypes, type]});
                                } else {
                                  setFilters({...filters, documentTypes: filters.documentTypes.filter(t => t !== type)});
                                }
                              }}
                            />
                            <Label htmlFor={type} className="text-sm font-normal cursor-pointer">
                              {type}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="space-y-2">
                        {['Concluído', 'Em Andamento', 'Atrasado', 'Cancelado'].map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox 
                              id={status}
                              checked={filters.status.includes(status)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters({...filters, status: [...filters.status, status]});
                                } else {
                                  setFilters({...filters, status: filters.status.filter(s => s !== status)});
                                }
                              }}
                            />
                            <Label htmlFor={status} className="text-sm font-normal cursor-pointer">
                              {status}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setFilters({
                          dateRange: undefined,
                          departments: [],
                          documentTypes: [],
                          status: [],
                          searchTerm: ""
                        })}
                      >
                        Limpar Filtros
                      </Button>
                      <Button className="flex-1">
                        Aplicar Filtros
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os colaboradores</SelectItem>
                  <SelectItem value="all-operation">Todos da operação</SelectItem>
                  <SelectItem value="alineadrianacosta28@gmail.com">Aline Adriana Costa</SelectItem>
                  {collaborators.map((collab) => (
                    collab.email !== 'alineadrianacosta28@gmail.com' && (
                      <SelectItem key={collab.id} value={collab.email}>
                        {collab.full_name} ({collab.role})
                      </SelectItem>
                    )
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Delays KPI */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-full -mr-16 -mt-16" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Atrasos de Documentos
                  </span>
                  <Badge variant={kpiData.delays.percentage <= kpiData.delays.goal ? "outline" : "destructive"} className={kpiData.delays.percentage <= kpiData.delays.goal ? "border-green-500 text-green-600" : ""}>
                    {kpiData.delays.percentage <= kpiData.delays.goal ? "Meta OK" : "Acima da Meta"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-3xl font-bold">{kpiData.delays.count}</p>
                    <p className="text-sm text-muted-foreground">documentos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{kpiData.delays.percentage.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Meta: {kpiData.delays.goal}%</p>
                  </div>
                </div>
                <Progress 
                  value={(kpiData.delays.goal / kpiData.delays.percentage) * 100} 
                  className="h-2" 
                />
              </CardContent>
            </Card>

            {/* Errors KPI */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-16 -mt-16" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    Erros
                  </span>
                  <Badge variant={kpiData.errors.percentage <= kpiData.errors.goal ? "outline" : "destructive"} className={kpiData.errors.percentage <= kpiData.errors.goal ? "border-green-500 text-green-600" : ""}>
                    {kpiData.errors.percentage <= kpiData.errors.goal ? "Meta OK" : "Acima da Meta"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-3xl font-bold">{kpiData.errors.count}</p>
                    <p className="text-sm text-muted-foreground">ocorrências</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{kpiData.errors.percentage.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Meta: {kpiData.errors.goal}%</p>
                  </div>
                </div>
                <Progress 
                  value={(kpiData.errors.goal / kpiData.errors.percentage) * 100} 
                  className="h-2" 
                />
              </CardContent>
            </Card>

            {/* Documents Completed KPI */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-16 -mt-16" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    Documentos Feitos
                  </span>
                  <Badge variant={kpiData.documentsCompleted.count >= kpiData.documentsCompleted.goal ? "outline" : "secondary"} className={kpiData.documentsCompleted.count >= kpiData.documentsCompleted.goal ? "border-green-500 text-green-600" : "border-yellow-500 text-yellow-600"}>
                    {((kpiData.documentsCompleted.count / kpiData.documentsCompleted.goal) * 100).toFixed(0)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-3xl font-bold">{kpiData.documentsCompleted.count}</p>
                    <p className="text-sm text-muted-foreground">de {kpiData.documentsCompleted.goal}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500/20" />
                </div>
                <Progress 
                  value={(kpiData.documentsCompleted.count / kpiData.documentsCompleted.goal) * 100} 
                  className="h-2" 
                />
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="performance">Desempenho</TabsTrigger>
              <TabsTrigger value="trends">Tendências</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Delays Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Atrasos</CardTitle>
                    <CardDescription>
                      Percentual de documentos entregues no prazo vs atrasados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
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
                  </CardContent>
                </Card>

                {/* Errors Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Erros</CardTitle>
                    <CardDescription>
                      Percentual de documentos sem erros vs com erros
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={errorChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {errorChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Evolução Mensal</CardTitle>
                  <CardDescription>
                    Acompanhamento dos indicadores ao longo dos meses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="delays" name="Atrasos (%)" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="errors" name="Erros (%)" fill="hsl(var(--chart-4))" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Análise de Tendências
                  </CardTitle>
                  <CardDescription>
                    Previsões baseadas no desempenho histórico
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Taxa de Atraso Projetada</span>
                        <Badge variant="outline">Próximo Mês</Badge>
                      </div>
                      <p className="text-2xl font-bold">4.2%</p>
                      <p className="text-xs text-muted-foreground">Baseado na tendência atual</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Meta de Documentos</span>
                        <Badge variant="outline">Projeção</Badge>
                      </div>
                      <p className="text-2xl font-bold">92%</p>
                      <p className="text-xs text-muted-foreground">Probabilidade de atingir a meta</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Melhoria Contínua</span>
                        <Badge variant="outline" className="border-green-500 text-green-600">Positivo</Badge>
                      </div>
                      <p className="text-2xl font-bold">+15%</p>
                      <p className="text-xs text-muted-foreground">Redução de erros vs mês anterior</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}