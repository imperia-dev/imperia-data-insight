-- Add operation_account_id column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'operation_account_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN operation_account_id uuid;
  END IF;
END $$;