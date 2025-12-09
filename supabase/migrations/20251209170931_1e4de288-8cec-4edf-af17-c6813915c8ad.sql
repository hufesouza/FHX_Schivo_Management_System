-- Create table for storing capacity planning data
CREATE TABLE public.capacity_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL CHECK (department IN ('milling', 'turning', 'sliding_head', 'misc')),
  data jsonb NOT NULL,
  file_name text NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(department) -- Only one dataset per department at a time
);

-- Enable RLS
ALTER TABLE public.capacity_data ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view capacity data
CREATE POLICY "Authenticated users can view capacity data"
ON public.capacity_data
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- All authenticated users can insert/update capacity data (any user can upload new data)
CREATE POLICY "Authenticated users can insert capacity data"
ON public.capacity_data
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update capacity data"
ON public.capacity_data
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Only admins can delete capacity data
CREATE POLICY "Admins can delete capacity data"
ON public.capacity_data
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_capacity_data_updated_at
BEFORE UPDATE ON public.capacity_data
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();