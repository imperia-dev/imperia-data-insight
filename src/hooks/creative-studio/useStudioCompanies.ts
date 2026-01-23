import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StudioCompany = {
  id: string;
  name: string;
  description: string | null;
};

export function useStudioCompanies() {
  return useQuery({
    queryKey: ["creative-studio", "companies"],
    queryFn: async () => {
      const { data: memberships, error: membershipError } = await supabase
        .from("company_memberships")
        .select("company_id")
        .order("created_at", { ascending: false });

      if (membershipError) throw membershipError;

      const companyIds = Array.from(new Set((memberships || []).map((m: any) => m.company_id)));
      if (companyIds.length === 0) return [] as StudioCompany[];

      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("id,name,description")
        .in("id", companyIds)
        .order("created_at", { ascending: false });

      if (companyError) throw companyError;
      return (companies || []) as StudioCompany[];
    },
  });
}
