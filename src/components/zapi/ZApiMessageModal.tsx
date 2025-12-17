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

export interface DashboardMetrics {
  attributedDocuments: number;
  documentsInProgress: number;
  documentsDelivered: number;
  urgencies: number;
  pendencies: number;
  delays: number;
  lowestScore: number;
  averageScore: number;
  highestScore: number;
  selectedPeriod: string;
  userName: string;
}

interface DataOption {
  id: string;
  label: string;
  value: string | number;
  emoji: string;
}

interface ZApiMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics?: DashboardMetrics;
  // Legacy props for backward compatibility
  defaultMessage?: string;
  defaultPhone?: string;
  title?: string;
}

export function ZApiMessageModal({
  open,
  onOpenChange,
  metrics,
  defaultMessage = "",
  defaultPhone = "",
  title = "Enviar Mensagem WhatsApp",
}: ZApiMessageModalProps) {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [manualPhone, setManualPhone] = useState(defaultPhone);
  const [selectedData, setSelectedData] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Data options based on metrics
  const dataOptions: DataOption[] = useMemo(() => {
    if (!metrics) return [];
    return [
      { id: "attributed", label: "Documentos Atribuídos", value: metrics.attributedDocuments, emoji: "📄" },
      { id: "inProgress", label: "Em Andamento", value: metrics.documentsInProgress, emoji: "⏳" },
      { id: "delivered", label: "Entregues", value: metrics.documentsDelivered, emoji: "✅" },
      { id: "urgencies", label: "Urgências", value: metrics.urgencies, emoji: "🚨" },
      { id: "pendencies", label: "Pendências", value: metrics.pendencies, emoji: "📋" },
      { id: "delays", label: "Atrasos", value: metrics.delays, emoji: "⚠️" },
      { id: "lowestScore", label: "Menor Nota", value: metrics.lowestScore, emoji: "📉" },
      { id: "averageScore", label: "Média", value: metrics.averageScore.toFixed(1), emoji: "📊" },
      { id: "highestScore", label: "Maior Nota", value: metrics.highestScore, emoji: "📈" },
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

  // Format phone for display
  const formatPhoneDisplay = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `+${numbers.slice(0, 2)} (${numbers.slice(2)}`;
    if (numbers.length <= 9) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
    if (numbers.length <= 13) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/[^\d\s()\-+]/g, "");
    setManualPhone(cleaned);
    setSelectedContactId(""); // Clear contact selection when typing manually
  };

  const getCleanPhone = () => {
    // If a contact is selected, use its phone
    if (selectedContactId) {
      const contact = contacts.find(c => c.id === selectedContactId);
      if (contact) {
        let phone = contact.phone.replace(/\D/g, "");
        if (!phone.startsWith("55") && phone.length >= 10) {
          phone = "55" + phone;
        }
        return phone;
      }
    }
    
    // Otherwise use manual phone
    let cleanPhone = manualPhone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("55") && cleanPhone.length >= 10) {
      cleanPhone = "55" + cleanPhone;
    }
    return cleanPhone;
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    if (contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setManualPhone(contact.phone);
      }
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

  // Generate period label
  const getPeriodLabel = () => {
    if (!metrics) return "";
    const now = new Date();
    switch (metrics.selectedPeriod) {
      case "day": return "Hoje";
      case "week": return "Esta Semana";
      case "month": return format(now, "MMM/yy", { locale: ptBR }).toUpperCase();
      case "lastMonth": return "Último Mês";
      case "quarter": return "Este Trimestre";
      case "year": return "Este Ano";
      default: return "Período Personalizado";
    }
  };

  // Generate message preview
  const messagePreview = useMemo(() => {
    if (!metrics) return defaultMessage;

    const selectedOptions = dataOptions.filter(d => selectedData.has(d.id));
    if (selectedOptions.length === 0) {
      return "_Selecione os dados para incluir na mensagem_";
    }

    const now = new Date();
    const periodLabel = getPeriodLabel();
    
    const dataLines = selectedOptions.map(d => `${d.emoji} ${d.label}: *${d.value}*`).join("\n");
    
    return `📊 *RELATÓRIO OPERACIONAL - ${periodLabel}*

${dataLines}

_Enviado por: ${metrics.userName}_
_Data: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}_`;
  }, [metrics, selectedData, dataOptions, defaultMessage]);

  const handleSend = async () => {
    const cleanPhone = getCleanPhone();

    if (!cleanPhone || cleanPhone.length < 12) {
      toast.error("Selecione um contato ou digite um número válido");
      return;
    }

    if (selectedData.size === 0 && metrics) {
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
        setSelectedData(new Set(dataOptions.map(d => d.id)));
        setSelectedContactId("");
        setManualPhone("");
      } else {
        throw new Error(data.error || "Erro ao enviar mensagem");
      }
    } catch (error) {
      console.error("Error sending Z-API message:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  // If no metrics, use legacy simple mode
  if (!metrics) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              {title}
            </DialogTitle>
            <DialogDescription>
              Envie uma mensagem personalizada via WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de Telefone</Label>
              <Input
                id="phone"
                placeholder="+55 (11) 99999-9999"
                value={formatPhoneDisplay(manualPhone)}
                onChange={handlePhoneChange}
                className="font-mono"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !manualPhone}
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
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Enviar Relatório via Z-API
            </DialogTitle>
            <DialogDescription>
              Selecione o contato e os dados para enviar
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column - Selections */}
            <div className="space-y-4">
              {/* Contact Selection */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Contato</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowContactsDialog(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Gerenciar
                  </Button>
                </Label>
                <Select
                  value={selectedContactId}
                  onValueChange={handleContactSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contato ou digite abaixo" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingContacts ? (
                      <SelectItem value="_loading" disabled>
                        Carregando...
                      </SelectItem>
                    ) : contacts.length === 0 ? (
                      <SelectItem value="_empty" disabled>
                        Nenhum contato cadastrado
                      </SelectItem>
                    ) : (
                      contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            {contact.name}
                            <span className="text-muted-foreground text-xs">
                              ({contact.phone.slice(-4)})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ou digite: +55 (11) 99999-9999"
                  value={formatPhoneDisplay(manualPhone)}
                  onChange={handlePhoneChange}
                  className="font-mono text-sm"
                />
              </div>

              {/* Data Selection */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Dados do Relatório</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={selectAll}
                    >
                      Todos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={deselectAll}
                    >
                      Nenhum
                    </Button>
                  </div>
                </Label>
                <ScrollArea className="h-[240px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {dataOptions.map((option) => (
                      <div
                        key={option.id}
                        onClick={() => toggleDataOption(option.id)}
                        className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${
                          selectedData.has(option.id)
                            ? "bg-primary/10 border-primary"
                            : "bg-background hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedData.has(option.id)}
                            onCheckedChange={() => toggleDataOption(option.id)}
                          />
                          <span className="text-lg">{option.emoji}</span>
                          <span className="text-sm">{option.label}</span>
                        </div>
                        <span className="font-mono font-semibold text-sm">
                          {option.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-2">
              <Label>Preview da Mensagem</Label>
              <div className="h-[340px] border rounded-lg bg-muted/30 p-4 overflow-auto">
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {messagePreview}
                </pre>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || (!selectedContactId && getCleanPhone().length < 12) || selectedData.size === 0}
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
