import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, TrendingUp, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PaymentData {
  user_id: string;
  user_name: string;
  date: string;
  amount: number;
}

interface AccumulatedPayment {
  user_id: string;
  user_name: string;
  total_amount: number;
  total_documents: number;
}

export default function Financial() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [dailyPayments, setDailyPayments] = useState<PaymentData[]>([]);
  const [accumulatedPayments, setAccumulatedPayments] = useState<AccumulatedPayment[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchPaymentData();
  }, [selectedPeriod]);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      // Fetch daily payments
      const { data: dailyData, error: dailyError } = await supabase
        .from('financial_records')
        .select(`
          user_id,
          amount,
          payment_date,
          profiles!financial_records_user_id_fkey(full_name)
        `)
        .order('payment_date', { ascending: false });

      if (dailyError) throw dailyError;

      // Transform daily data
      const transformedDaily = dailyData?.map(record => ({
        user_id: record.user_id,
        user_name: record.profiles?.full_name || 'Unknown',
        date: record.payment_date,
        amount: record.amount
      })) || [];

      setDailyPayments(transformedDaily);

      // Calculate accumulated payments
      const accumulated = transformedDaily.reduce((acc, payment) => {
        const existing = acc.find(p => p.user_id === payment.user_id);
        if (existing) {
          existing.total_amount += payment.amount;
          existing.total_documents += 1;
        } else {
          acc.push({
            user_id: payment.user_id,
            user_name: payment.user_name,
            total_amount: payment.amount,
            total_documents: 1
          });
        }
        return acc;
      }, [] as AccumulatedPayment[]);

      setAccumulatedPayments(accumulated.sort((a, b) => b.total_amount - a.total_amount));
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalPayments = accumulatedPayments.reduce((sum, payment) => sum + payment.total_amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-foreground">
                  Financeiro
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gestão de pagamentos e relatórios financeiros
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="quarter">Este Trimestre</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Calendar className="h-4 w-4 mr-2" />
                  Filtrar Período
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalPayments)}</div>
                <p className="text-xs text-muted-foreground">
                  Período selecionado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prestadores Ativos</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accumulatedPayments.length}</div>
                <p className="text-xs text-muted-foreground">
                  Com pagamentos registrados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média por Prestador</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(accumulatedPayments.length > 0 ? totalPayments / accumulatedPayments.length : 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor médio
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Payments Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Pagamentos por Dia por Prestador</CardTitle>
              <CardDescription>
                Detalhamento diário dos pagamentos realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando dados...
                </div>
              ) : dailyPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pagamento registrado no período
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Prestador</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyPayments.map((payment, index) => (
                      <TableRow key={`${payment.user_id}-${payment.date}-${index}`}>
                        <TableCell>
                          {payment.date ? format(new Date(payment.date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                        </TableCell>
                        <TableCell>{payment.user_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Accumulated Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pagamento Acumulado por Prestador</CardTitle>
              <CardDescription>
                Total acumulado no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando dados...
                </div>
              ) : accumulatedPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pagamento registrado no período
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prestador</TableHead>
                      <TableHead className="text-center">Documentos</TableHead>
                      <TableHead className="text-right">Total Acumulado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accumulatedPayments.map((payment) => (
                      <TableRow key={payment.user_id}>
                        <TableCell className="font-medium">{payment.user_name}</TableCell>
                        <TableCell className="text-center">{payment.total_documents}</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(payment.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}