import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toZonedTime } from "date-fns-tz";

interface UserLimit {
  concurrent_order_limit: number;
  daily_limit: number;
}

interface DemandLimitsResult {
  userLimit: UserLimit | null;
  documentsToday: number;
  currentOrderCount: number;
  canTakeMoreOrders: boolean;
  dailyLimitReached: boolean;
  isLoading: boolean;
  validateOrderTake: (orderDocumentCount: number) => { valid: boolean; error?: string };
}

/**
 * Hook para gerenciar limites de demanda de documentos
 * - Limite diário: total de documentos por dia
 * - Limite simultâneo: pedidos em andamento ao mesmo tempo
 */
export function useDemandLimits(inProgressOrders: any[] | undefined): DemandLimitsResult {
  const { user } = useAuth();

  // Fetch user's limits (daily + concurrent)
  const { data: userLimit, isLoading: isLoadingLimit } = useQuery({
    queryKey: ["user-document-limits", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_document_limits")
        .select("concurrent_order_limit, daily_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user limits:", error);
      }

      // Return defaults if not found
      return data || { concurrent_order_limit: 2, daily_limit: 10 };
    },
    enabled: !!user?.id,
  });

  // Get today's start in São Paulo timezone
  const getTodayStart = () => {
    const now = new Date();
    const saoPauloNow = toZonedTime(now, "America/Sao_Paulo");
    saoPauloNow.setHours(0, 0, 0, 0);
    return saoPauloNow.toISOString();
  };

  // Fetch count of documents assigned to user today
  const { data: documentsToday = 0, isLoading: isLoadingToday } = useQuery({
    queryKey: ["today-document-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const todayStart = getTodayStart();

      const { data, error } = await supabase
        .from("orders")
        .select("document_count")
        .eq("assigned_to", user.id)
        .gte("assigned_at", todayStart);

      if (error) {
        console.error("Error fetching today's document count:", error);
        return 0;
      }

      // Sum all document_count values
      return data?.reduce((sum, order) => sum + (order.document_count || 0), 0) || 0;
    },
    enabled: !!user?.id,
    // Refetch every 30 seconds to keep count updated
    refetchInterval: 30000,
  });

  const currentOrderCount = inProgressOrders?.length || 0;
  const maxConcurrentOrders = userLimit?.concurrent_order_limit || 2;
  const dailyLimit = userLimit?.daily_limit || 10;

  const canTakeMoreOrders = currentOrderCount < maxConcurrentOrders;
  const dailyLimitReached = documentsToday >= dailyLimit;

  /**
   * Validates if user can take an order with the specified document count
   */
  const validateOrderTake = (orderDocumentCount: number): { valid: boolean; error?: string } => {
    // Check concurrent limit
    if (currentOrderCount >= maxConcurrentOrders) {
      return {
        valid: false,
        error: `Você já possui ${currentOrderCount} pedido(s) em andamento. Finalize um pedido antes de pegar outro.`,
      };
    }

    // Check daily limit
    const projectedTotal = documentsToday + orderDocumentCount;
    if (projectedTotal > dailyLimit) {
      return {
        valid: false,
        error: `Você já processou ${documentsToday} documento(s) hoje. Este pedido tem ${orderDocumentCount} documento(s) e ultrapassaria seu limite diário de ${dailyLimit}.`,
      };
    }

    return { valid: true };
  };

  return {
    userLimit,
    documentsToday,
    currentOrderCount,
    canTakeMoreOrders: canTakeMoreOrders && !dailyLimitReached,
    dailyLimitReached,
    isLoading: isLoadingLimit || isLoadingToday,
    validateOrderTake,
  };
}
