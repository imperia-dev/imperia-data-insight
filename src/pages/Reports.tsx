import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, Download, FileText } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { exportFinancialFlowchartPDF } from "@/utils/exportFinancialFlowchart";
import { toast } from "@/components/ui/use-toast";

export default function Reports() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

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

  const handleDownloadFlowchart = () => {
    try {
      exportFinancialFlowchartPDF();
      toast({
        title: "Download iniciado",
        description: "O PDF do flowchart financeiro está sendo baixado.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o documento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-foreground">Relatórios</h1>
          
          {/* Financial Flowchart Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Arquitetura Financeira
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Visualize e baixe o diagrama completo da arquitetura financeira da plataforma,
                incluindo todos os módulos, integrações e fluxos de dados.
              </p>
              <Button 
                onClick={handleDownloadFlowchart}
                className="w-full sm:w-auto"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Baixar Flowchart Financeiro (PDF)
              </Button>
            </CardContent>
          </Card>
          
          {/* Under Construction Card */}
          <Card className="max-w-2xl mx-auto mt-12">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Construction className="h-6 w-6 text-primary" />
                Outros Relatórios em Construção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Novos relatórios estão sendo desenvolvidos e estarão disponíveis em breve.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}