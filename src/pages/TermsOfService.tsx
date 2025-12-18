import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FileText, Scale, Shield, AlertTriangle, Gavel, RefreshCw, MapPin } from "lucide-react";
import { sanitizeInput } from "@/lib/validations/sanitized";

export default function TermsOfService() {
  const { user } = useAuth();
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [hasAccepted, setHasAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || user.email || "");
        setUserRole(profile.role || "");
      }

      // Check if user has already accepted current version
      const { data: acceptance } = await supabase
        .from("terms_of_service_acceptances")
        .select("*")
        .eq("user_id", user.id)
        .eq("terms_version", "1.0")
        .single();

      setHasAccepted(!!acceptance);
    };

    fetchUserData();
  }, [user]);

  const handleAccept = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("terms_of_service_acceptances")
        .insert({
          user_id: user.id,
          terms_version: "1.0",
          user_agent: sanitizeInput(navigator.userAgent),
        });

      if (error) throw error;

      setHasAccepted(true);
      toast.success("Termos de Serviço aceitos com sucesso");
    } catch (error) {
      console.error("Error accepting terms of service:", error);
      toast.error("Erro ao aceitar Termos de Serviço");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="flex-1">
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Termos de Serviço</h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')} • Versão 1.0
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>1. Introdução</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Bem-vindo à plataforma Imperia. Estes Termos de Serviço ("Termos") regem o uso
                  da nossa plataforma de gestão empresarial e todos os serviços relacionados.
                  Ao acessar ou usar a plataforma, você concorda em estar vinculado a estes Termos.
                </p>
                <p>
                  A Imperia é uma plataforma de gestão que oferece soluções para controle financeiro,
                  gestão de documentos, fluxo de trabalho e comunicação empresarial.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  <CardTitle>2. Definições</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>"Plataforma"</strong>: Sistema Imperia e todos os seus módulos e funcionalidades</li>
                  <li><strong>"Usuário"</strong>: Qualquer pessoa física ou jurídica que acessa a plataforma</li>
                  <li><strong>"Conta"</strong>: Registro único do usuário com credenciais de acesso</li>
                  <li><strong>"Conteúdo"</strong>: Dados, documentos, informações e arquivos inseridos na plataforma</li>
                  <li><strong>"Serviços"</strong>: Funcionalidades oferecidas pela plataforma</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>3. Uso Autorizado</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Ao utilizar a plataforma, você concorda em:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Fornecer informações verdadeiras e atualizadas no cadastro</li>
                  <li>Manter a confidencialidade das suas credenciais de acesso</li>
                  <li>Não compartilhar sua conta com terceiros não autorizados</li>
                  <li>Utilizar a plataforma apenas para fins legais e autorizados</li>
                  <li>Não tentar acessar áreas restritas ou dados de outros usuários</li>
                  <li>Não realizar engenharia reversa ou tentativas de exploração de vulnerabilidades</li>
                  <li>Cumprir todas as políticas de segurança estabelecidas</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <CardTitle>4. Responsabilidades do Usuário</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>O usuário é responsável por:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Todas as atividades realizadas através de sua conta</li>
                  <li>A veracidade e precisão dos dados inseridos na plataforma</li>
                  <li>Manter backup próprio de dados críticos quando aplicável</li>
                  <li>Reportar imediatamente qualquer acesso não autorizado à sua conta</li>
                  <li>Cumprir as leis e regulamentos aplicáveis em sua jurisdição</li>
                  <li>Uso adequado dos recursos da plataforma sem sobrecarga intencional</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>5. Propriedade Intelectual</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  A plataforma Imperia, incluindo seu código-fonte, design, funcionalidades,
                  marcas e conteúdos criados pela empresa, são protegidos por leis de propriedade
                  intelectual e pertencem exclusivamente à Imperia.
                </p>
                <p>
                  O usuário mantém a propriedade sobre o conteúdo que insere na plataforma,
                  concedendo à Imperia licença limitada para processar, armazenar e exibir
                  esse conteúdo conforme necessário para prestação dos serviços.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-primary" />
                  <CardTitle>6. Limitações de Responsabilidade</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>A Imperia não se responsabiliza por:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Decisões tomadas com base em informações da plataforma</li>
                  <li>Interrupções temporárias para manutenção ou atualizações</li>
                  <li>Perdas decorrentes de uso inadequado da plataforma</li>
                  <li>Danos causados por terceiros ou eventos de força maior</li>
                  <li>Conteúdo inserido pelos usuários</li>
                </ul>
                <p className="mt-4">
                  A plataforma é fornecida "como está", com as garantias limitadas
                  expressas nestes termos e conforme permitido pela legislação aplicável.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <CardTitle>7. Modificações</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p>
                  A Imperia reserva-se o direito de modificar estes Termos a qualquer momento.
                  Alterações significativas serão comunicadas aos usuários através da plataforma
                  ou por e-mail. O uso continuado após as modificações constitui aceitação dos
                  novos termos.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>8. Suspensão e Encerramento</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>A Imperia pode suspender ou encerrar o acesso do usuário em caso de:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Violação destes Termos de Serviço</li>
                  <li>Atividades suspeitas ou fraudulentas</li>
                  <li>Solicitação de autoridades competentes</li>
                  <li>Não pagamento de valores devidos (quando aplicável)</li>
                  <li>Inatividade prolongada conforme política da empresa</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <CardTitle>9. Foro e Lei Aplicável</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p>
                  Estes Termos são regidos pelas leis da República Federativa do Brasil.
                  Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer
                  controvérsias decorrentes destes Termos, com exclusão de qualquer outro,
                  por mais privilegiado que seja.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Contato</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  Para questões sobre estes Termos de Serviço:
                </p>
                <div className="space-y-1 text-muted-foreground">
                  <p>E-mail: legal@imperia.com.br</p>
                  <p>Suporte: suporte@imperia.com.br</p>
                </div>
              </CardContent>
            </Card>

            {!hasAccepted && user && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleAccept}
                  disabled={loading}
                  size="lg"
                  className="w-full max-w-md"
                >
                  {loading ? "Processando..." : "Li e Aceito os Termos de Serviço"}
                </Button>
              </div>
            )}

            {hasAccepted && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <p className="text-center text-primary font-medium">
                    ✓ Você aceitou estes Termos de Serviço
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}