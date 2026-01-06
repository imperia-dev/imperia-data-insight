import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, AlertCircle } from 'lucide-react';
import { emailSchema } from '@/lib/validations/auth';
import { supabase } from '@/integrations/supabase/client';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate email
    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      setError(emailValidation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const response = await supabase.functions.invoke('initiate-password-reset', {
        body: { email },
      });

      if (response.error) {
        // Prefer message returned by the function (when available)
        const ctx = (response.error as any)?.context;
        const fnJson = ctx?.json;
        setError(fnJson?.error || response.error.message || 'Não foi possível enviar o email agora.');
        return;
      }

      const data = response.data;

      if (data.error) {
        setError(data.error);
      } else if (data.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Error initiating password reset:', err);
      setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      // Reset state after closing
      setTimeout(() => {
        setEmail('');
        setError('');
        setSuccess(false);
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar Senha</DialogTitle>
          <DialogDescription>
            {!success
              ? 'Digite seu email cadastrado para receber as instruções de recuperação.'
              : 'Instruções enviadas com sucesso!'}
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Instruções
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <strong>Email enviado com sucesso!</strong>
                <br />
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground">
              <p>Você precisará:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Clicar no link enviado por email</li>
                <li>Criar uma nova senha segura</li>
              </ol>
            </div>

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}