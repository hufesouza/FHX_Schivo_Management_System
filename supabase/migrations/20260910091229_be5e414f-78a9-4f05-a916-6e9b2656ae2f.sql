ALTER TABLE public.ot_orders ADD COLUMN IF NOT EXISTS is_nre boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS ot_orders_is_nre_idx ON public.ot_orders (is_nre);