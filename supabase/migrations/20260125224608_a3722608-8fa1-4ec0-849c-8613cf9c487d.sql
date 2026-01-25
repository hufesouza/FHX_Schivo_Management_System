-- Add production planning fields to system_quotations
ALTER TABLE public.system_quotations
ADD COLUMN IF NOT EXISTS cycle_time_per_piece numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS production_hours_per_day numeric DEFAULT 18,
ADD COLUMN IF NOT EXISTS production_effectiveness numeric DEFAULT 85,
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS programming_hours numeric,
ADD COLUMN IF NOT EXISTS programming_rate numeric,
ADD COLUMN IF NOT EXISTS setup_hours numeric,
ADD COLUMN IF NOT EXISTS setup_rate numeric,
ADD COLUMN IF NOT EXISTS production_profit_percent numeric,
ADD COLUMN IF NOT EXISTS production_sales_commission_percent numeric;