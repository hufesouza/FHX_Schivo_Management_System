-- FHX Quick Quote System - Core Tables

-- Materials table
CREATE TABLE public.quote_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT,
  form TEXT, -- 'round bar', 'plate', 'sheet', 'tube'
  dimension_range TEXT,
  density_kg_m3 NUMERIC DEFAULT 7850, -- Default steel density
  default_yield NUMERIC DEFAULT 0.6, -- 60% yield, 40% scrap
  volatility_level TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
  inflation_rate_per_year NUMERIC DEFAULT 0.03, -- 3% per year
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Material price records (historical data for PERT estimation)
CREATE TABLE public.material_price_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.quote_materials(id) ON DELETE CASCADE,
  supplier_name TEXT,
  price_per_kg NUMERIC NOT NULL,
  quantity_min NUMERIC,
  quantity_max NUMERIC,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Post process types
CREATE TABLE public.post_process_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pricing_model TEXT NOT NULL DEFAULT 'PER_KG', -- PER_KG, PER_M2, PER_PART
  setup_fee NUMERIC DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  minimum_lot_charge NUMERIC DEFAULT 0,
  default_lead_time_days INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RFQ (Request for Quote)
CREATE TABLE public.quick_quote_rfqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_name TEXT,
  customer_code TEXT,
  rfq_reference TEXT,
  received_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT DEFAULT 'OPEN', -- OPEN, QUOTED, WON, LOST
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RFQ Parts
CREATE TABLE public.quick_quote_rfq_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.quick_quote_rfqs(id) ON DELETE CASCADE,
  part_number TEXT,
  description TEXT,
  material_id UUID REFERENCES public.quote_materials(id),
  material_text_raw TEXT, -- Text extracted from PDF
  estimated_net_weight_kg NUMERIC,
  estimated_surface_area_m2 NUMERIC,
  quantity_requested INTEGER DEFAULT 1,
  drawing_file_url TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RFQ Part Post Processes
CREATE TABLE public.quick_quote_rfq_part_post_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_part_id UUID NOT NULL REFERENCES public.quick_quote_rfq_parts(id) ON DELETE CASCADE,
  post_process_type_id UUID NOT NULL REFERENCES public.post_process_types(id),
  complexity_level TEXT DEFAULT 'A', -- A, B, C
  override_unit_cost NUMERIC,
  override_setup_fee NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quotes
CREATE TABLE public.quick_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.quick_quote_rfqs(id) ON DELETE CASCADE,
  quote_number TEXT,
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  currency TEXT DEFAULT 'EUR',
  global_margin_percent NUMERIC DEFAULT 0.20, -- 20%
  status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, REJECTED
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quote Lines
CREATE TABLE public.quick_quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quick_quotes(id) ON DELETE CASCADE,
  rfq_part_id UUID NOT NULL REFERENCES public.quick_quote_rfq_parts(id),
  quantity INTEGER DEFAULT 1,
  material_cost_per_part NUMERIC,
  post_process_cost_per_part_total NUMERIC,
  manufacturing_cost_per_part NUMERIC DEFAULT 0,
  total_cost_per_part NUMERIC,
  sales_price_per_part NUMERIC,
  sales_price_total NUMERIC,
  lead_time_days INTEGER,
  line_margin_percent NUMERIC, -- Optional override
  -- PERT estimation data for audit
  pert_low NUMERIC,
  pert_most_likely NUMERIC,
  pert_high NUMERIC,
  pert_expected NUMERIC,
  pert_contingency NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quick Quote Settings
CREATE TABLE public.quick_quote_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.quick_quote_settings (setting_key, setting_value, description) VALUES
  ('use_p80_estimate', 'false', 'Use P80 (conservative) instead of P50 (expected) for material cost'),
  ('contingency_low', '0.02', 'Contingency % for LOW volatility materials'),
  ('contingency_medium', '0.05', 'Contingency % for MEDIUM volatility materials'),
  ('contingency_high', '0.10', 'Contingency % for HIGH volatility materials'),
  ('complexity_multiplier_a', '1.0', 'Complexity multiplier for level A'),
  ('complexity_multiplier_b', '1.2', 'Complexity multiplier for level B'),
  ('complexity_multiplier_c', '1.5', 'Complexity multiplier for level C'),
  ('part_number_regex', 'PART.*?:\\s*([\\w-]+)|P\\/N.*?:\\s*([\\w-]+)', 'Regex to extract part number from PDF'),
  ('material_regex', 'MATERIAL.*?:\\s*([\\w\\s-]+)|MAT.*?:\\s*([\\w\\s-]+)', 'Regex to extract material from PDF');

