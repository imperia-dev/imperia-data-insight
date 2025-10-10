import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useMFARequired } from "@/hooks/useMFARequired";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading: authLoading } = useAuth();
  const location = useLocation();
  const { hasAccess, loading: roleLoading } = useRoleAccess(location.pathname);
  const { mfaRequired, mfaCompleted, loading: mfaLoading } = useMFARequired();

  // Show loading while checking auth, role, and MFA
  if (authLoading || roleLoading || mfaLoading) {
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

  // Check if MFA was completed (when required)
  if (mfaRequired && !mfaCompleted) {
    // Redirect to auth with state preservation
    return <Navigate to="/auth" state={{ requireMFA: true }} replace />;
  }

  // Wait for role check to complete before deciding on access
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect to unauthorized after role check is complete
  if (!hasAccess && !roleLoading) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}