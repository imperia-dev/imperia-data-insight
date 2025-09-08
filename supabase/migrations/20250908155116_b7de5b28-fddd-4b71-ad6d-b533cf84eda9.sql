-- Atualiza todos os registros de 'Freelance' para 'PJ'
UPDATE service_provider_costs 
SET type = 'PJ' 
WHERE type = 'Freelance';

-- Adiciona a nova constraint com os valores corretos
ALTER TABLE service_provider_costs 
ADD CONSTRAINT service_provider_costs_type_check 
CHECK (type IN ('CLT', 'PJ'));