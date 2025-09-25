import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { Badge } from '@/components/ui/badge';
import { Phone, Shield, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { phoneSchema } from '@/lib/validations/auth';

interface PhoneVerificationProps {
  userId: string;
  currentPhone?: string | null;
  isVerified?: boolean;
  onPhoneUpdate?: (phone: string, verified: boolean) => void;
}

export function PhoneVerification({ 
  userId, 
  currentPhone, 
  isVerified = false,
  onPhoneUpdate 
}: PhoneVerificationProps) {
  const [phone, setPhone] = useState(currentPhone || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const formatPhoneForDisplay = (phoneNumber: string) => {
    // Remove +55 if present and format
    const cleaned = phoneNumber.replace(/^\+55/, '').replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phoneNumber;
  };

  const handleSavePhone = async () => {
    setError('');
    
    // Validate phone
    const validation = phoneSchema.safeParse(phone);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Extract digits and format for international
      const phoneDigits = phone.replace(/\D/g, '');
      const formattedPhone = phoneDigits ? `+55${phoneDigits}` : '';

      // Update profile with new phone
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          phone_number: formattedPhone,
          phone_verified: false,
          phone_verified_at: null
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast({
        title: 'Telefone atualizado',
        description: 'Seu número de telefone foi atualizado com sucesso.',
      });

      onPhoneUpdate?.(formattedPhone, false);
    } catch (err: any) {
      console.error('Error updating phone:', err);
      setError('Erro ao atualizar telefone');
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setError('');
    setLoading(true);

    try {
      const phoneDigits = phone.replace(/\D/g, '');
      const formattedPhone = phoneDigits ? `+55${phoneDigits}` : '';

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Send SMS via edge function
      const response = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: formattedPhone,
          message: `Seu código de verificação é: ${code}. Válido por 10 minutos.`,
          userId,
          verificationType: 'phone_verification',
        },
      });

      if (response.error) throw response.error;

      // Store verification code temporarily (in production, store in database)
      sessionStorage.setItem(`phone_verification_${userId}`, JSON.stringify({
        code,
        phone: formattedPhone,
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      }));

      setVerificationSent(true);
      toast({
        title: 'Código enviado',
        description: 'Verifique seu telefone e insira o código recebido.',
      });
    } catch (err: any) {
      console.error('Error sending verification:', err);
      setError('Erro ao enviar código de verificação');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setLoading(true);

    try {
      // Get stored verification data
      const stored = sessionStorage.getItem(`phone_verification_${userId}`);
      if (!stored) {
        setError('Código expirado. Solicite um novo código.');
        setVerificationSent(false);
        return;
      }

      const { code, phone: storedPhone, expires } = JSON.parse(stored);

      // Check expiration
      if (Date.now() > expires) {
        sessionStorage.removeItem(`phone_verification_${userId}`);
        setError('Código expirado. Solicite um novo código.');
        setVerificationSent(false);
        return;
      }

      // Verify code
      if (verificationCode !== code) {
        setError('Código inválido');
        return;
      }

      // Update profile as verified
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          phone_verified: true,
          phone_verified_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Clean up
      sessionStorage.removeItem(`phone_verification_${userId}`);

      // Log verification in SMS logs
      await supabase
        .from('sms_verification_logs')
        .insert({
          user_id: userId,
          phone_number: storedPhone,
          verification_type: 'phone_verification',
          status: 'verified',
        });

      toast({
        title: 'Telefone verificado!',
        description: 'Seu número de telefone foi verificado com sucesso.',
      });

      onPhoneUpdate?.(storedPhone, true);
      setVerificationSent(false);
      setVerificationCode('');
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError('Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            <CardTitle>Telefone para Recuperação</CardTitle>
          </div>
          {currentPhone && (
            <Badge variant={isVerified ? 'default' : 'secondary'}>
              {isVerified ? (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  Verificado
                </>
              ) : (
                <>
                  <X className="mr-1 h-3 w-3" />
                  Não verificado
                </>
              )}
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure um número de telefone para recuperação de senha via SMS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!verificationSent ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Número de Telefone</Label>
              <PhoneInput
                id="phone"
                value={phone || (currentPhone ? formatPhoneForDisplay(currentPhone) : '')}
                onChange={setPhone}
                disabled={loading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSavePhone}
                disabled={loading || !phone || phone === currentPhone}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Telefone'
                )}
              </Button>

              {phone && !isVerified && (
                <Button
                  variant="outline"
                  onClick={handleSendVerification}
                  disabled={loading}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Verificar Número
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <Alert>
              <AlertDescription>
                Um código de verificação foi enviado para {formatPhoneForDisplay(phone)}
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
                disabled={loading}
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
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Código'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setVerificationSent(false);
                  setVerificationCode('');
                  setError('');
                }}
                disabled={loading}
              >
                Cancelar
              </Button>

              <Button
                variant="ghost"
                onClick={handleSendVerification}
                disabled={loading}
              >
                Reenviar Código
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}