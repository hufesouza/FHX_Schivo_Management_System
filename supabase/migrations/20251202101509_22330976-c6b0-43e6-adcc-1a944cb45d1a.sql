-- Create invitations table for email invites
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, token)
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage invitations
CREATE POLICY "Admins can view all invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitations"
ON public.invitations FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitations"
ON public.invitations FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create form_fields table for dynamic form questions
CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('engineering', 'operations', 'quality', 'npi_final', 'supply_chain')),
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('yes_no', 'text', 'number', 'textarea', 'select')),
  label TEXT NOT NULL,
  placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB, -- For select fields
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section, field_key)
);

-- Enable RLS
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

-- Everyone can view active form fields
CREATE POLICY "Anyone can view active form fields"
ON public.form_fields FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can view all form fields
CREATE POLICY "Admins can view all form fields"
ON public.form_fields FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can manage form fields
CREATE POLICY "Admins can create form fields"
ON public.form_fields FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update form fields"
ON public.form_fields FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete form fields"
ON public.form_fields FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_form_fields_updated_at
  BEFORE UPDATE ON public.form_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default form fields for each section
-- Engineering Review fields
INSERT INTO public.form_fields (section, field_key, field_type, label, placeholder, required, display_order) VALUES
('engineering', 'drawings_available', 'yes_no', 'Are all drawings available and at the correct revision?', NULL, true, 1),
('engineering', 'drawings_details', 'textarea', 'Drawings Details', 'Enter details if No...', false, 2),
('engineering', 'tooling_in_matrix', 'yes_no', 'Is all tooling available and documented in matrix?', NULL, true, 3),
('engineering', 'tooling_details', 'textarea', 'Tooling Details', 'Enter details if No...', false, 4),
('engineering', 'tooling_lead_time', 'text', 'Lead Time for Missing Tooling', 'Enter lead time...', false, 5),
('engineering', 'fixtures_required', 'yes_no', 'Are any fixtures required?', NULL, true, 6),
('engineering', 'fixtures_details', 'textarea', 'Fixtures Details', 'Enter details...', false, 7),
('engineering', 'fixtures_lead_time', 'text', 'Lead Time for Fixtures', 'Enter lead time...', false, 8),
('engineering', 'cmm_program_required', 'yes_no', 'Is CMM program required?', NULL, true, 9),
('engineering', 'cmm_program_details', 'textarea', 'CMM Program Details', 'Enter details...', false, 10),
('engineering', 'cmm_lead_time', 'text', 'Lead Time for CMM Program', 'Enter lead time...', false, 11),
('engineering', 'gauges_calibrated', 'yes_no', 'Are all gauges calibrated and available?', NULL, true, 12),
('engineering', 'gauges_details', 'textarea', 'Gauges Details', 'Enter details if No...', false, 13),
('engineering', 'est_setup_time', 'number', 'Estimated Setup Time (hours)', 'Enter hours...', false, 14),
('engineering', 'est_cycle_time', 'number', 'Estimated Cycle Time (minutes)', 'Enter minutes...', false, 15),
('engineering', 'est_development_time', 'number', 'Estimated Development Time (hours)', 'Enter hours...', false, 16),
('engineering', 'est_tooling_cost', 'number', 'Estimated Tooling Cost ($)', 'Enter cost...', false, 17);

-- Operations Review fields
INSERT INTO public.form_fields (section, field_key, field_type, label, placeholder, required, display_order) VALUES
('operations', 'material_size_correct', 'yes_no', 'Is the material size correct and available?', NULL, true, 1),
('operations', 'material_size_details', 'textarea', 'Material Size Details', 'Enter details if No...', false, 2),
('operations', 'material_size_allowance', 'text', 'Material Size Allowance', 'Enter allowance...', false, 3),
('operations', 'material_leadtime', 'text', 'Material Lead Time', 'Enter lead time...', false, 4),
('operations', 'inspection_time', 'number', 'Inspection Time (minutes)', 'Enter minutes...', false, 5),
('operations', 'deburr_time', 'number', 'Deburr Time (minutes)', 'Enter minutes...', false, 6),
('operations', 'wash_time', 'number', 'Wash Time (minutes)', 'Enter minutes...', false, 7),
('operations', 'operations_comments', 'textarea', 'Additional Comments', 'Enter any additional comments...', false, 8);

