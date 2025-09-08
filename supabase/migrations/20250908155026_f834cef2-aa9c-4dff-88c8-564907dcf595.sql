-- Primeiro atualiza TODOS os registros de 'Freelance' para 'PJ'
UPDATE service_provider_costs 
SET type = 'PJ' 
WHERE type = 'Freelance';

-- Agora remove a constraint de tipo
ALTER TABLE service_provider_costs 
DROP CONSTRAINT service_provider_costs_type_check;

-- Cria nova constraint com os valores corretos
ALTER TABLE service_provider_costs 
ADD CONSTRAINT service_provider_costs_type_check 
CHECK (type IN ('CLT', 'PJ'));