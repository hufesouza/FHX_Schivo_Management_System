
-- ============================================
-- NPI PROCESS ENFORCEMENT SYSTEM - FRESH START
-- ============================================

-- Drop existing NPI design transfer items (will be replaced by new phase-based system)
DROP TABLE IF EXISTS npi_design_transfer_items CASCADE;
DROP TABLE IF EXISTS npi_project_milestones CASCADE;
DROP TABLE IF EXISTS npi_project_team CASCADE;
DROP TABLE IF EXISTS npi_project_charter CASCADE;
DROP TABLE IF EXISTS npi_jobs CASCADE;
DROP TABLE IF EXISTS npi_prereq CASCADE;
DROP TABLE IF EXISTS npi_post_mc CASCADE;
DROP TABLE IF EXISTS npi_projects CASCADE;

-- ============================================
-- CORE NPI PROJECT TABLE
-- ============================================
CREATE TABLE public.npi_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_number TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  customer TEXT,
  description TEXT,
  project_type TEXT NOT NULL DEFAULT 'simple' CHECK (project_type IN ('simple', 'complex')),
  
  -- Current phase tracking (A through I)
  current_phase TEXT NOT NULL DEFAULT 'A_rfq_quotation' CHECK (current_phase IN (
    'A_rfq_quotation',
    'B_sales_npi_handshake', 
    'C_project_setup',
    'D_sap_item_creation',
    'E_design_transfer',
    'F_industrialisation',
    'G_blue_reviews',
    'H_validation',
    'I_transfer_to_manufacturing',
    'completed',
    'on_hold',
    'cancelled'
  )),
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled', 'quote_lost')),
  
  -- Key personnel
  project_manager_id UUID,
  sales_owner_id UUID,
  npi_lead_id UUID,
  
  -- Key dates
  rfq_received_date DATE,
  quote_submitted_date DATE,
  po_received_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  
  -- Key references
  quotation_reference TEXT,
  po_number TEXT,
  sap_part_number TEXT,
  work_order_number TEXT,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.npi_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view npi_projects" ON public.npi_projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert npi_projects" ON public.npi_projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update npi_projects" ON public.npi_projects
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete npi_projects" ON public.npi_projects
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- PROJECT CHARTER (WD-FRM-0012)
-- ============================================
CREATE TABLE public.npi_project_charter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  
  -- Charter fields from WD-FRM-0012
  purpose TEXT,
  project_owner TEXT,
  project_reference TEXT,
  project_description TEXT,
  expected_outcome TEXT,
  timelines_milestones TEXT,
  
  -- Approval
  approved_by_name TEXT,
  approved_by_position TEXT,
  approved_signature TEXT,
  approved_date DATE,
  is_approved BOOLEAN DEFAULT false,
  
  revision INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(project_id)
);

ALTER TABLE public.npi_project_charter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view npi_project_charter" ON public.npi_project_charter
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert npi_project_charter" ON public.npi_project_charter
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update npi_project_charter" ON public.npi_project_charter
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete npi_project_charter" ON public.npi_project_charter
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- PROJECT TEAM
-- ============================================
CREATE TABLE public.npi_project_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  responsibilities TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.npi_project_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage npi_project_team" ON public.npi_project_team
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- PHASE TASKS - The core of process enforcement
-- Each phase has specific tasks that MUST be completed
-- ============================================
CREATE TABLE public.npi_phase_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  
  -- Task identification
  phase TEXT NOT NULL,
  task_code TEXT NOT NULL, -- e.g., "A1", "E15", "G3"
  task_name TEXT NOT NULL,
  description TEXT,
  reference_document TEXT, -- e.g., "WD-FRM-0018", "WD-PRO-0020"
  
  -- Ownership (CRITICAL - only owner can complete)
  owner_department TEXT NOT NULL, -- PM, ENG, QA, SC, OPS, PRG, ADM, VAL, HR, F&M
  owner_id UUID,
  owner_name TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 
    'in_progress', 
    'completed', 
    'blocked',
    'not_applicable'
  )),
  
  -- Blocking logic
  is_blocking BOOLEAN DEFAULT true, -- If true, blocks phase progression
  blocked_by_task_id UUID, -- Task that is blocking this one
  blocker_reason TEXT,
  
  -- Evidence (MANDATORY for completion)
  evidence_required BOOLEAN DEFAULT true,
  evidence_type TEXT, -- 'upload', 'reference_id', 'approval', 'signature'
  evidence_file_url TEXT,
  evidence_reference TEXT, -- e.g., SAP number, document ID
  evidence_notes TEXT,
  
  -- Dates
  due_date DATE,
  started_date DATE,
  completed_date DATE,
  completed_by UUID,
  completed_by_name TEXT,
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, task_code)
);

