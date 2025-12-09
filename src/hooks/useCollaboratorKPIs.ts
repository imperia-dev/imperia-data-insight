import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface CollaboratorKPI {
  id: string;
  user_id: string;
  kpi_name: string;
  kpi_label: string;
  target_value: number;
  target_operator: 'lte' | 'gte' | 'eq';
  unit: string;
  calculation_type: string;
  display_order: number;
  manual_value: number | null;
  is_manual: boolean;
}

interface CollaboratorWithKPIs {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface KPICalculationResult {
  kpi: CollaboratorKPI;
  actualValue: number;
  targetValue: number;
  isWithinTarget: boolean;
  totalBase: number;
  totalCount: number;
  percentOfTarget: number;
}

// Fetch collaborators who have KPIs configured
export function useCollaboratorsWithKPIs() {
  return useQuery({
    queryKey: ['collaborators-with-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborator_kpis')
        .select('user_id')
        .eq('is_active', true);

      if (error) throw error;

      const uniqueUserIds = [...new Set(data.map(k => k.user_id))];
      
      if (uniqueUserIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', uniqueUserIds);

      if (profilesError) throw profilesError;

      return profiles as CollaboratorWithKPIs[];
    }
  });
}

// Fetch KPIs for a specific collaborator
export function useCollaboratorKPIs(userId: string | null) {
  return useQuery({
    queryKey: ['collaborator-kpis', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('collaborator_kpis')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as CollaboratorKPI[];
    },
    enabled: !!userId
  });
}

// Calculate KPI values for a specific period
export function useCalculatedKPIs(
  userId: string | null,
  kpis: CollaboratorKPI[],
  periodStart: Date,
  periodEnd: Date
) {
  return useQuery({
    queryKey: ['calculated-kpis', userId, kpis.map(k => k.id), format(periodStart, 'yyyy-MM-dd'), format(periodEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!userId || kpis.length === 0) return [];

      const results: KPICalculationResult[] = [];

      for (const kpi of kpis) {
        const result = await calculateKPI(kpi, userId, periodStart, periodEnd);
        results.push(result);
      }

      return results;
    },
    enabled: !!userId && kpis.length > 0
  });
}

async function calculateKPI(
  kpi: CollaboratorKPI,
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<KPICalculationResult> {
  const startStr = format(periodStart, 'yyyy-MM-dd');
  const endStr = format(periodEnd, 'yyyy-MM-dd');

  let totalBase = 0;
  let totalCount = 0;
  let actualValue = 0;

  // Get ALL orders with document_count in the period (based on attribution_date like Dashboard)
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, document_count')
    .gte('attribution_date', startStr)
    .lte('attribution_date', endStr + 'T23:59:59');

  const orderIds = allOrders?.map(o => o.id) || [];
  // Use total DOCUMENTS as base (not order count) - same as Dashboard Operação
  totalBase = allOrders?.reduce((sum, o) => sum + (o.document_count || 0), 0) || 0;

  if (orderIds.length === 0 || totalBase === 0) {
    return {
      kpi,
      actualValue: 0,
      targetValue: kpi.target_value,
      isWithinTarget: true,
      totalBase: 0,
      totalCount: 0,
      percentOfTarget: 0
    };
  }

  switch (kpi.calculation_type) {
    case 'error_rate':
      // Count pendencies with REAL errors (excludes 'nao_e_erro')
      const { count: errorsCount } = await supabase
        .from('pendencies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr + 'T23:59:59')
        .neq('error_type', 'nao_e_erro');

      totalCount = errorsCount || 0;
      // Calculate percentage based on total documents
      actualValue = totalBase > 0 ? (totalCount / totalBase) * 100 : 0;
      break;

    case 'not_error_rate':
      // Count pendencies marked as "not an error"
      const { count: notErrorCount } = await supabase
        .from('pendencies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr + 'T23:59:59')
        .eq('error_type', 'nao_e_erro');

      totalCount = notErrorCount || 0;
      // Calculate percentage based on total documents
      actualValue = totalBase > 0 ? (totalCount / totalBase) * 100 : 0;
      break;

    case 'orders_percentage': {
      // Count orders assigned to this user in the period
      const { count: userOrdersCount } = await (supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .gte('attribution_date', startStr)
        .lte('attribution_date', endStr + 'T23:59:59') as any);

      totalCount = userOrdersCount || 0;
      const totalOrdersCount = allOrders?.length || 0;
      actualValue = totalOrdersCount > 0 ? (totalCount / totalOrdersCount) * 100 : 0;
      break;
    }

    case 'manual':
      // For manual KPIs, use the manual_value set by the owner
      actualValue = kpi.manual_value || 0;
      totalCount = 0;
      break;

    default:
      break;
  }

  const isWithinTarget = checkTarget(actualValue, kpi.target_value, kpi.target_operator);
  const percentOfTarget = kpi.target_value > 0 ? (actualValue / kpi.target_value) * 100 : 0;

  return {
    kpi,
    actualValue,
    targetValue: kpi.target_value,
    isWithinTarget,
    totalBase,
    totalCount,
    percentOfTarget
  };
}

function checkTarget(actual: number, target: number, operator: string): boolean {
  switch (operator) {
    case 'lte':
      return actual <= target;
    case 'gte':
      return actual >= target;
    case 'eq':
      return actual === target;
    default:
      return false;
  }
}

// Fetch historical KPI data for charts
export function useKPIHistory(userId: string | null, months: number = 6) {
  return useQuery({
    queryKey: ['kpi-history', userId, months],
    queryFn: async () => {
      if (!userId) return [];

      // Get KPIs for this user
      const { data: kpis, error: kpisError } = await supabase
        .from('collaborator_kpis')
        .select('id, kpi_name, kpi_label')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (kpisError) throw kpisError;
      if (!kpis || kpis.length === 0) return [];

      // Get history for these KPIs
      const { data: history, error: historyError } = await supabase
        .from('collaborator_kpi_history')
        .select('*')
        .in('kpi_id', kpis.map(k => k.id))
        .order('period_start', { ascending: true });

      if (historyError) throw historyError;

      return history?.map(h => ({
        ...h,
        kpi: kpis.find(k => k.id === h.kpi_id)
      })) || [];
    },
    enabled: !!userId
  });
}
