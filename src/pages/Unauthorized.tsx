import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, Home } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { userRole } = useRoleAccess('/');
  const { sidebarOffsetClass } = useSidebarOffset();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole || 'operation'} />
      <div 
        className={`min-h-screen flex items-center justify-center p-4 transition-all duration-300 ${sidebarOffsetClass}`}
      >
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <ShieldX className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Acesso Negado</CardTitle>
            <CardDescription className="text-base">
              Você não possui permissão para acessar esta página
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Esta página está restrita a usuários com as permissões adequadas. 
              Se você acredita que deveria ter acesso, entre em contato com o administrador do sistema.
            </p>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}