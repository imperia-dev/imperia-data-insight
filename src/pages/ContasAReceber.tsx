import { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VariaveisEsporadicas } from "@/components/financeiro/VariaveisEsporadicas";
import { Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface ContaReceber {
  id: string;
  cliente_nome: string;
  cnpj: string;
  pix: string | null;
  prestacoes: any;
  valor_total: number;
  valor_por_produto: any;
  produto_1_vendido: number;
  total_ids: number;
  total_paginas: number;
  media_por_documento: number;
  created_at: string;
}

export default function ContasAReceber() {
  const { user } = useAuth();
  const { userRole, loading } = useRoleAccess("/contas-a-receber");
  const { isCollapsed } = useSidebar();
  const [userName, setUserName] = useState('');
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchContas();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) setUserName(data.full_name || 'Usuário');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_a_receber')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Error fetching contas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contas a receber",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <Header userName={userName} userRole={userRole} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Contas a Receber</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie os recebimentos de clientes
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(contas.reduce((sum, c) => sum + c.valor_total, 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contas.length} cliente{contas.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de IDs</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {contas.reduce((sum, c) => sum + c.total_ids, 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Páginas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {contas.reduce((sum, c) => sum + c.total_paginas, 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Média por Documento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      contas.length > 0 
                        ? contas.reduce((sum, c) => sum + c.media_por_documento, 0) / contas.length 
                        : 0
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Clientes e Recebíveis</CardTitle>
                <CardDescription>Informações detalhadas dos recebimentos por cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Pix</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Total IDs</TableHead>
                      <TableHead>Total Páginas</TableHead>
                      <TableHead>Produto 1</TableHead>
                      <TableHead>Média/Doc</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contas.map((conta) => (
                      <TableRow key={conta.id}>
                        <TableCell className="font-medium">{conta.cliente_nome}</TableCell>
                        <TableCell className="font-mono text-xs">{conta.cnpj}</TableCell>
                        <TableCell className="text-xs">{conta.pix || '-'}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(conta.valor_total)}</TableCell>
                        <TableCell>{conta.total_ids}</TableCell>
                        <TableCell>{conta.total_paginas}</TableCell>
                        <TableCell>{conta.produto_1_vendido}</TableCell>
                        <TableCell>{formatCurrency(conta.media_por_documento)}</TableCell>
                      </TableRow>
                    ))}
                    {contas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Nenhuma conta a receber encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <VariaveisEsporadicas tipo="receber" onSuccess={fetchContas} />
          </div>
        </main>
      </div>
    </div>
  );
}
