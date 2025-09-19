import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, CheckCircle, XCircle, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [previousStatus, setPreviousStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  useEffect(() => {
    checkApprovalStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkApprovalStatus, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const checkApprovalStatus = async () => {
    if (!user) return;
    
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('approval_status, rejection_reason')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const currentStatus = data.approval_status;
        
        // Only show toast if status changed from pending to approved
        if (currentStatus === 'approved' && previousStatus === 'pending') {
          toast({
            title: "Cadastro Aprovado!",
            description: "Seu cadastro foi aprovado. Redirecionando...",
          });
          
          // Wait a bit before redirecting
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else if (currentStatus === 'approved' && previousStatus !== 'pending') {
          // If already approved, just redirect without showing toast
          navigate('/');
        }
        
        setPreviousStatus(currentStatus);
        setApprovalStatus(currentStatus);
        setRejectionReason(data.rejection_reason);
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getStatusIcon = () => {
    switch (approvalStatus) {
      case 'pending':
        return <Clock className="h-16 w-16 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-16 w-16 text-destructive" />;
    }
  };

  const getStatusBadge = () => {
    switch (approvalStatus) {
      case 'pending':
        return <Badge variant="secondary" className="text-lg px-3 py-1">Aguardando Aprovação</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-lg px-3 py-1 bg-green-500">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-lg px-3 py-1">Rejeitado</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl">
            {approvalStatus === 'pending' && 'Cadastro em Análise'}
            {approvalStatus === 'approved' && 'Cadastro Aprovado!'}
            {approvalStatus === 'rejected' && 'Cadastro Rejeitado'}
          </CardTitle>
          <div className="mt-2">
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {approvalStatus === 'pending' && (
            <>
              <CardDescription className="text-center">
                Olá <strong>{user?.email}</strong>! Seu cadastro está sendo analisado pela nossa equipe. 
                Este processo pode levar alguns minutos.
              </CardDescription>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  ⏱️ Verificamos automaticamente o status a cada 30 segundos
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  📧 Você receberá um email quando seu cadastro for processado
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={checkApprovalStatus}
                  disabled={checking}
                >
                  {checking ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Verificar Agora
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </>
          )}
          
          {approvalStatus === 'approved' && (
            <>
              <CardDescription className="text-center">
                Parabéns! Seu cadastro foi aprovado com sucesso. 
                Você será redirecionado automaticamente...
              </CardDescription>
              <Button 
                className="w-full" 
                onClick={() => navigate('/')}
              >
                Acessar Sistema
              </Button>
            </>
          )}
          
          {approvalStatus === 'rejected' && (
            <>
              <CardDescription className="text-center">
                Infelizmente, seu cadastro foi rejeitado.
              </CardDescription>
              {rejectionReason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-destructive mb-1">Motivo:</p>
                  <p className="text-sm">{rejectionReason}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center">
                Se você acredita que houve um erro, entre em contato com o suporte.
              </p>
              <Button 
                variant="outline"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}