-- Add site column to quotation_resources
ALTER TABLE public.quotation_resources 
ADD COLUMN site VARCHAR(50) NOT NULL DEFAULT 'waterford';

-- Add site column to quotation_subcon_vendors
ALTER TABLE public.quotation_subcon_vendors 
ADD COLUMN site VARCHAR(50) NOT NULL DEFAULT 'waterford';

-- Add site column to quotation_material_suppliers
ALTER TABLE public.quotation_material_suppliers 
ADD COLUMN site VARCHAR(50) NOT NULL DEFAULT 'waterford';

-- Add site column to quotation_customers
ALTER TABLE public.quotation_customers 
ADD COLUMN site VARCHAR(50) NOT NULL DEFAULT 'waterford';

-- Add site column to quotation_system_settings
ALTER TABLE public.quotation_system_settings 
ADD COLUMN site VARCHAR(50) NOT NULL DEFAULT 'waterford';

-- Create index for faster lookups by site
CREATE INDEX idx_quotation_resources_site ON public.quotation_resources(site);
CREATE INDEX idx_quotation_subcon_vendors_site ON public.quotation_subcon_vendors(site);
CREATE INDEX idx_quotation_material_suppliers_site ON public.quotation_material_suppliers(site);
CREATE INDEX idx_quotation_customers_site ON public.quotation_customers(site);
CREATE INDEX idx_quotation_system_settings_site ON public.quotation_system_settings(site);