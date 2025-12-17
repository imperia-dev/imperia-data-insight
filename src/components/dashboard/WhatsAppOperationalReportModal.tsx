import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone } from "lucide-react";

interface WhatsAppOperationalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    documentsTranslated: number;
    documentsInProgress: number;
    documentsDelivered: number;
    urgencies: number;
    pendencies: number;
    delays: number;
    averageTime: string;
    deliveryRate: string;
    pendencyTypes: Array<{
      type: string;
      count: number;
      label: string;
    }>;
    translatorPerformance: Array<{
      name: string;
      documentos: number;
    }>;
  };
}

export function WhatsAppOperationalReportModal({
  isOpen,
  onClose,
  stats,
}: WhatsAppOperationalReportModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const getPeriodLabel = () => {
    const periods: Record<string, string> = {
      day: "Hoje",
      week: "Esta Semana",
      month: "Este Mês",
      quarter: "Este Trimestre",
      year: "Este Ano",
    };
    return periods[selectedPeriod] || selectedPeriod;
  };

  const handleSend = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    
    if (cleanPhone.length < 10) {
      toast({
        title: "Número inválido",
        description: "Por favor, insira um número de telefone válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get user name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();

      const formattedPhone = cleanPhone.startsWith("55") 
        ? `+${cleanPhone}` 
        : `+55${cleanPhone}`;

      // Prepare report data for operational dashboard
      const reportData = {
        phoneNumber: formattedPhone,
        period: getPeriodLabel(),
        reportType: 'operational',
        stats: {
          total: stats.documentsTranslated,
          inProgress: stats.documentsInProgress,
          delivered: stats.documentsDelivered,
          urgencies: stats.urgencies,
          pendencies: stats.pendencies,
          delays: stats.delays,
          averageTime: stats.averageTime,
          deliveryRate: stats.deliveryRate,
          pendencyTypes: stats.pendencyTypes.slice(0, 5),
          translatorPerformance: stats.translatorPerformance.slice(0, 5),
        },
        userId: user?.id,
        userName: profile?.full_name || 'Usuário',
      };

      const { data, error } = await supabase.functions.invoke("send-whatsapp-report", {
        body: reportData,
      });

      if (error) throw error;

      toast({
        title: "Relatório enviado!",
        description: `Relatório operacional enviado para ${phoneNumber}`,
      });

      onClose();
      setPhoneNumber("");
    } catch (error: any) {
      console.error("Error sending WhatsApp report:", error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar o relatório via WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar Relatório Operacional via WhatsApp</DialogTitle>
          <DialogDescription>
            Envie um resumo das métricas operacionais para o WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">Número do WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Digite o número com DDD
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="period">Período do Relatório</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={isLoading}>
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="quarter">Este Trimestre</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">Preview do Relatório</h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>📊 <strong>RELATÓRIO OPERACIONAL</strong></p>
              <p>Período: {getPeriodLabel()}</p>
              <p>• Documentos: {stats.documentsTranslated}</p>
              <p>• Em Andamento: {stats.documentsInProgress}</p>
              <p>• Entregues: {stats.documentsDelivered}</p>
              <p>• Urgências: {stats.urgencies}</p>
              <p>• Pendências: {stats.pendencies}</p>
              <p>• Taxa de Entrega: {stats.deliveryRate}%</p>
              <p>• Tempo Médio: {stats.averageTime}h/doc</p>
              {stats.translatorPerformance.length > 0 && (
                <>
                  <p className="mt-2">Top Tradutores:</p>
                  {stats.translatorPerformance.slice(0, 3).map((t, i) => (
                    <p key={i}>#{i + 1} {t.name}: {t.documentos} docs</p>
                  ))}
                </>
              )}
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
              "Enviar via WhatsApp"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}