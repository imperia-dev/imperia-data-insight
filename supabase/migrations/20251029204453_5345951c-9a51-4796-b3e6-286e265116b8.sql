-- Delete Google OAuth user that didn't complete registration
-- Email: m.asuheth@gmail.com
-- ID: 966f845c-79d2-4856-862c-31c2270babe6

-- Delete from auth.users (no related data in public schema)
DELETE FROM auth.users 
WHERE id = '966f845c-79d2-4856-862c-31c2270babe6' 
  AND email = 'm.asuheth@gmail.com';