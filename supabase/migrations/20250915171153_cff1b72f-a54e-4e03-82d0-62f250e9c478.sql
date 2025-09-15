-- Criar sistema de backup diário

-- 1. Criar tabela para logs de backup
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_date DATE NOT NULL,
  backup_type TEXT CHECK (backup_type IN ('daily', 'weekly', 'monthly', 'manual')) DEFAULT 'daily',
  status TEXT CHECK (status IN ('success', 'failed', 'in_progress')) DEFAULT 'in_progress',
  size_mb DECIMAL,
  duration_seconds INTEGER,
  tables_backed_up INTEGER,
  storage_location TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- 2. Habilitar RLS
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso (apenas owner e master podem ver/gerenciar)
CREATE POLICY "Owner and master can manage backup logs" 
ON public.backup_logs 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

-- 4. Criar índices para performance
CREATE INDEX idx_backup_logs_date ON public.backup_logs(backup_date DESC);
CREATE INDEX idx_backup_logs_status ON public.backup_logs(status);

-- 5. Criar bucket de storage para backups
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de storage para backups
CREATE POLICY "Only owner can manage backups" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'backups' AND 
  get_user_role(auth.uid()) = 'owner'::user_role
);

-- 7. Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 8. Função para limpar backups antigos (retenção de 30 dias para diários)
CREATE OR REPLACE FUNCTION public.cleanup_old_backups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Marcar como deletados backups diários com mais de 30 dias
  UPDATE public.backup_logs
  SET status = 'deleted',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{deleted_at}',
        to_jsonb(now())
      )
  WHERE backup_type = 'daily'
    AND backup_date < CURRENT_DATE - INTERVAL '30 days'
    AND status = 'success';
    
  -- Backups semanais: manter por 3 meses
  UPDATE public.backup_logs
  SET status = 'deleted',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{deleted_at}',
        to_jsonb(now())
      )
  WHERE backup_type = 'weekly'
    AND backup_date < CURRENT_DATE - INTERVAL '3 months'
    AND status = 'success';
    
  -- Backups mensais: manter por 1 ano
  UPDATE public.backup_logs
  SET status = 'deleted',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{deleted_at}',
        to_jsonb(now())
      )
  WHERE backup_type = 'monthly'
    AND backup_date < CURRENT_DATE - INTERVAL '1 year'
    AND status = 'success';
END;
$function$;

-- 9. Criar função para obter estatísticas de backup
CREATE OR REPLACE FUNCTION public.get_backup_stats()
RETURNS TABLE (
  total_backups BIGINT,
  successful_backups BIGINT,
  failed_backups BIGINT,
  total_size_gb DECIMAL,
  avg_duration_minutes DECIMAL,
  last_backup_date DATE,
  last_successful_backup DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_backups,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_backups,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_backups,
    ROUND(COALESCE(SUM(size_mb) / 1024, 0), 2) as total_size_gb,
    ROUND(COALESCE(AVG(duration_seconds) / 60, 0), 2) as avg_duration_minutes,
    MAX(backup_date) as last_backup_date,
    MAX(backup_date) FILTER (WHERE status = 'success') as last_successful_backup
  FROM public.backup_logs
  WHERE status != 'deleted';
END;
$function$;

-- 10. Comentários para documentação
COMMENT ON TABLE public.backup_logs IS 'Registro de todos os backups realizados no sistema';
COMMENT ON FUNCTION public.cleanup_old_backups IS 'Remove backups antigos de acordo com a política de retenção';
COMMENT ON FUNCTION public.get_backup_stats IS 'Retorna estatísticas consolidadas dos backups';