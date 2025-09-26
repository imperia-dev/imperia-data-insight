-- Create a function to delete the expense with superuser privileges
CREATE OR REPLACE FUNCTION delete_specific_expense()
RETURNS void AS $$
BEGIN
  -- Delete the expense directly
  DELETE FROM public.expenses WHERE id = '4642a5e3-7571-4d4e-b55e-09fcdf2eaf93';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Call the function
SELECT delete_specific_expense();

-- Drop the function after use
DROP FUNCTION delete_specific_expense();