import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Loader2 } from "lucide-react";
import Dashboard from "@/pages/Dashboard";

export function HomePage() {
  const { userRole, loading } = useRoleAccess("/");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("HomePage - loading:", loading, "userRole:", userRole);
    
    if (!loading && userRole) {
      // Redirect based on user role to their specific dashboard
      switch (userRole) {
        case "financeiro":
          console.log("Redirecting to financeiro dashboard");
          navigate("/dashboard-controle-financeiro", { replace: true });
          break;
        case "customer":
          console.log("Redirecting to customer dashboard");
          navigate("/customer-dashboard", { replace: true });
          break;
        case "owner":
        case "master":
        case "operation":
        case "translator":
          console.log("Redirecting to announcements");
          navigate("/announcements", { replace: true });
          break;
        // admin - stay on main dashboard
        default:
          console.log("Staying on main dashboard");
          break;
      }
    }
  }, [userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render Dashboard if user should be redirected
  if (userRole && ["financeiro", "customer", "owner", "master", "operation", "translator"].includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render Dashboard for roles with access to "/"
  return <Dashboard />;
}
