import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Loader2, Users, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ManageWhatsAppContactsDialog } from "./ManageWhatsAppContactsDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
}

export interface ProductivityMetrics {
  totalPayments: number;
  totalDriveValue: number;
  totalDiagrammingValue: number;
  activeProviders: number;
  averagePerProvider: number;
  selectedPeriod: string;
  userName: string;
  topPerformers?: { user_name: string; total_amount: number; document_count: number }[];
}

interface DataOption {
  id: string;
  label: string;
  value: string | number;
  emoji: string;
}

interface ZApiProductivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: ProductivityMetrics;
}

export function ZApiProductivityModal({
  open,
  onOpenChange,
  metrics,
}: ZApiProductivityModalProps) {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [manualPhone, setManualPhone] = useState("");
  const [selectedData, setSelectedData] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Data options based on metrics
  const dataOptions: DataOption[] = useMemo(() => {
    if (!metrics) return [];
    return [
      { id: "totalPayments", label: "Total de Pagamentos", value: formatCurrency(metrics.totalPayments), emoji: "💰" },
      { id: "totalDrive", label: "Total Drive", value: formatCurrency(metrics.totalDriveValue), emoji: "📂" },
      { id: "totalDiagramming", label: "Total Diagramação", value: formatCurrency(metrics.totalDiagrammingValue), emoji: "✏️" },
      { id: "activeProviders", label: "Prestadores Ativos", value: metrics.activeProviders, emoji: "👥" },
      { id: "averagePerProvider", label: "Média por Prestador", value: formatCurrency(metrics.averagePerProvider), emoji: "📊" },
    ];
  }, [metrics]);

  // Fetch contacts
  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_contacts")
        .select("*")
        .order("name");

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchContacts();
      // Select all data options by default
      if (metrics) {
        setSelectedData(new Set(dataOptions.map(d => d.id)));
      }
    }
  }, [open, metrics]);

  // Update selected data when dataOptions change
  useEffect(() => {
    if (metrics && dataOptions.length > 0 && selectedData.size === 0) {
      setSelectedData(new Set(dataOptions.map(d => d.id)));
    }
  }, [dataOptions, metrics]);

  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 13) {
      setManualPhone(cleaned.startsWith('55') ? `+${cleaned}` : cleaned);
    }
  };

  const getCleanPhone = () => {
    if (selectedContactId && selectedContactId !== "manual") {
      const contact = contacts.find(c => c.id === selectedContactId);
      return contact?.phone.replace(/\D/g, '') || "";
    }
    return manualPhone.replace(/\D/g, '');
  };

  const handleContactSelect = (value: string) => {
    setSelectedContactId(value);
    if (value !== "manual") {
      const contact = contacts.find(c => c.id === value);
      if (contact) {
        setManualPhone(contact.phone);
      }
    } else {
      setManualPhone("");
    }
  };

  const toggleDataOption = (id: string) => {
    const newSelected = new Set(selectedData);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedData(newSelected);
  };

  const selectAll = () => {
    setSelectedData(new Set(dataOptions.map(d => d.id)));
  };

  const deselectAll = () => {
    setSelectedData(new Set());
  };

  const getPeriodLabel = () => {
    const now = new Date();
    switch (metrics.selectedPeriod) {
      case 'day': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return format(now, "MMM/yy", { locale: ptBR }).toUpperCase();
      case 'lastMonth': return 'Último Mês';
      case 'quarter': return 'Este Trimestre';
      case 'year': return 'Este Ano';
      default: return 'Período Personalizado';
    }
  };

  // Generate message preview
  const messagePreview = useMemo(() => {
    if (!metrics) return "";

    const periodLabel = getPeriodLabel();
    let message = `📊 *RELATÓRIO DE PRODUTIVIDADE*\n`;
    message += `📅 Período: ${periodLabel}\n`;
    message += `─────────────────\n\n`;

    dataOptions
      .filter(opt => selectedData.has(opt.id))
      .forEach(opt => {
        message += `${opt.emoji} *${opt.label}:* ${opt.value}\n`;
      });

    // Add top performers if selected
    if (metrics.topPerformers && metrics.topPerformers.length > 0 && selectedData.has("topPerformers")) {
      message += `\n🏆 *TOP PRESTADORES:*\n`;
      metrics.topPerformers.slice(0, 5).forEach((performer, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
        message += `${medal} ${performer.user_name}: ${formatCurrency(performer.total_amount)}\n`;
      });
    }

    message += `\n─────────────────\n`;
    message += `📤 Enviado por: ${metrics.userName}\n`;
    message += `🕐 ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;

    return message;
  }, [metrics, selectedData, dataOptions]);

  const handleSend = async () => {
    const cleanPhone = getCleanPhone();

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Por favor, informe um número de telefone válido");
      return;
    }

    if (selectedData.size === 0) {
      toast.error("Selecione pelo menos um dado para enviar");
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-zapi-message", {
        body: { phone: cleanPhone, message: messagePreview },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Mensagem enviada com sucesso!");
        onOpenChange(false);
      } else {
        throw new Error(data.error || "Erro ao enviar mensagem");
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Enviar Relatório via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Selecione os dados que deseja incluir no relatório de produtividade
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Contact Selection and Data Options */}
            <div className="space-y-6">
              {/* Contact Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Destinatário</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowContactsDialog(true)}
                    className="text-xs"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Gerenciar Contatos
                  </Button>
                </div>

                <Select value={selectedContactId} onValueChange={handleContactSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contato ou digite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Digitar número manualmente
                      </div>
                    </SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} - {formatPhoneDisplay(contact.phone)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(selectedContactId === "manual" || !selectedContactId) && (
                  <div>
                    <Input
                      placeholder="+55 (XX) XXXXX-XXXX"
                      value={manualPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Digite o número com código do país (+55)
                    </p>
                  </div>
                )}
              </div>

              {/* Data Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Dados a incluir</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                      Selecionar todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs">
                      Limpar
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {dataOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={selectedData.has(option.id)}
                          onCheckedChange={() => toggleDataOption(option.id)}
                        />
                        <label
                          htmlFor={option.id}
                          className="text-sm flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <span>{option.emoji}</span>
                          <span>{option.label}:</span>
                          <span className="font-medium">{option.value}</span>
                        </label>
                      </div>
                    ))}
                    {/* Top Performers option */}
                    {metrics.topPerformers && metrics.topPerformers.length > 0 && (
                      <div className="flex items-center space-x-2 pt-2 border-t">
                        <Checkbox
                          id="topPerformers"
                          checked={selectedData.has("topPerformers")}
                          onCheckedChange={() => toggleDataOption("topPerformers")}
                        />
                        <label
                          htmlFor="topPerformers"
                          className="text-sm flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <span>🏆</span>
                          <span>Incluir Top 5 Prestadores</span>
                        </label>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Right Column - Message Preview */}
            <div className="space-y-3">
              <Label>Prévia da Mensagem</Label>
              <div className="bg-muted/50 rounded-lg p-4 min-h-[300px] whitespace-pre-wrap text-sm font-mono border">
                {messagePreview}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || selectedData.size === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar WhatsApp
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ManageWhatsAppContactsDialog
        open={showContactsDialog}
        onOpenChange={setShowContactsDialog}
        onContactsChange={fetchContacts}
      />
    </>
  );
}
