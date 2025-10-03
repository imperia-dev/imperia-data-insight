import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { cn } from "@/lib/utils";
import { Users, TrendingUp, Target, Award, Activity, AlertTriangle, FileText, CheckCircle2, XCircle, Calendar, Clock, BarChart, Filter, CalendarIcon, Search, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface DocumentDetail {
  id: string;
  document_name: string;
  client: string;
  status: string;
  date: string;
  delay_days?: number;
  error_type?: string;
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
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState<{open: boolean; type: string; title: string}>({
    open: false,
    type: '',
    title: ''
  });
  const [documentDetails, setDocumentDetails] = useState<DocumentDetail[]>([]);
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

  // Handle period change
  useEffect(() => {
    if (selectedPeriod === 'custom') {
      setShowDatePicker(true);
    }
  }, [selectedPeriod]);

  // Function to show details dialog
  const showDetails = (type: string) => {
    let title = '';
    let mockData: DocumentDetail[] = [];
    
    switch(type) {
      case 'delays':
        title = 'Documentos Atrasados';
        mockData = [
          { id: '1', document_name: 'Contrato #123', client: 'Empresa ABC', status: 'Atrasado', date: '2024-03-15', delay_days: 3 },
          { id: '2', document_name: 'Relatório Q1', client: 'Cliente XYZ', status: 'Atrasado', date: '2024-03-14', delay_days: 2 },
          { id: '3', document_name: 'Proposta Comercial', client: 'Tech Corp', status: 'Atrasado', date: '2024-03-13', delay_days: 5 },
          { id: '4', document_name: 'NF-e 456', client: 'Startup Inc', status: 'Atrasado', date: '2024-03-12', delay_days: 1 },
        ];
        break;
      case 'errors':
        title = 'Documentos com Erros';
        mockData = [
          { id: '1', document_name: 'Relatório Mensal', client: 'Empresa DEF', status: 'Com Erro', date: '2024-03-16', error_type: 'Formatação' },
          { id: '2', document_name: 'Contrato #789', client: 'Cliente GHI', status: 'Com Erro', date: '2024-03-15', error_type: 'Dados Incorretos' },
          { id: '3', document_name: 'Proposta #321', client: 'Corp Solutions', status: 'Com Erro', date: '2024-03-14', error_type: 'Cálculo' },
        ];
        break;
      case 'completed':
        title = 'Documentos Concluídos';
        mockData = [
          { id: '1', document_name: 'Contrato #111', client: 'Big Corp', status: 'Concluído', date: '2024-03-16' },
          { id: '2', document_name: 'Relatório Anual', client: 'Small Co', status: 'Concluído', date: '2024-03-16' },
          { id: '3', document_name: 'NF-e 999', client: 'Medium Inc', status: 'Concluído', date: '2024-03-15' },
          { id: '4', document_name: 'Proposta #555', client: 'Startup LLC', status: 'Concluído', date: '2024-03-15' },
          { id: '5', document_name: 'Contrato #222', client: 'Enterprise SA', status: 'Concluído', date: '2024-03-14' },
        ];
        break;
    }
    
    setDocumentDetails(mockData);
    setDetailsDialog({ open: true, type, title });
  };

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

  // Fetch and filter KPI data
  useEffect(() => {
    const fetchKPIData = async () => {
      try {
        let query = supabase.from('documents').select('*');

        // Filter by collaborator
        if (selectedCollaborator !== 'all') {
          if (selectedCollaborator === 'all-operation') {
            // Get all operation users
            const { data: operationUsers } = await supabase
              .from('profiles')
              .select('id')
              .eq('role', 'operation');
            
            if (operationUsers) {
              const operationIds = operationUsers.map(u => u.id);
              query = query.in('assigned_to', operationIds);
            }
          } else {
            // Specific collaborator by email
            const { data: userData } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', selectedCollaborator)
              .single();
            
            if (userData) {
              query = query.eq('assigned_to', userData.id);
            }
          }
        }

        // Apply date range filter
        if (filters.dateRange?.from) {
          query = query.gte('created_at', filters.dateRange.from.toISOString());
        }
        if (filters.dateRange?.to) {
          query = query.lte('created_at', filters.dateRange.to.toISOString());
        }

        // Apply period filter
        if (selectedPeriod !== 'custom' && !filters.dateRange) {
          const now = new Date();
          let startDate = new Date();
          
          switch(selectedPeriod) {
            case 'today':
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'week':
              startDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              startDate.setMonth(now.getMonth() - 1);
              break;
            case 'quarter':
              startDate.setMonth(now.getMonth() - 3);
              break;
            case 'year':
              startDate.setFullYear(now.getFullYear() - 1);
              break;
          }
          
          query = query.gte('created_at', startDate.toISOString());
        }

        // Apply status filter
        if (filters.status.length > 0) {
          const statusMap: { [key: string]: 'completed' | 'delivered' | 'in_progress' | 'pending' | 'review' } = {
            'Concluído': 'completed',
            'Em Andamento': 'in_progress',
            'Atrasado': 'pending',
            'Cancelado': 'review'
          };
          const mappedStatuses = filters.status
            .map(s => statusMap[s])
            .filter((s): s is 'completed' | 'delivered' | 'in_progress' | 'pending' | 'review' => s !== undefined);
          
          if (mappedStatuses.length > 0) {
            query = query.in('status', mappedStatuses);
          }
        }

        // Apply search term filter
        if (filters.searchTerm) {
          query = query.or(`document_name.ilike.%${filters.searchTerm}%,client_name.ilike.%${filters.searchTerm}%`);
        }

        const { data: documents, error } = await query;

        if (error) throw error;

        // Calculate KPIs from real data
        const totalDocs = documents?.length || 0;
        const completedDocs = documents?.filter(d => d.status === 'completed').length || 0;
        const delayedDocs = documents?.filter(d => {
          if (d.deadline && d.completed_at) {
            return new Date(d.completed_at) > new Date(d.deadline);
          }
          return false;
        }).length || 0;

        // Count documents with errors (assuming errors are tracked somewhere)
        const errorDocs = 0; // This would need to be calculated based on your error tracking

        const delayPercentage = totalDocs > 0 ? (delayedDocs / totalDocs) * 100 : 0;
        const errorPercentage = totalDocs > 0 ? (errorDocs / totalDocs) * 100 : 0;

        setKpiData({
          delays: { 
            count: delayedDocs, 
            percentage: delayPercentage, 
            goal: 5 
          },
          errors: { 
            count: errorDocs, 
            percentage: errorPercentage, 
            goal: 5 
          },
          documentsCompleted: { 
            count: completedDocs, 
            goal: totalDocs > 0 ? Math.ceil(totalDocs * 1.1) : 500 
          }
        });

      } catch (error) {
        console.error('Error fetching KPI data:', error);
        // Keep existing data on error
      }
    };

    fetchKPIData();
  }, [selectedCollaborator, selectedPeriod, filters, customDateRange]);

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
                      <SheetTrigger asChild>
                        <Button className="flex-1">
                          Aplicar Filtros
                        </Button>
                      </SheetTrigger>
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
              
              <div className="flex items-center gap-2">
                <Select value={selectedPeriod} onValueChange={(value) => {
                  setSelectedPeriod(value);
                  if (value === 'custom') {
                    setShowDatePicker(true);
                  } else {
                    setCustomDateRange(undefined);
                  }
                }}>
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

                {/* Custom Date Range Picker */}
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !customDateRange && "text-muted-foreground",
                        selectedPeriod !== 'custom' && "hidden"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange?.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                            {format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                          </>
                        ) : (
                          format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione as datas</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="range"
                      selected={customDateRange}
                      onSelect={(range) => {
                        setCustomDateRange(range);
                        if (range?.from && range?.to) {
                          setShowDatePicker(false);
                        }
                      }}
                      locale={ptBR}
                      numberOfMonths={2}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
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
                  <div className="flex items-center gap-2">
                    <Badge variant={kpiData.delays.percentage <= kpiData.delays.goal ? "outline" : "destructive"} className={kpiData.delays.percentage <= kpiData.delays.goal ? "border-green-500 text-green-600" : ""}>
                      {kpiData.delays.percentage <= kpiData.delays.goal ? "Meta OK" : "Acima da Meta"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => showDetails('delays')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
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
                  <div className="flex items-center gap-2">
                    <Badge variant={kpiData.errors.percentage <= kpiData.errors.goal ? "outline" : "destructive"} className={kpiData.errors.percentage <= kpiData.errors.goal ? "border-green-500 text-green-600" : ""}>
                      {kpiData.errors.percentage <= kpiData.errors.goal ? "Meta OK" : "Acima da Meta"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => showDetails('errors')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
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
                  <div className="flex items-center gap-2">
                    <Badge variant={kpiData.documentsCompleted.count >= kpiData.documentsCompleted.goal ? "outline" : "secondary"} className={kpiData.documentsCompleted.count >= kpiData.documentsCompleted.goal ? "border-green-500 text-green-600" : "border-yellow-500 text-yellow-600"}>
                      {((kpiData.documentsCompleted.count / kpiData.documentsCompleted.goal) * 100).toFixed(0)}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => showDetails('completed')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
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

          {/* Details Dialog */}
          <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({...detailsDialog, open})}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {detailsDialog.title}
                </DialogTitle>
                <DialogDescription>
                  Lista detalhada de documentos {detailsDialog.type === 'delays' ? 'atrasados' : 
                                                  detailsDialog.type === 'errors' ? 'com erros' : 
                                                  'concluídos'} no período selecionado
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      {detailsDialog.type === 'delays' && <TableHead>Dias de Atraso</TableHead>}
                      {detailsDialog.type === 'errors' && <TableHead>Tipo de Erro</TableHead>}
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentDetails.map((doc, index) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{doc.document_name}</TableCell>
                        <TableCell>{doc.client}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={doc.status === 'Concluído' ? 'outline' : 
                                    doc.status === 'Atrasado' ? 'destructive' : 
                                    'secondary'}
                            className={doc.status === 'Concluído' ? 'border-green-500 text-green-600' : ''}
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{doc.date}</TableCell>
                        {detailsDialog.type === 'delays' && (
                          <TableCell>
                            <span className="text-red-600 font-medium">{doc.delay_days} dias</span>
                          </TableCell>
                        )}
                        {detailsDialog.type === 'errors' && (
                          <TableCell>
                            <span className="text-orange-600">{doc.error_type}</span>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Total: {documentDetails.length} documentos
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDetailsDialog({...detailsDialog, open: false})}>
                    Fechar
                  </Button>
                  <Button>
                    Exportar Lista
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}