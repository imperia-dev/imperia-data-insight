-- Primeiro adicionar a constraint única
ALTER TABLE public.registration_requests 
ADD CONSTRAINT registration_requests_user_id_key UNIQUE (user_id);

-- Agora sincronizar registration_requests com profiles existentes
INSERT INTO public.registration_requests (user_id, status, requested_at)
SELECT 
  id as user_id,
  approval_status as status,
  created_at as requested_at
FROM public.profiles
WHERE approval_status = 'pending'
ON CONFLICT (user_id) DO UPDATE SET
  status = EXCLUDED.status;