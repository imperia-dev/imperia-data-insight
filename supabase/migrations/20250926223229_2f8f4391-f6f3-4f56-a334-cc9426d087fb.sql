-- Check current RLS policies on expenses
SELECT * FROM pg_policies WHERE tablename = 'expenses' AND schemaname = 'public';