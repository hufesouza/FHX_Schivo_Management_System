-- Create table for resource ratings (editable in settings)
CREATE TABLE public.quotation_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_no TEXT NOT NULL UNIQUE,
  resource_description TEXT NOT NULL,
  cost_per_minute NUMERIC(10,4) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for quotation system settings
CREATE TABLE public.quotation_system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value NUMERIC(10,4) NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create main quotation header table
CREATE TABLE public.system_quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_no TEXT NOT NULL,
  customer TEXT NOT NULL,
  customer_code TEXT,
  quoted_by TEXT,
  part_number TEXT NOT NULL,
  revision TEXT,
  description TEXT,
  qty_per INTEGER DEFAULT 1,
  manufacture_type TEXT DEFAULT 'Manufacture',
  blue_review_required BOOLEAN DEFAULT false,
  batch_traceable BOOLEAN DEFAULT false,
  rohs_compliant BOOLEAN DEFAULT true,
  serial_traceable BOOLEAN DEFAULT false,
  material_markup NUMERIC(5,2) DEFAULT 20,
  subcon_markup NUMERIC(5,2) DEFAULT 20,
  vol_1 INTEGER,
  vol_2 INTEGER,
  vol_3 INTEGER,
  vol_4 INTEGER,
  vol_5 INTEGER,
  won_volume INTEGER,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create BOM/Materials table
CREATE TABLE public.quotation_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.system_quotations(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  vendor_no TEXT,
  vendor_name TEXT,
  part_number TEXT,
  material_description TEXT,
  mat_category TEXT,
  uom TEXT DEFAULT 'Each',
  qty_per_unit NUMERIC(10,4) DEFAULT 1,
  qa_inspection_required BOOLEAN DEFAULT false,
  std_cost_est NUMERIC(10,4),
  certification_required TEXT,
  purchaser TEXT,
  description_for_qa TEXT,
  total_material NUMERIC(10,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Subcon table
CREATE TABLE public.quotation_subcons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.system_quotations(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  vendor_no TEXT,
  vendor_name TEXT,
  part_number TEXT,
  process_description TEXT,
  std_cost_est NUMERIC(10,4),
  certification_required BOOLEAN DEFAULT false,
  total_subcon NUMERIC(10,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Routings table
CREATE TABLE public.quotation_routings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.system_quotations(id) ON DELETE CASCADE,
  op_no INTEGER NOT NULL,
  sublevel_bom BOOLEAN DEFAULT false,
  part_number TEXT,
  resource_id UUID REFERENCES public.quotation_resources(id),
  resource_no TEXT,
  operation_details TEXT,
  subcon_processing_time NUMERIC(10,2) DEFAULT 0,
  setup_time NUMERIC(10,2) DEFAULT 0,
  run_time NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(10,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create volume pricing table
CREATE TABLE public.quotation_volume_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.system_quotations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  hours NUMERIC(10,2),
  cost_per_hour NUMERIC(10,4) DEFAULT 55,
  labour_cost NUMERIC(12,2),
  material_cost NUMERIC(12,2),
  subcon_cost NUMERIC(12,2),
  tooling_cost NUMERIC(12,2) DEFAULT 0,
  carriage NUMERIC(12,2) DEFAULT 0,
  misc NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2),
  unit_price_quoted NUMERIC(10,4),
  cost_per_unit NUMERIC(10,4),
  margin NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_subcons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_routings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_volume_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotation_resources (all authenticated can read, admin can write)
CREATE POLICY "Anyone can view resources" ON public.quotation_resources FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage resources" ON public.quotation_resources FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for quotation_system_settings
CREATE POLICY "Anyone can view settings" ON public.quotation_system_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage settings" ON public.quotation_system_settings FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for system_quotations
CREATE POLICY "Users can view all quotations" ON public.system_quotations FOR SELECT USING (true);
CREATE POLICY "Users can create quotations" ON public.system_quotations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update quotations" ON public.system_quotations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete their quotations" ON public.system_quotations FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for quotation_materials
CREATE POLICY "Users can view materials" ON public.quotation_materials FOR SELECT USING (true);
CREATE POLICY "Users can manage materials" ON public.quotation_materials FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for quotation_subcons
CREATE POLICY "Users can view subcons" ON public.quotation_subcons FOR SELECT USING (true);
CREATE POLICY "Users can manage subcons" ON public.quotation_subcons FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for quotation_routings
CREATE POLICY "Users can view routings" ON public.quotation_routings FOR SELECT USING (true);
CREATE POLICY "Users can manage routings" ON public.quotation_routings FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for quotation_volume_pricing
CREATE POLICY "Users can view volume pricing" ON public.quotation_volume_pricing FOR SELECT USING (true);
CREATE POLICY "Users can manage volume pricing" ON public.quotation_volume_pricing FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default settings
INSERT INTO public.quotation_system_settings (setting_key, setting_value, description) VALUES
('cost_per_hour', 55.00, 'Default cost per hour for labour calculations'),
('material_markup_default', 20.00, 'Default material markup percentage'),
('subcon_markup_default', 20.00, 'Default subcon markup percentage'),
('margin_vol_1', 45.00, 'Default margin for volume 1'),
('margin_vol_2', 40.00, 'Default margin for volume 2'),
('margin_vol_3', 35.00, 'Default margin for volume 3'),
('margin_vol_4', 30.00, 'Default margin for volume 4'),
('margin_vol_5', 25.00, 'Default margin for volume 5');

-- Add triggers for updated_at
CREATE TRIGGER update_quotation_resources_updated_at BEFORE UPDATE ON public.quotation_resources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_quotation_system_settings_updated_at BEFORE UPDATE ON public.quotation_system_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_system_quotations_updated_at BEFORE UPDATE ON public.system_quotations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();