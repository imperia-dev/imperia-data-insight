import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Shield, Lock, Eye, Database, Bell, UserCheck, ArrowLeft } from "lucide-react";
import { sanitizeInput } from "@/lib/validations/sanitized";

export default function PrivacyPolicy() {
  const { user } = useAuth();
  const [hasAccepted, setHasAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAcceptance = async () => {
      if (!user) return;

      const { data: acceptance } = await supabase
        .from("privacy_policy_acceptances")
        .select("*")
        .eq("user_id", user.id)
        .eq("policy_version", "1.0")
        .single();

      setHasAccepted(!!acceptance);
    };

    checkAcceptance();
  }, [user]);

  const handleAccept = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("privacy_policy_acceptances")
        .insert({
          user_id: user.id,
          policy_version: "1.0",
          user_agent: sanitizeInput(navigator.userAgent),
        });

      if (error) throw error;

      setHasAccepted(true);
      toast.success("Política de privacidade aceita com sucesso");
    } catch (error) {
      console.error("Error accepting privacy policy:", error);
      toast.error("Erro ao aceitar política de privacidade");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link 
          to="/auth" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')} • Versão 1.0
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Introdução</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                A Imperia valoriza sua privacidade e está comprometida em proteger seus dados pessoais.
                Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos
                suas informações de acordo com a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Dados Coletados</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Dados de Cadastro:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Nome completo</li>
                  <li>Endereço de e-mail</li>
                  <li>Telefone (quando aplicável)</li>
                  <li>Cargo e função na empresa</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Dados de Uso:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Logs de acesso e atividades no sistema</li>
                  <li>Endereço IP e informações do navegador</li>
                  <li>Dados de autenticação (MFA)</li>
                  <li>Histórico de transações e documentos</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle>Uso dos Dados</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Utilizamos seus dados para:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Gerenciar sua conta e autenticação</li>
                <li>Processar pedidos e pagamentos</li>
                <li>Garantir a segurança da plataforma</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Comunicar atualizações importantes do sistema</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Proteção de Dados</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Implementamos medidas de segurança robustas:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Criptografia de dados em trânsito e em repouso</li>
                <li>Autenticação multifator (MFA) obrigatória para roles sensíveis</li>
                <li>Monitoramento contínuo de segurança e detecção de ameaças</li>
                <li>Backups automáticos e recuperação de desastres</li>
                <li>Controle de acesso baseado em funções (RBAC)</li>
                <li>Auditoria completa de todas as ações no sistema</li>
                <li>Mascaramento de dados sensíveis (CPF, CNPJ, PIX)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Alertas de Segurança</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p>
                Monitoramos continuamente atividades suspeitas e enviamos alertas automáticos
                aos administradores em caso de:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
                <li>Múltiplas tentativas de login falhadas</li>
                <li>Acessos não autorizados</li>
                <li>Atividades suspeitas</li>
                <li>Violações de limites de taxa (rate limiting)</li>
                <li>Desativação de MFA por usuários sensíveis</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <CardTitle>Seus Direitos (LGPD)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4">De acordo com a LGPD, você tem direito a:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Confirmar a existência de tratamento dos seus dados</li>
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar anonimização, bloqueio ou eliminação de dados</li>
                <li>Solicitar portabilidade dos dados</li>
                <li>Revogar consentimento</li>
                <li>Obter informações sobre compartilhamento de dados</li>
              </ul>
              <p className="mt-4 text-sm">
                Para exercer esses direitos, entre em contato através do e-mail:{" "}
                <a href="mailto:privacidade@imperia.com.br" className="text-primary hover:underline">
                  privacidade@imperia.com.br
                </a>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retenção de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Mantemos seus dados pelo período necessário para cumprir as finalidades descritas
                nesta política, exceto quando um período de retenção maior for exigido ou permitido
                por lei. Logs de auditoria são mantidos por pelo menos 5 anos para fins de conformidade.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alterações nesta Política</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Esta política pode ser atualizada periodicamente. Notificaremos você sobre
                mudanças significativas através do sistema e solicitaremos nova aceitação
                quando necessário.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">
                Para questões sobre privacidade ou exercer seus direitos:
              </p>
              <div className="space-y-1 text-muted-foreground">
                <p>E-mail: privacidade@imperia.com.br</p>
                <p>DPO (Encarregado de Dados): dpo@imperia.com.br</p>
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
                {loading ? "Processando..." : "Li e Aceito a Política de Privacidade"}
              </Button>
            </div>
          )}

          {hasAccepted && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-center text-primary font-medium">
                  ✓ Você aceitou esta política de privacidade
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
