import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Loader2 } from "lucide-react";
import Dashboard from "@/pages/Dashboard";

export function HomePage() {
  const { userRole, loading } = useRoleAccess("/");
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && userRole) {
      // Redirect based on user role to their specific dashboard
      switch (userRole) {
        case "financeiro":
          navigate("/contas-a-pagar", { replace: true });
          break;
        case "customer":
          navigate("/customer-dashboard", { replace: true });
          break;
        case "translator":
        case "operation":
          navigate("/my-orders", { replace: true });
          break;
        // owner, master, admin - stay on main dashboard
        default:
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

  // Render Dashboard for roles with access to "/"
  return <Dashboard />;
}
