-- Create meeting_actions table for tracking action items
CREATE TABLE public.meeting_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.daily_meetings(id) ON DELETE CASCADE,
  action text NOT NULL,
  owner_id uuid REFERENCES auth.users(id),
  owner_name text,
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  status text NOT NULL DEFAULT 'open',
  comments text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.meeting_actions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view actions"
ON public.meeting_actions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create actions"
ON public.meeting_actions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update actions"
ON public.meeting_actions FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete actions"
ON public.meeting_actions FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_meeting_actions_updated_at
BEFORE UPDATE ON public.meeting_actions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();