import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActiveSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: unknown;
  user_agent: string;
  device_fingerprint: string | null;
  last_activity: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export function ActiveSessionsTable() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('active_sessions')
        .select('*')
        .is('revoked_at', null)
        .order('last_activity', { ascending: false });

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar sessões ativas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('revoke_user_sessions', {
        p_user_id: user.id,
        p_reason: 'user_revoked_session',
        p_keep_current: true,
        p_current_session_token: sessionId
      });

      if (error) throw error;

      toast({
        title: "Sessão revogada",
        description: "A sessão foi revogada com sucesso",
      });

      fetchSessions();
    } catch (error) {
      console.error('Error revoking session:', error);
      toast({
        title: "Erro",
        description: "Não foi possível revogar a sessão",
        variant: "destructive",
      });
    }
  };

  const revokeAllSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('revoke_user_sessions', {
        p_user_id: user.id,
        p_reason: 'user_revoked_all',
        p_keep_current: true
      });

      if (error) throw error;

      toast({
        title: "Sessões revogadas",
        description: `${data || 0} sessões foram revogadas com sucesso`,
      });

      fetchSessions();
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível revogar as sessões",
        variant: "destructive",
      });
    }
  };

  const getDeviceInfo = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Sessões Ativas
        </CardTitle>
        {sessions.length > 1 && (
          <Button variant="destructive" size="sm" onClick={revokeAllSessions}>
            <Trash2 className="h-4 w-4 mr-2" />
            Revogar Todas
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma sessão ativa</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between border-b pb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{getDeviceInfo(session.user_agent)}</Badge>
                    <p className="text-sm font-medium">
                      IP: {session.ip_address ? String(session.ip_address) : 'N/A'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Última atividade: {new Date(session.last_activity).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expira em: {new Date(session.expires_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeSession(session.session_token)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
