-- Temporarily disable RLS to delete the record
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

-- Delete the specific record
DELETE FROM public.expenses WHERE id = '29568a04-0e5b-4e26-bd47-7ee4caf5516c';

-- Re-enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Verify the record is deleted
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.expenses WHERE id = '29568a04-0e5b-4e26-bd47-7ee4caf5516c') 
        THEN 'Record still exists' 
        ELSE 'Record successfully deleted' 
    END as status;