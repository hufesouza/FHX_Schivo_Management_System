-- Create meeting_recognitions table
CREATE TABLE public.meeting_recognitions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES public.daily_meetings(id) ON DELETE CASCADE,
    recognized_user_id UUID,
    recognized_user_name TEXT NOT NULL,
    recognized_by_id UUID,
    recognized_by_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_recognitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view recognitions"
ON public.meeting_recognitions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create recognitions"
ON public.meeting_recognitions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete recognitions"
ON public.meeting_recognitions
FOR DELETE
USING (auth.uid() IS NOT NULL);