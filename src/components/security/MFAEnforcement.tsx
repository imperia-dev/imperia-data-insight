import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMFA } from "@/hooks/useMFA";
import { MFAEnrollment } from "@/components/mfa/MFAEnrollment";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

/**
 * MFAEnforcement: Força usuários com roles sensíveis (owner/master) a configurar MFA
 * Implementa segurança adicional conforme política de autenticação
 */
export function MFAEnforcement() {
  const { user } = useAuth();
  const { mfaEnabled, loading } = useMFA();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('role', { ascending: true })
          .limit(1)
          .single();

        if (error) throw error;
        
        setUserRole(data?.role || null);
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  useEffect(() => {
    // Verificar se usuário precisa de MFA
    if (!loading && !roleLoading && user && userRole) {
      const requiresMFA = ['owner', 'master'].includes(userRole);
      
      if (requiresMFA && !mfaEnabled) {
        setShowEnrollment(true);
      }
    }
  }, [loading, roleLoading, user, userRole, mfaEnabled]);

  const handleEnrollmentComplete = () => {
    setShowEnrollment(false);
  };

  if (loading || roleLoading) {
    return null;
  }

  return (
    <Dialog open={showEnrollment} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Autenticação de Dois Fatores Obrigatória
          </DialogTitle>
          <DialogDescription>
            Por questões de segurança, usuários com perfil {userRole === 'owner' ? 'Proprietário' : 'Master'} devem configurar a autenticação de dois fatores (MFA).
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Esta é uma medida de segurança obrigatória. Você não poderá acessar o sistema sem configurar o MFA.
          </AlertDescription>
        </Alert>

        <MFAEnrollment 
          onComplete={handleEnrollmentComplete}
          onCancel={() => {}} 
        />
      </DialogContent>
    </Dialog>
  );
}
