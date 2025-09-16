-- Add concurrent order limit to user_document_limits table
ALTER TABLE public.user_document_limits 
ADD COLUMN concurrent_order_limit integer NOT NULL DEFAULT 2;

-- Add comment for clarity
COMMENT ON COLUMN public.user_document_limits.concurrent_order_limit IS 'Maximum number of orders a user can have in progress simultaneously';