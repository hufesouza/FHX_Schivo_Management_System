-- Add review workflow columns to quotation_enquiries
ALTER TABLE public.quotation_enquiries 
ADD COLUMN IF NOT EXISTS approver_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approver_name text,
ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS review_comments text,
ADD COLUMN IF NOT EXISTS total_quoted_value numeric,
ADD COLUMN IF NOT EXISTS average_margin numeric;

-- Create quotation_review_tasks table for tracking review tasks
CREATE TABLE IF NOT EXISTS public.quotation_review_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.quotation_enquiries(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES auth.users(id),
  assigned_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  task_type text NOT NULL DEFAULT 'review' CHECK (task_type IN ('review', 'revision')),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(enquiry_id, assigned_to, status)
);

-- Enable RLS
ALTER TABLE public.quotation_review_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotation_review_tasks
CREATE POLICY "Users can view their assigned tasks"
ON public.quotation_review_tasks
FOR SELECT
TO authenticated
USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Authenticated users can insert tasks"
ON public.quotation_review_tasks
FOR INSERT
TO authenticated
WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Users can update their tasks"
ON public.quotation_review_tasks
FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- Allow admins full access
CREATE POLICY "Admins can manage all tasks"
ON public.quotation_review_tasks
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));