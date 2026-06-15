UPDATE public.resources
SET scheduling_mode = 'Parallel',
    resource_category = CASE WHEN resource_name = 'Development / Engineering' THEN 'Manufacturing' ELSE resource_category END
WHERE resource_name = 'Development / Engineering'
   OR resource_category = 'Subcontractor'
   OR resource_type ILIKE ANY (ARRAY['%inspection%','%deburr%','%wash%','%subcontractor%','%subcon%','%passivation%','%anodi%','%heat treat%']);