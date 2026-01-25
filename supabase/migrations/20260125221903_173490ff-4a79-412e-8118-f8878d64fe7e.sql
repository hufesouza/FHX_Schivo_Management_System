-- Add missing columns to quotation_materials table
ALTER TABLE public.quotation_materials 
ADD COLUMN IF NOT EXISTS cut_off numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS length numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS diameter numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_vol_1 numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS qty_vol_2 numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS qty_vol_3 numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS qty_vol_4 numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS qty_vol_5 numeric DEFAULT NULL;