import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading: authLoading } = useAuth();
  const location = useLocation();
  const { hasAccess, loading: roleLoading } = useRoleAccess(location.pathname);

  // Show loading while checking auth and role
  if (authLoading || roleLoading) {
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

  // Wait for role check to complete before deciding on access
  // If still loading role, show loader instead of redirecting
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