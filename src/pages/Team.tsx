import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, 
  Search, 
  Shield, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  TrendingUp,
  DollarSign,
  Calendar,
  Mail,
  User,
  Activity,
  Target,
  Timer,
  BarChart3,
  CalendarDays,
  Award,
  Briefcase,
  Hash
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays, differenceInMonths, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  phone_verified: boolean;
  created_at: string;
  approval_status: string;
  mfa_enabled: boolean;
  last_access?: string;
  failed_access_attempts?: number;
}

interface ProductivityStats {
  // Basic stats
  total_days_worked: number;
  total_documents: number;
  total_words: number;
  total_pages: number;
  total_earnings: number;
  avg_daily_earnings: number;
  last_activity?: string;
  
  // Advanced stats
  first_work_date?: string;
  total_orders_completed: number;
  avg_docs_per_day: number;
  avg_docs_per_week: number;
  avg_docs_per_month: number;
  avg_minutes_per_document: number;
  avg_hours_per_order: number;
  total_hours_worked: number;
  urgent_documents_completed: number;
  completion_rate: number;
  
  // Work patterns
  work_pattern?: {
    most_productive_hours: number[];
    typical_start_time: string;
    typical_end_time: string;
    days_of_week: string[];
    weekly_hours: number;
  };
  
  // Performance trends
  performance_trend?: 'improving' | 'stable' | 'declining';
  monthly_stats?: Array<{
    month: string;
    documents: number;
    earnings: number;
    hours: number;
  }>;
  
  // Daily activity for charts
  daily_activity?: Array<{
    date: string;
    documents: number;
    words: number;
    earnings: number;
  }>;
}

