import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export type TrialCustomer = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string | null;
  cpf_cnpj: string | null;
  status: "pending" | "approved" | "rejected" | "deactivated";
  rejection_reason: string | null;
};

export function useTrialCustomer() {
  const { user, loading: authLoading } = useAuth();
  const [customer, setCustomer] = useState<TrialCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("trial_customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      setCustomer((data as TrialCustomer) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return { customer, loading: loading || authLoading };
}

export function TrialPortalGuard({ children, requireApproved = true }: { children: React.ReactNode; requireApproved?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const { customer, loading } = useTrialCustomer();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || loading) return;
    if (!user) {
      navigate("/portal/login", { replace: true });
      return;
    }
    if (!customer) {
      navigate("/portal/cadastro", { replace: true });
      return;
    }
    if (requireApproved && customer.status !== "approved") {
      navigate("/portal/aguardando", { replace: true });
    }
  }, [user, customer, authLoading, loading, requireApproved, navigate]);

  if (authLoading || loading || !user || !customer || (requireApproved && customer.status !== "approved")) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
