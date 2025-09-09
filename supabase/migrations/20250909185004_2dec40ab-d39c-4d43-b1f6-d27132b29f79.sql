-- Remove a constraint existente
ALTER TABLE public.pendencies 
DROP CONSTRAINT IF EXISTS pendencies_order_id_fkey;

-- Adiciona a constraint com ON DELETE CASCADE
ALTER TABLE public.pendencies 
ADD CONSTRAINT pendencies_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES public.orders(id) 
ON DELETE CASCADE;