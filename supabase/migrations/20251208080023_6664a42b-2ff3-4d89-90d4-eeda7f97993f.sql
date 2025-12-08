-- Create personal_actions table for the action manager
CREATE TABLE public.personal_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  owner_id uuid,
  owner_name text,
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  status text NOT NULL DEFAULT 'open',
  comments text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_actions ENABLE ROW LEVEL SECURITY;

-- Only the owner can manage their personal actions
CREATE POLICY "Users can view own personal actions"
ON public.personal_actions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own personal actions"
ON public.personal_actions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal actions"
ON public.personal_actions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal actions"
ON public.personal_actions
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_personal_actions_updated_at
BEFORE UPDATE ON public.personal_actions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();