-- Create table for quotation secondary operations
CREATE TABLE public.quotation_secondary_ops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.system_quotations(id) ON DELETE CASCADE,
  resource_id TEXT,
  operation TEXT NOT NULL,
  cost_type TEXT NOT NULL DEFAULT 'per_run',
  qty_per_run NUMERIC DEFAULT 1,
  time_per_run NUMERIC DEFAULT 0,
  time_per_piece NUMERIC DEFAULT 0,
  total_time NUMERIC DEFAULT 0,
  cost_per_minute NUMERIC DEFAULT 0,
  calculated_cost NUMERIC DEFAULT 0,
  markup NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_secondary_ops ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view secondary ops"
  ON public.quotation_secondary_ops
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert secondary ops"
  ON public.quotation_secondary_ops
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update secondary ops"
  ON public.quotation_secondary_ops
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete secondary ops"
  ON public.quotation_secondary_ops
  FOR DELETE
  TO authenticated
  USING (true);

-- Add index for faster lookups
CREATE INDEX idx_quotation_secondary_ops_quotation_id ON public.quotation_secondary_ops(quotation_id);