-- Add type and jira_id columns to tech_demands table
ALTER TABLE public.tech_demands
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'bug',
ADD COLUMN IF NOT EXISTS jira_id text;

-- Add check constraint for type
ALTER TABLE public.tech_demands
ADD CONSTRAINT tech_demands_type_check 
CHECK (type IN ('bug', 'improvement'));

-- Add comment for documentation
COMMENT ON COLUMN public.tech_demands.type IS 'Type of demand: bug or improvement';
COMMENT ON COLUMN public.tech_demands.jira_id IS 'Jira task/issue ID reference';