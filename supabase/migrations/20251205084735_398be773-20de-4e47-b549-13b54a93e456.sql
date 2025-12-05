-- Create machines table
CREATE TABLE public.machines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  group_name TEXT NOT NULL,
  machine_type TEXT NOT NULL DEFAULT 'other',
  max_spindle_rpm INTEGER DEFAULT 10000,
  max_cutting_feedrate INTEGER DEFAULT 5000,
  rapid_rate_x INTEGER DEFAULT 30000,
  rapid_rate_y INTEGER DEFAULT 30000,
  rapid_rate_z INTEGER DEFAULT 20000,
  tool_change_time INTEGER DEFAULT 5,
  probing_time INTEGER DEFAULT 30,
  load_unload_time INTEGER DEFAULT 60,
  performance_factor NUMERIC(4,2) DEFAULT 1.0,
  suitable_for_prismatic BOOLEAN DEFAULT false,
  suitable_for_turned BOOLEAN DEFAULT false,
  suitable_for_small_detailed BOOLEAN DEFAULT false,
  suitable_for_5axis BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotations table
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  part_name TEXT,
  material TEXT,
  blank_type TEXT,
  blank_length NUMERIC,
  blank_width NUMERIC,
  blank_thickness NUMERIC,
  blank_diameter NUMERIC,
  order_quantity INTEGER DEFAULT 1,
  production_type TEXT DEFAULT 'prototype',
  tolerance_level TEXT DEFAULT 'medium',
  surface_finish TEXT DEFAULT 'standard',
  notes_to_ai TEXT,
  drawing_url TEXT,
  ai_interpretation JSONB,
  suggested_machine_id UUID REFERENCES public.machines(id),
  selected_machine_id UUID REFERENCES public.machines(id),
  calculated_cycle_time NUMERIC,
  total_machining_time NUMERIC,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Machines policies (viewable by all authenticated, editable by admins)
CREATE POLICY "Authenticated users can view machines" ON public.machines
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage machines" ON public.machines
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Quotations policies
CREATE POLICY "Users can view all quotations" ON public.quotations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create quotations" ON public.quotations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotations" ON public.quotations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all quotations" ON public.quotations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed machine data
INSERT INTO public.machines (resource, description, group_name, machine_type, max_spindle_rpm, max_cutting_feedrate, suitable_for_prismatic, suitable_for_5axis) VALUES
  ('Horiz1', 'Mazak Horizontal Machine 1', 'Horiz1', 'horizontal mill', 12000, 8000, true, false),
  ('Horiz2', 'Mazak Horizontal Machine 2', 'Horiz2', 'horizontal mill', 12000, 8000, true, false),
  ('Horiz3', 'Mazak Horizontal Machine 3', 'Horiz3', 'horizontal mill', 12000, 8000, true, false),
  ('Hurco1', 'Hurco Machine Centre 1', 'Hurco', '3-axis mill', 10000, 6000, true, false),
  ('Hurco2', 'Hurco Machine Centre 2', 'Hurco', '3-axis mill', 10000, 6000, true, false),
  ('Hurco3', 'Hurco Machine Centre 3', 'Hurco', '3-axis mill', 10000, 6000, true, false),
  ('Integrex1', 'Mazak Integrex 200', 'Integrex1', 'mill-turn', 12000, 10000, true, true),
  ('Integrex2', 'Mazak Integrex 100', 'Integrex2', 'mill-turn', 12000, 10000, true, true),
  ('Maho1', 'Maho1', 'Maho', '5-axis mill', 18000, 12000, true, true),
  ('Maho2', 'Maho2', 'Maho', '5-axis mill', 18000, 12000, true, true),
  ('Matsuura1', 'Matsuura1', 'Matsuura', '5-axis mill', 20000, 15000, true, true),
  ('Matsuura2', 'Matsuura2', 'Matsuura', '5-axis mill', 20000, 15000, true, true);

INSERT INTO public.machines (resource, description, group_name, machine_type, max_spindle_rpm, max_cutting_feedrate, suitable_for_turned) VALUES
  ('Mazak1', 'Mazak Lathe 1', 'Mazak', 'lathe', 4000, 3000, true),
  ('Mazak2', 'Mazak Lathe 2', 'Mazak', 'lathe', 4000, 3000, true),
  ('Mazak3', 'Mazak Lathe 3', 'Mazak', 'lathe', 4000, 3000, true),
  ('Mazak4', 'Mazak Lathe 4', 'Mazak', 'lathe', 4000, 3000, true),
  ('Mazak5', 'Mazak Lathe 5', 'Mazak', 'lathe', 4000, 3000, true);

INSERT INTO public.machines (resource, description, group_name, machine_type, max_spindle_rpm, max_cutting_feedrate, suitable_for_prismatic, suitable_for_5axis) VALUES
  ('Mori3000-1', 'Mori Seiki NMV 3000 DCG', 'Mori3000-1', '5-axis mill', 20000, 15000, true, true);

INSERT INTO public.machines (resource, description, group_name, machine_type, max_spindle_rpm, max_cutting_feedrate, suitable_for_prismatic, suitable_for_small_detailed) VALUES
  ('Roders1', 'Roders 1', 'Roders', '5-axis mill', 42000, 20000, true, true),
  ('Roders2', 'Roders 2', 'Roders', '5-axis mill', 42000, 20000, true, true),
  ('Roders3', 'Roders 3', 'Roders', '5-axis mill', 42000, 20000, true, true);

INSERT INTO public.machines (resource, description, group_name, machine_type, suitable_for_prismatic) VALUES
  ('RodersDeburr', 'Deburr Roders', 'RodersDeburr', 'deburr', true);

INSERT INTO public.machines (resource, description, group_name, machine_type, max_spindle_rpm, suitable_for_turned, suitable_for_small_detailed) VALUES
  ('SLHM16-1', 'Citizen M16 Slidinghead', 'SLH', 'sliding head', 10000, true, true),
  ('SLHM32-1', 'Citizen M32 Slidinghead', 'SLH', 'sliding head', 8000, true, true);