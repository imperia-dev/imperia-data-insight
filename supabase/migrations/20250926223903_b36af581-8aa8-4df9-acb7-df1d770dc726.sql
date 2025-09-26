-- Tentar deletar com mais detalhes de erro
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar se o registro existe
    SELECT COUNT(*) INTO v_count FROM public.expenses WHERE id = '7f8e8e52-1fa8-42fe-a9f8-b2f97c4e0074';
    RAISE NOTICE 'Registros encontrados antes do DELETE: %', v_count;
    
    -- Tentar deletar
    DELETE FROM public.expenses WHERE id = '7f8e8e52-1fa8-42fe-a9f8-b2f97c4e0074';
    
    -- Verificar quantos registros foram deletados
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Registros deletados: %', v_count;
    
    -- Verificar se ainda existe
    SELECT COUNT(*) INTO v_count FROM public.expenses WHERE id = '7f8e8e52-1fa8-42fe-a9f8-b2f97c4e0074';
    RAISE NOTICE 'Registros encontrados após o DELETE: %', v_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao deletar: %', SQLERRM;
        RAISE;
END $$;

-- Verificar se o registro ainda existe
SELECT id, description, amount_original, created_at 
FROM public.expenses 
WHERE id = '7f8e8e52-1fa8-42fe-a9f8-b2f97c4e0074';