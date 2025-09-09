-- Atualizar todos os horários de created_at das pendências para 12:00:00
UPDATE public.pendencies
SET created_at = date_trunc('day', created_at) + interval '12 hours'
WHERE created_at IS NOT NULL;

-- Atualizar também updated_at para manter consistência
UPDATE public.pendencies
SET updated_at = date_trunc('day', updated_at) + interval '12 hours'
WHERE updated_at IS NOT NULL;