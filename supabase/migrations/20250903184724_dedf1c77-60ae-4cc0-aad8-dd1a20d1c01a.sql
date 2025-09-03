-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  document_count INTEGER NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
-- Admin and master can view all orders
CREATE POLICY "Admin and master can view all orders" 
ON public.orders 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['master'::user_role, 'admin'::user_role]));

-- Operation can view unassigned orders or their own orders
CREATE POLICY "Operation can view available and own orders" 
ON public.orders 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'operation'::user_role 
  AND (assigned_to IS NULL OR assigned_to = auth.uid())
);

-- Admin can create orders
CREATE POLICY "Admin can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Admin and master can update orders
CREATE POLICY "Admin and master can update orders" 
ON public.orders 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['master'::user_role, 'admin'::user_role]));

-- Operation can update orders assigned to them
CREATE POLICY "Operation can update own orders" 
ON public.orders 
FOR UPDATE 
USING (
  get_user_role(auth.uid()) = 'operation'::user_role 
  AND assigned_to = auth.uid()
);

-- Master can delete orders
CREATE POLICY "Master can delete orders" 
ON public.orders 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'master'::user_role);

-- Add trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_orders_assigned_to ON public.orders(assigned_to);
CREATE INDEX idx_orders_deadline ON public.orders(deadline);
CREATE INDEX idx_orders_delivered_at ON public.orders(delivered_at);