ALTER TABLE public.npi_phase_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view npi_phase_tasks" ON public.npi_phase_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert npi_phase_tasks" ON public.npi_phase_tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update npi_phase_tasks" ON public.npi_phase_tasks
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete npi_phase_tasks" ON public.npi_phase_tasks
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- PHASE GATES - Hard checkpoints between phases
-- ============================================
CREATE TABLE public.npi_phase_gates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  
  from_phase TEXT NOT NULL,
  to_phase TEXT NOT NULL,
  gate_name TEXT NOT NULL,
  
  -- Gate requirements
  all_tasks_complete BOOLEAN DEFAULT false,
  evidence_verified BOOLEAN DEFAULT false,
  
  -- Approvals required
  requires_qa_approval BOOLEAN DEFAULT false,
  qa_approved_by UUID,
  qa_approved_date TIMESTAMPTZ,
  
  requires_sc_approval BOOLEAN DEFAULT false,
  sc_approved_by UUID,
  sc_approved_date TIMESTAMPTZ,
  
  requires_pm_approval BOOLEAN DEFAULT false,
  pm_approved_by UUID,
  pm_approved_date TIMESTAMPTZ,
  
  requires_ops_approval BOOLEAN DEFAULT false,
  ops_approved_by UUID,
  ops_approved_date TIMESTAMPTZ,
  
  -- Gate status
  is_passed BOOLEAN DEFAULT false,
  passed_date TIMESTAMPTZ,
  passed_by UUID,
  
  -- Override (for warnings mode)
  is_overridden BOOLEAN DEFAULT false,
  override_reason TEXT,
  overridden_by UUID,
  overridden_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, from_phase, to_phase)
);

