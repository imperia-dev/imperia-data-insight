import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText,
  Briefcase,
  Users,
  Wallet,
  ChartBar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  ResponsiveContainer
} from "recharts";

export default function DashboardFinanceiro() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [documentQuantity, setDocumentQuantity] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch real document count based on period
  useEffect(() => {
    const fetchDocumentCount = async () => {
      if (!user) return;
      
      setLoading(true);
      
      // Calculate date range based on selected period
      const now = new Date();
      let startDate = new Date();
      
      switch(selectedPeriod) {
        case 'day':
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
        default:
          startDate.setMonth(now.getMonth() - 1);
      }
      
      // Fetch orders and sum document_count
      const { data: orders, error } = await supabase
        .from('orders')
        .select('document_count')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());
      
      if (!error && orders) {
        // Sum all document_count values
        const totalDocuments = orders.reduce((sum, order) => sum + (order.document_count || 0), 0);
        setDocumentQuantity(totalDocuments);
      } else {
        console.error('Error fetching orders:', error);
        setDocumentQuantity(0);
      }
      
      setLoading(false);
    };
    
    fetchDocumentCount();
  }, [user, selectedPeriod]);

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
  
  const faturamentoTotal = documentQuantity * 50;

  // Dados de exemplo para os gráficos
  const faturamentoData = [
    { mes: "Jan", valor: 45000 },
    { mes: "Fev", valor: 52000 },
    { mes: "Mar", valor: 48000 },
    { mes: "Abr", valor: 61000 },
    { mes: "Mai", valor: 59000 },
    { mes: "Jun", valor: 67000 },
  ];

  const custoPorDocumento = [
    { tipo: "Tradução", custo: 1.30, quantidade: 1500 },
    { tipo: "Revisão", custo: 0.80, quantidade: 800 },
    { tipo: "Urgente", custo: 2.50, quantidade: 200 },
  ];

  const despesasOperacionais = [
    { categoria: "Infraestrutura", valor: 8500, percentual: 35 },
    { categoria: "Software", valor: 5200, percentual: 21 },
    { categoria: "Marketing", valor: 3800, percentual: 16 },
    { categoria: "Administrativo", valor: 6900, percentual: 28 },
  ];

  const folhaPagamento = [
    { mes: "Jan", tradutores: 28000, admin: 12000, total: 40000 },
    { mes: "Fev", tradutores: 30000, admin: 12000, total: 42000 },
    { mes: "Mar", tradutores: 29500, admin: 12500, total: 42000 },
    { mes: "Abr", tradutores: 32000, admin: 13000, total: 45000 },
    { mes: "Mai", tradutores: 31000, admin: 13000, total: 44000 },
    { mes: "Jun", tradutores: 33500, admin: 13500, total: 47000 },
  ];

  const fluxoCaixa = [
    { mes: "Jan", entrada: 45000, saida: 38000, saldo: 7000 },
    { mes: "Fev", entrada: 52000, saida: 41000, saldo: 11000 },
    { mes: "Mar", entrada: 48000, saida: 39000, saldo: 9000 },
    { mes: "Abr", entrada: 61000, saida: 43000, saldo: 18000 },
    { mes: "Mai", entrada: 59000, saida: 42000, saldo: 17000 },
    { mes: "Jun", entrada: 67000, saida: 45000, saldo: 22000 },
  ];

  const analiseDE = {
    receita: 67000,
    custos: 45000,
    lucroOperacional: 22000,
    margemLucro: 32.8,
    impostos: 5500,
    lucroLiquido: 16500,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
            <div className="flex items-center gap-4">
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-background"
              >
                <option value="day">Hoje</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mês</option>
                <option value="quarter">Trimestre</option>
                <option value="year">Este Ano</option>
              </select>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Faturamento Total"
              value={loading ? "Carregando..." : formatCurrency(faturamentoTotal)}
              icon={<DollarSign className="h-5 w-5" />}
              description={loading ? "Calculando..." : `${documentQuantity.toLocaleString('pt-BR')} docs × R$ 50`}
            />
            <StatsCard
              title="Lucro Líquido"
              value={formatCurrency(0)}
              icon={<TrendingUp className="h-5 w-5" />}
              description="Margem: 0%"
            />
            <StatsCard
              title="Custos - Empresa"
              value={formatCurrency(24400)}
              icon={<Briefcase className="h-5 w-5" />}
              description="Despesas operacionais"
            />
            <StatsCard
              title="Custos - P. Serviço"
              value={formatCurrency(20600)}
              icon={<Users className="h-5 w-5" />}
              description="Prestadores de serviço"
            />
          </div>

          <Tabs defaultValue="faturamento" className="space-y-6">
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
              <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
              <TabsTrigger value="custos">Custo/Doc</TabsTrigger>
              <TabsTrigger value="despesas">Despesas</TabsTrigger>
              <TabsTrigger value="folha">Folha</TabsTrigger>
              <TabsTrigger value="caixa">Caixa</TabsTrigger>
              <TabsTrigger value="dre">Análise DRE</TabsTrigger>
            </TabsList>

            {/* Faturamento */}
            <TabsContent value="faturamento" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard 
                  title="Evolução do Faturamento"
                  description="Últimos 6 meses"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={faturamentoData}>
                      <defs>
                        <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="valor"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorFaturamento)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Métricas de Faturamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Ticket Médio</span>
                        <span className="font-bold text-lg">{formatCurrency(2233)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Crescimento Mensal</span>
                        <span className="font-bold text-lg text-green-500">+12.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Meta do Mês</span>
                        <div className="text-right">
                          <span className="font-bold text-lg">87%</span>
                          <div className="text-xs text-muted-foreground">de R$ 77.000</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Projeção Fim do Mês</span>
                        <span className="font-bold text-lg">{formatCurrency(72500)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Custo por Documento */}
            <TabsContent value="custos" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard 
                  title="Custo por Tipo de Documento"
                  description="Análise de custos unitários"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={custoPorDocumento}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="tipo" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        formatter={(value: any, name: string) => 
                          name === 'custo' ? formatCurrency(value) : value
                        }
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="custo" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="quantidade" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Análise de Custos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {custoPorDocumento.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.tipo}</span>
                            <span className="text-sm text-muted-foreground">{item.quantidade} docs</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${(item.quantidade / 2500) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold">{formatCurrency(item.custo)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Custo Médio Total</span>
                        <span className="font-bold text-lg">{formatCurrency(1.36)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Despesas Operacionais */}
            <TabsContent value="despesas" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard 
                  title="Distribuição de Despesas"
                  description="Por categoria"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={despesasOperacionais}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ categoria, percentual }) => `${categoria} ${percentual}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="valor"
                      >
                        {despesasOperacionais.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detalhamento de Despesas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {despesasOperacionais.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{item.categoria}</span>
                          </div>
                          <span className="font-bold">{formatCurrency(item.valor)}</span>
                        </div>
                        <div className="ml-5">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${item.percentual}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">Total de Despesas</span>
                        <span className="font-bold text-lg">{formatCurrency(24400)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Folha de Pagamento */}
            <TabsContent value="folha" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard 
                  title="Evolução da Folha de Pagamento"
                  description="Últimos 6 meses"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={folhaPagamento}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="tradutores" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Tradutores"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="admin" 
                        stroke="hsl(var(--secondary))" 
                        strokeWidth={2}
                        name="Administrativo"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Total"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Resumo da Folha</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Tradutores</span>
                        <span className="font-bold text-lg">{formatCurrency(33500)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Administrativo</span>
                        <span className="font-bold text-lg">{formatCurrency(13500)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Encargos (estimado)</span>
                        <span className="font-bold text-lg">{formatCurrency(9400)}</span>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total Geral</span>
                          <span className="font-bold text-xl text-primary">{formatCurrency(56400)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Equipe
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tradutores Ativos</span>
                        <span className="font-bold">24</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Equipe Admin</span>
                        <span className="font-bold">8</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Colaboradores</span>
                        <span className="font-bold">32</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Fluxo de Caixa */}
            <TabsContent value="caixa" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard 
                  title="Fluxo de Caixa Mensal"
                  description="Entradas vs Saídas"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fluxoCaixa}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Bar dataKey="entrada" fill="hsl(var(--primary))" name="Entradas" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="saida" fill="hsl(var(--destructive))" name="Saídas" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Resumo do Caixa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Saldo Anterior</span>
                        <span className="font-bold text-lg">{formatCurrency(45000)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total de Entradas</span>
                        <span className="font-bold text-lg text-green-500">
                          <ArrowUpRight className="inline h-4 w-4 mr-1" />
                          {formatCurrency(67000)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total de Saídas</span>
                        <span className="font-bold text-lg text-red-500">
                          <ArrowDownRight className="inline h-4 w-4 mr-1" />
                          {formatCurrency(45000)}
                        </span>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Saldo Atual</span>
                          <span className="font-bold text-xl text-primary">{formatCurrency(67000)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Projeções</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Próximo Mês</span>
                        <span className="font-bold">{formatCurrency(71000)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Próximo Trimestre</span>
                        <span className="font-bold">{formatCurrency(225000)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Capital de Giro</span>
                        <span className="font-bold text-green-500">Saudável</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Análise DRE */}
            <TabsContent value="dre" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Demonstração do Resultado do Exercício</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2">
                          <span className="font-medium">Receita Bruta</span>
                          <span className="font-bold">{formatCurrency(analiseDE.receita)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 text-sm text-muted-foreground">
                          <span className="ml-4">(-) Impostos sobre vendas</span>
                          <span>-{formatCurrency(6700)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t font-medium">
                          <span>Receita Líquida</span>
                          <span>{formatCurrency(60300)}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 text-sm text-muted-foreground">
                          <span className="ml-4">(-) Custo dos Serviços</span>
                          <span>-{formatCurrency(28000)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t font-medium">
                          <span>Lucro Bruto</span>
                          <span>{formatCurrency(32300)}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 text-sm text-muted-foreground">
                          <span className="ml-4">(-) Despesas Operacionais</span>
                          <span>-{formatCurrency(10300)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t font-medium">
                          <span>Lucro Operacional (EBIT)</span>
                          <span>{formatCurrency(analiseDE.lucroOperacional)}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 text-sm text-muted-foreground">
                          <span className="ml-4">(-) Impostos</span>
                          <span>-{formatCurrency(analiseDE.impostos)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-b-2 border-b-primary">
                          <span className="font-bold text-lg">Lucro Líquido</span>
                          <span className="font-bold text-lg text-primary">{formatCurrency(analiseDE.lucroLiquido)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Indicadores</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-muted-foreground">Margem Bruta</span>
                            <span className="font-bold">48.2%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: '48.2%' }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-muted-foreground">Margem Operacional</span>
                            <span className="font-bold">{analiseDE.margemLucro}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-secondary h-2 rounded-full" style={{ width: `${analiseDE.margemLucro}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-muted-foreground">Margem Líquida</span>
                            <span className="font-bold">24.6%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-accent h-2 rounded-full" style={{ width: '24.6%' }} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ChartBar className="h-5 w-5" />
                        Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">ROI</span>
                        <span className="font-bold text-green-500">+18.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">EBITDA</span>
                        <span className="font-bold">{formatCurrency(24500)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Ponto de Equilíbrio</span>
                        <span className="font-bold">{formatCurrency(38000)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}