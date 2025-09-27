-- Inserir novas contas contábeis no plano de contas com valores corretos de enum

-- Folha e Pessoas (Despesas Fixas)
INSERT INTO public.chart_of_accounts (code, name, dre_section) VALUES
('5.2.1.1', 'Salários CLT', 'FIXED_EXP'),
('5.2.1.2', 'Pró-labore / PJ', 'FIXED_EXP'),
('5.2.1.3', 'Encargos e Benefícios', 'FIXED_EXP'),
('5.2.1.4', 'Bônus e KPI Variáveis', 'VAR_EXP');

-- Tecnologia (Despesas Fixas e Variáveis)
INSERT INTO public.chart_of_accounts (code, name, dre_section) VALUES
('5.2.5.1', 'APIs (ex: OpenAI)', 'VAR_EXP'),
('5.2.5.2', 'Hospedagem / Infraestrutura Cloud', 'FIXED_EXP'),
('5.2.5.3', 'Ferramentas de Produtividade (ex: Notion, Google Workspace)', 'FIXED_EXP');

-- Consultoria & Profissionais (Despesas Fixas)
INSERT INTO public.chart_of_accounts (code, name, dre_section) VALUES
('5.2.8', 'Consultoria Jurídica', 'FIXED_EXP'),
('5.2.9', 'Consultoria Financeira / Controladoria', 'FIXED_EXP');

-- Despesas Gerais (Despesas Variáveis)
INSERT INTO public.chart_of_accounts (code, name, dre_section) VALUES
('5.2.10', 'Viagens e Deslocamentos', 'VAR_EXP'),
('5.2.11', 'Refeições e Representação', 'VAR_EXP'),
('5.2.12', 'Treinamentos e Cursos', 'VAR_EXP');

-- Unit Economics / Estratégicos (métricas avançadas - Despesas Variáveis)
INSERT INTO public.chart_of_accounts (code, name, dre_section, is_cac) VALUES
('9.1', 'CAC (Custo de Aquisição de Cliente)', 'VAR_EXP', true),
('9.2', 'LTV (Lifetime Value)', 'REVENUE', false),
('9.3', 'Churn (Cancelamentos)', 'VAR_EXP', false);