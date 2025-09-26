-- Check all constraints and triggers on the expenses table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.expenses'::regclass;

-- Also check triggers
SELECT 
    tgname AS trigger_name,
    proname AS function_name,
    tgtype AS trigger_type
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'public.expenses'::regclass
    AND NOT tgisinternal;