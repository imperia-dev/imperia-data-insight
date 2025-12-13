-- =============================================
-- PHASE 1: FIX CRITICAL RLS POLICIES FOR LEAD TABLES
-- =============================================

-- 1. lead_conversions - Drop permissive policies and create restrictive ones
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lead_conversions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.lead_conversions;
DROP POLICY IF EXISTS "Owners can manage lead conversions" ON public.lead_conversions;

-- Only owner/master/admin can SELECT lead conversions
CREATE POLICY "Only privileged roles can view lead conversions"
ON public.lead_conversions
FOR SELECT
USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

-- Allow anonymous INSERT for tracking (necessary for public lead tracking)
CREATE POLICY "Anyone can insert lead conversions"
ON public.lead_conversions
FOR INSERT
WITH CHECK (true);

-- Only owner can UPDATE/DELETE
CREATE POLICY "Only owner can manage lead conversions"
ON public.lead_conversions
FOR ALL
USING (get_user_role(auth.uid()) = 'owner');

-- 2. lead_events - Drop permissive policies and create restrictive ones
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lead_events;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.lead_events;
DROP POLICY IF EXISTS "Owners can manage lead events" ON public.lead_events;

-- Only owner/master/admin can SELECT lead events
CREATE POLICY "Only privileged roles can view lead events"
ON public.lead_events
FOR SELECT
USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

-- Allow anonymous INSERT for tracking
CREATE POLICY "Anyone can insert lead events"
ON public.lead_events
FOR INSERT
WITH CHECK (true);

-- Only owner can UPDATE/DELETE
CREATE POLICY "Only owner can manage lead events"
ON public.lead_events
FOR ALL
USING (get_user_role(auth.uid()) = 'owner');

-- 3. lead_sessions - Drop permissive policies and create restrictive ones
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lead_sessions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.lead_sessions;
DROP POLICY IF EXISTS "Owners can manage lead sessions" ON public.lead_sessions;

-- Only owner/master/admin can SELECT lead sessions
CREATE POLICY "Only privileged roles can view lead sessions"
ON public.lead_sessions
FOR SELECT
USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

-- Allow anonymous INSERT for tracking
CREATE POLICY "Anyone can insert lead sessions"
ON public.lead_sessions
FOR INSERT
WITH CHECK (true);

-- Only owner can UPDATE/DELETE
CREATE POLICY "Only owner can manage lead sessions"
ON public.lead_sessions
FOR ALL
USING (get_user_role(auth.uid()) = 'owner');

-- 4. lead_page_views - Drop permissive policies and create restrictive ones
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lead_page_views;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.lead_page_views;
DROP POLICY IF EXISTS "Owners can manage lead page views" ON public.lead_page_views;

-- Only owner/master/admin can SELECT lead page views
CREATE POLICY "Only privileged roles can view lead page views"
ON public.lead_page_views
FOR SELECT
USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

-- Allow anonymous INSERT for tracking
CREATE POLICY "Anyone can insert lead page views"
ON public.lead_page_views
FOR INSERT
WITH CHECK (true);

-- Only owner can UPDATE/DELETE
CREATE POLICY "Only owner can manage lead page views"
ON public.lead_page_views
FOR ALL
USING (get_user_role(auth.uid()) = 'owner');

-- =============================================
-- PHASE 2: FIX STORAGE BUCKET POLICIES
-- =============================================

-- Make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id = 'service-provider-files';
UPDATE storage.buckets SET public = false WHERE id = 'payment-receipts';
UPDATE storage.buckets SET public = false WHERE id = 'documents';
UPDATE storage.buckets SET public = false WHERE id = 'pendency-attachments';

-- Drop existing storage policies for these buckets and recreate with proper security
DROP POLICY IF EXISTS "Anyone can view service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete service provider files" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete payment receipts" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view pendency attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload pendency attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update pendency attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete pendency attachments" ON storage.objects;

-- Create secure policies for service-provider-files bucket
CREATE POLICY "Privileged roles can view service provider files"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-provider-files' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'financeiro'));

CREATE POLICY "Privileged roles can upload service provider files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-provider-files' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'financeiro'));

CREATE POLICY "Privileged roles can update service provider files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-provider-files' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

CREATE POLICY "Only owner can delete service provider files"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-provider-files' AND get_user_role(auth.uid()) = 'owner');

-- Create secure policies for payment-receipts bucket
CREATE POLICY "Privileged roles can view payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'financeiro'));

CREATE POLICY "Privileged roles can upload payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'financeiro'));

CREATE POLICY "Privileged roles can update payment receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-receipts' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

CREATE POLICY "Only owner can delete payment receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-receipts' AND get_user_role(auth.uid()) = 'owner');

-- Create secure policies for documents bucket
CREATE POLICY "Privileged roles can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'operation'));

CREATE POLICY "Privileged roles can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'operation'));

CREATE POLICY "Privileged roles can update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

CREATE POLICY "Only owner can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND get_user_role(auth.uid()) = 'owner');

-- Create secure policies for pendency-attachments bucket
CREATE POLICY "Privileged roles can view pendency attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'pendency-attachments' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'operation'));

CREATE POLICY "Privileged roles can upload pendency attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pendency-attachments' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'operation', 'customer'));

CREATE POLICY "Privileged roles can update pendency attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pendency-attachments' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

CREATE POLICY "Only owner can delete pendency attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'pendency-attachments' AND get_user_role(auth.uid()) = 'owner');