ALTER TABLE public.jobs DROP CONSTRAINT jobs_part_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE CASCADE;