-- Remove a constraint com CASCADE
ALTER TABLE public.pendencies 
DROP CONSTRAINT IF EXISTS pendencies_order_id_fkey;

-- Adiciona a constraint de volta SEM ON DELETE CASCADE (comportamento padrão mais seguro)
ALTER TABLE public.pendencies 
ADD CONSTRAINT pendencies_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES public.orders(id);