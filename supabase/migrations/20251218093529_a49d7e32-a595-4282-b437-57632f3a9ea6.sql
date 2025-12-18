-- Add blue_review_number column with auto-increment sequence
ALTER TABLE public.work_orders 
ADD COLUMN blue_review_number SERIAL UNIQUE;

-- Remove icn_number column (no longer needed)
ALTER TABLE public.work_orders 
DROP COLUMN IF EXISTS icn_number;