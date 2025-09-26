-- First, check if the record exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM public.expenses WHERE id = '29568a04-0e5b-4e26-bd47-7ee4caf5516c') THEN
        -- Delete the record with CASCADE to handle any foreign key dependencies
        DELETE FROM public.expenses WHERE id = '29568a04-0e5b-4e26-bd47-7ee4caf5516c';
        RAISE NOTICE 'Record deleted successfully';
    ELSE
        RAISE NOTICE 'Record not found';
    END IF;
END $$;

-- Verify deletion
SELECT COUNT(*) as remaining_count FROM public.expenses WHERE id = '29568a04-0e5b-4e26-bd47-7ee4caf5516c';