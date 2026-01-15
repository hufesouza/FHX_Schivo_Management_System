-- Add column to track if routing's setup time should be included in calculation
ALTER TABLE public.quotation_routings 
ADD COLUMN include_setup_calc boolean NOT NULL DEFAULT true;