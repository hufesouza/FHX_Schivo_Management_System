CREATE TABLE public.ae_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  drawing_number TEXT,
  revision TEXT,
  filename_revision TEXT,
  revision_discrepancy BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  page_count INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed')),
  extraction JSONB,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ae_drawings TO authenticated;
GRANT ALL ON public.ae_drawings TO service_role;
ALTER TABLE public.ae_drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ae_drawings" ON public.ae_drawings FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.ae_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL UNIQUE,
  description TEXT,
  part_type TEXT NOT NULL DEFAULT 'component' CHECK (part_type IN ('finished_good','subassembly','component')),
  side TEXT NOT NULL DEFAULT 'common' CHECK (side IN ('left','right','common')),
  drawing_number TEXT,
  drawing_id UUID REFERENCES public.ae_drawings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ae_parts TO authenticated;
GRANT ALL ON public.ae_parts TO service_role;
ALTER TABLE public.ae_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ae_parts" ON public.ae_parts FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.ae_bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_part_id UUID NOT NULL REFERENCES public.ae_parts(id) ON DELETE CASCADE,
  child_part_id UUID NOT NULL REFERENCES public.ae_parts(id) ON DELETE CASCADE,
  item_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
  side TEXT NOT NULL DEFAULT 'common' CHECK (side IN ('left','right','common')),
  source_drawing_id UUID REFERENCES public.ae_drawings(id) ON DELETE SET NULL,
  source_page INTEGER,
  source_row TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_part_id, item_number, side)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ae_bom_items TO authenticated;
GRANT ALL ON public.ae_bom_items TO service_role;
ALTER TABLE public.ae_bom_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ae_bom_items" ON public.ae_bom_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.ae_process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_part_id UUID NOT NULL REFERENCES public.ae_parts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instruction TEXT,
  source_wording TEXT,
  origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('drawing','manual','ai')),
  bom_item_ids UUID[] NOT NULL DEFAULT '{}',
  predecessor_ids UUID[] NOT NULL DEFAULT '{}',
  tools TEXT,
  specs TEXT,
  inspection TEXT,
  source_drawing_id UUID REFERENCES public.ae_drawings(id) ON DELETE SET NULL,
  source_page INTEGER,
  source_note TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed')),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ae_process_steps TO authenticated;
GRANT ALL ON public.ae_process_steps TO service_role;
ALTER TABLE public.ae_process_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ae_process_steps" ON public.ae_process_steps FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.ae_bom_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_part_id = NEW.child_part_id THEN
    RAISE EXCEPTION 'A part cannot be a component of itself';
  END IF;
  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT parent_part_id AS part_id FROM public.ae_bom_items WHERE child_part_id = NEW.parent_part_id
      UNION
      SELECT b.parent_part_id FROM public.ae_bom_items b JOIN ancestors a ON b.child_part_id = a.part_id
    )
    SELECT 1 FROM ancestors WHERE part_id = NEW.child_part_id
  ) THEN
    RAISE EXCEPTION 'Circular BOM relationship detected';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ae_bom_items_guard BEFORE INSERT OR UPDATE ON public.ae_bom_items FOR EACH ROW EXECUTE FUNCTION public.ae_bom_guard();

CREATE TRIGGER ae_drawings_set_updated_at BEFORE UPDATE ON public.ae_drawings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ae_parts_set_updated_at BEFORE UPDATE ON public.ae_parts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ae_bom_items_set_updated_at BEFORE UPDATE ON public.ae_bom_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ae_process_steps_set_updated_at BEFORE UPDATE ON public.ae_process_steps FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();