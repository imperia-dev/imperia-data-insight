-- Add service_provider_protocol_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN service_provider_protocol_id UUID REFERENCES public.service_provider_protocols(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_orders_protocol ON public.orders(service_provider_protocol_id);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.service_provider_protocol_id IS 'References the service provider protocol where this order was paid';