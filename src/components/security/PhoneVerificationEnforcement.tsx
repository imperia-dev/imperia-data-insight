import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePhoneVerificationRequired } from "@/hooks/usePhoneVerificationRequired";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { Phone, ShieldAlert, Loader2, Shield, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { phoneSchema } from "@/lib/validations/auth";
import { sanitizeInput } from "@/lib/validations/sanitized";

/**
 * PhoneVerificationEnforcement: Força todos os usuários a verificarem seu telefone
 * Modal bloqueante que não pode ser fechado sem completar a verificação
 * Usa Z-API (WhatsApp) para envio do código de verificação
 */
export function PhoneVerificationEnforcement() {
  const { user } = useAuth();
  const { phoneVerified, phoneNumber, loading, refetch } = usePhoneVerificationRequired();
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Show modal if user is logged in and phone is not verified
    if (!loading && user && !phoneVerified) {
      setShowModal(true);
      if (phoneNumber) {
        // Format phone for display
        const cleaned = phoneNumber.replace(/^\+55/, '').replace(/\D/g, '');
        if (cleaned.length === 11) {
          setPhone(`(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`);
        }
      }
    } else {
      setShowModal(false);
    }
  }, [loading, user, phoneVerified, phoneNumber]);

  const handleSavePhone = async () => {
    setError('');
    
    const validation = phoneSchema.safeParse(phone);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setActionLoading(true);

    try {
      const phoneDigits = phone.replace(/\D/g, '');
      const formattedPhone = phoneDigits ? `+55${phoneDigits}` : '';

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          phone_number: formattedPhone,
          phone_verified: false,
          phone_verified_at: null
        })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      toast({
        title: 'Telefone salvo',
        description: 'Agora clique em "Enviar Código" para verificar via WhatsApp.',
      });
    } catch (err: any) {
      console.error('Error updating phone:', err);
      setError('Erro ao salvar telefone');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setError('');
    setActionLoading(true);

    try {
      const phoneDigits = phone.replace(/\D/g, '');
      const formattedPhone = `55${phoneDigits}`; // Z-API format without +

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store code in session before sending
      sessionStorage.setItem(`phone_verification_${user!.id}`, JSON.stringify({
        code,
        phone: `+55${phoneDigits}`,
        expires: Date.now() + 10 * 60 * 1000,
      }));

      // Send via Z-API (WhatsApp)
      const response = await supabase.functions.invoke('send-zapi-message', {
        body: {
          phone: formattedPhone,
          message: `🔐 *Código de Verificação Impéria*\n\nSeu código de verificação é: *${code}*\n\n⏰ Válido por 10 minutos.\n\n_Não compartilhe este código com ninguém._`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar mensagem');
      }

      const data = response.data;
      if (data?.error) {
        throw new Error(data.error);
      }

      // Log attempt
      await supabase
        .from('sms_verification_logs')
        .insert({
          user_id: user!.id,
          phone_number: sanitizeInput(`+55${phoneDigits}`),
          verification_type: 'phone_verification',
          status: 'sent',
        });

      setVerificationSent(true);
      toast({
        title: 'Código enviado via WhatsApp',
        description: 'Verifique seu WhatsApp e insira o código recebido.',
      });
    } catch (err: any) {
      console.error('Error sending verification:', err);
      sessionStorage.removeItem(`phone_verification_${user!.id}`);
      setError(err.message || 'Erro ao enviar código de verificação');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setActionLoading(true);

    try {
      const stored = sessionStorage.getItem(`phone_verification_${user!.id}`);
      if (!stored) {
        setError('Código expirado. Solicite um novo código.');
        setVerificationSent(false);
        setActionLoading(false);
        return;
      }

      const { code, phone: storedPhone, expires } = JSON.parse(stored);

      if (Date.now() > expires) {
        sessionStorage.removeItem(`phone_verification_${user!.id}`);
        setError('Código expirado. Solicite um novo código.');
        setVerificationSent(false);
        setActionLoading(false);
        return;
      }

      if (verificationCode !== code) {
        setError('Código inválido');
        setActionLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          phone_verified: true,
          phone_verified_at: new Date().toISOString()
        })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      sessionStorage.removeItem(`phone_verification_${user!.id}`);

      await supabase
        .from('sms_verification_logs')
        .insert({
          user_id: user!.id,
          phone_number: sanitizeInput(storedPhone || ''),
          verification_type: 'phone_verification',
          status: 'verified',
        });

      toast({
        title: 'Telefone verificado!',
        description: 'Seu número de telefone foi verificado com sucesso.',
      });

      setShowModal(false);
      refetch();
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError('Erro ao verificar código');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!user || phoneVerified) {
    return null;
  }

  return (
    <Dialog open={showModal} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Verificação de Telefone Obrigatória
          </DialogTitle>
          <DialogDescription>
            Por questões de segurança, você precisa verificar seu número de telefone para continuar usando a plataforma.
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            <strong>Por que isso é necessário?</strong>
            <ul className="mt-2 list-disc list-inside text-sm space-y-1">
              <li>Recuperação de senha segura via WhatsApp</li>
              <li>Proteção adicional para sua conta</li>
              <li>Notificações importantes de segurança</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {!verificationSent ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Número de Telefone (WhatsApp)</Label>
                <PhoneInput
                  id="phone"
                  value={phone}
                  onChange={setPhone}
                  disabled={actionLoading}
                />
                <p className="text-xs text-muted-foreground">
                  O código será enviado via WhatsApp para este número.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSavePhone}
                  disabled={actionLoading || !phone}
                  variant="outline"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Telefone'
                  )}
                </Button>

                {phone && (
                  <Button
                    onClick={handleSendVerification}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar Código
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                <MessageCircle className="h-4 w-4" />
                <AlertDescription>
                  Um código de verificação foi enviado via <strong>WhatsApp</strong> para o número informado.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificação (6 dígitos)</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  disabled={actionLoading}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleVerifyCode}
                  disabled={actionLoading || verificationCode.length !== 6}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Verificar Código
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setVerificationSent(false);
                    setVerificationCode('');
                    setError('');
                  }}
                  disabled={actionLoading}
                >
                  Voltar
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleSendVerification}
                  disabled={actionLoading}
                >
                  Reenviar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
