import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { policySchema, receiptSchema } from "@/lib/confidentiality";

export function useConfidentiality(userId?: string, enabled = true) {
  return useQuery({
    queryKey: ["confidentiality", userId ?? "public"],
    enabled,
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.from("confidentiality_policies")
        .select("id,version,title,body,body_sha256,published_at")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false }).order("created_at", { ascending: false })
        .order("version", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Compromisso indisponível");
      const policy = policySchema.parse(data);
      if (!userId) return { policy, receipt: null };
      const { data: receipt, error: receiptError } = await supabase.from("confidentiality_acceptances")
        .select("id,user_id,policy_id,policy_sha256,accepted_at,account_email,declaration,user_agent,authentication_method")
        .eq("user_id", userId).eq("policy_id", policy.id).maybeSingle();
      if (receiptError) throw receiptError;
      return { policy, receipt: receipt ? receiptSchema.parse(receipt) : null };
    },
  });
}