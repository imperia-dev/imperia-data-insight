-- Deletar usuário com email caiocaldeira2017@gmail.com
-- Primeiro, deletar os registros relacionados na tabela user_roles (se existirem)
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'caiocaldeira2017@gmail.com'
);

-- Deletar o usuário da tabela auth.users
DELETE FROM auth.users 
WHERE email = 'caiocaldeira2017@gmail.com';