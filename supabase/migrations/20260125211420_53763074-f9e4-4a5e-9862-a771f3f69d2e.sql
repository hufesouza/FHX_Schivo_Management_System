-- Add assignment tracking to system_quotations
ALTER TABLE public.system_quotations 
ADD COLUMN IF NOT EXISTS assignment_status text DEFAULT 'unassigned',
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- Create a table to link quoted parts to enquiries (many-to-many with copy behavior)
CREATE TABLE IF NOT EXISTS public.enquiry_quoted_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_id uuid NOT NULL REFERENCES public.quotation_enquiries(id) ON DELETE CASCADE,
  source_quotation_id uuid NOT NULL REFERENCES public.system_quotations(id) ON DELETE RESTRICT,
  -- Copied fields from source quotation
  part_number text NOT NULL,
  revision text,
  description text,
  customer text NOT NULL,
  customer_code text,
  qty_per integer DEFAULT 1,
  manufacture_type text DEFAULT 'Manufactured',
  blue_review_required boolean DEFAULT false,
  batch_traceable boolean DEFAULT false,
  rohs_compliant boolean DEFAULT false,
  serial_traceable boolean DEFAULT false,
  material_markup numeric DEFAULT 0,
  subcon_markup numeric DEFAULT 0,
  vol_1 integer,
  vol_2 integer,
  vol_3 integer,
  vol_4 integer,
  vol_5 integer,
  won_volume integer,
  notes text,
  -- Snapshot of pricing at time of adding to enquiry
  total_quoted_value numeric,
  average_margin numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Copy routings for enquiry quoted parts
CREATE TABLE IF NOT EXISTS public.enquiry_quoted_part_routings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_quoted_part_id uuid NOT NULL REFERENCES public.enquiry_quoted_parts(id) ON DELETE CASCADE,
  op_no integer NOT NULL,
  sublevel_bom boolean DEFAULT false,
  part_number text,
  resource_id uuid,
  resource_no text,
  operation_details text,
  subcon_processing_time numeric DEFAULT 0,
  setup_time numeric DEFAULT 0,
  run_time numeric DEFAULT 0,
  cost numeric
);

-- Copy materials for enquiry quoted parts
CREATE TABLE IF NOT EXISTS public.enquiry_quoted_part_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_quoted_part_id uuid NOT NULL REFERENCES public.enquiry_quoted_parts(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  vendor_no text,
  vendor_name text,
  part_number text,
  material_description text,
  mat_category text,
  uom text DEFAULT 'EA',
  qty_per_unit numeric DEFAULT 1,
  qa_inspection_required boolean DEFAULT false,
  std_cost_est numeric,
  certification_required text,
  purchaser text,
  description_for_qa text,
  total_material numeric
);

-- Copy subcons for enquiry quoted parts
CREATE TABLE IF NOT EXISTS public.enquiry_quoted_part_subcons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_quoted_part_id uuid NOT NULL REFERENCES public.enquiry_quoted_parts(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  vendor_no text,
  vendor_name text,
  part_number text,
  process_description text,
  std_cost_est numeric,
  certification_required boolean DEFAULT false,
  total_subcon numeric
);

-- Copy volume pricing for enquiry quoted parts
CREATE TABLE IF NOT EXISTS public.enquiry_quoted_part_volume_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_quoted_part_id uuid NOT NULL REFERENCES public.enquiry_quoted_parts(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  hours numeric,
  cost_per_hour numeric DEFAULT 0,
  labour_cost numeric,
  material_cost numeric,
  subcon_cost numeric,
  tooling_cost numeric DEFAULT 0,
  carriage numeric DEFAULT 0,
  misc numeric DEFAULT 0,
  total_price numeric,
  unit_price_quoted numeric,
  cost_per_unit numeric,
  margin numeric
);

-- Enable RLS
ALTER TABLE public.enquiry_quoted_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_quoted_part_routings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_quoted_part_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_quoted_part_subcons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_quoted_part_volume_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enquiry_quoted_parts
CREATE POLICY "Users can view all enquiry quoted parts" ON public.enquiry_quoted_parts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert enquiry quoted parts" ON public.enquiry_quoted_parts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update enquiry quoted parts" ON public.enquiry_quoted_parts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete enquiry quoted parts" ON public.enquiry_quoted_parts FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for enquiry_quoted_part_routings
CREATE POLICY "Users can view all enquiry quoted part routings" ON public.enquiry_quoted_part_routings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert enquiry quoted part routings" ON public.enquiry_quoted_part_routings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update enquiry quoted part routings" ON public.enquiry_quoted_part_routings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete enquiry quoted part routings" ON public.enquiry_quoted_part_routings FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for enquiry_quoted_part_materials
CREATE POLICY "Users can view all enquiry quoted part materials" ON public.enquiry_quoted_part_materials FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert enquiry quoted part materials" ON public.enquiry_quoted_part_materials FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update enquiry quoted part materials" ON public.enquiry_quoted_part_materials FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete enquiry quoted part materials" ON public.enquiry_quoted_part_materials FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for enquiry_quoted_part_subcons
CREATE POLICY "Users can view all enquiry quoted part subcons" ON public.enquiry_quoted_part_subcons FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert enquiry quoted part subcons" ON public.enquiry_quoted_part_subcons FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update enquiry quoted part subcons" ON public.enquiry_quoted_part_subcons FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete enquiry quoted part subcons" ON public.enquiry_quoted_part_subcons FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for enquiry_quoted_part_volume_pricing
CREATE POLICY "Users can view all enquiry quoted part volume pricing" ON public.enquiry_quoted_part_volume_pricing FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert enquiry quoted part volume pricing" ON public.enquiry_quoted_part_volume_pricing FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update enquiry quoted part volume pricing" ON public.enquiry_quoted_part_volume_pricing FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete enquiry quoted part volume pricing" ON public.enquiry_quoted_part_volume_pricing FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_enquiry_quoted_parts_enquiry_id ON public.enquiry_quoted_parts(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_quoted_parts_source_quotation ON public.enquiry_quoted_parts(source_quotation_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_quoted_parts_customer ON public.enquiry_quoted_parts(customer);
CREATE INDEX IF NOT EXISTS idx_system_quotations_assignment_status ON public.system_quotations(assignment_status);
CREATE INDEX IF NOT EXISTS idx_system_quotations_customer ON public.system_quotations(customer);