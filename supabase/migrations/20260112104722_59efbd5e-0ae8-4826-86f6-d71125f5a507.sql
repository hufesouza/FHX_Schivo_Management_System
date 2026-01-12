-- Create enquiry_quotations table to store quotations linked to enquiries
CREATE TABLE public.enquiry_quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_no TEXT NOT NULL,
  customer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  total_quoted_price NUMERIC,
  total_cost NUMERIC,
  average_margin NUMERIC,
  notes TEXT,
  source_file_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enquiry_quotation_parts table to store individual part details from the Excel template
CREATE TABLE public.enquiry_quotation_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.enquiry_quotations(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  part_number TEXT,
  description TEXT,
  quantity INTEGER,
  -- Material
  material_name TEXT,
  material_qty_per_unit NUMERIC,
  material_std_cost_est NUMERIC,
  material_markup NUMERIC,
  total_material NUMERIC,
  -- Subcon
  subcon_cost NUMERIC,
  subcon_markup NUMERIC,
  subcon_cost_per_part NUMERIC,
  -- Development
  resource TEXT,
  volume NUMERIC,
  development_time NUMERIC,
  days_dev_time NUMERIC,
  shift NUMERIC,
  dev_time_cost NUMERIC,
  tooling NUMERIC,
  nre NUMERIC,
  -- Routing
  machine_manning TEXT,
  machine_setup NUMERIC,
  machine_run_time NUMERIC,
  part_deburr NUMERIC,
  wash NUMERIC,
  labour_per_hr NUMERIC,
  overheads_per_hr NUMERIC,
  machine_cost_per_min NUMERIC,
  secondary_ops_cost_per_min NUMERIC,
  labour_processing_cost NUMERIC,
  -- Price
  total_cost_per_part NUMERIC,
  margin NUMERIC,
  unit_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enquiry_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_quotation_parts ENABLE ROW LEVEL SECURITY;

-- RLS policies for enquiry_quotations
CREATE POLICY "Authenticated users can view enquiry_quotations" 
  ON public.enquiry_quotations FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create enquiry_quotations" 
  ON public.enquiry_quotations FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update own enquiry_quotations" 
  ON public.enquiry_quotations FOR UPDATE 
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete enquiry_quotations" 
  ON public.enquiry_quotations FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for enquiry_quotation_parts
CREATE POLICY "Authenticated users can view enquiry_quotation_parts" 
  ON public.enquiry_quotation_parts FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage enquiry_quotation_parts via quotation"
  ON public.enquiry_quotation_parts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.enquiry_quotations q 
    WHERE q.id = enquiry_quotation_parts.quotation_id 
    AND (q.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- Create updated_at trigger
CREATE TRIGGER update_enquiry_quotations_updated_at
  BEFORE UPDATE ON public.enquiry_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();