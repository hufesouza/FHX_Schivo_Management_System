-- Add new columns for Operations (Post Process work centres)
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS post_process_work_centres jsonb DEFAULT '[]'::jsonb;

-- Add new columns for Programming Review section
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS machining_times_as_planned boolean,
ADD COLUMN IF NOT EXISTS machining_times_details text,
ADD COLUMN IF NOT EXISTS times_can_be_improved boolean,
ADD COLUMN IF NOT EXISTS times_improvement_details text,
ADD COLUMN IF NOT EXISTS open_actions_identified boolean,
ADD COLUMN IF NOT EXISTS open_actions_details text,
ADD COLUMN IF NOT EXISTS all_actions_completed boolean,
ADD COLUMN IF NOT EXISTS actions_completed_details text,
ADD COLUMN IF NOT EXISTS programming_signature text,
ADD COLUMN IF NOT EXISTS programming_signature_date text;

-- Add new columns for Handover section
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS handover_engineering_accept boolean,
ADD COLUMN IF NOT EXISTS handover_engineering_details text,
ADD COLUMN IF NOT EXISTS handover_engineering_signature text,
ADD COLUMN IF NOT EXISTS handover_engineering_date text,
ADD COLUMN IF NOT EXISTS handover_operations_accept boolean,
ADD COLUMN IF NOT EXISTS handover_operations_details text,
ADD COLUMN IF NOT EXISTS handover_operations_signature text,
ADD COLUMN IF NOT EXISTS handover_operations_date text,
ADD COLUMN IF NOT EXISTS handover_quality_accept boolean,
ADD COLUMN IF NOT EXISTS handover_quality_details text,
ADD COLUMN IF NOT EXISTS handover_quality_signature text,
ADD COLUMN IF NOT EXISTS handover_quality_date text,
ADD COLUMN IF NOT EXISTS handover_comments text;

-- Add new columns for NPI Final Review
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS costings_need_reevaluation boolean,
ADD COLUMN IF NOT EXISTS costings_reevaluation_details text,
ADD COLUMN IF NOT EXISTS departments_agreed_to_change boolean,
ADD COLUMN IF NOT EXISTS departments_agreed_details text;

-- Add new column for Supply Chain
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS reasons_in_remarks boolean,
ADD COLUMN IF NOT EXISTS reasons_in_remarks_details text;