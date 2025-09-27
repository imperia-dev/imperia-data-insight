import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  Filter,
  RefreshCw,
  MessageCircle,
  GripVertical
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useConstructionPage } from "@/hooks/useConstructionPage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  source: string | null;
  message: string | null;
  created_at: string;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "closed-won" | "closed-lost";
  value: number;
  probability: number;
  owner: string;
  nextAction: string;
  daysInStage: number;
  monthly_revenue: string | null;
  interest_level: number | null;
  meeting_time: string | null;
}

const pipelineStages = [
  { id: "lead", name: "Lead", color: "bg-gray-500", probability: 20 },
  { id: "qualified", name: "Qualificado", color: "bg-blue-500", probability: 40 },
  { id: "proposal", name: "Proposta", color: "bg-purple-500", probability: 60 },
  { id: "negotiation", name: "Negociação", color: "bg-yellow-500", probability: 80 },
  { id: "closed-won", name: "Ganho", color: "bg-green-500", probability: 100 },
  { id: "closed-lost", name: "Perdido", color: "bg-red-500", probability: 0 }
];

export default function DashboardComercial() {
  const { userRole, userName, mainContainerClass } = useConstructionPage();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch leads from database
  useEffect(() => {
    fetchLeads();

    // Set up real-time subscription
    const channel = supabase
      .channel('leads-comercial')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          toast({
            title: "🎉 Novo lead recebido!",
            description: `${payload.new.name} - ${payload.new.company || 'Empresa não informada'}`,
          });
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database leads to pipeline format
      const transformedLeads: Lead[] = (data || []).map((lead) => {
        // Calculate days since creation
        const daysInStage = differenceInDays(new Date(), new Date(lead.created_at));
        
        // Use stage from database or default to 'lead'
        const stage = lead.stage || 'lead';
        const stageConfig = pipelineStages.find(s => s.id === stage) || pipelineStages[0];
        
        // Calculate estimated value based on source or a default
        let estimatedValue = 50000; // Default value
        
        // You can adjust value based on source
        if (lead.source === 'landing-page') {
          estimatedValue = 75000;
        } else if (lead.source === 'website') {
          estimatedValue = 60000;
        }

        return {
          id: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          message: lead.message,
          created_at: lead.created_at,
          stage: stage as Lead['stage'],
          value: estimatedValue,
          probability: lead.probability || stageConfig.probability,
          owner: 'Comercial',
          nextAction: stage === 'lead' ? 'Qualificar lead' : 
                     stage === 'qualified' ? 'Enviar proposta' :
                     stage === 'proposal' ? 'Negociar termos' :
                     stage === 'negotiation' ? 'Fechar negócio' :
                     stage === 'closed-won' ? 'Iniciar onboarding' : 'Analisar motivos',
          daysInStage,
          monthly_revenue: lead.monthly_revenue,
          interest_level: lead.interest_level,
          meeting_time: lead.meeting_time
        };
      });

      setLeads(transformedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro ao carregar leads",
        description: "Não foi possível carregar os leads. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLeadsByStage = (stage: string) => {
    return leads.filter(lead => lead.stage === stage);
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (stage: string) => {
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedLead || draggedLead.stage === newStage) return;

    // Find the stage configuration
    const stageConfig = pipelineStages.find(s => s.id === newStage);
    if (!stageConfig) return;

    // Update lead locally for immediate feedback
    const updatedLeads = leads.map(lead => 
      lead.id === draggedLead.id 
        ? { ...lead, stage: newStage as Lead['stage'], probability: stageConfig.probability }
        : lead
    );
    setLeads(updatedLeads);

    try {
      // Update the database
      const { error } = await supabase
        .from('leads')
        .update({ 
          stage: newStage,
          probability: stageConfig.probability,
          updated_at: new Date().toISOString()
        })
        .eq('id', draggedLead.id);

      if (error) throw error;

      // Show success message
      toast({
        title: "✅ Lead movido com sucesso!",
        description: `${draggedLead.name} foi movido para ${stageConfig.name}`,
      });
    } catch (error) {
      console.error('Error updating lead stage:', error);
      
      // Revert the local change on error
      fetchLeads();
      
      toast({
        title: "Erro ao mover lead",
        description: "Não foi possível salvar a mudança. Tente novamente.",
        variant: "destructive"
      });
    }
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
                <div className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(leads.reduce((sum, lead) => sum + lead.value, 0))}
                </div>
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
                <div className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : leads.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {leads.filter(l => differenceInDays(new Date(), new Date(l.created_at)) <= 7).length} novos esta semana
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : 
                    `${leads.length > 0 ? Math.round((leads.filter(l => l.stage === 'closed-won').length / leads.length) * 100) : 0}%`
                  }</div>
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
                  <Button variant="outline" size="sm" onClick={fetchLeads}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
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
              {isLoading ? (
                <div className="flex gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex-1 min-w-[280px]">
                      <Skeleton className="h-20 rounded-t-lg" />
                      <div className="border border-t-0 rounded-b-lg p-2 min-h-[400px]">
                        <div className="space-y-2">
                          <Skeleton className="h-32" />
                          <Skeleton className="h-32" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[600px] w-full rounded-md border">
                  <div className="flex gap-4 p-4 min-w-max">
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
                        
                        <div 
                          className={`bg-muted/20 border border-t-0 rounded-b-lg p-2 min-h-[400px] transition-all duration-200 ${
                            dragOverStage === stage.id ? 'bg-primary/10 border-primary' : ''
                          }`}
                          onDragOver={handleDragOver}
                          onDragEnter={() => handleDragEnter(stage.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, stage.id)}
                        >
                          <div className="space-y-2">
                            {getLeadsByStage(stage.id).length === 0 ? (
                              <p className="text-center text-sm text-muted-foreground py-8">
                                Nenhum lead neste estágio
                              </p>
                            ) : (
                              getLeadsByStage(stage.id).map(lead => (
                                <Card 
                                  key={lead.id} 
                                  className={`cursor-move hover:shadow-md transition-all duration-200 ${
                                    draggedLead?.id === lead.id ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'
                                  }`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, lead)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <CardContent className="p-3">
                                    {/* Header com nome e empresa */}
                                    <div className="flex items-center gap-2 mb-3">
                                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                      <div className="flex-1">
                                        <p className="font-semibold text-sm">{lead.name}</p>
                                        {lead.company && (
                                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Building className="h-3 w-3" />
                                            {lead.company}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Informações principais */}
                                    <div className="space-y-2 text-xs">
                                      {/* Email */}
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-3 w-3 text-muted-foreground" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                      
                                      {/* Telefone */}
                                      {lead.phone && (
                                        <div className="flex items-center gap-2">
                                          <Phone className="h-3 w-3 text-muted-foreground" />
                                          <span>{lead.phone}</span>
                                        </div>
                                      )}
                                      
                                      {/* Receita Mensal */}
                                      {lead.monthly_revenue && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Receita Mensal:</span>
                                          <span className="font-medium">{lead.monthly_revenue}</span>
                                        </div>
                                      )}
                                      
                                      {/* Nível de Interesse */}
                                      {lead.interest_level !== null && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Interesse:</span>
                                          <div className="flex items-center gap-1">
                                            <span className="font-medium">{lead.interest_level}/10</span>
                                            <Progress 
                                              value={lead.interest_level * 10} 
                                              className="w-12 h-2"
                                            />
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Horário da Reunião */}
                                      {lead.meeting_time && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Reunião:</span>
                                          <span className="font-medium">
                                            {format(new Date(lead.meeting_time), "dd/MM HH:mm", { locale: ptBR })}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Ações */}
                                    <div className="flex gap-2 mt-3 pt-3 border-t">
                                      <Button size="sm" variant="outline" className="h-7 flex-1">
                                        <MessageCircle className="h-3 w-3 mr-1" />
                                        Contatar
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}