import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TrialUsage = {
  customer_id: string;
  docs_used: number;
  docs_limit: number;
  pages_used: number;
  pages_limit: number;
  pages_per_doc_limit: number;
  single_doc_pages_limit: number;
  remaining: number;
  remaining_docs: number;
  remaining_pages: number;
  blocked: boolean;
};

export function useTrialUsage(customerId: string | null | undefined) {
  const [usage, setUsage] = useState<TrialUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!customerId) {
      setUsage(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_trial_usage", { p_customer_id: customerId });
    if (!error && data) setUsage(data as unknown as TrialUsage);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { usage, loading, refresh };
}
