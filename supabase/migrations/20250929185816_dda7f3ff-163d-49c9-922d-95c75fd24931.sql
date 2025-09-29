-- Allow authenticated users to insert security events (for logging purposes)
CREATE POLICY "Authenticated users can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow system functions to insert events (for security definer functions)
CREATE POLICY "System can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);