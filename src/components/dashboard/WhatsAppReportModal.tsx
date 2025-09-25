import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    total: number;
    pending: number;
    resolved: number;
    inProgress: number;
    errorTypes: Array<{
      type: string;
      count: number;
      label: string;
    }>;
  };
}

export function WhatsAppReportModal({ isOpen, onClose, stats }: WhatsAppReportModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [period, setPeriod] = useState("today");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "");
    
    // Format as Brazilian phone: +55 (XX) XXXXX-XXXX
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 9) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "today":
        return "Hoje";
      case "week":
        return "Esta Semana";
      case "month":
        return "Este Mês";
      default:
        return "Hoje";
    }
  };

  const handleSend = async () => {
    // Validate phone number
    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast({
        title: "Número inválido",
        description: "Por favor, insira um número de telefone válido.",
        variant: "destructive",
      });
      return;
    }

    // Format phone number for WhatsApp (Brazilian format: +55XXXXXXXXXXX)
    const formattedPhone = `+55${phoneDigits}`;

    setIsLoading(true);

    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke("send-whatsapp-report", {
        body: {
          phoneNumber: formattedPhone,
          period: getPeriodLabel(),
          stats,
          userId: user.id,
          userName: profile?.full_name || user.email || "Usuário",
        },
      });

      if (error) throw error;

      toast({
        title: "Relatório enviado!",
        description: `Relatório enviado com sucesso para ${phoneNumber}`,
      });

      onClose();
      setPhoneNumber("");
    } catch (error: any) {
      console.error("Error sending WhatsApp report:", error);
      toast({
        title: "Erro ao enviar relatório",
        description: error.message || "Não foi possível enviar o relatório. Verifique se o Twilio está configurado corretamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enviar Relatório via WhatsApp</DialogTitle>
          <DialogDescription>
            Envie o relatório operacional para um número WhatsApp. O destinatário receberá uma mensagem estruturada com as métricas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">Número WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 98765-4321"
              value={phoneNumber}
              onChange={handlePhoneChange}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Digite o número que receberá o relatório
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Período do Relatório</Label>
            <RadioGroup value={period} onValueChange={setPeriod} disabled={isLoading}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="today" id="today" />
                <Label htmlFor="today">Hoje</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="week" />
                <Label htmlFor="week">Esta Semana</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="month" />
                <Label htmlFor="month">Este Mês</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <h4 className="text-sm font-medium mb-2">Preview do Relatório</h4>
            <div className="text-xs space-y-1">
              <p>📊 RELATÓRIO OPERACIONAL - {getPeriodLabel().toUpperCase()}</p>
              <p>• Total: {stats.total} pendências</p>
              <p>• Resolvidas: {stats.resolved} ({Math.round((stats.resolved / stats.total) * 100)}%)</p>
              <p>• Pendentes: {stats.pending} ({Math.round((stats.pending / stats.total) * 100)}%)</p>
              <p>• Em Andamento: {stats.inProgress} ({Math.round((stats.inProgress / stats.total) * 100)}%)</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isLoading || !phoneNumber}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}