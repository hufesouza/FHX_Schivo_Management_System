-- Add deactivated_at column to track when topics/customers were removed
ALTER TABLE public.meeting_topics 
ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.meeting_customers 
ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone DEFAULT NULL;

-- Update existing inactive items to have a deactivated_at timestamp using created_at
UPDATE public.meeting_topics 
SET deactivated_at = created_at 
WHERE is_active = false AND deactivated_at IS NULL;

UPDATE public.meeting_customers 
SET deactivated_at = created_at 
WHERE is_active = false AND deactivated_at IS NULL;