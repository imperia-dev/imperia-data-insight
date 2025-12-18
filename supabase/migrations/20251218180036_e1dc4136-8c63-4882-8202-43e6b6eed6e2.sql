-- Create terms_of_service_acceptances table
CREATE TABLE public.terms_of_service_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address INET,
  UNIQUE(user_id, terms_version)
);

-- Enable RLS
ALTER TABLE public.terms_of_service_acceptances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own acceptances"
  ON public.terms_of_service_acceptances
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own acceptances"
  ON public.terms_of_service_acceptances
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can view all acceptances"
  ON public.terms_of_service_acceptances
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Create index for performance
CREATE INDEX idx_terms_acceptances_user_id ON public.terms_of_service_acceptances(user_id);
CREATE INDEX idx_terms_acceptances_version ON public.terms_of_service_acceptances(terms_version);