-- Add unique constraint for meeting_flags to enable proper upsert
-- This ensures one flag per meeting/topic/customer combination
ALTER TABLE public.meeting_flags 
ADD CONSTRAINT meeting_flags_meeting_topic_customer_unique 
UNIQUE (meeting_id, topic_id, customer_id);