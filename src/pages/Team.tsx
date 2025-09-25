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
  User
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

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
  total_days_worked: number;
  total_documents: number;
  total_words: number;
  total_pages: number;
  total_earnings: number;
  avg_daily_earnings: number;
  last_activity?: string;
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
      
      const { data, error } = await supabase
        .from('productivity')
        .select('*')
        .eq('user_id', memberId);

      if (error) throw error;

      if (data && data.length > 0) {
        const stats: ProductivityStats = {
          total_days_worked: data.length,
          total_documents: data.reduce((sum, day) => sum + (day.documents_completed || 0), 0),
          total_words: data.reduce((sum, day) => sum + (day.words_translated || 0), 0),
          total_pages: data.reduce((sum, day) => sum + (day.pages_translated || 0), 0),
          total_earnings: data.reduce((sum, day) => sum + (Number(day.daily_earnings) || 0), 0),
          avg_daily_earnings: data.length > 0 
            ? data.reduce((sum, day) => sum + (Number(day.daily_earnings) || 0), 0) / data.length 
            : 0,
          last_activity: data[data.length - 1]?.date
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              {selectedMember && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
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
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 mt-6">
                    {/* Contact Information */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Informações de Contato
                      </h4>
                      <div className="space-y-2 pl-6">
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
                            Cadastrado em {format(new Date(selectedMember.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Security Information */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Segurança
                      </h4>
                      <div className="space-y-2 pl-6">
                        <div className="flex items-center gap-2 text-sm">
                          <span>Autenticação de dois fatores:</span>
                          {selectedMember.mfa_enabled ? (
                            <Badge variant="default" className="text-xs">Ativado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Desativado</Badge>
                          )}
                        </div>
                        {selectedMember.last_access && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Último acesso: {format(new Date(selectedMember.last_access), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        {selectedMember.failed_access_attempts && selectedMember.failed_access_attempts > 0 && (
                          <div className="flex items-center gap-2 text-sm text-orange-600">
                            <span>Tentativas de acesso falhadas: {selectedMember.failed_access_attempts}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Productivity Stats */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Estatísticas de Produtividade
                      </h4>
                      {loadingProductivity ? (
                        <div className="pl-6 space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      ) : memberProductivity ? (
                        <div className="grid grid-cols-2 gap-4 pl-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Dias Trabalhados</p>
                            <p className="text-lg font-semibold">{memberProductivity.total_days_worked}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Documentos Processados</p>
                            <p className="text-lg font-semibold">{memberProductivity.total_documents}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Palavras Traduzidas</p>
                            <p className="text-lg font-semibold">{memberProductivity.total_words.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Páginas Traduzidas</p>
                            <p className="text-lg font-semibold">{memberProductivity.total_pages}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Ganhos Totais</p>
                            <p className="text-lg font-semibold">{formatCurrency(memberProductivity.total_earnings)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Média Diária</p>
                            <p className="text-lg font-semibold">{formatCurrency(memberProductivity.avg_daily_earnings)}</p>
                          </div>
                          {memberProductivity.last_activity && (
                            <div className="col-span-2">
                              <p className="text-sm text-muted-foreground">Última Atividade</p>
                              <p className="text-sm">
                                {format(new Date(memberProductivity.last_activity), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pl-6">
                          <p className="text-sm text-muted-foreground">
                            Nenhum dado de produtividade registrado ainda.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}