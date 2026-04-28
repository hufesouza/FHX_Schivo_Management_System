
-- Customers
CREATE TABLE public.npi_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  account_owner TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Projects (planning)
CREATE TABLE public.npi_projects_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.npi_customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  engineer TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Machines
CREATE TABLE public.npi_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_name TEXT NOT NULL UNIQUE,
  machine_type TEXT,
  daily_available_hours NUMERIC NOT NULL DEFAULT 24,
  shift_pattern TEXT,
  status TEXT NOT NULL DEFAULT 'Available',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parts / Jobs
CREATE TABLE public.npi_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.npi_customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  project_id UUID REFERENCES public.npi_projects_planning(id) ON DELETE SET NULL,
  project_name TEXT,
  engineer TEXT,
  part_number TEXT NOT NULL,
  description TEXT,
  po TEXT,
  qty INTEGER DEFAULT 1,
  -- Material
  material TEXT,
  material_lead_time INTEGER,
  material_status TEXT DEFAULT 'Not Required',
  -- Tooling
  tooling TEXT,
  tooling_lead_time INTEGER,
  tooling_status TEXT DEFAULT 'Not Required',
  -- Dates
  committed_date DATE,
  best_commence_date DATE,
  ship_date DATE,
  -- Times (hours)
  cycle_time NUMERIC DEFAULT 0,
  development_time NUMERIC DEFAULT 0,
  total_required_time NUMERIC GENERATED ALWAYS AS (COALESCE(cycle_time,0) + COALESCE(development_time,0)) STORED,
  -- Allocation
  machine_id UUID REFERENCES public.npi_machines(id) ON DELETE SET NULL,
  machine_name TEXT,
  -- Status
  overall_status TEXT NOT NULL DEFAULT 'Not Started',
  -- Subcon
  subcon BOOLEAN DEFAULT false,
  supplier_name TEXT,
  type_of_service TEXT,
  subcon_lead_time INTEGER,
  subcon_status TEXT DEFAULT 'Not Required',
  -- Commercial
  sales_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_npi_parts_customer ON public.npi_parts(customer_id);
CREATE INDEX idx_npi_parts_project ON public.npi_parts(project_id);
CREATE INDEX idx_npi_parts_machine ON public.npi_parts(machine_id);
CREATE INDEX idx_npi_parts_status ON public.npi_parts(overall_status);

-- Machines a part can run on
CREATE TABLE public.npi_part_machine_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.npi_parts(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.npi_machines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(part_id, machine_id)
);

-- Machine schedule / allocation
CREATE TABLE public.npi_machine_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID REFERENCES public.npi_parts(id) ON DELETE CASCADE,
  part_number TEXT,
  customer_name TEXT,
  project_name TEXT,
  machine_id UUID REFERENCES public.npi_machines(id) ON DELETE SET NULL,
  machine_name TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  total_required_time NUMERIC NOT NULL DEFAULT 0,
  allocation_status TEXT NOT NULL DEFAULT 'Proposed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_npi_schedule_machine ON public.npi_machine_schedule(machine_id, start_date);
CREATE INDEX idx_npi_schedule_part ON public.npi_machine_schedule(part_id);

-- Tooling tracker
CREATE TABLE public.npi_tooling_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID REFERENCES public.npi_parts(id) ON DELETE CASCADE,
  part_number TEXT,
  tooling_description TEXT NOT NULL,
  required_status TEXT DEFAULT 'Required',
  ordered_status TEXT DEFAULT 'Not Ordered',
  supplier TEXT,
  expected_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Change log (for committed-date / allocation change emails)
CREATE TABLE public.npi_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID REFERENCES public.npi_parts(id) ON DELETE CASCADE,
  part_number TEXT,
  customer_name TEXT,
  project_name TEXT,
  field_changed TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_npi_change_log_part ON public.npi_change_log(part_id);

-- Email recipients (Settings-managed)
CREATE TABLE public.npi_email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'manager', -- 'planning_owner' (TO), 'manager' (CC), 'engineer' (CC)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated-at triggers
CREATE TRIGGER trg_npi_customers_updated BEFORE UPDATE ON public.npi_customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_npi_projects_planning_updated BEFORE UPDATE ON public.npi_projects_planning FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_npi_machines_updated BEFORE UPDATE ON public.npi_machines FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_npi_parts_updated BEFORE UPDATE ON public.npi_parts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_npi_machine_schedule_updated BEFORE UPDATE ON public.npi_machine_schedule FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_npi_tooling_tracker_updated BEFORE UPDATE ON public.npi_tooling_tracker FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_npi_email_recipients_updated BEFORE UPDATE ON public.npi_email_recipients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on all
ALTER TABLE public.npi_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_projects_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_part_machine_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_machine_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_tooling_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_email_recipients ENABLE ROW LEVEL SECURITY;

-- Standard policies: authenticated can SELECT/INSERT/UPDATE; admins can DELETE
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'npi_customers','npi_projects_planning','npi_machines','npi_parts',
    'npi_part_machine_options','npi_machine_schedule','npi_tooling_tracker',
    'npi_change_log','npi_email_recipients'
  ]) LOOP
    EXECUTE format('CREATE POLICY "auth_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);', t);
    EXECUTE format('CREATE POLICY "auth_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);', t);
    EXECUTE format('CREATE POLICY "auth_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);', t);
    EXECUTE format('CREATE POLICY "admin_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role));', t);
  END LOOP;
END $$;
