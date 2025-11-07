import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerContext } from "@/hooks/useCustomerContext";
import { useUserRole } from "@/hooks/useUserRole";
import { RequestStatusBadge } from "@/components/customer/RequestStatusBadge";
import { PriorityBadge } from "@/components/customer/PriorityBadge";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Plus, FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { customerName, loading: customerLoading } = useCustomerContext();
  const [userName, setUserName] = useState("");
  const { userRole, loading: roleLoading } = useUserRole();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['customer-dashboard', session?.user?.id, customerName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_pendency_requests')
        .select('*')
        .eq('customer_name', customerName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id && !!customerName
  });

  const stats = {
    total: requests?.length || 0,
    pending: requests?.filter(r => r.status === 'pending').length || 0,
    under_review: requests?.filter(r => r.status === 'under_review').length || 0,
    converted: requests?.filter(r => r.status === 'converted').length || 0,
    rejected: requests?.filter(r => r.status === 'rejected').length || 0
  };

  const chartData = [
    { name: 'Pendente', value: stats.pending, color: 'hsl(var(--secondary))' },
    { name: 'Em Análise', value: stats.under_review, color: 'hsl(var(--primary))' },
    { name: 'Convertido', value: stats.converted, color: 'hsl(var(--chart-2))' },
    { name: 'Rejeitado', value: stats.rejected, color: 'hsl(var(--destructive))' }
  ];

  const recentRequests = requests?.slice(0, 5) || [];

  if (customerLoading || isLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole || "customer"} />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard {customerName}</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas solicitações de pendência
          </p>
        </div>
        <Button onClick={() => navigate('/customer-pendency-request')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Solicitações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.under_review}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Convertidas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.converted}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Status das Solicitações</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Solicitações</CardTitle>
            <CardDescription>5 solicitações mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma solicitação ainda</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/customer-pendency-request')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Solicitação
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{request.order_id}</p>
                        <PriorityBadge priority={request.priority as any} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {request.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <RequestStatusBadge status={request.status as any} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigate('/customer-requests')}>
          Ver Todas as Solicitações
        </Button>
      </div>
      </main>
      </div>
    </div>
  );
}
