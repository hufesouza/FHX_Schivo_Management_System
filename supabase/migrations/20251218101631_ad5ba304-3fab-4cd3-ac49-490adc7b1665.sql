-- Add fields for BR revision workflow
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS br_needs_redo boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS br_redo_new_wo_number text DEFAULT null,
ADD COLUMN IF NOT EXISTS br_on_hold boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_br_id uuid REFERENCES public.work_orders(id),
ADD COLUMN IF NOT EXISTS revision_round integer DEFAULT 1;

-- Add index for parent BR lookup (for history tracking)
CREATE INDEX IF NOT EXISTS idx_work_orders_parent_br_id ON public.work_orders(parent_br_id);

-- Comment for clarity
COMMENT ON COLUMN public.work_orders.br_needs_redo IS 'If departments did not agree to White, does this BR need to be redone?';
COMMENT ON COLUMN public.work_orders.br_redo_new_wo_number IS 'New W/O number for the redo round';
COMMENT ON COLUMN public.work_orders.br_on_hold IS 'BR is placed on hold (departments did not agree, not redoing)';
COMMENT ON COLUMN public.work_orders.parent_br_id IS 'Reference to previous BR round for traceability';
COMMENT ON COLUMN public.work_orders.revision_round IS 'Which revision round this BR is (1 = original, 2+ = revisions)';