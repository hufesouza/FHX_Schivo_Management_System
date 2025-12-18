-- Create enquiry_log table for Quotation Control
CREATE TABLE public.enquiry_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_no TEXT NOT NULL UNIQUE,
  customer TEXT,
  details TEXT,
  customer_type TEXT, -- New/Existing Customer
  business_type TEXT, -- New/Existing Business
  date_received DATE,
  npi_owner TEXT,
  priority TEXT,
  commercial_owner TEXT,
  ecd_quote_submission DATE, -- Expected Completion Date for quote submission
  date_quote_submitted DATE,
  quoted_price_euro NUMERIC,
  aging INTEGER,
  turnaround_days INTEGER,
  quantity_parts_quoted INTEGER,
  quoted_gap INTEGER,
  is_quoted BOOLEAN DEFAULT false,
  po_received BOOLEAN DEFAULT false,
  po_value_euro NUMERIC,
  date_po_received DATE,
  comments TEXT,
  status TEXT DEFAULT 'OPEN',
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enquiry_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view enquiry_log" 
ON public.enquiry_log 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert enquiry_log" 
ON public.enquiry_log 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update enquiry_log" 
ON public.enquiry_log 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete enquiry_log" 
ON public.enquiry_log 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_enquiry_log_updated_at
BEFORE UPDATE ON public.enquiry_log
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();