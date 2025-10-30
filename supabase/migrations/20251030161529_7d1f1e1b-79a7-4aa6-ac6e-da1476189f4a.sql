-- Drop the old constraint
ALTER TABLE public.tech_demands 
DROP CONSTRAINT IF EXISTS tech_demands_status_check;

-- Add new constraint with all Kanban statuses
ALTER TABLE public.tech_demands 
ADD CONSTRAINT tech_demands_status_check 
CHECK (status IN ('novo', 'assigned', 'in_progress', 'validation', 'fix', 'done', 'backlog'));

-- Update any existing 'backlog' statuses to 'novo' 
UPDATE public.tech_demands 
SET status = 'novo' 
WHERE status = 'backlog';