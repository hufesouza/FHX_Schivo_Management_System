-- New ENQ-based Quotation System
-- Workflow: Open → In Progress → Submitted for Review → Approved/Declined → Submitted → Won/Lost

-- Create ENQ status enum type
DO $$ BEGIN
  CREATE TYPE enquiry_status AS ENUM (
    'open',
    'in_progress',
    'submitted_for_review',
    'approved',
    'declined',
    'submitted',
    'won',
    'lost'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create quotation_enquiries table (main ENQ table)
CREATE TABLE public.quotation_enquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_no VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.quotation_customers(id),
  customer_name VARCHAR(255) NOT NULL,
  sales_representative VARCHAR(255),
  status enquiry_status NOT NULL DEFAULT 'open',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enquiry_parts table (PNs within an ENQ)
CREATE TABLE public.enquiry_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_id UUID NOT NULL REFERENCES public.quotation_enquiries(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  part_number VARCHAR(100) NOT NULL,
  description TEXT,
  revision VARCHAR(20),
  drawing_url TEXT,
  drawing_file_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(enquiry_id, line_number)
);

-- Add enquiry_part_id to system_quotations to link quotation to a specific part
ALTER TABLE public.system_quotations 
ADD COLUMN IF NOT EXISTS enquiry_part_id UUID REFERENCES public.enquiry_parts(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.quotation_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotation_enquiries
CREATE POLICY "Users can view all enquiries"
ON public.quotation_enquiries
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create enquiries"
ON public.quotation_enquiries
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update enquiries"
ON public.quotation_enquiries
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete enquiries"
ON public.quotation_enquiries
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- RLS Policies for enquiry_parts
CREATE POLICY "Users can view all enquiry parts"
ON public.enquiry_parts
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create enquiry parts"
ON public.enquiry_parts
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update enquiry parts"
ON public.enquiry_parts
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete enquiry parts"
ON public.enquiry_parts
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create updated_at triggers
CREATE TRIGGER update_quotation_enquiries_updated_at
BEFORE UPDATE ON public.quotation_enquiries
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_enquiry_parts_updated_at
BEFORE UPDATE ON public.enquiry_parts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for drawings if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('enquiry-drawings', 'enquiry-drawings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for enquiry drawings
CREATE POLICY "Anyone can view enquiry drawings"
ON storage.objects FOR SELECT
USING (bucket_id = 'enquiry-drawings');

CREATE POLICY "Authenticated users can upload enquiry drawings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'enquiry-drawings' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update enquiry drawings"
ON storage.objects FOR UPDATE
USING (bucket_id = 'enquiry-drawings' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete enquiry drawings"
ON storage.objects FOR DELETE
USING (bucket_id = 'enquiry-drawings' AND auth.uid() IS NOT NULL);