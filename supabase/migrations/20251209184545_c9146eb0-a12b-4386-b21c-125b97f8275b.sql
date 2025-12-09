
-- Add manual_value column for KPIs that don't have automatic calculation
ALTER TABLE public.collaborator_kpis
ADD COLUMN manual_value numeric DEFAULT NULL;

-- Add is_manual flag to indicate if KPI uses manual value
ALTER TABLE public.collaborator_kpis
ADD COLUMN is_manual boolean DEFAULT false;

-- Update the revision KPI to be manual
UPDATE public.collaborator_kpis
SET is_manual = true, calculation_type = 'manual'
WHERE kpi_name = 'revision_percentage' 
  AND user_id = '20ff513b-2d5a-4ee5-8ee0-26045f01ce55';
