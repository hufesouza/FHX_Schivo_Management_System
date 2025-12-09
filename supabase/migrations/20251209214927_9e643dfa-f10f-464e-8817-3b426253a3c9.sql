-- Create resource_configurations table to store machine-specific settings
CREATE TABLE public.resource_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_name text NOT NULL UNIQUE,
  department text NOT NULL DEFAULT 'misc',
  working_hours_per_day numeric NOT NULL DEFAULT 24,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_configurations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view resource configurations"
ON public.resource_configurations
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert resource configurations"
ON public.resource_configurations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update resource configurations"
ON public.resource_configurations
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete resource configurations"
ON public.resource_configurations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_resource_configurations_updated_at
BEFORE UPDATE ON public.resource_configurations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();