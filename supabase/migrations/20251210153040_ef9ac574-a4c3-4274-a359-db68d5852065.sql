-- Add operation_no column to production_jobs
ALTER TABLE public.production_jobs 
ADD COLUMN operation_no text DEFAULT '';

-- Drop the old unique constraint and create new one with operation_no
ALTER TABLE public.production_jobs 
DROP CONSTRAINT IF EXISTS production_jobs_process_order_department_key;

ALTER TABLE public.production_jobs 
ADD CONSTRAINT production_jobs_process_order_operation_department_key 
UNIQUE (process_order, operation_no, department);