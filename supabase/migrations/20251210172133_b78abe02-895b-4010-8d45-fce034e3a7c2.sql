-- Drop the old unique constraint that only used (process_order, department)
ALTER TABLE public.production_jobs DROP CONSTRAINT IF EXISTS production_jobs_process_order_dept_unique;