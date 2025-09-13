import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Phone,
  Mail,
  Building,
  ChevronRight,
  Plus,
  Filter
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useConstructionPage } from "@/hooks/useConstructionPage";

interface Lead {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "closed-won" | "closed-lost";
  probability: number;
  daysInStage: number;
  nextAction: string;
  owner: string;
}

const mockLeads: Lead[] = [
  {
    id: "1",
    name: "João Silva",
    company: "Tech Solutions Ltda",
    value: 45000,
    stage: "lead",
    probability: 20,
    daysInStage: 3,
    nextAction: "Agendar reunião inicial",
    owner: "Carlos Santos"
  },
  {
    id: "2",
    name: "Maria Oliveira",
    company: "Inovação Digital",
    value: 78000,
    stage: "qualified",
    probability: 40,
    daysInStage: 5,
    nextAction: "Enviar proposta",
    owner: "Ana Costa"
  },
  {
    id: "3",
    name: "Pedro Almeida",
    company: "Consultoria ABC",
    value: 120000,
    stage: "proposal",
    probability: 60,
    daysInStage: 7,
    nextAction: "Follow-up proposta",
    owner: "Carlos Santos"
  },
  {
    id: "4",
    name: "Ana Costa",
    company: "Startup XYZ",
    value: 35000,
    stage: "negotiation",
    probability: 80,
    daysInStage: 10,
    nextAction: "Ajustar termos contratuais",
    owner: "Ana Costa"
  },
  {
    id: "5",
    name: "Roberto Lima",
    company: "Empresa 123",
    value: 95000,
    stage: "closed-won",
    probability: 100,
    daysInStage: 2,
    nextAction: "Iniciar onboarding",
    owner: "Carlos Santos"
  }
];

const pipelineStages = [
  { id: "lead", name: "Lead", color: "bg-gray-500" },
  { id: "qualified", name: "Qualificado", color: "bg-blue-500" },
  { id: "proposal", name: "Proposta", color: "bg-purple-500" },
  { id: "negotiation", name: "Negociação", color: "bg-yellow-500" },
  { id: "closed-won", name: "Ganho", color: "bg-green-500" },
  { id: "closed-lost", name: "Perdido", color: "bg-red-500" }
];

export default function DashboardComercial() {
  const { userRole, userName, mainContainerClass } = useConstructionPage();

  const getLeadsByStage = (stage: string) => {
    return mockLeads.filter(lead => lead.stage === stage);
  };

  const getTotalValueByStage = (stage: string) => {
    return getLeadsByStage(stage).reduce((sum, lead) => sum + lead.value, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-foreground">Dashboard Comercial</h1>
          
          {/* KPIs Section */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(373000)}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">+12%</span> vs mês anterior
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">
                  5 novos esta semana
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">32%</div>
                <Progress value={32} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio Ciclo</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">21 dias</div>
                <p className="text-xs text-muted-foreground">
                  Meta: 18 dias
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CRM Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">CRM - Pipeline de Vendas</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lead
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="flex gap-4 pb-4">
                  {pipelineStages.map(stage => (
                    <div key={stage.id} className="flex-1 min-w-[280px]">
                      <div className={`${stage.color} text-white p-3 rounded-t-lg`}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{stage.name}</h3>
                          <Badge variant="secondary" className="bg-white/20 text-white">
                            {getLeadsByStage(stage.id).length}
                          </Badge>
                        </div>
                        <p className="text-sm opacity-90 mt-1">
                          {formatCurrency(getTotalValueByStage(stage.id))}
                        </p>
                      </div>
                      
                      <div className="bg-muted/20 border border-t-0 rounded-b-lg p-2 min-h-[400px]">
                        <div className="space-y-2">
                          {getLeadsByStage(stage.id).map(lead => (
                            <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow">
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-sm">{lead.name}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Building className="h-3 w-3" />
                                      {lead.company}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {lead.probability}%
                                  </Badge>
                                </div>
                                
                                <div className="text-lg font-bold text-primary mb-2">
                                  {formatCurrency(lead.value)}
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Responsável:</span>
                                    <span className="font-medium">{lead.owner}</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Dias no estágio:</span>
                                    <span className="font-medium">{lead.daysInStage}</span>
                                  </div>
                                </div>
                                
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-xs text-muted-foreground">Próxima ação:</p>
                                  <p className="text-xs font-medium flex items-center gap-1">
                                    <ChevronRight className="h-3 w-3" />
                                    {lead.nextAction}
                                  </p>
                                </div>
                                
                                <div className="flex gap-2 mt-3">
                                  <Button size="sm" variant="ghost" className="h-7 px-2">
                                    <Phone className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2">
                                    <Mail className="h-3 w-3" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}