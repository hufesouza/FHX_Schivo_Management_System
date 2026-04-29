ALTER TABLE public.npi_parts
  ADD COLUMN IF NOT EXISTS material_supplier_id UUID REFERENCES public.npi_suppliers(id),
  ADD COLUMN IF NOT EXISTS material_supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS subcon_supplier_id UUID REFERENCES public.npi_suppliers(id);