ALTER TABLE public.npi_phase_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view npi_phase_gates" ON public.npi_phase_gates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert npi_phase_gates" ON public.npi_phase_gates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update npi_phase_gates" ON public.npi_phase_gates
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete npi_phase_gates" ON public.npi_phase_gates
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- HANDSHAKES - Cross-functional confirmations
-- ============================================
CREATE TABLE public.npi_handshakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  
  handshake_type TEXT NOT NULL, -- 'sales_to_npi', 'npi_to_ops', 'ops_to_qa', etc.
  
  -- From party
  from_party_role TEXT NOT NULL,
  from_party_id UUID,
  from_party_name TEXT,
  from_confirmed BOOLEAN DEFAULT false,
  from_confirmed_date TIMESTAMPTZ,
  from_notes TEXT,
  
  -- To party
  to_party_role TEXT NOT NULL,
  to_party_id UUID,
  to_party_name TEXT,
  to_confirmed BOOLEAN DEFAULT false,
  to_confirmed_date TIMESTAMPTZ,
  to_notes TEXT,
  
  -- Handshake complete when both confirm
  is_complete BOOLEAN GENERATED ALWAYS AS (from_confirmed AND to_confirmed) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.npi_handshakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage npi_handshakes" ON public.npi_handshakes
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- BLUE REVIEW TRACKING (5 stages)
-- ============================================
CREATE TABLE public.npi_blue_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  work_order_id UUID, -- Link to existing work_orders table
  
  -- Stage tracking
  stage_1_complete BOOLEAN DEFAULT false, -- Engineering, Programming, NPI, Quality, Purchasing
  stage_1_approved_by UUID,
  stage_1_approved_date TIMESTAMPTZ,
  
  stage_2_complete BOOLEAN DEFAULT false, -- Manufacturing, Setter, Operator
  stage_2_approved_by UUID,
  stage_2_approved_date TIMESTAMPTZ,
  
  stage_3_complete BOOLEAN DEFAULT false, -- Quality Inspection
  stage_3_approved_by UUID,
  stage_3_approved_date TIMESTAMPTZ,
  
  stage_4_complete BOOLEAN DEFAULT false, -- NPI Team Review
  stage_4_approved_by UUID,
  stage_4_approved_date TIMESTAMPTZ,
  
  stage_5_complete BOOLEAN DEFAULT false, -- Administration/SAP
  stage_5_approved_by UUID,
  stage_5_approved_date TIMESTAMPTZ,
  
  -- Overall status
  all_stages_complete BOOLEAN GENERATED ALWAYS AS (
    stage_1_complete AND stage_2_complete AND stage_3_complete AND 
    stage_4_complete AND stage_5_complete
  ) STORED,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.npi_blue_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage npi_blue_reviews" ON public.npi_blue_reviews
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- AUDIT TRAIL - All actions logged
-- ============================================
CREATE TABLE public.npi_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  
  action_type TEXT NOT NULL, -- 'task_completed', 'gate_passed', 'phase_advanced', 'override', etc.
  action_description TEXT NOT NULL,
  
  entity_type TEXT, -- 'task', 'gate', 'handshake', 'project'
  entity_id UUID,
  
  old_value JSONB,
  new_value JSONB,
  
  performed_by UUID NOT NULL,
  performed_by_name TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE public.npi_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view npi_audit_log" ON public.npi_audit_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert npi_audit_log" ON public.npi_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- EVIDENCE ATTACHMENTS
-- ============================================
CREATE TABLE public.npi_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.npi_phase_tasks(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  
  description TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_by_name TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.npi_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage npi_evidence" ON public.npi_evidence
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- MILESTONES (for Gantt chart)
-- ============================================
CREATE TABLE public.npi_project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  
  milestone_name TEXT NOT NULL,
  phase TEXT NOT NULL,
  target_date DATE,
  actual_date DATE,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  
  notes TEXT,
  approved_by TEXT,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.npi_project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view npi_project_milestones" ON public.npi_project_milestones
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert npi_project_milestones" ON public.npi_project_milestones
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update npi_project_milestones" ON public.npi_project_milestones
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete npi_project_milestones" ON public.npi_project_milestones
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE TRIGGER update_npi_projects_updated_at
  BEFORE UPDATE ON public.npi_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_npi_project_charter_updated_at
  BEFORE UPDATE ON public.npi_project_charter
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_npi_phase_tasks_updated_at
  BEFORE UPDATE ON public.npi_phase_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_npi_phase_gates_updated_at
  BEFORE UPDATE ON public.npi_phase_gates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_npi_handshakes_updated_at
  BEFORE UPDATE ON public.npi_handshakes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_npi_blue_reviews_updated_at
  BEFORE UPDATE ON public.npi_blue_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_npi_project_milestones_updated_at
  BEFORE UPDATE ON public.npi_project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_npi_projects_current_phase ON public.npi_projects(current_phase);
CREATE INDEX idx_npi_projects_status ON public.npi_projects(status);
CREATE INDEX idx_npi_phase_tasks_project_phase ON public.npi_phase_tasks(project_id, phase);
CREATE INDEX idx_npi_phase_tasks_status ON public.npi_phase_tasks(status);
CREATE INDEX idx_npi_phase_gates_project ON public.npi_phase_gates(project_id);
CREATE INDEX idx_npi_audit_log_project ON public.npi_audit_log(project_id);
CREATE INDEX idx_npi_audit_log_performed_at ON public.npi_audit_log(performed_at);