-- Quality Review fields
INSERT INTO public.form_fields (section, field_key, field_type, label, placeholder, required, display_order) VALUES
('quality', 'fair_complete', 'yes_no', 'Is FAIR complete and approved?', NULL, true, 1),
('quality', 'fair_details', 'textarea', 'FAIR Details', 'Enter details if No...', false, 2),
('quality', 'inspection_sheet_available', 'yes_no', 'Is inspection sheet available?', NULL, true, 3),
('quality', 'inspection_sheet_details', 'textarea', 'Inspection Sheet Details', 'Enter details if No...', false, 4),
('quality', 'inspection_aql_specified', 'yes_no', 'Is inspection AQL specified?', NULL, true, 5),
('quality', 'inspection_aql_details', 'textarea', 'AQL Details', 'Enter details if No...', false, 6),
('quality', 'quality_gauges_calibrated', 'yes_no', 'Are all quality gauges calibrated?', NULL, true, 7),
('quality', 'quality_gauges_details', 'textarea', 'Quality Gauges Details', 'Enter details if No...', false, 8),
('quality', 'quality_additional_requirements', 'yes_no', 'Are there any additional quality requirements?', NULL, true, 9),
('quality', 'quality_additional_details', 'textarea', 'Additional Requirements Details', 'Enter details...', false, 10);

-- NPI Final Review fields
INSERT INTO public.form_fields (section, field_key, field_type, label, placeholder, required, display_order) VALUES
('npi_final', 'all_sections_filled', 'yes_no', 'Are all sections filled and complete?', NULL, true, 1),
('npi_final', 'all_sections_details', 'textarea', 'Sections Details', 'Enter details if No...', false, 2),
('npi_final', 'approval_status_updated', 'yes_no', 'Has approval status been updated?', NULL, true, 3),
('npi_final', 'approval_status_details', 'textarea', 'Approval Status Details', 'Enter details if No...', false, 4),
('npi_final', 'additional_requirements', 'yes_no', 'Are there any additional requirements?', NULL, true, 5),
('npi_final', 'additional_requirements_details', 'textarea', 'Additional Requirements Details', 'Enter details...', false, 6),
('npi_final', 'npi_final_comments', 'textarea', 'Final Comments', 'Enter any final comments...', false, 7);

-- Supply Chain fields
INSERT INTO public.form_fields (section, field_key, field_type, label, placeholder, required, display_order) VALUES
('supply_chain', 'bom_hardware_available', 'yes_no', 'Is BOM hardware available?', NULL, true, 1),
('supply_chain', 'bom_hardware_details', 'textarea', 'BOM Hardware Details', 'Enter details if No...', false, 2),
('supply_chain', 'bom_lead_time', 'text', 'BOM Lead Time', 'Enter lead time...', false, 3),
('supply_chain', 'acceptable_to_change_white', 'yes_no', 'Is it acceptable to change to white tag?', NULL, true, 4),
('supply_chain', 'acceptable_to_change_details', 'textarea', 'Change Details', 'Enter details if No...', false, 5),
('supply_chain', 'ims_updated', 'yes_no', 'Has IMS been updated?', NULL, true, 6),
('supply_chain', 'ims_updated_details', 'textarea', 'IMS Update Details', 'Enter details if No...', false, 7),
('supply_chain', 'routing_operations_removed', 'yes_no', 'Have routing operations been removed?', NULL, true, 8),
('supply_chain', 'routing_operations_details', 'textarea', 'Routing Operations Details', 'Enter details if No...', false, 9),
('supply_chain', 'sap_changes_completed', 'yes_no', 'Have SAP changes been completed?', NULL, true, 10),
('supply_chain', 'sap_changes_details', 'textarea', 'SAP Changes Details', 'Enter details if No...', false, 11);