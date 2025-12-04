-- Create daily meetings table
CREATE TABLE public.daily_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting customers table
CREATE TABLE public.meeting_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting topics table
CREATE TABLE public.meeting_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting flags table (the RAG status for each topic/customer)
CREATE TABLE public.meeting_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.daily_meetings(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.meeting_topics(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.meeting_customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'green', 'amber', 'red')),
  comment TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, topic_id, customer_id)
);

-- Create meeting participants table
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.daily_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_meetings
CREATE POLICY "Authenticated users can view meetings" ON public.daily_meetings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create meetings" ON public.daily_meetings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update meetings" ON public.daily_meetings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for meeting_customers
CREATE POLICY "Authenticated users can view customers" ON public.meeting_customers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage customers" ON public.meeting_customers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert customers" ON public.meeting_customers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for meeting_topics
CREATE POLICY "Authenticated users can view topics" ON public.meeting_topics
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage topics" ON public.meeting_topics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert topics" ON public.meeting_topics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for meeting_flags
CREATE POLICY "Authenticated users can view flags" ON public.meeting_flags
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage flags" ON public.meeting_flags
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for meeting_participants
CREATE POLICY "Authenticated users can view participants" ON public.meeting_participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage participants" ON public.meeting_participants
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default topics
INSERT INTO public.meeting_topics (name, display_order) VALUES
  ('Deliveries Commitments', 1),
  ('Quotation', 2),
  ('Development', 3),
  ('Quality', 4),
  ('Blue Review', 5);

-- Insert default customers
INSERT INTO public.meeting_customers (name, display_order) VALUES
  ('Distal Motion', 1),
  ('Forsight', 2),
  ('Intuitive', 3),
  ('Waters', 4),
  ('Stryker', 5);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_meetings_updated_at
  BEFORE UPDATE ON public.daily_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();