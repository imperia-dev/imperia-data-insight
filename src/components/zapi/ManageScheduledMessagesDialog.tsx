import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Clock, 
  Calendar,
  MessageCircle,
  Users,
  Save,
  X,
  History,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ManageWhatsAppContactsDialog } from "./ManageWhatsAppContactsDialog";

interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
}

interface ScheduledMessage {
  id: string;
  name: string;
  message_template: string;
  schedule_type: string;
  schedule_time: string;
  schedule_days: string[];
  is_active: boolean;
  include_metrics: Record<string, boolean>;
  next_execution: string | null;
  last_executed_at: string | null;
  created_at: string;
}

interface ScheduledMessageLog {
  id: string;
  executed_at: string;
  status: string;
  contacts_sent: number;
  contacts_failed: number;
  error_message: string | null;
}

interface ManageScheduledMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Seg' },
  { value: 'tue', label: 'Ter' },
  { value: 'wed', label: 'Qua' },
  { value: 'thu', label: 'Qui' },
  { value: 'fri', label: 'Sex' },
  { value: 'sat', label: 'Sáb' },
  { value: 'sun', label: 'Dom' },
];

const METRIC_OPTIONS = [
  { key: 'attributed', label: 'Documentos Atribuídos' },
  { key: 'inProgress', label: 'Em Andamento' },
  { key: 'delivered', label: 'Entregues' },
  { key: 'urgencies', label: 'Urgências' },
  { key: 'pendencies', label: 'Pendências' },
  { key: 'delays', label: 'Atrasos' },
];

