import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteWithApprovalProps {
  children: React.ReactNode;
}

export function ProtectedRouteWithApproval({ children }: ProtectedRouteWithApprovalProps) {
  const { session, loading: authLoading } = useAuth();
  const location = useLocation();
  const { hasAccess, loading: roleLoading } = useRoleAccess(location.pathname);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!session?.user) {
        setCheckingApproval(false);
        return;
      }

      try {
        // Check if user has customer role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'customer')
          .maybeSingle();

        // Customers don't need approval - they are pre-approved
        if (roleData?.role === 'customer') {
          setApprovalStatus('approved');
          setCheckingApproval(false);
          return;
        }

        // For non-customer users, check approval status in profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error checking approval status:', error);
          setApprovalStatus('pending');
        } else {
          setApprovalStatus(data?.approval_status || 'pending');
        }
      } catch (error) {
        console.error('Error checking approval status:', error);
        setApprovalStatus('pending');
      } finally {
        setCheckingApproval(false);
      }
    };

    checkApprovalStatus();
  }, [session]);

  // Show loading while checking auth, role, and approval
  if (authLoading || roleLoading || checkingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no session, redirect to auth
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // If user is not approved, redirect to pending approval page
  if (approvalStatus !== 'approved' && location.pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />;
  }

  // If user is approved but trying to access pending approval page, redirect to home
  if (approvalStatus === 'approved' && location.pathname === '/pending-approval') {
    return <Navigate to="/" replace />;
  }

  // Only check role access if user is approved
  if (approvalStatus === 'approved' && !hasAccess && !roleLoading) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}