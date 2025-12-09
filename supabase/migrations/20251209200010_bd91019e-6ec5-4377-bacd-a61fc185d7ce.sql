-- Add RLS policies to allow users to view their own KPIs

-- Policy for collaborator_kpis: Users can view their own KPIs
CREATE POLICY "Users can view own KPIs" 
ON public.collaborator_kpis 
FOR SELECT 
USING (user_id = auth.uid());

-- Policy for collaborator_kpi_history: Users can view their own KPI history
CREATE POLICY "Users can view own KPI history"
ON public.collaborator_kpi_history 
FOR SELECT
USING (
  kpi_id IN (
    SELECT id FROM public.collaborator_kpis WHERE user_id = auth.uid()
  )
);