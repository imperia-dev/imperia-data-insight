-- Remove a constraint completamente
ALTER TABLE service_provider_costs 
DROP CONSTRAINT IF EXISTS service_provider_costs_type_check;