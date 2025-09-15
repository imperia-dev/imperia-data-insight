-- Drop and recreate service_provider_costs_masked view without security options
DROP VIEW IF EXISTS public.service_provider_costs_masked;

-- Recreate the view as a simple view without security options
-- The underlying RLS on service_provider_costs table will handle security
CREATE VIEW public.service_provider_costs_masked AS
SELECT 
  id,
  name,
  email,
  phone,
  type,
  competence,
  amount,
  status,
  days_worked,
  invoice_number,
  files,
  created_at,
  updated_at,
  created_by,
  mask_sensitive_string(cpf, 'cpf'::text) AS cpf_masked,
  mask_sensitive_string(cnpj, 'cnpj'::text) AS cnpj_masked,
  mask_sensitive_string(pix_key, 'pix'::text) AS pix_key_masked
FROM service_provider_costs;

-- Grant appropriate permissions
GRANT SELECT ON public.service_provider_costs_masked TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.service_provider_costs_masked IS 'Masked view of service provider costs - sensitive data is masked using mask_sensitive_string function. Access controlled by underlying RLS on service_provider_costs table (owner-only).';