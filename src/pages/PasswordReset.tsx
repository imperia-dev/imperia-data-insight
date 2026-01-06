import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { passwordSchema } from '@/lib/validations/auth';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<'verify-email' | 'new-password' | 'complete'>('verify-email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  
  // Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { strength, requirements } = usePasswordStrength(password);

  useEffect(() => {
    if (token) {
      verifyEmailToken();
    } else {
      navigate('/auth');
    }
  }, [token]);

  const verifyEmailToken = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get user ID from token
      const { data: tokenData } = await supabase
        .from('password_reset_tokens')
        .select('user_id, sms_verified')
        .eq('email_token', token)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (!tokenData) {
        setError('Link inválido ou expirado');
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      setUserId(tokenData.user_id);

      const response = await supabase.functions.invoke('verify-reset-token', {
        body: { emailToken: token, userId: tokenData.user_id },
      });

      if (response.data?.success) {
        // Skip SMS step - go directly to new password
        setStep('new-password');
      } else {
        setError(response.data?.error || 'Erro ao verificar email');
      }
    } catch (err) {
      setError('Erro ao verificar token');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    const validation = passwordSchema.safeParse(password);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    if (!requirements.notPwned) {
      setError('Esta senha foi encontrada em vazamentos. Escolha outra.');
      setLoading(false);
      return;
    }

    try {
      const response = await supabase.functions.invoke('reset-password', {
        body: { userId, emailToken: token, newPassword: password },
      });

      if (response.data?.success) {
        setStep('complete');
        setTimeout(() => navigate('/auth'), 5000);
      } else {
        setError(response.data?.error || 'Erro ao redefinir senha');
      }
    } catch (err) {
      setError('Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir Senha</CardTitle>
          <CardDescription>
            {step === 'verify-email' && 'Verificando seu email...'}
            {step === 'new-password' && 'Crie uma nova senha segura'}
            {step === 'complete' && 'Senha redefinida com sucesso!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'verify-email' && (
            <div className="flex justify-center py-8">
              {loading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === 'new-password' && (
            <form onSubmit={resetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {password && <PasswordStrengthIndicator password={password} />}

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading || strength.score < 3}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redefinindo...</>
                ) : (
                  'Redefinir Senha'
                )}
              </Button>
            </form>
          )}

          {step === 'complete' && (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <p className="font-semibold">Senha redefinida com sucesso!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Você será redirecionado para a página de login...
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
