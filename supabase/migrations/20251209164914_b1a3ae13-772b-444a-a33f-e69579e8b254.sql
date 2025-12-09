-- Insert KPIs for Hellem Coelho
INSERT INTO public.collaborator_kpis (user_id, kpi_name, kpi_label, target_value, target_operator, unit, calculation_type, display_order)
VALUES 
  ('20ff513b-2d5a-4ee5-8ee0-26045f01ce55', 'orders_percentage', 'Pedidos do Mês', 15, 'gte', '%', 'orders_percentage', 1),
  ('20ff513b-2d5a-4ee5-8ee0-26045f01ce55', 'revision_percentage', 'Revisão da Tradução', 30, 'gte', '%', 'revision_percentage', 2);