-- Insert default post-process types
INSERT INTO public.post_process_types (name, pricing_model, setup_fee, unit_cost, minimum_lot_charge, default_lead_time_days) VALUES
  ('Passivation', 'PER_KG', 50, 5, 100, 3),
  ('Anodizing Type II', 'PER_M2', 75, 25, 150, 5),
  ('Anodizing Type III', 'PER_M2', 100, 40, 200, 7),
  ('Xylan Coating', 'PER_M2', 80, 35, 175, 5),
  ('Black Oxide', 'PER_KG', 40, 3, 80, 2),
  ('Nickel Plating', 'PER_M2', 120, 50, 250, 7),
  ('Zinc Plating', 'PER_KG', 45, 4, 90, 3);

-- Insert sample materials
INSERT INTO public.quote_materials (name, grade, form, density_kg_m3, default_yield, volatility_level) VALUES
  ('316L Stainless Steel', '316L', 'round bar', 7990, 0.55, 'MEDIUM'),
  ('304 Stainless Steel', '304', 'plate', 7930, 0.60, 'MEDIUM'),
  ('6082-T6 Aluminum', '6082-T6', 'plate', 2700, 0.65, 'LOW'),
  ('7075-T6 Aluminum', '7075-T6', 'round bar', 2810, 0.55, 'HIGH'),
  ('Ti-6Al-4V Titanium', 'Grade 5', 'round bar', 4430, 0.40, 'HIGH'),
  ('Inconel 718', '718', 'round bar', 8190, 0.35, 'HIGH'),
  ('PEEK', 'Natural', 'round bar', 1320, 0.50, 'HIGH'),
  ('Brass CZ121', 'CZ121', 'round bar', 8470, 0.70, 'LOW');

-- Enable RLS on all tables
ALTER TABLE public.quote_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_price_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_process_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_quote_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_quote_rfq_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_quote_rfq_part_post_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_quote_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Materials: Authenticated users can view, admins can manage
CREATE POLICY "Authenticated users can view materials" ON public.quote_materials
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage materials" ON public.quote_materials
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Material price records
CREATE POLICY "Authenticated users can view price records" ON public.material_price_records
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create price records" ON public.material_price_records
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage price records" ON public.material_price_records
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Post process types
CREATE POLICY "Authenticated users can view post processes" ON public.post_process_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage post processes" ON public.post_process_types
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RFQs: Users can manage their own
CREATE POLICY "Users can view all RFQs" ON public.quick_quote_rfqs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create RFQs" ON public.quick_quote_rfqs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RFQs" ON public.quick_quote_rfqs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all RFQs" ON public.quick_quote_rfqs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RFQ Parts
CREATE POLICY "Authenticated users can view RFQ parts" ON public.quick_quote_rfq_parts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage RFQ parts for their RFQs" ON public.quick_quote_rfq_parts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quick_quote_rfqs r WHERE r.id = rfq_id AND r.user_id = auth.uid())
  );

-- RFQ Part Post Processes
CREATE POLICY "Authenticated users can view RFQ part post processes" ON public.quick_quote_rfq_part_post_processes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage RFQ part post processes for their RFQs" ON public.quick_quote_rfq_part_post_processes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quick_quote_rfq_parts p
      JOIN public.quick_quote_rfqs r ON r.id = p.rfq_id
      WHERE p.id = rfq_part_id AND r.user_id = auth.uid()
    )
  );

-- Quotes
CREATE POLICY "Authenticated users can view quotes" ON public.quick_quotes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage quotes for their RFQs" ON public.quick_quotes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quick_quote_rfqs r WHERE r.id = rfq_id AND r.user_id = auth.uid())
  );

-- Quote Lines
CREATE POLICY "Authenticated users can view quote lines" ON public.quick_quote_lines
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage quote lines for their quotes" ON public.quick_quote_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quick_quotes q
      JOIN public.quick_quote_rfqs r ON r.id = q.rfq_id
      WHERE q.id = quote_id AND r.user_id = auth.uid()
    )
  );

-- Settings
CREATE POLICY "Authenticated users can view settings" ON public.quick_quote_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage settings" ON public.quick_quote_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_quote_materials_updated_at
  BEFORE UPDATE ON public.quote_materials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_post_process_types_updated_at
  BEFORE UPDATE ON public.post_process_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_quick_quote_rfqs_updated_at
  BEFORE UPDATE ON public.quick_quote_rfqs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_quick_quote_rfq_parts_updated_at
  BEFORE UPDATE ON public.quick_quote_rfq_parts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_quick_quotes_updated_at
  BEFORE UPDATE ON public.quick_quotes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_quick_quote_settings_updated_at
  BEFORE UPDATE ON public.quick_quote_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();