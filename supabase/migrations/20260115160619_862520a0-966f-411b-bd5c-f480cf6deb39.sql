-- Add override_cost column to quotation_routings table
ALTER TABLE public.quotation_routings 
ADD COLUMN override_cost numeric DEFAULT NULL;