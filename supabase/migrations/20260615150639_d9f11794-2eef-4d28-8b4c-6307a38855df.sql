ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS scheduling_mode text NOT NULL DEFAULT 'Exclusive' CHECK (scheduling_mode IN ('Exclusive','Parallel'));

-- Default common parallel categories/types
UPDATE public.resources SET scheduling_mode = 'Parallel'
WHERE resource_category IN ('Subcontractor','Inspection')
   OR resource_type ILIKE ANY (ARRAY['%deburr%','%wash%','%passivation%','%anodi%','%heat treat%','%inspection%','%subcon%']);