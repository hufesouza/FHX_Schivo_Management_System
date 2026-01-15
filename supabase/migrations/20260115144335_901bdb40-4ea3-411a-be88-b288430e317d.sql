-- Add site column to system_quotations table
ALTER TABLE public.system_quotations
ADD COLUMN site text NOT NULL DEFAULT 'waterford';

-- Add a check constraint for valid site values
ALTER TABLE public.system_quotations
ADD CONSTRAINT system_quotations_site_check CHECK (site IN ('waterford', 'mexico'));