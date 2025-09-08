-- Remove apenas a constraint de tipo (não todas)
ALTER TABLE service_provider_costs 
DROP CONSTRAINT service_provider_costs_type_check;

-- Cria a nova constraint permitindo 'CLT' e 'PJ'
ALTER TABLE service_provider_costs 
ADD CONSTRAINT service_provider_costs_type_check 
CHECK (type IN ('CLT', 'PJ'));