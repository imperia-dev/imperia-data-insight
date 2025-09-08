-- Primeiro, atualiza todos os registros existentes de 'Freelance' para 'PJ'
UPDATE service_provider_costs 
SET type = 'PJ' 
WHERE type = 'Freelance';

-- Agora remove a constraint antiga
ALTER TABLE service_provider_costs 
DROP CONSTRAINT IF EXISTS service_provider_costs_type_check;

-- Adiciona a nova constraint com 'PJ' ao invés de 'Freelance'
ALTER TABLE service_provider_costs 
ADD CONSTRAINT service_provider_costs_type_check 
CHECK (type IN ('CLT', 'PJ'));