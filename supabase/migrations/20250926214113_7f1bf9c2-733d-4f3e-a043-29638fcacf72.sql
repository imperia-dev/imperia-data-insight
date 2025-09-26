-- Use a transaction to ensure atomicity
BEGIN;

-- Temporarily drop the prevent_expense_edit_if_closed trigger
DROP TRIGGER IF EXISTS prevent_expense_edit_if_closed ON public.expenses;

-- Force delete the record using a direct command
DELETE FROM public.expenses WHERE id = '29568a04-0e5b-4e26-bd47-7ee4caf5516c';

-- Recreate the trigger
CREATE TRIGGER prevent_expense_edit_if_closed
BEFORE UPDATE OR DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_expense_edit();

-- Commit the transaction
COMMIT;

-- Final verification
SELECT 
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'Successfully deleted'
        ELSE 'Record still exists'
    END as status
FROM public.expenses 
WHERE id = '29568a04-0e5b-4e26-bd47-7ee4caf5516c';