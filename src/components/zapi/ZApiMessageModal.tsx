import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Loader2 } from "lucide-react";

interface ZApiMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMessage?: string;
  defaultPhone?: string;
  title?: string;
}

export function ZApiMessageModal({
  open,
  onOpenChange,
  defaultMessage = "",
  defaultPhone = "",
  title = "Enviar Mensagem WhatsApp",
}: ZApiMessageModalProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState(defaultMessage);
  const [isSending, setIsSending] = useState(false);

  // Format phone for display (Brazilian format)
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
    // Only allow numbers and formatting characters
    const cleaned = value.replace(/[^\d\s()\-+]/g, "");
    setPhone(cleaned);
  };

  const getCleanPhone = () => {
    let cleanPhone = phone.replace(/\D/g, "");
    // Add Brazil country code if not present
    if (!cleanPhone.startsWith("55") && cleanPhone.length >= 10) {
      cleanPhone = "55" + cleanPhone;
    }
    return cleanPhone;
  };

  const handleSend = async () => {
    const cleanPhone = getCleanPhone();

    if (!cleanPhone || cleanPhone.length < 12) {
      toast.error("Digite um número de telefone válido com DDD");
      return;
    }

    if (!message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-zapi-message", {
        body: { phone: cleanPhone, message: message.trim() },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Mensagem enviada com sucesso!");
        onOpenChange(false);
        setPhone(defaultPhone);
        setMessage(defaultMessage);
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
              value={formatPhoneDisplay(phone)}
              onChange={handlePhoneChange}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Formato brasileiro com DDD (ex: 11999999999)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length} caracteres
            </p>
          </div>

          {message && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Preview da mensagem:
              </p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !phone || !message.trim()}
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
