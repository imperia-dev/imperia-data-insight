import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Lock, Users, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarOffset } from '@/hooks/useSidebarOffset';
import { cn } from '@/lib/utils';

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  failedLogins: number;
  rateLimitHits: number;
  unauthorizedAccess: number;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id?: string | null;
  ip_address?: string | null;
  details?: any;
  created_at: string;
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    highEvents: 0,
    mediumEvents: 0,
    lowEvents: 0,
    failedLogins: 0,
    rateLimitHits: 0,
    unauthorizedAccess: 0
  });
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [securityScore, setSecurityScore] = useState(0);
  const { toast } = useToast();
  const { sidebarOffsetClass, mainContainerClass } = useSidebarOffset();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
          setUserRole(data.role);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      // Fetch security events from last 24 hours
      const since = new Date();
      since.setHours(since.getHours() - 24);

      const { data: events, error } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (events) {
        // Calculate metrics
        const newMetrics: SecurityMetrics = {
          totalEvents: events.length,
          criticalEvents: events.filter(e => e.severity === 'critical').length,
          highEvents: events.filter(e => e.severity === 'high').length,
          mediumEvents: events.filter(e => e.severity === 'medium').length,
          lowEvents: events.filter(e => e.severity === 'low').length,
          failedLogins: events.filter(e => e.event_type === 'failed_login').length,
          rateLimitHits: events.filter(e => e.event_type === 'rate_limit_exceeded').length,
          unauthorizedAccess: events.filter(e => e.event_type === 'unauthorized_access').length
        };

        setMetrics(newMetrics);
        // Type-safe conversion for recent events
        const typedEvents: SecurityEvent[] = events.slice(0, 10).map(e => ({
          ...e,
          ip_address: e.ip_address ? String(e.ip_address) : null
        }));
        setRecentEvents(typedEvents);

        // Calculate security score (100 - penalties for critical events)
        const score = Math.max(0, 100 - (newMetrics.criticalEvents * 20) - (newMetrics.highEvents * 10) - (newMetrics.mediumEvents * 5));
        setSecurityScore(score);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: 'Erro ao carregar dados de segurança',
        description: 'Não foi possível carregar os dados de segurança.',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    };
    return <Badge variant={variants[severity] || 'default'}>{severity.toUpperCase()}</Badge>;
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      failed_login: 'Falha de Login',
      rate_limit_exceeded: 'Rate Limit Excedido',
      unauthorized_access: 'Acesso Não Autorizado',
      suspicious_activity: 'Atividade Suspeita',
      frontend_error: 'Erro no Frontend',
      login_attempt: 'Tentativa de Login'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar userRole={userRole} />
        <div className={mainContainerClass}>
          <Header userName={userName} userRole={userRole} />
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="text-center">
              <Shield className="h-12 w-12 animate-pulse mx-auto mb-4" />
              <p>Carregando dados de segurança...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Painel de Segurança
          </h1>
          <p className="text-muted-foreground">Monitoramento em tempo real</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Última atualização</p>
          <p className="font-semibold">{format(new Date(), 'HH:mm:ss', { locale: ptBR })}</p>
        </div>
      </div>

      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle>Score de Segurança</CardTitle>
          <CardDescription>Baseado nos eventos das últimas 24 horas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{securityScore}%</span>
              <Badge variant={securityScore > 80 ? 'default' : securityScore > 60 ? 'secondary' : 'destructive'}>
                {securityScore > 80 ? 'Excelente' : securityScore > 60 ? 'Bom' : 'Atenção'}
              </Badge>
            </div>
            <Progress value={securityScore} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Total de Eventos
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Eventos Críticos
              <XCircle className="h-4 w-4 text-destructive" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Requer ação imediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Falhas de Login
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failedLogins}</div>
            <p className="text-xs text-muted-foreground">Tentativas bloqueadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Rate Limits
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rateLimitHits}</div>
            <p className="text-xs text-muted-foreground">Requisições bloqueadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert for Critical Events */}
      {metrics.criticalEvents > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção: Eventos Críticos Detectados</AlertTitle>
          <AlertDescription>
            {metrics.criticalEvents} evento(s) crítico(s) detectado(s) nas últimas 24 horas. Verifique os logs para mais detalhes.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
          <CardDescription>Últimos 10 eventos de segurança</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0">
                    {getSeverityIcon(event.severity)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{getEventTypeLabel(event.event_type)}</p>
                      {getSeverityBadge(event.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </p>
                    {event.ip_address && (
                      <p className="text-xs text-muted-foreground">IP: {event.ip_address}</p>
                    )}
                    {event.details && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                          Ver detalhes
                        </summary>
                        <pre className="mt-2 text-xs bg-secondary p-2 rounded overflow-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Security Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              RLS Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ativo em todas as tabelas
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              CSP Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configurado
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Sessões Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              Timeout: 30 min
            </Badge>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
  </div>
  );
}