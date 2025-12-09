-- Update KPI Atendimento da Demanda para meta mínima de 10% (gte)
UPDATE public.collaborator_kpis 
SET target_operator = 'gte'
WHERE user_id = 'cb21c2b0-57cb-4af7-beb9-dc7c8b30212e' 
  AND kpi_name = 'atendimento_demanda';