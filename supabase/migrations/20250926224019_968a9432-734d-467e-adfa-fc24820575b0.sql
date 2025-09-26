-- Verificar se o registro existe
SELECT id, description, amount_original, created_at, closing_protocol_id
FROM public.expenses 
WHERE id = '4642a5e3-7571-4d4e-b55e-09fcdf2eaf93';

-- Deletar o registro correto
DELETE FROM public.expenses 
WHERE id = '4642a5e3-7571-4d4e-b55e-09fcdf2eaf93';

-- Confirmar que foi deletado
SELECT COUNT(*) as remaining_count 
FROM public.expenses 
WHERE id = '4642a5e3-7571-4d4e-b55e-09fcdf2eaf93';