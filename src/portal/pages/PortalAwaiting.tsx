import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { PortalLayout } from "../PortalLayout";
import { useTrialCustomer } from "../TrialPortalGuard";
import { useAuth } from "@/contexts/AuthContext";

export default function PortalAwaiting() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { customer, loading } = useTrialCustomer();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || authLoading) return;
    if (!user) {
      navigate("/portal/login", { replace: true });
      return;
    }
    if (!customer) {
      navigate("/portal/cadastro", { replace: true });
      return;
    }
    if (customer.status === "approved") navigate("/portal/app", { replace: true });
  }, [customer, loading, authLoading, user, navigate]);

  return (
    <PortalLayout>
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="pt-8 text-center space-y-4">
            {(loading || authLoading) && <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />}
            {customer?.status === "pending" && (
              <>
                <Clock className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-2xl font-semibold">Cadastro em análise</h2>
                <p className="text-muted-foreground">
                  Recebemos seu cadastro. Nossa equipe analisará e liberará seu acesso em breve.
                  Você receberá um email assim que for aprovado.
                </p>
              </>
            )}
            {customer?.status === "rejected" && (
              <>
                <XCircle className="h-12 w-12 mx-auto text-destructive" />
                <h2 className="text-2xl font-semibold">Cadastro não aprovado</h2>
                {customer.rejection_reason && (
                  <p className="text-muted-foreground">Motivo: {customer.rejection_reason}</p>
                )}
              </>
            )}
            {customer?.status === "deactivated" && (
              <>
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-2xl font-semibold">Conta desativada</h2>
                <p className="text-muted-foreground">Entre em contato com a Impéria para reativar.</p>
              </>
            )}
            {customer?.status === "approved" && (
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
            )}
            <Button variant="outline" onClick={() => signOut()} className="mt-4">Sair</Button>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
