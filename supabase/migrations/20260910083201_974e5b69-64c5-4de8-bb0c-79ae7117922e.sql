ALTER TABLE public.ot_purchase_orders
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS fx_rate_to_eur numeric;

ALTER TABLE public.ot_orders
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS original_unit_price numeric,
  ADD COLUMN IF NOT EXISTS original_total_price numeric,
  ADD COLUMN IF NOT EXISTS fx_rate_to_eur numeric;