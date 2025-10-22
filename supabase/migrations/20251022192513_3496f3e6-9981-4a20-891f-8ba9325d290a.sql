-- Delete user roles first
DELETE FROM public.user_roles WHERE user_id = '073541e7-1932-4782-8191-e526b39d76ec';

-- Delete the user from auth.users
DELETE FROM auth.users WHERE id = '073541e7-1932-4782-8191-e526b39d76ec';