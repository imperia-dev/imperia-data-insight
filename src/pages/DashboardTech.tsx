import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertCircle, CheckCircle, Clock, Download } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePageLayout } from "@/hooks/usePageLayout";
import { supabase } from "@/integrations/supabase/client";
import { ErrorTypesChart } from "@/components/dashboard/ErrorTypesChart";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { exportToPDF, exportToExcel } from "@/utils/exportUtils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ErrorTypeData {
  type: string;
  count: number;
  label: string;
}

interface PendencyStats {
  total: number;
  pending: number;
  resolved: number;
  inProgress: number;
  errorTypes: ErrorTypeData[];
}

export default function DashboardTech() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PendencyStats>({
    total: 0,
    pending: 0,
    resolved: 0,
    inProgress: 0,
    errorTypes: []
  });

  const errorTypesMap: Record<string, string> = {
    "nao_e_erro": "Não é erro",
    "falta_de_dados": "Falta de dados",
    "apostila": "Apostila",
    "erro_em_data": "Erro em data",
    "nome_separado": "Nome separado",
    "texto_sem_traduzir": "Texto sem traduzir",
    "nome_incorreto": "Nome incorreto",
    "texto_duplicado": "Texto duplicado",
    "erro_em_crc": "Erro em CRC",
    "nome_traduzido": "Nome traduzido",
    "falta_parte_documento": "Falta parte do documento",
    "erro_digitacao": "Erro de digitação",
    "sem_assinatura_tradutor": "Sem assinatura do tradutor",
    "nome_junto": "Nome junto",
    "traducao_incompleta": "Tradução incompleta",
    "titulo_incorreto": "Título incorreto",
    "trecho_sem_traduzir": "Trecho sem traduzir",
    "matricula_incorreta": "Matrícula incorreta",
    "espacamento": "Espaçamento",
    "sem_cabecalho": "Sem cabeçalho",
  };

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
    fetchPendencyStats();
  }, []);

  const fetchPendencyStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all pendencies
      const { data: pendencies, error } = await supabase
        .from('pendencies')
        .select('*');

      if (error) throw error;

      if (pendencies) {
        // Calculate status counts
        const pending = pendencies.filter(p => p.status === 'pending').length;
        const resolved = pendencies.filter(p => p.status === 'resolved').length;
        const inProgress = pendencies.filter(p => p.status === 'in_progress').length;

        // Calculate error types
        const errorTypesCounts: Record<string, number> = {};
        pendencies.forEach(pendency => {
          if (pendency.error_type) {
            errorTypesCounts[pendency.error_type] = (errorTypesCounts[pendency.error_type] || 0) + 1;
          }
        });

        const errorTypesData: ErrorTypeData[] = Object.entries(errorTypesCounts)
          .map(([type, count]) => ({
            type,
            count,
            label: errorTypesMap[type] || type
          }))
          .sort((a, b) => b.count - a.count);

        setStats({
          total: pendencies.length,
          pending,
          resolved,
          inProgress,
          errorTypes: errorTypesData
        });
      }
    } catch (error) {
      console.error('Error fetching pendency stats:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const exportData = {
      title: "Dashboard de Operação",
      headers: ["Tipo de Erro", "Quantidade", "Percentual"],
      rows: stats.errorTypes.map(item => [
        item.label,
        item.count.toString(),
        `${((item.count / stats.total) * 100).toFixed(1)}%`
      ]),
      totals: [
        { label: "Total de Pendências", value: stats.total.toString() },
        { label: "Pendentes", value: stats.pending.toString() },
        { label: "Resolvidas", value: stats.resolved.toString() },
        { label: "Em Andamento", value: stats.inProgress.toString() },
      ],
      charts: [
        {
          title: "Distribuição de Tipos de Erro",
          type: 'bar' as const,
          data: stats.errorTypes.slice(0, 8).map(item => ({
            label: item.label,
            value: item.count,
            formattedValue: item.count.toString()
          }))
        }
      ]
    };

    exportToPDF(exportData);
    
    toast({
      title: "Sucesso",
      description: "Relatório PDF exportado com sucesso!",
    });
  };

  const handleExportExcel = () => {
    const exportData = {
      title: "Dashboard de Operação",
      headers: ["Tipo de Erro", "Quantidade", "Percentual"],
      rows: stats.errorTypes.map(item => [
        item.label,
        item.count.toString(),
        `${((item.count / stats.total) * 100).toFixed(1)}%`
      ]),
      totals: [
        { label: "Total de Pendências", value: stats.total.toString() },
        { label: "Pendentes", value: stats.pending.toString() },
        { label: "Resolvidas", value: stats.resolved.toString() },
        { label: "Em Andamento", value: stats.inProgress.toString() },
      ]
    };

    exportToExcel(exportData);
    
    toast({
      title: "Sucesso",
      description: "Relatório Excel exportado com sucesso!",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard de Operação</h1>
              <p className="text-muted-foreground mt-1">
                Acompanhe as métricas de pendências e erros
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatsCard
              title="Total de Pendências"
              value={stats.total}
              icon={<FileText className="h-6 w-6" />}
              description="Todas as pendências registradas"
            />
            <StatsCard
              title="Pendentes"
              value={stats.pending}
              icon={<Clock className="h-6 w-6" />}
              description="Aguardando resolução"
              trend={stats.pending > 0 ? "up" : "neutral"}
            />
            <StatsCard
              title="Resolvidas"
              value={stats.resolved}
              icon={<CheckCircle className="h-6 w-6" />}
              description="Pendências resolvidas"
              trend={stats.resolved > 0 ? "up" : "neutral"}
            />
            <StatsCard
              title="Em Andamento"
              value={stats.inProgress}
              icon={<AlertCircle className="h-6 w-6" />}
              description="Sendo processadas"
              trend="neutral"
            />
          </div>

          {/* Error Types Chart */}
          <div className="grid gap-4 grid-cols-1">
            <ErrorTypesChart data={stats.errorTypes} />
          </div>
        </main>
      </div>
    </div>
  );
}