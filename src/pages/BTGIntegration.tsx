import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle, AlertCircle, Settings, Key } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useAuth } from "@/contexts/AuthContext";

function BTGIntegrationContent() {
  const { toast } = useToast();
  const { mainContainerClass } = usePageLayout();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    checkIntegrationStatus();
    fetchSuppliers();
    fetchUserProfile();
  }, []);

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

  const checkIntegrationStatus = async () => {
    try {
      // For now, we'll check configuration by trying to call the function
      // This will be replaced when btg_integration table is added to the types
      setIsConfigured(true); // Assume configured for now
      
      // Mock integration status for development
      setIntegrationStatus({
        token_expires_at: null,
        last_sync_at: null
      });
    } catch (error) {
      console.log('Integration not configured or not authenticated');
      setIsConfigured(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleAuthenticate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('btg-auth');

      if (error) throw error;

      if (data?.error) {
        if (data.error === 'BTG integration not configured') {
          toast({
            title: "Configuração Pendente",
            description: "Por favor, configure BTG_CLIENT_ID e BTG_CLIENT_SECRET nas configurações do Supabase",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error);
      }

      toast({
        title: "Autenticação Bem-sucedida",
        description: "Conectado ao BTG com sucesso",
      });

      await checkIntegrationStatus();
    } catch (error: any) {
      toast({
        title: "Erro na Autenticação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSuppliers = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('btg-sync-suppliers');

      if (error) throw error;

      if (data?.error) {
        if (data.error === 'BTG integration not configured') {
          toast({
            title: "Configuração Pendente",
            description: "Configure as credenciais BTG primeiro",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error);
      }

      toast({
        title: "Sincronização Concluída",
        description: data.message,
      });

      await fetchSuppliers();
      await checkIntegrationStatus();
    } catch (error: any) {
      toast({
        title: "Erro na Sincronização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const isTokenValid = () => {
    if (!integrationStatus?.token_expires_at) return false;
    return new Date(integrationStatus.token_expires_at) > new Date();
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <Header userName={userName} userRole={userRole} />
      <main className={mainContainerClass}>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Integração BTG</h1>
              <p className="text-muted-foreground">
                Gerencie a integração com o BTG Pactual
              </p>
            </div>
          </div>

          {!isConfigured && (
            <Alert className="border-warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuração Necessária</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Para ativar a integração BTG, adicione as seguintes chaves no Supabase:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><code className="bg-muted px-1 py-0.5 rounded">BTG_CLIENT_ID</code></li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">BTG_CLIENT_SECRET</code></li>
                </ul>
                <p className="mt-3">
                  Acesse: <a 
                    href={`https://supabase.com/dashboard/project/agttqqaampznczkyfvkf/settings/functions`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Configurações de Secrets do Supabase
                  </a>
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status da Integração</CardTitle>
                <CardDescription>
                  Informações sobre a conexão com o BTG
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  {isTokenValid() ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </div>

                {integrationStatus && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Token Expira Em</span>
                      <span className="text-sm text-muted-foreground">
                        {integrationStatus.token_expires_at
                          ? format(new Date(integrationStatus.token_expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Última Sincronização</span>
                      <span className="text-sm text-muted-foreground">
                        {integrationStatus.last_sync_at
                          ? format(new Date(integrationStatus.last_sync_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "Nunca"}
                      </span>
                    </div>
                  </>
                )}

                <div className="pt-4 space-y-2">
                  <Button
                    onClick={handleAuthenticate}
                    disabled={loading || !isConfigured}
                    className="w-full"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {loading ? "Autenticando..." : "Autenticar com BTG"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fornecedores</CardTitle>
                <CardDescription>
                  Fornecedores sincronizados do BTG
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total de Fornecedores</span>
                  <Badge variant="outline">{suppliers.length}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Ativos</span>
                  <Badge variant="outline">
                    {suppliers.filter(s => s.status === 'active').length}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Inativos</span>
                  <Badge variant="outline">
                    {suppliers.filter(s => s.status === 'inactive').length}
                  </Badge>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSyncSuppliers}
                    disabled={syncing || !isTokenValid()}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? "Sincronizando..." : "Sincronizar Fornecedores"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {suppliers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Fornecedores Recentes</CardTitle>
                <CardDescription>
                  Últimos fornecedores sincronizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Nome</th>
                        <th className="text-left p-2">CNPJ</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Sincronizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.slice(0, 5).map((supplier) => (
                        <tr key={supplier.id} className="border-b">
                          <td className="p-2">{supplier.name}</td>
                          <td className="p-2">{supplier.cnpj}</td>
                          <td className="p-2">{supplier.email}</td>
                          <td className="p-2">
                            <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                              {supplier.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {supplier.synced_at
                              ? format(new Date(supplier.synced_at), "dd/MM HH:mm", { locale: ptBR })
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default function BTGIntegration() {
  return (
    <SidebarProvider>
      <BTGIntegrationContent />
    </SidebarProvider>
  );
}