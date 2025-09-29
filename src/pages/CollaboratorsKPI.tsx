import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { cn } from "@/lib/utils";
import { Users, TrendingUp, Target, Award, Activity, BarChart3, Clock, CheckCircle } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CollaboratorsKPI() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("all");
  const { mainContainerClass } = usePageLayout();

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
                Acompanhe o desempenho e produtividade da equipe de operação
              </p>
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os colaboradores</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
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
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPI Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total de Colaboradores"
              value="12"
              change={8}
              trend="up"
              icon={<Users className="h-5 w-5" />}
              description="Ativos no período"
            />
            <StatsCard
              title="Produtividade Média"
              value="87%"
              change={5}
              trend="up"
              icon={<TrendingUp className="h-5 w-5" />}
              description="Meta: 85%"
            />
            <StatsCard
              title="Taxa de Conclusão"
              value="94%"
              change={-2}
              trend="down"
              icon={<CheckCircle className="h-5 w-5" />}
              description="Tarefas concluídas"
            />
            <StatsCard
              title="Tempo Médio"
              value="2.5h"
              change={-15}
              trend="up"
              icon={<Clock className="h-5 w-5" />}
              description="Por tarefa"
            />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Métricas de Desempenho
                </CardTitle>
                <CardDescription>
                  Indicadores principais de performance individual e coletiva
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium">Documentos Processados</span>
                    <span className="text-2xl font-bold text-primary">1,234</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium">Pedidos Atendidos</span>
                    <span className="text-2xl font-bold text-primary">456</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium">Tempo de Resposta Médio</span>
                    <span className="text-2xl font-bold text-primary">45min</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium">SLA Cumprido</span>
                    <span className="text-2xl font-bold text-primary">98%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Top Performers
                </CardTitle>
                <CardDescription>
                  Colaboradores com melhor desempenho no período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">João Silva</p>
                        <p className="text-xs text-muted-foreground">156 tarefas</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">95%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-400/10 to-gray-500/10 border border-gray-400/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Maria Santos</p>
                        <p className="text-xs text-muted-foreground">142 tarefas</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-600">92%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-600/10 to-orange-700/10 border border-orange-600/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Pedro Costa</p>
                        <p className="text-xs text-muted-foreground">138 tarefas</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-orange-700">90%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Configuration Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Configuração de Indicadores
              </CardTitle>
              <CardDescription>
                Área para definição e configuração dos KPIs dos colaboradores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center space-y-4">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p>Os indicadores específicos serão configurados em breve</p>
                  <Button variant="outline">
                    Configurar Indicadores
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}