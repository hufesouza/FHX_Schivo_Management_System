CREATE TYPE public.ot_order_status AS ENUM ('New','Planning','In Progress','Waiting for Material','Waiting for Customer','On Hold','Completed','Shipped','Cancelled');

CREATE TABLE public.ot_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  customer_code text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ot_customers TO authenticated;
GRANT ALL ON public.ot_customers TO service_role;
ALTER TABLE public.ot_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage customers" ON public.ot_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ot_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ot_machines TO authenticated;
GRANT ALL ON public.ot_machines TO service_role;
ALTER TABLE public.ot_machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage machines" ON public.ot_machines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ot_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.ot_customers(id) ON DELETE SET NULL,
  customer_name text,
  po_number text,
  po_date date,
  file_path text,
  file_name text,
  file_type text,
  raw_extraction jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ot_purchase_orders TO authenticated;
GRANT ALL ON public.ot_purchase_orders TO service_role;
ALTER TABLE public.ot_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage purchase orders" ON public.ot_purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ot_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES public.ot_purchase_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.ot_customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  po_number text,
  po_date date,
  line_number integer,
  part_number text,
  part_description text,
  quantity numeric,
  due_date date,
  unit_price numeric,
  total_price numeric,
  notes text,
  requirements text,
  special_requirements text,
  status public.ot_order_status NOT NULL DEFAULT 'New',
  machine_id uuid REFERENCES public.ot_machines(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ot_orders TO authenticated;
GRANT ALL ON public.ot_orders TO service_role;
ALTER TABLE public.ot_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage orders" ON public.ot_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX ot_orders_due_date_idx ON public.ot_orders (due_date);
CREATE INDEX ot_orders_customer_idx ON public.ot_orders (customer_id);
CREATE INDEX ot_orders_po_idx ON public.ot_orders (purchase_order_id);

CREATE TRIGGER ot_customers_set_updated_at BEFORE UPDATE ON public.ot_customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ot_machines_set_updated_at BEFORE UPDATE ON public.ot_machines FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ot_purchase_orders_set_updated_at BEFORE UPDATE ON public.ot_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ot_orders_set_updated_at BEFORE UPDATE ON public.ot_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();