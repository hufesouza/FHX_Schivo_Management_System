-- Add volume-specific quantity columns to quotation_tools
ALTER TABLE public.quotation_tools 
ADD COLUMN IF NOT EXISTS qty_vol_1 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_vol_2 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_vol_3 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_vol_4 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_vol_5 numeric DEFAULT 0;