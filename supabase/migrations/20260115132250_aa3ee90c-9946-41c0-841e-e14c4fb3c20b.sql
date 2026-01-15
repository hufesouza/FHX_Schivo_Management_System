-- Drop the existing unique constraint on resource_no
ALTER TABLE public.quotation_resources DROP CONSTRAINT IF EXISTS quotation_resources_resource_no_key;

-- Create a new composite unique constraint on resource_no + site
ALTER TABLE public.quotation_resources ADD CONSTRAINT quotation_resources_resource_no_site_key UNIQUE (resource_no, site);