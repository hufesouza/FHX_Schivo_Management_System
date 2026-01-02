// ============================================
// NPI PROCESS ENFORCEMENT SYSTEM - TYPES
// Based on WD-PRO-0005, WD-FRM-0012, WD-FRM-0013
// ============================================

// ============================================
// PHASE DEFINITIONS (A through I)
// ============================================
export const NPI_PHASES = [
  { 
    value: 'A_rfq_quotation', 
    label: 'A - RFQ & Quotation', 
    shortLabel: 'RFQ',
    color: 'bg-slate-500',
    description: 'Create technically sound quotation and baseline process definition'
  },
  { 
    value: 'B_sales_npi_handshake', 
    label: 'B - Sales → NPI Handshake', 
    shortLabel: 'Handshake',
    color: 'bg-blue-500',
    description: 'Formal transfer of ownership and knowledge'
  },
  { 
    value: 'C_project_setup', 
    label: 'C - Project Setup', 
    shortLabel: 'Setup',
    color: 'bg-indigo-500',
    description: 'Formally structure the project'
  },
  { 
    value: 'D_sap_item_creation', 
    label: 'D - SAP Item Creation', 
    shortLabel: 'SAP',
    color: 'bg-purple-500',
    description: 'Ensure correct creation of the part in SAP'
  },
  { 
    value: 'E_design_transfer', 
    label: 'E - Design Transfer', 
    shortLabel: 'Design Transfer',
    color: 'bg-pink-500',
    description: 'Ensure full manufacturing readiness (WD-FRM-0013)'
  },
  { 
    value: 'F_industrialisation', 
    label: 'F - Industrialisation', 
    shortLabel: 'Industrial',
    color: 'bg-orange-500',
    description: 'Supply chain, engineering, programming execution'
  },
  { 
    value: 'G_blue_reviews', 
    label: 'G - Blue Reviews', 
    shortLabel: 'Blue Review',
    color: 'bg-cyan-500',
    description: 'pFMEA, first build, 5-stage Blue Review gates'
  },
  { 
    value: 'H_validation', 
    label: 'H - Validation', 
    shortLabel: 'Validation',
    color: 'bg-teal-500',
    description: 'IQ/OQ/PQ and approvals (if applicable)'
  },
  { 
    value: 'I_transfer_to_manufacturing', 
    label: 'I - Transfer to Standard Mfg', 
    shortLabel: 'Transfer',
    color: 'bg-green-500',
    description: 'Final handover to Operations'
  },
  { 
    value: 'completed', 
    label: 'Completed', 
    shortLabel: 'Done',
    color: 'bg-emerald-600',
    description: 'NPI Closed - Standard Manufacturing Active'
  },
  { 
    value: 'on_hold', 
    label: 'On Hold', 
    shortLabel: 'Hold',
    color: 'bg-amber-500',
    description: 'Project temporarily paused'
  },
  { 
    value: 'cancelled', 
    label: 'Cancelled', 
    shortLabel: 'Cancelled',
    color: 'bg-red-500',
    description: 'Project cancelled'
  },
] as const;

export type NPIPhase = typeof NPI_PHASES[number]['value'];

export const PROJECT_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-amber-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'quote_lost', label: 'Quote Lost', color: 'bg-gray-500' },
] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number]['value'];

// ============================================
// OWNER DEPARTMENTS
// ============================================
export const OWNER_DEPARTMENTS = [
  { value: 'PM', label: 'Project Management', color: 'bg-blue-100 text-blue-800' },
  { value: 'ENG', label: 'Engineering', color: 'bg-purple-100 text-purple-800' },
  { value: 'QA', label: 'Quality', color: 'bg-green-100 text-green-800' },
  { value: 'SC', label: 'Supply Chain', color: 'bg-orange-100 text-orange-800' },
  { value: 'OPS', label: 'Operations', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'PRG', label: 'Programming', color: 'bg-pink-100 text-pink-800' },
  { value: 'ADM', label: 'Administration', color: 'bg-gray-100 text-gray-800' },
  { value: 'VAL', label: 'Validation', color: 'bg-teal-100 text-teal-800' },
  { value: 'HR', label: 'Human Resources', color: 'bg-amber-100 text-amber-800' },
  { value: 'F&M', label: 'Facilities & Maintenance', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'SALES', label: 'Sales', color: 'bg-red-100 text-red-800' },
] as const;

export type OwnerDepartment = typeof OWNER_DEPARTMENTS[number]['value'];

// ============================================
// TASK STATUS
// ============================================
export const TASK_STATUSES = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-800', icon: 'circle' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: 'clock' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800', icon: 'check-circle' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-800', icon: 'alert-circle' },
  { value: 'not_applicable', label: 'N/A', color: 'bg-slate-100 text-slate-800', icon: 'minus-circle' },
] as const;

