import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Users, Eye, MousePointer, RefreshCw, AlertCircle, Facebook, BarChart, Target, Activity } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useConstructionPage } from "@/hooks/useConstructionPage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LineChart, Line, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardMarketing() {
  const { userRole, userName, mainContainerClass } = useConstructionPage();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState("30");
  const [totalSpend, setTotalSpend] = useState(0);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalConversions, setTotalConversions] = useState(0);
  const [avgCPM, setAvgCPM] = useState(0);
  const [avgCPC, setAvgCPC] = useState(0);
  const [avgCTR, setAvgCTR] = useState(0);
  const [roas, setRoas] = useState(0);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchCampaigns();
      fetchMetrics();
    }
  }, [selectedAccount, dateRange]);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('facebook_accounts')
      .select('*')
      .order('account_name');
    
    if (error) {
      console.error('Error fetching accounts:', error);
    } else {
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccount(data[0].id);
      }
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facebook_campaigns')
      .select('*, facebook_ad_sets(*), facebook_ads(*)')
      .eq('account_id', selectedAccount)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching campaigns:', error);
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  const fetchMetrics = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    
    const { data, error } = await supabase
      .from('facebook_metrics')
      .select('*')
      .eq('account_id', selectedAccount)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date');
    
    if (error) {
      console.error('Error fetching metrics:', error);
    } else {
      setMetrics(data || []);
      calculateTotals(data || []);
    }
  };

  const calculateTotals = (data: any[]) => {
    const spend = data.reduce((sum, m) => sum + (m.spend || 0), 0);
    const impressions = data.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const clicks = data.reduce((sum, m) => sum + (m.clicks || 0), 0);
    const conversions = data.reduce((sum, m) => sum + (m.conversions || 0), 0);
    const conversionValue = data.reduce((sum, m) => sum + (m.conversion_value || 0), 0);
    
    setTotalSpend(spend);
    setTotalImpressions(impressions);
    setTotalClicks(clicks);
    setTotalConversions(conversions);
    setAvgCPM(impressions > 0 ? (spend / impressions) * 1000 : 0);
    setAvgCPC(clicks > 0 ? spend / clicks : 0);
    setAvgCTR(impressions > 0 ? (clicks / impressions) * 100 : 0);
    setRoas(spend > 0 ? conversionValue / spend : 0);
  };

  const handleSyncData = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    const account = accounts.find(a => a.id === selectedAccount);
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase.functions.invoke('sync-facebook-data', {
        body: {
          accountId: account.account_id,
          dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
          dateTo: new Date().toISOString().split('T')[0]
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        if (data.error === 'Facebook access token not configured') {
          toast.error("Configure o token de acesso do Facebook nas configurações");
        } else {
          toast.error(data.error);
        }
      } else {
        toast.success("Dados sincronizados com sucesso");
        await fetchCampaigns();
        await fetchMetrics();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error("Erro ao sincronizar dados");
    } finally {
      setLoading(false);
    }
  };

  const chartData = metrics.map(m => ({
    date: format(new Date(m.date), 'dd/MM', { locale: ptBR }),
    spend: m.spend || 0,
    impressions: m.impressions || 0,
    clicks: m.clicks || 0,
    conversions: m.conversions || 0
  }));

  const campaignPerformance = campaigns.map(c => ({
    name: c.campaign_name?.substring(0, 20) + '...',
    spend: c.budget_spent || 0,
    status: c.status
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Facebook className="h-8 w-8 text-blue-600" />
              Dashboard Marketing - Facebook Ads
            </h1>
            
            <div className="flex items-center gap-4">
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={handleSyncData} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <Alert className="max-w-2xl mx-auto mt-12">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma conta do Facebook configurada. 
                Configure sua integração do Facebook nas <a href="/settings" className="underline">configurações</a>.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">R$ {totalSpend.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Período selecionado</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Impressões</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalImpressions.toLocaleString('pt-BR')}</div>
                    <p className="text-xs text-muted-foreground">CPM: R$ {avgCPM.toFixed(2)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cliques</CardTitle>
                    <MousePointer className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalClicks.toLocaleString('pt-BR')}</div>
                    <p className="text-xs text-muted-foreground">
                      CPC: R$ {avgCPC.toFixed(2)} | CTR: {avgCTR.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversões</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalConversions.toLocaleString('pt-BR')}</div>
                    <p className="text-xs text-muted-foreground">ROAS: {roas.toFixed(2)}x</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <Tabs defaultValue="performance" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
                  <TabsTrigger value="metrics">Métricas</TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Evolução de Gastos e Resultados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="spend" stroke="#3b82f6" name="Gasto (R$)" />
                          <Line type="monotone" dataKey="clicks" stroke="#10b981" name="Cliques" />
                          <Line type="monotone" dataKey="conversions" stroke="#f59e0b" name="Conversões" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="campaigns" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance por Campanha</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <RechartsBarChart data={campaignPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="spend" fill="#3b82f6" name="Gasto (R$)" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Status das Campanhas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {campaigns.slice(0, 5).map(campaign => (
                            <div key={campaign.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm font-medium truncate flex-1">
                                {campaign.campaign_name}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {campaign.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Objetivos das Campanhas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={campaigns.reduce((acc: any[], c) => {
                                const existing = acc.find(item => item.name === c.objective);
                                if (existing) {
                                  existing.value++;
                                } else {
                                  acc.push({ name: c.objective || 'Não definido', value: 1 });
                                }
                                return acc;
                              }, [])}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => `${entry.name}: ${entry.value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {campaigns.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Taxa de Cliques (CTR)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line 
                              type="monotone" 
                              dataKey={(entry) => entry.impressions > 0 ? (entry.clicks / entry.impressions * 100).toFixed(2) : 0} 
                              stroke="#10b981" 
                              name="CTR (%)" 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Custo por Mil Impressões (CPM)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line 
                              type="monotone" 
                              dataKey={(entry) => entry.impressions > 0 ? (entry.spend / entry.impressions * 1000).toFixed(2) : 0} 
                              stroke="#f59e0b" 
                              name="CPM (R$)" 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>
    </div>
  );
}