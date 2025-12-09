-- Insert KPIs for Alex (alexluiz13499@gmail.com)
INSERT INTO public.collaborator_kpis (
  user_id,
  kpi_name,
  kpi_label,
  calculation_type,
  target_value,
  target_operator,
  unit,
  is_active,
  display_order
) VALUES 
-- KPI 01: Taxa de Erros - até 10% de erros em relação ao total de documentos
(
  'cb21c2b0-57cb-4af7-beb9-dc7c8b30212e',
  'taxa_erro',
  'Taxa de Erros',
  'error_rate',
  10,
  'lte',
  '%',
  true,
  1
),
-- KPI 02: Taxa de Atendimento da Demanda - até 10% da demanda total
(
  'cb21c2b0-57cb-4af7-beb9-dc7c8b30212e',
  'atendimento_demanda',
  'Atendimento da Demanda',
  'demand_rate',
  10,
  'lte',
  '%',
  true,
  2
);