export type TaskStatus = typeof TASK_STATUSES[number]['value'];

// ============================================
// CORE INTERFACES
// ============================================
export interface NPIProject {
  id: string;
  project_number: string;
  project_name: string;
  customer: string | null;
  description: string | null;
  project_type: 'simple' | 'complex';
  current_phase: NPIPhase;
  status: ProjectStatus;
  
  // Key personnel
  project_manager_id: string | null;
  sales_owner_id: string | null;
  npi_lead_id: string | null;
  
  // Key dates
  rfq_received_date: string | null;
  quote_submitted_date: string | null;
  po_received_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  
  // Key references
  quotation_reference: string | null;
  po_number: string | null;
  sap_part_number: string | null;
  work_order_number: string | null;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NPIProjectCharter {
  id: string;
  project_id: string;
  purpose: string | null;
  project_owner: string | null;
  project_reference: string | null;
  project_description: string | null;
  expected_outcome: string | null;
  timelines_milestones: string | null;
  approved_by_name: string | null;
  approved_by_position: string | null;
  approved_signature: string | null;
  approved_date: string | null;
  is_approved: boolean;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface NPIProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  department: string | null;
  responsibilities: string | null;
  is_active: boolean;
  created_at: string;
  // Joined
  email?: string;
  full_name?: string;
}

export interface NPIPhaseTask {
  id: string;
  project_id: string;
  phase: string;
  task_code: string;
  task_name: string;
  description: string | null;
  reference_document: string | null;
  owner_department: OwnerDepartment;
  owner_id: string | null;
  owner_name: string | null;
  status: TaskStatus;
  is_blocking: boolean;
  blocked_by_task_id: string | null;
  blocker_reason: string | null;
  evidence_required: boolean;
  evidence_type: string | null;
  evidence_file_url: string | null;
  evidence_reference: string | null;
  evidence_notes: string | null;
  due_date: string | null;
  started_date: string | null;
  completed_date: string | null;
  completed_by: string | null;
  completed_by_name: string | null;
  display_order: number;
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
}

export interface NPIPhaseGate {
  id: string;
  project_id: string;
  from_phase: string;
  to_phase: string;
  gate_name: string;
  all_tasks_complete: boolean;
  evidence_verified: boolean;
  requires_qa_approval: boolean;
  qa_approved_by: string | null;
  qa_approved_date: string | null;
  requires_sc_approval: boolean;
  sc_approved_by: string | null;
  sc_approved_date: string | null;
  requires_pm_approval: boolean;
  pm_approved_by: string | null;
  pm_approved_date: string | null;
  requires_ops_approval: boolean;
  ops_approved_by: string | null;
  ops_approved_date: string | null;
  is_passed: boolean;
  passed_date: string | null;
  passed_by: string | null;
  is_overridden: boolean;
  override_reason: string | null;
  overridden_by: string | null;
  overridden_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface NPIHandshake {
  id: string;
  project_id: string;
  handshake_type: string;
  from_party_role: string;
  from_party_id: string | null;
  from_party_name: string | null;
  from_confirmed: boolean;
  from_confirmed_date: string | null;
  from_notes: string | null;
  to_party_role: string;
  to_party_id: string | null;
  to_party_name: string | null;
  to_confirmed: boolean;
  to_confirmed_date: string | null;
  to_notes: string | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface NPIBlueReview {
  id: string;
  project_id: string;
  work_order_id: string | null;
  stage_1_complete: boolean;
  stage_1_approved_by: string | null;
  stage_1_approved_date: string | null;
  stage_2_complete: boolean;
  stage_2_approved_by: string | null;
  stage_2_approved_date: string | null;
  stage_3_complete: boolean;
  stage_3_approved_by: string | null;
  stage_3_approved_date: string | null;
  stage_4_complete: boolean;
  stage_4_approved_by: string | null;
  stage_4_approved_date: string | null;
  stage_5_complete: boolean;
  stage_5_approved_by: string | null;
  stage_5_approved_date: string | null;
  all_stages_complete: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NPIAuditLog {
  id: string;
  project_id: string;
  action_type: string;
  action_description: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  performed_by: string;
  performed_by_name: string | null;
  performed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface NPIEvidence {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_by: string;
  uploaded_by_name: string | null;
  uploaded_at: string;
}

export interface NPIProjectMilestone {
  id: string;
  project_id: string;
  milestone_name: string;
  phase: string;
  target_date: string | null;
  actual_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  notes: string | null;
  approved_by: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// EXTENDED PROJECT WITH RELATIONS
// ============================================
export interface NPIProjectWithRelations extends NPIProject {
  charter?: NPIProjectCharter | null;
  team?: NPIProjectTeamMember[];
  tasks?: NPIPhaseTask[];
  gates?: NPIPhaseGate[];
  handshakes?: NPIHandshake[];
  blue_reviews?: NPIBlueReview[];
  milestones?: NPIProjectMilestone[];
  audit_log?: NPIAuditLog[];
  
  // Joined personnel names
  project_manager?: { email: string; full_name: string } | null;
  sales_owner?: { email: string; full_name: string } | null;
  npi_lead?: { email: string; full_name: string } | null;
  
  // Computed stats
  phase_progress?: PhaseProgress[];
  blockers?: BlockerInfo[];
  next_action?: NextAction | null;
}

export interface PhaseProgress {
  phase: NPIPhase;
  total_tasks: number;
  completed_tasks: number;
  blocked_tasks: number;
  progress_percent: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
}

export interface BlockerInfo {
  task_id: string;
  task_name: string;
  task_code: string;
  phase: string;
  owner_department: string;
  owner_name: string | null;
  blocker_reason: string | null;
  missing_evidence: boolean;
}

export interface NextAction {
  task_id: string;
  task_name: string;
  task_code: string;
  phase: string;
  owner_department: string;
  owner_name: string | null;
  action_required: string;
}

// ============================================
// DEFAULT PHASE TASKS - Based on WD-PRO-0005 & WD-FRM-0013
// ============================================
export type DefaultTaskDef = Omit<NPIPhaseTask, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'owner_id' | 'owner_name' | 'completed_by' | 'completed_by_name' | 'completed_date' | 'started_date' | 'due_date' | 'evidence_file_url' | 'evidence_reference' | 'evidence_notes' | 'blocked_by_task_id' | 'blocker_reason'>;

export const DEFAULT_PHASE_TASKS: DefaultTaskDef[] = [
  // ============================================
  // PHASE A - RFQ & QUOTATION
  // ============================================
  { phase: 'A_rfq_quotation', task_code: 'A1', task_name: 'RFQ intake & registration', description: 'Register incoming RFQ and assign to team', reference_document: 'WD-PRO-0020', owner_department: 'SALES', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 1, is_mandatory: true },
  { phase: 'A_rfq_quotation', task_code: 'A2', task_name: 'Technical review of drawings & specs', description: 'Engineering review of customer drawings and specifications', reference_document: 'WD-PRO-0020', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 2, is_mandatory: true },
  { phase: 'A_rfq_quotation', task_code: 'A3', task_name: 'Process definition (preliminary)', description: 'Define preliminary manufacturing process', reference_document: 'WD-FRM-0018', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 3, is_mandatory: true },
  { phase: 'A_rfq_quotation', task_code: 'A4', task_name: 'Cost & lead time estimation', description: 'Calculate costs and estimate lead times', reference_document: 'WD-FRM-0040', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 4, is_mandatory: true },
  { phase: 'A_rfq_quotation', task_code: 'A5', task_name: 'Complete WD-FRM-0018 Quotation Upload/Routing Sheet', description: 'Baseline technical definition document', reference_document: 'WD-FRM-0018', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 5, is_mandatory: true },
  { phase: 'A_rfq_quotation', task_code: 'A6', task_name: 'Internal review', description: 'Internal stakeholder review of quotation', reference_document: 'WD-PRO-0020', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 6, is_mandatory: true },
  { phase: 'A_rfq_quotation', task_code: 'A7', task_name: 'Quote submission', description: 'Submit quotation to customer', reference_document: 'WD-PRO-0020', owner_department: 'SALES', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 7, is_mandatory: true },
  
  // ============================================
  // PHASE B - SALES → NPI HANDSHAKE
  // ============================================
  { phase: 'B_sales_npi_handshake', task_code: 'B1', task_name: 'PO validation vs quotation', description: 'Verify PO matches quoted scope and pricing', reference_document: 'WD-WI-0027', owner_department: 'SALES', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 1, is_mandatory: true },
  { phase: 'B_sales_npi_handshake', task_code: 'B2', task_name: 'Sales → NPI handover meeting', description: 'Formal handover meeting between Sales and NPI', reference_document: 'WD-PRO-0005', owner_department: 'SALES', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 2, is_mandatory: true },
  { phase: 'B_sales_npi_handshake', task_code: 'B3', task_name: 'Transfer of customer intimacy', description: 'Transfer customer relationships and knowledge', reference_document: 'WD-PRO-0005', owner_department: 'SALES', status: 'not_started', is_blocking: true, evidence_required: false, evidence_type: null, display_order: 3, is_mandatory: true },
  { phase: 'B_sales_npi_handshake', task_code: 'B4', task_name: 'Confirmation of scope, volume, lead time', description: 'Confirm project parameters with NPI', reference_document: 'WD-PRO-0005', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 4, is_mandatory: true },
  { phase: 'B_sales_npi_handshake', task_code: 'B5', task_name: 'NPI formal acceptance of ownership', description: 'NPI Lead explicitly accepts project ownership', reference_document: 'WD-PRO-0005', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 5, is_mandatory: true },
  
  // ============================================
  // PHASE C - PROJECT SETUP
  // ============================================
  { phase: 'C_project_setup', task_code: 'C1', task_name: 'Assign Project Lead', description: 'Assign NPI Project Lead', reference_document: 'WD-PRO-0005', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 1, is_mandatory: true },
  { phase: 'C_project_setup', task_code: 'C2', task_name: 'Assign cross-functional team', description: 'Define and assign project team members', reference_document: 'WD-PRO-0005', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 2, is_mandatory: true },
  { phase: 'C_project_setup', task_code: 'C3', task_name: 'Create Project Charter (WD-FRM-0012)', description: 'Complete project charter document', reference_document: 'WD-FRM-0012', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 3, is_mandatory: true },
  { phase: 'C_project_setup', task_code: 'C4', task_name: 'Approve Project Charter', description: 'Management approval of project charter - HARD GATE', reference_document: 'WD-FRM-0012', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 4, is_mandatory: true },
  { phase: 'C_project_setup', task_code: 'C5', task_name: 'Generate Project Plan', description: 'Create detailed project plan with milestones', reference_document: 'WD-PRO-0005', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 5, is_mandatory: true },
  
  // ============================================
  // PHASE D - SAP ITEM CREATION
  // ============================================
  { phase: 'D_sap_item_creation', task_code: 'D1', task_name: 'Confirm WD-FRM-0018 as baseline', description: 'Verify quotation routing sheet is complete and accurate', reference_document: 'WD-FRM-0018', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 1, is_mandatory: true },
  { phase: 'D_sap_item_creation', task_code: 'D2', task_name: 'Upload WD-FRM-0018 to SAP', description: 'Upload technical baseline to SAP system', reference_document: 'WD-FRM-0018', owner_department: 'ADM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 2, is_mandatory: true },
  { phase: 'D_sap_item_creation', task_code: 'D3', task_name: 'Create new Part Number', description: 'Generate SAP part number for the product', reference_document: 'WD-WI-0027', owner_department: 'ADM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 3, is_mandatory: true },
  { phase: 'D_sap_item_creation', task_code: 'D4', task_name: 'Generate routing & BOM in SAP', description: 'Create manufacturing routing and bill of materials', reference_document: 'WD-WI-0029', owner_department: 'SC', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 4, is_mandatory: true },
  { phase: 'D_sap_item_creation', task_code: 'D5', task_name: 'Cross-check SAP vs WD-FRM-0018', description: 'Verify SAP data matches technical baseline - HARD STOP if mismatch', reference_document: 'WD-FRM-0018', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 5, is_mandatory: true },
  
  // ============================================
  // PHASE E - DESIGN TRANSFER (WD-FRM-0013)
  // 33 items from the Design Transfer Checklist
  // ============================================
  { phase: 'E_design_transfer', task_code: 'E1', task_name: 'Project Charter completed', description: 'Has WD-FRM-0012 been completed for the product transfer', reference_document: 'WD-FRM-0012', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 1, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E2', task_name: 'Objectives defined', description: 'Goals and objectives clearly defined in charter and shared with customer', reference_document: 'WD-FRM-0012', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 2, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E3', task_name: 'Quotation submitted', description: 'Pricing submitted to customer per WD-PRO-0020', reference_document: 'WD-PRO-0020', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 3, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E4', task_name: 'Project Plan generated', description: 'Has a project plan been generated', reference_document: 'WD-PRO-0005', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 4, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E5', task_name: 'Risk assessment', description: 'Business risks assessed per WD-PRO-0013', reference_document: 'WD-PRO-0013', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 5, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E6', task_name: 'Production SOPs defined', description: 'Assembly SOPs defined and written per WD-PRO-0001', reference_document: 'WD-PRO-0001', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 6, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E7', task_name: 'Product labelling defined', description: 'Labelling requirements defined per WD-WI-0053', reference_document: 'WD-WI-0053', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 7, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E8', task_name: 'Drawings & specifications available', description: 'All dimensions, specs, RoHS requirements available per WD-WI-0109', reference_document: 'WD-WI-0109', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 8, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E9', task_name: 'Fixturing requirements identified', description: 'Special fixturing requirements identified', reference_document: null, owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 9, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E10', task_name: 'Meters/standards available', description: 'Required meters, test equipment and standards available and calibrated', reference_document: null, owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 10, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E11', task_name: 'Inspection sheet defined', description: 'In-process inspection requirements defined per WD-WI-0016', reference_document: 'WD-WI-0016', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 11, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E12', task_name: 'Bill of Materials available', description: 'Full BOM available per SOP', reference_document: null, owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 12, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E13', task_name: 'BOM setup in SAP', description: 'Bills of materials set up in SAP per WD-WI-0027 & WD-WI-0029', reference_document: 'WD-WI-0029', owner_department: 'SC', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 13, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E14', task_name: 'Special processes identified', description: 'Special processes considered (Anodise, passivation etc)', reference_document: null, owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 14, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E15', task_name: 'Process risk assessment', description: 'Risk assessments on new processes or process agents', reference_document: 'WD-PRO-0013', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 15, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E16', task_name: 'Facility identified', description: 'Required facility and infrastructure identified for manufacturing', reference_document: null, owner_department: 'F&M', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 16, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E17', task_name: 'Special facility conditions', description: 'Special conditions considered (temperature, cleanroom etc)', reference_document: null, owner_department: 'F&M', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 17, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E18', task_name: 'Machine capacity confirmed', description: 'Sufficient machine capacity for manufacture of sub-components', reference_document: null, owner_department: 'OPS', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 18, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E19', task_name: 'Assembly capacity confirmed', description: 'Sufficient equipment capacity for assembly of finished devices', reference_document: null, owner_department: 'OPS', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 19, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E20', task_name: 'Supplier sources obtained', description: 'Sources obtained for procured components per WD-PRO-0023', reference_document: 'WD-PRO-0023', owner_department: 'SC', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 20, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E21', task_name: 'Suppliers on AVL', description: 'Sub-tier suppliers set up on Approved Supplier List per WD-PRO-0023', reference_document: 'WD-PRO-0023', owner_department: 'SC', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 21, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E22', task_name: 'Regulatory impact assessed', description: 'Regulatory impact of design transfer assessed per WD-PRO-0013', reference_document: 'WD-PRO-0013', owner_department: 'QA', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 22, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E23', task_name: 'First article requirements defined', description: 'First article requirements defined and agreed per SOP172', reference_document: 'SOP172', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 23, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E24', task_name: 'Supporting roles defined', description: 'Supporting roles (Quality, Engineering) defined for product transfer', reference_document: null, owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 24, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E25', task_name: 'Headcount available', description: 'Appropriate headcount available for manufacturing', reference_document: null, owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 25, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E26', task_name: 'Training needs assessed', description: 'Additional training needs assessed per WD-PRO-0014', reference_document: 'WD-PRO-0014', owner_department: 'HR', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 26, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E27', task_name: 'pFMEA required', description: 'FMEA and/or PFMEA required per WD-WI-0015', reference_document: 'WD-WI-0015', owner_department: 'VAL', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 27, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E28', task_name: 'Customer DFMEA received', description: 'Customer shared their DFMEA to input to Schivo FMEA', reference_document: null, owner_department: 'VAL', status: 'not_started', is_blocking: false, evidence_required: false, evidence_type: null, display_order: 28, is_mandatory: false },
  { phase: 'E_design_transfer', task_code: 'E29', task_name: 'MVP required', description: 'Master Validation Plan required per WD-PRO-0018', reference_document: 'WD-PRO-0018', owner_department: 'VAL', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 29, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E30', task_name: 'Component validation required', description: 'Individual components to be verified or validated per WD-PRO-0018', reference_document: 'WD-PRO-0018', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 30, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E31', task_name: 'Equipment validation identified', description: 'Equipment requiring validation identified, including special fixturing', reference_document: null, owner_department: 'VAL', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 31, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E32', task_name: 'DHR requirements determined', description: 'Batch History Record requirements determined and agreed with customer', reference_document: null, owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 32, is_mandatory: true },
  { phase: 'E_design_transfer', task_code: 'E33', task_name: 'Configuration management met', description: 'All requirements of WD-WI-0029 Configuration Management met', reference_document: 'WD-WI-0029', owner_department: 'SC', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 33, is_mandatory: true },
  
  // ============================================
  // PHASE F - INDUSTRIALISATION & EXECUTION
  // ============================================
  { phase: 'F_industrialisation', task_code: 'F1', task_name: 'BOM finalized', description: 'Finalize bill of materials with all suppliers', reference_document: null, owner_department: 'SC', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 1, is_mandatory: true },
  { phase: 'F_industrialisation', task_code: 'F2', task_name: 'Suppliers POd', description: 'Purchase orders placed with all suppliers', reference_document: null, owner_department: 'SC', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 2, is_mandatory: true },
  { phase: 'F_industrialisation', task_code: 'F3', task_name: 'Materials received', description: 'All materials received and inspected', reference_document: null, owner_department: 'SC', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 3, is_mandatory: true },
  { phase: 'F_industrialisation', task_code: 'F4', task_name: 'CNC Programs complete', description: 'All CNC programs created and verified', reference_document: null, owner_department: 'PRG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 4, is_mandatory: true },
  { phase: 'F_industrialisation', task_code: 'F5', task_name: 'CMM Programs complete', description: 'CMM/ViciVision programs created', reference_document: null, owner_department: 'PRG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 5, is_mandatory: true },
  { phase: 'F_industrialisation', task_code: 'F6', task_name: 'Work Instructions created', description: 'Work instructions created and approved', reference_document: 'WD-WI-0106', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 6, is_mandatory: true },
  { phase: 'F_industrialisation', task_code: 'F7', task_name: 'IMS created', description: 'Inspection Method Sheet created based on technical knowledge', reference_document: null, owner_department: 'PRG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 7, is_mandatory: true },
  { phase: 'F_industrialisation', task_code: 'F8', task_name: 'Tooling ordered', description: 'All required tooling ordered', reference_document: null, owner_department: 'PRG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 8, is_mandatory: true },
  { phase: 'F_industrialisation', task_code: 'F9', task_name: 'Fixtures designed & built', description: 'Fixtures designed, built and validated', reference_document: null, owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 9, is_mandatory: true },
  { phase: 'F_industrialisation', task_code: 'F10', task_name: 'Gauges ordered & calibrated', description: 'All gauges ordered and calibrated', reference_document: null, owner_department: 'QA', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 10, is_mandatory: true },
  
  // ============================================
  // PHASE G - BLUE REVIEWS (5 stages)
  // ============================================
  { phase: 'G_blue_reviews', task_code: 'G1', task_name: 'pFMEA created', description: 'Process FMEA created per WD-FRM-0074', reference_document: 'WD-FRM-0074', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 1, is_mandatory: true },
  { phase: 'G_blue_reviews', task_code: 'G2', task_name: 'pFMEA approved', description: 'Process FMEA approved by quality', reference_document: 'WD-FRM-0074', owner_department: 'QA', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 2, is_mandatory: true },
  { phase: 'G_blue_reviews', task_code: 'G3', task_name: 'First build/First article complete', description: 'First part manufactured and inspected', reference_document: 'WD-FRM-0183', owner_department: 'PRG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 3, is_mandatory: true },
  { phase: 'G_blue_reviews', task_code: 'G4', task_name: 'Blue Review Stage 1 - Engineering', description: 'Engineering, Programming, NPI, Quality & Purchasing sign-off', reference_document: 'WD-FRM-0183', owner_department: 'ENG', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 4, is_mandatory: true },
  { phase: 'G_blue_reviews', task_code: 'G5', task_name: 'Blue Review Stage 2 - Manufacturing', description: 'Setter/Operator approval of program, WI, IMS', reference_document: 'WD-FRM-0183', owner_department: 'OPS', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 5, is_mandatory: true },
  { phase: 'G_blue_reviews', task_code: 'G6', task_name: 'Blue Review Stage 3 - Quality Inspection', description: 'Quality inspection complete, first/last off verified', reference_document: 'WD-FRM-0183', owner_department: 'QA', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 6, is_mandatory: true },
  { phase: 'G_blue_reviews', task_code: 'G7', task_name: 'Blue Review Stage 4 - NPI Team', description: 'NPI team review and approval', reference_document: 'WD-FRM-0183', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 7, is_mandatory: true },
  { phase: 'G_blue_reviews', task_code: 'G8', task_name: 'Blue Review Stage 5 - Administration', description: 'SAP admin work complete, linkages verified', reference_document: 'WD-FRM-0183', owner_department: 'ADM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 8, is_mandatory: true },
  
  // ============================================
  // PHASE H - VALIDATION (IF APPLICABLE)
  // ============================================
  { phase: 'H_validation', task_code: 'H1', task_name: 'IQ protocol executed', description: 'Installation Qualification complete', reference_document: 'WD-PRO-0018', owner_department: 'VAL', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 1, is_mandatory: false },
  { phase: 'H_validation', task_code: 'H2', task_name: 'OQ protocol executed', description: 'Operational Qualification complete', reference_document: 'WD-PRO-0018', owner_department: 'VAL', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 2, is_mandatory: false },
  { phase: 'H_validation', task_code: 'H3', task_name: 'PQ protocol executed', description: 'Performance Qualification complete', reference_document: 'WD-PRO-0018', owner_department: 'VAL', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'upload', display_order: 3, is_mandatory: false },
  { phase: 'H_validation', task_code: 'H4', task_name: 'QA validation approval', description: 'Quality approval of validation activities', reference_document: null, owner_department: 'QA', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 4, is_mandatory: false },
  { phase: 'H_validation', task_code: 'H5', task_name: 'Customer approval (if required)', description: 'Customer sign-off on validation', reference_document: null, owner_department: 'PM', status: 'not_started', is_blocking: false, evidence_required: false, evidence_type: null, display_order: 5, is_mandatory: false },
  
  // ============================================
  // PHASE I - TRANSFER TO STANDARD MANUFACTURING
  // ============================================
  { phase: 'I_transfer_to_manufacturing', task_code: 'I1', task_name: 'Final Design Transfer Checklist review', description: 'Complete review of WD-FRM-0013 checklist', reference_document: 'WD-FRM-0013', owner_department: 'PM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'approval', display_order: 1, is_mandatory: true },
  { phase: 'I_transfer_to_manufacturing', task_code: 'I2', task_name: 'QA approval for transfer', description: 'Quality sign-off for transfer to standard manufacturing', reference_document: 'WD-FRM-0013', owner_department: 'QA', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 2, is_mandatory: true },
  { phase: 'I_transfer_to_manufacturing', task_code: 'I3', task_name: 'SC approval for transfer', description: 'Supply Chain sign-off for transfer', reference_document: 'WD-FRM-0013', owner_department: 'SC', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 3, is_mandatory: true },
  { phase: 'I_transfer_to_manufacturing', task_code: 'I4', task_name: 'SAP release', description: 'SAP status updated for production release', reference_document: null, owner_department: 'ADM', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'reference_id', display_order: 4, is_mandatory: true },
  { phase: 'I_transfer_to_manufacturing', task_code: 'I5', task_name: 'Ownership transfer to Operations', description: 'Formal handover to production operations team', reference_document: 'WD-PRO-0005', owner_department: 'OPS', status: 'not_started', is_blocking: true, evidence_required: true, evidence_type: 'signature', display_order: 5, is_mandatory: true },
];

// ============================================
// DEFAULT PHASE GATES
// ============================================
export type DefaultGateDef = {
  from_phase: string;
  to_phase: string;
  gate_name: string;
  requires_qa_approval: boolean;
  requires_sc_approval: boolean;
  requires_pm_approval: boolean;
  requires_ops_approval: boolean;
};

export const DEFAULT_PHASE_GATES: DefaultGateDef[] = [
  { from_phase: 'A_rfq_quotation', to_phase: 'B_sales_npi_handshake', gate_name: 'Quote Submitted / PO Received', requires_qa_approval: false, requires_sc_approval: false, requires_pm_approval: true, requires_ops_approval: false },
  { from_phase: 'B_sales_npi_handshake', to_phase: 'C_project_setup', gate_name: 'Sales → NPI Handshake Complete', requires_qa_approval: false, requires_sc_approval: false, requires_pm_approval: true, requires_ops_approval: false },
  { from_phase: 'C_project_setup', to_phase: 'D_sap_item_creation', gate_name: 'Project Charter Approved', requires_qa_approval: false, requires_sc_approval: false, requires_pm_approval: true, requires_ops_approval: false },
  { from_phase: 'D_sap_item_creation', to_phase: 'E_design_transfer', gate_name: 'SAP Item Created & Verified', requires_qa_approval: false, requires_sc_approval: false, requires_pm_approval: true, requires_ops_approval: false },
  { from_phase: 'E_design_transfer', to_phase: 'F_industrialisation', gate_name: 'Design Transfer Checklist Complete', requires_qa_approval: true, requires_sc_approval: true, requires_pm_approval: true, requires_ops_approval: false },
  { from_phase: 'F_industrialisation', to_phase: 'G_blue_reviews', gate_name: 'Industrialisation Complete', requires_qa_approval: false, requires_sc_approval: true, requires_pm_approval: true, requires_ops_approval: false },
  { from_phase: 'G_blue_reviews', to_phase: 'H_validation', gate_name: 'All Blue Review Stages Complete', requires_qa_approval: true, requires_sc_approval: false, requires_pm_approval: true, requires_ops_approval: true },
  { from_phase: 'H_validation', to_phase: 'I_transfer_to_manufacturing', gate_name: 'Validation Complete', requires_qa_approval: true, requires_sc_approval: false, requires_pm_approval: true, requires_ops_approval: false },
  { from_phase: 'I_transfer_to_manufacturing', to_phase: 'completed', gate_name: 'Transfer to Standard Manufacturing', requires_qa_approval: true, requires_sc_approval: true, requires_pm_approval: true, requires_ops_approval: true },
];

// ============================================
// HANDSHAKE TYPES
// ============================================
export const HANDSHAKE_TYPES = [
  { value: 'sales_to_npi', label: 'Sales → NPI', from_role: 'Sales', to_role: 'NPI Lead' },
  { value: 'npi_to_ops', label: 'NPI → Operations', from_role: 'NPI Lead', to_role: 'Operations Manager' },
] as const;

// ============================================
// DEFAULT MILESTONES
// ============================================
export type DefaultMilestoneDef = Omit<NPIProjectMilestone, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'target_date' | 'actual_date' | 'notes' | 'approved_by'>;

export const DEFAULT_MILESTONES: DefaultMilestoneDef[] = [
  { milestone_name: 'RFQ Received', phase: 'A_rfq_quotation', status: 'pending', display_order: 1 },
  { milestone_name: 'Quote Submitted', phase: 'A_rfq_quotation', status: 'pending', display_order: 2 },
  { milestone_name: 'PO Received', phase: 'B_sales_npi_handshake', status: 'pending', display_order: 3 },
  { milestone_name: 'Handshake Complete', phase: 'B_sales_npi_handshake', status: 'pending', display_order: 4 },
  { milestone_name: 'Charter Approved', phase: 'C_project_setup', status: 'pending', display_order: 5 },
  { milestone_name: 'SAP Item Created', phase: 'D_sap_item_creation', status: 'pending', display_order: 6 },
  { milestone_name: 'Design Transfer Complete', phase: 'E_design_transfer', status: 'pending', display_order: 7 },
  { milestone_name: 'First Article Complete', phase: 'G_blue_reviews', status: 'pending', display_order: 8 },
  { milestone_name: 'Blue Review Complete', phase: 'G_blue_reviews', status: 'pending', display_order: 9 },
  { milestone_name: 'Validation Complete', phase: 'H_validation', status: 'pending', display_order: 10 },
  { milestone_name: 'Transfer to Production', phase: 'I_transfer_to_manufacturing', status: 'pending', display_order: 11 },
];

// ============================================
// HELPER FUNCTIONS
// ============================================
export function getPhaseInfo(phase: string) {
  return NPI_PHASES.find(p => p.value === phase) || NPI_PHASES[0];
}

export function getStatusInfo(status: string) {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
}

export function getTaskStatusInfo(status: string) {
  return TASK_STATUSES.find(s => s.value === status) || TASK_STATUSES[0];
}

export function getDepartmentInfo(dept: string) {
  return OWNER_DEPARTMENTS.find(d => d.value === dept) || OWNER_DEPARTMENTS[0];
}

export function getPhaseIndex(phase: string): number {
  return NPI_PHASES.findIndex(p => p.value === phase);
}

export function canAdvancePhase(currentPhase: string, tasks: NPIPhaseTask[]): { canAdvance: boolean; blockers: string[] } {
  const phaseTasks = tasks.filter(t => t.phase === currentPhase);
  const blockers: string[] = [];
  
  for (const task of phaseTasks) {
    if (task.is_mandatory && task.status !== 'completed' && task.status !== 'not_applicable') {
      if (task.status === 'blocked') {
        blockers.push(`${task.task_code}: ${task.task_name} is BLOCKED`);
      } else if (task.evidence_required && !task.evidence_file_url && !task.evidence_reference) {
        blockers.push(`${task.task_code}: ${task.task_name} - missing evidence`);
      } else {
        blockers.push(`${task.task_code}: ${task.task_name} - not completed`);
      }
    }
  }
  
  return { canAdvance: blockers.length === 0, blockers };
}

export function calculatePhaseProgress(tasks: NPIPhaseTask[], phase: string): PhaseProgress {
  const phaseTasks = tasks.filter(t => t.phase === phase);
  const mandatoryTasks = phaseTasks.filter(t => t.is_mandatory);
  
  const completedTasks = mandatoryTasks.filter(t => t.status === 'completed' || t.status === 'not_applicable').length;
  const blockedTasks = mandatoryTasks.filter(t => t.status === 'blocked').length;
  const totalTasks = mandatoryTasks.length;
  
  let status: PhaseProgress['status'] = 'not_started';
  if (completedTasks === totalTasks && totalTasks > 0) {
    status = 'completed';
  } else if (blockedTasks > 0) {
    status = 'blocked';
  } else if (completedTasks > 0) {
    status = 'in_progress';
  }
  
  return {
    phase: phase as NPIPhase,
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    blocked_tasks: blockedTasks,
    progress_percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    status,
  };
}
