-- Create audit trail table for 21 CFR Part 11 compliance
CREATE TABLE public.quotation_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  action_type TEXT NOT NULL, -- 'drawing_upload', 'ai_interpretation', 'machine_selection', 'cycle_time_calculation', 'quotation_save'
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  part_name TEXT,
  material TEXT,
  machine_group TEXT,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  ai_prompt_version TEXT DEFAULT 'v1.0',
  request_payload JSONB, -- Stores deterministic inputs (without drawing data for privacy)
  response_summary JSONB, -- Stores key outputs
  cycle_time_result NUMERIC,
  drawing_stored BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance settings table
CREATE TABLE public.compliance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default compliance settings
INSERT INTO public.compliance_settings (setting_key, setting_value, description) VALUES
  ('store_uploaded_drawings', 'false', 'Whether to persist uploaded drawings after AI processing'),
  ('enable_audit_logs', 'true', 'Enable detailed audit logging for compliance'),
  ('ai_prompt_version', 'v1.0', 'Current version of the AI system prompt'),
  ('api_mode', 'openai_api_no_training', 'API mode identifier for compliance records');

-- Enable RLS on both tables
ALTER TABLE public.quotation_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_settings ENABLE ROW LEVEL SECURITY;

-- Audit trail policies - authenticated users can insert, admins can view all
CREATE POLICY "Authenticated users can create audit entries"
ON public.quotation_audit_trail
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own audit entries"
ON public.quotation_audit_trail
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit entries"
ON public.quotation_audit_trail
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Compliance settings policies - all authenticated can read, admins can modify
CREATE POLICY "Authenticated users can view compliance settings"
ON public.compliance_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update compliance settings"
ON public.compliance_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert compliance settings"
ON public.compliance_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for audit trail queries
CREATE INDEX idx_audit_trail_user_id ON public.quotation_audit_trail(user_id);
CREATE INDEX idx_audit_trail_quotation_id ON public.quotation_audit_trail(quotation_id);
CREATE INDEX idx_audit_trail_created_at ON public.quotation_audit_trail(created_at DESC);