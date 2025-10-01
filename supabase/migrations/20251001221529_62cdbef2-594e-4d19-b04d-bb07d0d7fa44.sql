-- Create translation_orders table
CREATE TABLE public.translation_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id TEXT NOT NULL UNIQUE,
  pedido_status TEXT NOT NULL,
  pedido_data TIMESTAMP WITH TIME ZONE NOT NULL,
  valor_pedido NUMERIC(10,2) NOT NULL,
  valor_pago NUMERIC(10,2) NOT NULL,
  status_pagamento TEXT NOT NULL,
  review_id TEXT,
  review_name TEXT,
  review_email TEXT,
  quantidade_documentos INTEGER DEFAULT 0,
  valor_total_pago_servico NUMERIC(10,2),
  sync_status TEXT DEFAULT 'success',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.translation_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Owner, master and admin can view translation orders" 
ON public.translation_orders 
FOR SELECT 
USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

CREATE POLICY "Owner can manage translation orders" 
ON public.translation_orders 
FOR ALL 
USING (get_user_role(auth.uid()) = 'owner');

-- Create function to update timestamps
CREATE TRIGGER update_translation_orders_updated_at
BEFORE UPDATE ON public.translation_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_translation_orders_pedido_data ON public.translation_orders(pedido_data DESC);
CREATE INDEX idx_translation_orders_pedido_status ON public.translation_orders(pedido_status);
CREATE INDEX idx_translation_orders_review_name ON public.translation_orders(review_name);