export function ManageScheduledMessagesDialog({
  open,
  onOpenChange,
}: ManageScheduledMessagesDialogProps) {
  const [schedules, setSchedules] = useState<ScheduledMessage[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<ScheduledMessageLog[]>([]);
  const [selectedScheduleForLogs, setSelectedScheduleForLogs] = useState<string | null>(null);
  const [contactsDialogOpen, setContactsDialogOpen] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formScheduleType, setFormScheduleType] = useState("daily");
  const [formScheduleTime, setFormScheduleTime] = useState("09:00");
  const [formScheduleDays, setFormScheduleDays] = useState<string[]>([]);
  const [formSelectedContacts, setFormSelectedContacts] = useState<Set<string>>(new Set());
  const [formIncludeMetrics, setFormIncludeMetrics] = useState<Record<string, boolean>>({
    attributed: true,
    inProgress: true,
    delivered: true,
    urgencies: true,
    pendencies: true,
    delays: false,
  });
  const [formMessageTemplate, setFormMessageTemplate] = useState("");
  
  useEffect(() => {
    if (open) {
      fetchSchedules();
      fetchContacts();
    }
  }, [open]);
  
  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Cast data to handle JSONB include_metrics field
      const typedData = (data || []).map(item => ({
        ...item,
        include_metrics: (item.include_metrics as Record<string, boolean>) || {}
      }));
      
      setSchedules(typedData);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os agendamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .select('id, name, phone')
        .order('name');
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };
  
  const fetchLogs = async (scheduleId: string) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_message_logs')
        .select('*')
        .eq('scheduled_message_id', scheduleId)
        .order('executed_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setLogs(data || []);
      setSelectedScheduleForLogs(scheduleId);
      setShowLogs(true);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };
  
  const resetForm = () => {
    setFormName("");
    setFormScheduleType("daily");
    setFormScheduleTime("09:00");
    setFormScheduleDays([]);
    setFormSelectedContacts(new Set());
    setFormIncludeMetrics({
      attributed: true,
      inProgress: true,
      delivered: true,
      urgencies: true,
      pendencies: true,
      delays: false,
    });
    setFormMessageTemplate("");
    setIsEditing(false);
    setEditingId(null);
  };
  
  const startEdit = async (schedule: ScheduledMessage) => {
    setShowLogs(null); // Clear logs view to show edit form
    setFormName(schedule.name);
    setFormScheduleType(schedule.schedule_type);
    setFormScheduleTime(schedule.schedule_time);
    setFormScheduleDays(schedule.schedule_days || []);
    setFormIncludeMetrics(schedule.include_metrics || {});
    setFormMessageTemplate(schedule.message_template || "");
    setEditingId(schedule.id);
    setIsEditing(true);
    
    // Fetch contacts for this schedule
    const { data: contactLinks } = await supabase
      .from('scheduled_message_contacts')
      .select('whatsapp_contact_id')
      .eq('scheduled_message_id', schedule.id);
    
    if (contactLinks) {
      setFormSelectedContacts(new Set(contactLinks.map(c => c.whatsapp_contact_id)));
    }
  };
  
  const handleSave = async () => {
    if (!formName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do agendamento é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    if (formSelectedContacts.size === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um contato.",
        variant: "destructive",
      });
      return;
    }
    
    if (formScheduleType === 'weekly' && formScheduleDays.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um dia da semana.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const scheduleData = {
        name: formName,
        message_template: formMessageTemplate,
        schedule_type: formScheduleType,
        schedule_time: formScheduleTime,
        schedule_days: formScheduleDays,
        include_metrics: formIncludeMetrics,
      };
      
      let scheduleId: string;
      
      if (editingId) {
        const { error } = await supabase
          .from('scheduled_messages')
          .update(scheduleData)
          .eq('id', editingId);
        
        if (error) throw error;
        scheduleId = editingId;
        
        // Delete existing contact links
        await supabase
          .from('scheduled_message_contacts')
          .delete()
          .eq('scheduled_message_id', editingId);
      } else {
        const { data, error } = await supabase
          .from('scheduled_messages')
          .insert(scheduleData)
          .select('id')
          .single();
        
        if (error) throw error;
        scheduleId = data.id;
      }
      
      // Insert contact links
      const contactLinks = Array.from(formSelectedContacts).map(contactId => ({
        scheduled_message_id: scheduleId,
        whatsapp_contact_id: contactId,
      }));
      
      const { error: linksError } = await supabase
        .from('scheduled_message_contacts')
        .insert(contactLinks);
      
      if (linksError) throw linksError;
      
      toast({
        title: "Sucesso",
        description: editingId ? "Agendamento atualizado!" : "Agendamento criado!",
      });
      
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o agendamento.",
        variant: "destructive",
      });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
    
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Agendamento excluído!",
      });
      
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o agendamento.",
        variant: "destructive",
      });
    }
  };
  
  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({ is_active: !currentActive })
        .eq('id', id);
      
      if (error) throw error;
      
      fetchSchedules();
    } catch (error) {
      console.error('Error toggling active:', error);
    }
  };
  
  const toggleDay = (day: string) => {
    setFormScheduleDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };
  
  const toggleContact = (contactId: string) => {
    setFormSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };
  
  const toggleMetric = (key: string) => {
    setFormIncludeMetrics(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  
  const getScheduleTypeLabel = (type: string) => {
    switch (type) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      default: return type;
    }
  };
  
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Agendamento de Mensagens Automáticas
            </DialogTitle>
            <DialogDescription>
              Configure o envio automático de relatórios via WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex gap-4">
            {/* Left side - List of schedules */}
            <div className="w-1/2 flex flex-col border-r pr-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Agendamentos</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setIsEditing(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Novo
                </Button>
              </div>
              
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Carregando...
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum agendamento configurado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map(schedule => (
                      <div
                        key={schedule.id}
                        className={`p-3 rounded-lg border ${
                          schedule.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={schedule.is_active}
                              onCheckedChange={() => toggleActive(schedule.id, schedule.is_active)}
                            />
                            <span className="font-medium">{schedule.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => fetchLogs(schedule.id)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => startEdit(schedule)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{getScheduleTypeLabel(schedule.schedule_type)}</span>
                            <span>às {schedule.schedule_time}</span>
                          </div>
                          
                          {schedule.schedule_type === 'weekly' && schedule.schedule_days?.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {schedule.schedule_days.map(day => (
                                <Badge key={day} variant="secondary" className="text-xs">
                                  {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {schedule.next_execution && (
                            <div className="text-xs">
                              Próximo: {format(new Date(schedule.next_execution), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                          )}
                          
                          {schedule.last_executed_at && (
                            <div className="text-xs opacity-70">
                              Último: {format(new Date(schedule.last_executed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* Right side - Form or Logs */}
            <div className="w-1/2 flex flex-col pl-4">
              {showLogs ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Histórico de Execuções</h3>
                    <Button size="sm" variant="ghost" onClick={() => setShowLogs(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    {logs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma execução registrada
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {logs.map(log => (
                          <div key={log.id} className="p-3 rounded-lg border text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.executed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                              {log.status === 'success' ? (
                                <Badge className="bg-green-500/20 text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Sucesso
                                </Badge>
                              ) : log.status === 'partial' ? (
                                <Badge className="bg-yellow-500/20 text-yellow-600">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Parcial
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Falha
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-4 text-muted-foreground">
                              <span>✓ {log.contacts_sent} enviados</span>
                              {log.contacts_failed > 0 && (
                                <span className="text-destructive">✗ {log.contacts_failed} falhas</span>
                              )}
                            </div>
                            {log.error_message && (
                              <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </>
              ) : isEditing ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">
                      {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </h3>
                    <Button size="sm" variant="ghost" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1 pr-2">
                    <div className="space-y-4">
                      <div>
                        <Label>Nome do Agendamento</Label>
                        <Input
                          value={formName}
                          onChange={e => setFormName(e.target.value)}
                          placeholder="Ex: Relatório Diário Manhã"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Frequência</Label>
                          <Select value={formScheduleType} onValueChange={setFormScheduleType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Diário</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensal (dia 1)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Horário</Label>
                          <Input
                            type="time"
                            value={formScheduleTime}
                            onChange={e => setFormScheduleTime(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {formScheduleType === 'weekly' && (
                        <div>
                          <Label>Dias da Semana</Label>
                          <div className="flex gap-2 flex-wrap mt-2">
                            {DAYS_OF_WEEK.map(day => (
                              <Button
                                key={day.value}
                                size="sm"
                                variant={formScheduleDays.includes(day.value) ? 'default' : 'outline'}
                                onClick={() => toggleDay(day.value)}
                              >
                                {day.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Contatos</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setContactsDialogOpen(true)}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Gerenciar
                          </Button>
                        </div>
                        <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                          {contacts.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              Nenhum contato cadastrado
                            </p>
                          ) : (
                            contacts.map(contact => (
                              <div
                                key={contact.id}
                                className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded"
                              >
                                <Checkbox
                                  checked={formSelectedContacts.has(contact.id)}
                                  onCheckedChange={() => toggleContact(contact.id)}
                                />
                                <span className="text-sm flex-1">{contact.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPhone(contact.phone)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <Label>Métricas a Incluir</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {METRIC_OPTIONS.map(metric => (
                            <div key={metric.key} className="flex items-center gap-2">
                              <Checkbox
                                checked={formIncludeMetrics[metric.key] || false}
                                onCheckedChange={() => toggleMetric(metric.key)}
                              />
                              <span className="text-sm">{metric.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label>Texto Adicional (opcional)</Label>
                        <Textarea
                          value={formMessageTemplate}
                          onChange={e => setFormMessageTemplate(e.target.value)}
                          placeholder="Adicione uma mensagem personalizada..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </ScrollArea>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={resetForm} className="flex-1">
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} className="flex-1">
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Selecione um agendamento para editar</p>
                    <p className="text-sm">ou crie um novo</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <ManageWhatsAppContactsDialog
        open={contactsDialogOpen}
        onOpenChange={setContactsDialogOpen}
        onContactsChange={fetchContacts}
      />
    </>
  );
}