export default function Team() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberProductivity, setMemberProductivity] = useState<ProductivityStats | null>(null);
  const [loadingProductivity, setLoadingProductivity] = useState(false);

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
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    const filtered = teamMembers.filter(member => 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMembers(filtered);
  }, [searchQuery, teamMembers]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'operation')
        .order('full_name', { ascending: true });

      if (error) throw error;

      setTeamMembers(data || []);
      setFilteredMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error("Erro ao carregar membros da equipe");
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberProductivity = async (memberId: string) => {
    try {
      setLoadingProductivity(true);
      
      // Fetch productivity data
      const { data: productivityData, error: prodError } = await supabase
        .from('productivity')
        .select('*')
        .eq('user_id', memberId)
        .order('date', { ascending: true });

      if (prodError) throw prodError;

      // Fetch orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('assigned_to', memberId)
        .eq('status_order', 'delivered');

      if (ordersError) throw ordersError;

      // Fetch documents data
      const { data: documentsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('assigned_to', memberId)
        .eq('status', 'completed');

      if (docsError) throw docsError;

      if (productivityData && productivityData.length > 0) {
        // Calculate basic stats
        const totalDocs = productivityData.reduce((sum, day) => sum + (day.documents_completed || 0), 0);
        const totalWords = productivityData.reduce((sum, day) => sum + (day.words_translated || 0), 0);
        const totalPages = productivityData.reduce((sum, day) => sum + (day.pages_translated || 0), 0);
        const totalEarnings = productivityData.reduce((sum, day) => sum + (Number(day.daily_earnings) || 0), 0);
        const totalHours = productivityData.reduce((sum, day) => sum + (Number(day.hours_worked) || 0), 0);
        
        // Calculate date range
        const firstDate = productivityData[0]?.date;
        const lastDate = productivityData[productivityData.length - 1]?.date;
        const daysActive = firstDate && lastDate ? differenceInDays(new Date(lastDate), new Date(firstDate)) + 1 : 0;
        const weeksActive = Math.max(Math.ceil(daysActive / 7), 1);
        const monthsActive = Math.max(differenceInMonths(new Date(lastDate || new Date()), new Date(firstDate || new Date())) + 1, 1);
        
        // Calculate averages
        const avgDocsPerDay = totalDocs / Math.max(productivityData.length, 1);
        const avgDocsPerWeek = totalDocs / weeksActive;
        const avgDocsPerMonth = totalDocs / monthsActive;
        const avgMinutesPerDoc = totalDocs > 0 ? (totalHours * 60) / totalDocs : 0;
        const avgHoursPerOrder = ordersData && ordersData.length > 0 ? totalHours / ordersData.length : 0;
        
        // Calculate urgent documents completed
        const urgentDocs = ordersData ? ordersData.reduce((sum, order) => sum + (order.urgent_document_count || 0), 0) : 0;
        
        // Calculate completion rate
        const totalOrdersAssigned = ordersData ? ordersData.length : 0;
        const completionRate = totalOrdersAssigned > 0 ? (ordersData?.length || 0) / totalOrdersAssigned * 100 : 0;
        
        // Analyze work patterns
        const workHoursByHour: Record<number, number> = {};
        const workDaysByWeekday: Record<string, number> = {};
        
        productivityData.forEach(day => {
          if (day.date) {
            const date = new Date(day.date);
            const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
            workDaysByWeekday[weekday] = (workDaysByWeekday[weekday] || 0) + 1;
          }
        });
        
        // Get most productive days
        const mostActiveDays = Object.entries(workDaysByWeekday)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([day]) => day);
        
        // Calculate monthly stats for charts
        const monthlyStatsMap: Record<string, { documents: number; earnings: number; hours: number }> = {};
        
        productivityData.forEach(day => {
          if (day.date) {
            const monthKey = format(new Date(day.date), 'MMM yyyy', { locale: ptBR });
            if (!monthlyStatsMap[monthKey]) {
              monthlyStatsMap[monthKey] = { documents: 0, earnings: 0, hours: 0 };
            }
            monthlyStatsMap[monthKey].documents += day.documents_completed || 0;
            monthlyStatsMap[monthKey].earnings += Number(day.daily_earnings) || 0;
            monthlyStatsMap[monthKey].hours += Number(day.hours_worked) || 0;
          }
        });
        
        const monthlyStats = Object.entries(monthlyStatsMap).map(([month, stats]) => ({
          month,
          ...stats
        }));
        
        // Prepare daily activity for charts (last 30 days)
        const last30Days = productivityData.slice(-30).map(day => ({
          date: format(new Date(day.date), 'dd/MM', { locale: ptBR }),
          documents: day.documents_completed || 0,
          words: day.words_translated || 0,
          earnings: Number(day.daily_earnings) || 0
        }));
        
        // Determine performance trend
        const recentDays = productivityData.slice(-7);
        const previousDays = productivityData.slice(-14, -7);
        const recentAvg = recentDays.reduce((sum, day) => sum + (day.documents_completed || 0), 0) / Math.max(recentDays.length, 1);
        const previousAvg = previousDays.reduce((sum, day) => sum + (day.documents_completed || 0), 0) / Math.max(previousDays.length, 1);
        
        let performanceTrend: 'improving' | 'stable' | 'declining' = 'stable';
        if (recentAvg > previousAvg * 1.1) performanceTrend = 'improving';
        else if (recentAvg < previousAvg * 0.9) performanceTrend = 'declining';
        
        const stats: ProductivityStats = {
          total_days_worked: productivityData.length,
          total_documents: totalDocs,
          total_words: totalWords,
          total_pages: totalPages,
          total_earnings: totalEarnings,
          avg_daily_earnings: totalEarnings / Math.max(productivityData.length, 1),
          last_activity: lastDate,
          first_work_date: firstDate,
          total_orders_completed: ordersData?.length || 0,
          avg_docs_per_day: avgDocsPerDay,
          avg_docs_per_week: avgDocsPerWeek,
          avg_docs_per_month: avgDocsPerMonth,
          avg_minutes_per_document: avgMinutesPerDoc,
          avg_hours_per_order: avgHoursPerOrder,
          total_hours_worked: totalHours,
          urgent_documents_completed: urgentDocs,
          completion_rate: completionRate,
          work_pattern: {
            most_productive_hours: [9, 10, 11, 14, 15], // Mock data for now
            typical_start_time: "09:00",
            typical_end_time: "18:00",
            days_of_week: mostActiveDays,
            weekly_hours: totalHours / weeksActive
          },
          performance_trend: performanceTrend,
          monthly_stats: monthlyStats,
          daily_activity: last30Days
        };
        
        setMemberProductivity(stats);
      } else {
        setMemberProductivity(null);
      }
    } catch (error) {
      console.error('Error fetching productivity:', error);
      toast.error("Erro ao carregar dados de produtividade");
    } finally {
      setLoadingProductivity(false);
    }
  };

  const handleMemberClick = async (member: TeamMember) => {
    setSelectedMember(member);
    await fetchMemberProductivity(member.id);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      approved: { label: "Aprovado", variant: "default" },
      pending: { label: "Pendente", variant: "secondary" },
      rejected: { label: "Rejeitado", variant: "destructive" }
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Equipe</h1>
              <p className="text-muted-foreground mt-1">
                Gerenciar membros da equipe de operação
              </p>
            </div>
            
            <div className="flex gap-2 items-center">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold">{teamMembers.length}</span>
              <span className="text-muted-foreground">membros</span>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Team Members Grid */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-12 w-12 rounded-full mb-4" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-4" />
                    <Skeleton className="h-8 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? "Nenhum membro encontrado com esta busca." 
                    : "Nenhum membro da equipe cadastrado ainda."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <Card 
                  key={member.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleMemberClick(member)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name}`} />
                        <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                      </Avatar>
                      {getStatusBadge(member.approval_status)}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-1">{member.full_name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{member.email}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {member.phone_verified && (
                        <Badge variant="outline" className="text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      )}
                      {member.mfa_enabled && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          MFA
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Member Details Modal */}
          <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {selectedMember && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedMember.full_name}`} />
                          <AvatarFallback>{getInitials(selectedMember.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            {selectedMember.full_name}
                            {getStatusBadge(selectedMember.approval_status)}
                          </div>
                          <p className="text-sm text-muted-foreground font-normal">
                            {selectedMember.email}
                          </p>
                        </div>
                      </div>
                      {memberProductivity?.performance_trend && (
                        <Badge 
                          variant={
                            memberProductivity.performance_trend === 'improving' ? 'default' :
                            memberProductivity.performance_trend === 'declining' ? 'destructive' : 'secondary'
                          }
                          className="flex items-center gap-1"
                        >
                          {memberProductivity.performance_trend === 'improving' && <TrendingUp className="h-3 w-3" />}
                          {memberProductivity.performance_trend === 'declining' && <TrendingUp className="h-3 w-3 rotate-180" />}
                          {memberProductivity.performance_trend === 'improving' && 'Em crescimento'}
                          {memberProductivity.performance_trend === 'stable' && 'Estável'}
                          {memberProductivity.performance_trend === 'declining' && 'Em declínio'}
                        </Badge>
                      )}
                    </DialogTitle>
                  </DialogHeader>

                  <Tabs defaultValue="overview" className="mt-6">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                      <TabsTrigger value="productivity">Produtividade</TabsTrigger>
                      <TabsTrigger value="timeline">Timeline</TabsTrigger>
                      <TabsTrigger value="financial">Financeiro</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                      {/* Quick Stats Cards */}
                      {memberProductivity && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">Tempo Ativo</p>
                              </div>
                              <p className="text-lg font-bold mt-1">
                                {memberProductivity.first_work_date && 
                                  `${differenceInMonths(new Date(), new Date(memberProductivity.first_work_date))} meses`
                                }
                              </p>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">Total Docs</p>
                              </div>
                              <p className="text-lg font-bold mt-1">{memberProductivity.total_documents}</p>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">Taxa Conclusão</p>
                              </div>
                              <p className="text-lg font-bold mt-1">{memberProductivity.completion_rate.toFixed(1)}%</p>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">Total Ganhos</p>
                              </div>
                              <p className="text-lg font-bold mt-1">{formatCurrency(memberProductivity.total_earnings)}</p>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Contact Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Informações de Contato
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedMember.email}</span>
                          </div>
                          {selectedMember.phone_number && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedMember.phone_number}</span>
                              {selectedMember.phone_verified ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Desde {format(new Date(selectedMember.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Security Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Segurança
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span>Autenticação 2FA:</span>
                            {selectedMember.mfa_enabled ? (
                              <Badge variant="default" className="text-xs">Ativado</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Desativado</Badge>
                            )}
                          </div>
                          {selectedMember.last_access && (
                            <div className="text-sm">
                              <p className="text-muted-foreground">Último acesso:</p>
                              <p>{format(new Date(selectedMember.last_access), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="productivity" className="space-y-6">
                      {loadingProductivity ? (
                        <div className="space-y-4">
                          <Skeleton className="h-48 w-full" />
                          <Skeleton className="h-32 w-full" />
                        </div>
                      ) : memberProductivity ? (
                        <>
                          {/* Efficiency Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Activity className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Média Diária</p>
                                </div>
                                <p className="text-2xl font-bold">{memberProductivity.avg_docs_per_day.toFixed(1)}</p>
                                <p className="text-xs text-muted-foreground">documentos/dia</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Timer className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Tempo por Doc</p>
                                </div>
                                <p className="text-2xl font-bold">{memberProductivity.avg_minutes_per_document.toFixed(0)}</p>
                                <p className="text-xs text-muted-foreground">minutos</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Pedidos Completos</p>
                                </div>
                                <p className="text-2xl font-bold">{memberProductivity.total_orders_completed}</p>
                                <p className="text-xs text-muted-foreground">total</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Média Semanal</p>
                                </div>
                                <p className="text-2xl font-bold">{memberProductivity.avg_docs_per_week.toFixed(1)}</p>
                                <p className="text-xs text-muted-foreground">documentos/semana</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Hash className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Média Mensal</p>
                                </div>
                                <p className="text-2xl font-bold">{memberProductivity.avg_docs_per_month.toFixed(0)}</p>
                                <p className="text-xs text-muted-foreground">documentos/mês</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Award className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Docs Urgentes</p>
                                </div>
                                <p className="text-2xl font-bold">{memberProductivity.urgent_documents_completed}</p>
                                <p className="text-xs text-muted-foreground">concluídos</p>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Daily Activity Chart */}
                          {memberProductivity.daily_activity && memberProductivity.daily_activity.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Atividade dos Últimos 30 Dias</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={200}>
                                  <AreaChart data={memberProductivity.daily_activity}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area 
                                      type="monotone" 
                                      dataKey="documents" 
                                      stroke="hsl(var(--primary))" 
                                      fill="hsl(var(--primary))" 
                                      fillOpacity={0.3}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          )}

                          {/* Work Patterns */}
                          {memberProductivity.work_pattern && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Padrões de Trabalho</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Horário Típico</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {memberProductivity.work_pattern.typical_start_time}
                                    </Badge>
                                    <span className="text-muted-foreground">até</span>
                                    <Badge variant="outline">
                                      {memberProductivity.work_pattern.typical_end_time}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Dias Mais Ativos</p>
                                  <div className="flex flex-wrap gap-2">
                                    {memberProductivity.work_pattern.days_of_week.map(day => (
                                      <Badge key={day} variant="secondary">
                                        {day}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Horas Semanais</p>
                                  <p className="text-lg font-semibold">{memberProductivity.work_pattern.weekly_hours.toFixed(1)}h</p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      ) : (
                        <Card>
                          <CardContent className="p-12 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              Nenhum dado de produtividade registrado ainda.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="timeline" className="space-y-6">
                      {memberProductivity ? (
                        <>
                          {/* Timeline Stats */}
                          <div className="grid grid-cols-2 gap-4">
                            <Card>
                              <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground mb-2">Início das Atividades</p>
                                <p className="text-lg font-semibold">
                                  {memberProductivity.first_work_date 
                                    ? format(new Date(memberProductivity.first_work_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                    : 'N/A'
                                  }
                                </p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground mb-2">Última Atividade</p>
                                <p className="text-lg font-semibold">
                                  {memberProductivity.last_activity 
                                    ? format(new Date(memberProductivity.last_activity), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                    : 'N/A'
                                  }
                                </p>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Total Working Time */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Resumo de Tempo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total de Horas Trabalhadas</span>
                                <span className="text-lg font-semibold">{memberProductivity.total_hours_worked.toFixed(1)}h</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Dias Ativos</span>
                                <span className="text-lg font-semibold">{memberProductivity.total_days_worked}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Média de Horas por Dia</span>
                                <span className="text-lg font-semibold">
                                  {(memberProductivity.total_hours_worked / memberProductivity.total_days_worked).toFixed(1)}h
                                </span>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Monthly Progress */}
                          {memberProductivity.monthly_stats && memberProductivity.monthly_stats.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Progresso Mensal</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                  <BarChart data={memberProductivity.monthly_stats}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="documents" fill="hsl(var(--primary))" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      ) : (
                        <Card>
                          <CardContent className="p-12 text-center">
                            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              Nenhum histórico disponível.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="financial" className="space-y-6">
                      {memberProductivity ? (
                        <>
                          {/* Financial Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground mb-2">Ganhos Totais</p>
                                <p className="text-2xl font-bold">{formatCurrency(memberProductivity.total_earnings)}</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground mb-2">Média Diária</p>
                                <p className="text-2xl font-bold">{formatCurrency(memberProductivity.avg_daily_earnings)}</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground mb-2">Média Mensal</p>
                                <p className="text-2xl font-bold">
                                  {formatCurrency(memberProductivity.avg_docs_per_month * memberProductivity.avg_daily_earnings)}
                                </p>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Monthly Earnings Chart */}
                          {memberProductivity.monthly_stats && memberProductivity.monthly_stats.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Ganhos Mensais</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                  <LineChart data={memberProductivity.monthly_stats}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Line 
                                      type="monotone" 
                                      dataKey="earnings" 
                                      stroke="hsl(var(--primary))" 
                                      strokeWidth={2}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          )}

                          {/* Performance per Document */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Análise de Eficiência</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <div className="flex justify-between mb-2">
                                  <span className="text-sm text-muted-foreground">Valor por Documento</span>
                                  <span className="text-sm font-semibold">
                                    {memberProductivity.total_documents > 0 
                                      ? formatCurrency(memberProductivity.total_earnings / memberProductivity.total_documents)
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                                <Progress 
                                  value={memberProductivity.total_documents > 0 ? 75 : 0} 
                                  className="h-2"
                                />
                              </div>
                              
                              <div>
                                <div className="flex justify-between mb-2">
                                  <span className="text-sm text-muted-foreground">Valor por Hora</span>
                                  <span className="text-sm font-semibold">
                                    {memberProductivity.total_hours_worked > 0 
                                      ? formatCurrency(memberProductivity.total_earnings / memberProductivity.total_hours_worked)
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                                <Progress 
                                  value={memberProductivity.total_hours_worked > 0 ? 85 : 0} 
                                  className="h-2"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      ) : (
                        <Card>
                          <CardContent className="p-12 text-center">
                            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              Nenhum dado financeiro disponível.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}