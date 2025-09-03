-- Add status_order column to orders table
ALTER TABLE public.orders 
ADD COLUMN status_order text NOT NULL DEFAULT 'available'
CHECK (status_order IN ('available', 'in_progress', 'delivered'));

-- Update existing orders based on current state
UPDATE public.orders 
SET status_order = 
  CASE 
    WHEN delivered_at IS NOT NULL THEN 'delivered'
    WHEN assigned_to IS NOT NULL THEN 'in_progress'
    ELSE 'available'
  END;