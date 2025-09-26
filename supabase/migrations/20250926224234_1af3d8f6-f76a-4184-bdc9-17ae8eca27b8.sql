-- Verificar se o registro existe
SELECT id, description, amount_original, created_at, closing_protocol_id
FROM public.expenses 
WHERE id = 'c91ef443-6e9a-4439-8f3b-9fc41ad192c9';

-- Deletar o registro
DELETE FROM public.expenses 
WHERE id = 'c91ef443-6e9a-4439-8f3b-9fc41ad192c9';

-- Confirmar que foi deletado
SELECT COUNT(*) as remaining_count 
FROM public.expenses 
WHERE id = 'c91ef443-6e9a-4439-8f3b-9fc41ad192c9';