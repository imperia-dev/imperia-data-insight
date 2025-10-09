import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginAttempt {
  id: string;
  identifier: string;
  attempt_type: string;
  success: boolean;
  failure_reason: string | null;
  ip_address: unknown;
  user_agent: string;
  metadata: unknown;
  created_at: string;
}

interface AccountLockout {
  id: string;
  identifier: string;
  lockout_type: string;
  locked_at: string;
  locked_until: string | null;
  reason: string;
  failed_attempts: number;
}

export function AuthSecurityMonitor() {
  const [recentAttempts, setRecentAttempts] = useState<LoginAttempt[]>([]);
  const [activeLockouts, setActiveLockouts] = useState<AccountLockout[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Buscar tentativas recentes de login
      const { data: attempts } = await supabase
        .from('login_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Buscar bloqueios ativos
      const { data: lockouts } = await supabase
        .from('account_lockouts')
        .select('*')
        .is('unlocked_at', null)
        .order('locked_at', { ascending: false });

      setRecentAttempts(attempts || []);
      setActiveLockouts(lockouts || []);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados de segurança",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAttemptIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getLockoutBadge = (type: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      temporary: 'default',
      extended: 'destructive',
      permanent: 'destructive'
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tentativas de Login */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Tentativas de Login Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAttempts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma tentativa de login registrada</p>
            ) : (
              recentAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    {getAttemptIcon(attempt.success)}
                    <div>
                      <p className="font-medium text-sm">{attempt.identifier}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(attempt.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={attempt.success ? 'default' : 'destructive'}>
                      {attempt.attempt_type}
                    </Badge>
                    {!attempt.success && attempt.failure_reason && (
                      <p className="text-xs text-muted-foreground mt-1">{attempt.failure_reason}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bloqueios Ativos */}
      {activeLockouts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Contas Bloqueadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeLockouts.map((lockout) => (
                <div key={lockout.id} className="flex items-start justify-between border-b pb-3">
                  <div>
                    <p className="font-medium text-sm">{lockout.identifier}</p>
                    <p className="text-xs text-muted-foreground">{lockout.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bloqueado em: {new Date(lockout.locked_at).toLocaleString('pt-BR')}
                    </p>
                    {lockout.locked_until && (
                      <p className="text-xs text-muted-foreground">
                        Até: {new Date(lockout.locked_until).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {getLockoutBadge(lockout.lockout_type)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {lockout.failed_attempts} tentativas
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
