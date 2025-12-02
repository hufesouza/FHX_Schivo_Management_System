-- Create work_orders table for Blue Work Order Review form
CREATE TABLE public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'completed')),
  
  -- Header Info
  customer TEXT,
  part_and_rev TEXT,
  work_order_number TEXT,
  icn_number TEXT,
  
  -- Engineering Review - Process Parameter Estimation
  est_development_time INTEGER,
  est_setup_time INTEGER,
  est_cycle_time INTEGER,
  est_tooling_cost DECIMAL,
  tooling_lead_time TEXT,
  deburr_time INTEGER,
  wash_time INTEGER,
  inspection_time INTEGER,
  
  -- Engineering Review - Raw Material
  material_size_allowance TEXT,
  material_leadtime TEXT,
  material_size_correct BOOLEAN,
  material_size_details TEXT,
  
  -- Engineering Review - BOM
  bom_hardware_available BOOLEAN,
  bom_hardware_details TEXT,
  bom_lead_time TEXT,
  
  -- Engineering Review - Drawing & Specifications
  drawings_available BOOLEAN,
  drawings_details TEXT,
  
  -- Engineering Review - Tooling & Fixturing
  tooling_in_matrix BOOLEAN,
  tooling_details TEXT,
  fixtures_required BOOLEAN,
  fixtures_details TEXT,
  fixtures_lead_time TEXT,
  
  -- Engineering Review - Gauges & Standards
  gauges_calibrated BOOLEAN,
  gauges_details TEXT,
  cmm_program_required BOOLEAN,
  cmm_program_details TEXT,
  cmm_lead_time TEXT,
  
  -- Engineering Review - Inspection Sheet
  inspection_sheet_available BOOLEAN,
  inspection_sheet_details TEXT,
  
  -- Engineering Review - Additional Requirements
  additional_requirements BOOLEAN,
  additional_requirements_details TEXT,
  
  -- Engineering Signatures
  engineering_approved_by TEXT,
  engineering_approved_date DATE,
  npi_approval_by TEXT,
  npi_approval_date DATE,
  
  -- Operations Review - Work Centre data (stored as JSON for flexibility)
  operations_work_centres JSONB DEFAULT '[]'::jsonb,
  operations_comments TEXT,
  
  -- Quality Review
  fair_complete BOOLEAN,
  fair_details TEXT,
  inspection_aql_specified BOOLEAN,
  inspection_aql_details TEXT,
  quality_gauges_calibrated BOOLEAN,
  quality_gauges_details TEXT,
  quality_additional_requirements BOOLEAN,
  quality_additional_details TEXT,
  quality_signature TEXT,
  quality_signature_date DATE,
  
  -- Final Review NPI
  all_sections_filled BOOLEAN,
  all_sections_details TEXT,
  acceptable_to_change_white BOOLEAN,
  acceptable_to_change_details TEXT,
  npi_final_comments TEXT,
  npi_final_signature TEXT,
  npi_final_signature_date DATE,
  
  -- Supply Chain Administration
  sap_changes_completed BOOLEAN,
  sap_changes_details TEXT,
  ims_updated BOOLEAN,
  ims_updated_details TEXT,
  approval_status_updated BOOLEAN,
  approval_status_details TEXT,
  routing_operations_removed BOOLEAN,
  routing_operations_details TEXT,
  supply_chain_signature TEXT,
  supply_chain_signature_date DATE
);

-- Enable Row Level Security
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - same access for all authenticated users
CREATE POLICY "Users can view all work orders"
ON public.work_orders
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create work orders"
ON public.work_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update any work order"
ON public.work_orders
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete their own work orders"
ON public.work_orders
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();