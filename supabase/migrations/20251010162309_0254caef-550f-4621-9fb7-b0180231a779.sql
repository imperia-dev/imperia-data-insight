-- Create missing profile for existing user
INSERT INTO public.profiles (id, email, full_name, role, approval_status, mfa_enabled, mfa_verified)
VALUES (
  '4cb8dfdd-c6ba-4e6e-a4f0-f6dd438e3204',
  'the.tecnology.cia@gmail.com',
  'Alex Customer View Test',
  'operation',
  'approved',
  false,
  false
)
ON CONFLICT (id) DO UPDATE SET
  mfa_enabled = COALESCE(EXCLUDED.mfa_enabled, public.profiles.mfa_enabled),
  mfa_verified = COALESCE(EXCLUDED.mfa_verified, public.profiles.mfa_verified),
  approval_status = COALESCE(EXCLUDED.approval_status, public.profiles.approval_status);