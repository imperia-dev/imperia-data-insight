import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useSidebar } from "@/contexts/SidebarContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  items?: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  option_1_label: string;
  option_1_description: string | null;
  option_2_label: string;
  option_2_description: string | null;
  display_order: number;
  is_required: boolean;
}

interface ChecklistResponse {
  id: string;
  template_id: string;
  item_id: string;
  user_id: string;
  order_id: string | null;
  selected_option: string;
  created_at: string;
}

interface CompletedChecklist {
  order_id: string;
  template_name: string;
  completed_at: string;
  responses: ChecklistResponse[];
}

export default function ReviewChecklist() {
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();
  const [userName, setUserName] = useState("");

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [orderId, setOrderId] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [completedChecklists, setCompletedChecklists] = useState<CompletedChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("fill");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (data) setUserName(data.full_name || "");
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('review_checklist_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch items for each template
      const templatesWithItems = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: items } = await supabase
            .from('review_checklist_items')
            .select('*')
            .eq('template_id', template.id)
            .order('display_order', { ascending: true });
          return { ...template, items: items || [] };
        })
      );

      setTemplates(templatesWithItems);
      if (templatesWithItems.length > 0 && !selectedTemplate) {
        setSelectedTemplate(templatesWithItems[0]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedChecklists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: responsesData, error } = await supabase
        .from('review_checklist_responses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by order_id
      const groupedByOrder = (responsesData || []).reduce((acc, response) => {
        const key = response.order_id || 'no_order';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(response);
        return acc;
      }, {} as Record<string, ChecklistResponse[]>);

      // Get unique completed checklists
      const completed: CompletedChecklist[] = [];
      const seenOrders = new Set<string>();

      for (const [orderId, orderResponses] of Object.entries(groupedByOrder)) {
        if (!seenOrders.has(orderId) && orderId !== 'no_order') {
          seenOrders.add(orderId);
          
          // Get template name
          const templateId = orderResponses[0]?.template_id;
          const template = templates.find(t => t.id === templateId);
          
          completed.push({
            order_id: orderId,
            template_name: template?.name || 'Checklist',
            completed_at: orderResponses[0]?.created_at || '',
            responses: orderResponses
          });
        }
      }

      setCompletedChecklists(completed);
    } catch (error) {
      console.error('Error fetching completed checklists:', error);
    }
  };

  const handleResponseChange = (itemId: string, value: string) => {
    setResponses(prev => ({ ...prev, [itemId]: value }));
  };

  const validateResponses = () => {
    if (!selectedTemplate?.items) return false;
    if (!orderId.trim()) {
      toast.error('Por favor, informe o ID do pedido');
      return false;
    }

    const requiredItems = selectedTemplate.items.filter(item => item.is_required);
    for (const item of requiredItems) {
      if (!responses[item.id]) {
        toast.error(`Por favor, responda: "${item.title}"`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateResponses() || !selectedTemplate) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Check if already filled for this order
      const { data: existingResponses } = await supabase
        .from('review_checklist_responses')
        .select('id')
        .eq('order_id', orderId.trim())
        .eq('user_id', user.id)
        .limit(1);

      if (existingResponses && existingResponses.length > 0) {
        toast.error('Checklist já preenchido para este pedido');
        return;
      }

      // Insert all responses
      const responsesToInsert = Object.entries(responses).map(([itemId, selectedOption]) => ({
        template_id: selectedTemplate.id,
        item_id: itemId,
        user_id: user.id,
        order_id: orderId.trim(),
        selected_option: selectedOption
      }));

      const { error } = await supabase
        .from('review_checklist_responses')
        .insert(responsesToInsert);

      if (error) throw error;

      toast.success('Checklist enviado com sucesso!');
      setResponses({});
      setOrderId("");
      fetchCompletedChecklists();
      setActiveTab("history");
    } catch (error) {
      console.error('Error submitting checklist:', error);
      toast.error('Erro ao enviar checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const getResponsesCount = () => {
    if (!selectedTemplate?.items) return { filled: 0, total: 0 };
    const total = selectedTemplate.items.length;
    const filled = Object.keys(responses).length;
    return { filled, total };
  };

  if (roleLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { filled, total } = getResponsesCount();

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar userRole={userRole || ''} />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header userName={userName} userRole={userRole || ''} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Checklist de Revisão</h1>
              <p className="text-muted-foreground">
                Preencha o checklist de verificação para seus pedidos
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fill" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Preencher
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fill" className="space-y-6 mt-6">
                {templates.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        Nenhum checklist disponível no momento
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Order ID Input */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Informações do Pedido</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Label htmlFor="orderId">ID do Pedido *</Label>
                          <Input
                            id="orderId"
                            placeholder="Ex: PED-001"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Template Info */}
                    {selectedTemplate && (
                      <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle>{selectedTemplate.name}</CardTitle>
                            <Badge variant="outline">
                              {filled}/{total} respondidos
                            </Badge>
                          </div>
                          {selectedTemplate.description && (
                            <CardDescription>{selectedTemplate.description}</CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    )}

                    {/* Checklist Items */}
                    {selectedTemplate?.items?.map((item, index) => (
                      <Card key={item.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <CardTitle className="text-base flex items-center gap-2">
                                {item.title}
                                {item.is_required && (
                                  <span className="text-destructive">*</span>
                                )}
                              </CardTitle>
                              {item.description && (
                                <CardDescription className="mt-1">
                                  {item.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        {item.image_url && (
                          <div className="px-6 pb-4">
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="rounded-lg max-h-48 object-contain"
                            />
                          </div>
                        )}
                        
                        <CardContent>
                          <RadioGroup
                            value={responses[item.id] || ""}
                            onValueChange={(value) => handleResponseChange(item.id, value)}
                          >
                            <div className="space-y-3">
                              <label
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  responses[item.id] === 'option_1'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/50'
                                }`}
                              >
                                <RadioGroupItem value="option_1" className="mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-medium">{item.option_1_label}</p>
                                  {item.option_1_description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {item.option_1_description}
                                    </p>
                                  )}
                                </div>
                              </label>
                              <label
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  responses[item.id] === 'option_2'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/50'
                                }`}
                              >
                                <RadioGroupItem value="option_2" className="mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-medium">{item.option_2_label}</p>
                                  {item.option_2_description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {item.option_2_description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            </div>
                          </RadioGroup>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Submit Button */}
                    <Card>
                      <CardContent className="pt-6">
                        <Button
                          onClick={handleSubmit}
                          disabled={submitting || filled < total}
                          className="w-full"
                          size="lg"
                        >
                          {submitting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Enviar Checklist
                        </Button>
                        {filled < total && (
                          <p className="text-sm text-muted-foreground text-center mt-2">
                            Complete todas as respostas para enviar
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-6">
                {completedChecklists.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        Nenhum checklist preenchido ainda
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  completedChecklists.map((checklist) => (
                    <Card key={checklist.order_id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                              <CardTitle className="text-base">
                                Pedido: {checklist.order_id}
                              </CardTitle>
                              <CardDescription>
                                {checklist.template_name}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {format(new Date(checklist.completed_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR
                            })}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
