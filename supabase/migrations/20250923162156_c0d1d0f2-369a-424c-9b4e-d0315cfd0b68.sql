-- Add service_order_link column to orders table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'service_order_link'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN service_order_link TEXT;
    COMMENT ON COLUMN public.orders.service_order_link IS 'Link do pedido no sistema de operação retornado pelo n8n webhook';
  END IF;
END $$;